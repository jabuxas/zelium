import type { AuditLog } from './types';

export const auditResources: Record<string, string> = {
  patrimonio: 'Patrimônio', ambiente: 'Ambiente', solicitacao: 'Solicitação',
  conferencia: 'Conferência', patrimonio_fotos: 'Foto do patrimônio',
  responsavel: 'Responsável', conferente: 'Conferente', fornecedor: 'Fornecedor',
  estado_item: 'Estado do item', tipo_material: 'Tipo de material', usuario: 'Usuário',
  material: 'Material',
};

export const auditActions: Record<string, string> = {
  CREATE: 'Cadastro', UPDATE: 'Atualização', DELETE: 'Arquivamento', RESTORE: 'Restauração',
};

export function auditAction(action: string): string {
  const legacy: Record<string, string> = { criar: 'CREATE', atualizar: 'UPDATE', excluir: 'DELETE', restaurar: 'RESTORE' };
  return auditActions[legacy[action.toLowerCase()] ?? action.toUpperCase()] ?? 'Evento';
}

export function auditSummary(event: AuditLog): string {
  return `${auditResources[event.recurso] ?? 'Registro'} · ${event.registro_nome || `#${event.recurso_id}`}`;
}

const fields: Record<string, string> = {
  numero_patrimonio: 'Número de patrimônio', descricao: 'Descrição', nome: 'Nome',
  tipo: 'Tipo', status: 'Status', estado_item_id: 'Estado do item', ambiente_id: 'Ambiente',
  responsavel_id: 'Responsável', conferente_id: 'Conferente', patrimonio_id: 'Patrimônio',
  fornecedor_id: 'Fornecedor', tipo_material_id: 'Tipo de material', usuario_id: 'Conferido por',
  observacoes: 'Observações', observacao: 'Observação', valor: 'Valor de aquisição',
  valor_residual: 'Valor residual', vida_util_anos: 'Vida útil (anos)', data_aquisicao: 'Data de aquisição',
  papel: 'Perfil', ativo: 'Ativo', avaria: 'Representa avaria', email: 'E-mail', telefone: 'Telefone',
  bloco: 'Bloco', andar: 'Andar', cargo: 'Cargo', departamento: 'Departamento', cnpj: 'CNPJ',
  latitude: 'Latitude', longitude: 'Longitude', precisao_metros: 'Precisão (m)',
  localizacao_observacao: 'Referência da localização', ordem: 'Ordem', principal: 'Foto principal',
};

export function auditField(field: string): string {
  return fields[field] ?? field.replace(/_id$/, '').replace(/_/g, ' ');
}

export function auditValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Não informado';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'object') return 'Dados complementares';
  if (['valor', 'valor_residual'].includes(field) && Number.isFinite(Number(value))) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  }
  const labels: Record<string, string> = {
    aberta: 'Aberta', em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada',
    manutencao: 'Manutenção', substituicao: 'Substituição', gestor: 'Gestor', responsavel: 'Responsável', conferente: 'Conferente',
  };
  return labels[String(value)] ?? String(value);
}

export function auditDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Data indisponível';
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
