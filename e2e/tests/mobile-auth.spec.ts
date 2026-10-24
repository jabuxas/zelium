import { test, expect } from '../support/fixtures';
import { loginMobile } from '../support/helpers';

for (const papel of ['gestor', 'responsavel', 'conferente'] as const) {
  test(`${papel}: entra e consulta o app`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await loginMobile(page, papel);
    await expect(page.getByText('Total de Patrimônios', { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`dashboard-${papel}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}
