import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from './connection';

const migrations = [{
  id: '20261029_001_numero_patrimonio_por_organizacao',  async up(transaction: Transaction) {
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
}, {
  id: '20261029_002_valor_monetario_numeric',
  async up(transaction: Transaction) {
    // Sujeira legada é verificada ANTES do ALTER TYPE: float8 aceita valores
    // que NUMERIC + CHECK recusariam e a migração NÃO corrige dados sozinha —
    // aborta com instrução para o operador decidir cada linha.
    const suja = await sequelize.query<{
      residual_maior: string;
      valor_negativo: string;
      valor_nao_finito: string;
      residual_negativo: string;
      residual_nao_finito: string;
      vida_invalida: string;
    }>(`
      SELECT
        COUNT(*) FILTER (WHERE valor_residual IS NOT NULL AND valor_residual > valor)::text AS residual_maior,
        COUNT(*) FILTER (WHERE valor < 0)::text AS valor_negativo,
        COUNT(*) FILTER (WHERE valor::text IN ('NaN', 'Infinity', '-Infinity'))::text AS valor_nao_finito,
        COUNT(*) FILTER (WHERE valor_residual IS NOT NULL AND valor_residual < 0)::text AS residual_negativo,
        COUNT(*) FILTER (WHERE valor_residual IS NOT NULL AND valor_residual::text IN ('NaN', 'Infinity', '-Infinity'))::text AS residual_nao_finito,
        COUNT(*) FILTER (WHERE vida_util_anos IS NOT NULL AND (vida_util_anos < 1 OR vida_util_anos > 100))::text AS vida_invalida
      FROM public.patrimonio
    `, { type: QueryTypes.SELECT, transaction });
    const contagens = suja[0];
    const problemas = [
      ['valor_residual maior que valor', contagens.residual_maior],
      ['valor negativo', contagens.valor_negativo],
      ['valor nao finito (NaN/Infinity)', contagens.valor_nao_finito],
      ['valor_residual negativo', contagens.residual_negativo],
      ['valor_residual nao finito (NaN/Infinity)', contagens.residual_nao_finito],
      ['vida_util_anos fora de 1..100', contagens.vida_invalida],
    ].filter(([, quantidade]) => Number(quantidade) > 0);
    if (problemas.length > 0) {
      const detalhe = problemas
        .map(([descricao, quantidade]) => `${quantidade} linha(s) com ${descricao}`)
        .join('; ');
      throw new Error(
        `Migracao monetaria abortada: ${detalhe}. ` +
          'Corrija esses patrimonios antes de atualizar (UPDATE no banco ou pela API) e suba novamente. ' +
          'A migracao NAO altera dados por conta propria; nada foi convertido.',
      );
    }

    // Conta linhas cuja conversão para NUMERIC(14,2) muda o valor SEMÂNTICO
    // (artefatos binários de float8, ex.: 0.30000000000000004). Float inteiro
    // ("4500") vira "4500.00" sem mudar de valor; compara-se o float com sua
    // versão NUMERIC convertida de volta — diferença existe só quando há
    // fração binária. Registrada, não silenciada (C9).
    const mudancas = await sequelize.query<{ total: string }>(`
      SELECT COUNT(*)::text AS total FROM public.patrimonio
      WHERE valor::numeric(14,2) <> valor
         OR (valor_residual IS NOT NULL AND valor_residual::numeric(14,2) <> valor_residual)
    `, { type: QueryTypes.SELECT, transaction });
    const arredondadas = Number(mudancas[0]?.total ?? 0);
    if (arredondadas > 0) {
      console.warn(
        `[migracao] ${arredondadas} linha(s) de patrimonio serao arredondadas para 2 casas ` +
          'na conversao para NUMERIC (artefato binario de float8); valores preservados ate o centavo.',
      );
    }

    await sequelize.query(`
      ALTER TABLE public.patrimonio
        ALTER COLUMN valor TYPE numeric(14,2) USING valor::numeric(14,2),
        ALTER COLUMN valor_residual TYPE numeric(14,2) USING valor_residual::numeric(14,2);
    `, { transaction });
    // Bancos vindos do schema novo já têm os CHECKs; bancos legados, não.
    for (const [nome, definicao] of [
      ['patrimonio_valor_check', 'CHECK (valor >= 0 AND valor < 100000000000000)'],
      ['patrimonio_valor_residual_check', 'CHECK (valor_residual IS NULL OR (valor_residual >= 0 AND valor_residual <= valor))'],
      ['patrimonio_vida_util_check', 'CHECK (vida_util_anos IS NULL OR (vida_util_anos >= 1 AND vida_util_anos <= 100))'],
    ] as const) {
      const [existe] = await sequelize.query<{ existe: boolean }>(
        `SELECT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'public.patrimonio'::regclass AND contype = 'c' AND conname = :nome
        ) AS existe`,
        { replacements: { nome }, type: QueryTypes.SELECT, transaction },
      );
      if (!existe?.existe) {
        await sequelize.query(`ALTER TABLE public.patrimonio ADD CONSTRAINT ${nome} ${definicao}`, { transaction });
      }
    }
  },
  async down(transaction: Transaction) {
    // Volta para float8: valores NUMERIC cabem em double precision (sem perda
    // de magnitude; artefatos binários podem reaparecer — documentado em
    // docs/MIGRACOES.md). CHECKs são removidos explicitamente.
    await sequelize.query(`
      ALTER TABLE public.patrimonio
        DROP CONSTRAINT IF EXISTS patrimonio_valor_check,
        DROP CONSTRAINT IF EXISTS patrimonio_valor_residual_check,
        DROP CONSTRAINT IF EXISTS patrimonio_vida_util_check,
        ALTER COLUMN valor TYPE double precision USING valor::double precision,
        ALTER COLUMN valor_residual TYPE double precision USING valor_residual::double precision;
    `, { transaction });
  },
}, {
  id: '20261030_001_usuario_sessao_version',
  async up(transaction: Transaction) {
    // Âncora de revogação: o JWT carrega ver=sessao_version e o middleware
    // confere por requisição. Troca de senha/desativação incrementam a versão
    // e matam todas as sessões emitidas antes. Tokens de versões antigas, sem
    // 'ver', são recusados (intencional: sessão desatualizada).
    await sequelize.query(`
      ALTER TABLE public.usuario ADD COLUMN IF NOT EXISTS sessao_version INT NOT NULL DEFAULT 1;
    `, { transaction });
  },
  async down(transaction: Transaction) {
    // Exige binário anterior a esta migração (que ainda não consulta a
    // coluna). Ao reaplicar, todas as contas voltam à versão 1.
    await sequelize.query(`
      ALTER TABLE public.usuario DROP COLUMN IF EXISTS sessao_version;
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
