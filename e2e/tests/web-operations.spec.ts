import { randomUUID } from 'node:crypto';
import { test, expect } from '../support/fixtures';
import { API_URL } from '../playwright.config';
import { apiHeaders, loginWeb } from '../support/helpers';
import { createPatrimonio } from '../support/data';

for (const papel of ['gestor', 'responsavel'] as const) {
  test(`web: ${papel} cadastra, inspeciona, edita e exclui ambiente e patrimônio`, async ({ page }) => {
    const unique = randomUUID().slice(0, 8);
    const ambiente = `Sala E2E ${unique}`;
    const numero = `E2E-${unique}`;
    await loginWeb(page, papel);
    await page.goto('/ambientes');
    await page.getByRole('link', { name: 'Novo Ambiente', exact: true }).click();
    await page.getByLabel('Nome do Ambiente *', { exact: true }).fill(ambiente);
    await page.getByLabel('Responsável pelo Ambiente *', { exact: true }).selectOption('1');
    const createdAmb = page.waitForResponse(r => r.url() === `${API_URL}/api/ambientes` && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Cadastrar Ambiente', exact: true }).click();
    const ambResponse = await createdAmb;
    expect(ambResponse.status()).toBe(201);
    const { id: ambienteId } = await ambResponse.json();
    await expect(page.getByRole('row').filter({ hasText: ambiente })).toBeVisible();
    await page.getByRole('link', { name: `Inspecionar ambiente ${ambiente}`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/ambientes/${ambienteId}$`));
    await expect(page.getByText(ambiente, { exact: true }).first()).toBeVisible();
    await page.goto('/patrimonios');
    await page.getByRole('link', { name: 'Novo Patrimônio', exact: true }).click();
    await page.getByLabel('Número do Patrimônio *', { exact: true }).fill(numero);
    await page.getByLabel('Descrição *', { exact: true }).fill(`Notebook ${unique}`);
    await page.getByLabel('Valor (R$) *', { exact: true }).fill('1000');
    await page.getByLabel('Tipo de Material *', { exact: true }).selectOption('1');
    await page.getByLabel('Estado do Item *', { exact: true }).selectOption('1');
    await page.getByLabel('Ambiente *', { exact: true }).selectOption(String(ambienteId));
    await page.getByLabel('Responsável *', { exact: true }).selectOption('1');
    const created = page.waitForResponse(r => r.url() === `${API_URL}/api/patrimonios` && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Cadastrar Patrimônio', exact: true }).click();
    const bemResponse = await created;
    expect(bemResponse.status()).toBe(201);
    const { id } = await bemResponse.json();
    const row = page.getByRole('row').filter({ hasText: numero });
    await row.getByRole('link', { name: `Inspecionar patrimônio ${numero}`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/patrimonios/${id}$`));
    await expect(page.getByText(`Notebook ${unique}`, { exact: true }).first()).toBeVisible();
    await page.goto('/patrimonios');
    await page.getByRole('link', { name: `Editar ${numero}`, exact: true }).click();
    await expect(page.getByLabel('Descrição *', { exact: true })).toHaveValue(`Notebook ${unique}`);
    await page.getByLabel('Descrição *', { exact: true }).fill(`Notebook revisado ${unique}`);
    await page.getByRole('button', { name: 'Salvar Alterações', exact: true }).click();
    await expect(page.getByRole('row').filter({ hasText: `Notebook revisado ${unique}` })).toBeVisible();
    page.once('dialog', dialog => dialog.accept());
    const deleted = page.waitForResponse(r => r.url() === `${API_URL}/api/patrimonios/${id}` && r.request().method() === 'DELETE');
    await page.getByRole('button', { name: `Excluir ${numero}`, exact: true }).click();
    expect((await deleted).status()).toBe(204);
    await expect(page.getByRole('row').filter({ hasText: numero })).toHaveCount(0);
    await page.goto('/ambientes');
    await page.getByRole('link', { name: `Editar ${ambiente}`, exact: true }).click();
    await expect(page.getByLabel('Nome do Ambiente *', { exact: true })).toHaveValue(ambiente);
    await page.getByLabel('Nome do Ambiente *', { exact: true }).fill(`${ambiente} revisada`);
    await page.getByRole('button', { name: 'Salvar Alterações', exact: true }).click();
    await expect(page.getByRole('row').filter({ hasText: `${ambiente} revisada` })).toBeVisible();
    page.once('dialog', dialog => dialog.accept());
    const deletedAmb = page.waitForResponse(r => r.url() === `${API_URL}/api/ambientes/${ambienteId}` && r.request().method() === 'DELETE');
    await page.getByRole('button', { name: `Excluir ${ambiente} revisada`, exact: true }).click();
    expect((await deletedAmb).status()).toBe(204);
  });
}

test('web: Conferente inspeciona sem acesso aos formulários operacionais', async ({ page }) => {
  await loginWeb(page, 'conferente');
  for (const path of ['patrimonios', 'ambientes']) {
    await page.goto(`/${path}`);
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('link', { name: /^Editar / })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Excluir / })).toHaveCount(0);
    await page.goto(`/${path}/novo`);
    await expect(page.getByRole('heading', { name: 'Acesso restrito', exact: true })).toBeVisible();
  }
});

for (const papel of ['gestor', 'responsavel', 'conferente'] as const) {
  test(`web: ${papel} abre solicitação e respeita gestão de status`, async ({ page, request }) => {
    const headers = await apiHeaders(request);
    const bem = await createPatrimonio(request, headers);
    await loginWeb(page, papel);
    await page.goto('/solicitacoes');
    await page.getByLabel('Patrimônio da solicitação', { exact: true }).selectOption(String(bem.id));
    await page.getByLabel('Descrição da solicitação', { exact: true }).fill(`Manutenção ${bem.numero_patrimonio}`);
    const created = page.waitForResponse(r => r.url() === `${API_URL}/api/solicitacoes` && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Abrir solicitação', exact: true }).click();
    const response = await created;
    expect(response.status()).toBe(201);
    const { id } = await response.json();
    const status = page.getByLabel(`Alterar status da solicitacao ${id}`, { exact: true });
    await expect(status).toHaveValue('aberta');
    if (papel === 'conferente') {
      await expect(status).toBeDisabled();
      await expect(page.getByRole('button', { name: `Iniciar solicitacao ${id}`, exact: true })).toBeDisabled();
    } else {
      for (const [action, expected] of [['Iniciar', 'em_andamento'], ['Concluir', 'concluida']] as const) {
        const changed = page.waitForResponse(r => r.url() === `${API_URL}/api/solicitacoes/${id}/status` && r.request().method() === 'PATCH');
        await page.getByRole('button', { name: `${action} solicitacao ${id}`, exact: true }).click();
        expect((await changed).status()).toBe(200);
        await expect(status).toHaveValue(expected);
      }
    }
    await page.getByRole('link', { name: `Inspecionar solicitação ${id}`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/solicitacoes/${id}$`));
    await expect(page.getByText(`Manutenção ${bem.numero_patrimonio}`, { exact: true }).first()).toBeVisible();
  });
}
