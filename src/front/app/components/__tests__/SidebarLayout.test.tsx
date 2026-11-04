import { screen, fireEvent } from '@testing-library/react';
import { render, authValue } from '../../testing/auth';
import { AuthContext } from '../../lib/auth-context';
import SidebarLayout from '../SidebarLayout';

// O pathname muda por teste; o mock lê a variável setada em cada caso.
const pathnameAtual = { valor: '/audit-log' };
jest.mock('next/navigation', () => ({
  usePathname: () => pathnameAtual.valor,
}));

it('o menu móvel começa recolhido e fecha ao selecionar uma página', () => {
  render(<SidebarLayout><p>Histórico</p></SidebarLayout>);
  const abrir = screen.getByRole('button', { name: 'Abrir menu de navegação' });
  expect(abrir).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(abrir);
  expect(abrir).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(screen.getByRole('link', { name: 'Patrimônios' }));
  expect(abrir).toHaveAttribute('aria-expanded', 'false');
});

it('Escape fecha o menu móvel', () => {
  render(<SidebarLayout><p>Histórico</p></SidebarLayout>);
  const abrir = screen.getByRole('button', { name: 'Abrir menu de navegação' });
  fireEvent.click(abrir);
  fireEvent.keyDown(abrir, { key: 'Escape' });
  expect(abrir).toHaveAttribute('aria-expanded', 'false');
});

describe('rotas públicas sem sessão', () => {
  it.each(['/cadastro', '/cadastro/confirmar', '/recuperar-senha', '/recuperar-senha/redefinir'])('%s renderiza o conteúdo sem guard nem shell', path => {
    pathnameAtual.valor = path;
    render(<SidebarLayout><p>Formulário público</p></SidebarLayout>);
    expect(screen.getByText('Formulário público')).toBeInTheDocument();
    expect(screen.queryByText('Acesso restrito')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Abrir menu de navegação' })).toBeNull();
    pathnameAtual.valor = '/audit-log';
  });

  it('página protegida sem usuário continua bloqueada', () => {
    render(
      <SidebarLayout><p>Dashboard</p></SidebarLayout>,
      { wrapper: ({ children }) => <AuthContext.Provider value={authValue(null)}>{children}</AuthContext.Provider> },
    );
    expect(screen.getByText('Acesso restrito')).toBeInTheDocument();
  });
});
