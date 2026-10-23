import { screen, waitFor } from '@testing-library/react';
import { render, authValue } from '../../testing/auth';
import { AuthContext } from '../../lib/auth-context';
import RegistroDetalhe from '../RegistroDetalhe';

const mockParams = { id: '3' };
jest.mock('next/navigation', () => ({ useParams: () => mockParams }));

beforeEach(() => {
  mockParams.id = '3';
  global.fetch = jest.fn(async (url) => ({ ok: true, json: async () => {
    if (String(url).includes('/audit-log')) return { total: 0, pages: 0, data: [] };
    if (String(url).endsWith('/solicitacoes/3')) return { id: 3, patrimonio_id: 1, tipo: 'manutencao', status: 'aberta', descricao: 'Tela quebrada' };
    if (String(url).endsWith('/patrimonios/1')) return { id: 1, numero_patrimonio: 'PAT-1' };
    return { id: 1, nome: 'Sala A' };
  } } as Response));
});

it('inspeciona a solicitação sem oferecer gestão ao conferente e mostra seu histórico', async () => {
  render(<AuthContext.Provider value={authValue('conferente')}><RegistroDetalhe tipo="solicitacao" /></AuthContext.Provider>);
  expect(await screen.findByText('Tela quebrada')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Iniciar solicitacao 3/ })).toBeDisabled();
  expect(await screen.findByRole('link', { name: /PAT-1/ })).toHaveAttribute('href', '/patrimonios/1');
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('tabela=solicitacao&registro_id=3'), expect.anything()));
});

it('preserva acesso ao histórico quando o registro foi removido', async () => {
  global.fetch = jest.fn(async url => ({ ok: String(url).includes('/audit-log'), status: String(url).includes('/audit-log') ? 200 : 404, json: async () => String(url).includes('/audit-log') ? { total: 0, pages: 0, data: [] } : {} } as Response));
  render(<RegistroDetalhe tipo="patrimonio" />);
  expect(await screen.findByText(/Registro removido ou não encontrado/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Histórico deste patrimônio/i })).toBeInTheDocument();
});

it('não perde o registro se a consulta de uma referência falhar', async () => {
  const fetchOriginal = global.fetch;
  global.fetch = jest.fn((url, options) => String(url).includes('/patrimonios')
    ? Promise.reject(new Error('Sem conexão')) : fetchOriginal(url, options));
  render(<RegistroDetalhe tipo="solicitacao" />);
  expect(await screen.findByText('Tela quebrada')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '#1' })).toHaveAttribute('href', '/patrimonios/1');
});

it('ID inválido não consulta todo o histórico da entidade por engano', () => {
  mockParams.id = 'invalido';
  render(<RegistroDetalhe tipo="patrimonio" />);
  expect(screen.getByText('Registro inválido')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});
