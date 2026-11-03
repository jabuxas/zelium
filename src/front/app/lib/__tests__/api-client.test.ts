import { apiFetch } from '../api-client';

function resposta(status: number, corpo: unknown) {
  return {
    status, ok: status < 400,
    clone() { return this; },
    json: async () => corpo,
  };
}

afterEach(() => {
  jest.restoreAllMocks();
});

async function capturarEvento() {
  const ouvinte = jest.fn();
  window.addEventListener('zelium:trial-expirado', ouvinte);
  return { ouvinte, limpar: () => window.removeEventListener('zelium:trial-expirado', ouvinte) };
}

it('403 com codigo trial_expirado dispara evento global', async () => {
  const { ouvinte, limpar } = await capturarEvento();
  global.fetch = jest.fn().mockResolvedValue(resposta(403, { error: 'Periodo de trial expirado...', codigo: 'trial_expirado' })) as unknown as typeof fetch;
  await apiFetch('/api/tipo-material');
  expect(ouvinte).toHaveBeenCalledTimes(1);
  limpar();
});

it.each([
  ['403 sem codigo (RBAC)', 403, { error: 'Acesso negado' }],
  ['401 sessão expirada', 401, { error: 'Faca login' }],
  ['200 normal', 200, { ok: true }],
])('não dispara evento para %s', async (_nome, status, corpo) => {
  const { ouvinte, limpar } = await capturarEvento();
  global.fetch = jest.fn().mockResolvedValue(resposta(status, corpo)) as unknown as typeof fetch;
  await apiFetch('/api/x');
  expect(ouvinte).not.toHaveBeenCalled();
  limpar();
});

it('corpo não-JSON em 403 não quebra nem dispara', async () => {
  const { ouvinte, limpar } = await capturarEvento();
  global.fetch = jest.fn().mockResolvedValue({
    status: 403, ok: false,
    clone() { return this; },
    json: async () => { throw new Error('body não é JSON'); },
  }) as unknown as typeof fetch;
  await expect(apiFetch('/api/x')).resolves.toBeDefined();
  expect(ouvinte).not.toHaveBeenCalled();
  limpar();
});
