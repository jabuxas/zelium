export interface Responsavel {
  id: number;
  nome: string;
  email?: string;
  telefone?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface ResponsavelCreateDto {
  nome: string;
  email?: string;
  telefone?: string;
}

export type ResponsavelUpdateDto = Partial<ResponsavelCreateDto>;
