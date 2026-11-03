import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CadastroPage from '../page';

afterEach(() => {
  jest.restoreAllMocks();
});

const preenchida = {
  nome: 'Ana Silva',
  email: 'ana@empresa.test',
  organizacaoNome: 'Empresa da Ana',
};

async function preencherFormulario() {
  await userEvent.type(screen.getByLabelText('Nome'), preenchida.nome);
  await userEvent.type(screen.getByLabelText('E-mail'), preenchida.email);
  await userEvent.type(screen.getByLabelText('Nome da organização'), preenchida.organizacaoNome);
  await userEvent.click(screen.getByRole('button', { name: /Solicitar cadastro/i }));
}

it('envia solicitação e mostra mensagem genérica de e-mail de confirmação', async () => {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true, status: 202, json: async () => ({
      message: 'Se o cadastro puder prosseguir, enviaremos um email de confirmacao.',
    }),
  });
  global.fetch = fetchMock as unknown as typeof fetch;

  render(<CadastroPage />);
  await preencherFormulario();

  expect(await screen.findByText(/enviaremos um email de confirmacao/i)).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining('/auth/cadastros'),
    expect.objectContaining({ method: 'POST', credentials: 'include' }),
  );
  const corpo = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
  expect(corpo).toEqual(preenchida);
});

it('não promete cadastro quando a resposta é apenas genérica de e-mail usado', async () => {
  // Backend responde 202 genérico inclusive para e-mail já existente: a
  // interface não pode revelar nenhuma diferença.
  global.fetch = jest.fn().mockResolvedValue({
    ok: true, status: 202, json: async () => ({ message: 'Se o cadastro puder prosseguir, enviaremos um email de confirmacao.' }),
  }) as unknown as typeof fetch;
  render(<CadastroPage />);
  await preencherFormulario();
  expect(await screen.findByText(/enviaremos um email/i)).toBeInTheDocument();
  expect(screen.queryByText(/já existe/i)).toBeNull();
});

it('recusa client-side campos vazios sem chamar a API', async () => {
  const fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
  render(<CadastroPage />);
  await userEvent.click(screen.getByRole('button', { name: /Solicitar cadastro/i }));
  expect(fetchMock).not.toHaveBeenCalled();
});

it('ambiente com cadastro desabilitado informa indisponibilidade (404)', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false, status: 404, json: async () => ({ error: 'Recurso indisponivel' }),
  }) as unknown as typeof fetch;
  render(<CadastroPage />);
  await preencherFormulario();
  expect(await screen.findByText(/indispon/i)).toBeInTheDocument();
});

it('limite de tentativas e indisponibilidade temporária têm mensagens próprias', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false, status: 429, json: async () => ({ error: 'Muitas tentativas. Aguarde antes de tentar novamente.' }),
  }) as unknown as typeof fetch;
  render(<CadastroPage />);
  await preencherFormulario();
  expect(await screen.findByText(/Muitas tentativas/i)).toBeInTheDocument();
});

it('aponta para o login e explica o uso dos dados', () => {
  render(<CadastroPage />);
  expect(screen.getByRole('link', { name: /Fazer login/i })).toHaveAttribute('href', '/login');
  expect(screen.getByText(/nome e e-mail são usados apenas para criar a conta/i)).toBeInTheDocument();
});
