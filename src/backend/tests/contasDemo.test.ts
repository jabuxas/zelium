import { readFileSync } from 'fs';
import path from 'path';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer;
const schema = readFileSync(path.resolve(__dirname, '../../db/schema.sql'), 'utf8');
const seed = readFileSync(path.resolve(__dirname, '../../db/seed.sql'), 'utf8');

async function conectar(): Promise<{ sequelize: typeof import('../src/database/connection').sequelize }> {
  Object.assign(process.env, {
    DB_HOST: container.getHost(), DB_PORT: String(container.getMappedPort(5432)),
    DB_NAME: container.getDatabase(), DB_USER: container.getUsername(), DB_PASSWORD: container.getPassword(),
  });
  const connection = await import('../src/database/connection');
  return { sequelize: connection.sequelize };
}

async function bancoLimpo(): Promise<typeof import('../src/database/connection').sequelize> {
  const { sequelize } = await conectar();
  await sequelize.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  await sequelize.query(schema);
  await sequelize.query(seed);
  return sequelize;
}

async function subirProducao(jwt = 'segredo-forte-de-teste-com-64-bytes-0123456789') {
  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = jwt;
  const modulos = ['../src/database/migrate', '../src/database/verificarContasDemo'];
  for (const modulo of modulos) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    delete require.cache[require.resolve(modulo)];
  }
  const { migrate } = await import('../src/database/migrate');
  return { migrate, verificar: (await import('../src/database/verificarContasDemo')).verificarContasDemo };
}

describe('Contas demo com senha padrão não sobem em produção', () => {
  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:17')
      .withDatabase('zelium_demo_test').withUsername('zelium_test').withPassword('disposable').start();
  });

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.JWT_SECRET;
    delete process.env.PERMITIR_CONTAS_DEMO;
    // Sempre recomeça do schema novo: o seed roda e cria as contas padrão.
    await bancoLimpo();
  });

  afterAll(async () => {
    await (await import('../src/database/connection')).sequelize.close();
    await container.stop();
  });

  it('recusa subir em produção enquanto a senha padrão não for trocada', async () => {
    const { migrate, verificar } = await subirProducao();
    await migrate();
    await expect(verificar()).rejects.toThrow(/Zelium@2026|senha padrão|senha padrao/i);
  });

  it('sob em produção após trocar a senha das contas demo', async () => {
    const { sequelize } = await conectar();
    const { migrate, verificar } = await subirProducao();
    await migrate();
    // Simula troca: hash diferente do padrão (bcrypt de outra senha).
    const bcrypt = (await import('bcryptjs')).default;
    const novoHash = await bcrypt.hash('SenhaDoPiloto@2026', 10);
    await sequelize.query(`UPDATE usuario SET senha_hash = '${novoHash}' WHERE email LIKE '%@zelium.com'`);
    await expect(verificar()).resolves.toBeUndefined();
  });

  it('flag de transição (PERMITIR_CONTAS_DEMO=true) permite subir com aviso', async () => {
    process.env.PERMITIR_CONTAS_DEMO = 'true';
    const { migrate, verificar } = await subirProducao();
    await migrate();
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(verificar()).resolves.toBeUndefined();
    expect(aviso).toHaveBeenCalledWith(expect.stringMatching(/CONTAS DEMO|demo/i));
    aviso.mockRestore();
  });

  it('em desenvolvimento/teste não verifica nada', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.JWT_SECRET;
    const { migrate, verificar } = await subirProducao('ignored');
    process.env.NODE_ENV = 'test';
    await migrate();
    await expect(verificar()).resolves.toBeUndefined();
  });
});
