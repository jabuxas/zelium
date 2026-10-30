import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from './connection';
import { applyPendingMigrations, withMigrationLock } from './versionedMigrations';

const TABELAS_COM_ORGANIZACAO = [
  'tipo_material',
  'estado_item',
  'fornecedor',
  'responsavel',
  'conferente',
  'ambiente',
  'patrimonio',
  'patrimonio_fotos',
  'solicitacao',
];

async function ensureSolicitacaoTable(transaction: Transaction): Promise<void> {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS solicitacao (
      id SERIAL PRIMARY KEY,
      organizacao_id INT NOT NULL DEFAULT 1,
      patrimonio_id INT NOT NULL REFERENCES patrimonio(id),
      tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('manutencao', 'substituicao')),
      status VARCHAR(20) NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_andamento', 'concluida', 'cancelada')),
      descricao TEXT,
      conferente_id INT REFERENCES conferente(id),
      versao INTEGER DEFAULT 1 NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP NULL
    )
  `, { transaction });
}

async function ensurePatrimonioFotosTable(transaction: Transaction): Promise<void> {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS patrimonio_fotos (
      id SERIAL PRIMARY KEY,
      organizacao_id INT NOT NULL DEFAULT 1,
      patrimonio_id INT NOT NULL REFERENCES patrimonio(id),
      url VARCHAR(255) NOT NULL,
      nome_arquivo VARCHAR(255) NOT NULL,
      nome_original VARCHAR(255),
      mime_type VARCHAR(50) NOT NULL,
      tamanho_bytes INT NOT NULL,
      largura INT,
      altura INT,
      descricao TEXT,
      ordem INT NOT NULL DEFAULT 0,
      principal BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP NULL
    )
  `, { transaction });
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS patrimonio_fotos_patrimonio_id_idx ON patrimonio_fotos (patrimonio_id)`,
    { transaction },
  );
}

async function ensureAmbienteLocalizacaoColumns(transaction: Transaction): Promise<void> {
  await sequelize.query(`
    ALTER TABLE ambiente
      ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS precisao_metros DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS localizacao_observacao VARCHAR(255),
      ADD COLUMN IF NOT EXISTS localizacao_atualizada_em TIMESTAMP
  `, { transaction });
}

const DEFAULT_SENHA_HASH =
  '$2b$10$cbRZLPMpC5p2.q1EsYT38.eCQTlTCsonhEMvOGAsNkoCnKRrQpJ82';

async function ensureUsuarioTable(transaction: Transaction): Promise<void> {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS usuario (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      senha_hash VARCHAR(100) NOT NULL,
      papel VARCHAR(20) NOT NULL DEFAULT 'conferente' CHECK (papel IN ('gestor', 'responsavel', 'conferente')),
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      organizacao_id INT,
      versao INTEGER DEFAULT 1 NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP NULL
    )
  `, { transaction });
}

async function ensureDefaultUsers(transaction: Transaction): Promise<void> {
  // Cria os usuários de demonstração apenas se a tabela estiver vazia
  // (senha padrão: Zelium@2026 — troque no primeiro acesso)
  const [{ count }] = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM usuario`,
    { type: QueryTypes.SELECT, transaction }
  );
  if (Number(count) > 0) {
    return;
  }

  await sequelize.query(
    `
    INSERT INTO usuario (nome, email, senha_hash, papel, ativo, organizacao_id) VALUES
      ('Gestor Zelium', 'gestor@zelium.com', '${DEFAULT_SENHA_HASH}', 'gestor', TRUE, 1),
      ('Responsavel Zelium', 'responsavel@zelium.com', '${DEFAULT_SENHA_HASH}', 'responsavel', TRUE, 1),
      ('Conferente Zelium', 'conferente@zelium.com', '${DEFAULT_SENHA_HASH}', 'conferente', TRUE, 1)
  `, { transaction },
  );
  console.log('Usuarios padrao criados (gestor@zelium.com / responsavel@zelium.com / conferente@zelium.com).');
}

// ---------------------------------------------------------------------------
// Multiempresa: organizacao + coluna organizacao_id em todas as tabelas
// ---------------------------------------------------------------------------

async function ensureOrganizacaoTable(transaction: Transaction): Promise<void> {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS organizacao (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(150) NOT NULL,
      slug VARCHAR(80) NOT NULL UNIQUE,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP NULL
    )
  `, { transaction });

  // Organização padrão: todos os dados existentes migram para ela
  await sequelize.query(`
    INSERT INTO organizacao (id, nome, slug, ativo)
    SELECT 1, 'IFSC Campus São José', 'ifsc-sj', TRUE
    WHERE NOT EXISTS (SELECT 1 FROM organizacao WHERE id = 1)
  `, { transaction });
  await sequelize.query(
    `SELECT setval('organizacao_id_seq', GREATEST((SELECT MAX(id) FROM organizacao), 1))`,
    { transaction },
  );
}

