import { CreationAttributes, Transaction } from 'sequelize';
import { sequelize } from '../database/connection';
import { Patrimonio } from '../models/Patrimonio';
import { Ambiente } from '../models/Ambiente';
import { EstadoItem } from '../models/EstadoItem';
import { Fornecedor } from '../models/Fornecedor';
import { Responsavel } from '../models/Responsavel';
import { TipoMaterial } from '../models/TipoMaterial';
import { Organizacao } from '../models/Organizacao';
import { LimiteTrialAtingidoError } from './TrialService';
import { currentOrgId } from '../context/requestContext';
import { parseCsv } from '../utils/csv';
import { validarCamposDepreciacao } from '../validation/depreciacao';

const COLUNAS_OBRIGATORIAS = [
  'numero_patrimonio', 'descricao', 'valor',
  'tipo_material', 'estado_item', 'ambiente', 'responsavel',
] as const;
const COLUNAS_Opcionais = ['fornecedor', 'data_aquisicao', 'vida_util_anos', 'valor_residual'] as const;
const MAX_LINHAS = 1000;
/** Células do arquivo nunca voltam inteiras nas mensagens de erro. */
function resumir(texto: string, max = 80): string {
  return texto.length > max ? `${texto.slice(0, max)}…` : texto;
}

export const MAX_BYTES_CSV = 2 * 1024 * 1024;

interface LinhaValida {
  numero: string;
  atributos: CreationAttributes<Patrimonio>;
}

export interface AnaliseImportacao {
  total_linhas: number;
  validas: number;
  invalidas: number;
  existentes: number;
  duplicadas_arquivo: number;
  erros: Array<{ linha: number; erro: string }>;
  linhasValidas: LinhaValida[];
}

function indiceDeColunas(headers: string[]): Record<string, number> {
  const mapa: Record<string, number> = {};
  headers.forEach((header, indice) => {
    mapa[header.trim().toLowerCase()] = indice;
  });
  return mapa;
}

/** Decimal brasileiro ou ponto, conforme o separador da planilha: com `;`
 * aceita `1234,56`; com `,` só `1234.56` (a vírgula é o separador). */
function converterValor(campo: string, separador: ';' | ','): number | null {
  const texto = campo.trim();
  if (!texto || !/^[0-9.,]+$/.test(texto)) return null;
  const normalizado = separador === ';' && texto.includes(',')
    ? texto.replace(/\./g, '').replace(',', '.')
    : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : null;
}

