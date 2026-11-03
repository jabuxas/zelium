import { Organizacao } from "../models/Organizacao";
import { Patrimonio } from "../models/Patrimonio";
import { Usuario } from "../models/Usuario";

export type DominioLimite = "patrimonios" | "usuarios";

export class LimiteTrialAtingidoError extends Error {
  readonly codigo = "limite_trial";

  constructor(dominio: DominioLimite, limite: number) {
    const unidade = dominio === "patrimonios" ? "patrimonios ativos" : "usuarios ativos";
    super(`Limite do trial atingido: ${limite} ${unidade}.`);
    this.name = "LimiteTrialAtingidoError";
  }
}

/**
 * Limite de criação do trial, por domínio. Só se aplica a organizações
 * `trial` dentro do prazo — `legado` (contas anteriores) não tem limite e
 * trial expirada já foi bloqueada pela guarda de escrita (defesa em
 * profundidade: aqui ela também não consume verificação).
 *
 * Contagem: patrimônios não arquivados (paranoid) e usuários ativos
 * (desativar libera vaga). Ambos passam pelo escopo automático da
 * organização da requisição (hooks em database/connection.ts).
 *
 * Concorrência: contagem e inserção não são atômicas — duas criações
 * simultâneas na borda do limite podem excedê-lo por unidade. Guardrail de
 * trial aceita essa margem; limites contratuais rígidos exigirão
 * serialização por organização (documentado no ADR-0013).
 */
export async function verificarLimiteTrial(
  organizacaoId: number | undefined,
  dominio: DominioLimite
): Promise<void> {
  if (!organizacaoId) return;
  const organizacao = await Organizacao.unscoped().findByPk(organizacaoId);
  if (!organizacao || organizacao.modalidade_acesso !== "trial") return;
  if (organizacao.trial_fim && organizacao.trial_fim.getTime() <= Date.now()) return;

  const limite = dominio === "patrimonios"
    ? organizacao.limite_patrimonios
    : organizacao.limite_usuarios;
  if (limite == null) return;

  const usado = dominio === "patrimonios"
    ? await Patrimonio.count()
    : await Usuario.count({ where: { ativo: true } });
  if (usado >= limite) throw new LimiteTrialAtingidoError(dominio, limite);
}
