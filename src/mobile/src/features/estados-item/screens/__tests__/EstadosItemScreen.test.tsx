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

jest.mock("@/src/features/estados-item/hooks/useEstadosItem", () => ({
  useEstadosItem: () => mockHook,
}));

jest.mock("@/src/shared/ui/toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

import EstadosItemScreen from "../EstadosItemScreen";

const MOCK_DATA = [
  { id: 1, nome: "Bom", descricao: "Estado bom" },
  { id: 2, nome: "Regular", descricao: "Estado regular" },
  { id: 3, nome: "Ruim" },
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
      <EstadosItemScreen />
    </PaperProvider>,
  );
}

describe("EstadosItemScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHook = { ...defaultHook };
  });

  it("renders list of estados do item", () => {
    renderScreen();

    expect(screen.getByText("Bom")).toBeTruthy();
    expect(screen.getByText("Regular")).toBeTruthy();
    expect(screen.getByText("Ruim")).toBeTruthy();
  });

  it("shows loading state", () => {
    mockHook = { ...defaultHook, loading: true, filteredData: [], data: [] };
    renderScreen();

    expect(screen.getByTestId("estados-item-list-loading")).toBeTruthy();
  });

  it("shows error state with retry", () => {
    mockHook = {
      ...defaultHook,
      loading: false,
      error: "Erro ao carregar",
      filteredData: [],
      data: [],
    };
    renderScreen();

    expect(screen.getByText("Erro ao carregar")).toBeTruthy();
    expect(screen.getByTestId("estados-item-list-retry")).toBeTruthy();
  });

  it("calls load on mount", () => {
    renderScreen();

    expect(mockHook.load).toHaveBeenCalledTimes(1);
  });

  it("calls setSearchQuery when typing in search bar", () => {
    renderScreen();

    fireEvent.changeText(screen.getByTestId("estados-item-search"), "bom");

    expect(mockHook.setSearchQuery).toHaveBeenCalledWith("bom");
  });

  it("opens create form when FAB pressed", () => {
    renderScreen();

    fireEvent.press(screen.getByTestId("estados-item-fab"));

    expect(screen.getByText("Novo Estado do Item")).toBeTruthy();
  });

  it("opens edit form when edit button pressed", () => {
    renderScreen();

    fireEvent.press(screen.getByTestId("estado-item-card-1-edit"));

    expect(screen.getByText("Editar Estado do Item")).toBeTruthy();
  });

  it("opens delete dialog when delete button pressed", () => {
    renderScreen();

    fireEvent.press(screen.getByTestId("estado-item-card-1-delete"));

    expect(screen.getByTestId("estados-item-delete-dialog")).toBeTruthy();
  });

  it("calls create on form save for new item", async () => {
    mockHook.create.mockResolvedValueOnce({ id: 4, nome: "Novo" });
    renderScreen();

    fireEvent.press(screen.getByTestId("estados-item-fab"));
    fireEvent.changeText(
      screen.getByTestId("estados-item-form-field-nome"),
      "Novo",
    );
    fireEvent.press(screen.getByTestId("estados-item-form-save"));

    await waitFor(() => {
      expect(mockHook.create).toHaveBeenCalledWith({ nome: "Novo" });
    });
  });

  it("calls update on form save for existing item", async () => {
    mockHook.update.mockResolvedValueOnce({ id: 1, nome: "Bom atualizado" });
    renderScreen();

    fireEvent.press(screen.getByTestId("estado-item-card-1-edit"));
    fireEvent.changeText(
      screen.getByTestId("estados-item-form-field-nome"),
      "Bom atualizado",
    );
    fireEvent.press(screen.getByTestId("estados-item-form-save"));

    await waitFor(() => {
      expect(mockHook.update).toHaveBeenCalledWith(1, { nome: "Bom atualizado" });
    });
  });

  it("calls remove when delete confirmed", async () => {
    mockHook.remove.mockResolvedValueOnce(undefined);
    renderScreen();

    fireEvent.press(screen.getByTestId("estado-item-card-1-delete"));
    fireEvent.press(screen.getByTestId("estados-item-delete-dialog-confirm"));

    await waitFor(() => {
      expect(mockHook.remove).toHaveBeenCalledWith(1);
    });
  });
});
