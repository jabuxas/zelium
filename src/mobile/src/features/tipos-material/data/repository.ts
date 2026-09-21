import { apiClient } from "@/src/shared/api/client";
import { getResource } from "@/src/shared/domain/registry";
import { BaseRepository } from "@/src/shared/domain/repository";
import type {
  TipoMaterial,
  TipoMaterialCreateDto,
  TipoMaterialUpdateDto,
} from "../domain/types";

const resource = getResource("tipos-material");

export type TipoMaterialRepository = BaseRepository<
  TipoMaterial,
  TipoMaterialCreateDto,
  TipoMaterialUpdateDto
>;

export class TipoMaterialRepositoryImpl implements TipoMaterialRepository {
  async list(params?: Record<string, unknown>): Promise<TipoMaterial[]> {
    const path = params
      ? `${resource.apiPath}?${new URLSearchParams(params as Record<string, string>)}`
      : resource.apiPath;

    return (await apiClient(path)) as TipoMaterial[];
  }

  async getById(id: number): Promise<TipoMaterial> {
    return (await apiClient(`${resource.apiPath}/${id}`)) as TipoMaterial;
  }

  async create(data: TipoMaterialCreateDto): Promise<TipoMaterial> {
    return (await apiClient(resource.apiPath, {
      method: "POST",
      body: JSON.stringify(data),
    })) as TipoMaterial;
  }

  async update(id: number, data: TipoMaterialUpdateDto): Promise<TipoMaterial> {
    return (await apiClient(`${resource.apiPath}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })) as TipoMaterial;
  }

  async delete(id: number): Promise<void> {
    await apiClient(`${resource.apiPath}/${id}`, { method: "DELETE" });
  }
}

export { TipoMaterialRepositoryImpl as TipoMaterialRepositoryPlaceholder };
