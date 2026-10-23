/**
 * Token de autenticação mantido em memória e injetado pelo apiClient.
 * O AuthProvider sincroniza este valor com o armazenamento persistente
 * (AsyncStorage) ao iniciar o app, fazer login e sair.
 */
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}
