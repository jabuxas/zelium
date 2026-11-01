import { createHash, randomBytes, randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { QueryTypes, UniqueConstraintError } from 'sequelize';
import { sequelize } from '../database/connection';
import { runWithContext } from '../context/requestContext';
import { Organizacao } from '../models/Organizacao';
import { Usuario } from '../models/Usuario';
import { EstadoItem } from '../models/EstadoItem';
import { AuditLog } from '../models/AuditLog';
import { EmailService } from './EmailService';
import { PedidoCadastro } from './cadastroValidation';

export function hashTokenCadastro(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** SQL parametrizado deliberado: pendências não são dados de uma organização
 * ainda e não devem passar pelos hooks globais de auditoria de negócio. */
export class CadastroService {
  async limparExpirados(): Promise<void> {
    await sequelize.query('DELETE FROM cadastro_pendente WHERE expira_em <= NOW()', { logging: false });
  }

  async confirmar(token: string, senha: string): Promise<boolean> {
    await this.limparExpirados();
    try {
      return await sequelize.transaction({ logging: false }, async transaction => {
        const [pendente] = await sequelize.query<{ email: string; nome: string; organizacao_nome: string }>(`
          SELECT email, nome, organizacao_nome FROM cadastro_pendente
          WHERE token_hash = :tokenHash AND expira_em > NOW() FOR UPDATE
        `, { replacements: { tokenHash: hashTokenCadastro(token) }, type: QueryTypes.SELECT, transaction, logging: false });
        if (!pendente) return false;

        const remover = () => sequelize.query('DELETE FROM cadastro_pendente WHERE token_hash = :tokenHash', {
          replacements: { tokenHash: hashTokenCadastro(token) }, transaction, logging: false,
        });
        const existentes = await sequelize.query('SELECT id FROM usuario WHERE lower(email) = :email', {
          replacements: { email: pendente.email }, type: QueryTypes.SELECT, transaction, logging: false,
        });
        if (existentes.length > 0) {
          await remover();
          return false;
        }

        // Hash apenas depois de validar o token; nunca guardar senha pendente.
        const senha_hash = await bcrypt.hash(senha, 12);
        const inicio = new Date();
        // A organização ainda não tem contexto. Evita o hook global atribuir
        // seu evento à org padrão; a auditoria explícita abaixo é obrigatória
        // e participa da MESMA transação, sem tolerância a falha.
        const org = await Organizacao.create({
          nome: pendente.organizacao_nome, slug: `org-${randomUUID()}`, ativo: true,
          modalidade_acesso: 'trial', trial_inicio: inicio,
          trial_fim: new Date(inicio.getTime() + 30 * 24 * 60 * 60 * 1000),
          limite_patrimonios: 500, limite_usuarios: 5,
        }, { transaction, hooks: false, logging: false });

        await runWithContext({ usuarioId: 0, usuarioNome: 'Cadastro self-service', papel: 'gestor', organizacaoId: org.id }, async () => {
          await AuditLog.create({
            tabela: 'organizacao', registro_id: org.id, organizacao_id: org.id, acao: 'CREATE',
            dados_anteriores: null, dados_novos: org.get({ plain: true }), campos_alterados: null,
          }, { transaction, logging: false });
          await Usuario.create({
            nome: pendente.nome, email: pendente.email, senha_hash,
            papel: 'gestor', ativo: true, organizacao_id: org.id,
          }, { transaction, logging: false });
          for (const [nome, avaria] of [
            ['Em condições', false], ['Em manutenção', true], ['Inservível', true], ['Descarte pendente', true],
          ] as const) {
            await EstadoItem.create({ nome, descricao: null, avaria, organizacao_id: org.id }, { transaction, logging: false });
          }
        });
        await remover();
        return true;
      });
    } catch (err) {
      // Outra via administrativa pode reservar o email enquanto provisiona.
      // Nunca vincular/reativar uma conta existente por causa da confirmação.
      if (err instanceof UniqueConstraintError && err.errors.some(item => item.path === 'email')) return false;
      throw err;
    }
  }

  async solicitar(pedido: PedidoCadastro, confirmationUrl: string): Promise<void> {
    await this.limparExpirados();
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashTokenCadastro(token);
    // A unicidade decide a reserva em uma operação, inclusive sob concorrência.
    // Usuários arquivados também reservam seu e-mail. Compara legados sem
    // diferenciar maiúsculas; não altera os endereços já existentes.
    const reservados = await sequelize.query<{ token_hash: string }>(`
      INSERT INTO cadastro_pendente (token_hash, email, nome, organizacao_nome, expira_em)
      SELECT :tokenHash, :email, :nome, :organizacaoNome, NOW() + INTERVAL '24 hours'
      WHERE NOT EXISTS (SELECT 1 FROM usuario WHERE lower(email) = :email)
      ON CONFLICT DO NOTHING RETURNING token_hash
    `, { replacements: { ...pedido, tokenHash }, type: QueryTypes.SELECT, logging: false });
    if (reservados.length === 0) return;

    const url = new URL(confirmationUrl);
    url.hash = `token=${token}`;
    // Conteúdo fixo: nomes fornecidos pelo cliente não entram no HTML/assunto.
    const corpoTexto = `Confirme seu cadastro Zelium e defina sua senha: ${url.toString()}\n` +
      'O link expira em 24 horas. Se voce nao solicitou, ignore esta mensagem.';
    let enviada = false;
    try {
      const resultado = await new EmailService().enviar({
        para: [pedido.email], assunto: 'Confirme seu cadastro Zelium', corpoTexto,
        corpoHtml: `<p>Confirme seu cadastro Zelium e defina sua senha:</p><p><a href="${url.toString()}">Confirmar cadastro</a></p>` +
          '<p>O link expira em 24 horas. Se voce nao solicitou, ignore esta mensagem.</p>',
      }, { privado: true });
      enviada = resultado.status === 'enviada';
    } catch {
      // Mesmo contrato genérico em exceções do transporte, sem erro bruto.
      enviada = false;
    } finally {
      if (!enviada) {
        await sequelize.query('DELETE FROM cadastro_pendente WHERE token_hash = :tokenHash', {
          replacements: { tokenHash }, logging: false,
        });
      }
    }
  }
}
