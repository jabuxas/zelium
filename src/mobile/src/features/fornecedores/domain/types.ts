export interface Fornecedor {
  id: number;
  nome: string;
  cnpj?: string;
  contato?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface FornecedorCreateDto {
  nome: string;
  cnpj?: string;
  contato?: string;
}

export type FornecedorUpdateDto = Partial<FornecedorCreateDto>;
