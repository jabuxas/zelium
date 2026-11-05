import bcrypt from 'bcryptjs';
import { QueryTypes, UniqueConstraintError } from 'sequelize';
import { sequelize } from './connection';
import { DEFAULT_SENHA_HASH } from './migrate';
import { validarPedidoCadastro } from '../services/cadastroValidation';
import { provisionarOrganizacao } from '../services/ProvisionamentoService';

type Ambiente = Record<string, string | undefined>;

const NOME_ORGANIZACAO_PADRAO = 'Minha organização';
const NOME_GESTOR_PADRAO = 'Gestor';

/**
 * Primeira subida de um servidor novo, sem passar por SQL: com
 * BOOTSTRAP_GESTOR_EMAIL e BOOTSTRAP_GESTOR_SENHA o backend cria a
 * organização (sem prazo nem limites — é a do próprio operador), o Gestor e
 * os estados iniciais, e desativa as contas demo do seed que ainda têm a
 * senha padrão (publicada no repositório).
 *
 * Idempotente e conservador: se o e-mail já existe, nada é criado, alterado
 * ou sobrescrito — manter as variáveis no .env depois da primeira subida é
 * seguro e a senha NUNCA é redefinida por aqui (use a recuperação de senha).
 */
export async function bootstrapPrimeiraOrganizacao(env: Ambiente = process.env): Promise<{ criada: boolean }> {
  const email = env.BOOTSTRAP_GESTOR_EMAIL?.trim();
  const senha = env.BOOTSTRAP_GESTOR_SENHA;
  if (!email && !senha) return { criada: false };
  if (!email) throw new Error('Bootstrap incompleto: defina também BOOTSTRAP_GESTOR_EMAIL.');
  if (!senha) throw new Error('Bootstrap incompleto: defina também BOOTSTRAP_GESTOR_SENHA.');

  const pedido = validarPedidoCadastro({
    nome: env.BOOTSTRAP_GESTOR_NOME?.trim() || NOME_GESTOR_PADRAO,
    email,
    organizacaoNome: env.BOOTSTRAP_ORGANIZACAO_NOME?.trim() || NOME_ORGANIZACAO_PADRAO,
  });
  if (!pedido) {
    throw new Error('Bootstrap inválido: confira BOOTSTRAP_GESTOR_EMAIL (e-mail válido) e os nomes (até 100/150 caracteres).');
  }
  if (senha.length < 12 || !senha.trim()) {
    throw new Error('Bootstrap inválido: BOOTSTRAP_GESTOR_SENHA precisa ter pelo menos 12 caracteres.');
  }
  if (Buffer.byteLength(senha, 'utf8') > 72) {
    throw new Error('Bootstrap inválido: BOOTSTRAP_GESTOR_SENHA excede 72 bytes (limite do bcrypt).');
  }

  try {
    return await sequelize.transaction({ logging: false }, async transaction => {
      const existentes = await sequelize.query('SELECT id FROM usuario WHERE lower(email) = :email', {
        replacements: { email: pedido.email }, type: QueryTypes.SELECT, transaction, logging: false,
      });
      if (existentes.length > 0) {
        console.log(`[bootstrap] ${pedido.email} já existe: nada a fazer.`);
        return { criada: false };
      }

      const org = await provisionarOrganizacao({
        organizacaoNome: pedido.organizacaoNome, gestorNome: pedido.nome, gestorEmail: pedido.email,
        senhaHash: await bcrypt.hash(senha, 12), modalidade: 'legado', origem: 'Bootstrap do servidor',
      }, transaction);

      // Só as contas ainda com a senha padrão: quem já trocou a senha segue ativo.
      const [, desativadas] = await sequelize.query(`
        UPDATE usuario SET ativo = FALSE, sessao_version = sessao_version + 1, updated_at = NOW()
        WHERE email IN ('gestor@zelium.com', 'responsavel@zelium.com', 'conferente@zelium.com')
          AND senha_hash = :hashPadrao AND ativo = TRUE
      `, { replacements: { hashPadrao: DEFAULT_SENHA_HASH }, transaction, logging: false }) as [unknown, { rowCount?: number }];

      console.log(
        `[bootstrap] Organização "${pedido.organizacaoNome}" (#${org.id}) e Gestor ${pedido.email} criados; ` +
          `${desativadas?.rowCount ?? 0} conta(s) demo desativada(s).`,
      );
      return { criada: true };
    });
  } catch (err) {
    // Corrida entre réplicas: o outro processo criou o mesmo e-mail primeiro.
    if (err instanceof UniqueConstraintError) return { criada: false };
    throw err;
  }
}
