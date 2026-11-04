import { createHash, randomBytes } from 'crypto';
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
}
