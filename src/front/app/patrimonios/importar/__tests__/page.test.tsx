import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportarPatrimoniosPage from '../page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

function enviarArquivo(nome = 'bens.csv') {
  const arquivo = new File(['numero_patrimonio;descricao'], nome, { type: 'text/csv' });
  const entrada = screen.getByLabelText(/arquivo/i) as HTMLInputElement;
  return userEvent.upload(entrada, arquivo);
}

afterEach(() => jest.restoreAllMocks());

it('mostra o resumo do preview antes de gravar', async () => {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true, status: 200, json: async () => ({
      total_linhas: 2, validas: 2, invalidas: 0, existentes: 0,
      duplicadas_arquivo: 0, erros: [],
    }),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  render(<ImportarPatrimoniosPage />);
  await enviarArquivo();
  await userEvent.click(screen.getByRole('button', { name: /Analisar arquivo/i }));

  expect(await screen.findByText(/2 linhas prontas/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Importar 2 patrimônios/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Importar 2 patrimônios/i })).toBeEnabled();
});

it('erros de linha aparecem no preview e o botão de gravar não aparece', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true, status: 200, json: async () => ({
      total_linhas: 3, validas: 1, invalidas: 2, existentes: 0,
      duplicadas_arquivo: 1, erros: [
        { linha: 3, erro: 'tipo_material "X" não encontrado no cadastro desta organização' },
        { linha: 4, erro: 'número repetido dentro do arquivo' },
      ],
    }),
  }) as unknown as typeof fetch;
  render(<ImportarPatrimoniosPage />);
  await enviarArquivo();
  await userEvent.click(screen.getByRole('button', { name: /Analisar arquivo/i }));

  expect(await screen.findByText(/não encontrado no cadastro/i)).toBeInTheDocument();
  expect(screen.getByText(/repetida/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Importar/ })).toBeNull();
});

it('confirmação mostra o resultado da gravação', async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce({
      ok: true, status: 200, json: async () => ({
        total_linhas: 2, validas: 2, invalidas: 0, existentes: 0,
        duplicadas_arquivo: 0, erros: [],
      }),
    })
    .mockResolvedValueOnce({
      ok: true, status: 201, json: async () => ({ inseridos: 2, existentes: 0, total_linhas: 2 }),
    });
  render(<ImportarPatrimoniosPage />);
  await enviarArquivo();
  await userEvent.click(screen.getByRole('button', { name: /Analisar arquivo/i }));
  await screen.findByText(/2 linhas prontas/i);
  await userEvent.click(screen.getByRole('button', { name: /Importar 2 patrimônios/i }));

  expect(await screen.findByText(/2 patrimônios importados/i)).toBeInTheDocument();
});

it('avisos de limite e indisponibilidade vêm da API', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false, status: 403,
    clone() { return this; },
    json: async () => ({ error: 'Limite do trial atingido: 500 patrimonios ativos.', codigo: 'limite_trial' }),
  }) as unknown as typeof fetch;
  render(<ImportarPatrimoniosPage />);
  await enviarArquivo();
  await userEvent.click(screen.getByRole('button', { name: /Analisar arquivo/i }));
  expect(await screen.findByText(/Limite do trial/i)).toBeInTheDocument();
});
