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

jest.mock("@/src/features/tipos-material/hooks/useTiposMaterial", () => ({
  useTiposMaterial: () => mockHook,
}));

jest.mock("@/src/shared/ui/toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

import TiposMaterialScreen from "../TiposMaterialScreen";
import { DependencyConflictError } from "@/src/shared/api/errors";

const MOCK_DATA = [
  { id: 1, nome: "Metal", descricao: "Material metálico" },
  { id: 2, nome: "Plástico", descricao: "Material plástico" },
  { id: 3, nome: "Madeira" },
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
      <TiposMaterialScreen />
    </PaperProvider>,
  );
}

describe("TiposMaterialScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHook = { ...defaultHook };
  });

  it("renders list of tipos de material", () => {
    renderScreen();

    expect(screen.getByText("Metal")).toBeTruthy();
    expect(screen.getByText("Plástico")).toBeTruthy();
    expect(screen.getByText("Madeira")).toBeTruthy();
  });

  it("shows loading state", () => {
    mockHook = { ...defaultHook, loading: true, filteredData: [], data: [] };
    renderScreen();

    expect(screen.getByTestId("tipos-material-list-loading")).toBeTruthy();
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
    expect(screen.getByTestId("tipos-material-list-retry")).toBeTruthy();
  });

  it("calls load on mount", () => {
    renderScreen();

    expect(mockHook.load).toHaveBeenCalledTimes(1);
  });

  it("calls setSearchQuery when typing in search bar", () => {
    renderScreen();

    fireEvent.changeText(screen.getByTestId("tipos-material-search"), "metal");

    expect(mockHook.setSearchQuery).toHaveBeenCalledWith("metal");
  });

  it("opens create form when FAB pressed", () => {
    renderScreen();

    fireEvent.press(screen.getByTestId("tipos-material-fab"));

    expect(screen.getByText("Novo Tipo de Material")).toBeTruthy();
  });

  it("opens edit form when edit button pressed", () => {
    renderScreen();

    fireEvent.press(screen.getByTestId("tipo-material-card-1-edit"));

    expect(screen.getByText("Editar Tipo de Material")).toBeTruthy();
  });

  it("opens delete dialog when delete button pressed", () => {
    renderScreen();

    fireEvent.press(screen.getByTestId("tipo-material-card-1-delete"));

    expect(screen.getByTestId("tipos-material-delete-dialog")).toBeTruthy();
  });

  it("calls create on form save for new item", async () => {
    mockHook.create.mockResolvedValueOnce({ id: 4, nome: "Vidro" });
    renderScreen();

    fireEvent.press(screen.getByTestId("tipos-material-fab"));
    fireEvent.changeText(
      screen.getByTestId("tipos-material-form-field-nome"),
      "Vidro",
    );
    fireEvent.press(screen.getByTestId("tipos-material-form-save"));

    await waitFor(() => {
      expect(mockHook.create).toHaveBeenCalledWith({
        nome: "Vidro",
        descricao: undefined,
      });
    });
  });

  it("calls update on form save for existing item", async () => {
    mockHook.update.mockResolvedValueOnce({
      ...MOCK_DATA[0],
      nome: "Metal Atualizado",
    });
    renderScreen();

    fireEvent.press(screen.getByTestId("tipo-material-card-1-edit"));
    fireEvent.changeText(
      screen.getByTestId("tipos-material-form-field-nome"),
      "Metal Atualizado",
    );
    fireEvent.press(screen.getByTestId("tipos-material-form-save"));

    await waitFor(() => {
      expect(mockHook.update).toHaveBeenCalledWith(1, { nome: "Metal Atualizado" });
    });
  });

  it("calls remove on delete confirm", async () => {
    mockHook.remove.mockResolvedValueOnce(undefined);
    renderScreen();

    fireEvent.press(screen.getByTestId("tipo-material-card-1-delete"));
    fireEvent.press(screen.getByTestId("tipos-material-delete-dialog-confirm"));

    await waitFor(() => {
      expect(mockHook.remove).toHaveBeenCalledWith(1);
    });
  });

  it("shows dependency conflict error in delete dialog", async () => {
    const conflictError = new DependencyConflictError({
      error: "Possui patrimônios vinculados",
      patrimonios: [{ id: 1 }],
    });
    mockHook.remove.mockRejectedValueOnce(conflictError);
    renderScreen();

    fireEvent.press(screen.getByTestId("tipo-material-card-1-delete"));
    fireEvent.press(screen.getByTestId("tipos-material-delete-dialog-confirm"));

    await waitFor(() => {
      expect(
        screen.getByText("Possui patrimônios vinculados"),
      ).toBeTruthy();
    });
  });

  it("closes delete dialog on cancel", () => {
    renderScreen();

    fireEvent.press(screen.getByTestId("tipo-material-card-1-delete"));
    expect(screen.getByTestId("tipos-material-delete-dialog")).toBeTruthy();

    fireEvent.press(screen.getByTestId("tipos-material-delete-dialog-cancel"));
  });

  it("closes form dialog on cancel", () => {
    renderScreen();

    fireEvent.press(screen.getByTestId("tipos-material-fab"));
    expect(screen.getByText("Novo Tipo de Material")).toBeTruthy();

    fireEvent.press(screen.getByTestId("tipos-material-form-cancel"));
  });

  it("shows empty state when no data", () => {
    mockHook = {
      ...defaultHook,
      data: [],
      filteredData: [],
    };
    renderScreen();

    expect(screen.getByText("Nenhum tipo de material encontrado.")).toBeTruthy();
  });
});