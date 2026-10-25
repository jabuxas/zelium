import { act, render, screen } from '@testing-library/react';
import AmbienteForm from '../AmbienteForm';

const mockApiFetch = jest.fn();
jest.mock('../../lib/api-client', () => ({ apiFetch: (...args: unknown[]) => mockApiFetch(...args) }));
jest.mock('next/navigation', () => ({ useParams: () => ({ id: '7' }), useRouter: () => ({ push: jest.fn() }) }));

beforeEach(() => mockApiFetch.mockReset());

it('bloqueia edição e envio enquanto carrega os dados para não sobrescrever o usuário', async () => {
  let resolve!: (value: unknown) => void;
  const pending = new Promise(done => { resolve = done; });
  mockApiFetch.mockImplementation((url: string) => url.endsWith('/responsaveis')
    ? Promise.resolve({ ok: true, json: async () => [{ id: 1, nome: 'Ana' }] }) : pending);
  render(<AmbienteForm />);
  expect(screen.getByLabelText('Nome do Ambiente *')).toBeDisabled();
  expect(screen.getByLabelText('Responsável pelo Ambiente *')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Salvar Alterações' })).toBeDisabled();
  await act(async () => { resolve({ ok: true, json: async () => ({ nome: 'Sala original', responsavel_id: 1 }) }); });
  expect(await screen.findByDisplayValue('Sala original')).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Salvar Alterações' })).toBeEnabled();
});

it('não libera envio quando não consegue carregar o ambiente', async () => {
  mockApiFetch.mockImplementation((url: string) => Promise.resolve(url.endsWith('/responsaveis')
    ? { ok: true, json: async () => [] } : { ok: false, json: async () => ({ error: 'Não encontrado' }) }));
  render(<AmbienteForm />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Erro ao carregar ambiente');
  expect(screen.getByLabelText('Nome do Ambiente *')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Salvar Alterações' })).toBeDisabled();
});
