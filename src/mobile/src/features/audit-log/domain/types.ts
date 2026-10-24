export interface AuditLog {
  id: number;
  acao: string;
  recurso: string;
  recurso_id: number;
  usuario?: string;
  detalhes?: string;
  criado_em: string;
  registro_nome?: string;
  patrimonio_id?: number;
  alteracoes?: { campo: string; anterior: unknown; novo: unknown }[];
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
