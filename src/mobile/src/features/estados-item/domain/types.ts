export interface EstadoItem {
  id: number;
  nome: string;
  descricao?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface EstadoItemCreateDto {
  nome: string;
  descricao?: string;
}

export type EstadoItemUpdateDto = Partial<EstadoItemCreateDto>;
