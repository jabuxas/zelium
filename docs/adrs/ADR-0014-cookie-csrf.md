# ADR-0014 - Sessão web por cookie HttpOnly com defesa CSRF

## Status
- Aceita (web usa cookie; mobile e clientes de API seguem com Bearer)

## Contexto
- O token JWT vivia no `localStorage` da web: qualquer XSS leria o token de 7
  dias, e a checagem de rota do Next dependia de um cookie otimista escrito
  por JS (`zelar_logado`), que nada garantia.
- A API respondia `Access-Control-Allow-Origin: *` — ilegal junto de
  credenciais e incompatível com cookies de sessão.
- Falta registrada no GUIA_TESTES ("cookie de sessão httpOnly na web") desde
  o bloco 5; adiada por mexer em web, mobile e E2E simultaneamente.

## Decisão
- **Web (navegador):** o login define `zelium_sessao` — `HttpOnly`,
  `SameSite=Lax`, `Path=/`, `Secure` em produção — e a web para de guardar
  token em localStorage (mantém apenas usuário/organização para exibição).
  O JWT continua no CORPO da resposta: o app mobile precisa dele para o
  Bearer; a web simplesmente ignora.
- **authenticate:** aceita header `Authorization` (prioritário) ou cookie de
  sessão como fallback. Revalidação por requisição (ADR-0011) vale para ambos.
- **CSRF (defesa em profundidade, OWASP):** escritas autenticadas POR COOKIE
  exigem `X-Requested-With: XMLHttpRequest`. Header customizado exige
  preflight; o preflight só é aprovado para `WEB_ORIGINS` (allowlist) —
  combinado com SameSite=Lax, fecha cross-site em navegadores modernos e
  antigos. Bearer é isento por natureza (o atacante não define headers de
  outro domínio).
- **CORS:** ACAO só para origens da allowlist, com
  `Access-Control-Allow-Credentials: true` e `X-Requested-With` liberado.
  Produção é same-origin pelo Caddy (`/api` no mesmo domínio) e NÃO depende
  de CORS: sem `WEB_ORIGINS`, a allowlist em produção é vazia por padrão.
- **Logout:** `POST /api/auth/logout` (authenticate + CSRF para cookie)
  apaga o cookie no cliente. Semântica inalterada no servidor: sem denylist;
  revogação real continua via troca de senha/desativação (ADR-0011).
- **E2E:** API sobe em `localhost:8870` (antes `127.0.0.1`). Cookies ignoram
  porta, mas não HOST: `localhost:3370 → 127.0.0.1:8870` seria cross-site e o
  SameSite=Lax não viajaria; `localhost → localhost` é mesma site. Produção
  segue same-origin e não depende desse alinhamento.

## Alternativas
- **Token duplo (CSRF token + cookie):** mais estado e superfície de erro;
  header customizado + SameSite dá a mesma garantia aqui, pois a API não
  aceita origens livres.
- **Cookie para o mobile:** AsyncStorage + Bearer é o padrão RN e funcionava;
  cookies em RN adicionam jar implícito sem benefício para o fluxo atual.
- **Sessão server-side (tabela de sessões):** complexidade e limpeza novas;
  o JWT revogável por versão (ADR-0011) já cobre o requisito real.

## Consequências
- Web: token não é mais lável por XSS (cookie HttpOnly não é acessível a
  scripts); leitura de sessão no mount passa por `/api/auth/me`.
- Escritas via cookie custam o header CSRF; clientes sem o header recebem
  `403 codigo "csrf"` — mensagem orientada ao usuário, sem detalhes internos.
- Migração do cliente: usuários com sessão antiga em localStorage voltam ao
  login uma única vez (o cookie não existe); clientes já tratam 401.
- Cookie e JWT expiram juntos (`JWT_EXPIRES_IN` define o max-age).
- Testes: backend `cookieSessao`/`configSessao`; E2E `api-cookie` (Set-Cookie,
  403 csrf, Bearer isento, logout) e `web-auth` (HttpOnly + localStorage vazio
  após login pela UI). Specs que provavam negação sem credenciais passam a
  usar contexto anônimo (o jar da fixture agora carrega a sessão do login).
