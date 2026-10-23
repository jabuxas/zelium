import { bearerToken, rawRequest } from './helpers/request';
import type { Express } from 'express';
import type { Sequelize } from 'sequelize';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import bcrypt from 'bcryptjs';

let app: Express;
let sequelize: Sequelize;
let container: StartedPostgreSqlContainer;
let Usuario: any;

const SENHA = 'Senha@123';

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17')
    .withDatabase('zelar')
    .withUsername('zelar')
    .withPassword('zelar')
    .start();

  process.env.DB_HOST = container.getHost();
  process.env.DB_PORT = String(container.getMappedPort(5432));
  process.env.DB_NAME = container.getDatabase();
  process.env.DB_USER = container.getUsername();
  process.env.DB_PASSWORD = container.getPassword();

  const connection = await import('../src/database/connection');
  sequelize = connection.sequelize;
  Usuario = (await import('../src/models/Usuario')).Usuario;
  const Organizacao = (await import('../src/models/Organizacao')).Organizacao;
  await import('../src/database/index');
  await sequelize.sync({ force: true });

  app = (await import('../src/app')).default;

  await Organizacao.create({ id: 1, nome: 'Organizacao Teste', slug: 'org-teste' });

  const senha_hash = await bcrypt.hash(SENHA, 10);
  await Usuario.create({ nome: 'Gestor Org', email: 'gestor@org.com', senha_hash, papel: 'gestor' });
  await Usuario.create({ nome: 'Conferente Org', email: 'conferente@org.com', senha_hash, papel: 'conferente' });
}, 60_000);

afterAll(async () => {
  await sequelize.close();
  await container.stop();
});

describe('POST /api/auth/login', () => {
  it('retorna token e usuario com credenciais validas', async () => {
    const res = await rawRequest(app)
      .post('/api/auth/login')
      .send({ email: 'gestor@org.com', senha: SENHA });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.usuario).toMatchObject({ email: 'gestor@org.com', papel: 'gestor' });
    expect(res.body.usuario.senha_hash).toBeUndefined();
  });

  it('retorna 401 com senha incorreta', async () => {
    const res = await rawRequest(app)
      .post('/api/auth/login')
      .send({ email: 'gestor@org.com', senha: 'senha-errada' });

    expect(res.status).toBe(401);
  });

  it('retorna 401 com email inexistente', async () => {
    const res = await rawRequest(app)
      .post('/api/auth/login')
      .send({ email: 'ninguem@org.com', senha: SENHA });

    expect(res.status).toBe(401);
  });

  it('retorna 400 sem email ou senha', async () => {
    const res = await rawRequest(app).post('/api/auth/login').send({ email: 'gestor@org.com' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  it('retorna o usuario logado', async () => {
    const login = await rawRequest(app)
      .post('/api/auth/login')
      .send({ email: 'gestor@org.com', senha: SENHA });
    const token = login.body.token as string;

    const res = await rawRequest(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.usuario).toMatchObject({ email: 'gestor@org.com', papel: 'gestor' });
  });

  it('retorna 401 sem token', async () => {
    const res = await rawRequest(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('Proteção de rotas', () => {
  it('retorna 401 para rotas protegidas sem token', async () => {
    const res = await rawRequest(app).get('/api/patrimonios');
    expect(res.status).toBe(401);
  });

  it('retorna 403 para papel sem permissao (conferente em rota de gestor)', async () => {
    const login = await rawRequest(app)
      .post('/api/auth/login')
      .send({ email: 'conferente@org.com', senha: SENHA });

    const res = await rawRequest(app)
      .get('/api/usuarios')
      .set(bearerToken('conferente'));
    expect(res.status).toBe(403);
  });

  it('permite gestor listar usuarios', async () => {
    const login = await rawRequest(app)
      .post('/api/auth/login')
      .send({ email: 'gestor@org.com', senha: SENHA });

    const res = await rawRequest(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });});

describe('CRUD de usuarios (gestor)', () => {
  it('cria usuario e faz login com ele', async () => {
    const login = await rawRequest(app)
      .post('/api/auth/login')
      .send({ email: 'gestor@org.com', senha: SENHA });
    const token = login.body.token as string;

    const created = await rawRequest(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Novo Responsavel', email: 'novo@org.com', senha: 'Senha@456', papel: 'responsavel' });
    expect(created.status).toBe(201);
    expect(created.body.senha_hash).toBeUndefined();

    const novoLogin = await rawRequest(app)
      .post('/api/auth/login')
      .send({ email: 'novo@org.com', senha: 'Senha@456' });
    expect(novoLogin.status).toBe(200);
    expect(novoLogin.body.usuario.papel).toBe('responsavel');
  });

  it('rejeita email duplicado com 409', async () => {
    const login = await rawRequest(app)
      .post('/api/auth/login')
      .send({ email: 'gestor@org.com', senha: SENHA });

    const res = await rawRequest(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ nome: 'Duplicado', email: 'gestor@org.com', senha: 'Senha@456', papel: 'conferente' });
    expect(res.status).toBe(409);
  });
});
