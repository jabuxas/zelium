import React from "react";
import { renderAsync, screen, fireEvent } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import { buildPaperTheme } from '@/src/shared/theme/tokens';
import type { Papel } from '@/src/shared/auth/session';

import AdminHubScreen from "../AdminHubScreen";

const mockTopInset = 32;
let mockPapel: Papel = 'gestor';
const mockLogout = jest.fn();
const mockPush = jest.fn();
jest.mock('@/src/shared/auth/AuthContext', () => ({ useAuth: () => ({
  usuario: { id: 1, nome: 'Ana', email: 'ana@exemplo.local', papel: mockPapel }, logout: mockLogout,
}) }));

jest.mock("@/src/shared/config/env", () => ({
  apiBaseUrl: "http://localhost:8000/api",
}));

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

jest.mock("expo-router", () => ({
  router: {
    push: (path: string) => mockPush(path),
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  return renderAsync(<PaperProvider theme={buildPaperTheme('light')}>{ui}</PaperProvider>);
}

describe("AdminHubScreen", () => {
  beforeEach(() => { jest.clearAllMocks(); mockPapel = 'gestor'; });

  it("keeps content below the Android status bar safe area", async () => {
    const { getByTestId } = await renderWithProviders(<AdminHubScreen />);

    expect(getByTestId("admin-hub-container").props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ paddingTop: mockTopInset + 16 }),
      ]),
    );
  });

  it.each(['gestor', 'responsavel', 'conferente'] as const)('%s acessa o histórico e pode sair da conta', async papel => {
    mockPapel = papel;
    await renderWithProviders(<AdminHubScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Histórico da organização' }));
    expect(mockPush).toHaveBeenCalledWith('/audit-log');
    fireEvent.press(screen.getByRole('button', { name: 'Sair da conta' }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('admin-hub-scroll')).toBeTruthy();
  });

  it.each(['responsavel', 'conferente'] as const)('não oferece gestão de cadastros para %s nem anuncia solicitações sem rota', async papel => {
    mockPapel = papel;
    await renderWithProviders(<AdminHubScreen />);
    expect(screen.queryByText('Fornecedores')).toBeNull();
    expect(screen.queryByText('Tipos de Material')).toBeNull();
    expect(screen.queryByText(/solicitações/)).toBeNull();
  });

  it('oferece os cinco cadastros ao Gestor', async () => {
    await renderWithProviders(<AdminHubScreen />);
    for (const label of ['Conferentes', 'Estados do Item', 'Fornecedores', 'Responsáveis', 'Tipos de Material']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });
});
