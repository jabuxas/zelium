import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from './connection';

export const cadastroSelfServiceMigration = {
  id: '20261101_001_cadastro_self_service',
  async up(transaction: Transaction) {
    await sequelize.query(`
      ALTER TABLE public.organizacao
        ADD COLUMN IF NOT EXISTS modalidade_acesso VARCHAR(20) NOT NULL DEFAULT 'legado',
        ADD COLUMN IF NOT EXISTS trial_inicio TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS trial_fim TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS limite_patrimonios INT,
        ADD COLUMN IF NOT EXISTS limite_usuarios INT;
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint
          WHERE conrelid = 'public.organizacao'::regclass AND conname = 'organizacao_acesso_check') THEN
          ALTER TABLE public.organizacao ADD CONSTRAINT organizacao_acesso_check CHECK (
            (modalidade_acesso = 'legado' AND trial_inicio IS NULL AND trial_fim IS NULL
              AND limite_patrimonios IS NULL AND limite_usuarios IS NULL)
            OR (modalidade_acesso = 'trial' AND trial_inicio IS NOT NULL AND trial_fim IS NOT NULL
              AND trial_fim > trial_inicio AND limite_patrimonios IS NOT NULL AND limite_patrimonios > 0
              AND limite_usuarios IS NOT NULL AND limite_usuarios > 0)
          );
        END IF;
      END $$;
      CREATE TABLE IF NOT EXISTS public.cadastro_pendente (
        token_hash CHAR(64) PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
        email VARCHAR(100) NOT NULL UNIQUE CHECK (email = lower(btrim(email))),
        nome VARCHAR(100) NOT NULL,
        organizacao_nome VARCHAR(150) NOT NULL,
        expira_em TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS cadastro_pendente_expira_idx ON public.cadastro_pendente (expira_em);
    `, { transaction });
  },
  async down(transaction: Transaction) {
    const [uso] = await sequelize.query<{ existe: boolean }>(`
      SELECT EXISTS (SELECT 1 FROM public.organizacao WHERE modalidade_acesso <> 'legado')
        OR EXISTS (SELECT 1 FROM public.cadastro_pendente) AS existe
    `, { type: QueryTypes.SELECT, transaction });
    if (uso.existe) {
      throw new Error('Rollback do cadastro self-service recusado: existem trials ou cadastros pendentes. Preserve os dados.');
    }
    await sequelize.query(`
      DROP TABLE public.cadastro_pendente;
      ALTER TABLE public.organizacao DROP CONSTRAINT organizacao_acesso_check,
        DROP COLUMN modalidade_acesso, DROP COLUMN trial_inicio, DROP COLUMN trial_fim,
        DROP COLUMN limite_patrimonios, DROP COLUMN limite_usuarios;
    `, { transaction });
  },
};
