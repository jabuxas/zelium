import { NextFunction, Request, Response } from "express";
import { UniqueConstraintError } from "sequelize";
import { AuthService, CredenciaisInvalidasError } from "../services/AuthService";
import { UsuarioService } from "../services/UsuarioService";
import { LimiteTrialAtingidoError } from "../services/TrialService";
import { PAPEIS, UsuarioPapel } from "../models/Usuario";
import { Organizacao } from "../models/Organizacao";
import { COOKIE_SESSAO, cookieMaxAgeSegundos, cookieSeguro } from "../config/sessao";

const authService = new AuthService();
const usuarioService = new UsuarioService();

function isPapelValido(papel: unknown): papel is UsuarioPapel {
  return typeof papel === "string" && (PAPEIS as readonly string[]).includes(papel);
}

export const AuthController = {
  async login(req: Request, res: Response) {
    const { email, senha } = req.body ?? {};

    if (!email || !senha || String(email).trim() === "" || String(senha).trim() === "") {
      return res.status(400).json({ error: "email e senha sao obrigatorios" });
    }

    try {
      const { token, usuario, organizacao } = await authService.login(String(email), String(senha));
      // Cookie HttpOnly para o navegador (web). O token segue no corpo para o
      // app mobile (AsyncStorage + Bearer); a web NÃO deve persisti-lo.
      res.cookie(COOKIE_SESSAO, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: cookieSeguro(),
        maxAge: cookieMaxAgeSegundos() * 1000,
        path: "/",
      });
      res.json({ token, usuario, organizacao });
    } catch (err) {
      if (err instanceof CredenciaisInvalidasError) {
        return res.status(401).json({ error: "Email ou senha invalidos" });
      }
      throw err;
    }
  },

  /** Logout do navegador: apaga o cookie (destruição client-side; sem
   * denylist — mesma semântica do logout mobile local). */
  async logout(_req: Request, res: Response) {
    res.clearCookie(COOKIE_SESSAO, {
      httpOnly: true,
      sameSite: "lax",
      secure: cookieSeguro(),
      path: "/",
    });
    res.json({ message: "Sessao encerrada" });
  },

  async me(req: Request, res: Response) {
    const organizacao = req.user
      ? await Organizacao.findByPk(req.user.organizacaoId)
      : null;
    res.json({
      usuario: req.user,
      organizacao: organizacao ? { id: organizacao.id, nome: organizacao.nome } : null,
    });
  },
};

export const UsuarioController = {
  /** Troca da própria senha pelo titular autenticado (qualquer papel).
   * Exige a senha atual; sessões antigas moram no bump de sessao_version
   * (ADR-0011) — inclusive a que fez a troca. */
  async alterarSenhaPropia(req: Request, res: Response) {
    const body = req.body as Record<string, unknown> | null;
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).length !== 2
      || Object.keys(body).some(c => !['senha_atual', 'senha'].includes(c))) {
      return res.status(400).json({ error: 'Informe senha_atual e senha, sem campos adicionais' });
    }
    const { senha_atual, senha } = body;
    if (typeof senha !== 'string' || senha.length < 12 || Buffer.byteLength(senha, 'utf8') > 72 || !senha.trim()) {
      return res.status(400).json({ error: 'senha deve ter de 12 caracteres a 72 bytes' });
    }
    if (typeof senha_atual !== 'string' || senha_atual.length === 0 || Buffer.byteLength(senha_atual, 'utf8') > 200) {
      return res.status(400).json({ error: 'senha_atual e obrigatoria' });
    }
    const id = Number(req.user?.sub);
    if (!await usuarioService.verificarSenhaAtual(id, senha_atual)) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }
    await usuarioService.update(id, { senha });
    res.json({ message: 'Senha alterada. Faca login novamente com a nova senha.' });
  },

  async findAll(_req: Request, res: Response) {
    const usuarios = await usuarioService.findAll();
    res.json(usuarios);
  },

  async findById(req: Request, res: Response) {
    const usuario = await usuarioService.findById(Number(req.params.id));
    if (!usuario) return res.status(404).json({ error: "Usuario nao encontrado" });
    res.json(usuario);
  },

  async create(req: Request, res: Response, next: NextFunction) {
    const { nome, email, senha, papel, ativo } = req.body ?? {};

    if (!nome || String(nome).trim() === "") {
      return res.status(400).json({ error: "nome e obrigatorio" });
    }
    if (!email || !String(email).includes("@")) {
      return res.status(400).json({ error: "email valido e obrigatorio" });
    }
    if (!senha || String(senha).length < 8) {
      return res.status(400).json({ error: "senha deve ter ao menos 8 caracteres" });
    }
    if (!isPapelValido(papel)) {
      return res.status(400).json({ error: "papel invalido" });
    }

    try {
      const usuario = await usuarioService.create({ nome, email, senha, papel, ativo });
      res.status(201).json(usuario);
    } catch (err) {
      if (err instanceof LimiteTrialAtingidoError) {
        return res.status(403).json({ error: err.message, codigo: err.codigo });
      }
      if (err instanceof UniqueConstraintError) {
        return res.status(409).json({ error: "Ja existe um usuario com este email" });
      }
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    const { nome, email, senha, papel, ativo } = req.body ?? {};

    if (papel !== undefined && !isPapelValido(papel)) {
      return res.status(400).json({ error: "papel invalido" });
    }
    if (senha !== undefined && String(senha).length < 8) {
      return res.status(400).json({ error: "senha deve ter ao menos 8 caracteres" });
    }

    try {
      const usuario = await usuarioService.update(Number(req.params.id), req.body);
      if (!usuario) return res.status(404).json({ error: "Usuario nao encontrado" });
      res.json(usuario);
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        return res.status(409).json({ error: "Ja existe um usuario com este email" });
      }
      next(err);
    }
  },

  async delete(req: Request, res: Response) {
    const deleted = await usuarioService.delete(Number(req.params.id));
    if (!deleted) return res.status(404).json({ error: "Usuario nao encontrado" });
    res.status(204).send();
  },
};
