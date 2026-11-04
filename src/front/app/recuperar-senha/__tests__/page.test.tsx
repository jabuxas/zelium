import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecuperarSenhaPage from '../page';

afterEach(() => jest.restoreAllMocks());

async function submeterCom(email: string) {
  await userEvent.type(screen.getByLabelText('E-mail'), email);
  await userEvent.click(screen.getByRole('button', { name: /Enviar link/i }));
}

it('solicita recuperação e mostra mensagem genérica (não revela contas)', async () => {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true, status: 202, json: async () => ({
      message: 'Se o email pertencer a uma conta ativa, voce recebera um email com o link para definir uma nova senha.',
    }),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  render(<RecuperarSenhaPage />);
  await submeterCom('gestor@zelium.com');
  expect(await screen.findByText(/recebera um email/i)).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/auth/senha/recuperar'),
    expect.objectContaining({ method: 'POST', credentials: 'include' }),
  );
  const corpo = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
  expect(corpo).toEqual({ email: 'gestor@zelium.com' });
});

it('mensagem genérica também para e-mail inexistente', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true, status: 202, json: async () => ({
      message: 'Se o email pertencer a uma conta ativa, voce recebera um email com o link para definir uma nova senha.',
    }),
  }) as unknown as typeof fetch;
  render(<RecuperarSenhaPage />);
  await submeterCom('ninguem@zelium.com');
  expect(await screen.findByText(/recebera um email/i)).toBeInTheDocument();
  expect(screen.queryByText(/não encontrad/i)).toBeNull();
});

it('indisponibilidade do ambiente (404/503) tem mensagem própria', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false, status: 404, json: async () => ({ error: 'Recurso indisponivel' }),
  }) as unknown as typeof fetch;
  render(<RecuperarSenhaPage />);
  await submeterCom('gestor@zelium.com');
  expect(await screen.findByText(/indispon/i)).toBeInTheDocument();
});

it('voltar para o login e explicação de uso', () => {
  render(<RecuperarSenhaPage />);
  expect(screen.getByRole('link', { name: /Fazer login/i })).toHaveAttribute('href', '/login');
});
