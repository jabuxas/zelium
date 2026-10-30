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

  await Organizacao.create({ id: 1, nome: 'Org Validacao', slug: 'org-validacao' });
  await TipoMaterial.create({ nome: 'Informatica', organizacao_id: 1 });
  await EstadoItem.create({ nome: 'Em condicoes', organizacao_id: 1 });
  await Responsavel.create({ nome: 'Resp Validacao', email: 'r@validacao.com', organizacao_id: 1 });
  await Ambiente.create({ nome: 'Sala Validacao', responsavel_id: 1, organizacao_id: 1 });
  await criarUsuariosDeTeste();
}, 60_000);

afterAll(async () => {
  await sequelize.close();
  await container.stop();
});

async function criarBem(numero: string, extras: Record<string, unknown> = {}) {
  const res = await rawRequest(app)
    .post('/api/patrimonios')
    .set(TOKEN)
    .send({
      numero_patrimonio: numero,
      descricao: 'Bem de validação compartilhada',
      valor: 5000,
      tipo_material_id: 1,
      estado_item_id: 1,
      ambiente_id: 1,
      responsavel_id: 1,
      ...extras,
    });
  return res;
}

describe('Validação compartilhada dos campos de depreciação', () => {
  it('cadastro mantém as mensagens atuais para dados inválidos', async () => {
    const res = await criarBem('VAL-INVALIDO-001', { vida_util_anos: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('vida_util_anos deve ser um inteiro entre 1 e 100');
    expect(await Patrimonio.count({ where: { numero_patrimonio: 'VAL-INVALIDO-001' } })).toBe(0);
  });

  it('recusa data inexistente no calendário (30/02) no cadastro e na edição', async () => {
    const criado = await criarBem('VAL-DATA-001');
    expect(criado.status).toBe(201);

    const noCadastro = await criarBem('VAL-DATA-002', { data_aquisicao: '2024-02-30' });
    expect(noCadastro.status).toBe(400);
    expect(noCadastro.body.error).toBe('data_aquisicao nao existe no calendario');

    const naEdicao = await rawRequest(app)
      .put(`/api/patrimonios/${criado.body.id}`)
      .set(TOKEN)
      .send({ data_aquisicao: '2023-04-31' });
    expect(naEdicao.status).toBe(400);
    expect(naEdicao.body.error).toBe('data_aquisicao nao existe no calendario');
    expect(await Patrimonio.findByPk(criado.body.id)).toMatchObject({ data_aquisicao: null });
  });

  it('edição inválida responde 400 com detalhe por campo e não altera o registro', async () => {
    const criado = await criarBem('VAL-EDIT-001', { valor_residual: 500 });
    expect(criado.status).toBe(201);

    const res = await rawRequest(app)
      .put(`/api/patrimonios/${criado.body.id}`)
      .set(TOKEN)
      .send({ vida_util_anos: 0, valor_residual: -1 });
    expect(res.status).toBe(400);
    expect(res.body.erros).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ campo: 'vida_util_anos' }),
        expect.objectContaining({ campo: 'valor_residual' }),
      ]),
    );
    expect(await Patrimonio.findByPk(criado.body.id)).toMatchObject({
      vida_util_anos: null,
      valor_residual: 500,
    });
  });

  it('recusa residual acima do valor informado na mesma requisição', async () => {
    const criado = await criarBem('VAL-RES-001');
    const res = await rawRequest(app)
      .put(`/api/patrimonios/${criado.body.id}`)
      .set(TOKEN)
      .send({ valor: 1000, valor_residual: 2000 });
    expect(res.status).toBe(400);
    expect(await Patrimonio.findByPk(criado.body.id)).toMatchObject({ valor: 5000 });
  });

  it('recusa residual acima do valor persistido quando o valor não é enviado', async () => {
    const criado = await criarBem('VAL-RES-002');
    const res = await rawRequest(app)
      .put(`/api/patrimonios/${criado.body.id}`)
      .set(TOKEN)
      .send({ valor_residual: 6000 });
    expect(res.status).toBe(400);
    expect(res.body.erros).toEqual([
      expect.objectContaining({ campo: 'valor_residual' }),
    ]);
    expect(await Patrimonio.findByPk(criado.body.id)).toMatchObject({
      valor: 5000,
      valor_residual: null,
    });
  });

  it('recusa reduzir o valor abaixo do residual persistido', async () => {
    const criado = await criarBem('VAL-RES-003', { valor_residual: 500 });
    expect(criado.status).toBe(201);

    const res = await rawRequest(app)
      .put(`/api/patrimonios/${criado.body.id}`)
      .set(TOKEN)
      .send({ valor: 100 });
    expect(res.status).toBe(400);
    expect(res.body.erros).toEqual([
      expect.objectContaining({ campo: 'valor' }),
    ]);
    expect(await Patrimonio.findByPk(criado.body.id)).toMatchObject({ valor: 5000 });
  });

  it('aceita PUT do formulário web com nulls explícitos e preserva a edição de outros campos', async () => {
    const criado = await criarBem('VAL-NULL-001');
    const res = await rawRequest(app)
      .put(`/api/patrimonios/${criado.body.id}`)
      .set(TOKEN)
      .send({
        numero_patrimonio: 'VAL-NULL-001',
        descricao: 'Bem de validação compartilhada (editado)',
        valor: 5000,
        data_aquisicao: null,
        vida_util_anos: null,
        valor_residual: null,
        tipo_material_id: 1,
        estado_item_id: 1,
        ambiente_id: 1,
        responsavel_id: 1,
        fornecedor_id: null,
      });
    expect(res.status).toBe(200);
    expect(res.body.descricao).toBe('Bem de validação compartilhada (editado)');
    expect(res.body.data_aquisicao).toBeNull();
    expect(res.body.vida_util_anos).toBeNull();
    expect(res.body.valor_residual).toBeNull();
  });

  it('limpa e redefine campos com null explícito e valores válidos', async () => {
    const criado = await criarBem('VAL-NULL-002', {
      data_aquisicao: '2023-01-15',
      vida_util_anos: 5,
      valor_residual: 500,
    });

    const limpou = await rawRequest(app)
      .put(`/api/patrimonios/${criado.body.id}`)
      .set(TOKEN)
      .send({ vida_util_anos: null, valor_residual: null });
    expect(limpou.status).toBe(200);
    expect(await Patrimonio.findByPk(criado.body.id)).toMatchObject({
      data_aquisicao: '2023-01-15',
      vida_util_anos: null,
      valor_residual: null,
    });

    const redefiniu = await rawRequest(app)
      .put(`/api/patrimonios/${criado.body.id}`)
      .set(TOKEN)
      .send({ vida_util_anos: 10, valor_residual: 250 });
    expect(redefiniu.status).toBe(200);
    expect(await Patrimonio.findByPk(criado.body.id)).toMatchObject({
      vida_util_anos: 10,
      valor_residual: 250,
    });
  });

  it('aceita residual igual ao valor (bem totalmente residualizado)', async () => {
    const criado = await criarBem('VAL-LIMITE-001');
    const res = await rawRequest(app)
      .put(`/api/patrimonios/${criado.body.id}`)
      .set(TOKEN)
      .send({ valor_residual: 5000 });
    expect(res.status).toBe(200);
    expect(res.body.valor_residual).toBe(5000);
  });

  it('recusa valores não finitos (NaN/Infinity) nos campos monetários', async () => {
    const criado = await criarBem('VAL-NUM-001');
    for (const invalido of [NaN, Infinity, -Infinity]) {
      const res = await rawRequest(app)
        .put(`/api/patrimonios/${criado.body.id}`)
        .set(TOKEN)
        .send({ valor: invalido });
      expect(res.status).toBe(400);
    }
    expect(await Patrimonio.findByPk(criado.body.id)).toMatchObject({ valor: 5000 });
  });
});
