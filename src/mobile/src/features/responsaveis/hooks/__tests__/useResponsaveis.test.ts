import { renderHook, act } from "@testing-library/react-native";
import { useResponsaveis } from "../useResponsaveis";
import { DependencyConflictError } from "@/src/shared/api/errors";

jest.mock("@/src/features/responsaveis/data/repository", () => {
  const mockInstance = {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  return {
    ResponsavelRepositoryImpl: jest.fn().mockImplementation(() => mockInstance),
    __mockInstance: mockInstance,
  };
});

jest.mock("@/src/shared/ui/toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

const { __mockInstance } = require("@/src/features/responsaveis/data/repository");

const MOCK_DATA = [
  { id: 1, nome: "Maria", email: "maria@exemplo.com", telefone: "1111" },
  { id: 2, nome: "João", email: "joao@exemplo.com", telefone: "2222" },
  { id: 3, nome: "Ana" },
];

describe("useResponsaveis", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("load", () => {
    it("loads data successfully", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);

      const { result } = renderHook(() => useResponsaveis());

      await act(async () => {
        await result.current.load();
      });

      expect(result.current.data).toEqual(MOCK_DATA);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("sets error on load failure", async () => {
      __mockInstance.list.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useResponsaveis());

      await act(async () => {
        await result.current.load();
      });

      expect(result.current.error).toBe("Network error");
    });
  });

  describe("filteredData", () => {
    it("filters by nome, email and telefone", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);

      const { result } = renderHook(() => useResponsaveis());

      await act(async () => {
        await result.current.load();
      });

      act(() => {
        result.current.setSearchQuery("maria");
      });
      expect(result.current.filteredData).toHaveLength(1);

      act(() => {
        result.current.setSearchQuery("2222");
      });
      expect(result.current.filteredData).toEqual([MOCK_DATA[1]]);

      act(() => {
        result.current.setSearchQuery("exemplo.com");
      });
      expect(result.current.filteredData).toHaveLength(2);
    });
  });

  describe("create", () => {
    it("creates a new item and adds to data", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);
      const newItem = { id: 4, nome: "Pedro", email: "pedro@exemplo.com" };
      __mockInstance.create.mockResolvedValueOnce(newItem);

      const { result } = renderHook(() => useResponsaveis());

      await act(async () => {
        await result.current.load();
      });

      await act(async () => {
        await result.current.create({ nome: "Pedro", email: "pedro@exemplo.com" });
      });

      expect(result.current.data).toHaveLength(4);
      expect(result.current.data).toContainEqual(newItem);
      expect(__mockInstance.create).toHaveBeenCalledWith({
        nome: "Pedro",
        email: "pedro@exemplo.com",
      });
    });
  });

  describe("update", () => {
    it("updates an existing item", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);
      const updatedItem = { id: 2, nome: "João Silva", email: "joao@exemplo.com" };
      __mockInstance.update.mockResolvedValueOnce(updatedItem);

      const { result } = renderHook(() => useResponsaveis());

      await act(async () => {
        await result.current.load();
      });

      await act(async () => {
        await result.current.update(2, { nome: "João Silva", email: "joao@exemplo.com" });
      });

      expect(result.current.data).toContainEqual(updatedItem);
      expect(result.current.data).not.toContainEqual(MOCK_DATA[1]);
    });
  });

  describe("remove", () => {
    it("removes an item", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);
      __mockInstance.delete.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useResponsaveis());

      await act(async () => {
        await result.current.load();
      });

      await act(async () => {
        await result.current.remove(1);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data.find((item) => item.id === 1)).toBeUndefined();
    });

    it("throws dependency conflict errors", async () => {
      __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);
      const error = new DependencyConflictError({
        error: "Dependência encontrada",
        patrimonios: [],
        ambientes: [{ id: 1 }],
      });
      __mockInstance.delete.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useResponsaveis());

      await act(async () => {
        await result.current.load();
      });

      await expect(
        act(async () => {
          await result.current.remove(1);
        }),
      ).rejects.toBe(error);
    });
  });
});
