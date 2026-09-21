import { apiClient } from "@/src/shared/api/client";
import { getResource } from "@/src/shared/domain/registry";
import { BaseRepository } from "@/src/shared/domain/repository";
import type {
  Fornecedor,
  FornecedorCreateDto,
  FornecedorUpdateDto,
} from "../domain/types";

const resource = getResource("fornecedores");

export type FornecedorRepository = BaseRepository<
  Fornecedor,
  FornecedorCreateDto,
  FornecedorUpdateDto
>;

export class FornecedorRepositoryImpl implements FornecedorRepository {
  async list(params?: Record<string, unknown>): Promise<Fornecedor[]> {
    const path = params
      ? `${resource.apiPath}?${new URLSearchParams(params as Record<string, string>)}`
      : resource.apiPath;

    return (await apiClient(path)) as Fornecedor[];
  }

  async getById(id: number): Promise<Fornecedor> {
    return (await apiClient(`${resource.apiPath}/${id}`)) as Fornecedor;
  }

  async create(data: FornecedorCreateDto): Promise<Fornecedor> {
    return (await apiClient(resource.apiPath, {
      method: "POST",
      body: JSON.stringify(data),
    })) as Fornecedor;
  }

  async update(id: number, data: FornecedorUpdateDto): Promise<Fornecedor> {
    return (await apiClient(`${resource.apiPath}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })) as Fornecedor;
  }

  async delete(id: number): Promise<void> {
    await apiClient(`${resource.apiPath}/${id}`, { method: "DELETE" });
  }
}

export { FornecedorRepositoryImpl as FornecedorRepositoryPlaceholder };
