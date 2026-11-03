import { limparSessaoInfo } from "./auth";

/**
 * Cliente fetch autenticado por cookie HttpOnly (credentials: include) com
 * header CSRF exigido pela API em escritas. Redireciona para /login quando
 * a sessão expira (HTTP 401).
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  // Defesa CSRF: header customizado exige preflight, aprovado apenas para
  // origens na allowlist da API. Inofensivo em leituras.
  headers.set("X-Requested-With", "XMLHttpRequest");

  const response = await fetch(url, { ...options, headers, credentials: "include" });

  if (response.status === 401) {
    limparSessaoInfo();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }

  return response;
}
