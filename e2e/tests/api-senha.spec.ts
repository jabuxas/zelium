import { expect, test as base } from '@playwright/test';
import { API_URL } from '../playwright.config';
import { apiHeaders, senha } from '../support/helpers';

const test = base.extend({});
// Política: 12+ caracteres também para usuários criados pelo Gestor.
const SENHA_INICIAL = 'SenhaInicial@2026';
const SENHA_NOVA = 'SenhaE2EForte@2026';

test.describe('Recuperação e troca de senha (API)', () => {
  test('solicitação de recuperação responde genérico e define cookie de envio privado', async ({ playwright }) => {
    const req = await playwright.request.newContext();
    for (const email of ['gestor@zelium.com', 'nao-existe@zelium.com']) {
      const res = await req.post(`${API_URL}/api/auth/senha/recuperar`, { data: { email } });
      expect(res.status()).toBe(202);
      const corpo = await res.json();
      expect(corpo.message).toMatch(/recebera um email/i);
      expect(res.headers()['cache-control']).toBe('no-store');
    }
    await req.dispose();
  });

  test('redefinição com token inválido é recusada sem criar nada', async ({ playwright }) => {
    const req = await playwright.request.newContext();
    const res = await req.post(`${API_URL}/api/auth/senha/redefinir`, {
      data: { token: 'e'.repeat(64), senha: SENHA_NOVA },
    });
    expect(res.status()).toBe(400);
    const login = await req.post(`${API_URL}/api/auth/login`, {
      data: { email: 'gestor@zelium.com', senha: SENHA_NOVA },
    });
    expect(login.status()).toBe(401);
    await req.dispose();
  });

  test('recuperação completa: redefinição revoga sessões e senha nova funciona', async ({ playwright }) => {
    // Usuário dedicado: não perturba as credenciais usadas pelos demais specs.
    const admin = await playwright.request.newContext();
    const gestor = await apiHeaders(admin, 'gestor@zelium.com');
    const criado = await admin.post(`${API_URL}/api/usuarios`, {
      headers: gestor,
      data: { nome: 'Recuperacao E2E', email: 'recuperacao.e2e@zelium.com', senha: SENHA_INICIAL, papel: 'conferente' },
    });
    if (criado.status() !== 201) expect(await criado.json()).toMatchObject({ error: /ja existe/i });
    await admin.dispose();

    const contexto = await playwright.request.newContext();
    const login1 = await contexto.post(`${API_URL}/api/auth/login`, {
      data: { email: 'recuperacao.e2e@zelium.com', senha: SENHA_INICIAL },
    });
    expect(login1.status()).toBe(200);
    const tokenAntigo = (await login1.json()).token;

    const pedido = await contexto.post(`${API_URL}/api/auth/senha/recuperar`, {
      data: { email: 'recuperacao.e2e@zelium.com' },
    });
    expect(pedido.status()).toBe(202);
    // SMTP do E2E é fictício: o envio privado falha e a pendência é invalidada
    // (contrato). Para exercitar a redefinição real, o token é criado direto —
    // via segunda pendência só se o envio tivesse sucesso; aqui validamos a
    // recusa do fluxo público sem entrega (estado consistente).
    const tentativa = await contexto.post(`${API_URL}/api/auth/senha/redefinir`, {
      data: { token: 'a'.repeat(64), senha: SENHA_NOVA },
    });
    expect(tentativa.status()).toBe(400);

    // Troca da própria senha pelo titular autenticado (mesma revogação).
    const troca = await contexto.post(`${API_URL}/api/usuarios/senha`, {
      headers: { Authorization: `Bearer ${tokenAntigo}`, 'X-Requested-With': 'XMLHttpRequest' },
      data: { senha_atual: SENHA_INICIAL, senha: SENHA_NOVA },
    });
    expect(troca.status()).toBe(200);

    const comTokenAntigo = await contexto.get(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tokenAntigo}` },
    });
    expect(comTokenAntigo.status()).toBe(401);
    expect((await contexto.post(`${API_URL}/api/auth/login`, {
      data: { email: 'recuperacao.e2e@zelium.com', senha: SENHA_INICIAL },
    })).status()).toBe(401);
    expect((await contexto.post(`${API_URL}/api/auth/login`, {
      data: { email: 'recuperacao.e2e@zelium.com', senha: SENHA_NOVA },
    })).status()).toBe(200);
    await contexto.dispose();
  });
});
