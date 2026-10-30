import type { Express } from 'express';
import type { Sequelize } from 'sequelize';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import { bearerToken, rawRequest } from './helpers/request';
import { criarUsuariosDeTeste } from './helpers/usuarios';
let calcularDepreciacao: typeof import('../src/services/DepreciacaoService').calcularDepreciacao;

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

  // O serviço importa a conexão: só pode ser carregado após configurar o container.
  ({ calcularDepreciacao } = await import('../src/services/DepreciacaoService'));
  const connection = await import('../src/database/connection');
  sequelize = connection.sequelize;
  expect(sequelize.config).toMatchObject({ host: container.getHost(), port: container.getMappedPort(5432), database: container.getDatabase() });

  Organizacao = (await import('../src/models/Organizacao')).Organizacao;
  TipoMaterial = (await import('../src/models/TipoMaterial')).TipoMaterial;
  EstadoItem = (await import('../src/models/EstadoItem')).EstadoItem;
  Ambiente = (await import('../src/models/Ambiente')).Ambiente;
  Responsavel = (await import('../src/models/Responsavel')).Responsavel;
  Patrimonio = (await import('../src/models/Patrimonio')).Patrimonio;

  await import('../src/database/index');
  await sequelize.sync({ force: true });

  app = (await import('../src/app')).default;

  await Organizacao.create({ id: 1, nome: 'Org Depreciacao', slug: 'org-dep' });
  await TipoMaterial.create({ nome: 'Informatica', organizacao_id: 1 });
  await EstadoItem.create({ nome: 'Em condicoes', organizacao_id: 1 });
  await Responsavel.create({ nome: 'Resp Dep', email: 'r@dep.com', organizacao_id: 1 });
  await Ambiente.create({ nome: 'Sala Dep', responsavel_id: 1, organizacao_id: 1 });

  // Adquirido há exatamente 2 anos (referência fixa), vida útil 5, residual 10%
  const referencia = new Date();
  const doisAnosAtras = new Date(referencia);
  doisAnosAtras.setFullYear(referencia.getFullYear() - 2);
  const dataAquisicao = doisAnosAtras.toISOString().slice(0, 10);

  await Patrimonio.create({
    numero_patrimonio: 'DEP-001',
    descricao: 'Notebook depreciável',
    valor: 5000,
    data_aquisicao: dataAquisicao,
    vida_util_anos: 5,
    valor_residual: 500,
    tipo_material_id: 1,
    estado_item_id: 1,
    ambiente_id: 1,
    responsavel_id: 1,
    organizacao_id: 1,
  });

  await Patrimonio.create({
    numero_patrimonio: 'DEP-002',
    descricao: 'Bem sem depreciação configurada',
    valor: 1000,
    tipo_material_id: 1,
    estado_item_id: 1,
    ambiente_id: 1,
    responsavel_id: 1,
    organizacao_id: 1,
  });
  await criarUsuariosDeTeste();
}, 60_000);

afterAll(async () => {
  await sequelize.close();
  await container.stop();
});

describe('Cálculo de depreciação (método linear)', () => {
  it('calcula depreciacao acumulada e valor contabil', () => {
    const ref = new Date('2026-01-01T00:00:00');
    const dep = calcularDepreciacao(5000, '2024-01-01', 5, 500, ref);

    // Valor depreciável: 4500; anual: 900; em 24 meses: 1800
    expect(dep.depreciacao_anual).toBe(900);
    expect(dep.depreciacao_acumulada).toBe(1800);
    expect(dep.valor_contabil_atual).toBe(3200);
    expect(dep.depreciavel).toBe(true);
  });

  it('nunca deprecia abaixo do valor residual', () => {
    const ref = new Date('2040-01-01T00:00:00');
    const dep = calcularDepreciacao(5000, '2024-01-01', 5, 500, ref);

    expect(dep.depreciacao_acumulada).toBe(4500);
    expect(dep.valor_contabil_atual).toBe(500);
  });

  it('sem data de aquisicao nao deprecia', () => {
    const dep = calcularDepreciacao(1000, null, 5, 0, new Date());
    expect(dep.depreciavel).toBe(false);
    expect(dep.valor_contabil_atual).toBe(1000);
  });
});

describe('Endpoints de depreciação', () => {
  it('retorna o detalhe da depreciacao do patrimonio', async () => {
    const res = await rawRequest(app).get('/api/patrimonios/1/depreciacao').set(TOKEN);
    expect(res.status).toBe(200);
    expect(res.body.numero_patrimonio).toBe('DEP-001');
    expect(res.body.valor_aquisicao).toBe(5000);
    expect(res.body.valor_residual).toBe(500);
    expect(res.body.depreciacao_acumulada).toBeGreaterThan(0);
    expect(res.body.valor_contabil_atual).toBeLessThan(5000);
  });

  it('retorna 404 para patrimonio inexistente', async () => {
    const res = await rawRequest(app).get('/api/patrimonios/999/depreciacao').set(TOKEN);
    expect(res.status).toBe(404);
  });

  it('resumo financeiro traz totais e quebra por ambiente', async () => {
    const res = await rawRequest(app).get('/api/relatorios/financeiro').set(TOKEN);
    expect(res.status).toBe(200);

    expect(res.body.total.total_itens).toBe(2);
    expect(res.body.total.valor_aquisicao).toBe(6000);
    expect(res.body.total.depreciacao_acumulada).toBeGreaterThan(0);
    expect(res.body.total.valor_contabil).toBeLessThan(6000);

    const sala = res.body.por_ambiente.find((l: any) => l.ambiente === 'Sala Dep');
    expect(sala.total_itens).toBe(2);
  });

  it('exporta CSV financeiro', async () => {
    const res = await rawRequest(app)
      .get('/api/relatorios/exportar/csv')
      .query({ tipo: 'financeiro' })
      .set(TOKEN);

    expect(res.status).toBe(200);
    expect(res.text).toContain('valor_contabil');
    expect(res.text).toContain('TOTAL');
  });

  it('conferente nao acessa o financeiro', async () => {
    const res = await rawRequest(app).get('/api/relatorios/financeiro').set(bearerToken('conferente'));
    expect(res.status).toBe(403);
  });

  it('detalhe de depreciacao por bem e exclusivo do gestor', async () => {
    const gestor = await rawRequest(app).get('/api/patrimonios/1/depreciacao').set(TOKEN);
    expect(gestor.status).toBe(200);
    // 403 (não 404): a autorização vem antes da consulta, sem sondar existência.
    for (const papel of ['responsavel', 'conferente'] as const) {
      const res = await rawRequest(app)
        .get('/api/patrimonios/1/depreciacao')
        .set(bearerToken(papel));
      expect(res.status).toBe(403);
    }
    const anonimo = await rawRequest(app).get('/api/patrimonios/1/depreciacao');
    expect(anonimo.status).toBe(401);
  });

  it('valida campos de depreciacao no cadastro', async () => {
    const res = await rawRequest(app)
      .post('/api/patrimonios')
      .set(TOKEN)
      .send({
        numero_patrimonio: 'DEP-003',
        descricao: 'Vida util invalida',
        valor: 100,
        vida_util_anos: 0,
        tipo_material_id: 1,
        estado_item_id: 1,
        ambiente_id: 1,
        responsavel_id: 1,
      });
    expect(res.status).toBe(400);
  });
});
