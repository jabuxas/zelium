export interface Patrimonio {
  id: number;
  numero_patrimonio: string;
  descricao: string;
  valor: number;
  observacoes: string;
  tipo_material_id: number;
  estado_item_id: number;
  ambiente_id: number;
  responsavel_id: number;
  fornecedor_id?: number | null;
  foto_principal_url?: string | null;
  criado_em?: string;
  atualizado_em?: string;
}

export interface PatrimonioFoto {
  id: number;
  patrimonio_id: number;
  url: string;
  nome_arquivo?: string;
  nome_original?: string | null;
  mime_type: string;
  tamanho_bytes: number;
  largura?: number | null;
  altura?: number | null;
  descricao?: string | null;
  ordem?: number | null;
  principal: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PatrimonioFotoUploadInput {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  descricao?: string;
  principal?: boolean;
}

export interface PatrimonioFotoUpdateDto {
  descricao?: string;
  ordem?: number;
  principal?: boolean;
}

export interface PatrimonioCreateDto {
  numero_patrimonio: string;
  descricao: string;
  valor: number;
  observacoes?: string;
  tipo_material_id: number;
  estado_item_id: number;
  ambiente_id: number;
  responsavel_id: number;
  fornecedor_id?: number | null;
}

export type PatrimonioUpdateDto = Partial<PatrimonioCreateDto>;
