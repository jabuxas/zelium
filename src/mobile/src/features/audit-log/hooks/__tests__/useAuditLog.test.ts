import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuditLog } from '../useAuditLog';

const mockPage = jest.fn();
jest.mock('@/src/features/audit-log/data/repository', () => ({
  AuditLogRepositoryImpl: jest.fn().mockImplementation(() => ({ page: (...args: unknown[]) => mockPage(...args) })),
}));

const event = { id: 1, acao: 'CREATE', recurso: 'patrimonio', recurso_id: 7, criado_em: '2026-01-01T10:00:00Z' };
const page = (currentPage = 1) => ({ total: 35, pages: 4, currentPage, limit: 10, data: [{ ...event, id: currentPage }] });

beforeEach(() => { mockPage.mockReset().mockImplementation(async params => page(params.page)); });

it('carrega a primeira página e os totais do servidor', async () => {
  const { result } = renderHook(useAuditLog);
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toEqual(page().data);
  expect(result.current.total).toBe(35);
  expect(result.current.pages).toBe(4);
  expect(mockPage).toHaveBeenCalledWith({ page: 1, limit: 10, operacional: true });
});

it('navega para a página seguinte sem repetir a primeira', async () => {
  const { result } = renderHook(useAuditLog);
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.setPage(2));
  await waitFor(() => expect(result.current.data[0]?.id).toBe(2));
  expect(result.current.page).toBe(2);
});

it.each([
  ['setSearchQuery', 'IFSC-007', 'busca'], ['setFilterUsuario', 'Ana', 'usuario'],
  ['setFilterAcao', 'UPDATE', 'acao'], ['setFilterRecurso', 'patrimonio', 'tabela'],
  ['setDe', '2026-01-01', 'de'], ['setAte', '2026-01-31', 'ate'],
] as const)('envia %s ao servidor e volta à primeira página ao aplicar', async (setter, value, key) => {
  const { result } = renderHook(useAuditLog);
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => result.current.setPage(2));
  await waitFor(() => expect(result.current.page).toBe(2));
  act(() => result.current[setter](value));
  act(() => result.current.applyFilters());
  await waitFor(() => expect(mockPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, [key]: value })));
});

it('combina filtros, permite auditoria completa e limpa a consulta', async () => {
  const { result } = renderHook(useAuditLog);
  await waitFor(() => expect(result.current.loading).toBe(false));
  act(() => {
    result.current.setFilterAcao('UPDATE'); result.current.setFilterRecurso('patrimonio');
    result.current.setOperacional(false); result.current.setSearchQuery('Notebook');
  });
  act(() => result.current.applyFilters());
  await waitFor(() => expect(mockPage).toHaveBeenLastCalledWith({ page: 1, limit: 10, operacional: false, acao: 'UPDATE', tabela: 'patrimonio', busca: 'Notebook' }));
  act(() => result.current.clearFilters());
  await waitFor(() => expect(mockPage).toHaveBeenLastCalledWith({ page: 1, limit: 10, operacional: true }));
  expect(result.current.searchQuery).toBe('');
});

it('mostra erro recuperável e tenta novamente a página solicitada', async () => {
  mockPage.mockRejectedValueOnce(new Error('Sem conexão'));
  const { result } = renderHook(useAuditLog);
  await waitFor(() => expect(result.current.error).toBe('Sem conexão'));
  await act(async () => { await result.current.load(); });
  expect(result.current.data).toEqual(page().data);
  expect(result.current.error).toBeNull();
});

it('ignora resposta antiga após uma consulta mais recente', async () => {
  let resolve!: (value: ReturnType<typeof page>) => void;
  mockPage.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const { result } = renderHook(useAuditLog);
  act(() => result.current.setSearchQuery('Novo'));
  act(() => result.current.applyFilters());
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => { resolve({ ...page(), data: [{ ...event, id: 999 }] }); });
  expect(result.current.data[0].id).toBe(1);
});
