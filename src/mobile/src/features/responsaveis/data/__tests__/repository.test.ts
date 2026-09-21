import { apiClient } from "@/src/shared/api/client";
import { DependencyConflictError } from "@/src/shared/api/errors";
import { ResponsavelRepositoryImpl } from "@/src/features/responsaveis/data/repository";

jest.mock("@/src/shared/api/client", () => ({
  apiClient: jest.fn(),
}));

const mockedApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

describe("ResponsavelRepositoryImpl", () => {
  const repository = new ResponsavelRepositoryImpl();

  beforeEach(() => {
    mockedApiClient.mockReset();
  });

  it("lists using registry path", async () => {
    mockedApiClient.mockResolvedValueOnce([{ id: 1, nome: "Maria" }]);

    await repository.list({ active: "true" });

    expect(mockedApiClient).toHaveBeenCalledWith("/responsaveis?active=true");
  });

  it("gets by id", async () => {
    mockedApiClient.mockResolvedValueOnce({ id: 8, nome: "João" });

    await repository.getById(8);

    expect(mockedApiClient).toHaveBeenCalledWith("/responsaveis/8");
  });

  it("creates with POST body", async () => {
    const data = { nome: "João", email: "joao@exemplo.com" };
    mockedApiClient.mockResolvedValueOnce({ id: 9, ...data });

    await repository.create(data);

    expect(mockedApiClient).toHaveBeenCalledWith("/responsaveis", {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

  it("updates with PUT body", async () => {
    const data = { telefone: "(11) 98888-8888" };
    mockedApiClient.mockResolvedValueOnce({ id: 9, nome: "João", ...data });

    await repository.update(9, data);

    expect(mockedApiClient).toHaveBeenCalledWith("/responsaveis/9", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  });

  it("deletes with DELETE and propagates dependency conflict", async () => {
    const error = new DependencyConflictError({
      error: "Dependency conflict",
      patrimonios: [],
      ambientes: [{ id: 2 }],
    });
    mockedApiClient.mockRejectedValueOnce(error);

    await expect(repository.delete(10)).rejects.toBe(error);
    expect(mockedApiClient).toHaveBeenCalledWith("/responsaveis/10", {
      method: "DELETE",
    });
  });
});
