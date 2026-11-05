import { readFileSync } from 'fs';
import path from 'path';
import { QueryTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer;
let sequelize: typeof import('../src/database/connection').sequelize;
let bootstrap: typeof import('../src/database/bootstrap').bootstrapPrimeiraOrganizacao;
let verificarContasDemo: typeof import('../src/database/verificarContasDemo').verificarContasDemo;
const schema = readFileSync(path.resolve(__dirname, '../../db/schema.sql'), 'utf8');
const seed = readFileSync(path.resolve(__dirname, '../../db/seed.sql'), 'utf8');

const ENV_OK = {
  BOOTSTRAP_GESTOR_EMAIL: 'Dono@Empresa.Test',
  BOOTSTRAP_GESTOR_SENHA: 'SenhaDoDono@2026',
  BOOTSTRAP_GESTOR_NOME: 'Dona Maria',
  BOOTSTRAP_ORGANIZACAO_NOME: 'Empresa Teste Ltda',
};

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17')
    .withDatabase('zelium_bootstrap_test').withUsername('zelium_test').withPassword('disposable').start();
  Object.assign(process.env, {
    DB_HOST: container.getHost(), DB_PORT: String(container.getMappedPort(5432)),
    DB_NAME: container.getDatabase(), DB_USER: container.getUsername(), DB_PASSWORD: container.getPassword(),
  });
  ({ sequelize } = await import('../src/database/connection'));
  ({ bootstrapPrimeiraOrganizacao: bootstrap } = await import('../src/database/bootstrap'));
  ({ verificarContasDemo } = await import('../src/database/verificarContasDemo'));
});

beforeEach(async () => {
  await sequelize.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  await sequelize.query(schema);
  await sequelize.query(seed);
  await (await import('../src/database/migrate')).migrate();
});

afterAll(async () => {
  await sequelize?.close();
  await container?.stop();
});

const usuarios = () => sequelize.query<{ email: string; ativo: boolean; papel: string; organizacao_id: number; senha_hash: string; sessao_version: number }>(
  'SELECT email, ativo, papel, organizacao_id, senha_hash, sessao_version FROM usuario ORDER BY id', { type: QueryTypes.SELECT });
const organizacoes = () => sequelize.query<{ id: number; nome: string; modalidade_acesso: string; trial_fim: Date | null }>(
  'SELECT id, nome, modalidade_acesso, trial_fim FROM organizacao ORDER BY id', { type: QueryTypes.SELECT });

