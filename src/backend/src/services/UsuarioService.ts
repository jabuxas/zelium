import { CreationAttributes, Transaction, literal } from "sequelize";
import bcrypt from "bcryptjs";
import { sequelize } from "../database/connection";
import { Usuario } from "../models/Usuario";
import { BaseRepository } from "../repositories/BaseRepository";
import { AuthService, HASH_FANTASMA } from "./AuthService";
import { verificarLimiteTrial } from "./TrialService";
import { currentOrgId } from "../context/requestContext";

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
    // Limite do trial antes de custear o hash da senha.
    await verificarLimiteTrial(currentOrgId(), 'usuarios');
    const senha_hash = await this.auth.hashSenha(data.senha);
    return this.repo.create({
      nome: data.nome,
      email: data.email,
      senha_hash,
      papel: data.papel,
      ativo: data.ativo ?? true,
    } as CreationAttributes<Usuario>);
  }

  /** Compara a senha atual de um usuário (fetch unscoped: o hash não está no
   * escopo padrão). Para a troca da própria senha pelo titular autenticado. */
  async verificarSenhaAtual(id: number, senhaAtual: string): Promise<boolean> {
    const usuario = await Usuario.unscoped().findByPk(id);
    const igual = await bcrypt.compare(senhaAtual, usuario?.senha_hash ?? HASH_FANTASMA);
    return Boolean(usuario) && igual;
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

    // Troca de senha ou desativação revogam todas as sessões emitidas: a
    // versão sobe na MESMA transação da gravação (número de sessão pode
    // crescer; nenhuma sessão antiga sobrevive).
    const revogarSessoes = data.senha !== undefined || data.ativo === false;
    if (!revogarSessoes) {
      return this.repo.update(id, patch);
    }
    return sequelize.transaction(async (transaction: Transaction) => {
      const atualizado = await this.repo.update(id, patch, transaction);
      if (atualizado) {
        await Usuario.update(
          { sessao_version: literal("sessao_version + 1") as unknown as number },
          { where: { id }, transaction }
        );
        // Link de recuperação emitido antes não pode redefinir a senha nova.
        await sequelize.query('DELETE FROM senha_pendente WHERE usuario_id = :id', {
          replacements: { id }, transaction, logging: false,
        });
      }
      return atualizado;
    });
  }

  delete(id: number) {
    return this.repo.delete(id);
  }

  restore(id: number) {
    return this.repo.restore(id);
  }
}
