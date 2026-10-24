import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { Sequelize } from 'sequelize';
import { runWithContext } from '../src/context/requestContext';

let container: StartedPostgreSqlContainer;
let sequelize: Sequelize;
let service: import('../src/services/PatrimonioFotoService').PatrimonioFotoService;
let fotos: typeof import('../src/models/PatrimonioFoto').PatrimonioFoto;
let audit: typeof import('../src/models/AuditLog').AuditLog;
const ctx = { usuarioId: 1, usuarioNome: 'Ana', papel: 'gestor', organizacaoId: 1 };

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17').start();
  Object.assign(process.env, { DB_HOST: container.getHost(), DB_PORT: String(container.getMappedPort(5432)),
    DB_NAME: container.getDatabase(), DB_USER: container.getUsername(), DB_PASSWORD: container.getPassword() });
  sequelize = (await import('../src/database/connection')).sequelize;
  await import('../src/database/index');
  await sequelize.sync({ force: true });
  const models = sequelize.models;
  await models.Organizacao.create({ id: 1, nome: 'Fotos', slug: 'fotos' });
  await models.Usuario.create({ id: 1, nome: 'Ana', email: 'fotos@e2e.local', senha_hash: 'x', papel: 'gestor', organizacao_id: 1 });
  await models.TipoMaterial.create({ id: 1, nome: 'Tipo', organizacao_id: 1 });
  await models.EstadoItem.create({ id: 1, nome: 'Estado', organizacao_id: 1 });
  await models.Responsavel.create({ id: 1, nome: 'Responsável', email: 'r@e2e.local', organizacao_id: 1 });
  await models.Ambiente.create({ id: 1, nome: 'Sala', responsavel_id: 1, organizacao_id: 1 });
  await models.Patrimonio.create({ id: 1, numero_patrimonio: 'FOTO-1', descricao: 'Bem', valor: 1,
    tipo_material_id: 1, estado_item_id: 1, ambiente_id: 1, responsavel_id: 1, organizacao_id: 1 });
  fotos = (await import('../src/models/PatrimonioFoto')).PatrimonioFoto;
  audit = (await import('../src/models/AuditLog')).AuditLog;
  service = new (await import('../src/services/PatrimonioFotoService')).PatrimonioFotoService();
}, 60_000);

afterAll(async () => { await sequelize?.close(); await container?.stop(); });
beforeEach(async () => { await fotos.destroy({ where: {}, force: true, hooks: false }); await audit.destroy({ where: {}, force: true, hooks: false }); });
const input = (name: string) => ({ url: `/uploads/patrimonios/${name}.png`, nome_arquivo: `${name}.png`, mime_type: 'image/png', tamanho_bytes: 10 });

it('uploads concorrentes elegem exatamente uma foto principal', async () => {
  await runWithContext(ctx, () => Promise.all(Array.from({ length: 5 }, (_, i) => service.create(1, input(`foto-${i}`)))));
  expect(await fotos.count()).toBe(5);
  expect(await fotos.count({ where: { principal: true } })).toBe(1);
});

it('troca de principal audita a foto promovida e a anterior', async () => {
  await runWithContext(ctx, async () => {
    const primeira = await service.create(1, input('primeira'));
    const segunda = await service.create(1, input('segunda'));
    await service.setPrincipal(1, segunda!.id);
    const eventos = await audit.findAll({ where: { tabela: 'patrimonio_fotos', acao: 'UPDATE' } });
    expect(eventos.map(evento => evento.registro_id)).toEqual(expect.arrayContaining([primeira!.id, segunda!.id]));
    expect(await fotos.count({ where: { principal: true } })).toBe(1);
  });
});

it('falha no evento da troca de principal desfaz toda a alteração', async () => {
  await runWithContext(ctx, async () => {
    const primeira = await service.create(1, input('primeira'));
    const segunda = await service.create(1, input('segunda'));
    const spy = jest.spyOn(audit, 'create').mockRejectedValueOnce(new Error('Auditoria indisponível'));
    try {
      await expect(service.setPrincipal(1, segunda!.id)).rejects.toThrow('Auditoria indisponível');
    } finally { spy.mockRestore(); }
    expect((await fotos.findByPk(primeira!.id))!.principal).toBe(true);
    expect((await fotos.findByPk(segunda!.id))!.principal).toBe(false);
  });
});

it('trocas concorrentes e remoção preservam somente uma principal', async () => {
  await runWithContext(ctx, async () => {
    const primeira = await service.create(1, input('primeira'));
    const segunda = await service.create(1, input('segunda'));
    const terceira = await service.create(1, input('terceira'));
    await Promise.all([service.setPrincipal(1, segunda!.id), service.setPrincipal(1, terceira!.id), service.delete(1, primeira!.id)]);
    expect(await fotos.count()).toBe(2);
    expect(await fotos.count({ where: { principal: true } })).toBe(1);
  });
});
