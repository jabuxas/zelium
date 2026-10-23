export type Papel = "gestor" | "responsavel" | "conferente";

export interface UsuarioSessao {
  id: number;
  email: string;
  nome: string;
  papel: Papel;
  organizacaoId: number;
}

export interface OrganizacaoSessao {
  id: number;
  nome: string;
}

const TOKEN_KEY = "zelar_token";
const USUARIO_KEY = "zelar_usuario";
const ORGANIZACAO_KEY = "zelar_organizacao";
const COOKIE_KEY = "zelar_logado";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getUsuario(): UsuarioSessao | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USUARIO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UsuarioSessao;
  } catch {
    return null;
  }
}

export function getOrganizacao(): OrganizacaoSessao | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ORGANIZACAO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OrganizacaoSessao;
  } catch {
    return null;
  }
}

export function setSession(
  token: string,
  usuario: UsuarioSessao,
  organizacao?: OrganizacaoSessao
): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
  if (organizacao) {
    window.localStorage.setItem(ORGANIZACAO_KEY, JSON.stringify(organizacao));
  }
  // Cookie simples usado pelo proxy.ts (checagem otimista de rota)
  document.cookie = `${COOKIE_KEY}=1; path=/; max-age=604800; SameSite=Lax`;
}

export function clearSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USUARIO_KEY);
  window.localStorage.removeItem(ORGANIZACAO_KEY);
  document.cookie = `${COOKIE_KEY}=; path=/; max-age=0`;
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
