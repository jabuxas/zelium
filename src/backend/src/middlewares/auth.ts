import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/auth";
import type { UsuarioPapel } from "../models/Usuario";
import { revalidarSessao } from "./revalidarSessao";
import { runWithContext } from "../context/requestContext";

export interface AuthPayload {
  sub: string;
  email: string;
  nome: string;
  papel: UsuarioPapel;
  organizacaoId: number;
  /** sessao_version no momento da emissão; divergência revoga o token. */
  ver: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Autenticacao necessaria. Faca login para continuar." });
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    if (!payload.organizacaoId) {
      return res
        .status(401)
        .json({ error: "Sessao desatualizada. Faca login novamente." });
    }

    // Revalidação por requisição: usuário/organização ativos e versão de
    // sessão. Troca de senha ou desativação revogam tokens já emitidos.
    // Custo: duas consultas por request — aceitável no volume do piloto.
    void revalidarSessao(String(payload.sub))
      .then((usuario) => {
        if (!usuario) {
          return res.status(401).json({
            error: "Sessao invalida ou encerrada. Faca login novamente.",
          });
        }
        if (Number(payload.ver) !== usuario.sessao_version) {
          return res
            .status(401)
            .json({ error: "Sessao desatualizada. Faca login novamente." });
        }
        req.user = {
          sub: String(payload.sub),
          email: String(payload.email),
          nome: String(payload.nome),
          papel: payload.papel as UsuarioPapel,
          organizacaoId: Number(payload.organizacaoId),
          ver: Number(payload.ver),
        };
        next();
      })
      .catch(() => {
        res
          .status(401)
          .json({ error: "Sessao invalida. Faca login novamente." });
      });
  } catch {
    return res
      .status(401)
      .json({ error: "Sessao expirada ou token invalido. Faca login novamente." });
  }
}

/**
 * Roda toda a cadeia de middlewares/controllers da requisição dentro do
 * AsyncLocalStorage com os dados do usuário, isolando o acesso a dados por
 * organização (multiempresa).
 */
export function withUserContext(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return next();
  }
  return runWithContext(
    {
      usuarioId: Number(req.user.sub),
      usuarioNome: req.user.nome,
      papel: req.user.papel,
      organizacaoId: req.user.organizacaoId,
    },
    () => next()
  );
}

export function authorize(...papeis: UsuarioPapel[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Autenticacao necessaria" });
    }
    if (!papeis.includes(req.user.papel)) {
      return res.status(403).json({
        error: "Acesso negado: seu perfil nao tem permissao para esta acao",
      });
    }
    next();
  };
}
