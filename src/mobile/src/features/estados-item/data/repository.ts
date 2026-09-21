import { apiClient } from "@/src/shared/api/client";
import { getResource } from "@/src/shared/domain/registry";
import { BaseRepository } from "@/src/shared/domain/repository";
import type {
  EstadoItem,
  EstadoItemCreateDto,
  EstadoItemUpdateDto,
} from "../domain/types";

const resource = getResource("estados-item");

export type EstadoItemRepository = BaseRepository<
  EstadoItem,
  EstadoItemCreateDto,
  EstadoItemUpdateDto
>;

export class EstadoItemRepositoryImpl implements EstadoItemRepository {
  async list(params?: Record<string, unknown>): Promise<EstadoItem[]> {
    const path = params
      ? `${resource.apiPath}?${new URLSearchParams(params as Record<string, string>)}`
      : resource.apiPath;

    return (await apiClient(path)) as EstadoItem[];
  }

  async getById(id: number): Promise<EstadoItem> {
    return (await apiClient(`${resource.apiPath}/${id}`)) as EstadoItem;
  }

  async create(data: EstadoItemCreateDto): Promise<EstadoItem> {
    return (await apiClient(resource.apiPath, {
      method: "POST",
      body: JSON.stringify(data),
    })) as EstadoItem;
  }

  async update(id: number, data: EstadoItemUpdateDto): Promise<EstadoItem> {
    return (await apiClient(`${resource.apiPath}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })) as EstadoItem;
  }

  async delete(id: number): Promise<void> {
    await apiClient(`${resource.apiPath}/${id}`, { method: "DELETE" });
  }
}

export { EstadoItemRepositoryImpl as EstadoItemRepositoryPlaceholder };
