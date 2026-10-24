import { test, expect } from '../support/fixtures';
import { loginMobile } from '../support/helpers';

for (const papel of ['gestor', 'responsavel', 'conferente'] as const) {
  test(`${papel}: conta rolável, histórico acessível e saída`, async ({ page }, info) => {
    await loginMobile(page, papel);
    await page.getByText('Mais', { exact: true }).click();
    await expect(page.getByText('Conta e cadastros', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Histórico da organização', exact: true })).toBeVisible();
    if (papel === 'gestor') await expect(page.getByText('Cadastros da organização', { exact: true })).toBeVisible();
    else await expect(page.getByText('Fornecedores', { exact: true })).toHaveCount(0);
    for (const width of [320, 375, 414, 768]) {
      await page.setViewportSize({ width, height: 740 });
      await page.getByRole('button', { name: 'Sair da conta', exact: true }).scrollIntoViewIfNeeded();
      await expect(page.getByRole('button', { name: 'Sair da conta', exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`conta-${papel}-${width}.png`), fullPage: true });
    }
    await page.getByRole('button', { name: 'Histórico da organização', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Histórico da organização', exact: true })).toBeVisible();
    await page.getByText('Mais', { exact: true }).click();
    await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeVisible();
  });
}
