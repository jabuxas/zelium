import { request } from "./helpers/request";
import { rawRequest, bearerToken } from "./helpers/request";
import { runWithContext } from '../src/context/requestContext';
import app from "../src/app";
import { sequelize } from "../src/database/connection";
import { TipoMaterial } from "../src/models/TipoMaterial";
import { AuditLog } from "../src/models/AuditLog";
import { Ambiente } from "../src/models/Ambiente";
import { EstadoItem } from "../src/models/EstadoItem";
import { Patrimonio } from "../src/models/Patrimonio";
import { Responsavel } from "../src/models/Responsavel";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";

let container: StartedPostgreSqlContainer;

describe("Testes de integração do log de auditoria", () => {
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17")
      .withDatabase("zelar")
      .withUsername("zelar")
      .withPassword("zelar")
      .start();

    process.env.DB_HOST = container.getHost();
    process.env.DB_PORT = String(container.getMappedPort(5432));
    process.env.DB_NAME = container.getDatabase();
    process.env.DB_USER = container.getUsername();
    process.env.DB_PASSWORD = container.getPassword();

    // Reconecta o sequelize no container isolado deste teste
    const connectionManager = sequelize.connectionManager as unknown as {
      config: Record<string, unknown>;
      pool: { drain: () => Promise<void> } | null;
      initPools: () => void;
    };
    if (connectionManager.pool) {
      await connectionManager.pool.drain();
    }
    Object.assign(connectionManager.config, {
      host: container.getHost(),
      port: container.getMappedPort(5432),
      database: container.getDatabase(),
      username: container.getUsername(),
      password: container.getPassword(),
    });
    connectionManager.initPools();
    await sequelize.sync({ force: true });
  }, 60_000);

  afterAll(async () => {
    await sequelize.close();
    await container.stop();
  });

  beforeEach(async () => {
    await AuditLog.destroy({ where: {}, truncate: true, cascade: true });
    await Patrimonio.destroy({ where: {}, force: true });
    await Ambiente.destroy({ where: {}, force: true });
    await Responsavel.destroy({ where: {}, force: true });
    await EstadoItem.destroy({ where: {}, force: true });
    await TipoMaterial.destroy({ where: {}, force: true });
  });

  it("deve registrar automaticamente quando um TipoMaterial é criado", async () => {
    const res = await request(app)
      .post("/api/tipo-material")
      .send({ nome: "Audit-Create-Test" });

    expect(res.status).toBe(201);
    const createdId = res.body.id;

    const logs = await AuditLog.findAll({
      where: { tabela: "tipo_material", registro_id: createdId },
    });

    expect(logs.length).toBe(1);
    const log = logs[0];
    expect(log.acao).toBe("CREATE");
    expect(log.dados_anteriores).toBeNull();
    expect(log.dados_novos).toBeDefined();
    expect(log.dados_novos?.nome).toBe("Audit-Create-Test");
    expect(log.usuario).toBe("Teste gestor (#1)");
  });

  it("deve registrar automaticamente quando um TipoMaterial é atualizado", async () => {
    const item = await TipoMaterial.create({ nome: "Original Name" });

    await request(app)
      .put(`/api/tipo-material/${item.id}`)
      .send({ nome: "Updated Name" });

    const logs = await AuditLog.findAll({
      where: { tabela: "tipo_material", registro_id: item.id },
      order: [["created_at", "ASC"]],
    });

    expect(logs.length).toBe(2);
    expect(logs[0].acao).toBe("CREATE");

    const updateLog = logs[1];
    expect(updateLog.acao).toBe("UPDATE");
    expect(updateLog.dados_anteriores?.nome).toBe("Original Name");
    expect(updateLog.dados_novos?.nome).toBe("Updated Name");
    expect(updateLog.campos_alterados).toContain("nome");
  });

  it("deve registrar automaticamente quando um TipoMaterial é excluído", async () => {
    const item = await TipoMaterial.create({ nome: "To Be Deleted" });

    await request(app).delete(`/api/tipo-material/${item.id}`);

    const logs = await AuditLog.findAll({
      where: { tabela: "tipo_material", registro_id: item.id },
      order: [["created_at", "ASC"]],
    });

    expect(logs.length).toBe(2);
    expect(logs[0].acao).toBe("CREATE");

    const deleteLog = logs[1];
    expect(deleteLog.acao).toBe("DELETE");
    expect(deleteLog.dados_anteriores?.nome).toBe("To Be Deleted");
    expect(deleteLog.dados_novos).toBeNull();
  });

  it("deve listar todos os logs paginados via GET /api/audit-log", async () => {
    await TipoMaterial.create({ nome: "Item 1" });
    await TipoMaterial.create({ nome: "Item 2" });
    await TipoMaterial.create({ nome: "Item 3" });

    const res = await request(app)
      .get("/api/audit-log")
      .query({ page: 1, limit: 2 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("total", 3);
    expect(res.body).toHaveProperty("pages", 2);
    expect(res.body).toHaveProperty("currentPage", 1);
    expect(res.body).toHaveProperty("limit", 2);
    expect(res.body.data.length).toBe(2);
  });

  it("deve retornar o histórico de um item específico via GET /api/audit-log/:tabela/:registroId", async () => {
    const item = await TipoMaterial.create({ nome: "Item History" });
    await item.update({ nome: "Item History v2" });

    const res = await request(app).get(
      `/api/audit-log/tipo_material/${item.id}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0].acao).toBe("UPDATE");
    expect(res.body[1].acao).toBe("CREATE");
  });

  it("deve retornar historico de mudancas de estado do patrimonio", async () => {
    const tipo = await TipoMaterial.create({ nome: "Notebook" });
    const estadoAtivo = await EstadoItem.create({ nome: "Ativo" });
    const estadoAvariado = await EstadoItem.create({ nome: "Avariado" });
    const estadoManutencao = await EstadoItem.create({ nome: "Manutencao" });
    const responsavel = await Responsavel.create({
      nome: "Responsavel",
      email: "responsavel@example.com",
    });
    const ambiente = await Ambiente.create({
      nome: "Lab 1",
      responsavel_id: responsavel.id,
    });
    const patrimonio = await Patrimonio.create({
      numero_patrimonio: "PAT-HIST-001",
      descricao: "Notebook Dell Latitude",
      valor: 3500,
      tipo_material_id: tipo.id,
      estado_item_id: estadoAtivo.id,
      ambiente_id: ambiente.id,
      responsavel_id: responsavel.id,
    });
    await AuditLog.destroy({ where: {}, truncate: true, cascade: true });

    await request(app)
      .put(`/api/patrimonios/${patrimonio.id}`)
      .send({ estado_item_id: estadoAvariado.id });
    await request(app)
      .put(`/api/patrimonios/${patrimonio.id}`)
      .send({ estado_item_id: estadoManutencao.id });

    const res = await request(app).get(
      `/api/patrimonios/${patrimonio.id}/historico-estado`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        estado_anterior_id: estadoAtivo.id,
        estado_novo_id: estadoAvariado.id,
        data: expect.any(String),
      },
      {
        estado_anterior_id: estadoAvariado.id,
        estado_novo_id: estadoManutencao.id,
        data: expect.any(String),
      },
    ]);
  });

  it.each(['responsavel', 'conferente'] as const)('%s consulta atividades operacionais sem dados administrativos', async (papel) => {
    await AuditLog.bulkCreate([
      { tabela: 'solicitacao', registro_id: 1, acao: 'CREATE', organizacao_id: 1, dados_novos: { tipo: 'manutencao' } },
      { tabela: 'usuario', registro_id: 1, acao: 'UPDATE', organizacao_id: 1, dados_novos: { senha_hash: 'segredo' } },
      { tabela: 'notificacao', registro_id: 1, acao: 'UPDATE', organizacao_id: 1 },
    ]);
    const res = await rawRequest(app).get('/api/audit-log').set(bearerToken(papel));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data.map((log: AuditLog) => log.tabela)).toEqual(['solicitacao']);
    expect((await rawRequest(app).get('/api/audit-log/usuario/1').set(bearerToken(papel))).status).toBe(403);
  });

  it('filtra entidade, registro, ação, autor, texto e período com total isolado por organização', async () => {
    await AuditLog.bulkCreate([
      { tabela: 'solicitacao', registro_id: 7, acao: 'UPDATE', usuario: 'Ana', organizacao_id: 1, dados_novos: { descricao: 'Tela quebrada' }, created_at: new Date('2026-10-20T12:00:00Z') },
      { tabela: 'solicitacao', registro_id: 7, acao: 'UPDATE', usuario: 'Ana', organizacao_id: 2, dados_novos: { descricao: 'Tela quebrada' }, created_at: new Date('2026-10-20T12:00:00Z') },
      { tabela: 'patrimonio', registro_id: 7, acao: 'CREATE', organizacao_id: 1 },
    ]);
    const res = await request(app).get('/api/audit-log').query({ tabela: 'solicitacao', registro_id: 7, acao: 'UPDATE', usuario: 'Ana', busca: 'Tela', de: '2026-10-20', ate: '2026-10-20' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data).toHaveLength(1);
  });

  it.each([{ page: -1 }, { limit: 0 }, { registro_id: 'x' }, { de: '2026-02-31' }, { acao: 'DROP' }])('rejeita filtro inválido: %j', async (query) => {
    expect((await request(app).get('/api/audit-log').query(query)).status).toBe(400);
  });

  it('remove credenciais dos logs legados antes de responder', async () => {
    await AuditLog.create({ tabela: 'usuario', registro_id: 1, acao: 'UPDATE', organizacao_id: 1, dados_novos: { nome: 'Ana', senha_hash: 'segredo', token: 'jwt' } });
    const res = await request(app).get('/api/audit-log');
    expect(JSON.stringify(res.body)).not.toMatch(/segredo|jwt/);
  });

  it('não perde o evento quando o autor tem um nome de 100 caracteres', async () => {
    const item = await runWithContext({ usuarioId: 123, usuarioNome: 'N'.repeat(100), papel: 'gestor', organizacaoId: 1 },
      () => TipoMaterial.create({ nome: 'Autor de nome longo' }));
    const evento = await AuditLog.findOne({ where: { tabela: 'tipo_material', registro_id: item.id } });
    expect(evento).not.toBeNull();
    expect(evento!.usuario).toMatch(/\(#123\)$/);
  });

  it('histórico de um bem reúne solicitações e conferências relacionadas sem misturar outros bens', async () => {
    await AuditLog.bulkCreate([
      { tabela: 'patrimonio', registro_id: 7, acao: 'CREATE', organizacao_id: 1, dados_novos: { numero_patrimonio: 'PAT-7' } },
      { tabela: 'solicitacao', registro_id: 8, acao: 'UPDATE', organizacao_id: 1, dados_novos: { patrimonio_id: 7, status: 'concluida' }, dados_anteriores: { patrimonio_id: 7, status: 'aberta' }, campos_alterados: ['status'] },
      { tabela: 'conferencia', registro_id: 9, acao: 'CREATE', organizacao_id: 1, dados_novos: { patrimonio_id: 7 } },
      { tabela: 'solicitacao', registro_id: 10, acao: 'CREATE', organizacao_id: 1, dados_novos: { patrimonio_id: 99 } },
    ]);
    const res = await rawRequest(app).get('/api/audit-log').query({ tabela: 'patrimonio', registro_id: 7, relacionados: 'true' }).set(bearerToken('conferente'));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.data.find((log: AuditLog) => log.tabela === 'solicitacao').alteracoes).toEqual([{ campo: 'status', anterior: 'aberta', novo: 'concluida' }]);
  });
});
