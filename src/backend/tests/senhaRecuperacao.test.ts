import type { Express } from 'express';
import type { Sequelize } from 'sequelize';
import { QueryTypes } from 'sequelize';
import { createHash } from 'crypto';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { EmailService } from '../src/services/EmailService';
import { smtpConfigurado } from '../src/config/mail';
import { rawRequest } from './helpers/request';

jest.mock('../src/config/mail', () => ({ mailConfig: {}, smtpConfigurado: jest.fn(() => true) }));

let app: Express;
let sequelize: Sequelize;
let container: StartedPostgreSqlContainer;
let envio: jest.SpyInstance<ReturnType<EmailService['enviar']>, Parameters<EmailService['enviar']>>;
let ip = 0;
const URL_RECUPERACAO = 'https://app.example.test/recuperar-senha/redefinir';

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17')
    .withDatabase('senha_isolado').withUsername('teste').withPassword('descartavel').start();
  Object.assign(process.env, {
    DB_HOST: container.getHost(), DB_PORT: String(container.getMappedPort(5432)),
    DB_NAME: container.getDatabase(), DB_USER: container.getUsername(), DB_PASSWORD: container.getPassword(),
  });
  ({ sequelize } = await import('../src/database'));
  await (await import('../src/database/migrate')).migrate();
  await sequelize.query(`
    INSERT INTO usuario (nome, email, senha_hash, papel, ativo, organizacao_id)
    SELECT 'Inativo', 'inativo@zelium.com', senha_hash, 'conferente', FALSE, 1
    FROM usuario WHERE email = 'gestor@zelium.com'
  `);
  app = (await import('../src/app')).default;
}, 60_000);

beforeEach(async () => {
  process.env.RECUPERACAO_SENHA_ENABLED = 'true';
  process.env.RECUPERACAO_SENHA_URL = URL_RECUPERACAO;
  jest.mocked(smtpConfigurado).mockReturnValue(true);
  envio = jest.spyOn(EmailService.prototype, 'enviar').mockResolvedValue({ status: 'enviada' });
  await sequelize.query('DELETE FROM senha_pendente');
  ip += 1;
});

afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.RECUPERACAO_SENHA_ENABLED;
  delete process.env.RECUPERACAO_SENHA_URL;
});
afterAll(async () => { await sequelize?.close(); await container?.stop(); });

function solicitar(body: object | null = { email: 'gestor@zelium.com' }) {
  return rawRequest(app).post('/api/auth/senha/recuperar')
    .set('X-Forwarded-For', `192.0.2.${ip}`).send(body ?? {});
}
async function pendentes() {
  return sequelize.query('SELECT * FROM senha_pendente', { type: QueryTypes.SELECT });
}

describe('Solicitação de recuperação de senha', () => {
  it('fica desabilitada por padrão (404), sem gravar ou enviar', async () => {
    delete process.env.RECUPERACAO_SENHA_ENABLED;
    expect((await solicitar()).status).toBe(404);
    expect(await pendentes()).toEqual([]);
    expect(envio).not.toHaveBeenCalled();
  });

  it('reserva pendência só do titular, guarda só hash e envia link no fragmento', async () => {
    const res = await solicitar({ email: '  GESTOR@zelium.com ' });
    expect(res.status).toBe(202);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.message).toMatch(/receberá um email|recebera um email/i);
    const payload = envio.mock.calls[0][0];
    expect(payload.para).toEqual(['gestor@zelium.com']);
    expect(envio.mock.calls[0][1]).toEqual({ privado: true });
    const token = payload.corpoTexto.match(/#token=([a-f0-9]{64})/)![1];
    const rows = await pendentes();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      token_hash: createHash('sha256').update(token).digest('hex'),
      usuario_id: 1,
    });
    expect(JSON.stringify(rows)).not.toContain(token);
    expect(await sequelize.query('SELECT * FROM notificacao', { type: QueryTypes.SELECT })).toEqual([]);
  });

  it('email desconhecido, inativo ou repetido tem a mesma resposta e não duplica pendência', async () => {
    const primeira = await solicitar();
    const antes = await pendentes();
    for (const email of ['desconhecido@zelium.com', 'inativo@zelium.com']) {
      const res = await solicitar({ email });
      expect(res.status).toBe(202);
      expect(res.body).toEqual(primeira.body);
    }
    expect((await solicitar()).body).toEqual(primeira.body);
    expect(await pendentes()).toEqual(antes);
    expect(envio).toHaveBeenCalledTimes(1);
  });

  it.each([null, {}, { email: '' }, { email: 'semarroba' }, { email: 42 },
    { email: 'gestor@zelium.com', extra: 1 }])
  ('recusa formato inválido sem enviar: %p', async body => {
    expect((await solicitar(body)).status).toBe(400);
    expect(envio).not.toHaveBeenCalled();
  });

  it('falha de envio mantém resposta genérica e invalida a pendência', async () => {
    envio.mockResolvedValueOnce({ status: 'falha', erro: 'x' });
    expect((await solicitar()).status).toBe(202);
    expect(await pendentes()).toEqual([]);
    expect((await solicitar()).body).toMatchObject({ message: expect.any(String) });
    expect(await pendentes()).toHaveLength(1);
  });

  it('falha fechado sem SMTP ou com URL insegura', async () => {
    jest.mocked(smtpConfigurado).mockReturnValue(false);
    expect((await solicitar()).status).toBe(503);
    process.env.RECUPERACAO_SENHA_URL = 'http://atacante.test/redefinir';
    jest.mocked(smtpConfigurado).mockReturnValue(true);
    expect((await solicitar()).status).toBe(503);
    expect(await pendentes()).toEqual([]);
    expect(envio).not.toHaveBeenCalled();
  });

  it('elimina pendências expiradas e permite novo pedido', async () => {
    await solicitar();
    await sequelize.query(`UPDATE senha_pendente SET expira_em = NOW() - INTERVAL '1 second'`);
    expect((await solicitar()).status).toBe(202);
    expect(await pendentes()).toHaveLength(1);
    expect(envio).toHaveBeenCalledTimes(2);
  });
});

