import type { Express } from 'express';
import type { Sequelize } from 'sequelize';
import { QueryTypes } from 'sequelize';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { rawRequest } from './helpers/request';

let app: Express;
let sequelize: Sequelize;
let container: StartedPostgreSqlContainer;
let tokenGestor = '';

const CABECALHO = 'numero_patrimonio;descricao;valor;tipo_material;estado_item;ambiente;responsavel;fornecedor;data_aquisicao;vida_util_anos;valor_residual';
function csv(linhas: string[]): string {
  return `${CABECALHO}\n${linhas.join('\n')}`;
}
const LINHA_OK = 'IMP-001;Notebook importado;3500,00;Equipamento de Informática;Em condições;Biblioteca;Ana Beatriz Souza;TechSupply Informática;2024-05-10;5;300,00';
const LINHA_OK_2 = 'IMP-002;Projetor importado;2000;Equipamento Audiovisual;Em manutenção;Auditório;Carlos Eduardo Lima;;;;';

function enviar(rota: string, conteudo: string, auth: Record<string, string>) {
  return rawRequest(app).post(`/api/patrimonios/importacao/${rota}`)
    .set(auth)
    .attach('arquivo', Buffer.from(conteudo, 'utf8'), { filename: 'bens.csv', contentType: 'text/csv' });
}

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17')
    .withDatabase('import_isolado').withUsername('teste').withPassword('descartavel').start();
  Object.assign(process.env, {
    DB_HOST: container.getHost(), DB_PORT: String(container.getMappedPort(5432)),
    DB_NAME: container.getDatabase(), DB_USER: container.getUsername(), DB_PASSWORD: container.getPassword(),
  });
  ({ sequelize } = await import('../src/database'));
  await (await import('../src/database/migrate')).migrate();
  app = (await import('../src/app')).default;

  const login = await rawRequest(app).post('/api/auth/login')
    .send({ email: 'gestor@zelium.com', senha: 'Zelium@2026' });
  expect(login.status).toBe(200);
  tokenGestor = login.body.token;
}, 60_000);

afterAll(async () => {
  await sequelize?.close();
  await container?.stop();
});

