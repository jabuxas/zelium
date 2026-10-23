import { CreationAttributes } from "sequelize";
import { Usuario } from "../models/Usuario";
import { BaseRepository } from "../repositories/BaseRepository";
import { AuthService } from "./AuthService";

export interface CriarUsuarioData {
  nome: string;
  email: string;
  senha: string;
  papel: Usuario["papel"];
  ativo?: boolean;
}

export class UsuarioService {
  private repo = new BaseRepository<Usuario>(Usuario);
  private auth = new AuthService();

  async findAll() {
    return this.repo.findAll();
  }

  async findById(id: number) {
    return this.repo.findById(id);
  }

  async create(data: CriarUsuarioData) {
    const senha_hash = await this.auth.hashSenha(data.senha);
    return this.repo.create({
      nome: data.nome,
      email: data.email,
      senha_hash,
      papel: data.papel,
      ativo: data.ativo ?? true,
    } as CreationAttributes<Usuario>);
  }

  async update(id: number, data: Partial<CriarUsuarioData>) {
    const patch: Partial<CreationAttributes<Usuario>> = {
      nome: data.nome,
      email: data.email,
      papel: data.papel,
      ativo: data.ativo,
    };
    if (data.senha) {
      patch.senha_hash = await this.auth.hashSenha(data.senha);
    }
    return this.repo.update(id, patch);
  }

  delete(id: number) {
    return this.repo.delete(id);
  }

  restore(id: number) {
    return this.repo.restore(id);
  }
}
