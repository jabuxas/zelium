import { apiClient } from "@/src/shared/api/client";
import { DependencyConflictError } from "@/src/shared/api/errors";
import { TipoMaterialRepositoryImpl } from "@/src/features/tipos-material/data/repository";

jest.mock("@/src/shared/api/client", () => ({
  apiClient: jest.fn(),
}));

const mockedApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

describe("TipoMaterialRepositoryImpl", () => {
  const repository = new TipoMaterialRepositoryImpl();

  beforeEach(() => {
    mockedApiClient.mockReset();
  });

  it("lists using registry path and query params", async () => {
    mockedApiClient.mockResolvedValueOnce([{ id: 1, nome: "Metal" }]);

    const result = await repository.list({ page: "2" });

    expect(result).toEqual([{ id: 1, nome: "Metal" }]);
    expect(mockedApiClient).toHaveBeenCalledWith("/tipo-material?page=2");
  });

  it("gets by id", async () => {
    mockedApiClient.mockResolvedValueOnce({ id: 7, nome: "Plástico" });

    await repository.getById(7);

    expect(mockedApiClient).toHaveBeenCalledWith("/tipo-material/7");
  });

  it("creates with POST body", async () => {
    const data = { nome: "Madeira", descricao: "Orgânico" };
    mockedApiClient.mockResolvedValueOnce({ id: 3, ...data });

    await repository.create(data);

    expect(mockedApiClient).toHaveBeenCalledWith("/tipo-material", {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

  it("updates with PUT body", async () => {
    const data = { descricao: "Atualizada" };
    mockedApiClient.mockResolvedValueOnce({ id: 3, nome: "Madeira", ...data });

    await repository.update(3, data);

    expect(mockedApiClient).toHaveBeenCalledWith("/tipo-material/3", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  });

  it("deletes with DELETE and propagates dependency conflict", async () => {
    const error = new DependencyConflictError({
      error: "Dependency conflict",
      patrimonios: [{ id: 1 }],
      ambientes: [{ id: 2 }],
    });
    mockedApiClient.mockRejectedValueOnce(error);

    await expect(repository.delete(9)).rejects.toBe(error);
    expect(mockedApiClient).toHaveBeenCalledWith("/tipo-material/9", {
      method: "DELETE",
    });
  });
});
