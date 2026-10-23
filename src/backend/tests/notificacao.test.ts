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
let Notificacao: any;

const SENHA = 'Senha@123';
const TOKEN_GESTOR = bearerToken('gestor', '1', 1);

async function esperarNotificacao(tipo: string, timeoutMs = 3000): Promise<any> {
  const inicio = Date.now();
  while (Date.now() - inicio < timeoutMs) {
    const linha = await Notificacao.findOne({ where: { tipo }, order: [['id', 'DESC']] });
    if (linha) return linha;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
}

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
  delete process.env.SMTP_HOST;

  const connection = await import('../src/database/connection');
  sequelize = connection.sequelize;

  Organizacao = (await import('../src/models/Organizacao')).Organizacao;
  Usuario = (await import('../src/models/Usuario')).Usuario;
  TipoMaterial = (await import('../src/models/TipoMaterial')).TipoMaterial;
  EstadoItem = (await import('../src/models/EstadoItem')).EstadoItem;
  Ambiente = (await import('../src/models/Ambiente')).Ambiente;
  Responsavel = (await import('../src/models/Responsavel')).Responsavel;
  Patrimonio = (await import('../src/models/Patrimonio')).Patrimonio;
  Notificacao = (await import('../src/models/Notificacao')).Notificacao;

  await import('../src/database/index');
  await sequelize.sync({ force: true });

  app = (await import('../src/app')).default;

  const senha_hash = await bcrypt.hash(SENHA, 10);
  await Organizacao.create({ id: 1, nome: 'Organizacao Teste', slug: 'org-teste' });
  await Usuario.create({ nome: 'Gestor', email: 'gestor@org.com', senha_hash, papel: 'gestor', organizacao_id: 1 });
  await TipoMaterial.create({ nome: 'Informatica', organizacao_id: 1 });
  await EstadoItem.create({ nome: 'Em condicoes', organizacao_id: 1, avaria: false });
  await EstadoItem.create({ nome: 'Em manutencao', organizacao_id: 1, avaria: true });
  await Responsavel.create({ nome: 'Resp Notif', email: 'responsavel@org.com', organizacao_id: 1 });
  await Ambiente.create({ nome: 'Sala 1', responsavel_id: 1, organizacao_id: 1 });
  await Patrimonio.create({
    numero_patrimonio: 'NOTIF-001',
    descricao: 'Notebook para teste de notificacao',
    valor: 3000,
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

describe('Notificações automáticas por e-mail', () => {
  it('solicitacao criada gera notificacao para responsavel e gestores', async () => {
    const res = await rawRequest(app)
      .post('/api/solicitacoes')
      .set(TOKEN_GESTOR)
      .send({ patrimonio_id: 1, tipo: 'manutencao', descricao: 'Tela trincada' });

    expect(res.status).toBe(201);

    const notificacao = await esperarNotificacao('solicitacao_criada');
    expect(notificacao).not.toBeNull();
    expect(notificacao.destinatarios).toContain('responsavel@org.com');
    expect(notificacao.destinatarios).toContain('gestor@org.com');
    expect(notificacao.assunto).toMatch(/NOTIF-001/);
    // Sem SMTP configurado o envio é simulado e registrado
    await new Promise((r) => setTimeout(r, 300));
    const enviada = await Notificacao.findByPk(notificacao.id);
    expect(['simulada', 'enviada']).toContain(enviada.status);
  });

  it('mudanca de estado para avaria gera notificacao', async () => {
    const res = await rawRequest(app)
      .put('/api/patrimonios/1')
      .set(TOKEN_GESTOR)
      .send({ estado_item_id: 2 }); // Em manutencao (avaria)

    expect(res.status).toBe(200);

    const notificacao = await esperarNotificacao('avaria');
    expect(notificacao).not.toBeNull();
    expect(notificacao.destinatarios).toContain('responsavel@org.com');
  });

  it('mudanca de status da solicitacao gera notificacao', async () => {
    const res = await rawRequest(app)
      .patch('/api/solicitacoes/1/status')
      .set(TOKEN_GESTOR)
      .send({ status: 'em_andamento' });

    expect(res.status).toBe(200);

    const notificacao = await esperarNotificacao('solicitacao_status');
    expect(notificacao).not.toBeNull();
    expect(notificacao.corpo).toMatch(/Em andamento/);
  });

  it('gestor lista notificacoes da organizacao', async () => {
    const res = await rawRequest(app).get('/api/notificacoes').set(TOKEN_GESTOR);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });
});
