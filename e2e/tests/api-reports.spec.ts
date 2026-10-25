import { test, expect } from '@playwright/test';
import { API_URL } from '../playwright.config';
import { apiHeaders } from '../support/helpers';
import { createPatrimonio } from '../support/data';

for (const papel of ['gestor', 'responsavel'] as const) {
  test(`${papel}: relatórios e arquivos CSV/PDF usam dados reais e filtros`, async ({ request }) => {
    const headers = await apiHeaders(request, `${papel}@zelium.com`);
    const bem = await createPatrimonio(request, headers);
    const query = new URLSearchParams({ busca: bem.numero_patrimonio });
    const list = await request.get(`${API_URL}/api/relatorios/patrimonios?${query}`, { headers });
    expect(list.status()).toBe(200);
    expect((await list.json()).map((item: { id: number }) => item.id)).toEqual([bem.id]);
    const csv = await request.get(`${API_URL}/api/relatorios/exportar/csv?tipo=patrimonios&${query}`, { headers });
    expect(csv.status()).toBe(200);
    expect(csv.headers()['content-type']).toContain('text/csv');
    expect(csv.headers()['content-disposition']).toContain('.csv');
    expect(await csv.text()).toContain('numero_patrimonio');
    expect(await csv.text()).toContain(bem.numero_patrimonio);
    const pdf = await request.get(`${API_URL}/api/relatorios/exportar/pdf?tipo=patrimonios&${query}`, { headers });
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()['content-type']).toContain('application/pdf');
    const bytes = await pdf.body();
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(bytes.subarray(-20).toString()).toContain('%%EOF');
    for (const group of ['por-ambiente', 'por-responsavel', 'por-estado']) {
      const res = await request.get(`${API_URL}/api/relatorios/${group}`, { headers });
      expect(res.status()).toBe(200);
      expect((await res.json()).some((item: { total_itens: number }) => item.total_itens > 0)).toBe(true);
    }
  });
}

test('financeiro e depreciação respeitam o residual; relatórios não cruzam organizações', async ({ request }) => {
  const headers = await apiHeaders(request);
  const bem = await createPatrimonio(request, headers, { data_aquisicao: '2000-01-01', vida_util_anos: 5, valor_residual: 100 });
  const detalhe = await request.get(`${API_URL}/api/patrimonios/${bem.id}/depreciacao`, { headers });
  expect(detalhe.status()).toBe(200);
  expect(await detalhe.json()).toMatchObject({ valor_aquisicao: 1000, valor_contabil_atual: 100, depreciacao_acumulada: 900 });
  const financeiro = await request.get(`${API_URL}/api/relatorios/financeiro`, { headers });
  expect(financeiro.status()).toBe(200);
  expect((await financeiro.json()).total.valor_aquisicao).toBeGreaterThanOrEqual(1000);
  const outra = await apiHeaders(request, 'gestor.b@e2e.local');
  expect((await request.get(`${API_URL}/api/patrimonios/${bem.id}/depreciacao`, { headers: outra })).status()).toBe(404);
  for (const group of ['patrimonios', 'por-ambiente', 'por-responsavel', 'por-estado']) {
    const res = await request.get(`${API_URL}/api/relatorios/${group}`, { headers: outra });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual([]);
  }
  const vazio = await request.get(`${API_URL}/api/relatorios/financeiro`, { headers: outra });
  expect(vazio.status()).toBe(200);
  expect((await vazio.json()).total).toMatchObject({ total_itens: 0, valor_aquisicao: 0 });
});

test('nega relatórios ao Conferente e financeiro ao Responsável, inclusive exports', async ({ request }) => {
  const conf = await apiHeaders(request, 'conferente@zelium.com');
  const resp = await apiHeaders(request, 'responsavel@zelium.com');
  for (const path of ['patrimonios', 'por-ambiente', 'por-responsavel', 'por-estado', 'financeiro', 'exportar/csv?tipo=patrimonios', 'exportar/pdf?tipo=patrimonios']) {
    expect((await request.get(`${API_URL}/api/relatorios/${path}`, { headers: conf })).status()).toBe(403);
  }
  for (const path of ['financeiro', 'exportar/csv?tipo=financeiro', 'exportar/pdf?tipo=financeiro']) {
    expect((await request.get(`${API_URL}/api/relatorios/${path}`, { headers: resp })).status()).toBe(403);
  }
  expect((await request.get(`${API_URL}/api/relatorios/patrimonios`)).status()).toBe(401);
  expect((await request.get(`${API_URL}/api/relatorios/exportar/csv?tipo=invalido`, { headers: resp })).status()).toBe(400);
});

test('Gestor exporta financeiro CSV/PDF no runtime real, com totais da própria organização', async ({ request }) => {
  for (const email of ['gestor@zelium.com', 'gestor.b@e2e.local']) {
    const headers = await apiHeaders(request, email);
    const resumo = await request.get(`${API_URL}/api/relatorios/financeiro`, { headers });
    expect(resumo.status()).toBe(200);
    const { total } = await resumo.json();
    const csv = await request.get(`${API_URL}/api/relatorios/exportar/csv?tipo=financeiro`, { headers });
    expect(csv.status()).toBe(200);
    const linhas = (await csv.text()).trim().split('\r\n');
    expect(linhas[0]).toContain('valor_contabil');
    expect(linhas.at(-1)!.split(';')).toEqual(['TOTAL', String(total.total_itens), String(total.valor_aquisicao), String(total.depreciacao_acumulada), String(total.valor_contabil)]);
    const pdf = await request.get(`${API_URL}/api/relatorios/exportar/pdf?tipo=financeiro`, { headers });
    expect(pdf.status()).toBe(200);
    expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
  }
});
