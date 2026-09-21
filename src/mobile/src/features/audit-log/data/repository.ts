import { apiClient } from "@/src/shared/api/client";
import { getResource } from "@/src/shared/domain/registry";
import type { AuditLog } from "../domain/types";

const resource = getResource("audit-log");

export interface AuditLogRepository {
  list(params?: Record<string, unknown>): Promise<AuditLog[]>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringifyDetails(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function normalizeAuditLog(item: unknown): AuditLog {
  if (!isRecord(item)) {
    return {
      id: 0,
      acao: "desconhecido",
      recurso: "desconhecido",
      recurso_id: 0,
      criado_em: new Date(0).toISOString(),
    };
  }

  const detalhes =
    item.detalhes ??
    (item.dados_anteriores || item.dados_novos
      ? {
          dados_anteriores: item.dados_anteriores,
          dados_novos: item.dados_novos,
        }
      : undefined);

  const usuario = item.usuario ?? item.usuario_id;

  const normalized: AuditLog = {
    id: readNumber(item.id),
    acao: readString(item.acao ?? item.operacao ?? item.action, "desconhecido"),
    recurso: readString(item.recurso ?? item.tabela ?? item.table, "desconhecido"),
    recurso_id: readNumber(item.recurso_id ?? item.registro_id ?? item.registroId),
    criado_em: readString(
      item.criado_em ?? item.created_at ?? item.createdAt ?? item.data,
      new Date(0).toISOString(),
    ),
  };

  if (usuario !== undefined && usuario !== null) {
    normalized.usuario = String(usuario);
  }

  const normalizedDetails = stringifyDetails(detalhes);
  if (normalizedDetails) {
    normalized.detalhes = normalizedDetails;
  }

  return normalized;
}

function normalizeListResponse(payload: unknown): AuditLog[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizeAuditLog);
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data.map(normalizeAuditLog);
  }

  return [];
}

export class AuditLogRepositoryImpl implements AuditLogRepository {
  async list(params?: Record<string, unknown>): Promise<AuditLog[]> {
    const path = params
      ? `${resource.apiPath}?${new URLSearchParams(params as Record<string, string>)}`
      : resource.apiPath;

    return normalizeListResponse(await apiClient(path));
  }
}

export { AuditLogRepositoryImpl as AuditLogRepositoryPlaceholder };
