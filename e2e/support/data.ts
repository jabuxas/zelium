import { randomUUID } from 'node:crypto';
import { expect, type APIRequestContext } from '@playwright/test';
import { API_URL } from '../playwright.config';

export async function createPatrimonio(request: APIRequestContext, headers: Record<string, string>, overrides: Record<string, unknown> = {}) {
  const response = await request.post(`${API_URL}/api/patrimonios`, { headers, data: {
    numero_patrimonio: `E2E-${randomUUID()}`, descricao: 'Bem exclusivo do teste', valor: 1000,
    tipo_material_id: 1, estado_item_id: 1, ambiente_id: 1, responsavel_id: 1, ...overrides,
  } });
  expect(response.status()).toBe(201);
  return await response.json() as { id: number; numero_patrimonio: string; descricao: string };
}
