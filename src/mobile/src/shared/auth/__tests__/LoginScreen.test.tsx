import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import LoginScreen from '../../../../app/login';
import { buildPaperTheme } from '@/src/shared/theme/tokens';

const mockLogin = jest.fn();
const mockLogout = jest.fn();
let mockErroSessao: string | null = null;
jest.mock('../AuthContext', () => ({ useAuth: () => ({ login: mockLogin, logout: mockLogout, erroSessao: mockErroSessao }) }));
jest.mock('react-native-safe-area-context', () => ({ ...jest.requireActual('react-native-safe-area-context'), useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

beforeEach(() => { jest.clearAllMocks(); mockErroSessao = null; });

it('não duplica login pelo teclado enquanto envia e bloqueia alterações de credenciais', async () => {
  mockLogin.mockImplementation(() => new Promise(() => {}));
  render(<PaperProvider theme={buildPaperTheme('light')}><LoginScreen /></PaperProvider>);
  fireEvent.changeText(screen.getByLabelText('E-mail'), 'gestor@zelium.com');
  fireEvent.changeText(screen.getByLabelText('Senha'), 'senha');
  fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
  fireEvent(screen.getByLabelText('Senha'), 'submitEditing');
  await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1));
  expect(screen.getByLabelText('E-mail')).toBeDisabled();
  expect(screen.getByLabelText('Senha')).toBeDisabled();
});

it('mostra erro da sessão e oferece nova tentativa de limpeza', async () => {
  mockErroSessao = 'Não foi possível apagar a sessão salva';
  render(<PaperProvider theme={buildPaperTheme('light')}><LoginScreen /></PaperProvider>);
  expect(screen.getByText(mockErroSessao)).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Limpar sessão salva' }));
  await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
});
