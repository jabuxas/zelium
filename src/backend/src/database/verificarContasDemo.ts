import { QueryTypes } from 'sequelize';
import { sequelize } from './connection';
import { DEFAULT_SENHA_HASH } from './migrate';

/**
 * Conta demo é a de seed com senha conhecida (documentada) — conhecida por
 * QUALQUER pessoa que leu o repositório. Em produção, subir com essas contas
 * intactas entrega o inventário: recusa no arranque (fail fast, mesmo
 * espírito do JWT_SECRET, ADR de sessões) e instrui a troca.
 *
 * A comparação é contra o hash EXATO do seed: quem já trocou a senha passa
 * sem atrito. `PERMITIR_CONTAS_DEMO=true` é transição consciente, com aviso.
 */
export async function verificarContasDemo(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.PERMITIR_CONTAS_DEMO === 'true') {
    console.warn(
      '[seguranca] PERMITIR_CONTAS_DEMO=true: contas demo com senha conhecida estão ATIVAS. ' +
        'Troque as senhas e remova a variável assim que possível.',
    );
    return;
  }

  const [usuarios] = await sequelize.query<{ total: string }>(`
    SELECT COUNT(*)::text AS total FROM usuario
    WHERE email IN ('gestor@zelium.com', 'responsavel@zelium.com', 'conferente@zelium.com')
      AND senha_hash = :hashPadrao AND ativo = TRUE
  `, { replacements: { hashPadrao: DEFAULT_SENHA_HASH }, type: QueryTypes.SELECT });

  if (Number(usuarios?.total ?? 0) > 0) {
    throw new Error(
      'Contas demo com a senha padrão (Zelium@2026) estão ativas. ' +
        'Troque as senhas dessas contas (PUT /api/usuarios/:id ou SQL) antes de subir em produção, ' +
        'ou defina PERMITIR_CONTAS_DEMO=true sabendo do risco.',
    );
  }
}
