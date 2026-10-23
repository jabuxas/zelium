import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config/auth";
import { Usuario, UsuarioPapel } from "../models/Usuario";
import { Organizacao } from "../models/Organizacao";

export interface AuthUser {
  id: number;
  email: string;
  nome: string;
  papel: UsuarioPapel;
  organizacaoId: number;
}

export interface LoginResult {
  token: string;
  usuario: AuthUser;
  organizacao: { id: number; nome: string };
}

export class CredenciaisInvalidasError extends Error {
  constructor() {
    super("Credenciais invalidas");
    this.name = "CredenciaisInvalidasError";
  }
}

function toAuthUser(usuario: Usuario): AuthUser {
  return {
    id: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    papel: usuario.papel,
    organizacaoId: usuario.organizacao_id,
  };
}

export class AuthService {
  async login(email: string, senha: string): Promise<LoginResult> {
    const usuario = await Usuario.unscoped().findOne({ where: { email } });
    if (!usuario || !usuario.ativo) {
      throw new CredenciaisInvalidasError();
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      throw new CredenciaisInvalidasError();
    }

    const organizacao = await Organizacao.findByPk(usuario.organizacao_id);
    if (!organizacao || !organizacao.ativo) {
      throw new CredenciaisInvalidasError();
    }

    return {
      token: this.signToken(usuario),
      usuario: toAuthUser(usuario),
      organizacao: { id: organizacao.id, nome: organizacao.nome },
    };
  }

  signToken(usuario: Usuario): string {
    return jwt.sign(
      {
        email: usuario.email,
        nome: usuario.nome,
        papel: usuario.papel,
        organizacaoId: usuario.organizacao_id,
      },
      JWT_SECRET,
      {
        subject: String(usuario.id),
        expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
      }
    );
  }

  async hashSenha(senha: string): Promise<string> {
    return bcrypt.hash(senha, 10);
  }
}
