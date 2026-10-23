import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";
import { PermissionProvider } from '@/src/shared/auth/permissions';
import type { Papel } from '@/src/shared/auth/session';

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

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
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 320, height: 640 },
      insets,
    },
  };
});

jest.mock("@/src/features/conferentes/hooks/useConferentes", () => ({
  useConferentes: () => mockHook,
}));

jest.mock("@/src/shared/ui/toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

import ConferentesScreen from "../ConferentesScreen";

const MOCK_DATA = [
  { id: 1, nome: "Conferente A", email: "ana@exemplo.com" },
  { id: 2, nome: "Conferente B", email: "beto@exemplo.com" },
];

const defaultHook: {
  data: typeof MOCK_DATA;
  filteredData: typeof MOCK_DATA;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  load: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  remove: jest.Mock;
  setSearchQuery: jest.Mock;
} = {
  data: MOCK_DATA,
  filteredData: MOCK_DATA,
  loading: false,
  error: null,
  searchQuery: "",
  load: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  setSearchQuery: jest.fn(),
};

let mockHook = { ...defaultHook };

function renderScreen(papel: Papel = 'gestor') {
  return render(
    <PaperProvider>
      <PermissionProvider papel={papel}><ConferentesScreen /></PermissionProvider>
    </PaperProvider>,
  );
}

describe("ConferentesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHook = { ...defaultHook };
  });

  it("renders list and metadata", () => {
    renderScreen();

    expect(screen.getByText("Conferente A")).toBeTruthy();
    expect(screen.getByText("Conferente B")).toBeTruthy();
    expect(screen.getAllByText("Email").length).toBeGreaterThan(0);
  });

  it.each(['responsavel', 'conferente'] as const)('%s consulta mas não altera cadastros', async papel => {
    renderScreen(papel);
    expect(screen.getByLabelText('Criar conferente')).toBeDisabled();
    expect(screen.getByLabelText('Editar Conferente A')).toBeDisabled();
    expect(screen.getByLabelText('Excluir Conferente A')).toBeDisabled();
    fireEvent.press(screen.getByLabelText('Criar conferente'));
    fireEvent.press(screen.getByLabelText('Editar Conferente A'));
    expect(screen.queryByText('Novo Conferente')).toBeNull();
    expect(mockHook.create).not.toHaveBeenCalled();
    expect(mockHook.update).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText('Conferente A')).toBeTruthy());
  });

  it("shows search and form labels", async () => {
    renderScreen();

    expect(screen.getByPlaceholderText("Buscar conferentes...")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Criar conferente"));

    await waitFor(() => {
      expect(screen.getByText("Novo Conferente")).toBeTruthy();
    });

    expect(screen.getAllByText("Nome do conferente").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Email (opcional)").length).toBeGreaterThan(0);
  });
});
