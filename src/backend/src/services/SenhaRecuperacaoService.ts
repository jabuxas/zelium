import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../database/connection';
import { EmailService } from './EmailService';

export function hashTokenSenha(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Recuperação de senha: mesma disciplina das pendências de cadastro
 * (ADR-0012) — token opaco de 256 bits, só hash no banco, link no
 * fragmento, envio privado, resposta genérica (nada revela se o e-mail
 * existe). Pendências são efêmeras (24h) e únicas por usuário.
 */
export class SenhaRecuperacaoService {
  async limparExpirados(): Promise<void> {
    await sequelize.query('DELETE FROM senha_pendente WHERE expira_em <= NOW()', { logging: false });
  }

  async solicitar(email: string, confirmationUrl: string): Promise<void> {
    await this.limparExpirados();
    // Comparação em lower: contas legadas podem ter e-mail em maiúsculas.
    const [usuario] = await sequelize.query<{ id: number }>(`
      SELECT id FROM usuario WHERE lower(email) = :email AND ativo = TRUE LIMIT 1
    `, { replacements: { email }, type: QueryTypes.SELECT, logging: false });
    if (!usuario) return;

    const existente = await sequelize.query<{ token_hash: string }>(`
      SELECT token_hash FROM senha_pendente
      WHERE usuario_id = :usuarioId AND expira_em > NOW() LIMIT 1
    `, { replacements: { usuarioId: usuario.id }, type: QueryTypes.SELECT, logging: false });
    if (existente.length > 0) return; // um link válido por usuário; sem reenvio

    const token = randomBytes(32).toString('hex');
    const tokenHash = hashTokenSenha(token);
    const reservados = await sequelize.query<{ token_hash: string }>(`
      INSERT INTO senha_pendente (token_hash, usuario_id, expira_em)
      SELECT :tokenHash, :usuarioId, NOW() + INTERVAL '24 hours'
      WHERE EXISTS (SELECT 1 FROM usuario WHERE id = :usuarioId AND ativo = TRUE)
      RETURNING token_hash
    `, { replacements: { tokenHash, usuarioId: usuario.id }, type: QueryTypes.SELECT, logging: false });
    if (reservados.length === 0) return;

    const url = new URL(confirmationUrl);
    url.hash = `token=${token}`;
    const corpoTexto = `Redefina sua senha Zelium: ${url.toString()}\n` +
      'O link expira em 24 horas. Se voce nao solicitou, ignore esta mensagem ' +
      'e sua senha atual continua valida.';
    let enviada = false;
    try {
      const resultado = await new EmailService().enviar({
        para: [email], assunto: 'Redefinicao de senha Zelium', corpoTexto,
        corpoHtml: `<p>Redefina sua senha Zelium:</p><p><a href="${url.toString()}">Redefinir senha</a></p>` +
          '<p>O link expira em 24 horas. Se voce nao solicitou, ignore esta mensagem ' +
          'e sua senha atual continua valida.</p>',
      }, { privado: true });
      enviada = resultado.status === 'enviada';
    } catch {
      enviada = false;
    } finally {
      if (!enviada) {
        await sequelize.query('DELETE FROM senha_pendente WHERE token_hash = :tokenHash', {
          replacements: { tokenHash }, logging: false,
        });
      }
    }
  }

  /**
   * Consome o token e redefine a senha em UMA transação com bloqueio de
   * linha: UPDATE único (hash + sessao_version) revoga todas as sessões
   * emitidas antes (ADR-0011) junto com o consumo da pendência. Conta
   * desativada não é reativada pelo link — pendência descartada.
   */
  async redefinir(token: string, senha: string): Promise<boolean> {
    await this.limparExpirados();
    try {
      return await sequelize.transaction({ logging: false }, async transaction => {
        const [pendente] = await sequelize.query<{ usuario_id: number }>(`
          SELECT usuario_id FROM senha_pendente
          WHERE token_hash = :tokenHash AND expira_em > NOW() FOR UPDATE
        `, { replacements: { tokenHash: hashTokenSenha(token) }, type: QueryTypes.SELECT, transaction, logging: false });
        if (!pendente) return false;

        const [usuario] = await sequelize.query<{ ativo: boolean }>(
          'SELECT ativo FROM usuario WHERE id = :id FOR UPDATE',
          { replacements: { id: pendente.usuario_id }, type: QueryTypes.SELECT, transaction, logging: false },
        );
        if (!usuario || !usuario.ativo) {
          await sequelize.query('DELETE FROM senha_pendente WHERE token_hash = :tokenHash', {
            replacements: { tokenHash: hashTokenSenha(token) }, transaction, logging: false,
          });
          return false;
        }

        const senha_hash = await bcrypt.hash(senha, 12);
        await sequelize.query(`
          UPDATE usuario SET senha_hash = :senhaHash, sessao_version = sessao_version + 1
          WHERE id = :id
        `, { replacements: { senhaHash: senha_hash, id: pendente.usuario_id }, transaction, logging: false });
        await sequelize.query('DELETE FROM senha_pendente WHERE token_hash = :tokenHash', {
          replacements: { tokenHash: hashTokenSenha(token) }, transaction, logging: false,
        });
        return true;
      });
    } catch {
      // Falha de banco não vaza detalhes; pendência permanece até expirar.
      return false;
    }
  }
}
