import { randomUUID } from 'node:crypto';
import { test, expect } from '../support/fixtures';
import { API_URL } from '../playwright.config';
import { loginWeb } from '../support/helpers';

const catalogs = [
  { path: 'tipos-material', api: 'tipo-material', nameLabel: 'Nome do Tipo *' },
  { path: 'estados-item', api: 'estados-item', nameLabel: 'Nome do Estado *' },
  { path: 'responsaveis', api: 'responsaveis', nameLabel: 'Nome Completo *' },
  { path: 'conferentes', api: 'conferentes', nameLabel: 'Nome Completo *' },
  { path: 'fornecedores', api: 'fornecedores', nameLabel: 'Nome *' },
];

for (const catalog of catalogs) {
  test(`web: Gestor mantém ${catalog.path} pelo formulário real`, async ({ page }) => {
    const nome = `E2E ${randomUUID().slice(0, 8)}`;
    await loginWeb(page);
    await page.goto(`/${catalog.path}`);
    await page.getByRole('link', { name: /Nov[oa]/ }).click();
    await page.getByLabel(catalog.nameLabel, { exact: true }).fill(nome);
    if (['responsaveis', 'conferentes'].includes(catalog.path)) {
      await page.getByLabel(/Email.*\*/).fill(`${randomUUID()}@e2e.local`);
    }
    if (catalog.path === 'fornecedores') await page.getByLabel('CNPJ *', { exact: true }).fill(`99${String(Date.now()).slice(-12)}`);
    const created = page.waitForResponse(r => r.url() === `${API_URL}/api/${catalog.api}` && r.request().method() === 'POST');
    await page.getByRole('button', { name: /Cadastrar/ }).click();
    expect((await created).status()).toBe(201);
    await expect(page).toHaveURL(new RegExp(`/${catalog.path}$`));
    const row = page.getByRole('row').filter({ hasText: nome });
    await expect(row).toBeVisible();
    await row.getByRole('link', { name: `Editar ${nome}`, exact: true }).click();
    await expect(page.getByLabel(catalog.nameLabel, { exact: true })).toHaveValue(nome);
    const editado = `${nome} editado`;
    await page.getByLabel(catalog.nameLabel, { exact: true }).fill(editado);
    await page.getByRole('button', { name: 'Salvar Alterações', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${catalog.path}$`));
    const updated = page.getByRole('row').filter({ hasText: editado });
    await expect(updated).toBeVisible();
    page.once('dialog', dialog => dialog.accept());
    const deleted = page.waitForResponse(r => r.url().includes(`/api/${catalog.api}/`) && r.request().method() === 'DELETE');
    await updated.getByRole('button', { name: `Excluir ${editado}`, exact: true }).click();
    expect((await deleted).status()).toBe(204);
    await expect(updated).toHaveCount(0);
  });
}

for (const papel of ['responsavel', 'conferente'] as const) {
  test(`web: ${papel} consulta cadastros sem acesso a formulários administrativos`, async ({ page }) => {
    await loginWeb(page, papel);
    for (const catalog of catalogs) {
      await page.goto(`/${catalog.path}`);
      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByRole('link', { name: /Nov[oa]/ })).toHaveCount(0);
      await expect(page.getByRole('link', { name: /^Editar / })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^Excluir / })).toHaveCount(0);
      await page.goto(`/${catalog.path}/novo`);
      await expect(page.getByRole('heading', { name: 'Acesso restrito' })).toBeVisible();
    }
  });
}
