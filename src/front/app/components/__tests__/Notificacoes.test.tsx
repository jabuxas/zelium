import { render, screen } from '@testing-library/react';
import NotificacoesPage from '../../notificacoes/page';

const notificacao = {
  id: 1, tipo: 'avaria', assunto: 'Avaria no notebook', corpo: 'Tela quebrada',
  destinatarios: ['gestor@teste.com'], status: 'simulada',
};

it.each([
  [{ createdAt: '2026-10-23T12:00:00Z' }, /23\/10\/2026/],
  [{ created_at: '2026-10-23T12:00:00Z' }, /23\/10\/2026/],
  [{ created_at: 'invalida' }, /Data não informada/],
  [{}, /Data não informada/],
])('notificações não quebram com formatos de data diferentes: %j', async (data, esperado) => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [{ ...notificacao, ...data }] });
  render(<NotificacoesPage />);
  expect(await screen.findByText(esperado)).toBeInTheDocument();
  expect(screen.getByText('Avaria no notebook')).toBeInTheDocument();
});
