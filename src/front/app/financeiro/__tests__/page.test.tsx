import { render, screen } from '@testing-library/react';
import FinanceiroPage from '../page';

const resumo = {
  total: {
    total_itens: 10,
    itens_depreciaveis: 8,
    valor_aquisicao: 1000,
    valor_residual: 100,
    depreciacao_acumulada: 50,
    valor_contabil: 950,
  },
  por_ambiente: [
    {
      ambiente_id: 1,
      ambiente: 'Sala 10',
      total_itens: 10,
      valor_aquisicao: 1000,
      depreciacao_acumulada: 50,
      valor_contabil: 950,
    },
  ],
};

function mockResumo(dados: unknown) {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => dados });
}

it('avisa quantos bens não depreciam por falta de dados cadastrais', async () => {
  mockResumo(resumo);
  render(<FinanceiroPage />);
  expect(await screen.findByText(/2 bens sem dados completos de depreciação/)).toBeInTheDocument();
  expect(screen.getByText(/falta data de aquisição ou vida útil/i)).toBeInTheDocument();
});

it('usa singular quando apenas um bem está sem dados completos', async () => {
  mockResumo({
    ...resumo,
    total: { ...resumo.total, itens_depreciaveis: 9 },
  });
  render(<FinanceiroPage />);
  expect(await screen.findByText(/1 bem sem dados completos de depreciação/)).toBeInTheDocument();
});

it('não exibe aviso quando todos os bens depreciam', async () => {
  mockResumo({
    ...resumo,
    total: { ...resumo.total, itens_depreciaveis: 10 },
  });
  render(<FinanceiroPage />);
  expect((await screen.findAllByText(/1\.000,00/)).length).toBeGreaterThan(0);
  expect(screen.queryByText(/sem dados completos de depreciação/)).toBeNull();
});

it('deixa claro que os valores são estimativa gerencial, não contabilidade', async () => {
  mockResumo(resumo);
  render(<FinanceiroPage />);
  expect(await screen.findByText(/estimativa gerencial/i)).toBeInTheDocument();
  expect(screen.getByText(/não substitui escrituração contábil/i)).toBeInTheDocument();
});
