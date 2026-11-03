import { NextRequest, NextResponse } from "next/server";

/**
 * Proteção otimista de rotas (Next 16 "proxy", antigo middleware).
 *
 * Checa apenas a presença do cookie de sessão HttpOnly `zelium_sessao`
 * (visível ao servidor mesmo sendo HttpOnly) para decidir redirecionar para
 * /login. A autorização real (papéis e dados) é feita pela API — o proxy
 * nunca deve ser a única linha de defesa.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login" || pathname === "/cadastro" || pathname.startsWith("/cadastro/") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const logado = request.cookies.has("zelium_sessao");

  if (!logado) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Ignora arquivos estáticos e assets públicos
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
