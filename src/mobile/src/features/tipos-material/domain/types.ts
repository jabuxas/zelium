export interface TipoMaterial {
  id: number;
  nome: string;
  descricao?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface TipoMaterialCreateDto {
  nome: string;
  descricao?: string;
}

export type TipoMaterialUpdateDto = Partial<TipoMaterialCreateDto>;
