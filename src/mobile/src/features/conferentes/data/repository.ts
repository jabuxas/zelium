import { apiClient } from "@/src/shared/api/client";
import { getResource } from "@/src/shared/domain/registry";
import { BaseRepository } from "@/src/shared/domain/repository";
import type {
  Conferente,
  ConferenteCreateDto,
  ConferenteUpdateDto,
} from "../domain/types";

const resource = getResource("conferentes");

export type ConferenteRepository = BaseRepository<
  Conferente,
  ConferenteCreateDto,
  ConferenteUpdateDto
>;

export class ConferenteRepositoryImpl implements ConferenteRepository {
  async list(params?: Record<string, unknown>): Promise<Conferente[]> {
    const path = params
      ? `${resource.apiPath}?${new URLSearchParams(params as Record<string, string>)}`
      : resource.apiPath;

    return (await apiClient(path)) as Conferente[];
  }

  async getById(id: number): Promise<Conferente> {
    return (await apiClient(`${resource.apiPath}/${id}`)) as Conferente;
  }

  async create(data: ConferenteCreateDto): Promise<Conferente> {
    return (await apiClient(resource.apiPath, {
      method: "POST",
      body: JSON.stringify(data),
    })) as Conferente;
  }

  async update(id: number, data: ConferenteUpdateDto): Promise<Conferente> {
    return (await apiClient(`${resource.apiPath}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })) as Conferente;
  }

  async delete(id: number): Promise<void> {
    await apiClient(`${resource.apiPath}/${id}`, { method: "DELETE" });
  }
}

export { ConferenteRepositoryImpl as ConferenteRepositoryPlaceholder };
