export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export type DependencyConflictPayload = {
  error: string;
  patrimonios?: unknown[];
  ambientes?: unknown[];
  [key: string]: unknown;
};

export class DependencyConflictError extends ApiError {
  readonly patrimonios: unknown[] | undefined;
  readonly ambientes: unknown[] | undefined;

  constructor(payload: DependencyConflictPayload) {
    super(payload.error, 409, payload);
    this.name = "DependencyConflictError";
    this.patrimonios = payload.patrimonios;
    this.ambientes = payload.ambientes;
  }
}

/** Fiscalização do trial (ADR-0013): o app distingue os códigos para dar
 * mensagens claras — escrita bloqueada na expiração, teto atingido — sem
 * derrubar a sessão nem bloquear consultas. */
export class TrialExpiredError extends ApiError {
  constructor(payload: { error: string; codigo?: string }) {
    super(payload.error, 403, payload);
    this.name = "TrialExpiredError";
  }
}

export class LimiteTrialError extends ApiError {
  constructor(payload: { error: string; codigo?: string }) {
    super(payload.error, 403, payload);
    this.name = "LimiteTrialError";
  }
}
