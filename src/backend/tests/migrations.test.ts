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

/**
 * Compara valores monetários sem depender do tipo da coluna: float8 chega
 * como number (4500), NUMERIC como string ("4500.00"). O valor SEMÂNTICO é
 * o que a migração promete preservar.
 */
function valoresMonetariosComparaveis(registro: object) {
  const dados = registro as Record<string, unknown>;
  const monetario = (campo: string) => {
    const valor = dados[campo];
    return valor === null || valor === undefined ? null : Number(valor);
  };
  return { ...dados, valor: monetario('valor'), valor_residual: monetario('valor_residual') };
}

async function contarMigracoes(): Promise<Set<string>> {
  const rows = await sequelize.query<{ id: string }>('SELECT id FROM schema_migrations', { type: QueryTypes.SELECT });
  return new Set(rows.map(row => row.id));
}

describe('Migrações sem alteração implícita de dados', () => {
  it('preserva campos financeiros ausentes e dados explícitos após duas inicializações', async () => {
    await sequelize.query(`
      UPDATE patrimonio SET data_aquisicao = NULL, vida_util_anos = NULL, valor_residual = NULL WHERE id = 1;
      UPDATE patrimonio SET vida_util_anos = NULL WHERE id = 2;
      UPDATE patrimonio SET data_aquisicao = NULL WHERE id = 3;
    `);
    const antes = (await Promise.all([1, 2, 3, 4].map(bem))).map(valoresMonetariosComparaveis);
    await migrate();
    await migrate();
    expect((await Promise.all([1, 2, 3, 4].map(bem))).map(valoresMonetariosComparaveis)).toEqual(antes);
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
    const antes = valoresMonetariosComparaveis(await bem(1));
    await migrate();
    await migrate();
    expect(valoresMonetariosComparaveis(await bem(1))).toEqual(antes);
    await expect(inserirMesmoNumeroNaOutraEmpresa()).resolves.toBeUndefined();
    const historico = await sequelize.query<{ id: string }>('SELECT id FROM schema_migrations', { type: QueryTypes.SELECT });
    expect(historico.map(linha => linha.id)).toEqual([
      '20261029_001_numero_patrimonio_por_organizacao',
      '20261029_002_valor_monetario_numeric',
    ]);
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
    const aplicadas = await contarMigracoes();
    expect(aplicadas.has('20261029_001_numero_patrimonio_por_organizacao')).toBe(true);
  });

  it('reverte uma aplicação sem números compartilhados e permite reaplicá-la', async () => {
    await migrate();
    const ultima = (await sequelize.query<{ id: string }>(
      'SELECT id FROM schema_migrations ORDER BY id DESC LIMIT 1',
      { type: QueryTypes.SELECT },
    ))[0].id;
    expect(await rollbackLastMigration()).toBe(ultima);
    const restantes = await sequelize.query<{ id: string }>('SELECT id FROM schema_migrations', { type: QueryTypes.SELECT });
    expect(restantes.map(linha => linha.id)).toEqual(['20261029_001_numero_patrimonio_por_organizacao']);
    // Com a numeração por organização aplicada, a mesma letra em outra empresa é válida:
    // o rollback retirou a migração MONETÁRIA, não a de numeração.
    await expect(inserirMesmoNumeroNaOutraEmpresa()).resolves.toBeUndefined();
    await migrate();
    const aplicadas = await contarMigracoes();
    expect(aplicadas.has('20261029_001_numero_patrimonio_por_organizacao')).toBe(true);
  });

  it('recusa rollback com números compartilhados sem apagar bens nem o histórico', async () => {
    await migrate();
    // Reverte a migração MONETÁRIA para voltar ao estado que só tem a restrição
    // de numeração; então compartilha números e recusa reverter a numeração.
    await rollbackLastMigration();
    await inserirMesmoNumeroNaOutraEmpresa();
    const antes = (await sequelize.query('SELECT * FROM patrimonio ORDER BY id', { type: QueryTypes.SELECT }))
      .map(valoresMonetariosComparaveis);
    await expect(rollbackLastMigration()).rejects.toMatchObject({ name: 'SequelizeUniqueConstraintError' });
    expect(
      (await sequelize.query('SELECT * FROM patrimonio ORDER BY id', { type: QueryTypes.SELECT }))
        .map(valoresMonetariosComparaveis),
    ).toEqual(antes);
    const aplicadas = await contarMigracoes();
    expect(aplicadas.has('20261029_001_numero_patrimonio_por_organizacao')).toBe(true);
    expect(aplicadas.has('20261029_002_valor_monetario_numeric')).toBe(false);
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
    const aplicadas = await contarMigracoes();
    expect(aplicadas.has('20261029_001_numero_patrimonio_por_organizacao')).toBe(true);
  });
});

