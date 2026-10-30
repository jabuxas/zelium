import { readFileSync } from 'fs';
import path from 'path';
import type { Sequelize } from 'sequelize';
import { QueryTypes } from 'sequelize';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer;
let sequelize: Sequelize;
let migrate: typeof import('../src/database/migrate').migrate;
let rollbackLastMigration: typeof import('../src/database/versionedMigrations').rollbackLastMigration;

const schema = readFileSync(path.resolve(__dirname, '../../db/schema.sql'), 'utf8');
const seed = readFileSync(path.resolve(__dirname, '../../db/seed.sql'), 'utf8');

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17')
    .withDatabase('zelium_migrations_test').withUsername('zelium_test').withPassword('disposable').start();
  Object.assign(process.env, {
    DB_HOST: container.getHost(), DB_PORT: String(container.getMappedPort(5432)),
    DB_NAME: container.getDatabase(), DB_USER: container.getUsername(), DB_PASSWORD: container.getPassword(),
  });
  ({ sequelize } = await import('../src/database/connection'));
  expect(sequelize.config).toMatchObject({
    host: container.getHost(), port: container.getMappedPort(5432), database: container.getDatabase(),
  });
  ({ migrate } = await import('../src/database/migrate'));
  ({ rollbackLastMigration } = await import('../src/database/versionedMigrations'));
}, 60_000);

beforeEach(async () => {
  // A limpeza é exclusiva do container criado acima, nunca de um banco externo.
  expect(sequelize.config.database).toBe('zelium_migrations_test');
  await sequelize.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  await sequelize.query(schema);
  await sequelize.query(seed);
});

afterAll(async () => {
  await sequelize?.close();
  await container?.stop();
});

async function bem(id: number) {
  const rows = await sequelize.query('SELECT * FROM patrimonio WHERE id = :id', {
    replacements: { id }, type: QueryTypes.SELECT,
  });
  return rows[0];
}

describe('Migrações sem alteração implícita de dados', () => {
  it('preserva campos financeiros ausentes e dados explícitos após duas inicializações', async () => {
    await sequelize.query(`
      UPDATE patrimonio SET data_aquisicao = NULL, vida_util_anos = NULL, valor_residual = NULL WHERE id = 1;
      UPDATE patrimonio SET vida_util_anos = NULL WHERE id = 2;
      UPDATE patrimonio SET data_aquisicao = NULL WHERE id = 3;
    `);
    const antes = await Promise.all([1, 2, 3, 4].map(bem));
    await migrate();
    await migrate();
    expect(await Promise.all([1, 2, 3, 4].map(bem))).toEqual(antes);
  });

  it('preserva a desativação explícita de avaria mesmo quando o nome indica manutenção', async () => {
    await sequelize.query('UPDATE estado_item SET avaria = FALSE WHERE id = 2');
    await migrate();
    await migrate();
    const rows = await sequelize.query('SELECT avaria FROM estado_item WHERE id = 2', { type: QueryTypes.SELECT });
    expect(rows).toEqual([{ avaria: false }]);
  });

  it('adiciona colunas financeiras em banco antigo sem presumir aquisição ou vida útil', async () => {
    await sequelize.query(`ALTER TABLE patrimonio DROP COLUMN data_aquisicao, DROP COLUMN vida_util_anos, DROP COLUMN valor_residual`);
    await migrate();
    expect(await bem(1)).toMatchObject({ data_aquisicao: null, vida_util_anos: null, valor_residual: null });
  });

  it('classifica avarias por nome somente ao introduzir a coluna em banco antigo', async () => {
    await sequelize.query('ALTER TABLE estado_item DROP COLUMN avaria');
    await migrate();
    const estados = await sequelize.query('SELECT id, avaria FROM estado_item ORDER BY id', { type: QueryTypes.SELECT });
    expect(estados).toEqual([
      { id: 1, avaria: false }, { id: 2, avaria: true }, { id: 3, avaria: true }, { id: 4, avaria: true },
    ]);
    await sequelize.query('UPDATE estado_item SET avaria = FALSE WHERE id = 2');
    await migrate();
    expect(await sequelize.query('SELECT avaria FROM estado_item WHERE id = 2', { type: QueryTypes.SELECT }))
      .toEqual([{ avaria: false }]);
  });
});

