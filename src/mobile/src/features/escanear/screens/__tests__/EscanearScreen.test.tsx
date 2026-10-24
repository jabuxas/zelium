import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import { buildPaperTheme } from '@/src/shared/theme/tokens';

jest.mock('@react-navigation/native', () => ({ ...jest.requireActual('@react-navigation/native'), useIsFocused: () => true }));

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const insets = { top: 0, bottom: 0, left: 0, right: 0 };
  const SafeAreaInsetsContext = React.createContext(insets);
  const SafeAreaFrameContext = React.createContext({ x: 0, y: 0, width: 320, height: 640 });
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaInsetsContext,
    SafeAreaFrameContext,
    useSafeAreaInsets: () => insets,
  };
});

jest.mock("expo-camera", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    CameraView: (props: React.ComponentProps<typeof View>) => <View {...props} />,
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
  };
});

const mockBuscarPorNumero = jest.fn();
const mockListarEstados = jest.fn();
const mockRegistrarConferencia = jest.fn();

jest.mock("@/src/features/escanear/data/repository", () => ({
  buscarPorNumero: (...args: unknown[]) => mockBuscarPorNumero(...args),
  listarEstados: (...args: unknown[]) => mockListarEstados(...args),
  registrarConferencia: (...args: unknown[]) => mockRegistrarConferencia(...args),
}));

import EscanearScreen from "../EscanearScreen";
import { CameraView } from "expo-camera";

function renderScreen() {
  return render(
    <PaperProvider theme={buildPaperTheme('light')}>
      <EscanearScreen />
    </PaperProvider>,
  );
}

const PATRIMONIO = {
  id: 1,
  numero_patrimonio: "QR-001",
  descricao: "Notebook de teste",
  valor: 3000,
  estado_item_id: 1,
  ambiente_id: 1,
  responsavel_id: 1,
  foto_principal_url: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockBuscarPorNumero.mockReset();
  mockRegistrarConferencia.mockReset();
  mockListarEstados.mockResolvedValue([
    { id: 1, nome: "Em condições" },
    { id: 2, nome: "Em manutenção" },
  ]);
});

describe("EscanearScreen", () => {
  it("renderiza a tela de inventário em campo", async () => {
    renderScreen();
    expect(screen.getByText("Inventário em campo")).toBeTruthy();
    await waitFor(() => expect(mockListarEstados).toHaveBeenCalled());
    expect(screen.queryByTestId('camera-view')).toBeNull();
  });

  it("busca o patrimonio ao escanear um QR code valido", async () => {
    mockBuscarPorNumero.mockResolvedValue([PATRIMONIO]);
    renderScreen();

    fireEvent.press(screen.getByRole('button', { name: 'Ativar câmera' }));

    fireEvent(screen.UNSAFE_getByType(CameraView), "barcodeScanned", {
      data: "zelium://patrimonio/QR-001",
    });

    await waitFor(() =>
      expect(screen.getByText("QR-001")).toBeTruthy(),
    );
    expect(mockBuscarPorNumero).toHaveBeenCalledWith("QR-001");
  });

  it("registra conferencia com estado e observacao", async () => {
    mockBuscarPorNumero.mockResolvedValue([PATRIMONIO]);
    mockRegistrarConferencia.mockResolvedValue({ id: 1 });
    renderScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Ativar câmera' }));

    fireEvent(screen.UNSAFE_getByType(CameraView), "barcodeScanned", {
      data: "zelium://patrimonio/QR-001",
    });

    await waitFor(() => expect(screen.getByText("QR-001")).toBeTruthy());

    fireEvent.changeText(
      screen.getByLabelText("Observação (opcional)"),
      "Conferido em campo",
    );
    fireEvent.press(screen.getByText("Registrar conferência"));

    await waitFor(() =>
      expect(mockRegistrarConferencia).toHaveBeenCalledWith(1, {
        estado_item_id: 1,
        observacao: "Conferido em campo",
      }),
    );
    expect(await screen.findByText('Conferência registrada com sucesso')).toBeTruthy();
  });

  it("avisa quando o patrimonio nao existe", async () => {
    mockBuscarPorNumero.mockResolvedValue([]);
    renderScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Ativar câmera' }));

    fireEvent(screen.UNSAFE_getByType(CameraView), "barcodeScanned", {
      data: "zelium://patrimonio/NX-999",
    });

    await waitFor(() =>
      expect(screen.getByText('Patrimônio "NX-999" não encontrado')).toBeTruthy(),
    );
  });

  it("aceita numero puro no QR code", async () => {
    mockBuscarPorNumero.mockResolvedValue([PATRIMONIO]);
    renderScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Ativar câmera' }));

    fireEvent(screen.UNSAFE_getByType(CameraView), "barcodeScanned", {
      data: "2024/001",
    });

    await waitFor(() =>
      expect(mockBuscarPorNumero).toHaveBeenCalledWith("2024/001"),
    );
  });

  it('permite consulta manual sem câmera e mantém os dados após falha de gravação', async () => {
    mockBuscarPorNumero.mockResolvedValue([PATRIMONIO]);
    mockRegistrarConferencia.mockRejectedValueOnce(new Error('Sem conexão'));
    renderScreen();
    fireEvent.changeText(screen.getByLabelText('Número de patrimônio'), ' QR-001 ');
    fireEvent.press(screen.getByRole('button', { name: 'Buscar patrimônio' }));
    await screen.findByText('QR-001');
    expect(mockBuscarPorNumero).toHaveBeenCalledWith('QR-001');
    fireEvent.changeText(screen.getByLabelText('Observação (opcional)'), 'Não perder este texto');
    fireEvent.press(screen.getByRole('button', { name: 'Registrar conferência' }));
    await screen.findByText('Erro ao registrar a conferência. Seus dados foram mantidos para tentar novamente.');
    expect(screen.getByLabelText('Observação (opcional)').props.value).toBe('Não perder este texto');
    expect(screen.queryByTestId('camera-view')).toBeNull();
  });

  it('não registra duas conferências nem permite trocar o bem enquanto salva', async () => {
    mockBuscarPorNumero.mockResolvedValue([PATRIMONIO]);
    mockRegistrarConferencia.mockImplementation(() => new Promise(() => {}));
    renderScreen();
    fireEvent.changeText(screen.getByLabelText('Número de patrimônio'), 'QR-001');
    fireEvent.press(screen.getByRole('button', { name: 'Buscar patrimônio' }));
    await screen.findByText('QR-001');
    const submit = screen.getByRole('button', { name: 'Registrar conferência' });
    fireEvent.press(submit); fireEvent.press(submit);
    expect(mockRegistrarConferencia).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Observação (opcional)')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Conferir outro patrimônio' })).toBeDisabled();
  });
});
