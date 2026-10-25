export interface EstadoItem {
  id: number;
  nome: string;
  descricao?: string | null;
  avaria?: boolean;
  criado_em?: string;
  atualizado_em?: string;
}

export interface EstadoItemCreateDto {
  nome: string;
  descricao?: string | null;
  avaria?: boolean;
}

export type EstadoItemUpdateDto = Partial<EstadoItemCreateDto>;
