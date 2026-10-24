import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { API_URL } from '../playwright.config';

export type Papel = 'gestor' | 'responsavel' | 'conferente';
export const senha = 'Zelium@2026';

export async function loginWeb(page: Page, papel: Papel = 'gestor') {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(`${papel}@zelium.com`);
  await page.locator('input[type=password]').fill(senha);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
}

export async function loginMobile(page: Page, papel: Papel = 'gestor') {
  await page.goto('/login');
  await page.getByLabel('E-mail', { exact: true }).fill(`${papel}@zelium.com`);
  await page.getByLabel('Senha', { exact: true }).fill(senha);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByTestId('dashboard-scroll')).toBeVisible();
}

export async function apiHeaders(request: APIRequestContext, email = 'gestor@zelium.com') {
  const res = await request.post(`${API_URL}/api/auth/login`, { data: { email, senha } });
  expect(res.status()).toBe(200);
  const { token } = await res.json();
  return { Authorization: `Bearer ${token}` };
}
