import { Op, WhereOptions } from 'sequelize';
import { AuditLog } from '../models/AuditLog';
import { currentOrgId } from '../context/requestContext';
import { sequelize } from '../database/connection';
import { sanitizarAuditoria, tabelasVisiveis } from './auditData';

export class AuditFilterError extends Error {}

function inteiro(valor: unknown, padrao?: number): number | undefined {
  if (valor === undefined || valor === '') return padrao;
  if (typeof valor !== 'string' || !/^\d+$/.test(valor) || Number(valor) < 1 || !Number.isSafeInteger(Number(valor))) {
    throw new AuditFilterError('Use números inteiros positivos nos filtros');
  }
  return Number(valor);
}

function data(valor: unknown): string | undefined {
  if (valor === undefined || valor === '') return undefined;
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) throw new AuditFilterError('Data inválida (use AAAA-MM-DD)');
  const parsed = new Date(`${valor}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== valor) throw new AuditFilterError('Data inválida');
  return valor;
}

function texto(valor: unknown): string | undefined {
  if (valor === undefined || valor === '') return undefined;
  if (typeof valor !== 'string' || valor.length > 200) throw new AuditFilterError('Filtro de texto inválido (máximo 200 caracteres)');
  return valor.trim();
}

export class AuditLogService {
  async listar(query: Record<string, unknown>, papel: string) {
    const page = inteiro(query.page, 1)!;
    const limit = Math.min(inteiro(query.limit, 10)!, 100);
    const tabela = texto(query.tabela);
    const registroId = inteiro(query.registro_id);
    const acao = texto(query.acao)?.toUpperCase();
    const de = data(query.de);
    const ate = data(query.ate);
    const usuario = texto(query.usuario);
    const busca = texto(query.busca);
    const tabelas = tabelasVisiveis(papel, query.operacional === 'true');
    if (tabela && !tabelas.includes(tabela)) throw new AuditFilterError('Entidade indisponível para este perfil');
    if (acao && !['CREATE', 'UPDATE', 'DELETE', 'RESTORE'].includes(acao)) throw new AuditFilterError('Ação inválida');
    if (de && ate && de > ate) throw new AuditFilterError('Data inicial posterior à final');

    // beforeFind não cobre COUNT: filtro explícito garante total e páginas isolados.
    const where: Record<string | symbol, unknown> = {
      organizacao_id: currentOrgId(),
      tabela: tabela ?? { [Op.in]: tabelas },
      ...(registroId ? { registro_id: registroId } : {}),
      ...(acao ? { acao } : {}),
      ...(usuario ? { usuario: { [Op.iLike]: `%${usuario}%` } } : {}),
    };
    if (de || ate) {
      const fim = ate ? new Date(`${ate}T00:00:00Z`) : undefined;
      fim?.setUTCDate(fim.getUTCDate() + 1);
      where.created_at = {
        ...(de ? { [Op.gte]: new Date(`${de}T00:00:00Z`) } : {}),
        ...(fim ? { [Op.lt]: fim } : {}),
      };
    }
    if (busca) {
      // Busca apenas campos de negócio, nunca o JSON completo com credenciais legadas.
      where[Op.or] = ['nome', 'descricao', 'numero_patrimonio'].flatMap((campo) => [
        { [`dados_novos.${campo}`]: { [Op.iLike]: `%${busca}%` } },
        { [`dados_anteriores.${campo}`]: { [Op.iLike]: `%${busca}%` } },
      ]);
    }
    if (query.relacionados === 'true' && tabela === 'patrimonio' && registroId) {
      delete where.registro_id;
      delete where.tabela;
      where[Op.and] = [{ [Op.or]: [
        { tabela: 'patrimonio', registro_id: registroId },
        { tabela: { [Op.in]: ['solicitacao', 'conferencia', 'patrimonio_fotos'] }, [Op.or]: [
          { 'dados_novos.patrimonio_id': registroId }, { 'dados_anteriores.patrimonio_id': registroId },
        ] },
      ] }];
    }
    const { count, rows } = await AuditLog.findAndCountAll({ where: where as WhereOptions, limit, offset: (page - 1) * limit, order: [['created_at', 'DESC'], ['id', 'DESC']] });
    return { total: count, pages: Math.ceil(count / limit), currentPage: page, limit, data: await this.enriquecer(rows) };
  }

  async historico(tabela: string, id: number) {
    const rows = await AuditLog.findAll({ where: { tabela, registro_id: id, organizacao_id: currentOrgId() }, order: [['created_at', 'DESC'], ['id', 'DESC']] });
    return this.enriquecer(rows);
  }

  private async enriquecer(rows: AuditLog[]) {
    // Cache por resposta: resolve nomes de referências, inclusive registros arquivados.
    const cache = new Map<string, Promise<string | number>>();
    const referencias: Record<string, string> = {
      estado_item_id: 'EstadoItem', ambiente_id: 'Ambiente', responsavel_id: 'Responsavel',
      tipo_material_id: 'TipoMaterial', fornecedor_id: 'Fornecedor', conferente_id: 'Conferente',
      patrimonio_id: 'Patrimonio', usuario_id: 'Usuario',
    };
    const nome = async (campo: string, valor: unknown): Promise<unknown> => {
      const model = sequelize.models[referencias[campo]];
      if (!model || typeof valor !== 'number') return valor;
      const key = `${campo}:${valor}`;
      if (!cache.has(key)) cache.set(key, model.findOne({ where: { id: valor, organizacao_id: currentOrgId() }, paranoid: false, attributes: ['id', campo === 'patrimonio_id' ? 'numero_patrimonio' : 'nome'] }).then((row) => row?.get(campo === 'patrimonio_id' ? 'numero_patrimonio' : 'nome') as string ?? valor));
      return cache.get(key)!;
    };
    return Promise.all(rows.map(async (log) => {
      const json = sanitizarAuditoria(log.toJSON()) as Record<string, unknown>;
      const antes = json.dados_anteriores as Record<string, unknown> | null;
      const depois = json.dados_novos as Record<string, unknown> | null;
      const dados = depois ?? antes ?? {};
      const campos = (json.campos_alterados as string[] | null ?? []).filter((campo) => !/senha|password|token|secret|created|updated|deleted|versao|organizacao/i.test(campo));
      const alteracoes = await Promise.all(campos.map(async (campo) => ({ campo, anterior: await nome(campo, antes?.[campo] ?? null), novo: await nome(campo, depois?.[campo] ?? null) })));
      const patrimonioId = log.tabela === 'patrimonio' ? log.registro_id : dados.patrimonio_id;
      const numero = typeof patrimonioId === 'number' ? await nome('patrimonio_id', patrimonioId) : null;
      return { ...json, alteracoes, registro_nome: dados.numero_patrimonio ?? dados.nome ?? (log.tabela === 'solicitacao' ? `#${log.registro_id} · ${dados.tipo === 'substituicao' ? 'Substituição' : 'Manutenção'}${numero ? ` — ${numero}` : ''}` : dados.descricao ?? `#${log.registro_id}`), patrimonio_id: patrimonioId ?? null };
    }));
  }
}
