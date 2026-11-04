# Plano do app mobile

Recorte acordado: o mobile é o **coletor de campo** — inventário, conferência,
fotos e consulta. O que é operação de escritório (cadastro self-service,
importação CSV, relatórios completos, financeiro) permanece na web. Este plano
não muda esse recorte; lista o que o app PRECISA acompanhar do que já existe
no backend e o que fica deliberadamente de fora.

## Contexto de estado (03–04/11/2026)

- Backend: sessão por cookie HttpOnly **na web**; o app mobile segue com
  token no `AsyncStorage` + `Authorization: Bearer` — o login continua
  devolvendo o token no corpo exatamente para isso. Nada a mudar aqui.
- Sessões revogáveis (`sessao_version`, ADR-0011), limites de login/cadastro,
  fiscalização de trial (ADR-0013), recuperação/troca de senha
  (`/api/usuarios/senha` + fluxo por e-mail), importação CSV (web-only).

## A fazer no app (por ordem)

1. **Alterar senha na tela Conta** — o endpoint
   `POST /api/usuarios/senha` (`{ senha_atual, senha }`) já existe e serve ao
   Bearer. A tela avisa que todas as sessões caem (inclusive a do próprio
   aparelho) e volta ao login após trocar. É o único item com trabalho de UI
   necessário agora.
2. **Tratar `403 codigo: "trial_expirado"`** — escritas do app passam a ser
   negadas quando o trial da organização vence. Hoje o app mostraria erro
   genérico. Tratar o código com uma mensagem clara (consultas continuam
   disponíveis; renovação é contato comercial) — sem bloquear o app inteiro.
3. **Superfície de erros por código** — mesmo tratamento do item 2 para
   `limite_trial` (só aparece se alguém criar bens pelo app em organização
   trial no limite) e para `403 csrf` (não deve ocorrer via Bearer; se
   ocorrer, é bug de cliente).
4. **Regressão do bloco 5b/6 nos specs** — os testes mobile de sessão devem
   continuar verdes (Bearer intocado); acrescentar caso de troca de senha
   quando o item 1 entrar.

## Deliberadamente fora do mobile

- Cadastro self-service e confirmação por e-mail (link abre a web).
- Importação CSV (escritório, com análise antes de gravar).
- Relatórios CSV/PDF e financeiro (Gestor na web).
- Cookies de sessão (navegador; o app continua com AsyncStorage + Bearer).

## Pendências estruturais (já registradas, sem prazo novo)

- APK real distribuído e testado em dispositivo físico (exige conta expo.dev).
- Job mobile no CI.
- Câmera/GPS/teclado nativos dependem de hardware — Expo Web não homologa.
