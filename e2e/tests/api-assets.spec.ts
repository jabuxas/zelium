import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { API_URL } from '../playwright.config';
import { apiHeaders } from '../support/helpers';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const foto = { name: 'bem.png', mimeType: 'image/png', buffer: png };

test('foto exige sessão e a organização correta, inclusive após arquivar o bem', async ({ request }) => {
  const headers = await apiHeaders(request);
  const outra = await apiHeaders(request, 'gestor.b@e2e.local');
  const criado = await request.post(`${API_URL}/api/patrimonios`, { headers, data: {
    numero_patrimonio: `E2E-${randomUUID()}`, descricao: 'Bem para foto privada', valor: 100,
    tipo_material_id: 1, estado_item_id: 1, ambiente_id: 1, responsavel_id: 1,
  } });
  expect(criado.status()).toBe(201);
  const patrimonio = await criado.json();
  const upload = await request.post(`${API_URL}/api/patrimonios/${patrimonio.id}/fotos`, { headers, multipart: { foto } });
  expect(upload.status()).toBe(201);
  const registro = await upload.json();
  expect((await request.get(`${API_URL}${registro.url}`)).status()).toBe(401);
  expect((await request.get(`${API_URL}${registro.url}`, { headers })).status()).toBe(200);
  expect((await request.get(`${API_URL}${registro.url}`, { headers: outra })).status()).toBe(404);
  expect((await request.delete(`${API_URL}/api/patrimonios/${patrimonio.id}`, { headers })).status()).toBe(204);
  expect((await request.get(`${API_URL}${registro.url}`, { headers })).status()).toBe(404);
});

test('MIME declarado não transforma HTML em imagem válida', async ({ request }) => {
  const headers = await apiHeaders(request);
  const res = await request.post(`${API_URL}/api/patrimonios/1/fotos`, {
    headers, multipart: { foto: { ...foto, name: 'falsa.png', buffer: Buffer.from('<html><script>alert(1)</script></html>') } },
  });
  expect(res.status()).toBe(400);
});
