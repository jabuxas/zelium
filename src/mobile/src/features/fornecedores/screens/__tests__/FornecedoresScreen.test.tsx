import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { PaperProvider } from "react-native-paper";

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

jest.mock("@/src/features/fornecedores/hooks/useFornecedores", () => ({
  useFornecedores: () => mockHook,
}));

jest.mock("@/src/shared/ui/toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

import FornecedoresScreen from "../FornecedoresScreen";

const MOCK_DATA = [
  { id: 1, nome: "Fornecedor A", cnpj: "111", contato: "Ana" },
  { id: 2, nome: "Fornecedor B", contato: "Carlos" },
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

function renderScreen() {
  return render(
    <PaperProvider>
      <FornecedoresScreen />
    </PaperProvider>,
  );
}

describe("FornecedoresScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHook = { ...defaultHook };
  });

  it("renders list and metadata", () => {
    renderScreen();

    expect(screen.getByText("Fornecedor A")).toBeTruthy();
    expect(screen.getByText("Fornecedor B")).toBeTruthy();
    expect(screen.getAllByText("CNPJ").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Contato").length).toBeGreaterThan(0);
  });

  it("shows search and form labels", async () => {
    renderScreen();

    expect(screen.getByPlaceholderText("Buscar fornecedores...")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Criar fornecedor"));

    await waitFor(() => {
      expect(screen.getByText("Novo Fornecedor")).toBeTruthy();
    });

    expect(screen.getAllByText("Nome do fornecedor").length).toBeGreaterThan(0);
    expect(screen.getAllByText("CNPJ (opcional)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Contato (opcional)").length).toBeGreaterThan(0);
  });
});
