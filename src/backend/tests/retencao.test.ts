import type { Sequelize } from 'sequelize';
import { QueryTypes } from 'sequelize';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer;
let sequelize: Sequelize;
let executarRetencao: typeof import('../src/database/retencao').executarRetencao;

async function inserirAntigasENovas() {
  // Notificações: uma de 200 dias (fora da retenção padrão) e uma recente.
  await sequelize.query(`
    INSERT INTO notificacao (organizacao_id, tipo, assunto, corpo, destinatarios, status, created_at)
    SELECT 1, 'teste', 'antiga', 'x', '[]', 'enviada', NOW() - INTERVAL '200 days'
    WHERE EXISTS (SELECT 1 FROM organizacao WHERE id = 1);
    INSERT INTO notificacao (organizacao_id, tipo, assunto, corpo, destinatarios, status, created_at)
    SELECT 1, 'teste', 'recente', 'x', '[]', 'enviada', NOW() - INTERVAL '10 days'
    WHERE EXISTS (SELECT 1 FROM organizacao WHERE id = 1);
  `);
  // Auditoria: uma de 400 dias e uma recente.
  await sequelize.query(`
    INSERT INTO audit_log (organizacao_id, tabela, registro_id, acao, created_at)
    SELECT 1, 'patrimonio', 1, 'CREATE', NOW() - INTERVAL '400 days'
    WHERE EXISTS (SELECT 1 FROM organizacao WHERE id = 1);
    INSERT INTO audit_log (organizacao_id, tabela, registro_id, acao, created_at)
    SELECT 1, 'patrimonio', 1, 'CREATE', NOW() - INTERVAL '30 days'
    WHERE EXISTS (SELECT 1 FROM organizacao WHERE id = 1);
  `);
}

async function pendencia(tabela: string, expirada: boolean) {
  // token_hash exige 64 hex: prefixo 1=cadastro/2=senha + marcador final.
  const hash = ((tabela === 'cadastro' ? '1' : '2').repeat(63) + (expirada ? 'e' : 'f'));
  const expira = expirada ? "NOW() - INTERVAL '1 second'" : "NOW() + INTERVAL '24 hours'";
  if (tabela === 'cadastro') {
    await sequelize.query(`
      INSERT INTO cadastro_pendente (token_hash, email, nome, organizacao_nome, expira_em)
      VALUES (:hash, :email, 'Nome', 'Org', ${expira})
      ON CONFLICT DO NOTHING`, {
      replacements: { hash, email: `c${expirada ? 'e' : 'v'}@x.test` }, logging: false,
    });
    return;
  }
  await sequelize.query(`
    INSERT INTO senha_pendente (token_hash, usuario_id, expira_em)
    VALUES (:hash, 1, ${expira})
    ON CONFLICT DO NOTHING`, { replacements: { hash }, logging: false });
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17')
    .withDatabase('retencao_isolada').withUsername('teste').withPassword('descartavel').start();
  Object.assign(process.env, {
    DB_HOST: container.getHost(), DB_PORT: String(container.getMappedPort(5432)),
    DB_NAME: container.getDatabase(), DB_USER: container.getUsername(), DB_PASSWORD: container.getPassword(),
  });
  ({ sequelize } = await import('../src/database'));
  await (await import('../src/database/migrate')).migrate();
  ({ executarRetencao } = await import('../src/database/retencao'));
}, 60_000);

afterAll(async () => {
  await sequelize?.close();
  await container?.stop();
});

beforeEach(async () => {
  await sequelize.query('TRUNCATE notificacao, audit_log, cadastro_pendente, senha_pendente');
  await sequelize.query(`
    INSERT INTO organizacao (id, nome, slug) VALUES (1, 'Org Retenção', 'org-retencao')
    ON CONFLICT (id) DO NOTHING`);
  await sequelize.query(`
    INSERT INTO usuario (nome, email, senha_hash, papel, ativo, organizacao_id)
    SELECT 'Retenção', 'retencao@test.local', senha_hash, 'gestor', TRUE, 1
    FROM usuario WHERE id = 1 AND NOT EXISTS (SELECT 1 FROM usuario WHERE email = 'retencao@test.local');
  `);
  await sequelize.query(`SELECT setval('usuario_id_seq', GREATEST((SELECT MAX(id) FROM usuario), 1))`);
});

describe('Rotina de retenção operacional', () => {
  it('purga notificações fora da retenção padrão (180 dias) e mantém recentes', async () => {
    await inserirAntigasENovas();
    const resultado = await executarRetencao();
    expect(resultado.notificacoes).toBe(1);
    const assuntos = await sequelize.query<{ assunto: string }>(
      'SELECT assunto FROM notificacao ORDER BY assunto', { type: QueryTypes.SELECT });
    expect(assuntos).toEqual([{ assunto: 'recente' }]);
  });

  it('auditoria só é purga com configuração explícita (padrão: manter tudo)', async () => {
    await inserirAntigasENovas();
    const semConfigurar = await executarRetencao();
    expect(semConfigurar.auditoria).toBe(0);
    const comConfigurar = await executarRetencao({ auditoriaDias: 365 });
    expect(comConfigurar.auditoria).toBe(1);
    expect(await sequelize.query<{ total: number }>(
      'SELECT COUNT(*)::int AS total FROM audit_log', { type: QueryTypes.SELECT })).toEqual([{ total: 1 }]);
  });

  it('limpa pendências expiradas de cadastro e senha, preservando válidas', async () => {
    await pendencia('cadastro', true);
    await pendencia('cadastro', false);
    await pendencia('senha', true);
    await pendencia('senha', false);
    const resultado = await executarRetencao();
    console.log("RETENCAO>>>", JSON.stringify(resultado));
    expect(resultado.pendencias).toBe(2);
    const restantes = await sequelize.query<{ tabela: string }>(`
      SELECT 'cadastro' AS tabela FROM cadastro_pendente
      UNION ALL SELECT 'senha' FROM senha_pendente ORDER BY tabela`, { type: QueryTypes.SELECT });
    expect(restantes).toEqual([{ tabela: 'cadastro' }, { tabela: 'senha' }]);
  });

  it('0 significa manter para sempre (não apagar tudo)', async () => {
    await inserirAntigasENovas();
    const resultado = await executarRetencao({ notificacaoDias: 0, auditoriaDias: 0 });
    expect(resultado.notificacoes).toBe(0);
    expect(resultado.auditoria).toBe(0);
    expect(await sequelize.query<{ total: number }>(
      'SELECT COUNT(*)::int AS total FROM notificacao', { type: QueryTypes.SELECT })).toEqual([{ total: 2 }]);
  });
});
