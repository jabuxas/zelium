/**
 * Token de autenticação mantido em memória e injetado pelo apiClient.
 * O AuthProvider sincroniza este valor com o armazenamento persistente
 * (AsyncStorage) ao iniciar o app, fazer login e sair.
 */
let authToken: string | null = null;
let generation = 0;
const expiredListeners = new Set<() => void>();

export function setAuthToken(token: string | null): void {
  authToken = token;
  generation += 1;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function authGeneration(): number { return generation; }

export function onSessionExpired(listener: () => void): () => void {
  expiredListeners.add(listener);
  return () => { expiredListeners.delete(listener); };
}

/** Um 401 antigo nunca deve encerrar uma sessão iniciada depois da requisição. */
export function expireSession(expectedGeneration: number): void {
  if (!authToken || generation !== expectedGeneration) return;
  setAuthToken(null);
  expiredListeners.forEach(listener => listener());
}
