import React from "react";
import { renderAsync, screen, fireEvent } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import { buildPaperTheme } from '@/src/shared/theme/tokens';

import DashboardScreen from "../DashboardScreen";

const mockTopInset = 32;
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (path: string) => mockPush(path) } }));

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");

  return {
    SafeAreaInsetsContext: React.createContext({
      top: mockTopInset,
      right: 0,
      bottom: 0,
      left: 0,
    }),
    SafeAreaFrameContext: React.createContext({
      x: 0,
      y: 0,
      width: 320,
      height: 640,
    }),
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => ({ top: mockTopInset, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock("../../hooks/useDashboard", () => ({
  useDashboard: () => ({
    stats: {
      totalPatrimonios: 1,
      totalAmbientes: 2,
      totalConferentes: 3,
      alertasAvaria: 4,
    },
    logs: [{ id: 1, acao: 'UPDATE', recurso: 'patrimonio', recurso_id: 7, registro_nome: 'IFSC-007', usuario: 'Ana', criado_em: '2026-01-01T12:00:00Z' }],
    loading: false,
    error: null,
    isRefreshing: false,
    load: jest.fn(),
    refresh: jest.fn(),
    retry: jest.fn(),
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  return renderAsync(<PaperProvider theme={buildPaperTheme('light')}>{ui}</PaperProvider>);
}

describe("DashboardScreen", () => {
  it("keeps content below the Android status bar safe area", async () => {
    const { getByTestId } = await renderWithProviders(<DashboardScreen />);

    expect(getByTestId("dashboard-scroll").props.contentContainerStyle).toEqual(
      expect.objectContaining({ paddingTop: mockTopInset }),
    );
  });

  it('destaca conferência, consulta e histórico com destinos existentes', async () => {
    await renderWithProviders(<DashboardScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Conferir patrimônio' }));
    expect(mockPush).toHaveBeenLastCalledWith('/escanear');
    fireEvent.press(screen.getByRole('button', { name: 'Buscar patrimônio' }));
    expect(mockPush).toHaveBeenLastCalledWith('/patrimonios');
    fireEvent.press(screen.getByRole('button', { name: 'Ver histórico' }));
    expect(mockPush).toHaveBeenLastCalledWith('/audit-log');
  });

  it('identifica contagens e atividades sem rótulos incorretos ou nomes técnicos', async () => {
    await renderWithProviders(<DashboardScreen />);
    expect(screen.getByText('Conferentes cadastrados')).toBeTruthy();
    expect(screen.getByText('Patrimônios com avaria')).toBeTruthy();
    expect(screen.queryByText('Responsáveis Ativos')).toBeNull();
    expect(screen.getByText('Atualização')).toBeTruthy();
    expect(screen.getByText('Patrimônio · IFSC-007')).toBeTruthy();
    expect(screen.queryByText('UPDATE')).toBeNull();
  });
});
