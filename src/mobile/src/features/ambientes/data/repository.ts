import { apiClient } from "@/src/shared/api/client";
import { getResource } from "@/src/shared/domain/registry";
import { BaseRepository } from "@/src/shared/domain/repository";
import type {
  Ambiente,
  AmbienteCreateDto,
  AmbienteLocalizacaoDto,
  AmbienteUpdateDto,
} from "../domain/types";

const resource = getResource("ambientes");

export type AmbienteRepository = BaseRepository<
  Ambiente,
  AmbienteCreateDto,
  AmbienteUpdateDto
>;

export class AmbienteRepositoryImpl implements AmbienteRepository {
  async list(params?: Record<string, unknown>): Promise<Ambiente[]> {
    const path = params
      ? `${resource.apiPath}?${new URLSearchParams(params as Record<string, string>)}`
      : resource.apiPath;

    return (await apiClient(path)) as Ambiente[];
  }

  async getById(id: number): Promise<Ambiente> {
    return (await apiClient(`${resource.apiPath}/${id}`)) as Ambiente;
  }

  async create(data: AmbienteCreateDto): Promise<Ambiente> {
    return (await apiClient(resource.apiPath, {
      method: "POST",
      body: JSON.stringify(data),
    })) as Ambiente;
  }

  async update(id: number, data: AmbienteUpdateDto): Promise<Ambiente> {
    return (await apiClient(`${resource.apiPath}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    })) as Ambiente;
  }

  async delete(id: number): Promise<void> {
    await apiClient(`${resource.apiPath}/${id}`, { method: "DELETE" });
  }

  async updateLocalizacao(
    id: number,
    dto: AmbienteLocalizacaoDto,
  ): Promise<Ambiente> {
    return (await apiClient(`${resource.apiPath}/${id}/localizacao`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    })) as Ambiente;
  }

  async clearLocalizacao(id: number): Promise<Ambiente> {
    return (await apiClient(`${resource.apiPath}/${id}/localizacao`, {
      method: "DELETE",
    })) as Ambiente;
  }
}

export { AmbienteRepositoryImpl as AmbienteRepositoryPlaceholder };
