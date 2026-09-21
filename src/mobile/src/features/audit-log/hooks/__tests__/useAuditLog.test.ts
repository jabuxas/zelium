import { renderHook, act } from "@testing-library/react-native";
import { useAuditLog } from "../useAuditLog";

jest.mock("@/src/features/audit-log/data/repository", () => {
  const mockInstance = {
    list: jest.fn(),
  };
  return {
    AuditLogRepositoryImpl: jest.fn().mockImplementation(() => mockInstance),
    __mockInstance: mockInstance,
  };
});

jest.mock("@/src/shared/ui/toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

const { __mockInstance } = require("@/src/features/audit-log/data/repository");

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
    usuario: "admin",
    detalhes: "Removeu tipo Y",
    criado_em: "2025-01-03T12:00:00Z",
  },
];

describe("useAuditLog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("load", () => {
    it("loads data successfully", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);

      const { result } = renderHook(() => useAuditLog());

      await act(async () => {
        await result.current.load();
      });

      expect(result.current.data).toEqual(MOCK_DATA);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("sets error on load failure", async () => {
      __mockInstance.list.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useAuditLog());

      await act(async () => {
        await result.current.load();
      });

      expect(result.current.error).toBe("Network error");
    });
  });

  describe("search filter", () => {
    it("filters by acao using searchQuery", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);

      const { result } = renderHook(() => useAuditLog());

      await act(async () => {
        await result.current.load();
      });

      await act(async () => {
        result.current.setSearchQuery("criar");
      });

      expect(result.current.filteredData).toHaveLength(1);
      expect(result.current.filteredData[0].acao).toBe("criar");
    });

    it("filters by recurso using searchQuery", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);

      const { result } = renderHook(() => useAuditLog());

      await act(async () => {
        await result.current.load();
      });

      await act(async () => {
        result.current.setSearchQuery("tipo_material");
      });

      expect(result.current.filteredData).toHaveLength(1);
      expect(result.current.filteredData[0].recurso).toBe("tipo_material");
    });

    it("filters by usuario using searchQuery", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);

      const { result } = renderHook(() => useAuditLog());

      await act(async () => {
        await result.current.load();
      });

      await act(async () => {
        result.current.setSearchQuery("user1");
      });

      expect(result.current.filteredData).toHaveLength(1);
      expect(result.current.filteredData[0].usuario).toBe("user1");
    });

    it("returns all data when searchQuery is empty", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);

      const { result } = renderHook(() => useAuditLog());

      await act(async () => {
        await result.current.load();
      });

      expect(result.current.filteredData).toHaveLength(3);
    });
  });

  describe("action filter", () => {
    it("filters by filterAcao", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);

      const { result } = renderHook(() => useAuditLog());

      await act(async () => {
        await result.current.load();
      });

      await act(async () => {
        result.current.setFilterAcao("criar");
      });

      expect(result.current.filteredData).toHaveLength(1);
      expect(result.current.filteredData[0].acao).toBe("criar");
    });
  });

  describe("resource filter", () => {
    it("filters by filterRecurso", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);

      const { result } = renderHook(() => useAuditLog());

      await act(async () => {
        await result.current.load();
      });

      await act(async () => {
        result.current.setFilterRecurso("material");
      });

      expect(result.current.filteredData).toHaveLength(2);
    });
  });

  describe("combined filters", () => {
    it("combines filterAcao and filterRecurso", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);

      const { result } = renderHook(() => useAuditLog());

      await act(async () => {
        await result.current.load();
      });

      await act(async () => {
        result.current.setFilterAcao("criar");
        result.current.setFilterRecurso("material");
      });

      expect(result.current.filteredData).toHaveLength(1);
      expect(result.current.filteredData[0].acao).toBe("criar");
      expect(result.current.filteredData[0].recurso).toBe("material");
    });
  });
});
