import { test, expect } from '../support/fixtures';
import { loginMobile } from '../support/helpers';

for (const papel of ['gestor', 'responsavel', 'conferente'] as const) {
  test(`${papel}: inventário legível e atalhos úteis`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await loginMobile(page, papel);
    for (const width of [320, 375, 414, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole('button', { name: 'Conferir patrimônio', exact: true })).toBeVisible();
      await expect(page.getByText('Conferentes cadastrados', { exact: true })).toBeVisible();
      await expect(page.getByText('Patrimônios com avaria', { exact: true })).toBeVisible();
      for (const label of ['Início', 'Escanear', 'Bens', 'Locais', 'Mais']) {
        await expect(page.getByText(label, { exact: true })).toBeInViewport({ ratio: 1 });
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`inventario-${papel}-${width}.png`), fullPage: true });
    }
    await page.getByRole('button', { name: 'Buscar patrimônio', exact: true }).click();
    await expect(page.getByTestId('patrimonios-search')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