export class PatrimonioImportacaoService {
  /** Análise sem estado: lê catálogos ativos da organização da requisição e
   * valida cada linha. Preview usa isto; confirmar reanalisa e grava. */
  async analisar(arquivoTexto: string): Promise<AnaliseImportacao> {
    const { separador, headers, linhas } = parseCsv(arquivoTexto);
    if (linhas.length === 0) throw new Error('CSV sem linhas de dados');
    if (linhas.length > MAX_LINHAS) throw new Error(`Limite de ${MAX_LINHAS} linhas por arquivo`);

    const colunas = indiceDeColunas(headers);
    const faltantes = COLUNAS_OBRIGATORIAS.filter(nome => colunas[nome] === undefined);
    if (faltantes.length > 0) {
      throw new Error(`Colunas obrigatórias ausentes: ${faltantes.join(', ')}`);
    }
    const desconhecidas = headers
      .map(h => h.trim().toLowerCase())
      .filter(nome => !(COLUNAS_OBRIGATORIAS as readonly string[]).includes(nome)
        && !(COLUNAS_Opcionais as readonly string[]).includes(nome));
    if (desconhecidas.length > 0) {
      throw new Error(`Colunas desconhecidas: ${desconhecidas.join(', ')}`);
    }

    const campo = (valores: string[], nome: string) => (valores[colunas[nome]] ?? '').trim();

    const porNome = (registros: Array<{ id: number; nome: string }>) => {
      const mapa = new Map<string, number>();
      for (const registro of registros) mapa.set(registro.nome.trim().toLowerCase(), registro.id);
      return mapa;
    };
    const [tipos, estados, ambientes, responsaveis, fornecedores] = await Promise.all([
      TipoMaterial.findAll(), EstadoItem.findAll(), Ambiente.findAll(),
      Responsavel.findAll(), Fornecedor.findAll(),
    ]);
    const tipoId = porNome(tipos), estadoId = porNome(estados), ambienteId = porNome(ambientes);
    const responsavelId = porNome(responsaveis), fornecedorId = porNome(fornecedores);

    // Números já ocupados incluem ARQUIVADOS: a unicidade (org, número)
    // vale para tudo; reimpor o mesmo número é atualizar, não criar.
    const numeros = new Set(
      (await Patrimonio.unscoped().findAll({ attributes: ['numero_patrimonio'] }))
        .map(item => (item.get('numero_patrimonio') as string).trim().toLowerCase()),
    );

    const analise: AnaliseImportacao = {
      total_linhas: linhas.length, validas: 0, invalidas: 0,
      existentes: 0, duplicadas_arquivo: 0, erros: [], linhasValidas: [],
    };
    const noArquivo = new Set<string>();

    linhas.forEach((valores, indice) => {
      const numeroLinha = indice + 2; // + cabeçalho
      const numero = campo(valores, 'numero_patrimonio');
      const errosDaLinha: string[] = [];

      if (!numero) errosDaLinha.push('numero_patrimonio obrigatório');
      const chave = numero.toLowerCase();
      if (numero && noArquivo.has(chave)) {
        analise.duplicadas_arquivo += 1;
        errosDaLinha.push('número repetido dentro do arquivo');
      }
      if (!campo(valores, 'descricao')) errosDaLinha.push('descricao obrigatória');

      const valor = converterValor(campo(valores, 'valor'), separador);
      if (valor === null || valor < 0) errosDaLinha.push('valor numérico não negativo obrigatório');

      const referencia = (nome: string, mapa: Map<string, number>) => {
        const texto = campo(valores, nome);
        if (!texto) return `${nome} obrigatório (por nome do cadastro)`;
        const id = mapa.get(texto.toLowerCase());
        if (!id) return `${nome} "${resumir(texto)}" não encontrado no cadastro desta organização`;
        return null;
      };
      for (const [nome, mapa] of [
        ['tipo_material', tipoId], ['estado_item', estadoId],
        ['ambiente', ambienteId], ['responsavel', responsavelId],
      ] as const) {
        const problema = referencia(nome, mapa);
        if (problema) errosDaLinha.push(problema);
      }

      const opcionais: Partial<CreationAttributes<Patrimonio>> = {};
      const fornecedorNome = campo(valores, 'fornecedor');
      if (fornecedorNome) {
        const id = fornecedorId.get(fornecedorNome.toLowerCase());
        if (!id) errosDaLinha.push(`fornecedor "${resumir(fornecedorNome)}" não encontrado no cadastro`);
        else opcionais.fornecedor_id = id;
      }
      const data = campo(valores, 'data_aquisicao');
      if (data) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) errosDaLinha.push('data_aquisicao deve ser AAAA-MM-DD');
        else opcionais.data_aquisicao = data;
      }
      const vida = campo(valores, 'vida_util_anos');
      if (vida) {
        const numeroVida = Number(vida);
        if (!Number.isInteger(numeroVida) || numeroVida < 1 || numeroVida > 100) {
          errosDaLinha.push('vida_util_anos deve ser inteiro entre 1 e 100');
        } else opcionais.vida_util_anos = numeroVida;
      }
      const residualTexto = campo(valores, 'valor_residual');
      if (residualTexto) {
        const residual = converterValor(residualTexto, separador);
        if (residual === null || residual < 0) errosDaLinha.push('valor_residual numérico não negativo inválido');
        else opcionais.valor_residual = residual;
      }

      if (errosDaLinha.length === 0) {
        const errosDepreciacao = validarCamposDepreciacao({
          valor: valor ?? undefined,
          ...(data ? { data_aquisicao: data } : {}),
          ...(vida ? { vida_util_anos: Number(vida) } : {}),
          ...(residualTexto ? { valor_residual: converterValor(residualTexto, separador) } : {}),
        });
        errosDaLinha.push(...errosDepreciacao.map(erroValidacao => erroValidacao.mensagem));
      }

      if (errosDaLinha.length > 0) {
        analise.invalidas += 1;
        if (analise.erros.length < 50) {
          analise.erros.push({ linha: numeroLinha, erro: errosDaLinha.join('; ') });
        }
        return;
      }
      noArquivo.add(chave);
      if (numeros.has(chave)) analise.existentes += 1;
      else analise.validas += 1;

      analise.linhasValidas.push({
        numero,
        atributos: {
          numero_patrimonio: numero,
          descricao: campo(valores, 'descricao'),
          valor: valor as number,
          tipo_material_id: tipoId.get(campo(valores, 'tipo_material').toLowerCase()) as number,
          estado_item_id: estadoId.get(campo(valores, 'estado_item').toLowerCase()) as number,
          ambiente_id: ambienteId.get(campo(valores, 'ambiente').toLowerCase()) as number,
          responsavel_id: responsavelId.get(campo(valores, 'responsavel').toLowerCase()) as number,
          ...opcionais,
        },
      });
    });

    return analise;
  }

  /**
   * Gravação atômica: reanalisa o MESMO arquivo e grava numa transação. Se
   * qualquer linha é inválida, nada é gravado. Números já ocupados
   * (inclusive arquivados) são PULADOS — reimportar o mesmo arquivo é
   * seguro (idempotente). O limite do trial vale por LOTE: usados + novos
   * > limite aborta o lote inteiro antes da primeira gravação (a janela de
   * corrida é a mesma do guardrail unitário, ADR-0013).
   */
  async confirmar(arquivoTexto: string): Promise<{
    inseridos: number; existentes: number; total_linhas: number;
  }> {
    const analise = await this.analisar(arquivoTexto);
    if (analise.invalidas > 0 || analise.duplicadas_arquivo > 0) {
      const erro = new Error(
        `Importação com problemas: ${analise.invalidas} linha(s) inválida(s), ` +
        `${analise.duplicadas_arquivo} repetida(s) no arquivo. Nada foi gravado.`,
      ) as Error & { codigo?: string; importacao?: unknown };
      erro.codigo = 'importacao_invalida';
      erro.importacao = { erros: analise.erros, total_linhas: analise.total_linhas };
      throw erro;
    }

    return sequelize.transaction({ logging: false }, async (transaction: Transaction) => {
      const ocupados = new Set(
        (await Patrimonio.unscoped().findAll({
          attributes: ['numero_patrimonio'], transaction, logging: false,
        })).map(item => (item.get('numero_patrimonio') as string).trim().toLowerCase()),
      );
      const novos = analise.linhasValidas
        .filter(linha => !ocupados.has(linha.numero.toLowerCase()));

      if (novos.length > 0) {
        const organizacaoId = currentOrgId();
        const organizacao = organizacaoId
          ? await Organizacao.unscoped().findByPk(organizacaoId, { transaction, logging: false })
          : null;
        if (organizacao && organizacao.modalidade_acesso === 'trial') {
          const expirado = organizacao.trial_fim && organizacao.trial_fim.getTime() <= Date.now();
          if (!expirado && organizacao.limite_patrimonios != null) {
            const usados = await Patrimonio.count({ transaction, logging: false });
            if (usados + novos.length > organizacao.limite_patrimonios) {
              throw new LimiteTrialAtingidoError('patrimonios', organizacao.limite_patrimonios);
            }
          }
        }
      }

      for (const linha of novos) {
        await Patrimonio.create(linha.atributos, { transaction });
      }

      return {
        inseridos: novos.length,
        existentes: analise.linhasValidas.length - novos.length,
        total_linhas: analise.total_linhas,
      };
    });
  }
}
