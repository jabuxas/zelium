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
