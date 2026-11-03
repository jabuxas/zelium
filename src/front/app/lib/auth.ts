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

/**
 * Sessão web por cookie HttpOnly (definido pela API no login). O token JWT
 * NÃO é persistido no navegador; aqui ficam apenas dados de exibição
 * (usuário/organização) para evitar flash de carregamento. O proxy lê o
 * cookie de sessão server-side; a autorização real é da API.
 */
const USUARIO_KEY = "zelar_usuario";
const ORGANIZACAO_KEY = "zelar_organizacao";

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

export function setSessaoInfo(
  usuario: UsuarioSessao,
  organizacao?: OrganizacaoSessao
): void {
  window.localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
  if (organizacao) {
    window.localStorage.setItem(ORGANIZACAO_KEY, JSON.stringify(organizacao));
  } else {
    window.localStorage.removeItem(ORGANIZACAO_KEY);
  }
}

export function limparSessaoInfo(): void {
  window.localStorage.removeItem(USUARIO_KEY);
  window.localStorage.removeItem(ORGANIZACAO_KEY);
}
