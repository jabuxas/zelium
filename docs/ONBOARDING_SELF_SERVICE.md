# Cadastro self-service — contrato e controles

Implementação incremental do bloco 6. **Não é liberação pública**: cookies
HttpOnly/CSRF, tratamento dos seeds de demonstração, SMTP real, aplicação dos
limites/expiração do trial e interface web continuam sendo gates separados.

## Contrato planejado

- `POST /api/auth/cadastros`: `{ nome, email, organizacaoNome }`. Resposta
  genérica `202`, inclusive para e-mail existente ou solicitação repetida.
- `POST /api/auth/cadastros/confirmacao`: `{ token, senha }`. Sucesso `201`,
  sem login automático; senha definida somente por quem recebeu o link.
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
- Confirmação usa bloqueio de linha e transação: uma organização, primeiro
  Gestor, estados iniciais e auditoria; falha em qualquer parte desfaz tudo.
- Trial de 30 dias começa na confirmação; limites iniciais de 500 bens/5
  usuários. Organizações existentes ficam explicitamente como `legado`, sem
  prazo retroativo. **Metadados não substituem a futura fiscalização do trial.**

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
- Pendências expiram em 24h e são removidas no consumo ou limpeza; retenção
  operacional e rotina de limpeza serão documentadas junto à implementação.

Testes devem provar isolamento, expiração, replay/corridas, rollback incluindo
auditoria, respostas genéricas, dados legados intactos e ausência de segredos
em banco/auditoria/respostas/logs. Não comprovam SMTP real ou piloto autorizado.
