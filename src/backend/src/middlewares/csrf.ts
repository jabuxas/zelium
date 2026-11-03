import { NextFunction, Request, Response } from "express";

/**
 * Defesa CSRF para requisições autenticadas por COOKIE.
 *
 * Um cookie é anexado automaticamente pelo navegador a qualquer requisição
 * para este site — inclusive a formulários forjados em outro site. Bearer
 * não tem esse risco (o atacante não consegue definir o header de outro
 * domínio), por isso só o caminho-cookie exige o header customizado.
 *
 * Header customizado exige preflight CORS; o preflight só é aprovado para
 * origens da allowlist (origensWebPermitidas) — combinado com SameSite=Lax,
 * fecha cross-site em navegadores modernos e antigos (OWASP).
 */
export function exigirCsrfParaCookie(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD") return next();
  if (req.headers.authorization) return next(); // autenticado por header: sem risco de cookie
  if (req.headers["x-requested-with"] === "XMLHttpRequest") return next();
  return res.status(403).json({
    error: "Requisicao bloqueada por seguranca (CSRF). Use a aplicacao web oficial.",
    codigo: "csrf",
  });
}