describe('Bootstrap do primeiro Gestor por variáveis de ambiente', () => {
  it('sem variáveis não faz nada (instalação existente segue intacta)', async () => {
    expect(await bootstrap({})).toEqual({ criada: false });
    expect(await organizacoes()).toHaveLength(1);
    expect((await usuarios()).every(u => u.ativo)).toBe(true);
  });

  it('cria organização sem prazo, Gestor com a senha informada, estados e auditoria', async () => {
    expect(await bootstrap(ENV_OK)).toEqual({ criada: true });

    const orgs = await organizacoes();
    expect(orgs).toHaveLength(2);
    const nova = orgs[1];
    expect(nova).toMatchObject({ nome: 'Empresa Teste Ltda', modalidade_acesso: 'legado', trial_fim: null });

    const gestor = (await usuarios()).find(u => u.email === 'dono@empresa.test')!;
    expect(gestor).toMatchObject({ ativo: true, papel: 'gestor', organizacao_id: nova.id });
    expect(await bcrypt.compare('SenhaDoDono@2026', gestor.senha_hash)).toBe(true);

    const estados = await sequelize.query('SELECT nome FROM estado_item WHERE organizacao_id = :id', {
      replacements: { id: nova.id }, type: QueryTypes.SELECT });
    expect(estados).toHaveLength(4);
    const auditoria = await sequelize.query<{ usuario: string }>(
      `SELECT usuario FROM audit_log WHERE tabela = 'organizacao' AND registro_id = :id AND acao = 'CREATE'`,
      { replacements: { id: nova.id }, type: QueryTypes.SELECT });
    expect(auditoria).toHaveLength(1);
    expect(JSON.stringify(auditoria)).not.toContain('SenhaDoDono');
  });

  it('desativa as contas demo intactas e revoga suas sessões; produção passa a subir', async () => {
    const antes = await usuarios();
    await bootstrap(ENV_OK);
    const demos = (await usuarios()).filter(u => u.email.endsWith('@zelium.com'));
    expect(demos).toHaveLength(3);
    for (const demo of demos) {
      const original = antes.find(u => u.email === demo.email)!;
      expect(demo.ativo).toBe(false);
      expect(demo.sessao_version).toBe(original.sessao_version + 1);
    }

    const nodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await expect(verificarContasDemo()).resolves.toBeUndefined();
    } finally {
      process.env.NODE_ENV = nodeEnv;
    }
  });

  it('não desativa conta demo cuja senha já foi trocada', async () => {
    const novoHash = await bcrypt.hash('OutraSenhaForte@2026', 10);
    await sequelize.query(`UPDATE usuario SET senha_hash = :h WHERE email = 'gestor@zelium.com'`, { replacements: { h: novoHash } });
    await bootstrap(ENV_OK);
    const todos = await usuarios();
    expect(todos.find(u => u.email === 'gestor@zelium.com')!.ativo).toBe(true);
    expect(todos.find(u => u.email === 'responsavel@zelium.com')!.ativo).toBe(false);
  });

  it('é idempotente: repetir com outra senha não cria nem altera nada', async () => {
    await bootstrap(ENV_OK);
    const antes = await usuarios();
    expect(await bootstrap({ ...ENV_OK, BOOTSTRAP_GESTOR_SENHA: 'OutraSenhaQualquer@99' })).toEqual({ criada: false });
    expect(await organizacoes()).toHaveLength(2);
    expect(await usuarios()).toEqual(antes);
  });

  it('e-mail já existente (qualquer caixa) é respeitado e nada é tocado', async () => {
    const antes = await usuarios();
    expect(await bootstrap({ ...ENV_OK, BOOTSTRAP_GESTOR_EMAIL: 'GESTOR@zelium.com' })).toEqual({ criada: false });
    expect(await organizacoes()).toHaveLength(1);
    expect(await usuarios()).toEqual(antes);
  });

  it.each([
    ['só o e-mail', { BOOTSTRAP_GESTOR_EMAIL: 'dono@empresa.test' }, /BOOTSTRAP_GESTOR_SENHA/],
    ['só a senha', { BOOTSTRAP_GESTOR_SENHA: 'SenhaDoDono@2026' }, /BOOTSTRAP_GESTOR_EMAIL/],
    ['e-mail inválido', { ...ENV_OK, BOOTSTRAP_GESTOR_EMAIL: 'sem-arroba' }, /e-mail/i],
    ['senha curta', { ...ENV_OK, BOOTSTRAP_GESTOR_SENHA: 'curta@123' }, /12 caracteres/],
    ['senha longa demais', { ...ENV_OK, BOOTSTRAP_GESTOR_SENHA: 'á'.repeat(40) }, /72 bytes/],
  ])('configuração incompleta ou inválida (%s) falha alto e não grava', async (_nome, env, erro) => {
    const rejeicao = bootstrap(env as Record<string, string>);
    await expect(rejeicao).rejects.toThrow(erro);
    await rejeicao.catch(e => expect(String(e.message)).not.toContain('SenhaDoDono'));
    expect(await organizacoes()).toHaveLength(1);
    expect((await usuarios()).every(u => u.ativo)).toBe(true);
  });

  it('usa nomes padrão quando nome do Gestor e da organização não são informados', async () => {
    await bootstrap({ BOOTSTRAP_GESTOR_EMAIL: 'x@empresa.test', BOOTSTRAP_GESTOR_SENHA: 'SenhaDoDono@2026' });
    const orgs = await organizacoes();
    expect(orgs[1].nome).toBe('Minha organização');
  });
});
