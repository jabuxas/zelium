import { randomUUID } from 'node:crypto';
import { test, expect } from '../support/fixtures';
import { API_URL } from '../playwright.config';
import { apiHeaders, loginMobile } from '../support/helpers';

test('app carrega miniatura e detalhes de uma foto privada sem token na URL', async ({ page, request }) => {
  const headers = await apiHeaders(request);
  const criado = await request.post(`${API_URL}/api/patrimonios`, { headers, data: {
    numero_patrimonio: `E2E-${randomUUID()}`, descricao: 'Foto privada no aplicativo', valor: 100,
    tipo_material_id: 1, estado_item_id: 1, ambiente_id: 1, responsavel_id: 1,
  } });
  expect(criado.status()).toBe(201);
  const patrimonio = await criado.json();
  const res = await request.post(`${API_URL}/api/patrimonios/${patrimonio.id}/fotos`, { headers, multipart: {
    foto: { name: 'bem.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64') },
  } });
  expect(res.status()).toBe(201);
  const foto = await res.json();
  await loginMobile(page);
  const download = page.waitForResponse(r => r.url() === `${API_URL}${foto.url}` && r.request().method() === 'GET');
  await page.goto('/patrimonios');
  expect((await download).status()).toBe(200);
  await expect(page.getByTestId(`patrimonio-card-${patrimonio.id}-thumbnail`).locator('img')).toHaveAttribute('src', /^blob:/);
  await page.getByTestId(`patrimonio-card-${patrimonio.id}-open`).click();
  await expect(page.getByTestId(`patrimonio-card-${patrimonio.id}-detail-image`).locator('img')).toHaveAttribute('src', /^blob:/);
});
