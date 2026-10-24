import { render, screen } from '@testing-library/react';
import TipoMaterialForm from '../TipoMaterialForm';
import EstadoItemForm from '../EstadoItemForm';
import ResponsavelForm from '../ResponsavelForm';
import ConferenteForm from '../ConferenteForm';
import FornecedorForm from '../FornecedorForm';

jest.mock('next/navigation', () => ({ useParams: () => ({}), useRouter: () => ({ push: jest.fn() }) }));
jest.mock('../Toast', () => ({ useToast: () => ({ toast: jest.fn() }) }));

it.each([
  [TipoMaterialForm, ['Nome do Tipo *']],
  [EstadoItemForm, ['Nome do Estado *', 'Descrição']],
  [ResponsavelForm, ['Nome Completo *', 'Email *', 'Telefone', 'Departamento', 'Cargo']],
  [ConferenteForm, ['Nome Completo *', 'Email *', 'Telefone', 'Cargo']],
  [FornecedorForm, ['Nome *', 'CNPJ *', 'Email', 'Telefone']],
] as const)('%p associa rótulos aos campos do formulário', (Form, fields) => {
  render(<Form />);
  for (const label of fields) expect(screen.getByLabelText(label, { exact: true })).toBeInTheDocument();
});
