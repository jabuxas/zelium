import { apiClient } from "@/src/shared/api/client";
import type { OpcaoEstado, PatrimonioEscaneado } from "../domain/types";

export async function buscarPorNumero(
  numero: string,
): Promise<PatrimonioEscaneado[]> {
  const resultado = (await apiClient(
    `/patrimonios?numero=${encodeURIComponent(numero)}`,
  )) as PatrimonioEscaneado[];
  return resultado;
}

export async function listarEstados(): Promise<OpcaoEstado[]> {
  return (await apiClient("/estados-item")) as OpcaoEstado[];
}

export async function registrarConferencia(
  patrimonioId: number,
  dados: { estado_item_id?: number; observacao?: string },
): Promise<unknown> {
  return apiClient(`/patrimonios/${patrimonioId}/conferencias`, {
    method: "POST",
    body: JSON.stringify(dados),
  });
}
