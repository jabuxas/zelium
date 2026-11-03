import { NextFunction, Request, Response } from "express";
import { Organizacao } from "../models/Organizacao";

export type StatusTrial = "legado" | "ativo" | "expirado";

/**
 * Status de fiscalização do trial da organização.
 * - `legado`: contas anteriores ao self-service — sem prazo nem limites.
 * - `ativo`: trial dentro do prazo (trial_fim no futuro).
 * - `expirado`: trial vencida. Falha fechada: organização ausente ou sem
 *   modalidade reconhecível é tratada como legado APENAS se o registro
 *   existir; registro inexistente nunca autoriza escrita (bloqueia).
 */
export async function statusTrial(organizacaoId: number): Promise<StatusTrial> {
  const organizacao = await Organizacao.unscoped().findByPk(organizacaoId);
  if (!organizacao) return "expirado";
  if (organizacao.modalidade_acesso !== "trial") return "legado";
  return organizacao.trial_fim && organizacao.trial_fim.getTime() > Date.now()
    ? "ativo"
    : "expirado";
}

/**
 * Trial expirada permite leituras/exportações (GET/HEAD já filtradas por
 * RBAC por perfil) e bloqueia QUALQUER escrita de negócio, inclusive do
 * Gestor. Rotas de autenticação (login, cadastro) ficam fora deste router.
 *
 * Consulta a organização apenas em métodos de escrita: leituras não pagam
 * a consulta extra. O custo cai só sobre escritas — volume de piloto.
 */
export async function exigirTrialValido(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.method === "GET" || req.method === "HEAD") return next();
  if (!req.user) return next();

  try {
    const status = await statusTrial(req.user.organizacaoId);
    if (status !== "expirado") return next();
    return res.status(403).json({
      error:
        "Periodo de trial expirado: escritas bloqueadas. Consultas e exportacoes continuam disponiveis conforme seu perfil.",
      codigo: "trial_expirado",
    });
  } catch {
    // Falha fechada: sem conseguir validar o trial, a escrita não passa.
    console.error("[trial] Falha ao validar organizacao");
    return res
      .status(503)
      .json({ error: "Nao foi possivel validar a organizacao. Tente novamente." });
  }
}
