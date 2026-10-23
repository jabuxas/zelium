# ADR-0009 - Autenticação JWT com RBAC por papel

## Status
- Aceita

## Contexto
- O sistema atende três perfis distintos (Gestor, Responsável e Conferente) com
  permissões diferentes, e passará a hospedar múltiplas organizações
  (multiempresa). Sem autenticação, qualquer pessoa podia acessar e alterar
  dados de qualquer organização.

## Decisão
- Autenticação por **JWT** (`jsonwebtoken`) com senha armazenada com hash
  **bcrypt**; o token carrega apenas `sub`, `email`, `nome`, `papel` e
  `organizacaoId` — nunca a senha.
- Autorização **RBAC** declarada por rota (`authorize("gestor", ...)`),
  com matriz:
  - **Gestor**: tudo (cadastros, usuários, relatórios, financeiro).
  - **Responsável**: patrimônios, ambientes, solicitações e relatórios.
  - **Conferente**: leitura de patrimônios/ambientes; solicitações, fotos e
    conferências em campo.
- A senha padrão dos usuários de demonstração é `Zelium@2026` e deve ser
  trocada no primeiro acesso (documentado).

## Alternativas
- Sessões em cookie no servidor (requer estado compartilhado entre instâncias).
- Delegar a um provedor externo (OAuth/Keycloak) — adiado; o JWT mantém o
  sistema autocontido e simples de migrar depois.

## Consequências
- Frontend web e app mobile compartilham o mesmo mecanismo de login.
- Rotas `/api` exigem token; `/health` e `/api/auth/login` são públicas.
- A checagem no navegador (proxy.ts) é apenas otimista; a API é a fonte da
  verdade de autorização.
