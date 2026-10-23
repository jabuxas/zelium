import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_EXPIRES_IN, JWT_SECRET } from "../config/auth";
import { Usuario, UsuarioPapel } from "../models/Usuario";

export interface AuthUser {
  id: number;
  email: string;
  nome: string;
  papel: UsuarioPapel;
}

export interface LoginResult {
  token: string;
  usuario: AuthUser;
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

    return { token: this.signToken(usuario), usuario: toAuthUser(usuario) };
  }

  signToken(usuario: Usuario): string {
    return jwt.sign(
      {
        email: usuario.email,
        nome: usuario.nome,
        papel: usuario.papel,
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
