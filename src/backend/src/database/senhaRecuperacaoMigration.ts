import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from './connection';

export const senhaRecuperacaoMigration = {
  id: '20261104_001_senha_recuperacao',
  async up(transaction: Transaction) {
    // Pendências de redefinição: somente hash do token (nunca a senha).
    // Efêmera (expira em 24h): o down pode descartar sem perder dado de
    // negócio — quem pediu, pede de novo.
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS public.senha_pendente (
        token_hash CHAR(64) PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
        usuario_id INT NOT NULL REFERENCES usuario(id),
        expira_em TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS senha_pendente_expira_idx ON public.senha_pendente (expira_em);
      CREATE INDEX IF NOT EXISTS senha_pendente_usuario_idx ON public.senha_pendente (usuario_id);
    `, { transaction });
  },
  async down(transaction: Transaction) {
    await sequelize.query(`
      DROP TABLE public.senha_pendente;
    `, { transaction });
  },
};
