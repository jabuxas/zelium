import type { Express } from 'express';
import { QueryTypes, Sequelize } from 'sequelize';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { createHash } from 'crypto';
import { EmailService } from '../src/services/EmailService';
import { smtpConfigurado } from '../src/config/mail';
import { rawRequest } from './helpers/request';

jest.mock('../src/config/mail', () => ({ mailConfig: {}, smtpConfigurado: jest.fn(() => true) }));

let app: Express;
let sequelize: Sequelize;
let container: StartedPostgreSqlContainer;
let envio: jest.SpyInstance<ReturnType<EmailService['enviar']>, Parameters<EmailService['enviar']>>;
let ip = 0;
const entrada = { nome: 'Ana Silva', email: 'ana@empresa.test', organizacaoNome: 'Empresa da Ana' };
const URL_CONFIRMACAO = 'https://app.example.test/cadastro/confirmar';

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17')
    .withDatabase('cadastro_isolado').withUsername('teste').withPassword('descartavel').start();
  Object.assign(process.env, {
    DB_HOST: container.getHost(), DB_PORT: String(container.getMappedPort(5432)),
    DB_NAME: container.getDatabase(), DB_USER: container.getUsername(), DB_PASSWORD: container.getPassword(),
  });
  ({ sequelize } = await import('../src/database'));
  // Usa o bootstrap SQL real (timestamps têm defaults que sync não reproduz).
  await (await import('../src/database/migrate')).migrate();
  app = (await import('../src/app')).default;
}, 60_000);

beforeEach(async () => {
  process.env.SELF_SERVICE_ENABLED = 'true';
  process.env.SELF_SERVICE_CONFIRMATION_URL = URL_CONFIRMACAO;
  jest.mocked(smtpConfigurado).mockReturnValue(true);
  envio = jest.spyOn(EmailService.prototype, 'enviar').mockResolvedValue({ status: 'enviada' });
  await sequelize.query('DELETE FROM cadastro_pendente');
  ip += 1;
});

afterEach(() => {
  jest.restoreAllMocks();
  delete process.env.SELF_SERVICE_ENABLED;
  delete process.env.SELF_SERVICE_CONFIRMATION_URL;
});
afterAll(async () => { await sequelize?.close(); await container?.stop(); });

function solicitar(body: object | null = entrada) {
  return rawRequest(app).post('/api/auth/cadastros').set('X-Forwarded-For', `192.0.2.${ip}`).send(body ?? {});
}
async function pendentes() {
  return sequelize.query('SELECT * FROM cadastro_pendente', { type: QueryTypes.SELECT });
}

