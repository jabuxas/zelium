import { test, expect } from '../support/fixtures';
import { apiHeaders, loginMobile } from '../support/helpers';
import { createPatrimonio } from '../support/data';
import { API_URL } from '../playwright.config';

for (const papel of ['gestor', 'responsavel', 'conferente'] as const) {
  test(`${papel}: confere manualmente sem câmera e persiste estado e observação`, async ({ page, request }, info) => {
    const headers = await apiHeaders(request);
    const bem = await createPatrimonio(request, headers);
    await loginMobile(page, papel);
    await page.getByRole('button', { name: 'Conferir patrimônio', exact: true }).click();
    await expect(page.locator('video')).toHaveCount(0);
    await page.getByLabel('Número de patrimônio', { exact: true }).fill('E2E-inexistente');
    await page.getByRole('button', { name: 'Buscar patrimônio', exact: true }).click();
    await expect(page.getByText('Patrimônio "E2E-inexistente" não encontrado', { exact: true })).toBeVisible();
    await page.getByLabel('Número de patrimônio', { exact: true }).fill(bem.numero_patrimonio);
    await page.getByRole('button', { name: 'Buscar patrimônio', exact: true }).click();
    await page.getByRole('button', { name: 'Em manutenção', exact: true }).click();
    await page.getByLabel('Observação (opcional)', { exact: true }).fill(`Conferência E2E ${papel}`);
    for (const width of [320, 375, 414, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await page.getByRole('button', { name: 'Registrar conferência', exact: true }).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`conferencia-${papel}-${width}.png`), fullPage: true });
    }
    await page.getByRole('button', { name: 'Registrar conferência', exact: true }).click();
    await expect(page.getByText('Conferência registrada com sucesso', { exact: true })).toBeVisible();
    const list = await request.get(`${API_URL}/api/patrimonios/${bem.id}/conferencias`, { headers });
    expect(list.status()).toBe(200);
    expect(await list.json()).toEqual([expect.objectContaining({ estado_item_id: 2, observacao: `Conferência E2E ${papel}` })]);
    const current = await request.get(`${API_URL}/api/patrimonios/${bem.id}`, { headers });
    expect((await current.json()).estado_item_id).toBe(2);
  });
}

test('falha de gravação mantém formulário e permite tentar novamente', async ({ page, request }) => {
  const headers = await apiHeaders(request);
  const bem = await createPatrimonio(request, headers);
  await loginMobile(page);
  await page.getByRole('button', { name: 'Conferir patrimônio', exact: true }).click();
  await page.getByLabel('Número de patrimônio', { exact: true }).fill(bem.numero_patrimonio);
  await page.getByRole('button', { name: 'Buscar patrimônio', exact: true }).click();
  await page.getByLabel('Observação (opcional)', { exact: true }).fill('Preservar esta observação');
  const endpoint = `${API_URL}/api/patrimonios/${bem.id}/conferencias`;
  await page.route(endpoint, route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Falha temporária de teste"}' }));
  await page.getByRole('button', { name: 'Registrar conferência', exact: true }).click();
  await expect(page.getByText('Erro ao registrar a conferência. Seus dados foram mantidos para tentar novamente.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Observação (opcional)', { exact: true })).toHaveValue('Preservar esta observação');
  await page.unroute(endpoint);
  await page.getByRole('button', { name: 'Registrar conferência', exact: true }).click();
  await expect(page.getByText('Conferência registrada com sucesso', { exact: true })).toBeVisible();
  expect(await (await request.get(endpoint, { headers })).json()).toHaveLength(1);
});

test('decodifica QR real com câmera simulada local e libera a captura após a leitura', async ({ page, request }) => {
  const headers = await apiHeaders(request);
  const bem = await createPatrimonio(request, headers);
  const response = await request.get(`${API_URL}/api/patrimonios/${bem.id}/qrcode`, { headers });
  expect(response.status()).toBe(200);
  const qrSvg = await response.text();
  await page.addInitScript(svg => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
      getUserMedia: async () => {
        const image = new Image();
        image.src = `data:image/svg+xml;base64,${btoa(svg)}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 512;
        canvas.getContext('2d')!.drawImage(image, 0, 0, 512, 512);
        const stream = canvas.captureStream(10);
        Object.assign(window, { e2eCameraTracks: stream.getTracks() });
        return stream;
      },
    } });
  }, qrSvg);
  await loginMobile(page);
  await page.getByRole('button', { name: 'Conferir patrimônio', exact: true }).click();
  await page.getByRole('button', { name: 'Ativar câmera', exact: true }).click();
  await expect(page.getByText(bem.numero_patrimonio, { exact: true })).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
  expect(await page.evaluate(() => (window as typeof window & { e2eCameraTracks: MediaStreamTrack[] }).e2eCameraTracks.every(track => track.readyState === 'ended'))).toBe(true);
});
