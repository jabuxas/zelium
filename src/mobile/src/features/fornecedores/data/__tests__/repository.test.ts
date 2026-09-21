import { apiClient } from "@/src/shared/api/client";
import { DependencyConflictError } from "@/src/shared/api/errors";
import { FornecedorRepositoryImpl } from "@/src/features/fornecedores/data/repository";

jest.mock("@/src/shared/api/client", () => ({
  apiClient: jest.fn(),
}));

const mockedApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

describe("FornecedorRepositoryImpl", () => {
  const repository = new FornecedorRepositoryImpl();

  beforeEach(() => {
    mockedApiClient.mockReset();
  });

  it("lists using registry path", async () => {
    mockedApiClient.mockResolvedValueOnce([{ id: 1, nome: "ACME" }]);

    await repository.list({ page: "1" });

    expect(mockedApiClient).toHaveBeenCalledWith("/fornecedores?page=1");
  });

  it("gets by id", async () => {
    mockedApiClient.mockResolvedValueOnce({ id: 2, nome: "ACME" });

    await repository.getById(2);

    expect(mockedApiClient).toHaveBeenCalledWith("/fornecedores/2");
  });

  it("creates with POST body", async () => {
    const data = { nome: "ACME", cnpj: "00000000000100" };
    mockedApiClient.mockResolvedValueOnce({ id: 3, ...data });

    await repository.create(data);

    expect(mockedApiClient).toHaveBeenCalledWith("/fornecedores", {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

  it("updates with PUT body", async () => {
    const data = { contato: "(11) 99999-9999" };
    mockedApiClient.mockResolvedValueOnce({ id: 3, nome: "ACME", ...data });

    await repository.update(3, data);

    expect(mockedApiClient).toHaveBeenCalledWith("/fornecedores/3", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  });

  it("deletes with DELETE and propagates dependency conflict", async () => {
    const error = new DependencyConflictError({
      error: "Dependency conflict",
      patrimonios: [{ id: 1 }],
      ambientes: [],
    });
    mockedApiClient.mockRejectedValueOnce(error);

    await expect(repository.delete(7)).rejects.toBe(error);
    expect(mockedApiClient).toHaveBeenCalledWith("/fornecedores/7", {
      method: "DELETE",
    });
  });
});
