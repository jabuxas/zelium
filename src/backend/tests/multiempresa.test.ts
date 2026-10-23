import type { Express } from 'express';
import type { Sequelize } from 'sequelize';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import bcrypt from 'bcryptjs';

import { bearerToken, rawRequest } from './helpers/request';

let app: Express;
let sequelize: Sequelize;
let container: StartedPostgreSqlContainer;
let Organizacao: any;
let Usuario: any;
let TipoMaterial: any;
let EstadoItem: any;
let Ambiente: any;
let Responsavel: any;
let Patrimonio: any;

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

  Organizacao = (await import('../src/models/Organizacao')).Organizacao;
  Usuario = (await import('../src/models/Usuario')).Usuario;
  TipoMaterial = (await import('../src/models/TipoMaterial')).TipoMaterial;
  EstadoItem = (await import('../src/models/EstadoItem')).EstadoItem;
  Ambiente = (await import('../src/models/Ambiente')).Ambiente;
  Responsavel = (await import('../src/models/Responsavel')).Responsavel;
  Patrimonio = (await import('../src/models/Patrimonio')).Patrimonio;

  await import('../src/database/index');
  await sequelize.sync({ force: true });

  app = (await import('../src/app')).default;

  const senha_hash = await bcrypt.hash(SENHA, 10);

  await Organizacao.create({ id: 1, nome: 'Empresa Alfa', slug: 'alfa' });
  await Organizacao.create({ id: 2, nome: 'Empresa Beta', slug: 'beta' });

  await Usuario.create({ nome: 'Gestor Alfa', email: 'gestor@alfa.com', senha_hash, papel: 'gestor', organizacao_id: 1 });
  await Usuario.create({ nome: 'Gestor Beta', email: 'gestor@beta.com', senha_hash, papel: 'gestor', organizacao_id: 2 });

  // Cadastros de cada organização
  await TipoMaterial.create({ nome: 'Tipo da Alfa', organizacao_id: 1 });
  await TipoMaterial.create({ nome: 'Tipo da Beta', organizacao_id: 2 });

  await EstadoItem.create({ nome: 'Estado da Alfa', organizacao_id: 1 });
  await EstadoItem.create({ nome: 'Estado da Beta', organizacao_id: 2 });

  await Responsavel.create({ nome: 'Resp Alfa', email: 'resp@alfa.com', organizacao_id: 1 });
  await Responsavel.create({ nome: 'Resp Beta', email: 'resp@beta.com', organizacao_id: 2 });

  await Ambiente.create({ nome: 'Sala Alfa', responsavel_id: 1, organizacao_id: 1 });
  await Ambiente.create({ nome: 'Sala Beta', responsavel_id: 2, organizacao_id: 2 });
}, 60_000);

afterAll(async () => {
  await sequelize.close();
  await container.stop();
});

async function login(email: string): Promise<string> {
  const res = await rawRequest(app)
    .post('/api/auth/login')
    .send({ email, senha: SENHA });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

describe('Isolamento multiempresa', () => {
  it('usuario da Alfa ve apenas dados da Alfa', async () => {
    const token = await login('gestor@alfa.com');
    const auth = { Authorization: `Bearer ${token}` };

    const res = await rawRequest(app).get('/api/tipo-material').set(auth);
    expect(res.status).toBe(200);
    const nomes = res.body.map((t: any) => t.nome);
    expect(nomes).toContain('Tipo da Alfa');
    expect(nomes).not.toContain('Tipo da Beta');

    const ambientes = await rawRequest(app).get('/api/ambientes').set(auth);
    expect(ambientes.body.map((a: any) => a.nome)).toEqual(['Sala Alfa']);
  });

  it('usuario da Beta ve apenas dados da Beta', async () => {
    const token = await login('gestor@beta.com');
    const res = await rawRequest(app)
      .get('/api/tipo-material')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const nomes = res.body.map((t: any) => t.nome);
    expect(nomes).toContain('Tipo da Beta');
    expect(nomes).not.toContain('Tipo da Alfa');
  });

  it('findById nao vaza registro de outra organizacao', async () => {
    // Tipo da Beta (id 2) não deve ser acessível pela Alfa
    const res = await rawRequest(app).get('/api/tipo-material/2').set(bearerToken('gestor', '1', 1));
    expect(res.status).toBe(404);
  });

  it('bloqueia criar patrimonio referenciando cadastro de outra organizacao', async () => {
    const res = await rawRequest(app)
      .post('/api/patrimonios')
      .set(bearerToken('gestor', '1', 1))
      .send({
        numero_patrimonio: 'ALFA-001',
        descricao: 'Tentativa de referencia cruzada',
        valor: 100,
        tipo_material_id: 2, // Tipo da Beta
        estado_item_id: 1,
        ambiente_id: 1,
        responsavel_id: 1,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/organizacao/i);
  });

  it('permite criar patrimonio com referencias da propria organizacao', async () => {
    const res = await rawRequest(app)
      .post('/api/patrimonios')
      .set(bearerToken('gestor', '1', 1))
      .send({
        numero_patrimonio: 'ALFA-002',
        descricao: 'Patrimonio valido da Alfa',
        valor: 200,
        tipo_material_id: 1,
        estado_item_id: 1,
        ambiente_id: 1,
        responsavel_id: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.organizacao_id).toBe(1);
  });

  it('listagem de usuarios e isolada por organizacao', async () => {
    const res = await rawRequest(app).get('/api/usuarios').set(bearerToken('gestor', '1', 1));
    expect(res.status).toBe(200);
    const emails = res.body.map((u: any) => u.email);
    expect(emails).toContain('gestor@alfa.com');
    expect(emails).not.toContain('gestor@beta.com');
  });
});
