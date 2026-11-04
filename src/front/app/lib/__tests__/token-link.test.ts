import { renderHook } from '@testing-library/react';
import { useTokenDeLink, descartarTokenDeLink } from '../token-link';

const TOKEN = 'a'.repeat(64);

afterEach(() => {
  window.location.hash = '';
  sessionStorage.clear();
});

it('lê o token do fragmento, o guarda por aba e remove da URL', () => {
  window.location.hash = `#token=${TOKEN}`;
  const { result } = renderHook(() => useTokenDeLink('teste'));
  expect(result.current.token).toBe(TOKEN);
  expect(result.current.semToken).toBe(false);
  expect(window.location.hash).toBe('');
  expect(sessionStorage.getItem('teste')).toBe(TOKEN);
});

it('hash inválido (não hex de 64) conta como sem token e não é guardado', () => {
  window.location.hash = '#token=curto';
  const { result } = renderHook(() => useTokenDeLink('teste'));
  expect(result.current.semToken).toBe(true);
  expect(result.current.token).toBeNull();
  expect(sessionStorage.getItem('teste')).toBeNull();
});

it('resgata o token da aba quando o hash já foi consumido (remount do roteador)', () => {
  sessionStorage.setItem('teste', TOKEN);
  const { result } = renderHook(() => useTokenDeLink('teste'));
  expect(result.current.token).toBe(TOKEN);
  expect(result.current.semToken).toBe(false);
});

it('sem hash e sem storage: semToken e storage limpo', () => {
  sessionStorage.setItem('teste', 'lixo-que-nao-e-token');
  const { result } = renderHook(() => useTokenDeLink('teste'));
  expect(result.current.semToken).toBe(true);
  expect(sessionStorage.getItem('teste')).toBeNull();
});

it('descartarTokenDeLink limpa a chave da aba', () => {
  sessionStorage.setItem('teste', TOKEN);
  descartarTokenDeLink('teste');
  expect(sessionStorage.getItem('teste')).toBeNull();
});