async function ensureOrganizacaoColumns(transaction: Transaction): Promise<void> {
  for (const tabela of TABELAS_COM_ORGANIZACAO) {
    await sequelize.query(`
      ALTER TABLE ${tabela}
        ADD COLUMN IF NOT EXISTS organizacao_id INT NOT NULL DEFAULT 1 REFERENCES organizacao(id)
    `, { transaction });
    await sequelize.query(
      `CREATE INDEX IF NOT EXISTS ${tabela}_organizacao_id_idx ON ${tabela} (organizacao_id)`,
      { transaction },
    );
  }

  await sequelize.query(`
    ALTER TABLE audit_log
      ADD COLUMN IF NOT EXISTS organizacao_id INT
  `, { transaction });
  await sequelize.query(`
    ALTER TABLE usuario
      ADD COLUMN IF NOT EXISTS organizacao_id INT
  `, { transaction });
  await sequelize.query(`
    UPDATE usuario SET organizacao_id = 1 WHERE organizacao_id IS NULL
  `, { transaction });
  await sequelize.query(`
    ALTER TABLE usuario
      ALTER COLUMN organizacao_id SET DEFAULT 1,
      ALTER COLUMN organizacao_id SET NOT NULL
  `, { transaction });
}

async function ensureNotificacaoTable(transaction: Transaction): Promise<void> {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS notificacao (
      id SERIAL PRIMARY KEY,
      organizacao_id INT NOT NULL REFERENCES organizacao(id),
      tipo VARCHAR(40) NOT NULL,
      assunto VARCHAR(200) NOT NULL,
      corpo TEXT NOT NULL,
      destinatarios JSONB NOT NULL DEFAULT '[]',
      status VARCHAR(20) NOT NULL DEFAULT 'pendente',
      erro TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `, { transaction });
}

async function ensureConferenciaTable(transaction: Transaction): Promise<void> {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS conferencia (
      id SERIAL PRIMARY KEY,
      organizacao_id INT NOT NULL REFERENCES organizacao(id),
      patrimonio_id INT NOT NULL REFERENCES patrimonio(id),
      usuario_id INT NOT NULL REFERENCES usuario(id),
      estado_item_id INT REFERENCES estado_item(id),
      observacao TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `, { transaction });
}

async function ensureEstadoItemAvariaColumn(transaction: Transaction): Promise<void> {
  await sequelize.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'estado_item' AND column_name = 'avaria'
      ) THEN
        ALTER TABLE estado_item ADD COLUMN avaria BOOLEAN NOT NULL DEFAULT FALSE;
        -- Inferência somente na introdução da coluna; depois prevalece o Gestor.
        UPDATE estado_item SET avaria = TRUE
        WHERE nome ILIKE '%manutenção%' OR nome ILIKE '%manutencao%'
           OR nome ILIKE '%inserv%' OR nome ILIKE '%descarte%';
      END IF;
    END $$;
  `, { transaction });
}

async function ensureDepreciacaoColumns(transaction: Transaction): Promise<void> {
  await sequelize.query(`
    ALTER TABLE patrimonio
      ADD COLUMN IF NOT EXISTS data_aquisicao DATE,
      ADD COLUMN IF NOT EXISTS vida_util_anos INT,
      ADD COLUMN IF NOT EXISTS valor_residual FLOAT
  `, { transaction });
  // Ausência de informação não autoriza presumir aquisição ou vida útil.
}

export async function migrate(): Promise<void> {
  return withMigrationLock(async transaction => {
    const [{ exists }] = await sequelize.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'conferente'
      )`,
      { type: QueryTypes.SELECT, transaction }
    );

    if (!exists) {
      // Docker usa /app/db; o código-fonte usa src/db. Não depende do cwd.
      const bundledDb = path.resolve(__dirname, '../../db');
      const dbDirectory = existsSync(path.join(bundledDb, 'schema.sql'))
        ? bundledDb : path.resolve(__dirname, '../../../db');
      const schema = readFileSync(path.join(dbDirectory, 'schema.sql'), 'utf8');
      const seed = readFileSync(path.join(dbDirectory, 'seed.sql'), 'utf8');

      await sequelize.query(schema, { transaction });
      await sequelize.query(seed, { transaction });
    }

    await ensureSolicitacaoTable(transaction);
    await ensurePatrimonioFotosTable(transaction);
    await ensureAmbienteLocalizacaoColumns(transaction);
    await ensureUsuarioTable(transaction);
    await ensureOrganizacaoTable(transaction);
    await ensureOrganizacaoColumns(transaction);
    await ensureNotificacaoTable(transaction);
    await ensureConferenciaTable(transaction);
    await ensureEstadoItemAvariaColumn(transaction);
    await ensureDepreciacaoColumns(transaction);
    await ensureDefaultUsers(transaction);
    await applyPendingMigrations(transaction);
  });
}
