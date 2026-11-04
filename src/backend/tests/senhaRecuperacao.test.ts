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
