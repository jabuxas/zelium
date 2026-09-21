export interface Conferente {
  id: number;
  nome: string;
  email?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface ConferenteCreateDto {
  nome: string;
  email?: string;
}

export type ConferenteUpdateDto = Partial<ConferenteCreateDto>;
