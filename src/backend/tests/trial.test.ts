import type { Express } from 'express';
import type { Sequelize } from 'sequelize';
import { QueryTypes } from 'sequelize';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { rawRequest } from './helpers/request';

let app: Express;
let sequelize: Sequelize;
let container: StartedPostgreSqlContainer;

const SENHA = 'Senha@123';
const ORG_EXPIRADA = 2;
const ORG_ATIVA = 3;
const ORG_LEGADO = 1;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17')
    .withDatabase('trial_isolado').withUsername('teste').withPassword('descartavel').start();
  Object.assign(process.env, {
    DB_HOST: container.getHost(), DB_PORT: String(container.getMappedPort(5432)),
    DB_NAME: container.getDatabase(), DB_USER: container.getUsername(), DB_PASSWORD: container.getPassword(),
  });
  ({ sequelize } = await import('../src/database'));
  // Bootstrap SQL real: timestamps e CHECKs têm defaults que sync não reproduz.
  await (await import('../src/database/migrate')).migrate();
  app = (await import('../src/app')).default;

  const { AuthService } = await import('../src/services/AuthService');
  const { Organizacao } = await import('../src/models/Organizacao');
  const { Usuario } = await import('../src/models/Usuario');
  const senha_hash = await new AuthService().hashSenha(SENHA);

  // Org 1 (legado) já vem da migração; explicita as demais modalidades.
  await Organizacao.create({
    id: ORG_EXPIRADA, nome: 'Trial Expirada', slug: 'trial-expirada',
    modalidade_acesso: 'trial', trial_inicio: new Date(Date.now() - 31 * 86_400_000),
    trial_fim: new Date(Date.now() - 1 * 86_400_000),
    limite_patrimonios: 500, limite_usuarios: 5,
  });
  await Organizacao.create({
    id: ORG_ATIVA, nome: 'Trial Ativa', slug: 'trial-ativa',
    modalidade_acesso: 'trial', trial_inicio: new Date(Date.now() - 1 * 86_400_000),
    trial_fim: new Date(Date.now() + 29 * 86_400_000),
    limite_patrimonios: 500, limite_usuarios: 5,
  });
  await Usuario.create({ nome: 'Gestor Legado', email: 'gestor-legado@test.local', senha_hash, papel: 'gestor', ativo: true, organizacao_id: ORG_LEGADO });
  await Usuario.create({ nome: 'Gestor Expirado', email: 'gestor-expirado@test.local', senha_hash, papel: 'gestor', ativo: true, organizacao_id: ORG_EXPIRADA });
  await Usuario.create({ nome: 'Gestor Ativo', email: 'gestor-ativo@test.local', senha_hash, papel: 'gestor', ativo: true, organizacao_id: ORG_ATIVA });
}, 60_000);

afterAll(async () => {
  await sequelize?.close();
  await container?.stop();
});

async function login(email: string): Promise<string> {
  const res = await rawRequest(app).post('/api/auth/login').send({ email, senha: SENHA });
  expect(res.status).toBe(200);
  return res.body.token;
}

describe('Fiscalização do trial expirado', () => {
  it('usuário de trial expirada continua logando', async () => {
    const res = await rawRequest(app).post('/api/auth/login')
      .send({ email: 'gestor-expirado@test.local', senha: SENHA });
    expect(res.status).toBe(200);
    expect(res.body.organizacao.nome).toBe('Trial Expirada');
  });

  it('bloqueia escritas com 403 e codigo trial_expirado', async () => {
    const token = await login('gestor-expirado@test.local');
    const tipo = await rawRequest(app).post('/api/tipo-material')
      .set('Authorization', `Bearer ${token}`).send({ nome: 'Tipo Expirado' });
    expect(tipo.status).toBe(403);
    expect(tipo.body.codigo).toBe('trial_expirado');

    const usuario = await rawRequest(app).post('/api/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Novo', email: 'novo@expirada.test', senha: 'Senha@123', papel: 'conferente' });
    expect(usuario.status).toBe(403);
    expect(usuario.body.codigo).toBe('trial_expirado');
  });

  it('libera leituras e exportações conforme o perfil', async () => {
    const token = await login('gestor-expirado@test.local');
    const auth = { Authorization: `Bearer ${token}` };
    expect((await rawRequest(app).get('/api/tipo-material').set(auth)).status).toBe(200);
    expect((await rawRequest(app).get('/api/usuarios').set(auth)).status).toBe(200);
    expect((await rawRequest(app).get('/api/patrimonios').set(auth)).status).toBe(200);
    expect((await rawRequest(app).get('/api/relatorios/exportar/csv?tipo=patrimonios').set(auth)).status).toBe(200);
    expect((await rawRequest(app).get('/api/relatorios/financeiro').set(auth)).status).toBe(200);
  });

  it('organização legado segue escrevendo sem restrição', async () => {
    const token = await login('gestor-legado@test.local');
    const res = await rawRequest(app).post('/api/tipo-material')
      .set('Authorization', `Bearer ${token}`).send({ nome: 'Tipo Legado Livre' });
    expect(res.status).toBe(201);
  });

  it('trial ativa segue escrevendo dentro do prazo', async () => {
    const token = await login('gestor-ativo@test.local');
    const res = await rawRequest(app).post('/api/tipo-material')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Tipo Ativo Livre' });
    expect(res.status).toBe(201);
  });
});
