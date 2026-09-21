import { renderHook, act } from "@testing-library/react-native";
import { useConferentes } from "../useConferentes";
import { DependencyConflictError } from "@/src/shared/api/errors";

jest.mock("@/src/features/conferentes/data/repository", () => {
  const mockInstance = {
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  return {
    ConferenteRepositoryImpl: jest.fn().mockImplementation(() => mockInstance),
    __mockInstance: mockInstance,
  };
});

jest.mock("@/src/shared/ui/toast", () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

const { __mockInstance } = jest.requireMock("@/src/features/conferentes/data/repository") as {
  __mockInstance: {
    list: jest.Mock;
    getById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

const MOCK_DATA = [
  { id: 1, nome: "Conferente A", email: "ana@exemplo.com" },
  { id: 2, nome: "Conferente B", email: "beto@exemplo.com" },
  { id: 3, nome: "Conferente C" },
];

describe("useConferentes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads data successfully", async () => {
    __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);

    const { result } = renderHook(() => useConferentes());

    await act(async () => {
      await result.current.load();
    });

    expect(result.current.data).toEqual(MOCK_DATA);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("filters by nome and email", async () => {
    __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);

    const { result } = renderHook(() => useConferentes());

    await act(async () => {
      await result.current.load();
    });

    act(() => result.current.setSearchQuery("ana"));
    expect(result.current.filteredData).toEqual([MOCK_DATA[0]]);

    act(() => result.current.setSearchQuery("beto@"));
    expect(result.current.filteredData).toEqual([MOCK_DATA[1]]);

    act(() => result.current.setSearchQuery("conferente c"));
    expect(result.current.filteredData).toEqual([MOCK_DATA[2]]);
  });

  it("creates, updates and removes items", async () => {
    __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);
    __mockInstance.create.mockResolvedValueOnce({ id: 4, nome: "Novo", email: "novo@exemplo.com" });
    __mockInstance.update.mockResolvedValueOnce({ id: 1, nome: "Conferente A+", email: "ana@exemplo.com" });
    __mockInstance.delete.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useConferentes());

    await act(async () => {
      await result.current.load();
    });

    await act(async () => {
      await result.current.create({ nome: "Novo", email: "novo@exemplo.com" });
    });

    await act(async () => {
      await result.current.update(1, { nome: "Conferente A+" });
    });

    await act(async () => {
      await result.current.remove(2);
    });

    expect(result.current.data).toEqual([
      { id: 1, nome: "Conferente A+", email: "ana@exemplo.com" },
      { id: 3, nome: "Conferente C" },
      { id: 4, nome: "Novo", email: "novo@exemplo.com" },
    ]);
  });

  it("rethrows dependency conflicts on remove", async () => {
    __mockInstance.list.mockResolvedValueOnce(MOCK_DATA);
    __mockInstance.delete.mockRejectedValueOnce(new DependencyConflictError({ error: "Em uso" }));

    const { result } = renderHook(() => useConferentes());

    await act(async () => {
      await result.current.load();
    });

    await expect(result.current.remove(1)).rejects.toBeInstanceOf(DependencyConflictError);
  });
});
