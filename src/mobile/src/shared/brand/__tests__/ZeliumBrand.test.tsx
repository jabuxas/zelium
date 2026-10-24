import { render, screen, fireEvent } from '@testing-library/react-native';
import { ZeliumBrand } from '../ZeliumBrand';

it('usa fallback textual sem uma logo oficial', () => {
  render(<ZeliumBrand logoSource={null} />);
  expect(screen.getByText('Zelium')).toBeTruthy();
  expect(screen.queryByLabelText('Logo Zelium')).toBeNull();
});

it('mantém o nome quando o carregamento do arquivo falha', () => {
  render(<ZeliumBrand logoSource={{ uri: 'https://brand.example/zelium.png' }} />);
  fireEvent(screen.getByLabelText('Logo Zelium'), 'error', { nativeEvent: { error: 'Ausente' } });
  expect(screen.getByText('Zelium')).toBeTruthy();
});
