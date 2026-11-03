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

  // Fiscalização do trial (ADR-0013): banner global em vez de erro em cada
  // formulário. Clone antes de ler: o corpo original permanece para o chamador.
  if (response.status === 403 && typeof window !== "undefined") {
    const corpo = await response.clone().json().catch(() => null);
    if (corpo?.codigo === "trial_expirado") {
      window.dispatchEvent(new CustomEvent("zelium:trial-expirado"));
    }
  }

  return response;
}
