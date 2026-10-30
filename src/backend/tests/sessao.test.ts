import type { Express } from 'express';
import type { Sequelize } from 'sequelize';
import { QueryTypes } from 'sequelize';
import jwt from 'jsonwebtoken';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { bearerToken, rawRequest } from './helpers/request';

let app: Express;
let sequelize: Sequelize;
let container: StartedPostgreSqlContainer;
let Organizacao: any;
let Usuario: any;

const SENHA_INICIAL = 'Senha@123';
const SENHA_NOVA = 'NovaSenha@456';

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

  Organizacao = (await import('../src/models/Organizacao')).Organizacao;
  Usuario = (await import('../src/models/Usuario')).Usuario;

  await import('../src/database/index');
  await sequelize.sync({ force: true });

  app = (await import('../src/app')).default;

  const { AuthService } = await import('../src/services/AuthService');
  const auth = new AuthService();
  const senha_hash = await auth.hashSenha(SENHA_INICIAL);

  await Organizacao.create({ id: 1, nome: 'Org Sessao', slug: 'org-sessao' });
  await Usuario.create({ nome: 'Gestor Sessao', email: 'gestor@sessao.com', senha_hash, papel: 'gestor', organizacao_id: 1 });
  await Usuario.create({ nome: 'Func Sessao', email: 'func@sessao.com', senha_hash, papel: 'conferente', organizacao_id: 1 });
}, 60_000);

afterAll(async () => {
  await sequelize.close();
  await container.stop();
});

async function login(email: string, senha: string): Promise<{ status: number; token?: string; erro?: string }> {
  const res = await rawRequest(app).post('/api/auth/login').send({ email, senha });
  return { status: res.status, token: res.body?.token, erro: res.body?.error };
}

describe('Sessões revogáveis por versão', () => {
  it('login emite token com ver e o token funciona em /auth/me', async () => {
    const { status, token } = await login('func@sessao.com', SENHA_INICIAL);
    expect(status).toBe(200);
    const payload = jwt.decode(token!) as jwt.JwtPayload;
    expect(payload.ver).toBe(1);

    const me = await rawRequest(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.usuario.email).toBe('func@sessao.com');
  });

  it('troca de senha revoga a sessão antiga e permite login com a nova', async () => {
    const antigo = await login('func@sessao.com', SENHA_INICIAL);
    expect(antigo.status).toBe(200);

    const gestor = await login('gestor@sessao.com', SENHA_INICIAL);
    const res = await rawRequest(app)
      .put('/api/usuarios/2')
      .set('Authorization', `Bearer ${gestor.token}`)
      .send({ senha: SENHA_NOVA });
    expect(res.status).toBe(200);

    const comTokenAntigo = await rawRequest(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${antigo.token}`);
    expect(comTokenAntigo.status).toBe(401);
    expect(comTokenAntigo.body.error).toMatch(/Sessao desatualizada|Faca login/i);

    const comNovaSenha = await login('func@sessao.com', SENHA_NOVA);
    expect(comNovaSenha.status).toBe(200);
    const me = await rawRequest(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${comNovaSenha.token}`);
    expect(me.status).toBe(200);
  });

  it('desativar o usuário revoga a sessão', async () => {
    const sessao = await login('func@sessao.com', SENHA_NOVA);
    expect(sessao.status).toBe(200);

    const gestor = await login('gestor@sessao.com', SENHA_INICIAL);
    const res = await rawRequest(app)
      .put('/api/usuarios/2')
      .set('Authorization', `Bearer ${gestor.token}`)
      .send({ ativo: false });
    expect(res.status).toBe(200);

    const comSessaoAntiga = await rawRequest(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${sessao.token}`);
    expect(comSessaoAntiga.status).toBe(401);
    expect(comSessaoAntiga.body.error).toMatch(/Sessao invalida|Faca login/i);

    // Reativa para os testes seguintes (login volta a funcionar).
    await rawRequest(app)
      .put('/api/usuarios/2')
      .set('Authorization', `Bearer ${gestor.token}`)
      .send({ ativo: true });
    const reativado = await login('func@sessao.com', SENHA_NOVA);
    expect(reativado.status).toBe(200);
  });

  it('token fabricado sem ver é recusado como sessão desatualizada', async () => {
    const { JWT_SECRET } = await import('../src/config/auth');
    const semVer = jwt.sign(
      { email: 'func@sessao.com', nome: 'Func Sessao', papel: 'conferente', organizacaoId: 1 },
      JWT_SECRET,
      { subject: '2', expiresIn: '1h' },
    );
    const res = await rawRequest(app).get('/api/auth/me').set('Authorization', `Bearer ${semVer}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Sessao desatualizada|Faca login/i);

    // Token com ver errada também é recusado.
    const verErrada = jwt.sign(
      { email: 'func@sessao.com', nome: 'Func Sessao', papel: 'conferente', organizacaoId: 1, ver: 99 },
      JWT_SECRET,
      { subject: '2', expiresIn: '1h' },
    );
    const comVerErrada = await rawRequest(app).get('/api/auth/me').set('Authorization', `Bearer ${verErrada}`);
    expect(comVerErrada.status).toBe(401);
  });

  it('organização desativada revoga as sessões de seus usuários', async () => {
    const sessao = await login('func@sessao.com', SENHA_NOVA);
    expect(sessao.status).toBe(200);

    await sequelize.query('UPDATE organizacao SET ativo = FALSE WHERE id = 1', { type: QueryTypes.UPDATE });

    const comOrgInativa = await rawRequest(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${sessao.token}`);
    expect(comOrgInativa.status).toBe(401);

    // Restaura o estado para a limpeza do container.
    await sequelize.query('UPDATE organizacao SET ativo = TRUE WHERE id = 1', { type: QueryTypes.UPDATE });
    expect((await rawRequest(app).get('/api/usuarios').set(bearerToken('gestor'))).status).toBe(200);
  });
});
