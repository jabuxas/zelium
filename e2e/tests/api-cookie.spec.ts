import { expect, test as base } from '@playwright/test';
import { API_URL } from '../playwright.config';
import { senha } from '../support/helpers';

// Contexto de requisição limpo (sem cookie jar): o spec passa os cookies
// explicitamente para provar exatamente o que o servidor aceita e recusa.
const test = base.extend({});

function setCookieDa(respostas: Array<{ name: string; value: string }>, nome: string): string | undefined {
  // headersArray preserva o case original do nome do header.
  return respostas.find(item => item.name.toLowerCase() === 'set-cookie' && item.value.includes(`${nome}=`))?.value;
}

test.describe('Sessão por cookie HttpOnly + CSRF (API)', () => {
  test('login define cookie HttpOnly SameSite=Lax e cookie autentica leitura', async ({ playwright }) => {
    const req = await playwright.request.newContext();
    const login = await req.post(`${API_URL}/api/auth/login`, { data: { email: 'gestor@zelium.com', senha } });
    expect(login.status()).toBe(200);
    const { token } = await login.json();

    const cookieBruto = setCookieDa(login.headersArray(), 'zelium_sessao');
    expect(cookieBruto).toContain('HttpOnly');
    expect(cookieBruto).toMatch(/SameSite=Lax/i);
    const cookie = cookieBruto.split(';')[0];

    const me = await req.get(`${API_URL}/api/auth/me`, { headers: { Cookie: cookie } });
    expect(me.status()).toBe(200);
    expect((await me.json()).usuario.email).toBe('gestor@zelium.com');

    // Token no corpo continua existindo para o app mobile (Bearer)
    expect(typeof token).toBe('string');
    await req.dispose();
  });

  test('escrita por cookie sem X-Requested-With é recusada; com o header passa', async ({ playwright }) => {
    const req = await playwright.request.newContext();
    const login = await req.post(`${API_URL}/api/auth/login`, { data: { email: 'gestor@zelium.com', senha } });
    const cookie = setCookieDa(login.headersArray(), 'zelium_sessao').split(';')[0];

    const bloqueada = await req.post(`${API_URL}/api/tipo-material`, {
      headers: { Cookie: cookie }, data: { nome: 'E2E Sem Header CSRF' },
    });
    expect(bloqueada.status()).toBe(403);
    expect((await bloqueada.json()).codigo).toBe('csrf');

    const leitura = await req.get(`${API_URL}/api/tipo-material`, { headers: { Cookie: cookie } });
    expect(leitura.status()).toBe(200);

    const permitida = await req.post(`${API_URL}/api/tipo-material`, {
      headers: { Cookie: cookie, 'X-Requested-With': 'XMLHttpRequest' },
      data: { nome: 'E2E Com Header CSRF' },
    });
    expect(permitida.status()).toBe(201);
    await req.dispose();
  });

  test('Bearer não é afetado pelo CSRF (mobile continua)', async ({ playwright }) => {
    const req = await playwright.request.newContext();
    const login = await req.post(`${API_URL}/api/auth/login`, { data: { email: 'gestor@zelium.com', senha } });
    const { token } = await login.json();

    const res = await req.post(`${API_URL}/api/tipo-material`, {
      headers: { Authorization: `Bearer ${token}` }, data: { nome: 'E2E Bearer Sem Header' },
    });
    expect(res.status()).toBe(201);
    await req.dispose();
  });

  test('logout apaga o cookie no cliente', async ({ playwright }) => {
    const req = await playwright.request.newContext();
    const login = await req.post(`${API_URL}/api/auth/login`, { data: { email: 'gestor@zelium.com', senha } });
    const cookie = setCookieDa(login.headersArray(), 'zelium_sessao').split(';')[0];

    const logout = await req.post(`${API_URL}/api/auth/logout`, {
      headers: { Cookie: cookie, 'X-Requested-With': 'XMLHttpRequest' },
    });
    expect(logout.status()).toBe(200);
    const limpeza = setCookieDa(logout.headersArray(), 'zelium_sessao');
    expect(limpeza).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
    await req.dispose();
  });
});
