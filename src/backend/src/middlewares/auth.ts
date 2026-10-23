import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/auth";
import { UsuarioPapel } from "../models/Usuario";

export interface AuthPayload {
  sub: string;
  email: string;
  nome: string;
  papel: UsuarioPapel;
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
    req.user = {
      sub: String(payload.sub),
      email: String(payload.email),
      nome: String(payload.nome),
      papel: payload.papel as UsuarioPapel,
    };
    next();
  } catch {
    return res
      .status(401)
      .json({ error: "Sessao expirada ou token invalido. Faca login novamente." });
  }
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
