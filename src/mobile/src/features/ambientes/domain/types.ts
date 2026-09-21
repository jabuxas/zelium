export interface Ambiente {
  id: number;
  nome: string;
  bloco?: string | null;
  andar?: string | null;
  responsavel_id: number;
  latitude?: number | null;
  longitude?: number | null;
  precisao_metros?: number | null;
  localizacao_observacao?: string | null;
  localizacao_atualizada_em?: string | null;
  criado_em?: string;
  atualizado_em?: string;
}

export interface AmbienteCreateDto {
  nome: string;
  bloco?: string;
  andar?: string;
  responsavel_id: number;
  latitude?: number;
  longitude?: number;
  precisao_metros?: number;
  localizacao_observacao?: string;
}

export type AmbienteUpdateDto = Partial<AmbienteCreateDto>;

export interface AmbienteLocalizacaoDto {
  latitude: number;
  longitude: number;
  precisao_metros?: number;
  localizacao_observacao?: string;
}
