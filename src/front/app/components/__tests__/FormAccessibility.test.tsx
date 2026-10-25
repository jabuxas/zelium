import { act, render, screen } from '@testing-library/react';
import TipoMaterialForm from '../TipoMaterialForm';
import EstadoItemForm from '../EstadoItemForm';
import ResponsavelForm from '../ResponsavelForm';
import ConferenteForm from '../ConferenteForm';
import FornecedorForm from '../FornecedorForm';
import AmbienteForm from '../AmbienteForm';
import PatrimonioForm from '../PatrimonioForm';

jest.mock('next/navigation', () => ({ useParams: () => ({}), useRouter: () => ({ push: jest.fn() }) }));
jest.mock('../Toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));
jest.mock('../../lib/api-client', () => ({ apiFetch: jest.fn().mockResolvedValue({ ok: true, json: async () => [] }) }));

it.each([
  [TipoMaterialForm, ['Nome do Tipo *']],
  [EstadoItemForm, ['Nome do Estado *', 'Descrição']],
  [ResponsavelForm, ['Nome Completo *', 'Email *', 'Telefone', 'Departamento', 'Cargo']],
  [ConferenteForm, ['Nome Completo *', 'Email *', 'Telefone', 'Cargo']],
  [FornecedorForm, ['Nome *', 'CNPJ *', 'Email', 'Telefone']],
  [AmbienteForm, ['Nome do Ambiente *', 'Bloco', 'Andar/Localização', 'Responsável pelo Ambiente *']],
  [PatrimonioForm, ['Número do Patrimônio *', 'Tipo de Material *', 'Descrição *', 'Valor (R$) *', 'Estado do Item *', 'Fornecedor', 'Ambiente *', 'Responsável *', 'Data de Aquisição', 'Vida Útil (anos)', 'Valor Residual (R$)', 'Observações']],
] as const)('%p associa rótulos aos campos do formulário', async (Form, fields) => {
  await act(async () => { render(<Form />); });
  for (const label of fields) expect(screen.getByLabelText(label, { exact: true })).toBeInTheDocument();
});
