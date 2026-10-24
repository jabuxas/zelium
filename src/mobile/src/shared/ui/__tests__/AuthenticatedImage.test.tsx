import { render, screen, waitFor } from '@testing-library/react-native';
import { AuthenticatedImage } from '../AuthenticatedImage.web';
import { getAuthToken, onSessionExpired, setAuthToken } from '@/src/shared/auth/tokenStore';

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000/api';
  setAuthToken('token-teste');
  URL.createObjectURL = jest.fn(() => 'blob:foto-privada');
  URL.revokeObjectURL = jest.fn();
  global.fetch = jest.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['foto']) });
});

it('busca fotos com autorização e libera o blob ao desmontar', async () => {
  const { unmount } = render(<AuthenticatedImage uri="http://localhost:8000/uploads/patrimonios/bem.png" testID="foto" />);
  await waitFor(() => expect(screen.getByTestId('foto').props.source.uri).toBe('blob:foto-privada'));
  expect(fetch).toHaveBeenCalledWith('http://localhost:8000/uploads/patrimonios/bem.png', expect.objectContaining({ headers: { Authorization: 'Bearer token-teste' }, cache: 'no-store' }));
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:foto-privada');
});

it('não envia credenciais para uma imagem externa', () => {
  render(<AuthenticatedImage uri="https://outro.exemplo/foto.png" testID="foto" />);
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.getByTestId('foto').props.source.headers).toBeUndefined();
});

it('foto com sessão expirada invalida a sessão vigente', async () => {
  const expired = jest.fn();
  const unsubscribe = onSessionExpired(expired);
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 });
  render(<AuthenticatedImage uri="http://localhost:8000/uploads/patrimonios/bem.png" />);
  await waitFor(() => expect(expired).toHaveBeenCalledTimes(1));
  expect(getAuthToken()).toBeNull();
  unsubscribe();
});

it('erro de arquivo mantém um estado legível sem encerrar a sessão', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });
  render(<AuthenticatedImage uri="http://localhost:8000/uploads/patrimonios/ausente.png" />);
  await screen.findByText('Foto indisponível');
  expect(getAuthToken()).toBe('token-teste');
});
