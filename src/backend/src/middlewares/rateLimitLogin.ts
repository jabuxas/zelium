import { NextFunction, Request, Response } from "express";

/**
 * Limita força bruta contra /api/auth/login.
 *
 * - Conta apenas falhas de credencial (HTTP 401): sucesso não consome cota,
 *   e 400 de payload incompleto é barato de processar (não roda bcrypt).
 * - Chave por IP. Com `trust proxy` ativo (Caddy na frente), req.ip é o
 *   cliente real; sem proxy, é o par direto.
 * - Contadores em memória: o deploy atual tem UM backend. Se um dia houver
 *   mais de uma instância, trocar por armazenamento compartilhado — limites
 *   in-memory multiplicam pelo número de instâncias sem ninguém perceber.
 */
const JANELA_MS = 15 * 60 * 1000;
const LIMITE_PADRAO = 10;
const CAPACIDADE_MAPA = 10_000;

interface RegistroFalhas {
  falhas: number;
  expiraEm: number;
}

const registros = new Map<string, RegistroFalhas>();

function limite(): number {
  const configurado = Number(process.env.RATE_LIMIT_LOGIN_MAX);
  return Number.isInteger(configurado) && configurado > 0 ? configurado : LIMITE_PADRAO;
}

function chave(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "desconhecido";
}

export function rateLimitLogin(req: Request, res: Response, next: NextFunction) {
  const agora = Date.now();
  const ip = chave(req);
  const registro = registros.get(ip);

  if (registro && registro.expiraEm > agora && registro.falhas >= limite()) {
    res.setHeader("Retry-After", String(Math.ceil((registro.expiraEm - agora) / 1000)));
    return res.status(429).json({
      error: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
    });
  }

  // Poda preguiçosa: sem timer no processo; dispara só quando o mapa cresce.
  if (registros.size > CAPACIDADE_MAPA) {
    for (const [chaveRegistro, item] of registros) {
      if (item.expiraEm <= agora) registros.delete(chaveRegistro);
    }
  }

  res.on("finish", () => {
    if (res.statusCode !== 401) return;
    const atual = registros.get(ip);
    if (!atual || atual.expiraEm <= agora) {
      registros.set(ip, { falhas: 1, expiraEm: agora + JANELA_MS });
      return;
    }
    atual.falhas += 1;
  });

  next();
}

/** Isolamento entre suítes de teste; nunca usar em produção. */
export function resetRateLimitLoginParaTeste(): void {
  registros.clear();
}
