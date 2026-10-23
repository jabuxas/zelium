import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../testing/auth';
import SidebarLayout from '../SidebarLayout';

jest.mock('next/navigation', () => ({ usePathname: () => '/audit-log' }));

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
