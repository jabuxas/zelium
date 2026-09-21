import { apiClient } from "@/src/shared/api/client";
import { getResource } from "@/src/shared/domain/registry";
import { BaseRepository } from "@/src/shared/domain/repository";
import type {
  Responsavel,
  ResponsavelCreateDto,
  ResponsavelUpdateDto,
} from "../domain/types";

const resource = getResource("responsaveis");

export type ResponsavelRepository = BaseRepository<
  Responsavel,
  ResponsavelCreateDto,
  ResponsavelUpdateDto
>;

export class ResponsavelRepositoryImpl implements ResponsavelRepository {
  async list(params?: Record<string, unknown>): Promise<Responsavel[]> {
    const path = params
      ? `${resource.apiPath}?${new URLSearchParams(params as Record<string, string>)}`
      : resource.apiPath;

    return (await apiClient(path)) as Responsavel[];
  }

  async getById(id: number): Promise<Responsavel> {
    return (await apiClient(`${resource.apiPath}/${id}`)) as Responsavel;
  }

  async create(data: ResponsavelCreateDto): Promise<Responsavel> {
    return (await apiClient(resource.apiPath, {
      method: "POST",
      body: JSON.stringify(data),
    })) as Responsavel;
  }

  async update(id: number, data: ResponsavelUpdateDto): Promise<Responsavel> {
    return (await apiClient(`${resource.apiPath}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })) as Responsavel;
  }

  async delete(id: number): Promise<void> {
    await apiClient(`${resource.apiPath}/${id}`, { method: "DELETE" });
  }
}

export { ResponsavelRepositoryImpl as ResponsavelRepositoryPlaceholder };
