import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { API_URL } from '../playwright.config';
import { apiHeaders } from '../support/helpers';

const catalogs = [
  { path: 'tipo-material', table: 'tipo_material', extra: {} },
  { path: 'estados-item', table: 'estado_item', extra: { descricao: 'Estado exclusivo de teste', avaria: true } },
  { path: 'responsaveis', table: 'responsavel', extra: { email: `resp-${randomUUID()}@e2e.local` } },
  { path: 'conferentes', table: 'conferente', extra: { email: `conf-${randomUUID()}@e2e.local` } },
  { path: 'fornecedores', table: 'fornecedor', extra: { cnpj: `99${String(Date.now()).slice(-12)}` } },
];

for (const catalog of catalogs) {
  test(`${catalog.path}: Gestor cadastra, edita, arquiva e restaura; demais perfis consultam`, async ({ request }) => {
    const gestor = await apiHeaders(request);
    const outra = await apiHeaders(request, 'gestor.b@e2e.local');
    const nome = `E2E ${randomUUID().slice(0, 8)} ${catalog.path}`;
    const base = `${API_URL}/api/${catalog.path}`;
    const payload = { nome, ...catalog.extra };
    const forged = await request.post(base, { headers: gestor, data: { ...payload, organizacao_id: 2 } });
    expect(forged.status()).toBe(400);
    const created = await request.post(base, { headers: gestor, data: payload });
    expect(created.status()).toBe(201);
    const item = await created.json();
    expect(item.nome).toBe(nome);
    const url = `${base}/${item.id}`;
    expect((await request.get(url, { headers: outra })).status()).toBe(404);
    for (const papel of ['responsavel', 'conferente']) {
      const headers = await apiHeaders(request, `${papel}@zelium.com`);
      const list = await request.get(base, { headers });
      expect(list.status()).toBe(200);
      expect((await list.json()).map((row: { id: number }) => row.id)).toContain(item.id);
      expect((await request.get(url, { headers })).status()).toBe(200);
      expect((await request.post(base, { headers, data: payload })).status()).toBe(403);
      expect((await request.put(url, { headers, data: { nome: 'Não autorizado' } })).status()).toBe(403);
      expect((await request.delete(url, { headers })).status()).toBe(403);
      expect((await request.patch(`${url}/restaurar`, { headers })).status()).toBe(403);
      expect((await request.get(`${API_URL}/api/audit-log?tabela=${catalog.table}`, { headers })).status()).toBe(400);
    }
    const updated = await request.put(url, { headers: gestor, data: { ...payload, nome: `${nome} editado` } });
    expect(updated.status()).toBe(200);
    expect((await updated.json()).nome).toBe(`${nome} editado`);
    expect((await request.delete(url, { headers: gestor })).status()).toBe(204);
    expect((await request.get(url, { headers: gestor })).status()).toBe(404);
    const archived = await request.get(`${base}/deletados`, { headers: gestor });
    expect(archived.status()).toBe(200);
    expect((await archived.json()).map((row: { id: number }) => row.id)).toContain(item.id);
    expect((await request.patch(`${url}/restaurar`, { headers: outra })).status()).toBe(404);
    expect((await request.patch(`${url}/restaurar`, { headers: gestor })).status()).toBe(200);
    expect((await request.get(url, { headers: gestor })).status()).toBe(200);
    const audit = await request.get(`${API_URL}/api/audit-log?tabela=${catalog.table}&registro_id=${item.id}`, { headers: gestor });
    expect(audit.status()).toBe(200);
    expect((await audit.json()).data.map((event: { acao: string }) => event.acao)).toEqual(expect.arrayContaining(['CREATE', 'UPDATE', 'DELETE', 'RESTORE']));
  });
}
