/**
 * Cookie de sessão do navegador. O token continua sendo emitido no corpo
 * da resposta para o app mobile (Bearer); o navegador NÃO guarda o token:
 * usa apenas este cookie HttpOnly.
 */
export const COOKIE_SESSAO = "zelium_sessao";

function segundosDeJwt(valor: string): number | null {
  const match = /^(\d+)([smhd])?$/.exec(valor.trim());
  if (!match) return null;
  const quantidade = Number(match[1]);
  const unidade: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return quantidade * (unidade[match[2] ?? "s"] ?? 1);
}

const PADRAO_SEGUNDOS = 7 * 24 * 60 * 60;

/** O cookie expira junto com o JWT que carrega. Lê a env diretamente (sem
 * importar config/auth, que tem fail-fast no load) para acompanhar
 * JWT_EXPIRES_IN inclusive em testes que trocam a env. */
export function cookieMaxAgeSegundos(): number {
  return segundosDeJwt(process.env.JWT_EXPIRES_IN ?? "") ?? PADRAO_SEGUNDOS;
}

/** Produção roda atrás do Caddy com HTTPS: Secure impede vazamento por
 * HTTP. Em dev/local (sem TLS) Secure faria o navegador descartar o cookie. */
export function cookieSeguro(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Origens cross-origin autorizadas a chamar a API com credenciais (cookies).
 * Produção é same-origin pelo Caddy (/api no mesmo domínio), então a lista
 * padrão em produção é VAZIA — same-origin não passa por CORS. Dev e E2E
 * usam portas locais (mesma site: SameSite=Lax entrega o cookie).
 */
export function origensWebPermitidas(): string[] {
  const bruto = process.env.WEB_ORIGINS;
  if (bruto !== undefined) {
    return bruto.split(",").map(item => item.trim()).filter(Boolean);
  }
  return process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:3000", "http://localhost:3370", "http://localhost:8170"];
}

/** Leitura manual (sem dependência nova) do ÚNICO cookie que a API define. */
export function lerCookieSessao(cabecalhoCookie: string | undefined): string | null {
  if (!cabecalhoCookie) return null;
  for (const parte of cabecalhoCookie.split(";")) {
    const [nome, ...resto] = parte.trim().split("=");
    if (nome === COOKIE_SESSAO) return resto.join("=");
  }
  return null;
}
