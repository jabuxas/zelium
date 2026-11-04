import { QueryTypes } from 'sequelize';
import { sequelize } from './connection';

export interface ConfigRetencao {
  /** Dias de retenção de notificações. Padrão: 180. `0` mantém para sempre. */
  notificacaoDias?: number;
  /** Dias de retenção da auditoria. Padrão: 0 (manter tudo — é o rastro de
   * responsabilidade; purgar exige decisão explícita do operador). */
  auditoriaDias?: number;
}

export interface ResultadoRetencao {
  pendencias: number;
  notificacoes: number;
  auditoria: number;
}

async function apagarPorIdade(tabela: string, coluna: string, dias: number): Promise<number> {
  const linhas = await sequelize.query<{ total: number }>(`
    WITH apagados AS (
      DELETE FROM ${tabela} WHERE ${coluna} < NOW() - (:dias || ' days')::interval RETURNING 1
    ) SELECT COUNT(*)::int AS total FROM apagados
  `, { replacements: { dias }, type: QueryTypes.SELECT, logging: false });
  return linhas[0]?.total ?? 0;
}

/**
 * Rotina de retenção operacional (privacidade: dados que não precisam mais
 * existir deixam de existir). Uso por script agendado (`retencao:executar`)
 * ou direto nos testes.
 *
 * - Pendências de cadastro/senha: expiram em 24h e são apagadas sempre
 *   (retenção máxima efetiva = intervalo entre execuções, ~48h no diário).
 * - Notificações: purga por idade (padrão 180 dias quando o script roda
 *   sem env; `0` desliga).
 * - Auditoria: NÃO purga por padrão — é o rastro de responsabilidade;
 *   `AUDITORIA_RETENCAO_DIAS` explicita a decisão.
 *
 * Relata CONTAGENS, nunca conteúdos.
 */
export async function executarRetencao(config: ConfigRetencao = {}): Promise<ResultadoRetencao> {
  const [cadastro] = await sequelize.query<{ total: number }>(
    'WITH apagados AS (DELETE FROM cadastro_pendente WHERE expira_em <= NOW() RETURNING 1) ' +
    'SELECT COUNT(*)::int AS total FROM apagados', { type: QueryTypes.SELECT, logging: false });
  const [senha] = await sequelize.query<{ total: number }>(
    'WITH apagados AS (DELETE FROM senha_pendente WHERE expira_em <= NOW() RETURNING 1) ' +
    'SELECT COUNT(*)::int AS total FROM apagados', { type: QueryTypes.SELECT, logging: false });

  const notificacaoDias = config.notificacaoDias ?? Number(process.env.NOTIFICACAO_RETENCAO_DIAS ?? 180);
  const auditoriaDias = config.auditoriaDias ?? Number(process.env.AUDITORIA_RETENCAO_DIAS ?? 0);

  const notificacoes = notificacaoDias > 0
    ? await apagarPorIdade('notificacao', 'created_at', notificacaoDias)
    : 0;
  const auditoria = auditoriaDias > 0
    ? await apagarPorIdade('audit_log', 'created_at', auditoriaDias)
    : 0;

  return {
    pendencias: (cadastro?.total ?? 0) + (senha?.total ?? 0),
    notificacoes,
    auditoria,
  };
}
