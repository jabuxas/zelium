import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContaPage from '../page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

afterEach(() => jest.restoreAllMocks());

function form() {
  return {
    atual: screen.getByLabelText('Senha atual'),
    nova: screen.getByLabelText('Nova senha', { exact: true }),
    confirmar: screen.getByLabelText('Confirmar nova senha'),
  };
}

it('troca a senha e orienta novo login (a sessão atual é revogada)', async () => {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true, status: 200, json: async () => ({ message: 'Senha alterada. Faca login novamente com a nova senha.' }),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  render(<ContaPage />);
  const campos = form();
  await userEvent.type(campos.atual, 'Zelium@2026');
  await userEvent.type(campos.nova, 'SenhaNovaForte@99');
  await userEvent.type(campos.confirmar, 'SenhaNovaForte@99');
  await userEvent.click(screen.getByRole('button', { name: /Alterar senha/i }));

  expect(await screen.findByText(/Senha alterada/i)).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/usuarios/senha'),
    expect.objectContaining({ method: 'POST' }),
  );
  const corpo = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
  expect(corpo).toEqual({ senha_atual: 'Zelium@2026', senha: 'SenhaNovaForte@99' });
  expect(screen.getByRole('link', { name: /Fazer login/i })).toHaveAttribute('href', '/login');
});

it('senha atual errada mostra o erro da API', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false, status: 400, json: async () => ({ error: 'Senha atual incorreta' }),
  }) as unknown as typeof fetch;
  render(<ContaPage />);
  const campos = form();
  await userEvent.type(campos.atual, 'errada');
  await userEvent.type(campos.nova, 'SenhaNovaForte@99');
  await userEvent.type(campos.confirmar, 'SenhaNovaForte@99');
  await userEvent.click(screen.getByRole('button', { name: /Alterar senha/i }));
  expect(await screen.findByText(/Senha atual incorreta/i)).toBeInTheDocument();
});

it('confirmação divergente é recusada client-side sem enviar', async () => {
  const fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  render(<ContaPage />);
  const campos = form();
  await userEvent.type(campos.atual, 'Zelium@2026');
  await userEvent.type(campos.nova, 'SenhaNovaForte@99');
  await userEvent.type(campos.confirmar, 'outra');
  await userEvent.click(screen.getByRole('button', { name: /Alterar senha/i }));
  expect(await screen.findByText(/não coincidem/i)).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

it('explica que as outras sessões serão encerradas', () => {
  render(<ContaPage />);
  expect(screen.getByText(/todas as sessões/i)).toBeInTheDocument();
});
