# ADR-0012 - Cadastro pendente e provisionamento por confirmação

## Status
- Aceita para implementação sob flag, não para abertura pública

## Contexto
- Self-service não pode criar usuários ativos antes de comprovar posse do
  e-mail nem permitir que o cliente escolha tenant, papel ou datas de trial.
- Os hooks de auditoria são multiempresa, com organização padrão para scripts.
  Pendências ainda não pertencem a uma organização; notificações operacionais
  incluem gestores e persistem corpo da mensagem, inadequados para links.

## Decisão
- Solicitar apenas nome, e-mail e nome da organização; definir senha somente
  na confirmação. Evita confirmar uma conta cuja senha já é do conhecimento
  de quem iniciou um pré-cadastro malicioso. Não há login automático.
- Token aleatório de 256 bits, SHA-256 no banco, prazo de 24h e consumo único
  via POST com bloqueio de linha. Link no fragmento evita enviá-lo em URLs
  HTTP/referer; a interface futura deve removê-lo da barra e nunca logá-lo.
- `cadastro_pendente` usa SQL parametrizado fora dos hooks de auditoria de
  negócio. Não contém senha. E-mail único arbitra pedidos concorrentes.
- Consumir token e criar organização, Gestor, quatro estados e auditoria em
  uma transação. Organização é criada com hooks desativados só nesse ponto,
  seguida de auditoria explícita no contexto da NOVA organização (não a
  padrão); ambos são obrigatórios e atômicos. Usuário/estados usam hooks normais.
- Trial começa na confirmação; legado é explícito, sem expiração retroativa.
- Reutilizar apenas EmailService em modo privado: sem envio simulado ou log
  de erro SMTP bruto/destinatário. Parser HTTP também não registra os corpos.
- Feature desabilitada por padrão, com SMTP e URL HTTPS fixos obrigatórios.

## Alternativas
- **Criar usuário inativo com senha no pedido:** mistura pendências e contas,
  permite escolher senha antes de provar posse do e-mail e dificulta retenção.
- **Usar JWT como confirmação:** token de sessão e confirmação têm ciclos
  distintos; token opaco com registro permite expiração e consumo atômicos.
- **Reutilizar NotificacaoService:** vazaria links para gestores e banco.
- **Fila durável desde este incremento:** adiada para uma fatia própria,
  mantendo a abertura pública bloqueada; o envio síncrono não oculta latência
  nem garante recuperação automática se o processo cair após reservar pedido.

## Consequências
- Limpeza diária de expirados é requisito do piloto, com comando próprio.
- Confirmação concorrente/replay não duplicam tenants. Falha mantém pendência
  utilizável até expirar; conta existente nunca é vinculada/reativada pelo link.
- Trial tem somente metadados neste incremento: fiscalização, web/CSRF,
  seeds, e-mail real e revisão independente continuam gates de liberação.
- Contrato, evidências e limitações: [ONBOARDING_SELF_SERVICE.md](../ONBOARDING_SELF_SERVICE.md).
