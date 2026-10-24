import { render, screen, fireEvent } from '@testing-library/react';
import ZeliumBrand from '../ZeliumBrand';

it('usa o nome, sem inventar um símbolo quando a logo não foi fornecida', () => {
  render(<ZeliumBrand logoSrc={null} />);
  expect(screen.getByText('Zelium')).toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

it('usa o arquivo oficial configurado e preserva alternativa acessível', () => {
  render(<ZeliumBrand logoSrc="/brand/zelium-logo.png" />);
  const src = new URL(screen.getByRole('img', { name: 'Zelium' }).getAttribute('src')!, window.location.origin);
  expect(src.pathname).toBe('/brand/zelium-logo.png');
  expect(src.origin).toBe(window.location.origin);
});

it('uma imagem indisponível não remove a identificação do produto', () => {
  render(<ZeliumBrand logoSrc="/brand/ausente.png" />);
  fireEvent.error(screen.getByRole('img'));
  expect(screen.getByText('Zelium')).toBeInTheDocument();
});
