import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../testing/auth';
import AuditLogPanel from '../AuditLogPanel';

it('filtra a auditoria e pagina os resultados', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ total: 12, pages: 2, data: [{ id: 1, tabela: 'solicitacao', registro_id: 1, acao: 'UPDATE', registro_nome: '#1 · Manutenção — PAT-1', usuario: 'Ana', alteracoes: [{ campo: 'status', anterior: 'aberta', novo: 'concluida' }] }] }) });
  render(<AuditLogPanel />);
  expect(await screen.findByText(/PAT-1/)).toBeInTheDocument();
  expect(screen.getByText('Concluída', { exact: false })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Entidade'), { target: { value: 'solicitacao' } });
  fireEvent.change(screen.getByLabelText('ID do registro'), { target: { value: '1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith(expect.stringContaining('tabela=solicitacao&registro_id=1'), expect.anything()));
  await screen.findByText(/PAT-1/);
  fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
  await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith(expect.stringContaining('page=2'), expect.anything()));
});

it('o histórico do bem solicita também eventos relacionados', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ total: 0, pages: 0, data: [] }) });
  render(<AuditLogPanel tabela="patrimonio" registroId={9} relacionados />);
  await screen.findByText(/Nenhuma atividade/);
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('tabela=patrimonio&registro_id=9&relacionados=true'), expect.anything());
  expect(screen.queryByLabelText('Entidade')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Ação'), { target: { value: 'UPDATE' } });
  fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
  await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith(expect.stringContaining('acao=UPDATE&tabela=patrimonio&registro_id=9&relacionados=true'), expect.anything()));
});
