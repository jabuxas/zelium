# Cadastro self-service — contrato e controles

Implementação incremental do bloco 6. **Não é liberação pública**: cookies
HttpOnly/CSRF, tratamento dos seeds de demonstração, SMTP real, interface web
e revisão de segurança independente continuam sendo gates separados.

## Contrato implementado no backend

- `POST /api/auth/cadastros`: `{ nome, email, organizacaoNome }`. Resposta
  genérica `202`, inclusive para e-mail existente ou solicitação repetida.
- `POST /api/auth/cadastros/confirmacao`: `{ token, senha }`. Sucesso `201`,
  sem login automático; senha definida somente por quem recebeu o link.
  Senha entre 12 caracteres e 72 bytes UTF-8, bcrypt com custo 12. Token
  desconhecido, expirado, consumido ou e-mail reservado retorna o mesmo `400`.
- Solicitação: até 5 tentativas/IP/15min; confirmação: 10/IP/15min, contando
  sucessos e payloads inválidos. `429` inclui `Retry-After`; erros JSON são
  tratados sem registrar o corpo (`400`, ou `413` acima de 100 KB).
- JSON estrito: campos de papel, organização/ID, datas ou limites enviados
  pelo cliente são recusados com `400`, assim como campos desconhecidos.
- `SELF_SERVICE_ENABLED=true` habilita as duas rotas; padrão desabilitado
  (`404`). Habilitação exige SMTP e `SELF_SERVICE_CONFIRMATION_URL` HTTPS
  fixa, sem credenciais/query/fragmento; nunca usar o header Host para o link.
- Link com segredo aleatório de 256 bits no fragmento, válido por 24 horas.
  A página web futura enviará token e senha via POST explícito; GET não consome
  confirmação (inclusive robôs de pré-visualização de e-mail).
- Somente SHA-256 do token é persistido. Solicitações pendentes não armazenam
  senha nem entram na auditoria de negócio/notificações operacionais.
- Repetição antes de expirar não substitui dados/token nem dispara outro e-mail.
  Após expiração, pode-se solicitar novamente. Falha no envio invalida o pedido.
  A resposta continua sendo o mesmo `202` genérico; não garante entrega.
- Confirmação usa bloqueio de linha e transação: uma organização, primeiro
  Gestor, estados iniciais e auditoria; falha em qualquer parte desfaz tudo.
  Replay retorna `400` e não é login; nenhum JWT é retornado na confirmação.
  O login posterior usa o contrato existente e sessões revogáveis (ADR-0011).
- Trial de 30 dias começa na confirmação; limites iniciais de 500 bens/5
  usuários. Organizações existentes ficam explicitamente como `legado`, sem
  prazo retroativo. Fiscalização aplicada no backend (ADR-0013): trial
  expirada nega qualquer escrita com `403 codigo trial_expirado` mantendo
  leituras/exportações por perfil; trial ativa limita criação de bens e
  usuários com `403 codigo limite_trial`. O cliente ainda não trata esses
  códigos — interface pendente.

## Ameaças e privacidade

Fronteiras: HTTP público → validação/limite → pendência; SMTP → caixa do
titular; token → provisionamento multiempresa. Ativos: identidade, isolamento,
credenciais e dados pessoais (nome/e-mail para finalidade de criar a conta).

- Evitar enumeração: mesma resposta para e-mail usado/pendente; erros internos
  não podem revelar payloads SQL, destinatários, credenciais ou tokens.
- Evitar takeover pré-cadastro: senha só na confirmação; pendência não é usuário.
- Evitar replay/corridas: chave única, hash e consumo transacional único.
- Evitar vazamento: transporte privado sem log de mensagem/erro SMTP bruto;
  nada de NotificacaoService (inclui gestores e persiste o corpo).
- Evitar abuso: limite por IP antes de validação/hash/envio, inclusive falhas;
  implantação atual de uma instância. Abrir publicamente exige controle
  compartilhado se houver múltiplas instâncias e revisão de abuso de e-mail.
- Pendências expiram em 24h e são removidas na próxima solicitação ou por
  `npm run cadastros:limpar` no pacote `src/backend`. Ao habilitar o piloto,
  agendar esse comando ao menos diariamente no mesmo ambiente do backend:
  retenção máxima operacional de 48h com o agendamento ativo. Monitorar o
  código de saída e não registrar linhas/payloads. Backups seguem a política
  de retenção operacional e não podem reintroduzir pendências válidas antigas.
  No contêiner compilado, usar `node dist/database/limparCadastros.js`
  (produção não instala `tsx`). Após restaurar backup, invalidar pendências
  antes de reabrir tráfego para impedir replay de confirmações já consumidas.
- Envio é síncrono e a resposta não promete tempo constante: diferença de
  latência SMTP ainda pode sinalizar conta existente. Antes da abertura pública,
  adotar entrega durável assíncrona/mitigação de enumeração temporal. Crash entre
  reserva e envio exige aguardar expiração; não há promessa de entrega exata.

## Evidências e próximos incrementos

Em 03/11/2026: 373 testes/32 suítes do backend, 17 E2E da API, ambos os
checks TypeScript e compilação de produção aprovados. `tests/cadastro.test.ts` cobre API/SQL reais com
apenas transporte SMTP simulado: isolamento, expiração, replay/corridas,
rollback incluindo auditoria, validação, respostas genéricas e logs seguros.
`tests/emailPrivado.test.ts` cobre o contrato privado do transporte; migrações
cobrem preservação dos legados e reversão protegida. `tests/trial.test.ts`
cobre a fiscalização: escrita bloqueada na expiração, leituras/exportações
liberadas, limites de bens/usuários com liberação de vaga por
arquivamento/desativação e legado intocado. Não houve teste com SMTP
externo, abertura pública, deploy, interface web ou dispositivo Android.

Próximos gates: cookies HttpOnly/CSRF na web, confirmação/recuperação e
onboarding na interface (incluindo tratamento de `trial_expirado`/`limite_trial`),
controle dos seeds demo, entrega de e-mail durável e homologada,
privacidade/retenção operacional e revisão de segurança independente antes de
abertura pública. CSV e validação institucional continuam entregas distintas.
Nenhum desses gates é considerado resolvido apenas por existir
`SELF_SERVICE_ENABLED`.
