export interface ResourceConfig {
  label: string;
  mobileRoute: string;
  apiPath: string;
}

export const RESOURCE_REGISTRY: Record<string, ResourceConfig> = {
  patrimonios: {
    label: "Patrimônios",
    mobileRoute: "Patrimonios",
    apiPath: "/patrimonios",
  },
  ambientes: {
    label: "Ambientes",
    mobileRoute: "Ambientes",
    apiPath: "/ambientes",
  },
  responsaveis: {
    label: "Responsáveis",
    mobileRoute: "Responsaveis",
    apiPath: "/responsaveis",
  },
  conferentes: {
    label: "Conferentes",
    mobileRoute: "Conferentes",
    apiPath: "/conferentes",
  },
  fornecedores: {
    label: "Fornecedores",
    mobileRoute: "Fornecedores",
    apiPath: "/fornecedores",
  },
  "tipos-material": {
    label: "Tipos de Material",
    mobileRoute: "TiposMaterial",
    apiPath: "/tipo-material",
  },
  "estados-item": {
    label: "Estados do Item",
    mobileRoute: "EstadosItem",
    apiPath: "/estados-item",
  },
  "audit-log": {
    label: "Audit Log",
    mobileRoute: "AuditLog",
    apiPath: "/audit-log",
  },
} as const;

export function getResource(
  key: keyof typeof RESOURCE_REGISTRY,
): ResourceConfig {
  return RESOURCE_REGISTRY[key];
}

export type ResourceKey = keyof typeof RESOURCE_REGISTRY;

export const RESOURCE_KEYS = Object.keys(RESOURCE_REGISTRY) as ResourceKey[];
