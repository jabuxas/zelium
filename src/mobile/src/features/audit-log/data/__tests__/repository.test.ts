import { apiClient } from "@/src/shared/api/client";
import { AuditLogRepositoryImpl } from "@/src/features/audit-log/data/repository";

jest.mock("@/src/shared/api/client", () => ({
  apiClient: jest.fn(),
}));

const mockedApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

describe("AuditLogRepositoryImpl", () => {
  const repository = new AuditLogRepositoryImpl();

  beforeEach(() => {
    mockedApiClient.mockReset();
  });

  it("lists using registry path and query params", async () => {
    mockedApiClient.mockResolvedValueOnce([{ id: 1, acao: "create", recurso: "x", recurso_id: 2, criado_em: "2026-01-01T00:00:00Z" }]);

    const result = await repository.list({ page: "3" });

    expect(result).toEqual([
      {
        id: 1,
        acao: "create",
        recurso: "x",
        recurso_id: 2,
        criado_em: "2026-01-01T00:00:00Z",
      },
    ]);
    expect(mockedApiClient).toHaveBeenCalledWith("/audit-log?page=3");
  });

  it("unwraps paginated backend response", async () => {
    mockedApiClient.mockResolvedValueOnce({
      total: 1,
      pages: 1,
      currentPage: 1,
      limit: 10,
      data: [
        {
          id: 1,
          operacao: "criar",
          tabela: "patrimonio",
          registro_id: 7,
          dados_novos: { descricao: "Notebook" },
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
    });

    const result = await repository.list();

    expect(result).toEqual([
      {
        id: 1,
        acao: "criar",
        recurso: "patrimonio",
        recurso_id: 7,
        detalhes: JSON.stringify(
          {
            dados_anteriores: undefined,
            dados_novos: { descricao: "Notebook" },
          },
          null,
          2,
        ),
        criado_em: "2026-01-01T00:00:00Z",
      },
    ]);
  });
});
