import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../auth-context';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

function fetchRespostaMe(status: number, corpo: unknown) {
  return jest.fn().mockImplementation((url: string) => {
    if (String(url).includes('/auth/me')) {
      return Promise.resolve({ status, ok: status < 400, clone() { return this; }, json: async () => corpo });
    }
    return Promise.resolve({ status: 404, ok: false, clone() { return this; }, json: async () => ({}) });
  });
}

afterEach(() => {
  jest.restoreAllMocks();
  window.localStorage.clear();
});

it('evento de trial expirado mostra banner global dispensável', async () => {
  global.fetch = fetchRespostaMe(401, {}) as unknown as typeof fetch;
  render(<AuthProvider><div>conteúdo</div></AuthProvider>);

  window.dispatchEvent(new CustomEvent('zelium:trial-expirado'));

  expect(
    await screen.findByText(/período de avaliação.*expirou/i),
  ).toBeInTheDocument();
  expect(screen.getByText(/consultas e exportações continuam disponíveis/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /Entendi/i }));
  expect(screen.queryByText(/período de avaliação.*expirou/i)).toBeNull();
});

it('banner não aparece sem o evento', async () => {
  global.fetch = fetchRespostaMe(401, {}) as unknown as typeof fetch;
  render(<AuthProvider><div>conteúdo</div></AuthProvider>);
  await screen.findByText('conteúdo');
  expect(screen.queryByText(/período de avaliação/i)).toBeNull();
});
