import { randomUUID } from 'node:crypto';
import { test, expect } from '../support/fixtures';
import { API_URL } from '../playwright.config';
import { loginMobile } from '../support/helpers';

const catalogs = [
  { path: 'tipos-material', api: 'tipo-material', card: 'tipo-material', name: 'Nome' },
  { path: 'estados-item', api: 'estados-item', card: 'estado-item', name: 'Nome do estado' },
  { path: 'responsaveis', api: 'responsaveis', card: 'responsavel', name: 'Nome do responsável' },
  { path: 'conferentes', api: 'conferentes', card: 'conferente', name: 'Nome do conferente' },
  { path: 'fornecedores', api: 'fornecedores', card: 'fornecedor', name: 'Nome do fornecedor' },
];

for (const catalog of catalogs) {
  test(`app: Gestor mantém ${catalog.path} pelo formulário real`, async ({ page }) => {
    await loginMobile(page);
    await page.goto(`/${catalog.path}`);
    await page.getByTestId(`${catalog.path}-fab`).click();
    const nome = `App ${randomUUID().slice(0, 8)}`;
    await page.getByLabel(catalog.name, { exact: true }).fill(nome);
    if (['conferentes', 'responsaveis'].includes(catalog.path)) await page.getByLabel(/e-?mail/i).fill(`${randomUUID()}@e2e.local`);
    if (catalog.path === 'fornecedores') await page.getByLabel(/CNPJ/).fill(`99${String(Date.now()).slice(-12)}`);
    const created = page.waitForResponse(r => r.url() === `${API_URL}/api/${catalog.api}` && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    const response = await created;
    expect(response.status()).toBe(201);
    const { id } = await response.json();
    const cardId = `${catalog.card}-card-${id}`;
    await expect(page.getByTestId(cardId)).toBeVisible();
    await page.getByTestId(`${cardId}-edit`).click();
    await expect(page.getByLabel(catalog.name, { exact: true })).toHaveValue(nome);
    await page.getByLabel(catalog.name, { exact: true }).fill(`${nome} editado`);
    const updated = page.waitForResponse(r => r.url() === `${API_URL}/api/${catalog.api}/${id}` && r.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    expect((await updated).status()).toBe(200);
    await expect(page.getByTestId(cardId).getByText(`${nome} editado`, { exact: true })).toBeVisible();
    await page.getByTestId(`${cardId}-delete`).click();
    const deleted = page.waitForResponse(r => r.url() === `${API_URL}/api/${catalog.api}/${id}` && r.request().method() === 'DELETE');
    await page.getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
    expect((await deleted).status()).toBe(204);
    await expect(page.getByTestId(cardId)).toHaveCount(0);
  });
}

for (const papel of ['responsavel', 'conferente'] as const) {
  test(`app: ${papel} consulta cadastros sem edição administrativa`, async ({ page }) => {
    await loginMobile(page, papel);
    for (const catalog of catalogs) {
      await page.goto(`/${catalog.path}`);
      await expect(page.getByTestId(`${catalog.path}-fab`)).toBeDisabled();
      const cards = page.getByTestId(new RegExp(`^${catalog.card}-card-\\d+$`));
      await expect(cards.first()).toBeVisible();
      const id = await cards.first().getAttribute('data-testid');
      await expect(page.getByTestId(`${id}-edit`)).toBeDisabled();
      await expect(page.getByTestId(`${id}-delete`)).toBeDisabled();
      await page.getByTestId(`${id}-open`).click();
      await expect(page.getByTestId(`${id}-detail`)).toBeVisible();
      await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: 'Fechar', exact: true }).click();
    }
  });
}
