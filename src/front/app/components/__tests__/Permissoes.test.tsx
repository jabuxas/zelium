import { render, screen } from '@testing-library/react';
import { AuthContext } from '../../lib/auth-context';
import { podeEscreverRecurso } from '../../lib/permissions';
import { authValue } from '../../testing/auth';
import AcessoPagina from '../AcessoPagina';

it.each([
  ['gestor', '/patrimonios/novo', true], ['responsavel', '/patrimonios/editar/1', true],
  ['conferente', '/patrimonios/novo', false], ['conferente', '/ambientes/editar/1', false],
  ['responsavel', '/responsaveis/novo', false], ['responsavel', '/financeiro', false],
  ['conferente', '/notificacoes', false], ['conferente', '/relatorios', false],
  ['conferente', '/patrimonios/1', true], ['conferente', '/audit-log', true],
] as const)('%s na rota %s: acesso %s', (papel, path, permitido) => {
  render(<AuthContext.Provider value={authValue(papel)}><AcessoPagina path={path}><button>Salvar</button></AcessoPagina></AuthContext.Provider>);
  expect(screen.queryByRole('button', { name: 'Salvar' }) !== null).toBe(permitido);
  if (!permitido) expect(screen.getByText('Acesso restrito')).toBeInTheDocument();
});

it('não concede escrita durante restauração da sessão ou sem provider', () => {
  expect(podeEscreverRecurso(null, 'solicitacoes')).toBe(false);
  expect(podeEscreverRecurso('conferente', 'solicitacoes')).toBe(false);
  expect(podeEscreverRecurso('responsavel', 'solicitacoes')).toBe(true);
  render(<AcessoPagina path="/patrimonios/novo"><button>Salvar</button></AcessoPagina>);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
