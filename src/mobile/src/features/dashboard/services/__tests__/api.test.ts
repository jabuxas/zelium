import { apiClient } from '@/src/shared/api/client';
import { getDashboardData } from '../api';

jest.mock('@/src/shared/api/client', () => ({ apiClient: jest.fn() }));

it('mantém os indicadores se a auditoria estiver indisponível', async () => {
  (apiClient as jest.Mock).mockImplementation(async (path: string) => {
    if (path.startsWith('/audit-log')) throw new Error('Acesso negado');
    return path === '/patrimonios' ? [{ id: 1, estado_item_id: 1 }] : [];
  });
  const dashboard = await getDashboardData();
  expect(dashboard.stats.totalPatrimonios).toBe(1);
  expect(dashboard.recentLogs).toEqual([]);
  expect(dashboard.atividadesIndisponiveis).toBe(true);
});
