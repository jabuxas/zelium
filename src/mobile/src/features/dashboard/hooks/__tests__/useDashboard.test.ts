import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDashboard } from '../useDashboard';
import { getDashboardData } from '../../services/api';

let mockUsuario = { id: 1, organizacaoId: 1 };
jest.mock('@/src/shared/auth/AuthContext', () => ({ useAuth: () => ({ usuario: mockUsuario }) }));
jest.mock('../../services/api', () => ({ getDashboardData: jest.fn() }));
const statsA = { totalPatrimonios: 99, totalAmbientes: 2, totalConferentes: 3, alertasAvaria: 1 };
const statsB = { ...statsA, totalPatrimonios: 5 };
const data = (stats = statsA) => ({ stats, recentLogs: [], atividadesIndisponiveis: false });

beforeEach(async () => {
  jest.clearAllMocks();
  (getDashboardData as jest.Mock).mockReset();
  await AsyncStorage.clear();
  mockUsuario = { id: 1, organizacaoId: 1 };
});

it('não lê indicadores do cache global legado de outra conta', async () => {
  await AsyncStorage.setItem('@zelium:dashboard_stats', JSON.stringify(statsA));
  (getDashboardData as jest.Mock).mockRejectedValue(new Error('Offline'));
  mockUsuario = { id: 2, organizacaoId: 2 };
  const { result } = renderHook(useDashboard);
  await act(async () => { await result.current.load(); });
  expect(result.current.stats).toBeNull();
  expect(result.current.error).toBe(true);
});

it('falha de rede e armazenamento mostra erro recuperável, não contadores zero', async () => {
  (getDashboardData as jest.Mock).mockRejectedValue(new Error('Offline'));
  (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Disco indisponível'));
  const { result } = renderHook(useDashboard);
  await act(async () => { await result.current.load().catch(() => undefined); });
  expect(result.current.error).toBe(true);
  expect(result.current.loading).toBe(false);
});

it('ignora resposta tardia de uma conta anterior', async () => {
  let concluirA!: (value: ReturnType<typeof data>) => void;
  (getDashboardData as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { concluirA = resolve; })).mockResolvedValueOnce(data(statsB));
  const { result, rerender } = renderHook(useDashboard);
  let antiga!: Promise<void>;
  act(() => { antiga = result.current.load(); });
  mockUsuario = { id: 2, organizacaoId: 2 };
  rerender({});
  await act(async () => { await result.current.load(); });
  await act(async () => { concluirA(data()); await antiga; });
  expect(result.current.stats).toEqual(statsB);
});

it('recupera apenas o cache da conta e organização atuais, com aviso', async () => {
  await AsyncStorage.setItem('@zelium:dashboard:v2:1:1', JSON.stringify(statsA));
  await AsyncStorage.setItem('@zelium:dashboard:v2:2:2', JSON.stringify(statsB));
  (getDashboardData as jest.Mock).mockRejectedValue(new Error('Offline'));
  mockUsuario = { id: 2, organizacaoId: 2 };
  const { result } = renderHook(useDashboard);
  await act(async () => { await result.current.load(); });
  expect(result.current.stats).toEqual(statsB);
  expect(result.current.dadosEmCache).toBe(true);
});

it('cache corrompido resulta em erro recuperável', async () => {
  await AsyncStorage.setItem('@zelium:dashboard:v2:1:1', 'JSON inválido');
  (getDashboardData as jest.Mock).mockRejectedValue(new Error('Offline'));
  const { result } = renderHook(useDashboard);
  await act(async () => { await result.current.load(); });
  expect(result.current.error).toBe(true);
});

it('falha ao salvar cache preserva os indicadores novos', async () => {
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Disco cheio'));
  (getDashboardData as jest.Mock).mockResolvedValue(data(statsB));
  const { result } = renderHook(useDashboard);
  await act(async () => { await result.current.load(); });
  expect(result.current.stats).toEqual(statsB);
  expect(result.current.error).toBe(false);
});

it('esconde dados anteriores imediatamente ao trocar de conta', async () => {
  (getDashboardData as jest.Mock).mockResolvedValue(data());
  const { result, rerender } = renderHook(useDashboard);
  await act(async () => { await result.current.load(); });
  mockUsuario = { id: 2, organizacaoId: 2 };
  rerender({});
  expect(result.current.stats).toBeNull();
  expect(result.current.logs).toEqual([]);
});
