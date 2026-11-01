import type { Express } from 'express';
import { QueryTypes, Sequelize } from 'sequelize';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
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

const SENHA = 'SenhaSegura@1234';
function confirmar(token: string, senha = SENHA) {
  return rawRequest(app).post('/api/auth/cadastros/confirmacao')
    .set('X-Forwarded-For', `192.0.2.${ip}`).send({ token, senha });
}
async function novoPedido(sufixo = '') {
  const pedido = { ...entrada, email: `titular${ip}${sufixo}@empresa.test` };
  expect((await solicitar(pedido)).status).toBe(202);
  const ultimo = envio.mock.calls[envio.mock.calls.length - 1][0];
  return { pedido, token: ultimo.corpoTexto.match(/#token=([a-f0-9]{64})/)![1] };
}
async function usuariosEmail(email: string) {
  return sequelize.query<{ id: number; senha_hash: string; papel: string; organizacao_id: number }>(
    'SELECT * FROM usuario WHERE email = :email', { replacements: { email }, type: QueryTypes.SELECT });
}

describe('Confirmação e provisionamento atômico', () => {
  it('JSON malformado ou grande não expõe token e senha no log do parser', async () => {
    const { token } = await novoPedido();
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const invalido = await rawRequest(app).post('/api/auth/cadastros/confirmacao')
      .set('Content-Type', 'application/json').send(`{"token":"${token}","senha":"${SENHA}",`);
    expect(invalido.status).toBe(400);
    const grande = await rawRequest(app).post('/api/auth/cadastros/confirmacao')
      .send({ token, senha: SENHA, excesso: 'x'.repeat(110_000) });
    expect(grande.status).toBe(413);
    expect(JSON.stringify(log.mock.calls)).not.toContain(token);
    expect(JSON.stringify(log.mock.calls)).not.toContain(SENHA);
    expect(await pendentes()).toHaveLength(1);
  });

  it('cria Gestor, organização trial, estados e auditoria próprios, sem copiar dados piloto', async () => {
    const legado = await sequelize.query('SELECT * FROM organizacao WHERE id = 1', { type: QueryTypes.SELECT });
    const { token, pedido } = await novoPedido();
    const inicio = Date.now();
    const res = await confirmar(token);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ message: 'Cadastro confirmado. Faca login para continuar.' });
    expect(res.headers['cache-control']).toBe('no-store');
    const usuarios = await usuariosEmail(pedido.email);
    expect(usuarios).toHaveLength(1);
    const usuario = usuarios[0];
    expect(usuario.papel).toBe('gestor');
    expect(usuario.organizacao_id).not.toBe(1);
    expect(await bcrypt.compare(SENHA, usuario.senha_hash)).toBe(true);
    expect(bcrypt.getRounds(usuario.senha_hash)).toBe(12);
    const [org] = await sequelize.query<{ trial_inicio: Date; trial_fim: Date }>(
      'SELECT * FROM organizacao WHERE id = :id', { replacements: { id: usuario.organizacao_id }, type: QueryTypes.SELECT });
    expect(org).toMatchObject({ nome: pedido.organizacaoNome, modalidade_acesso: 'trial', limite_patrimonios: 500, limite_usuarios: 5 });
    expect(org.trial_inicio.getTime()).toBeGreaterThanOrEqual(inicio);
    expect(org.trial_fim.getTime() - org.trial_inicio.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
    const estados = await sequelize.query('SELECT nome, avaria FROM estado_item WHERE organizacao_id = :id ORDER BY id', {
      replacements: { id: usuario.organizacao_id }, type: QueryTypes.SELECT,
    });
    expect(estados).toEqual([{ nome: 'Em condições', avaria: false }, { nome: 'Em manutenção', avaria: true },
      { nome: 'Inservível', avaria: true }, { nome: 'Descarte pendente', avaria: true }]);
    const audit = await sequelize.query('SELECT * FROM audit_log WHERE organizacao_id = :id', {
      replacements: { id: usuario.organizacao_id }, type: QueryTypes.SELECT,
    });
    expect(audit).toHaveLength(6); // organização, Gestor e quatro estados
    expect(JSON.stringify(audit)).not.toMatch(/senha_hash|token_hash/);
    expect(JSON.stringify(audit)).not.toContain(token);
    expect(JSON.stringify(audit)).not.toContain(SENHA);
    expect(await pendentes()).toEqual([]);
    expect(await sequelize.query('SELECT * FROM organizacao WHERE id = 1', { type: QueryTypes.SELECT })).toEqual(legado);
    const login = await rawRequest(app).post('/api/auth/login').send({ email: pedido.email, senha: SENHA });
    expect(login.status).toBe(200);
    const dados = await rawRequest(app).get('/api/patrimonios').set('Authorization', `Bearer ${login.body.token}`);
    expect(dados.status).toBe(200);
    expect(dados.body).toEqual([]);
    expect((await rawRequest(app).get('/api/patrimonios/1').set('Authorization', `Bearer ${login.body.token}`)).status).toBe(404);
  });

  it('confirmações concorrentes e replay nunca criam duas organizações', async () => {
    const { token, pedido } = await novoPedido();
    const antes = await sequelize.query('SELECT id FROM organizacao', { type: QueryTypes.SELECT });
    const respostas = await Promise.all([confirmar(token), confirmar(token)]);
    expect(respostas.map(res => res.status).sort()).toEqual([201, 400]);
    expect((await confirmar(token)).status).toBe(400);
    expect(await usuariosEmail(pedido.email)).toHaveLength(1);
    expect(await sequelize.query('SELECT id FROM organizacao', { type: QueryTypes.SELECT })).toHaveLength(antes.length + 1);
  });

  it('token expirado ou desconhecido não cria conta e retorna a mesma mensagem', async () => {
    const { token, pedido } = await novoPedido();
    await sequelize.query(`UPDATE cadastro_pendente SET expira_em = NOW() - INTERVAL '1 second'`);
    const expirado = await confirmar(token);
    const desconhecido = await confirmar('f'.repeat(64));
    expect(expirado.status).toBe(400);
    expect(desconhecido.status).toBe(400);
    expect(expirado.body).toEqual(desconhecido.body);
    expect(await usuariosEmail(pedido.email)).toEqual([]);
  });

  it('limita confirmação antes do hash e outro IP pode confirmar sem consumir token bloqueado', async () => {
    const { token, pedido } = await novoPedido();
    for (let i = 0; i < 10; i += 1) expect((await confirmar('0'.repeat(64))).status).toBe(400);
    const bloqueado = await confirmar(token);
    expect(bloqueado.status).toBe(429);
    expect(Number(bloqueado.headers['retry-after'])).toBeGreaterThan(0);
    expect(await usuariosEmail(pedido.email)).toEqual([]);
    expect(await pendentes()).toHaveLength(1);
    expect((await confirmar(token).set('X-Forwarded-For', `198.51.100.${ip}`)).status).toBe(201);
  });

  it.each(['curta', 'á'.repeat(37), ' '.repeat(12), 123, null])
  ('recusa senha inválida sem consumir a confirmação: %p', async senha => {
    const { token, pedido } = await novoPedido();
    const res = await rawRequest(app).post('/api/auth/cadastros/confirmacao').send({ token, senha });
    expect(res.status).toBe(400);
    expect(await usuariosEmail(pedido.email)).toEqual([]);
    expect(await pendentes()).toHaveLength(1);
  });

  it('não aceita papel, email, organização ou datas na confirmação', async () => {
    const { token } = await novoPedido();
    for (const campo of ['papel', 'email', 'organizacaoId', 'trial_fim']) {
      const res = await rawRequest(app).post('/api/auth/cadastros/confirmacao')
        .set('X-Forwarded-For', `192.0.2.${ip}`).send({ token, senha: SENHA, [campo]: 'forjado' });
      expect(res.status).toBe(400);
    }
    expect(await pendentes()).toHaveLength(1);
  });

  it('somente o titular do token correspondente é provisionado', async () => {
    const a = await novoPedido('a');
    const b = await novoPedido('b');
    expect((await confirmar(b.token)).status).toBe(201);
    expect(await usuariosEmail(a.pedido.email)).toEqual([]);
    expect(await usuariosEmail(b.pedido.email)).toHaveLength(1);
    expect(await pendentes()).toHaveLength(1);
  });

  it('falha em estado inicial desfaz organização, Gestor, auditoria e consumo do token', async () => {
    const { token, pedido } = await novoPedido();
    const { EstadoItem } = await import('../src/models/EstadoItem');
    const antes = await sequelize.query('SELECT id FROM organizacao', { type: QueryTypes.SELECT });
    const auditAntes = await sequelize.query('SELECT id FROM audit_log', { type: QueryTypes.SELECT });
    EstadoItem.addHook('beforeCreate', 'falhaCadastro', () => { throw new Error('Falha de teste'); });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect((await confirmar(token)).status).toBe(503);
      expect(await usuariosEmail(pedido.email)).toEqual([]);
      expect(await pendentes()).toHaveLength(1);
      expect(await sequelize.query('SELECT id FROM organizacao', { type: QueryTypes.SELECT })).toEqual(antes);
      expect(await sequelize.query('SELECT id FROM audit_log', { type: QueryTypes.SELECT })).toEqual(auditAntes);
    } finally {
      EstadoItem.removeHook('beforeCreate', 'falhaCadastro');
    }
    expect((await confirmar(token)).status).toBe(201);
  });

  it('falha de auditoria também impede confirmação e não vaza senha/token no log', async () => {
    const { token, pedido } = await novoPedido();
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    await sequelize.query(`CREATE FUNCTION falhar_auditoria_cadastro() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Falha de auditoria de teste'; END $$;
      CREATE TRIGGER falhar_cadastro BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION falhar_auditoria_cadastro();`);
    try {
      const res = await confirmar(token);
      expect(res.status).toBe(503);
      expect(await usuariosEmail(pedido.email)).toEqual([]);
      expect(await pendentes()).toHaveLength(1);
      expect(JSON.stringify(log.mock.calls)).not.toContain(token);
      expect(JSON.stringify(log.mock.calls)).not.toContain(SENHA);
      expect(JSON.stringify(res.body)).not.toContain('auditoria');
    } finally {
      await sequelize.query('DROP TRIGGER falhar_cadastro ON audit_log; DROP FUNCTION falhar_auditoria_cadastro()');
    }
    expect((await confirmar(token)).status).toBe(201);
  });

  it('não vincula confirmação a conta criada por outro caminho após a solicitação', async () => {
    const { token, pedido } = await novoPedido();
    await sequelize.query(`INSERT INTO usuario (nome, email, senha_hash, papel, organizacao_id)
      SELECT 'Existente', :email, senha_hash, 'conferente', 1 FROM usuario WHERE id = 1`, {
      replacements: { email: pedido.email },
    });
    expect((await confirmar(token)).status).toBe(400);
    expect(await usuariosEmail(pedido.email)).toMatchObject([{ papel: 'conferente', organizacao_id: 1 }]);
    expect(await pendentes()).toEqual([]);
  });

  it('confirmação também fica desabilitada e GET nunca consome o token', async () => {
    const { token, pedido } = await novoPedido();
    expect((await rawRequest(app).get('/api/auth/cadastros/confirmacao').query({ token })).status).not.toBe(201);
    expect(await pendentes()).toHaveLength(1);
    delete process.env.SELF_SERVICE_ENABLED;
    expect((await confirmar(token)).status).toBe(404);
    expect(await usuariosEmail(pedido.email)).toEqual([]);
  });
});
