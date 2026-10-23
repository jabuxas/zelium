/** Datas vindas da API nunca devem derrubar a página. */
export function formatarDataHora(valor?: string | null): string {
  if (!valor) return 'Data não informada';
  const data = new Date(valor);
  if (!Number.isFinite(data.getTime())) return 'Data não informada';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short', timeStyle: 'short',
  }).format(data);
}
