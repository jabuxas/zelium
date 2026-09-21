import { apiClient } from "@/src/shared/api/client";
import { getResource } from "@/src/shared/domain/registry";
import { BaseRepository } from "@/src/shared/domain/repository";
import type {
  Patrimonio,
  PatrimonioCreateDto,
  PatrimonioUpdateDto,
} from "../domain/types";

const resource = getResource("patrimonios");

export type PatrimonioRepository = BaseRepository<
  Patrimonio,
  PatrimonioCreateDto,
  PatrimonioUpdateDto
>;

export class PatrimonioRepositoryImpl implements PatrimonioRepository {
  async list(params?: Record<string, unknown>): Promise<Patrimonio[]> {
    const path = params
      ? `${resource.apiPath}?${new URLSearchParams(params as Record<string, string>)}`
      : resource.apiPath;

    return (await apiClient(path)) as Patrimonio[];
  }

  async getById(id: number): Promise<Patrimonio> {
    return (await apiClient(`${resource.apiPath}/${id}`)) as Patrimonio;
  }

  async create(data: PatrimonioCreateDto): Promise<Patrimonio> {
    return (await apiClient(resource.apiPath, {
      method: "POST",
      body: JSON.stringify(data),
    })) as Patrimonio;
  }

  async update(id: number, data: PatrimonioUpdateDto): Promise<Patrimonio> {
    return (await apiClient(`${resource.apiPath}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })) as Patrimonio;
  }

  async delete(id: number): Promise<void> {
    await apiClient(`${resource.apiPath}/${id}`, { method: "DELETE" });
  }
}

export { PatrimonioRepositoryImpl as PatrimonioRepositoryPlaceholder };
