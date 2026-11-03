import { test, expect } from '../support/fixtures';
import { loginWeb } from '../support/helpers';

for (const papel of ['gestor', 'responsavel', 'conferente'] as const) {
  test(`${papel}: login, dashboard e histórico`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await loginWeb(page, papel);
    await expect(page.getByText('Total de Patrimônios', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Ver histórico completo' }).click();
    await expect(page.getByRole('heading', { name: 'Histórico de atividades' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aplicar filtros' })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('sessão web fica em cookie HttpOnly, não em localStorage', async ({ page }) => {
  await loginWeb(page, 'gestor');
  const cookies = await page.context().cookies();
  const sessao = cookies.find(c => c.name === 'zelium_sessao');
  expect(sessao).toBeDefined();
  expect(sessao.httpOnly).toBe(true);
  expect(sessao.sameSite).toMatch(/Lax/i);
  expect(await page.evaluate(() => window.localStorage.getItem('zelar_token'))).toBeNull();
  expect(await page.evaluate(() => window.localStorage.getItem('zelar_logado'))).toBeNull();
});
