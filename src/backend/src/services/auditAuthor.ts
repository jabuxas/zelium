/** Mantém o ID mesmo quando o nome ocupa todo o VARCHAR(100) da auditoria. */
export function autorAuditoria(nome: string, id: number): string {
  const sufixo = ` (#${id})`;
  return `${Array.from(nome).slice(0, Math.max(0, 100 - sufixo.length)).join('')}${sufixo}`;
}