describe('Migração monetária NUMERIC(14,2) — integridade e sujeira legada', () => {
  beforeEach(async () => {
    // Base do beforeEach global + estado float8 legado nas colunas monetárias.
    // DROP CONSTRAINT vai dentro do ALTER: em colunas, é cláusula do comando.
    await sequelize.query(`
      ALTER TABLE patrimonio
        ALTER COLUMN valor TYPE double precision,
        ALTER COLUMN valor_residual TYPE double precision,
        DROP CONSTRAINT IF EXISTS patrimonio_valor_check,
        DROP CONSTRAINT IF EXISTS patrimonio_valor_residual_check,
        DROP CONSTRAINT IF EXISTS patrimonio_vida_util_check;
    `);
    await sequelize.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (id VARCHAR(150) PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    );
    await sequelize.query(`DELETE FROM schema_migrations WHERE id = '20261029_002_valor_monetario_numeric'`);
  });

  async function tiposDeValor() {
    const colunas = (await sequelize.getQueryInterface().describeTable('patrimonio')) as Record<
      string,
      { type: string }
    >;
    return { valor: colunas.valor.type, residual: colunas.valor_residual.type };
  }

  it('converte valor e residual para NUMERIC(14,2) em banco novo', async () => {
    await migrate();
    const tipos = await tiposDeValor();
    expect(tipos.valor.toLowerCase()).toContain('numeric');
    expect(tipos.residual.toLowerCase()).toContain('numeric');
    expect(await bem(1)).toMatchObject({ valor: '4500.00', valor_residual: '450.00' });
  });

  it('aplica CHECKs no banco e a API rejeita os mesmos casos com 400 antes do banco', async () => {
    await migrate();
    await expect(
      sequelize.query('UPDATE patrimonio SET valor = :valor WHERE id = 1', {
        replacements: { valor: -1 },
        type: QueryTypes.SELECT,
      }),
    ).rejects.toMatchObject({ name: 'SequelizeDatabaseError' });
    await expect(
      sequelize.query('UPDATE patrimonio SET valor_residual = :residual WHERE id = 1', {
        replacements: { residual: 5000 },
        type: QueryTypes.SELECT,
      }),
    ).rejects.toMatchObject({ name: 'SequelizeDatabaseError' });

    // Pela API, a validação compartilhada deve rejeitar antes do banco.
    await import('../src/database/index');
    const { default: app } = await import('../src/app');
    const { bearerToken, rawRequest } = await import('./helpers/request');
    const res = await rawRequest(app)
      .put('/api/patrimonios/1')
      .set(bearerToken('gestor', '1', 1))
      .send({ valor: -5 });
    expect(res.status).toBe(400);
  });

  it('aborta sem alterar nada quando há residual maior que o valor no banco legado', async () => {
    await sequelize.query('UPDATE patrimonio SET valor_residual = 99999 WHERE id = 2');
    await expect(migrate()).rejects.toThrow(/valor_residual maior que valor/i);
    expect(await tiposDeValor()).toMatchObject({ valor: expect.stringMatching(/double precision/i) });
    expect(
      await sequelize.query('SELECT valor_residual FROM patrimonio WHERE id = 2', { type: QueryTypes.SELECT }),
    ).toEqual([{ valor_residual: 99999 }]);
  });

  it('aborta sem alterar nada quando há valor não finito (NaN) no banco legado', async () => {
    await sequelize.query(`UPDATE patrimonio SET valor = 'NaN'::float8 WHERE id = 3`);
    await expect(migrate()).rejects.toThrow(/nao finito/i);
    expect(await tiposDeValor()).toMatchObject({ valor: expect.stringMatching(/double precision/i) });
  });

  it('aborta sem alterar nada quando há valor negativo no banco legado', async () => {
    await sequelize.query('UPDATE patrimonio SET valor = -100 WHERE id = 3');
    await expect(migrate()).rejects.toThrow(/negativo/i);
    expect(
      await sequelize.query('SELECT valor FROM patrimonio WHERE id = 3', { type: QueryTypes.SELECT }),
    ).toEqual([{ valor: -100 }]);
  });

  it('após abortar por sujeira, corrigir o dado permite nova subida concluir a migração', async () => {
    await sequelize.query('UPDATE patrimonio SET valor_residual = 99999 WHERE id = 2');
    await expect(migrate()).rejects.toThrow(/valor_residual maior que valor/i);
    await sequelize.query('UPDATE patrimonio SET valor_residual = 120 WHERE id = 2');
    await migrate();
    const aplicadas = await contarMigracoes();
    expect(aplicadas.has('20261029_002_valor_monetario_numeric')).toBe(true);
    expect(await bem(2)).toMatchObject({ valor: '1200.00', valor_residual: '120.00' });
  });

  it('arredonda centavos fracionários do float legado de forma determinística', async () => {
    await sequelize.query(`UPDATE patrimonio SET valor_residual = 0.1 + 0.2 WHERE id = 2`);
    await migrate();
    expect(await bem(2)).toMatchObject({ valor_residual: '0.30' });
  });

  it('registra quantas linhas tiveram arredondamento durante a conversão', async () => {
    const logSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Via driver (bind), o JS 0.1+0.2 chega com artefato binário — é o
    // caminho real de escrita da aplicação; SQL puro arredondaria antes.
    await sequelize.query(`UPDATE patrimonio SET valor_residual = :residual WHERE id = 2`, {
      replacements: { residual: 0.1 + 0.2 },
      type: QueryTypes.UPDATE,
    });
    await migrate();
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/arredondadas/i));
    logSpy.mockRestore();
  });

  it('reversão volta para DOUBLE PRECISION preservando valores e removendo CHECKs', async () => {
    await migrate();
    await sequelize.query(`UPDATE patrimonio SET valor_residual = 0.1 + 0.2 WHERE id = 2`);
    expect(await rollbackLastMigration()).toBe('20261029_002_valor_monetario_numeric');
    expect(await tiposDeValor()).toMatchObject({
      valor: expect.stringMatching(/double precision/i),
      residual: expect.stringMatching(/double precision/i),
    });
    const residual = ((await bem(2)) as Record<string, unknown>).valor_residual as number;
    expect(residual).toBeCloseTo(0.3, 10);
    expect(
      await sequelize.query(
        `SELECT conname FROM pg_constraint WHERE conrelid = 'patrimonio'::regclass AND contype = 'c' AND conname LIKE 'patrimonio_valor%'`,
        { type: QueryTypes.SELECT },
      ),
    ).toEqual([]);
  });

  it('converte também em banco antigo sem a coluna residual, sem presumir valores', async () => {
    await sequelize.query(`ALTER TABLE patrimonio DROP COLUMN valor_residual`);
    await migrate();
    expect(await tiposDeValor()).toMatchObject({
      valor: expect.stringMatching(/numeric/i),
      residual: expect.stringMatching(/numeric/i),
    });
    expect(await bem(1)).toMatchObject({ valor: '4500.00', valor_residual: null });
  });
});
