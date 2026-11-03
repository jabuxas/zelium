import type { Express } from 'express';
import type { Sequelize } from 'sequelize';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { rawRequest } from './helpers/request';

let app: Express;
let sequelize: Sequelize;
let container: StartedPostgreSqlContainer;

const SENHA = 'Senha@123';
let tokenGestor = '';
let cookieGestor = '';

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17')
    .withDatabase('zelar').withUsername('zelar').withPassword('zelar').start();
  Object.assign(process.env, {
    DB_HOST: container.getHost(), DB_PORT: String(container.getMappedPort(5432)),
    DB_NAME: container.getDatabase(), DB_USER: container.getUsername(), DB_PASSWORD: container.getPassword(),
  });

  sequelize = (await import('../src/database/connection')).sequelize;
  await import('../src/database/index');
  await sequelize.sync({ force: true });
  app = (await import('../src/app')).default;

  const { AuthService } = await import('../src/services/AuthService');
  const senha_hash = await new AuthService().hashSenha(SENHA);
  const { Organizacao } = await import('../src/models/Organizacao');
  const { Usuario } = await import('../src/models/Usuario');
  await Organizacao.create({ id: 1, nome: 'Org Cookie', slug: 'org-cookie' });
  await Usuario.create({ nome: 'Gestor Cookie', email: 'gestor@cookie.test', senha_hash, papel: 'gestor', ativo: true, organizacao_id: 1 });
}, 60_000);

afterAll(async () => {
  await sequelize.close();
  await container.stop();
});

async function login(email = 'gestor@cookie.test') {
  const res = await rawRequest(app).post('/api/auth/login').send({ email, senha: SENHA });
  expect(res.status).toBe(200);
  return res;
}

function linhasCookie(res: { headers: Record<string, unknown> }): string[] {
  const bruto = res.headers['set-cookie'];
  return Array.isArray(bruto) ? bruto : [String(bruto)];
}

describe('Sessão por cookie HttpOnly', () => {
  it('login define cookie HttpOnly SameSite=Lax e segue devolvendo token para o mobile', async () => {
    const res = await login();
    tokenGestor = res.body.token;
    const linha = linhasCookie(res).find(item => item.includes('zelium_sessao='));
    expect(linha).toBeDefined();
    expect(linha).toContain('HttpOnly');
    expect(linha).toMatch(/SameSite=Lax/i);
    expect(linha).toContain('Path=/');
    expect(linha).not.toMatch(/Secure/i); // dev sem TLS: Secure seria descartado
    cookieGestor = linha!.split(';')[0];
  });

  it('cookie autentica GET sem Authorization', async () => {
    const res = await rawRequest(app).get('/api/auth/me').set('Cookie', cookieGestor);
    expect(res.status).toBe(200);
    expect(res.body.usuario.email).toBe('gestor@cookie.test');
  });

  it('escrita por cookie sem X-Requested-With é bloqueada como CSRF', async () => {
    const res = await rawRequest(app)
      .post('/api/tipo-material').set('Cookie', cookieGestor).send({ nome: 'Sem Header' });
    expect(res.status).toBe(403);
    expect(res.body.codigo).toBe('csrf');
    expect((await rawRequest(app).get('/api/tipo-material').set('Cookie', cookieGestor)).status).toBe(200);
  });

  it('escrita por cookie com X-Requested-With passa', async () => {
    const res = await rawRequest(app)
      .post('/api/tipo-material')
      .set('Cookie', cookieGestor)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ nome: 'Com Header' });
    expect(res.status).toBe(201);
  });

  it('Bearer não exige header CSRF (mobile continua como está)', async () => {
    const res = await rawRequest(app)
      .post('/api/tipo-material')
      .set('Authorization', `Bearer ${tokenGestor}`)
      .send({ nome: 'Bearer Puro' });
    expect(res.status).toBe(201);
  });

  it('logout limpa o cookie no cliente', async () => {
    const res = await rawRequest(app)
      .post('/api/auth/logout')
      .set('Cookie', cookieGestor)
      .set('X-Requested-With', 'XMLHttpRequest');
    expect(res.status).toBe(200);
    const linha = linhasCookie(res).find(item => item.includes('zelium_sessao='));
    expect(linha).toBeDefined();
    expect(linha).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
    expect(linha).toContain('HttpOnly');
  });
});

describe('CORS com credenciais restritas', () => {
  it('origem da web permitida recebe eco + credentials e X-Requested-With liberado', async () => {
    const res = await rawRequest(app).options('/api/auth/login')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,x-requested-with');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers['access-control-allow-headers']).toMatch(/X-Requested-With/i);
  });

  it('origem desconhecida não recebe permissão de cross-origin', async () => {
    const res = await rawRequest(app).options('/api/auth/login')
      .set('Origin', 'http://atacante.test')
      .set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });
});
