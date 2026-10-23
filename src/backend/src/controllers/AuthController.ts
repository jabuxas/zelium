import { NextFunction, Request, Response } from "express";
import { UniqueConstraintError } from "sequelize";
import { AuthService, CredenciaisInvalidasError } from "../services/AuthService";
import { UsuarioService } from "../services/UsuarioService";
import { PAPEIS, UsuarioPapel } from "../models/Usuario";

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
      const { token, usuario } = await authService.login(String(email), String(senha));
      res.json({ token, usuario });
    } catch (err) {
      if (err instanceof CredenciaisInvalidasError) {
        return res.status(401).json({ error: "Email ou senha invalidos" });
      }
      throw err;
    }
  },

  async me(req: Request, res: Response) {
    res.json({ usuario: req.user });
  },
};

export const UsuarioController = {
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
