import type { Express } from 'express';
import type { Sequelize } from 'sequelize';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { bearerToken, rawRequest } from './helpers/request';
import { criarUsuariosDeTeste } from './helpers/usuarios';

let app: Express;
let sequelize: Sequelize;
let container: StartedPostgreSqlContainer;
let Organizacao: any;
let TipoMaterial: any;
let EstadoItem: any;
let Ambiente: any;
let Responsavel: any;
let Patrimonio: any;

const TOKEN = bearerToken('gestor', '1', 1);

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
  TipoMaterial = (await import('../src/models/TipoMaterial')).TipoMaterial;
  EstadoItem = (await import('../src/models/EstadoItem')).EstadoItem;
  Ambiente = (await import('../src/models/Ambiente')).Ambiente;
  Responsavel = (await import('../src/models/Responsavel')).Responsavel;
  Patrimonio = (await import('../src/models/Patrimonio')).Patrimonio;

  await import('../src/database/index');
  await sequelize.sync({ force: true });

  app = (await import('../src/app')).default;

  await Organizacao.create({ id: 1, nome: 'Org Relatorios', slug: 'org-rel' });
  await TipoMaterial.create({ nome: 'Informatica', organizacao_id: 1 });
  await EstadoItem.create({ nome: 'Em condicoes', organizacao_id: 1 });
  await EstadoItem.create({ nome: 'Em manutencao', organizacao_id: 1 });
  await Responsavel.create({ nome: 'Resp A', email: 'resp.a@org.com', organizacao_id: 1 });
  await Responsavel.create({ nome: 'Resp B', email: 'resp.b@org.com', organizacao_id: 1 });
  await Ambiente.create({ nome: 'Sala A', responsavel_id: 1, organizacao_id: 1 });
  await Ambiente.create({ nome: 'Sala B', responsavel_id: 2, organizacao_id: 1 });

  await Patrimonio.create({ numero_patrimonio: 'R-001', descricao: 'Notebook A', valor: 1000, tipo_material_id: 1, estado_item_id: 1, ambiente_id: 1, responsavel_id: 1, organizacao_id: 1 });
  await Patrimonio.create({ numero_patrimonio: 'R-002', descricao: 'Monitor A', valor: 2000, tipo_material_id: 1, estado_item_id: 1, ambiente_id: 1, responsavel_id: 1, organizacao_id: 1 });
  await Patrimonio.create({ numero_patrimonio: 'R-003', descricao: 'Projetor B', valor: 500, tipo_material_id: 1, estado_item_id: 2, ambiente_id: 2, responsavel_id: 2, organizacao_id: 1 });
  await criarUsuariosDeTeste();
}, 60_000);

afterAll(async () => {
  await sequelize.close();
  await container.stop();
});

describe('Relatórios', () => {
  it('agrupa por ambiente com totais corretos', async () => {
    const res = await rawRequest(app).get('/api/relatorios/por-ambiente').set(TOKEN);
    expect(res.status).toBe(200);

    const salaA = res.body.find((l: any) => l.ambiente === 'Sala A');
    const salaB = res.body.find((l: any) => l.ambiente === 'Sala B');

    expect(salaA.total_itens).toBe(2);
    expect(salaA.valor_total).toBe(3000);
    expect(salaB.total_itens).toBe(1);
    expect(salaB.valor_total).toBe(500);
  });

  it('agrupa por responsavel', async () => {
    const res = await rawRequest(app).get('/api/relatorios/por-responsavel').set(TOKEN);
    expect(res.status).toBe(200);
    const respA = res.body.find((l: any) => l.responsavel === 'Resp A');
    expect(respA.total_itens).toBe(2);
    expect(respA.valor_total).toBe(3000);
  });

  it('agrupa por estado', async () => {
    const res = await rawRequest(app).get('/api/relatorios/por-estado').set(TOKEN);
    expect(res.status).toBe(200);
    const manutencao = res.body.find((l: any) => l.estado === 'Em manutencao');
    expect(manutencao.total_itens).toBe(1);
  });

  it('lista patrimonios com filtros', async () => {
    const res = await rawRequest(app)
      .get('/api/relatorios/patrimonios')
      .query({ ambiente_id: 1, busca: 'Monitor' })
      .set(TOKEN);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].numero_patrimonio).toBe('R-002');
  });

  it('exporta CSV de patrimonios', async () => {
    const res = await rawRequest(app)
      .get('/api/relatorios/exportar/csv')
      .query({ tipo: 'patrimonios' })
      .set(TOKEN);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('numero_patrimonio');
    expect(res.text).toContain('R-001');
    expect(res.text).toContain('Sala A');
  });

  it('exporta PDF de por-ambiente', async () => {
    const res = await rawRequest(app)
      .get('/api/relatorios/exportar/pdf')
      .query({ tipo: 'por-ambiente' })
      .set(TOKEN);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('rejeita tipo invalido na exportacao', async () => {
    const res = await rawRequest(app)
      .get('/api/relatorios/exportar/csv')
      .query({ tipo: 'invalido' })
      .set(TOKEN);
    expect(res.status).toBe(400);
  });

  it('conferente nao acessa relatorios', async () => {
    const res = await rawRequest(app).get('/api/relatorios/por-ambiente').set(bearerToken('conferente'));
    expect(res.status).toBe(403);
  });

  it.each(['csv', 'pdf'])('responsável não pode exportar dados financeiros via %s', async (formato) => {
    const res = await rawRequest(app).get(`/api/relatorios/exportar/${formato}`).query({ tipo: 'financeiro' }).set(bearerToken('responsavel'));
    expect(res.status).toBe(403);
  });
});
