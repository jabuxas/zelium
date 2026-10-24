import { randomUUID } from 'node:crypto';
import { test, expect } from '../support/fixtures';
import { apiHeaders, loginMobile } from '../support/helpers';
import { API_URL } from '../playwright.config';

const prefix = `Histórico ${randomUUID().slice(0, 8)}`;

test.beforeAll(async ({ request }) => {
  const headers = await apiHeaders(request);
  for (let i = 0; i < 12; i++) {
    const response = await request.post(`${API_URL}/api/ambientes`, { headers, data: { nome: `${prefix} ${i}`, responsavel_id: 1 } });
    expect(response.status()).toBe(201);
    if (i === 0) {
      const { id } = await response.json();
      const update = await request.put(`${API_URL}/api/ambientes/${id}`, { headers, data: { nome: `${prefix} atualizado`, responsavel_id: 1 } });
      expect(update.status()).toBe(200);
    }
  }
});

for (const papel of ['gestor', 'responsavel', 'conferente'] as const) {
  test(`${papel}: consulta histórico paginado, filtra e lê alterações`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await loginMobile(page, papel);
    await page.getByRole('button', { name: 'Ver histórico', exact: true }).click();
    await page.getByLabel('Nome ou número do bem', { exact: true }).fill(prefix);
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(page.getByText('Página 1 de 2 · 13 eventos', { exact: true })).toBeVisible();
    const cards = page.getByTestId(/^audit-log-card-\d+$/);
    await expect(cards).toHaveCount(10);
    const first = await cards.evaluateAll(items => items.map(item => item.getAttribute('data-testid')));
    const nextResponse = page.waitForResponse(r => r.url().includes('/api/audit-log?') && new URL(r.url()).searchParams.get('page') === '2');
    await page.getByRole('button', { name: 'Próxima', exact: true }).click();
    expect((await nextResponse).status()).toBe(200);
    await expect(page.getByText('Página 2 de 2 · 13 eventos', { exact: true })).toBeVisible();
    await expect(cards).toHaveCount(3);
    expect((await cards.evaluateAll(items => items.map(item => item.getAttribute('data-testid')))).some(id => first.includes(id))).toBe(false);
    await page.getByRole('button', { name: 'Filtros', exact: true }).click();
    await page.getByRole('button', { name: 'Atualização', exact: true }).click();
    await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
    await expect(cards).toHaveCount(1);
    await cards.first().click();
    await expect(page.getByText(`Antes: ${prefix} 0`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Depois: ${prefix} atualizado`, { exact: true })).toBeVisible();
    await expect(page.getByText('Página 1 de 1 · 1 eventos', { exact: true })).toBeVisible();
    for (const width of [320, 375, 414, 768]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`historico-${papel}-${width}.png`), fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}