const SENHA_NOVA = 'SenhaNovaForte@99';
function redefinir(token: string, senha: string = SENHA_NOVA) {
  return rawRequest(app).post('/api/auth/senha/redefinir')
    .set('X-Forwarded-For', `192.0.2.${ip}`).send({ token, senha });
}
async function novoPedido(email = 'gestor@zelium.com'): Promise<string> {
  expect((await solicitar({ email })).status).toBe(202);
  const payload = envio.mock.calls[envio.mock.calls.length - 1][0];
  return payload.corpoTexto.match(/#token=([a-f0-9]{64})/)![1];
}
async function login(email: string, senha: string) {
  return rawRequest(app).post('/api/auth/login').send({ email, senha });
}

describe('Redefinição por token', () => {
  it('redefine a senha e revoga as sessões emitidas antes', async () => {
    const sessaoAntiga = await login('gestor@zelium.com', 'Zelium@2026');
    expect(sessaoAntiga.status).toBe(200);
    const token = await novoPedido();

    const res = await redefinir(token);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/faca login/i);

    expect((await login('gestor@zelium.com', 'Zelium@2026')).status).toBe(401);
    const nova = await login('gestor@zelium.com', SENHA_NOVA);
    expect(nova.status).toBe(200);
    // Sessão emitida antes da redefinição morre (sessao_version subiu)
    const me = await rawRequest(app).get('/api/auth/me')
      .set('Authorization', `Bearer ${sessaoAntiga.body.token}`);
    expect(me.status).toBe(401);
    expect(await pendentes()).toEqual([]);
  });

  it('replay, expiração e token desconhecido retornam o mesmo 400', async () => {
    const token = await novoPedido();
    expect((await redefinir(token)).status).toBe(200);
    expect((await redefinir(token)).status).toBe(400);
    expect((await redefinir('0'.repeat(64))).status).toBe(400);
    const tokenExpirado = await novoPedido();
    await sequelize.query(`UPDATE senha_pendente SET expira_em = NOW() - INTERVAL '1 second'`);
    expect((await redefinir(tokenExpirado)).status).toBe(400);
    expect(await pendentes()).toEqual([]);
  });

  it('redefinições concorrentes criam uma senha só e consomem a pendência', async () => {
    const token = await novoPedido();
    const respostas = await Promise.all([redefinir(token), redefinir(token)]);
    expect(respostas.map(r => r.status).sort()).toEqual([200, 400]);
    expect(await login('gestor@zelium.com', SENHA_NOVA)).toMatchObject({ status: 200 });
    expect(await pendentes()).toEqual([]);
  });

  it.each(['curta123', 'á'.repeat(37), ' '.repeat(12), null])
  ('senha inválida é recusada sem consumir a pendência: %p', async senha => {
    const token = await novoPedido();
    const res = await rawRequest(app).post('/api/auth/senha/redefinir')
      .set('X-Forwarded-For', `192.0.2.${ip}`).send({ token, senha });
    expect(res.status).toBe(400);
    expect(await pendentes()).toHaveLength(1);
  });

  it('não aceita campos extras na redefinição', async () => {
    const token = await novoPedido();
    const res = await rawRequest(app).post('/api/auth/senha/redefinir')
      .set('X-Forwarded-For', `192.0.2.${ip}`).send({ token, senha: SENHA_NOVA, email: 'x@x.test' });
    expect(res.status).toBe(400);
    expect(await pendentes()).toHaveLength(1);
  });

  it('conta desativada depois do pedido não é reativada pelo link', async () => {
    const token = await novoPedido('responsavel@zelium.com');
    await sequelize.query(`UPDATE usuario SET ativo = FALSE WHERE email = 'responsavel@zelium.com'`);
    const res = await redefinir(token);
    expect(res.status).toBe(400);
    const [usuario] = await sequelize.query<{ ativo: boolean; senha_hash: string }>(
      'SELECT ativo, senha_hash FROM usuario WHERE email = \'responsavel@zelium.com\'', { type: QueryTypes.SELECT });
    expect(usuario.ativo).toBe(false);
    expect(await pendentes()).toEqual([]);
    // Reativa para o estado do arquivo não vazar entre testes
    await sequelize.query(`UPDATE usuario SET ativo = TRUE WHERE email = 'responsavel@zelium.com'`);
  });

  it('bloqueia a 11ª tentativa por IP', async () => {
    for (let i = 0; i < 10; i += 1) expect((await redefinir('0'.repeat(64))).status).toBe(400);
    const bloqueado = await redefinir('0'.repeat(64));
    expect(bloqueado.status).toBe(429);
    expect(Number(bloqueado.headers['retry-after'])).toBeGreaterThan(0);
  });
});

