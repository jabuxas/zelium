import { apiClient } from '@/src/shared/api/client';
import { getDashboardData } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@/src/shared/api/client', () => ({ apiClient: jest.fn() }));

it('conta avarias pela configuração do estado, inclusive estados personalizados', async () => {
  (apiClient as jest.Mock).mockImplementation(async (path: string) => {
    if (path === '/patrimonios') return [1, 2, 3, 4, 42, 99].map(estado_item_id => ({ estado_item_id }));
    if (path === '/estados-item') return [
      { id: 1, avaria: false }, { id: 2, avaria: false }, { id: 3, avaria: true },
      { id: 4, avaria: true }, { id: 42, avaria: true },
    ];
    if (path === '/conferentes') return [{ id: 1 }, { id: 2 }];
    return [];
  });
  const { stats } = await getDashboardData();
  expect(stats.alertasAvaria).toBe(3);
  expect(stats.totalConferentes).toBe(2);
});

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

it('dados atuais não dependem da gravação do cache', async () => {
  (apiClient as jest.Mock).mockImplementation(async (path: string) => path.startsWith('/audit-log') ? [] : [{ estado_item_id: 1 }]);
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Disco cheio'));
  const dashboard = await getDashboardData();
  expect(dashboard.stats.totalPatrimonios).toBe(1);
});