describe('Solicitação de cadastro', () => {
  it('fica desabilitada por padrão, sem gravar ou enviar', async () => {
    delete process.env.SELF_SERVICE_ENABLED;
    expect((await solicitar()).status).toBe(404);
    expect(await pendentes()).toEqual([]);
    expect(envio).not.toHaveBeenCalled();
  });

  it('reserva só a pendência normalizada, envia exclusivamente ao titular e guarda só hash', async () => {
    const res = await solicitar({ ...entrada, email: '  ANA@empresa.test ', nome: ' Ana Silva ' });
    expect(res.status).toBe(202);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual({ message: 'Se o cadastro puder prosseguir, enviaremos um email de confirmacao.' });
    const payload = envio.mock.calls[0][0];
    expect(payload.para).toEqual(['ana@empresa.test']);
    expect(envio.mock.calls[0][1]).toEqual({ privado: true });
    const token = payload.corpoTexto.match(/#token=([a-f0-9]{64})/)![1];
    const rows = await pendentes();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ nome: 'Ana Silva', email: 'ana@empresa.test',
      token_hash: createHash('sha256').update(token).digest('hex') });
    expect(JSON.stringify(rows)).not.toContain(token);
    expect(await sequelize.query(`SELECT * FROM audit_log WHERE tabela = 'cadastro_pendente'`, { type: QueryTypes.SELECT })).toEqual([]);
    expect(await sequelize.query('SELECT * FROM notificacao', { type: QueryTypes.SELECT })).toEqual([]);
    expect(await sequelize.query(`SELECT id FROM usuario WHERE email = 'ana@empresa.test'`, { type: QueryTypes.SELECT })).toEqual([]);
  });

  it('repetição não altera dados nem token, não reenvia e tem a mesma resposta de email usado', async () => {
    const primeira = await solicitar();
    const antes = await pendentes();
    const repetida = await solicitar({ ...entrada, nome: 'Outro nome', organizacaoNome: 'Forjada' });
    const existente = await solicitar({ ...entrada, email: 'GESTOR@zelium.com' });
    expect(repetida.status).toBe(202);
    expect(existente.status).toBe(202);
    expect(repetida.body).toEqual(primeira.body);
    expect(existente.body).toEqual(primeira.body);
    expect(await pendentes()).toEqual(antes);
    expect(envio).toHaveBeenCalledTimes(1);
  });

  it.each(['papel', 'organizacaoId', 'organizacao_id', 'trial_fim', 'limite_usuarios', 'senha'])
  ('recusa campo controlado pelo cliente: %s', async campo => {
    expect((await solicitar({ ...entrada, [campo]: 'forjado' })).status).toBe(400);
    expect(envio).not.toHaveBeenCalled();
  });

  it.each([null, [], {}, { ...entrada, nome: '' }, { ...entrada, email: 'a\r\nBcc:b@host.test' },
    { ...entrada, organizacaoNome: 'x'.repeat(151) }, { ...entrada, email: 42 }])
  ('recusa formato inválido sem enviar: %p', async body => {
    expect((await solicitar(body)).status).toBe(400);
    expect(envio).not.toHaveBeenCalled();
  });

  it.each(['http://app.test/confirmar', 'https://user:pass@app.test/confirmar',
    'https://app.test/confirmar?redirecionar=outro', 'https://app.test/confirmar#fragmento', 'invalida'])
  ('falha fechado para URL de confirmação insegura: %s', async url => {
    process.env.SELF_SERVICE_CONFIRMATION_URL = url;
    expect((await solicitar()).status).toBe(503);
    expect(await pendentes()).toEqual([]);
    expect(envio).not.toHaveBeenCalled();
  });

  it('não aceita habilitação sem SMTP', async () => {
    jest.mocked(smtpConfigurado).mockReturnValue(false);
    expect((await solicitar()).status).toBe(503);
    expect(await pendentes()).toEqual([]);
  });

  it('falha de envio mantém resposta genérica e invalida a pendência para permitir nova tentativa', async () => {
    envio.mockResolvedValueOnce({ status: 'falha', erro: 'erro privado' });
    const falha = await solicitar();
    expect(falha.status).toBe(202);
    expect(await pendentes()).toEqual([]);
    expect((await solicitar()).body).toEqual(falha.body);
    expect(await pendentes()).toHaveLength(1);
  });

  it('exceção do transporte também preserva resposta genérica, sem log de conteúdo', async () => {
    envio.mockRejectedValueOnce(new Error('link-e-destinatario-privados'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await solicitar();
    expect(res.status).toBe(202);
    expect(await pendentes()).toEqual([]);
    expect(log).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).not.toContain('privados');
  });

  it('concorrência reserva só uma pendência e só um envio', async () => {
    const respostas = await Promise.all([solicitar(), solicitar()]);
    expect(respostas.map(res => res.status)).toEqual([202, 202]);
    expect(await pendentes()).toHaveLength(1);
    expect(envio).toHaveBeenCalledTimes(1);
  });

  it('ignora Host do cliente ao construir o link', async () => {
    await solicitar().set('Host', 'atacante.test');
    expect(envio.mock.calls[0][0].corpoTexto).toContain(`${URL_CONFIRMACAO}#token=`);
    expect(envio.mock.calls[0][0].corpoTexto).not.toContain('atacante');
  });

  it('conta payload inválido e bloqueia a sexta solicitação por IP', async () => {
    for (let i = 0; i < 5; i += 1) expect((await solicitar({})).status).toBe(400);
    const bloqueado = await solicitar();
    expect(bloqueado.status).toBe(429);
    expect(Number(bloqueado.headers['retry-after'])).toBeGreaterThan(0);
    expect(envio).not.toHaveBeenCalled();
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 16 * 60 * 1000);
    expect((await solicitar({})).status).toBe(400);
  });

  it('elimina pendências expiradas e permite solicitar um novo token', async () => {
    await solicitar();
    const antes = await pendentes();
    await sequelize.query(`UPDATE cadastro_pendente SET expira_em = NOW() - INTERVAL '1 second'`);
    expect((await solicitar()).status).toBe(202);
    const depois = await pendentes();
    expect(depois).toHaveLength(1);
    expect(depois[0]).not.toMatchObject({ token_hash: (antes[0] as Record<string, unknown>).token_hash });
    expect(envio).toHaveBeenCalledTimes(2);
  });
});
