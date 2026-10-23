import { readFileSync } from 'fs';
import path from 'path';
import { QueryTypes } from 'sequelize';
import { sequelize } from './connection';

async function ensureSolicitacaoTable(): Promise<void> {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS solicitacao (
      id SERIAL PRIMARY KEY,
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
  `);
}

async function ensurePatrimonioFotosTable(): Promise<void> {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS patrimonio_fotos (
      id SERIAL PRIMARY KEY,
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
  `);
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS patrimonio_fotos_patrimonio_id_idx ON patrimonio_fotos (patrimonio_id)`
  );
}

async function ensureAmbienteLocalizacaoColumns(): Promise<void> {
  await sequelize.query(`
    ALTER TABLE ambiente
      ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS precisao_metros DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS localizacao_observacao VARCHAR(255),
      ADD COLUMN IF NOT EXISTS localizacao_atualizada_em TIMESTAMP
  `);
}

const DEFAULT_SENHA_HASH =
  '$2b$10$cbRZLPMpC5p2.q1EsYT38.eCQTlTCsonhEMvOGAsNkoCnKRrQpJ82';

async function ensureUsuarioTable(): Promise<void> {
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
  `);
}

async function ensureDefaultUsers(): Promise<void> {
  // Cria os usuários de demonstração apenas se a tabela estiver vazia
  // (senha padrão: Zelium@2026 — troque no primeiro acesso)
  const [{ count }] = await sequelize.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM usuario`,
    { type: QueryTypes.SELECT }
  );
  if (Number(count) > 0) {
    return;
  }

  await sequelize.query(
    `
    INSERT INTO usuario (nome, email, senha_hash, papel, ativo) VALUES
      ('Gestor Zelium', 'gestor@zelium.com', '${DEFAULT_SENHA_HASH}', 'gestor', TRUE),
      ('Responsavel Zelium', 'responsavel@zelium.com', '${DEFAULT_SENHA_HASH}', 'responsavel', TRUE),
      ('Conferente Zelium', 'conferente@zelium.com', '${DEFAULT_SENHA_HASH}', 'conferente', TRUE)
  `
  );
  console.log('Usuarios padrao criados (gestor@zelium.com / responsavel@zelium.com / conferente@zelium.com).');
}

export async function migrate(): Promise<void> {
  const [{ exists }] = await sequelize.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'conferente'
    )`,
    { type: QueryTypes.SELECT }
  );

  if (!exists) {
    const schema = readFileSync(path.join(process.cwd(), 'db/schema.sql'), 'utf8');
    const seed = readFileSync(path.join(process.cwd(), 'db/seed.sql'), 'utf8');

    await sequelize.query(schema);
    await sequelize.query(seed);
    console.log('Database migrated and seeded.');
  }

  await ensureSolicitacaoTable();
  await ensurePatrimonioFotosTable();
  await ensureAmbienteLocalizacaoColumns();
  await ensureUsuarioTable();
  await ensureDefaultUsers();
}
