import { renderHook, act } from "@testing-library/react-native";
import { useTiposMaterial } from "../useTiposMaterial";
import { DependencyConflictError } from "@/src/shared/api/errors";

jest.mock("@/src/features/tipos-material/data/repository", () => {
  const mockInstance = {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  return {
    TipoMaterialRepositoryImpl: jest.fn().mockImplementation(() => mockInstance),
    __mockInstance: mockInstance,
  };
});

jest.mock("@/src/shared/ui/toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

const { __mockInstance } = require("@/src/features/tipos-material/data/repository");

const MOCK_DATA = [
  { id: 1, nome: "Metal", descricao: "Material metálico" },
  { id: 2, nome: "Plástico", descricao: "Material plástico" },
  { id: 3, nome: "Madeira" },
];

describe("useTiposMaterial", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("load", () => {
    it("loads data successfully", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);

      const { result } = renderHook(() => useTiposMaterial());

      await act(async () => {
        await result.current.load();
      });

      expect(result.current.data).toEqual(MOCK_DATA);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("sets error on load failure", async () => {
      __mockInstance.list.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useTiposMaterial());

      await act(async () => {
        await result.current.load();
      });

      expect(result.current.error).toBe("Network error");
    });
  });

  describe("create", () => {
    it("creates a new item and adds to data", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);
      const newItem = { id: 4, nome: "Vidro", descricao: "Transparente" };
      __mockInstance.create.mockResolvedValueOnce(newItem);

      const { result } = renderHook(() => useTiposMaterial());

      await act(async () => {
        await result.current.load();
      });

      await act(async () => {
        await result.current.create({ nome: "Vidro", descricao: "Transparente" });
      });

      expect(result.current.data).toHaveLength(4);
      expect(result.current.data).toContainEqual(newItem);
    });

    it("shows error toast on create failure", async () => {
      __mockInstance.create.mockRejectedValueOnce(new Error("Create failed"));

      const { result } = renderHook(() => useTiposMaterial());

      await expect(
        act(async () => {
          await result.current.create({ nome: "Fail" });
        }),
      ).rejects.toBeDefined();
    });
  });

  describe("update", () => {
    it("updates an item in data", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);
      const updated = { ...MOCK_DATA[0], nome: "Metal Atualizado" };
      __mockInstance.update.mockResolvedValueOnce(updated);

      const { result } = renderHook(() => useTiposMaterial());

      await act(async () => {
        await result.current.load();
      });

      await act(async () => {
        await result.current.update(1, { nome: "Metal Atualizado" });
      });

      expect(result.current.data[0]).toEqual(updated);
    });
  });

  describe("remove", () => {
    it("removes an item from data", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);
      __mockInstance.delete.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useTiposMaterial());

      await act(async () => {
        await result.current.load();
      });

      await act(async () => {
        await result.current.remove(1);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data.find((i) => i.id === 1)).toBeUndefined();
    });

    it("handles DependencyConflictError on delete", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);
      const conflictError = new DependencyConflictError({
        error: "Possui patrimônios vinculados",
        patrimonios: [{ id: 1 }],
      });
      __mockInstance.delete.mockRejectedValueOnce(conflictError);

      const { result } = renderHook(() => useTiposMaterial());

      await act(async () => {
        await result.current.load();
      });

      await expect(
        act(async () => {
          await result.current.remove(1);
        }),
      ).rejects.toBe(conflictError);
    });
  });

  describe("search filter", () => {
    it("filters data by nome (case-insensitive)", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);

      const { result } = renderHook(() => useTiposMaterial());

      await act(async () => {
        await result.current.load();
      });

      act(() => {
        result.current.setSearchQuery("metal");
      });

      expect(result.current.filteredData).toEqual([MOCK_DATA[0]]);
    });

    it("filters data by descricao (case-insensitive)", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);

      const { result } = renderHook(() => useTiposMaterial());

      await act(async () => {
        await result.current.load();
      });

      act(() => {
        result.current.setSearchQuery("plástico");
      });

      expect(result.current.filteredData).toEqual([MOCK_DATA[1]]);
    });

    it("returns all data when search is empty", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);

      const { result } = renderHook(() => useTiposMaterial());

      await act(async () => {
        await result.current.load();
      });

      expect(result.current.filteredData).toEqual(MOCK_DATA);
    });
  });
});
