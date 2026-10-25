import { randomUUID } from 'node:crypto';
import { test, expect } from '../support/fixtures';
import { API_URL } from '../playwright.config';
import { loginMobile } from '../support/helpers';

for (const papel of ['gestor', 'responsavel'] as const) {
  test(`app: ${papel} mantém ambiente e patrimônio pelos formulários`, async ({ page }, info) => {
    const unique = randomUUID().slice(0, 8);
    const nome = `Ambiente app ${unique}`;
    const numero = `APP-${unique}`;
    await loginMobile(page, papel);
    await page.goto('/ambientes');
    await page.getByTestId('ambientes-fab').click();
    await page.getByLabel('Nome do ambiente', { exact: true }).fill(nome);
    await page.getByTestId('ambientes-form-field-responsavel_id-trigger').click();
    await page.getByTestId('ambientes-form-field-responsavel_id-option-1').click();
    const createdAmb = page.waitForResponse(r => r.url() === `${API_URL}/api/ambientes` && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    const ambResponse = await createdAmb;
    expect(ambResponse.status()).toBe(201);
    const { id: ambienteId } = await ambResponse.json();
    await page.getByTestId(`ambiente-card-${ambienteId}-open`).click();
    await expect(page.getByTestId(`ambiente-card-${ambienteId}-detail`)).toBeVisible();
    await page.getByRole('button', { name: 'Fechar', exact: true }).click();
    await page.goto('/patrimonios');
    await page.getByTestId('patrimonios-fab').click();
    await page.getByLabel('Número do patrimônio', { exact: true }).fill(numero);
    await page.getByLabel('Descrição', { exact: true }).fill(`Notebook ${unique}`);
    await page.getByLabel('Valor', { exact: true }).fill('1000');
    for (const [field, id] of [['tipo_material_id', 1], ['estado_item_id', 1], ['ambiente_id', ambienteId], ['responsavel_id', 1]]) {
      await page.getByTestId(`patrimonios-form-field-${field}-trigger`).click();
      await page.getByTestId(`patrimonios-form-field-${field}-option-${id}`).click();
    }
    for (const width of [320, 375, 414, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(page.getByRole('button', { name: 'Salvar', exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`cadastro-bem-${papel}-${width}.png`), fullPage: true });
    }
    const created = page.waitForResponse(r => r.url() === `${API_URL}/api/patrimonios` && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    const response = await created;
    expect(response.status()).toBe(201);
    const { id } = await response.json();
    await page.getByTestId(`patrimonio-card-${id}-open`).click();
    await expect(page.getByTestId(`patrimonio-card-${id}-detail`)).toBeVisible();
    await page.getByRole('button', { name: 'Fechar', exact: true }).click();
    await page.getByTestId(`patrimonio-card-${id}-edit`).click();
    await page.getByLabel('Descrição', { exact: true }).fill(`Notebook revisado ${unique}`);
    const updated = page.waitForResponse(r => r.url() === `${API_URL}/api/patrimonios/${id}` && r.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    expect((await updated).status()).toBe(200);
    await page.getByTestId(`patrimonio-card-${id}-delete`).click();
    const deleted = page.waitForResponse(r => r.url() === `${API_URL}/api/patrimonios/${id}` && r.request().method() === 'DELETE');
    await page.getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
    expect((await deleted).status()).toBe(204);
    await page.goto('/ambientes');
    await page.getByTestId(`ambiente-card-${ambienteId}-edit`).click();
    await page.getByLabel('Nome do ambiente', { exact: true }).fill(`${nome} revisado`);
    const updatedAmb = page.waitForResponse(r => r.url() === `${API_URL}/api/ambientes/${ambienteId}` && r.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    expect((await updatedAmb).status()).toBe(200);
    await page.getByTestId(`ambiente-card-${ambienteId}-delete`).click();
    const deletedAmb = page.waitForResponse(r => r.url() === `${API_URL}/api/ambientes/${ambienteId}` && r.request().method() === 'DELETE');
    await page.getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
    expect((await deletedAmb).status()).toBe(204);
  });
}

test('app: Conferente consulta e inspeciona bens e ambientes sem edição', async ({ page }) => {
  await loginMobile(page, 'conferente');
  for (const [path, card] of [['patrimonios', 'patrimonio'], ['ambientes', 'ambiente']]) {
    await page.goto(`/${path}`);
    await expect(page.getByTestId(`${path}-fab`)).toBeDisabled();
    const first = page.getByTestId(new RegExp(`^${card}-card-\\d+$`)).first();
    await expect(first).toBeVisible();
    const id = await first.getAttribute('data-testid');
    await expect(page.getByTestId(`${id}-edit`)).toBeDisabled();
    await expect(page.getByTestId(`${id}-delete`)).toBeDisabled();
    await page.getByTestId(`${id}-open`).click();
    await expect(page.getByTestId(`${id}-detail`)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  }
});