describe('Importação de patrimônios por CSV', () => {
  it('preview valida linhas contra o catálogo sem gravar nada', async () => {
    const res = await enviar('preview', csv([LINHA_OK, LINHA_OK_2]), { Authorization: `Bearer ${tokenGestor}` });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total_linhas: 2, validas: 2, invalidas: 0, existentes: 0 });
    expect(await sequelize.query(
      `SELECT COUNT(*)::int AS total FROM patrimonio WHERE numero_patrimonio LIKE 'IMP-%'`,
      { type: QueryTypes.SELECT },
    )).toEqual([{ total: 0 }]);
  });

  it('confirmação grava atOMICamente, com auditoria, e é idempotente na repetição', async () => {
    const primeira = await enviar('confirmar', csv([LINHA_OK, LINHA_OK_2]), { Authorization: `Bearer ${tokenGestor}` });
    expect(primeira.status).toBe(201);
    expect(primeira.body).toMatchObject({ inseridos: 2, existentes: 0, total_linhas: 2 });

    const repeticao = await enviar('confirmar', csv([LINHA_OK, LINHA_OK_2]), { Authorization: `Bearer ${tokenGestor}` });
    expect(repeticao.status).toBe(201);
    expect(repeticao.body).toMatchObject({ inseridos: 0, existentes: 2 });

    const bens = await sequelize.query<{ numero_patrimonio: string; valor: string }>(
      `SELECT numero_patrimonio, valor FROM patrimonio WHERE numero_patrimonio LIKE 'IMP-%' ORDER BY numero_patrimonio`,
      { type: QueryTypes.SELECT },
    );
    expect(bens).toEqual([
      { numero_patrimonio: 'IMP-001', valor: '3500.00' },
      { numero_patrimonio: 'IMP-002', valor: '2000.00' },
    ]);
    const auditoria = await sequelize.query<{ tabela: string; acao: string }>(
      `SELECT tabela, acao FROM audit_log WHERE tabela = 'patrimonio' AND dados_novos->>'numero_patrimonio' LIKE 'IMP-%'`,
      { type: QueryTypes.SELECT },
    );
    expect(auditoria).toHaveLength(2);
    expect(JSON.stringify(auditoria)).toMatch(/CREATE/);
  });

  it('linhas inválidas abortam o lote inteiro (422, nada gravado)', async () => {
    const antes = await sequelize.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM patrimonio`, { type: QueryTypes.SELECT });
    const res = await enviar('confirmar', csv([
      LINHA_OK,
      'IMP-003;Tipo fantasma;100;Catalogo Inexistente;Em condições;Sala 1;Ana Silva;;;',
      'IMP-004;Vida inválida;100;Informática;Em condições;Sala 1;Ana Silva;;;0',
    ]), { Authorization: `Bearer ${tokenGestor}` });
    expect(res.status).toBe(422);
    expect(res.body.codigo).toBe('importacao_invalida');
    expect(res.body.importacao.erros.length).toBeGreaterThan(0);
    const depois = await sequelize.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM patrimonio`, { type: QueryTypes.SELECT });
    expect(depois).toEqual(antes);
  });

  it('número repetido dentro do arquivo recusa o lote', async () => {
    const res = await enviar('confirmar', csv(['IMP-010;Primeiro;1;Informática;Em condições;Sala 1;Ana Silva;;;',
      'IMP-010;Duplicado;2;Informática;Em condições;Sala 1;Ana Silva;;;']), { Authorization: `Bearer ${tokenGestor}` });
    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body)).toMatch(/repetida/i);
  });

  it('colunas obrigatórias ausentes e desconhecidas são recusadas com nome da coluna', async () => {
    const semColuna = await enviar('preview', 'numero;descricao\nX-1;Sem resto', { Authorization: `Bearer ${tokenGestor}` });
    expect(semColuna.status).toBe(400);
    expect(JSON.stringify(semColuna.body)).toMatch(/valor/i);
    const desconhecida = await enviar('preview',
      `${CABECALHO};coragem\nX-1;desc;1;Informática;Em condições;Sala 1;Ana Silva;;;1`, { Authorization: `Bearer ${tokenGestor}` });
    expect(desconhecida.status).toBe(400);
    expect(JSON.stringify(desconhecida.body)).toMatch(/coragem/i);
  });

  it('demais perfis são negados pelo RBAC', async () => {
    for (const email of ['responsavel@zelium.com', 'conferente@zelium.com']) {
      const login = await rawRequest(app).post('/api/auth/login').send({ email, senha: 'Zelium@2026' });
      const res = await enviar('preview', csv([LINHA_OK]), { Authorization: `Bearer ${login.body.token}` });
      expect(res.status).toBe(403);
    }
  });

  it('sem arquivo ou acima de 1000 linhas é recusado', async () => {
    expect((await rawRequest(app).post('/api/patrimonios/importacao/preview')
      .set('Authorization', `Bearer ${tokenGestor}`)).status).toBe(400);
    const muitas = Array.from({ length: 1001 }, (_, i) => `IMP-L${i};Bem;1;Informática;Em condições;Sala 1;Ana Silva;;;`);
    const res = await enviar('preview', csv(muitas), { Authorization: `Bearer ${tokenGestor}` });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/1000/i);
  });

  it('limite do trial vale por lote: aborta sem inserir parcial', async () => {
    await sequelize.query(`UPDATE organizacao SET modalidade_acesso = 'trial',
      trial_inicio = NOW(), trial_fim = NOW() + INTERVAL '30 days',
      limite_patrimonios = 11, limite_usuarios = 5 WHERE id = 1`);
    try {
      // Seed já tem 10 bens + 2 IMP dos testes anteriores = 12 usados;
      // limite 11: DOIS novos estouram e abortam o lote sem inserir parcial.
      const res = await enviar('confirmar', csv([
        'IMP-100;Bem além do limite;100;Equipamento de Informática;Em condições;Biblioteca;Ana Beatriz Souza;;;',
        'IMP-101;Outro além do limite;100;Equipamento de Informática;Em condições;Biblioteca;Ana Beatriz Souza;;;',
      ]), { Authorization: `Bearer ${tokenGestor}` });
      expect(res.status).toBe(403);
      expect(res.body.codigo).toBe('limite_trial');
      expect(await sequelize.query<{ total: number }>(
        `SELECT COUNT(*)::int AS total FROM patrimonio WHERE numero_patrimonio LIKE 'IMP-%'`, { type: QueryTypes.SELECT }))
        .toEqual([{ total: 2 }]); // apenas os do teste anterior; nada novo gravado
    } finally {
      await sequelize.query(`UPDATE organizacao SET modalidade_acesso = 'legado',
        trial_inicio = NULL, trial_fim = NULL, limite_patrimonios = NULL, limite_usuarios = NULL WHERE id = 1`);
    }
  });

  it('arquivos acima de 2 MB são rejeitados antes da análise', async () => {
    const gigante = 'x'.repeat(2 * 1024 * 1024 + 1);
    const res = await enviar('preview', `${CABECALHO}\n${gigante}`, { Authorization: `Bearer ${tokenGestor}` });
    expect([413, 400]).toContain(res.status);
  });
});
