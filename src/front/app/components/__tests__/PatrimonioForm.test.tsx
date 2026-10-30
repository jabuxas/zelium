import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatrimonioForm from '../PatrimonioForm';

const mockApiFetch = jest.fn();
jest.mock('../../lib/api-client', () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));
jest.mock('next/navigation', () => ({ useParams: () => ({ id: '3' }), useRouter: () => ({ push: jest.fn() }) }));

const PATRIMONIO = {
  id: 3,
  numero_patrimonio: '2024/003',
  descricao: 'Mesa de trabalho em L',
  valor: 850,
  observacoes: '',
  data_aquisicao: null,
  vida_util_anos: null,
  valor_residual: null,
  tipo_material_id: 1,
  estado_item_id: 1,
  ambiente_id: 1,
  responsavel_id: 1,
  fornecedor_id: null,
};

beforeEach(() => mockApiFetch.mockReset());

function mockCarregamento() {
  mockApiFetch.mockImplementation((url: string) => {
    if (url.includes('/patrimonios/3')) {
      return Promise.resolve({ ok: true, json: async () => PATRIMONIO });
    }
    // Listas de opções: tipos, estados, ambientes, responsáveis, fornecedores.
    return Promise.resolve({ ok: true, json: async () => [{ id: 1, nome: 'Opção' }] });
  });
}

it('mostra cada erro de validação da API com o rótulo do campo', async () => {
  mockCarregamento();
  render(<PatrimonioForm />);
  await screen.findByDisplayValue('2024/003');

  mockApiFetch.mockImplementation((_url: string, opts?: { method?: string }) =>
    opts?.method === 'PUT'
      ? Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({
            error: 'vida_util_anos deve ser um inteiro entre 1 e 100',
            erros: [
              { campo: 'vida_util_anos', mensagem: 'vida_util_anos deve ser um inteiro entre 1 e 100' },
              { campo: 'valor_residual', mensagem: 'valor_residual deve ser um numero entre 0 e o valor do bem' },
            ],
          }),
        })
      : Promise.resolve({ ok: true, json: async () => [] }),
  );

  await userEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

  const alerta = await screen.findByRole('alert');
  expect(alerta).toHaveTextContent('Vida Útil (anos)');
  expect(alerta).toHaveTextContent('vida_util_anos deve ser um inteiro entre 1 e 100');
  expect(alerta).toHaveTextContent('Valor Residual (R$)');
  expect(alerta).toHaveTextContent('valor_residual deve ser um numero entre 0 e o valor do bem');
});

it('mantém a mensagem genérica para erros que não são de validação', async () => {
  mockCarregamento();
  render(<PatrimonioForm />);
  await screen.findByDisplayValue('2024/003');

  mockApiFetch.mockImplementation((_url: string, opts?: { method?: string }) =>
    opts?.method === 'PUT'
      ? Promise.resolve({ ok: false, status: 409, json: async () => ({ error: 'Ja existe um patrimonio cadastrado com este numero' }) })
      : Promise.resolve({ ok: true, json: async () => [] }),
  );

  await userEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

  expect(await screen.findByText('Ja existe um patrimonio cadastrado com este numero')).toBeInTheDocument();
  expect(screen.queryByText(/Corrija os campos abaixo/)).toBeNull();
});

it('limpa os erros por campo após um envio bem-sucedido', async () => {
  mockCarregamento();
  render(<PatrimonioForm />);
  await screen.findByDisplayValue('2024/003');

  let primeiroPutFalhou = true;
  mockApiFetch.mockImplementation((_url: string, opts?: { method?: string }) => {
    if (opts?.method !== 'PUT') return Promise.resolve({ ok: true, json: async () => ({ ...PATRIMONIO }) });
    // 1º envio: 400 com erros por campo; 2º envio: sucesso (limpa o alerta).
    if (primeiroPutFalhou) {
      primeiroPutFalhou = false;
      return Promise.resolve({ ok: false, status: 400, json: async () => ({ error: 'valor invalido', erros: [{ campo: 'valor', mensagem: 'valor invalido' }] }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({ ...PATRIMONIO }) });
  });

  await userEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
  expect(await screen.findByRole('alert')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
});
