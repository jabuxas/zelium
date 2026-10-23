import { AsyncLocalStorage } from "async_hooks";

/**
 * Contexto por requisição (multiempresa + auditoria).
 *
 * O middleware de autenticação coloca o usuário autenticado aqui e TODOS os
 * acessos ao banco feitos durante a requisição ficam automaticamente
 * limitados à organização do usuário (ver hooks globais em
 * database/connection.ts e models com `orgScoped: true`).
 */
export interface RequestContext {
  usuarioId: number;
  papel: string;
  organizacaoId: number;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Organização usada quando não há requisição (scripts, migrações, testes). */
export const DEFAULT_ORG_ID = 1;

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function currentContext(): RequestContext | undefined {
  return storage.getStore();
}

export function currentOrgId(): number | undefined {
  return storage.getStore()?.organizacaoId;
}
