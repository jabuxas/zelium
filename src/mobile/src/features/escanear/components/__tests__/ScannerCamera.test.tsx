import { renderAsync, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import ScannerCamera from '../ScannerCamera';

let mockGranted = false;
const mockRequest = jest.fn();
jest.mock('expo-camera', () => {
  const { View } = require('react-native');
  return {
    useCameraPermissions: () => [{ granted: mockGranted, canAskAgain: true }, mockRequest],
    CameraView: (props: object) => <View {...props} />,
  };
});

beforeEach(() => { mockGranted = false; mockRequest.mockReset().mockResolvedValue({ granted: false }); });

it('não monta a câmera sem permissão e só solicita após ação explícita', async () => {
  await renderAsync(<PaperProvider><ScannerCamera onScanned={jest.fn()} /></PaperProvider>);
  expect(screen.queryByTestId('camera-view')).toBeNull();
  expect(mockRequest).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Permitir câmera' }));
  await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
  expect(screen.getByText(/digitar o número/)).toBeTruthy();
});

it('encaminha o QR apenas com permissão concedida', async () => {
  mockGranted = true;
  const onScanned = jest.fn();
  await renderAsync(<PaperProvider><ScannerCamera onScanned={onScanned} /></PaperProvider>);
  fireEvent(screen.getByTestId('camera-view'), 'barcodeScanned', { data: 'QR-001' });
  expect(onScanned).toHaveBeenCalledWith('QR-001');
});