describe('Numeração patrimonial no schema SQL e na atualização de banco existente', () => {
  async function inserirMesmoNumeroNaOutraEmpresa() {
    await sequelize.query(`INSERT INTO organizacao (id, nome, slug) VALUES (2, 'Empresa B', 'empresa-b')`);
    // Referências próprias da org B também são preservadas no teste de migração SQL.
    await sequelize.query(`
      INSERT INTO responsavel (id, organizacao_id, nome, email) VALUES (5, 2, 'Resp B', 'resp@b.test');
      INSERT INTO ambiente (id, organizacao_id, nome, responsavel_id) VALUES (7, 2, 'Sala B', 5);
      INSERT INTO tipo_material (id, organizacao_id, nome) VALUES (6, 2, 'Tipo B');
      INSERT INTO estado_item (id, organizacao_id, nome) VALUES (5, 2, 'Estado B');
      INSERT INTO patrimonio (organizacao_id, numero_patrimonio, descricao, valor, tipo_material_id, estado_item_id, ambiente_id, responsavel_id)
      VALUES (2, '2024/001', 'Bem B', 100, 6, 5, 7, 5);
    `);
  }

  it('schema novo permite números iguais entre empresas', async () => {
    await expect(inserirMesmoNumeroNaOutraEmpresa()).resolves.toBeUndefined();
  });

  it('substitui unicidade global antiga sem alterar patrimônios e registra a migração uma vez', async () => {
    // Simula o schema anterior, independentemente do nome gerado para a constraint.
    await sequelize.query(`
      ALTER TABLE patrimonio DROP CONSTRAINT IF EXISTS patrimonio_organizacao_numero_key;
      ALTER TABLE patrimonio DROP CONSTRAINT IF EXISTS patrimonio_numero_patrimonio_key;
      ALTER TABLE patrimonio ADD CONSTRAINT numero_legado_customizado UNIQUE (numero_patrimonio);
    `);
    const antes = await bem(1);
    await migrate();
    await migrate();
    expect(await bem(1)).toEqual(antes);
    await expect(inserirMesmoNumeroNaOutraEmpresa()).resolves.toBeUndefined();
    const historico = await sequelize.query('SELECT id FROM schema_migrations', { type: QueryTypes.SELECT });
    expect(historico).toEqual([{ id: '20261029_001_numero_patrimonio_por_organizacao' }]);
  });

  it('substitui também um índice único global independente de constraint', async () => {
    await sequelize.query(`CREATE UNIQUE INDEX numero_legado_indice ON patrimonio (numero_patrimonio)`);
    await migrate();
    await expect(inserirMesmoNumeroNaOutraEmpresa()).resolves.toBeUndefined();
  });

  it('serializa duas inicializações de banco vazio sem duplicar seed nem histórico', async () => {
    await sequelize.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
    await Promise.all([migrate(), migrate()]);
    expect(await sequelize.query('SELECT COUNT(*)::int AS total FROM patrimonio', { type: QueryTypes.SELECT }))
      .toEqual([{ total: 10 }]);
    expect(await sequelize.query('SELECT COUNT(*)::int AS total FROM schema_migrations', { type: QueryTypes.SELECT }))
      .toEqual([{ total: 1 }]);
  });

  it('reverte uma aplicação sem números compartilhados e permite reaplicá-la', async () => {
    await migrate();
    expect(await rollbackLastMigration()).toBe('20261029_001_numero_patrimonio_por_organizacao');
    expect(await sequelize.query('SELECT id FROM schema_migrations', { type: QueryTypes.SELECT })).toEqual([]);
    await expect(inserirMesmoNumeroNaOutraEmpresa()).rejects.toMatchObject({ name: 'SequelizeUniqueConstraintError' });
    await migrate();
    expect(await sequelize.query('SELECT COUNT(*)::int AS total FROM schema_migrations', { type: QueryTypes.SELECT }))
      .toEqual([{ total: 1 }]);
  });

  it('recusa rollback com números compartilhados sem apagar bens nem o histórico', async () => {
    await migrate();
    await inserirMesmoNumeroNaOutraEmpresa();
    const antes = await sequelize.query('SELECT * FROM patrimonio ORDER BY id', { type: QueryTypes.SELECT });
    await expect(rollbackLastMigration()).rejects.toMatchObject({ name: 'SequelizeUniqueConstraintError' });
    expect(await sequelize.query('SELECT * FROM patrimonio ORDER BY id', { type: QueryTypes.SELECT })).toEqual(antes);
    expect(await sequelize.query('SELECT COUNT(*)::int AS total FROM schema_migrations', { type: QueryTypes.SELECT }))
      .toEqual([{ total: 1 }]);
  });

  it('desfaz DDL e troca de unicidade se falhar o registro da migração', async () => {
    await sequelize.query(`
      ALTER TABLE patrimonio DROP CONSTRAINT patrimonio_organizacao_numero_key;
      ALTER TABLE patrimonio ADD CONSTRAINT numero_legado_customizado UNIQUE (numero_patrimonio);
      ALTER TABLE patrimonio DROP COLUMN data_aquisicao;
      CREATE TABLE schema_migrations (id VARCHAR(150) PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
      CREATE FUNCTION falhar_migracao() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN RAISE EXCEPTION 'Falha de teste no historico'; END;
      $$;
      CREATE TRIGGER recusar_migracao BEFORE INSERT ON schema_migrations FOR EACH ROW EXECUTE FUNCTION falhar_migracao();
    `);
    await expect(migrate()).rejects.toThrow('Falha de teste no historico');
    const colunas = await sequelize.getQueryInterface().describeTable('patrimonio');
    expect(colunas).not.toHaveProperty('data_aquisicao');
    expect(await sequelize.query('SELECT id FROM schema_migrations', { type: QueryTypes.SELECT })).toEqual([]);
    await expect(inserirMesmoNumeroNaOutraEmpresa()).rejects.toMatchObject({ name: 'SequelizeUniqueConstraintError' });

    await sequelize.query('DROP TRIGGER recusar_migracao ON schema_migrations');
    await migrate();
    expect(await bem(1)).toMatchObject({ data_aquisicao: null });
    expect(await sequelize.query('SELECT COUNT(*)::int AS total FROM schema_migrations', { type: QueryTypes.SELECT }))
      .toEqual([{ total: 1 }]);
  });
});
