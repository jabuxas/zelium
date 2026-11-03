import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmarCadastroPage from '../page';

const TOKEN = 'a'.repeat(64);

function definirTokenNaUrl(token: string | null) {
  // jsdom: hash é mutável; simula o link do e-mail (#token=...).
  window.location.hash = token ? `#token=${token}` : '';
}

beforeEach(() => {
  definirTokenNaUrl(null);
});

afterEach(() => {
  jest.restoreAllMocks();
  definirTokenNaUrl(null);
});

async function submeterCom(senha: string) {
  await userEvent.type(screen.getByLabelText('Nova senha', { exact: false }), senha);
  await userEvent.type(screen.getByLabelText('Confirmar senha'), senha);
  await userEvent.click(screen.getByRole('button', { name: /Confirmar cadastro/i }));
}

it('lê o token do fragmento, envia confirmação e limpa o token da URL', async () => {
  definirTokenNaUrl(TOKEN);
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true, status: 201, json: async () => ({ message: 'Cadastro confirmado. Faca login para continuar.' }),
  });
  global.fetch = fetchMock as unknown as typeof fetch;

  render(<ConfirmarCadastroPage />);
  await submeterCom('SenhaSegura@123');

  expect(await screen.findByText(/Cadastro confirmado/i)).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/auth/cadastros/confirmacao'),
    expect.objectContaining({ method: 'POST', credentials: 'include' }),
  );
  const corpo = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
  expect(corpo).toEqual({ token: TOKEN, senha: 'SenhaSegura@123' });
  // Segredo não pode permanecer na barra de endereço/histórico
  expect(window.location.hash).toBe('');
  expect(screen.getByRole('link', { name: /Fazer login/i })).toHaveAttribute('href', '/login');
});

it('senha curta é recusada client-side sem chamar a API', async () => {
  definirTokenNaUrl(TOKEN);
  const fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  render(<ConfirmarCadastroPage />);
  await submeterCom('curta123');
  expect(await screen.findByText(/pelo menos 12 caracteres/i)).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

it('senhas diferentes não enviam nada', async () => {
  definirTokenNaUrl(TOKEN);
  const fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  render(<ConfirmarCadastroPage />);
  await userEvent.type(screen.getByLabelText('Nova senha', { exact: false }), 'SenhaSegura@123');
  await userEvent.type(screen.getByLabelText('Confirmar senha'), 'SenhaSegura@456');
  await userEvent.click(screen.getByRole('button', { name: /Confirmar cadastro/i }));
  expect(await screen.findByText(/não coincidem/i)).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

it('link sem token mostra erro e não envia nada', () => {
  const fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  render(<ConfirmarCadastroPage />);
  expect(screen.getByText(/Link incompleto/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Solicitar novo cadastro/i })).toHaveAttribute('href', '/cadastro');
  expect(fetchMock).not.toHaveBeenCalled();
});

it('confirmação inválida ou expirada orienta novo cadastro', async () => {
  definirTokenNaUrl(TOKEN);
  global.fetch = jest.fn().mockResolvedValue({
    ok: false, status: 400, json: async () => ({ error: 'Confirmacao invalida ou expirada. Solicite novo cadastro.' }),
  }) as unknown as typeof fetch;
  render(<ConfirmarCadastroPage />);
  await submeterCom('SenhaSegura@123');
  expect(await screen.findByText(/inválida ou expirada|invalida ou expirada/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Solicitar novo cadastro/i })).toBeInTheDocument();
});

it('ambiente desabilitado ou indisponível não sugere erro de token', async () => {
  definirTokenNaUrl(TOKEN);
  global.fetch = jest.fn().mockResolvedValue({
    ok: false, status: 404, json: async () => ({ error: 'Recurso indisponivel' }),
  }) as unknown as typeof fetch;
  render(<ConfirmarCadastroPage />);
  await submeterCom('SenhaSegura@123');
  expect(await screen.findByText(/indispon/i)).toBeInTheDocument();
});
