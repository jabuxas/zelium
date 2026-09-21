export interface AuditLog {
  id: number;
  acao: string;
  recurso: string;
  recurso_id: number;
  usuario?: string;
  detalhes?: string;
  criado_em: string;
}

export interface AuditLogPaginatedResponse {
  total: number;
  pages: number;
  currentPage: number;
  limit: number;
  data: AuditLog[];
}

export interface AuditLogCreateDto {
  acao: string;
  recurso: string;
  recurso_id: number;
  usuario?: string;
  detalhes?: string;
}

export type AuditLogUpdateDto = Partial<AuditLogCreateDto>;
