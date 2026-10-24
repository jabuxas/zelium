import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import { clearSession, getToken, getUsuario, saveSession } from '../session';
import { getAuthToken, setAuthToken } from '../tokenStore';
import { apiClient } from '@/src/shared/api/client';

jest.mock('@/src/shared/config/env', () => ({ apiBaseUrl: 'http://localhost:8000/api' }));
jest.mock('../session', () => ({ getToken: jest.fn(), getUsuario: jest.fn(), saveSession: jest.fn(), clearSession: jest.fn() }));

const a = { id: 1, nome: 'A', email: 'a@teste.com', papel: 'gestor', organizacaoId: 1 };
const b = { ...a, id: 2, nome: 'B', email: 'b@teste.com', organizacaoId: 2 };
const resposta = (usuario = a, token = 'token-a') => ({ ok: true, json: async () => ({ token, usuario }) }) as Response;
const negada = () => ({ ok: false, status: 401, text: async () => '{"error":"Sessão expirada"}', headers: new Headers({ 'content-type': 'application/json' }) }) as Response;
const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

beforeEach(() => {
  jest.resetAllMocks();
  setAuthToken(null);
  (getToken as jest.Mock).mockResolvedValue(null);
  (getUsuario as jest.Mock).mockResolvedValue(null);
  (saveSession as jest.Mock).mockResolvedValue(undefined);
  (clearSession as jest.Mock).mockResolvedValue(undefined);
  global.fetch = jest.fn().mockResolvedValue(resposta());
});

it('logout revoga estado e token mesmo se a limpeza persistente falhar', async () => {
  const { result } = renderHook(useAuth, { wrapper });
  await waitFor(() => expect(result.current.carregando).toBe(false));
  await act(async () => { await result.current.login(a.email, 'senha'); });
  (clearSession as jest.Mock).mockRejectedValue(new Error('Disco indisponível'));
  await act(async () => { await result.current.logout().catch(() => undefined); });
  expect(result.current.autenticado).toBe(false);
  expect(getAuthToken()).toBeNull();
});

it('não restaura sessão que o servidor considera expirada', async () => {
  (getToken as jest.Mock).mockResolvedValue('expirado');
  (getUsuario as jest.Mock).mockResolvedValue(a);
  global.fetch = jest.fn().mockResolvedValue(negada());
  const { result } = renderHook(useAuth, { wrapper });
  await waitFor(() => expect(result.current.carregando).toBe(false));
  expect(result.current.autenticado).toBe(false);
  expect(getAuthToken()).toBeNull();
  expect(clearSession).toHaveBeenCalled();
});

it('401 da sessão atual encerra autenticação e permissões locais', async () => {
  const { result } = renderHook(useAuth, { wrapper });
  await waitFor(() => expect(result.current.carregando).toBe(false));
  await act(async () => { await result.current.login(a.email, 'senha'); });
  global.fetch = jest.fn().mockResolvedValue(negada());
  await act(async () => { await expect(apiClient('/patrimonios')).rejects.toThrow('Sessão expirada'); });
  expect(result.current.autenticado).toBe(false);
});

it('resposta antiga de login não substitui a conta mais recente', async () => {
  const { result } = renderHook(useAuth, { wrapper });
  await waitFor(() => expect(result.current.carregando).toBe(false));
  let concluirA!: (res: Response) => void;
  global.fetch = jest.fn().mockImplementationOnce(() => new Promise(resolve => { concluirA = resolve; })).mockResolvedValueOnce(resposta(b, 'token-b'));
  let antiga!: Promise<void>;
  act(() => { antiga = result.current.login(a.email, 'senha'); });
  await act(async () => { await result.current.login(b.email, 'senha'); });
  await act(async () => { concluirA(resposta()); await antiga; });
  expect(result.current.usuario?.id).toBe(b.id);
  expect(getAuthToken()).toBe('token-b');
  expect(saveSession).toHaveBeenCalledTimes(1);
});

it('401 de uma requisição antiga não encerra uma nova sessão', async () => {
  const { result } = renderHook(useAuth, { wrapper });
  await waitFor(() => expect(result.current.carregando).toBe(false));
  await act(async () => { await result.current.login(a.email, 'senha'); });
  let concluir!: (res: Response) => void;
  global.fetch = jest.fn().mockImplementationOnce(() => new Promise(resolve => { concluir = resolve; })).mockResolvedValueOnce(resposta(b, 'token-b'));
  const pendente = apiClient('/patrimonios').catch(() => undefined);
  await act(async () => { await result.current.logout(); await result.current.login(b.email, 'senha'); });
  await act(async () => { concluir(negada()); await pendente; });
  expect(result.current.usuario?.id).toBe(b.id);
  expect(getAuthToken()).toBe('token-b');
});
