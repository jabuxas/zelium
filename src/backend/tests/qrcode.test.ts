import type { Express } from 'express';
import type { Sequelize } from 'sequelize';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

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

const TOKEN_GESTOR = bearerToken('gestor', '1', 1);
const TOKEN_CONFERENTE = bearerToken('conferente', '2', 1);

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

  await Organizacao.create({ id: 1, nome: 'Org QR', slug: 'org-qr' });
  await Usuario.create({ nome: 'Gestor QR', email: 'g@qr.com', senha_hash: 'x', papel: 'gestor', organizacao_id: 1 });
  await Usuario.create({ nome: 'Conferente QR', email: 'c@qr.com', senha_hash: 'x', papel: 'conferente', organizacao_id: 1 });
  await TipoMaterial.create({ nome: 'Informatica', organizacao_id: 1 });
  await EstadoItem.create({ nome: 'Em condicoes', organizacao_id: 1 });
  await EstadoItem.create({ nome: 'Em manutencao', organizacao_id: 1, avaria: true });
  await Responsavel.create({ nome: 'Resp QR', email: 'r@qr.com', organizacao_id: 1 });
  await Ambiente.create({ nome: 'Sala QR', responsavel_id: 1, organizacao_id: 1 });
  await Patrimonio.create({
    numero_patrimonio: 'QR-001',
    descricao: 'Item com etiqueta QR',
    valor: 1500,
    tipo_material_id: 1,
    estado_item_id: 1,
    ambiente_id: 1,
    responsavel_id: 1,
    organizacao_id: 1,
  });
}, 60_000);

afterAll(async () => {
  await sequelize.close();
  await container.stop();
});

describe('QR Code e inventário em campo', () => {
  it('gera QR code SVG com deep link do patrimonio', async () => {
    const res = await rawRequest(app).get('/api/patrimonios/1/qrcode').set(TOKEN_GESTOR);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/svg+xml');
    const svg = Buffer.isBuffer(res.body) ? res.body.toString() : res.text;
    expect(svg).toContain('<svg');
  });

  it('conteudo do QR code e o deep link do app', async () => {
    const { qrConteudoPatrimonio } = await import('../src/utils/qrcode');
    expect(qrConteudoPatrimonio('QR-001')).toBe('zelium://patrimonio/QR-001');
    expect(qrConteudoPatrimonio('2024/001')).toBe('zelium://patrimonio/2024%2F001');
  });

  it('gera etiqueta imprimivel em HTML', async () => {
    const res = await rawRequest(app).get('/api/patrimonios/1/etiqueta').set(TOKEN_GESTOR);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('QR-001');
    expect(res.text).toContain('Imprimir etiqueta');
  });

  it('trata número e descrição como texto, nunca como HTML executável na etiqueta', async () => {
    const item = await Patrimonio.create({ numero_patrimonio: '<svg onload=alert(1)>',
      descricao: '<img src=x onerror=alert(2)> & "texto"', valor: 1,
      tipo_material_id: 1, estado_item_id: 1, ambiente_id: 1, responsavel_id: 1, organizacao_id: 1,
    });
    const res = await rawRequest(app).get(`/api/patrimonios/${item.id}/etiqueta`).set(TOKEN_GESTOR);
    expect(res.status).toBe(200);
    expect(res.text).not.toContain('<svg onload=');
    expect(res.text).not.toContain('<img src=');
    expect(res.text).toContain('&lt;svg onload=alert(1)&gt;');
    expect(res.text).toContain('&lt;img src=x onerror=alert(2)&gt; &amp; &quot;texto&quot;');
  });

  it('busca patrimonio pelo numero (fluxo do scanner)', async () => {
    const res = await rawRequest(app)
      .get('/api/patrimonios')
      .query({ numero: 'QR-001' })
      .set(TOKEN_GESTOR);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].numero_patrimonio).toBe('QR-001');
  });

  it('conferente registra conferencia e atualiza o estado em campo', async () => {
    const res = await rawRequest(app)
      .post('/api/patrimonios/1/conferencias')
      .set(TOKEN_CONFERENTE)
      .send({ estado_item_id: 2, observacao: 'Tela trincada, enviar para manutencao' });

    expect(res.status).toBe(201);
    expect(res.body.usuario_id).toBe(2);
    expect(res.body.estado_item_id).toBe(2);

    // O estado do patrimônio foi atualizado pelo fluxo de conferência
    const patrimonio = await Patrimonio.findByPk(1);
    expect(patrimonio.estado_item_id).toBe(2);
  });

  it('lista conferencias do patrimonio', async () => {
    const res = await rawRequest(app).get('/api/patrimonios/1/conferencias').set(TOKEN_GESTOR);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].observacao).toContain('manutencao');
  });

  it('conferente pode listar conferencias mas nao excluir patrimonio', async () => {
    const res = await rawRequest(app).delete('/api/patrimonios/1').set(TOKEN_CONFERENTE);
    expect(res.status).toBe(403);
  });
});
