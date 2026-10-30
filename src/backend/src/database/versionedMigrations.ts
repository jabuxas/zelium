import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from './connection';

const migrations = [{
  id: '20261029_001_numero_patrimonio_por_organizacao',
  async up(transaction: Transaction) {
    // Cria a proteção por empresa ANTES de retirar a restrição global.
    // Os nomes antigos variam entre schema.sql e bancos gerados pelo ORM.
    await sequelize.query(`
      DO $$
      DECLARE restricao RECORD;
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'public.patrimonio'::regclass AND contype = 'u'
            AND conname = 'patrimonio_organizacao_numero_key'
            AND conkey = ARRAY[
              (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.patrimonio'::regclass AND attname = 'organizacao_id'),
              (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.patrimonio'::regclass AND attname = 'numero_patrimonio')
            ]
        ) THEN
          ALTER TABLE public.patrimonio ADD CONSTRAINT patrimonio_organizacao_numero_key
            UNIQUE (organizacao_id, numero_patrimonio);
        END IF;

        FOR restricao IN
          SELECT conname FROM pg_constraint
          WHERE conrelid = 'public.patrimonio'::regclass AND contype = 'u'
            AND conkey = ARRAY[
              (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.patrimonio'::regclass AND attname = 'numero_patrimonio')
            ]
        LOOP
          EXECUTE format('ALTER TABLE public.patrimonio DROP CONSTRAINT %I', restricao.conname);
        END LOOP;

        -- Algumas instalações podem ter índice global criado diretamente.
        -- Remove só unicidade da coluna número; preserva índices de outras chaves.
        FOR restricao IN
          SELECT indice.relname AS nome, esquema.nspname AS esquema
          FROM pg_index i
          JOIN pg_class indice ON indice.oid = i.indexrelid
          JOIN pg_namespace esquema ON esquema.oid = indice.relnamespace
          WHERE i.indrelid = 'public.patrimonio'::regclass AND i.indisunique AND NOT i.indisprimary
            AND i.indnkeyatts = 1 AND i.indexprs IS NULL
            AND i.indkey[0] = (
              SELECT attnum FROM pg_attribute
              WHERE attrelid = 'public.patrimonio'::regclass AND attname = 'numero_patrimonio'
            )
            AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conindid = i.indexrelid)
        LOOP
          EXECUTE format('DROP INDEX %I.%I', restricao.esquema, restricao.nome);
        END LOOP;
      END $$;
    `, { transaction });
  },
  async down(transaction: Transaction) {
    // Se empresas já compartilham números, UNIQUE falha e a transação inteira
    // é desfeita. Nunca excluir/renumerar bens para viabilizar um rollback.
    await sequelize.query(`
      ALTER TABLE public.patrimonio ADD CONSTRAINT patrimonio_numero_patrimonio_key UNIQUE (numero_patrimonio);
      ALTER TABLE public.patrimonio DROP CONSTRAINT patrimonio_organizacao_numero_key;
    `, { transaction });
  },
}];

/** Serializa inicializações e rollback no mesmo banco, com DDL transacional. */
export async function withMigrationLock<T>(work: (transaction: Transaction) => Promise<T>): Promise<T> {
  return sequelize.transaction(async transaction => {
    await sequelize.query("SET LOCAL lock_timeout = '5s'", { transaction });
    await sequelize.query("SELECT pg_advisory_xact_lock(hashtext('zelium:schema_migrations'))", { transaction });
    return work(transaction);
  });
}

async function ensureHistory(transaction: Transaction) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id VARCHAR(150) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, { transaction });
}

/** Chamado após o bootstrap legado, dentro da mesma transação e lock. */
export async function applyPendingMigrations(transaction: Transaction): Promise<void> {
  await ensureHistory(transaction);
  const applied = await sequelize.query<{ id: string }>('SELECT id FROM public.schema_migrations', {
    type: QueryTypes.SELECT, transaction,
  });
  const ids = new Set(applied.map(row => row.id));
  for (const migration of migrations) {
    if (ids.has(migration.id)) continue;
    await migration.up(transaction);
    await sequelize.query('INSERT INTO public.schema_migrations (id) VALUES (:id)', {
      replacements: { id: migration.id }, transaction,
    });
  }
}

/** Uso administrativo deliberado; nunca é executado na inicialização. */
export async function rollbackLastMigration(): Promise<string | null> {
  return withMigrationLock(async transaction => {
    await ensureHistory(transaction);
    const [last] = await sequelize.query<{ id: string }>(
      'SELECT id FROM public.schema_migrations ORDER BY id DESC LIMIT 1',
      { type: QueryTypes.SELECT, transaction },
    );
    if (!last) return null;
    const migration = migrations.find(item => item.id === last.id);
    if (!migration) throw new Error(`Migracao desconhecida: ${last.id}. Use a versao correspondente da aplicacao.`);
    await migration.down(transaction);
    await sequelize.query('DELETE FROM public.schema_migrations WHERE id = :id', {
      replacements: { id: last.id }, transaction,
    });
    return last.id;
  });
}
