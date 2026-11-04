import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RedefinirSenhaPage from '../page';

const TOKEN = 'b'.repeat(64);

afterEach(() => {
  jest.restoreAllMocks();
  window.location.hash = '';
  sessionStorage.clear();
});

async function submeterCom(senha: string) {
  await userEvent.type(screen.getByLabelText('Nova senha', { exact: false }), senha);
  await userEvent.type(screen.getByLabelText('Confirmar senha'), senha);
  await userEvent.click(screen.getByRole('button', { name: /Redefinir senha/i }));
}

it('lê o token do link, envia redefinição e orienta login', async () => {
  window.location.hash = `#token=${TOKEN}`;
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true, status: 200, json: async () => ({ message: 'Senha redefinida. Faca login com a nova senha.' }),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  render(<RedefinirSenhaPage />);
  await submeterCom('SenhaNovaForte@99');

  expect(await screen.findByText(/Senha redefinida/i)).toBeInTheDocument();
  const corpo = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
  expect(corpo).toEqual({ token: TOKEN, senha: 'SenhaNovaForte@99' });
  expect(window.location.hash).toBe('');
  expect(screen.getByRole('link', { name: /Fazer login/i })).toHaveAttribute('href', '/login');
  expect(sessionStorage.getItem('zelium_token_senha')).toBeNull();
});

it('link incompleto orienta solicitar recuperação', () => {
  const fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  render(<RedefinirSenhaPage />);
  expect(screen.getByText(/Link incompleto/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Solicitar nova recuperação|Novo link/i })).toHaveAttribute('href', '/recuperar-senha');
  expect(fetchMock).not.toHaveBeenCalled();
});

it('token inválido ou expirado orienta nova solicitação', async () => {
  window.location.hash = `#token=${TOKEN}`;
  global.fetch = jest.fn().mockResolvedValue({
    ok: false, status: 400, json: async () => ({ error: 'Redefinicao invalida ou expirada. Solicite recuperacao novamente.' }),
  }) as unknown as typeof fetch;
  render(<RedefinirSenhaPage />);
  await submeterCom('SenhaNovaForte@99');
  expect(await screen.findByText(/invalida ou expirada|inválida ou expirada/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Solicitar nova recuperação|Novo link/i })).toBeInTheDocument();
});

it('senhas diferentes ou curtas são recusadas client-side sem enviar', async () => {
  window.location.hash = `#token=${TOKEN}`;
  const fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  render(<RedefinirSenhaPage />);
  await userEvent.type(screen.getByLabelText('Nova senha', { exact: false }), 'SenhaNovaForte@99');
  await userEvent.type(screen.getByLabelText('Confirmar senha'), 'diferente');
  await userEvent.click(screen.getByRole('button', { name: /Redefinir senha/i }));
  expect(await screen.findByText(/não coincidem/i)).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});
