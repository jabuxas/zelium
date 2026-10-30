import express from 'express';
import request from 'supertest';
import {
  rateLimitLogin,
  resetRateLimitLoginParaTeste,
} from '../src/middlewares/rateLimitLogin';

function appDeTeste() {
  const app = express();
  app.use(express.json());
  app.post('/login', rateLimitLogin, (req, res) => {
    res.status(req.body?.senha === 'certa' ? 200 : 401).json({});
  });
  return app;
}

beforeEach(() => {
  resetRateLimitLoginParaTeste();
  jest.restoreAllMocks();
  delete process.env.RATE_LIMIT_LOGIN_MAX;
});

it('bloqueia após 10 falhas de credencial e informa Retry-After', async () => {
  const app = appDeTeste();
  for (let i = 0; i < 10; i += 1) {
    const res = await request(app).post('/login').send({ senha: 'errada' });
    expect(res.status).toBe(401);
  }
  const bloqueado = await request(app).post('/login').send({ senha: 'errada' });
  expect(bloqueado.status).toBe(429);
  expect(Number(bloqueado.headers['retry-after'])).toBeGreaterThan(0);
  expect(bloqueado.body.error).toMatch(/Muitas tentativas/i);
});

it('sucesso não consome cota nem é bloqueado', async () => {
  const app = appDeTeste();
  for (let i = 0; i < 9; i += 1) {
    await request(app).post('/login').send({ senha: 'errada' });
  }
  const ok = await request(app).post('/login').send({ senha: 'certa' });
  expect(ok.status).toBe(200);

  // 10ª falha atinge o limite, mas o pré-check ainda libera esta tentativa;
  // a seguinte é bloqueada.
  const decima = await request(app).post('/login').send({ senha: 'errada' });
  expect(decima.status).toBe(401);
  const undecima = await request(app).post('/login').send({ senha: 'errada' });
  expect(undecima.status).toBe(429);
});

it('janela expirada libera novas tentativas', async () => {
  const app = appDeTeste();
  for (let i = 0; i < 10; i += 1) {
    await request(app).post('/login').send({ senha: 'errada' });
  }
  expect((await request(app).post('/login').send({ senha: 'x' })).status).toBe(429);

  const agora = Date.now();
  const espionado = jest.spyOn(Date, 'now').mockReturnValue(agora + 16 * 60 * 1000);
  try {
    const liberado = await request(app).post('/login').send({ senha: 'errada' });
    expect(liberado.status).toBe(401);
  } finally {
    espionado.mockRestore();
  }
});

it('limite configurável por ambiente (RATE_LIMIT_LOGIN_MAX)', async () => {
  process.env.RATE_LIMIT_LOGIN_MAX = '2';
  const app = appDeTeste();
  await request(app).post('/login').send({ senha: 'x' });
  await request(app).post('/login').send({ senha: 'x' });
  const bloqueado = await request(app).post('/login').send({ senha: 'x' });
  expect(bloqueado.status).toBe(429);
});

it('rota /api/auth/login real declara o middleware antes do controller', async () => {
  const rotas = (await import('../src/routes/auth.routes')).default as unknown as {
    stack: Array<{ route?: { path?: string; stack: Array<{ name: string }> } }>;
  };
  const camada = rotas.stack.find((item) => item.route?.path === '/login');
  expect(camada).toBeDefined();
  const nomes = camada!.route!.stack.map((item) => item.name);
  expect(nomes.indexOf('rateLimitLogin')).toBeGreaterThanOrEqual(0);
  expect(nomes.indexOf('rateLimitLogin')).toBeLessThan(nomes.length - 1);
});
