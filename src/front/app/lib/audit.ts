export interface AuditEvent {
  id: number;
  tabela: string;
  registro_id: number;
  acao: string;
  usuario?: string;
  created_at?: string;
  createdAt?: string;
  registro_nome?: string;
  patrimonio_id?: number | null;
  dados_anteriores?: Record<string, unknown> | null;
  dados_novos?: Record<string, unknown> | null;
  alteracoes?: { campo: string; anterior: unknown; novo: unknown }[];
}

export interface AuditPage {
  total: number; pages: number; currentPage: number; limit: number; data: AuditEvent[];
}

export const entidadesAudit: Record<string, string> = {
  patrimonio: 'Patrimônio', ambiente: 'Ambiente', solicitacao: 'Solicitação',
  conferencia: 'Conferência', patrimonio_fotos: 'Foto do patrimônio',
  responsavel: 'Responsável', conferente: 'Conferente', fornecedor: 'Fornecedor',
  estado_item: 'Estado do item', tipo_material: 'Tipo de material', usuario: 'Usuário',
};

export const acoesAudit: Record<string, string> = { CREATE: 'cadastrado', UPDATE: 'atualizado', DELETE: 'removido', RESTORE: 'restaurado' };

export const camposRegistro: Record<string, string> = {
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

const valores: Record<string, string> = {
  aberta: 'Aberta', em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada',
  manutencao: 'Manutenção', substituicao: 'Substituição', gestor: 'Gestor', responsavel: 'Responsável', conferente: 'Conferente',
};

export function formatarValor(campo: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return 'Não informado';
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';
  if (campo === 'valor' || campo === 'valor_residual') {
    const numero = Number(valor);
    if (Number.isFinite(numero)) return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numero);
  }
  if (typeof valor === 'object') return 'Dados complementares';
  return valores[String(valor)] ?? String(valor);
}

export function descricaoAudit(log: AuditEvent): string {
  const dados = log.dados_novos ?? log.dados_anteriores ?? {};
  const nome = log.registro_nome ?? dados.numero_patrimonio ?? dados.nome ?? dados.descricao ?? `#${log.registro_id}`;
  const acao = acoesAudit[log.acao] ?? log.acao;
  const feminino = ['solicitacao', 'conferencia', 'patrimonio_fotos'].includes(log.tabela);
  return `${entidadesAudit[log.tabela] ?? 'Registro'} "${nome}" ${feminino ? acao.replace(/o$/, 'a') : acao}`;
}

export function linkAudit(log: AuditEvent): string | null {
  if (log.tabela === 'patrimonio') return `/patrimonios/${log.registro_id}`;
  if (log.tabela === 'solicitacao') return `/solicitacoes/${log.registro_id}`;
  if (log.tabela === 'ambiente') return `/ambientes/${log.registro_id}`;
  const patrimonio = log.patrimonio_id ?? log.dados_novos?.patrimonio_id ?? log.dados_anteriores?.patrimonio_id;
  if (typeof patrimonio === 'number') return `/patrimonios/${patrimonio}`;
  return null;
}