describe('Troca da própria senha (autenticado)', () => {
  it('exige autenticação', async () => {
    expect((await rawRequest(app).post('/api/usuarios/senha').send({})).status).toBe(401);
  });

  it('troca com senha atual correta e revoga as sessões antigas', async () => {
    const sessao = await login('conferente@zelium.com', 'Zelium@2026');
    expect(sessao.status).toBe(200);
    const res = await rawRequest(app).post('/api/usuarios/senha')
      .set('Authorization', `Bearer ${sessao.body.token}`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ senha_atual: 'Zelium@2026', senha: SENHA_NOVA });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/faca login/i);
    expect((await rawRequest(app).get('/api/auth/me')
      .set('Authorization', `Bearer ${sessao.body.token}`)).status).toBe(401);
    expect((await login('conferente@zelium.com', 'Zelium@2026')).status).toBe(401);
    expect((await login('conferente@zelium.com', SENHA_NOVA)).status).toBe(200);
  });

  it('troca de senha invalida o link de recuperação emitido antes', async () => {
    expect((await solicitar({ email: 'responsavel@zelium.com' })).status).toBe(202);
    expect(await pendentes()).toHaveLength(1);
    const sessao = await login('responsavel@zelium.com', 'Zelium@2026');
    const res = await rawRequest(app).post('/api/usuarios/senha')
      .set('Authorization', `Bearer ${sessao.body.token}`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ senha_atual: 'Zelium@2026', senha: SENHA_NOVA });
    expect(res.status).toBe(200);
    expect(await pendentes()).toEqual([]);
  });

  it('redefinir consome também pendências paralelas do mesmo usuário', async () => {
    const token = await novoPedido();
    await sequelize.query(`
      INSERT INTO senha_pendente (token_hash, usuario_id, expira_em)
      SELECT '${'c'.repeat(64)}', usuario_id, NOW() + INTERVAL '1 hour' FROM senha_pendente LIMIT 1`);
    expect(await pendentes()).toHaveLength(2);
    expect((await redefinir(token)).status).toBe(200);
    expect(await pendentes()).toEqual([]);
  });

  it('senha atual errada recusa sem alterar', async () => {
    const sessao = await login('conferente@zelium.com', SENHA_NOVA);
    const res = await rawRequest(app).post('/api/usuarios/senha')
      .set('Authorization', `Bearer ${sessao.body.token}`)
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ senha_atual: 'errada', senha: 'OutraSenhaForte@77' });
    expect(res.status).toBe(400);
    expect((await login('conferente@zelium.com', SENHA_NOVA)).status).toBe(200);
    expect((await login('conferente@zelium.com', 'OutraSenhaForte@77')).status).toBe(401);
  });

  it('corpo estrito: campo extra ou senha curta é recusado sem consultar hash', async () => {
    const sessao = await login('conferente@zelium.com', SENHA_NOVA);
    for (const body of [
      { senha_atual: SENHA_NOVA, senha: 'OutraSenhaForte@77', papel: 'gestor' },
      { senha_atual: SENHA_NOVA, senha: 'curta' },
      { senha: 'OutraSenhaForte@77' },
    ]) {
      expect((await rawRequest(app).post('/api/usuarios/senha')
        .set('Authorization', `Bearer ${sessao.body.token}`)
        .set('X-Requested-With', 'XMLHttpRequest').send(body)).status).toBe(400);
    }
    expect((await login('conferente@zelium.com', SENHA_NOVA)).status).toBe(200);
  });
});
