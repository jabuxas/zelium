# ADR-0013 - Fiscalização do trial (expiração e limites)

## Status
- Aceita (backend; interface do cliente para os novos códigos ainda não existe)

## Contexto
- O cadastro self-service (ADR-0012) provisiona organizações `trial` com 30
  dias, 500 bens e 5 usuários — mas nada aplicava esses metadados: uma trial
  expirada continuava escrevendo normalmente.
- Organizações anteriores ao self-service (`legado`) não podem receber prazo
  ou limite retroativos (decisão registrada no bloco 6).

## Decisão
- **Expirada:** qualquer escrita de negócio é negada com `403` e
  `codigo: "trial_expirado"` — inclusive do Gestor. Leituras e exportações
  continuam disponíveis conforme o perfil (RBAC existente). Login segue
  aberto: usuário precisa acessar para consultar/exportar.
- **Guarda global:** middleware montado uma única vez no router `/api`,
  após autenticação e contexto — routers novos nascem protegidos. Consulta a
  organização apenas em métodos de escrita (GET/HEAD não pagam a consulta).
  Falha fechada: erro ao validar a organização também nega a escrita (503).
- **Limites (trial ativa):** criação de bens e usuários verificada no
  service, antes da gravação (usuário: antes de custear o hash). Excede →
  `403` com `codigo: "limite_trial"` e mensagem com o valor real do limite
  da organização. Default de provisionamento: 500 bens / 5 usuários
  (configurável por organização).
- **Contagem:** bens não arquivados (paranoid) e usuários ativos — arquivar
  bem ou desativar usuário libera vaga. Legado não tem limite.
- **403 + código em vez de 402:** mantém consistência com as negações de
  RBAC (403). O cliente distingue por `codigo`, não por texto de mensagem.

## Alternativas
- **402 Payment Required:** semanticamente tentador, mas introduziria um
  status inédito no sistema só para este caso; `codigo` resolve sem custo.
- **Deletar/desativar organização ao expirar:** destrutivo e irreversível
  para consulta — o produto promete leitura/exportação após expirar.
- **Limites rígidos com serialização por organização:** contagem-then-insert
  não é atômica; duas criações simultâneas na borda podem exceder em uma
  unidade. Aceito como guardrail de trial; limites contratuais rígidos
  exigirão lock/advisory lock por organização.

## Consequências
- Custo de escrita: +1 consulta (organização) por POST/PUT/PATCH/DELETE.
  Leituras inalteradas. Volume de piloto: aceito.
- O cliente web/mobile ainda não trata os novos códigos — mostrar fluxo de
  renovação/contato é trabalho de interface pendente.
- Quando existir troca de senha self-service, avaliar isenção própria
  (trocar a própria senha é manutenção de conta, não escrita de negócio).
- Suítes unitárias sem banco simulam a guarda como permitida
  (`jest.mock`) — boundary de teste; verificação real em `tests/trial.test.ts`.
- Evidências: contrato e gates em
  [`ONBOARDING_SELF_SERVICE.md`](../ONBOARDING_SELF_SERVICE.md).
