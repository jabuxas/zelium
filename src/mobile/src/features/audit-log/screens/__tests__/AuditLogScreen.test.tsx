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

jest.mock("@/src/features/audit-log/hooks/useAuditLog", () => ({
  useAuditLog: () => mockHook,
}));

jest.mock("@/src/shared/ui/toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

import AuditLogScreen from "../AuditLogScreen";

const MOCK_DATA = [
  {
    id: 1,
    acao: "criar",
    recurso: "material",
    recurso_id: 10,
    usuario: "admin",
    detalhes: "Criou material X",
    criado_em: "2025-01-01T10:00:00Z",
  },
  {
    id: 2,
    acao: "atualizar",
    recurso: "material",
    recurso_id: 20,
    usuario: "user1",
    criado_em: "2025-01-02T11:00:00Z",
  },
  {
    id: 3,
    acao: "excluir",
    recurso: "tipo_material",
    recurso_id: 30,
    detalhes: undefined as string | undefined,
    criado_em: "2025-01-03T12:00:00Z",
  },
];

const defaultHook = {
  data: MOCK_DATA,
  filteredData: MOCK_DATA,
  loading: false,
  error: null as string | null,
  searchQuery: "",
  filterAcao: "",
  filterRecurso: "",
  load: jest.fn(),
  setSearchQuery: jest.fn(),
  setFilterAcao: jest.fn(),
  setFilterRecurso: jest.fn(),
};

let mockHook = { ...defaultHook };

function renderScreen() {
  return render(
    <PaperProvider>
      <AuditLogScreen />
    </PaperProvider>,
  );
}

describe("AuditLogScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHook = { ...defaultHook };
  });

  it("renders list of audit log entries", () => {
    renderScreen();

    expect(screen.getByText("criar")).toBeTruthy();
    expect(screen.getByText("atualizar")).toBeTruthy();
    expect(screen.getByText("excluir")).toBeTruthy();
  });

  it("shows loading state", () => {
    mockHook = { ...defaultHook, loading: true, filteredData: [] };

    renderScreen();

    expect(screen.getByLabelText("Carregando")).toBeTruthy();
  });

  it("shows error state", () => {
    mockHook = { ...defaultHook, error: "Network error", filteredData: [] };

    renderScreen();

    expect(screen.getByText("Network error")).toBeTruthy();
  });

  it("shows empty state when no data", () => {
    mockHook = { ...defaultHook, data: [], filteredData: [] };

    renderScreen();

    expect(screen.getByText("Nenhum log de auditoria encontrado.")).toBeTruthy();
  });

  it("does not render create button", () => {
    renderScreen();

    expect(screen.queryByLabelText(/criar/i)).toBeNull();
    expect(screen.queryByLabelText(/adicionar/i)).toBeNull();
  });

  it("does not render edit or delete buttons on cards", () => {
    renderScreen();

    expect(screen.queryByLabelText(/editar/i)).toBeNull();
    expect(screen.queryByLabelText(/excluir/i)).toBeNull();
  });

  it("renders resource and resource_id metadata", () => {
    renderScreen();

    expect(screen.getByText("material #10")).toBeTruthy();
    expect(screen.getByText("material #20")).toBeTruthy();
  });

  it("renders usuario when present", () => {
    renderScreen();

    expect(screen.getByText("admin")).toBeTruthy();
    expect(screen.getByText("user1")).toBeTruthy();
  });

  it("calls setSearchQuery when typing in search bar", () => {
    renderScreen();

    const searchBar = screen.getByTestId("audit-log-search");
    fireEvent(searchBar, "onChangeText", "criar");

    expect(mockHook.setSearchQuery).toHaveBeenCalledWith("criar");
  });

  it("shows detalhes when card is expanded", async () => {
    renderScreen();

    const card = screen.getByTestId("audit-log-card-1");
    fireEvent(card, "press");

    await waitFor(() => {
      expect(screen.getByText("Criou material X")).toBeTruthy();
    });
  });

  it("does not crash when detalhes is absent", () => {
    renderScreen();

    expect(screen.getByTestId("audit-log-card-3")).toBeTruthy();
  });
});