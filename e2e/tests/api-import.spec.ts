import { expect, test } from '@playwright/test';
import { API_URL } from '../playwright.config';
import { apiHeaders } from '../support/helpers';

const CABECALHO = 'numero_patrimonio;descricao;valor;tipo_material;estado_item;ambiente;responsavel';
const csv = (linhas: string[]) => `${CABECALHO}\n${linhas.join('\n')}`;
const LINHA = (numero: string) =>
  `${numero};Bem importado E2E;1234,56;Equipamento de Informática;Em condições;Biblioteca;Ana Beatriz Souza`;

test.describe('Importação de patrimônios por CSV', () => {
  test('preview e confirmação atômica com idempotência', async ({ request }) => {
    const gestor = await apiHeaders(request);
    const conteudo = csv([LINHA('E2E-IMP-001'), LINHA('E2E-IMP-002')]);

    const preview = await request.post(`${API_URL}/api/patrimonios/importacao/preview`, {
      headers: gestor, multipart: { arquivo: { name: 'bens.csv', mimeType: 'text/csv', buffer: Buffer.from(conteudo, 'utf8') } },
    });
    expect(preview.status()).toBe(200);
    expect(await preview.json()).toMatchObject({ total_linhas: 2, validas: 2, invalidas: 0 });

    const primeira = await request.post(`${API_URL}/api/patrimonios/importacao/confirmar`, {
      headers: gestor, multipart: { arquivo: { name: 'bens.csv', mimeType: 'text/csv', buffer: Buffer.from(conteudo, 'utf8') } },
    });
    expect(primeira.status()).toBe(201);
    expect(await primeira.json()).toMatchObject({ inseridos: 2, existentes: 0 });

    const repetida = await request.post(`${API_URL}/api/patrimonios/importacao/confirmar`, {
      headers: gestor, multipart: { arquivo: { name: 'bens.csv', mimeType: 'text/csv', buffer: Buffer.from(conteudo, 'utf8') } },
    });
    expect(repetida.status()).toBe(201);
    expect(await repetida.json()).toMatchObject({ inseridos: 0, existentes: 2 });
  });

  test('linha com catálogo inexistente recusa o lote inteiro (422)', async ({ request }) => {
    const gestor = await apiHeaders(request);
    const conteudo = csv([LINHA('E2E-IMP-010'), 'E2E-IMP-011;Bem ruim;1;Catálogo Fantasma;Em condições;Biblioteca;Ana Beatriz Souza']);
    const res = await request.post(`${API_URL}/api/patrimonios/importacao/confirmar`, {
      headers: gestor, multipart: { arquivo: { name: 'bens.csv', mimeType: 'text/csv', buffer: Buffer.from(conteudo, 'utf8') } },
    });
    expect(res.status()).toBe(422);
    const corpo = await res.json();
    expect(corpo.codigo).toBe('importacao_invalida');
    expect(JSON.stringify(corpo.importacao.erros)).toMatch(/Catálogo Fantasma/);
  });

  test('RBAC: conferente e responsável não importam', async ({ request }) => {
    for (const email of ['conferente@zelium.com', 'responsavel@zelium.com']) {
      const auth = await apiHeaders(request, email);
      const res = await request.post(`${API_URL}/api/patrimonios/importacao/preview`, {
        headers: auth, multipart: { arquivo: { name: 'bens.csv', mimeType: 'text/csv', buffer: Buffer.from(csv([LINHA('X-1')]), 'utf8') } },
      });
      expect(res.status()).toBe(403);
    }
  });
});
