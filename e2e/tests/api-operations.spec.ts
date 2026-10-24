import { test, expect } from '@playwright/test';
import { API_URL } from '../playwright.config';
import { apiHeaders } from '../support/helpers';
import { createPatrimonio } from '../support/data';

for (const papel of ['gestor', 'responsavel', 'conferente'] as const) {
  test(`${papel}: consulta, confere e abre solicitação sem exceder permissões`, async ({ request }) => {
    const gestor = await apiHeaders(request);
    const headers = await apiHeaders(request, `${papel}@zelium.com`);
    const bem = await createPatrimonio(request, gestor);
    const url = `${API_URL}/api/patrimonios/${bem.id}`;
    expect((await request.get(url, { headers })).status()).toBe(200);
    const qr = await request.get(`${url}/qrcode`, { headers });
    expect(qr.status()).toBe(200);
    expect(qr.headers()['content-type']).toContain('image/svg+xml');
    expect(await qr.text()).toContain('<svg');
    const conferencia = await request.post(`${url}/conferencias`, { headers, data: { estado_item_id: 2, observacao: `Conferido por ${papel}` } });
    expect(conferencia.status()).toBe(201);
    const registro = await conferencia.json();
    expect(registro).toMatchObject({ patrimonio_id: bem.id, estado_item_id: 2, observacao: `Conferido por ${papel}` });
    expect((await (await request.get(url, { headers })).json()).estado_item_id).toBe(2);
    const historico = await request.get(`${url}/conferencias`, { headers });
    expect(historico.status()).toBe(200);
    expect((await historico.json()).some((item: { id: number }) => item.id === registro.id)).toBe(true);
    const solicitacao = await request.post(`${API_URL}/api/solicitacoes`, { headers, data: { patrimonio_id: bem.id, tipo: 'manutencao', descricao: 'Revisar item conferido' } });
    expect(solicitacao.status()).toBe(201);
    const pedido = await solicitacao.json();
    expect(pedido.status).toBe('aberta');
    const statusUrl = `${API_URL}/api/solicitacoes/${pedido.id}/status`;
    if (papel === 'conferente') {
      expect((await request.patch(statusUrl, { headers, data: { status: 'concluida' } })).status()).toBe(403);
      expect((await request.post(`${API_URL}/api/solicitacoes`, { headers, data: { patrimonio_id: bem.id, tipo: 'manutencao', status: 'concluida' } })).status()).toBe(403);
      expect((await request.put(url, { headers, data: { descricao: 'Não autorizado' } })).status()).toBe(403);
      expect((await request.delete(url, { headers })).status()).toBe(403);
    } else {
      for (const status of ['em_andamento', 'concluida']) {
        const res = await request.patch(statusUrl, { headers, data: { status } });
        expect(res.status()).toBe(200);
        expect((await res.json()).status).toBe(status);
      }
    }
    const log = await request.get(`${API_URL}/api/audit-log?tabela=patrimonio&registro_id=${bem.id}&relacionados=true&limit=100`, { headers });
    expect(log.status()).toBe(200);
    expect((await log.json()).data.map((item: { tabela: string }) => item.tabela)).toEqual(expect.arrayContaining(['patrimonio', 'conferencia', 'solicitacao']));
  });
}

test('patrimônio: arquiva, lista arquivados e restaura sem cruzar organizações', async ({ request }) => {
  const headers = await apiHeaders(request, 'responsavel@zelium.com');
  const outra = await apiHeaders(request, 'gestor.b@e2e.local');
  const bem = await createPatrimonio(request, headers);
  const url = `${API_URL}/api/patrimonios/${bem.id}`;
  for (const path of ['', '/qrcode', '/etiqueta', '/depreciacao']) {
    expect((await request.get(`${url}${path}`, { headers: outra })).status()).toBe(404);
  }
  expect((await request.put(url, { headers: outra, data: { descricao: 'Outra organização' } })).status()).toBe(404);
  expect((await request.delete(url, { headers: outra })).status()).toBe(404);
  expect((await request.delete(url, { headers })).status()).toBe(204);
  expect((await request.get(url, { headers })).status()).toBe(404);
  const archived = await request.get(`${API_URL}/api/patrimonios/deletados`, { headers });
  expect(archived.status()).toBe(200);
  expect((await archived.json()).map((item: { id: number }) => item.id)).toContain(bem.id);
  expect((await request.patch(`${url}/restaurar`, { headers: outra })).status()).toBe(404);
  expect((await request.patch(`${url}/restaurar`, { headers })).status()).toBe(200);
  expect((await request.get(url, { headers })).status()).toBe(200);
  const events = await request.get(`${API_URL}/api/audit-log?tabela=patrimonio&registro_id=${bem.id}`, { headers });
  expect(events.status()).toBe(200);
  expect((await events.json()).data.map((item: { acao: string }) => item.acao)).toEqual(expect.arrayContaining(['CREATE', 'DELETE', 'RESTORE']));
});
