import { apiClient } from "@/src/shared/api/client";
import { DependencyConflictError } from "@/src/shared/api/errors";
import { EstadoItemRepositoryImpl } from "@/src/features/estados-item/data/repository";

jest.mock("@/src/shared/api/client", () => ({
  apiClient: jest.fn(),
}));

const mockedApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

describe("EstadoItemRepositoryImpl", () => {
  const repository = new EstadoItemRepositoryImpl();

  beforeEach(() => {
    mockedApiClient.mockReset();
  });

  it("lists using registry path", async () => {
    mockedApiClient.mockResolvedValueOnce([{ id: 1, nome: "Bom" }]);

    await repository.list({ search: "bom" });

    expect(mockedApiClient).toHaveBeenCalledWith("/estados-item?search=bom");
  });

  it("gets by id", async () => {
    mockedApiClient.mockResolvedValueOnce({ id: 4, nome: "Ruim" });

    await repository.getById(4);

    expect(mockedApiClient).toHaveBeenCalledWith("/estados-item/4");
  });

  it("creates with POST body", async () => {
    const data = { nome: "Novo", descricao: "Estado" };
    mockedApiClient.mockResolvedValueOnce({ id: 5, ...data });

    await repository.create(data);

    expect(mockedApiClient).toHaveBeenCalledWith("/estados-item", {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

  it("updates with PUT body", async () => {
    const data = { nome: "Atualizado" };
    mockedApiClient.mockResolvedValueOnce({ id: 5, nome: "Atualizado" });

    await repository.update(5, data);

    expect(mockedApiClient).toHaveBeenCalledWith("/estados-item/5", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  });

  it("deletes with DELETE and propagates dependency conflict", async () => {
    const error = new DependencyConflictError({
      error: "Dependency conflict",
      patrimonios: [],
      ambientes: [{ id: 1 }],
    });
    mockedApiClient.mockRejectedValueOnce(error);

    await expect(repository.delete(6)).rejects.toBe(error);
    expect(mockedApiClient).toHaveBeenCalledWith("/estados-item/6", {
      method: "DELETE",
    });
  });
});
