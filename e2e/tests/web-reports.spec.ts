import { readFile } from 'node:fs/promises';
import { test, expect } from '../support/fixtures';
import { API_URL } from '../playwright.config';
import { apiHeaders, loginWeb } from '../support/helpers';
import { createPatrimonio } from '../support/data';

for (const papel of ['gestor', 'responsavel'] as const) {
  test(`web: ${papel} consulta relatórios e baixa CSV/PDF pelos controles`, async ({ page, request }) => {
    const headers = await apiHeaders(request);
    const bem = await createPatrimonio(request, headers);
    await loginWeb(page, papel);
    await page.goto('/relatorios');
    await expect(page.getByRole('heading', { name: 'Relatórios', exact: true })).toBeVisible();
    const sections = [
      ['Relatório por Ambiente', 'por-ambiente'],
      ['Relatório por Responsável', 'por-responsavel'],
      ['Relatório por Estado', 'por-estado'],
      ['Patrimônios', 'patrimonios'],
    ] as const;
    await page.getByLabel('Buscar por número ou descrição', { exact: true }).fill(bem.numero_patrimonio);
    const patrimonioSection = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Patrimônios', exact: true }) });
    await expect(patrimonioSection.locator('tbody tr')).toHaveCount(1);
    await expect(patrimonioSection.getByRole('cell', { name: bem.numero_patrimonio, exact: true })).toBeVisible();
    for (const [heading, tipo] of sections) {
      const section = page.locator('section').filter({ has: page.getByRole('heading', { name: heading, exact: true }) });
      await expect(section.locator('tbody tr').first()).toBeVisible();
      await expect(section.getByText('Nenhum dado encontrado.', { exact: true })).toHaveCount(0);
      for (const format of ['csv', 'pdf']) {
        const response = page.waitForResponse(r => r.url().includes(`/api/relatorios/exportar/${format}?`) && new URL(r.url()).searchParams.get('tipo') === tipo);
        const downloaded = page.waitForEvent('download');
        await section.getByRole('button', { name: format.toUpperCase(), exact: true }).click();
        const res = await response;
        expect(res.status()).toBe(200);
        if (tipo === 'patrimonios') expect(new URL(res.url()).searchParams.get('busca')).toBe(bem.numero_patrimonio);
        const download = await downloaded;
        expect(await download.failure()).toBeNull();
        expect(download.suggestedFilename()).toMatch(new RegExp(`^relatorio-${tipo}-.*\\.${format}$`));
        const bytes = await readFile((await download.path())!);
        if (format === 'pdf') {
          expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
          expect(bytes.subarray(-20).toString()).toContain('%%EOF');
        } else if (tipo === 'patrimonios') {
          expect(bytes.toString()).toContain(bem.numero_patrimonio);
          expect(bytes.toString()).not.toContain('2024/001');
        } else expect(bytes.toString()).toContain('total_itens');
      }
    }
  });
}

test('web: Gestor consulta financeiro e exporta CSV', async ({ page }) => {
  await loginWeb(page);
  await page.goto('/financeiro');
  await expect(page.getByRole('heading', { name: 'Financeiro', exact: true })).toBeVisible();
  await expect(page.getByText('Valor contábil atual', { exact: true })).toBeVisible();
  await expect(page.getByRole('table').locator('tbody tr').first()).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar CSV', exact: true }).click();
  const download = await downloaded;
  expect(await download.failure()).toBeNull();
  expect(download.suggestedFilename()).toMatch(/^relatorio-financeiro-.*\.csv$/);
  const csv = await readFile((await download.path())!, 'utf8');
  expect(csv).toContain('valor_contabil');
  expect(csv).toContain('depreciacao_acumulada');
});

for (const papel of ['responsavel', 'conferente'] as const) {
  test(`web: ${papel} não acessa relatórios além de sua permissão`, async ({ page }) => {
    await loginWeb(page, papel);
    const paths = papel === 'conferente' ? ['/relatorios', '/financeiro'] : ['/financeiro'];
    for (const path of paths) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'Acesso restrito', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: /CSV|PDF/ })).toHaveCount(0);
    }
  });
}
