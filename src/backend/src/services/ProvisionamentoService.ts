import { randomUUID } from 'crypto';
import type { Transaction } from 'sequelize';
import { runWithContext } from '../context/requestContext';
import { Organizacao } from '../models/Organizacao';
import { Usuario } from '../models/Usuario';
import { EstadoItem } from '../models/EstadoItem';
import { AuditLog } from '../models/AuditLog';

export const TRIAL_DIAS = 30;
export const TRIAL_LIMITE_PATRIMONIOS = 500;
export const TRIAL_LIMITE_USUARIOS = 5;

const ESTADOS_INICIAIS = [
  ['Em condições', false], ['Em manutenção', true], ['Inservível', true], ['Descarte pendente', true],
] as const;

export interface DadosProvisionamento {
  organizacaoNome: string;
  gestorNome: string;
  gestorEmail: string;
  senhaHash: string;
  /** trial = cadastro self-service; legado = organização sem prazo nem limites. */
  modalidade: 'trial' | 'legado';
  /** Quem origina o evento na auditoria (ex.: "Cadastro self-service"). */
  origem: string;
}

/**
 * Cria organização, primeiro Gestor, estados iniciais e auditoria na
 * transação recebida — tudo ou nada. Compartilhado pelo cadastro
 * self-service e pelo bootstrap do servidor.
 */
export async function provisionarOrganizacao(
  dados: DadosProvisionamento,
  transaction: Transaction,
): Promise<Organizacao> {
  const inicio = new Date();
  const acesso = dados.modalidade === 'trial'
    ? {
      modalidade_acesso: 'trial' as const, trial_inicio: inicio,
      trial_fim: new Date(inicio.getTime() + TRIAL_DIAS * 24 * 60 * 60 * 1000),
      limite_patrimonios: TRIAL_LIMITE_PATRIMONIOS, limite_usuarios: TRIAL_LIMITE_USUARIOS,
    }
    : { modalidade_acesso: 'legado' as const };

  // A organização ainda não tem contexto. Evita o hook global atribuir seu
  // evento à org padrão; a auditoria explícita abaixo é obrigatória e
  // participa da MESMA transação, sem tolerância a falha.
  const org = await Organizacao.create({
    nome: dados.organizacaoNome, slug: `org-${randomUUID()}`, ativo: true, ...acesso,
  }, { transaction, hooks: false, logging: false });

  await runWithContext({ usuarioId: 0, usuarioNome: dados.origem, papel: 'gestor', organizacaoId: org.id }, async () => {
    await AuditLog.create({
      tabela: 'organizacao', registro_id: org.id, organizacao_id: org.id, acao: 'CREATE',
      dados_anteriores: null, dados_novos: org.get({ plain: true }), campos_alterados: null,
    }, { transaction, logging: false });
    await Usuario.create({
      nome: dados.gestorNome, email: dados.gestorEmail, senha_hash: dados.senhaHash,
      papel: 'gestor', ativo: true, organizacao_id: org.id,
    }, { transaction, logging: false });
    for (const [nome, avaria] of ESTADOS_INICIAIS) {
      await EstadoItem.create({ nome, descricao: null, avaria, organizacao_id: org.id }, { transaction, logging: false });
    }
  });
  return org;
}
