/** Redação aplicada também na leitura para proteger snapshots legados. */
export function sanitizarAuditoria(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizarAuditoria);
  if (!value || typeof value !== 'object' || value instanceof Date) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) =>
    !/senha|password|token|secret/i.test(key)
  ).map(([key, item]) => [key, sanitizarAuditoria(item)]));
}

export const TABELAS_OPERACIONAIS = ['patrimonio', 'ambiente', 'solicitacao', 'conferencia', 'patrimonio_fotos'];
export const TABELAS_ADMINISTRATIVAS = ['responsavel', 'conferente', 'fornecedor', 'estado_item', 'tipo_material', 'usuario'];

export function tabelasVisiveis(papel: string, operacional = false): string[] {
  return papel === 'gestor' && !operacional
    ? [...TABELAS_OPERACIONAIS, ...TABELAS_ADMINISTRATIVAS]
    : TABELAS_OPERACIONAIS;
}
