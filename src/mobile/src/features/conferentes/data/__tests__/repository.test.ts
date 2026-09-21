import { apiClient } from "@/src/shared/api/client";
import { DependencyConflictError } from "@/src/shared/api/errors";
import { ConferenteRepositoryImpl } from "@/src/features/conferentes/data/repository";

jest.mock("@/src/shared/api/client", () => ({
  apiClient: jest.fn(),
}));

const mockedApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

describe("ConferenteRepositoryImpl", () => {
  const repository = new ConferenteRepositoryImpl();

  beforeEach(() => {
    mockedApiClient.mockReset();
  });

  it("lists using registry path", async () => {
    mockedApiClient.mockResolvedValueOnce([{ id: 1, nome: "Pedro" }]);

    await repository.list({ q: "pedro" });

    expect(mockedApiClient).toHaveBeenCalledWith("/conferentes?q=pedro");
  });

  it("gets by id", async () => {
    mockedApiClient.mockResolvedValueOnce({ id: 11, nome: "Pedro" });

    await repository.getById(11);

    expect(mockedApiClient).toHaveBeenCalledWith("/conferentes/11");
  });

  it("creates with POST body", async () => {
    const data = { nome: "Pedro", email: "pedro@exemplo.com" };
    mockedApiClient.mockResolvedValueOnce({ id: 12, ...data });

    await repository.create(data);

    expect(mockedApiClient).toHaveBeenCalledWith("/conferentes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

  it("updates with PUT body", async () => {
    const data = { email: "novo@exemplo.com" };
    mockedApiClient.mockResolvedValueOnce({ id: 12, nome: "Pedro", ...data });

    await repository.update(12, data);

    expect(mockedApiClient).toHaveBeenCalledWith("/conferentes/12", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  });

  it("deletes with DELETE and propagates dependency conflict", async () => {
    const error = new DependencyConflictError({
      error: "Dependency conflict",
      patrimonios: [{ id: 3 }],
      ambientes: [{ id: 4 }],
    });
    mockedApiClient.mockRejectedValueOnce(error);

    await expect(repository.delete(13)).rejects.toBe(error);
    expect(mockedApiClient).toHaveBeenCalledWith("/conferentes/13", {
      method: "DELETE",
    });
  });
});
