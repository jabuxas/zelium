import { test, expect } from '../support/fixtures';

test('marca e login do app em telas estreitas e tablet', async ({ page }, info) => {
  for (const width of [320, 375, 414, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/login');
    await expect(page.getByText('Zelium', { exact: true })).toBeVisible();
    await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Senha', { exact: true })).toBeVisible();
    if (width === 768) expect((await page.getByLabel('E-mail', { exact: true }).boundingBox())!.width).toBeLessThanOrEqual(440);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const path = info.outputPath(`login-${width}.png`);
    await page.screenshot({ path, fullPage: true });
    await info.attach(`Login app ${width}px`, { path, contentType: 'image/png' });
  }
});
