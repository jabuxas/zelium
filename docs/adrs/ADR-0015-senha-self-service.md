# ADR-0015 - Recuperação e troca da própria senha

## Status
- Aceita (web implementado; tela mobile planejada em `PLANO_MOBILE.md`)

## Contexto
- Falta registrada no GUIA_TESTES: usuário não recuperava a senha por e-mail
  nem trocava a própria (só o gestor, via `PUT /api/usuarios/:id`).
- A recuperação beneficia contas EXISTENTES (piloto IFSC) — não pode ficar
  atrás do flag de cadastro self-service, que segue fechado.
- Troca de senha é evento de revogação: ADR-0011 define que toda sessão
  emitida antes mora.

## Decisão
- **Flag própria** `RECUPERACAO_SENHA_ENABLED` (padrão desabilitado, `404`),
  com as mesmas exigências do cadastro: SMTP configurado e URL de link
  fixa — HTTPS, ou http apenas para loopback (dev/E2E). Helper único de
  validação de URL compartilhado com o cadastro.
- **Pendências em `senha_pendente`** (migração 20261104_001): token opaco de
  256 bits guardado SOMENTE como hash SHA-256, expira em 24h, um link válido
  por usuário (novo pedido não reenvia enquanto existir pendência ativa).
  Tabela EFÊMERA: o `down` descarta sem resistência — distinto de trials.
- **Mesma disciplina anti-enumeração do cadastro (ADR-0012):** resposta
  genérica `202` para e-mail existente, inativo, pendente ou desconhecido;
  envio privado (sem log de destinatário/erro SMTP); falha de envio invalida
  a pendência; link no fragmento; limite por IP antes do trabalho caro
  (5 pedidos / 10 redefinições por 15 min).
- **Redefinição** (`POST /api/auth/senha/redefinir`): transação única com
  bloqueio de linha — UPDATE de `senha_hash` + `sessao_version + 1` junto
  com o consumo da pendência: todas as sessões anteriores moram na hora
  (ADR-0011). Conta desativada depois do pedido NÃO é reativada pelo link:
  pendência descartada e 400. bcrypt custo 12; senha de 12 caracteres a 72
  bytes (mesmo contrato do cadastro).
- **Troca da própria senha** (`POST /api/usuarios/senha`, qualquer perfil
  autenticado): exige `senha_atual` conferida contra o hash; corpo estrito;
  grava via o mesmo caminho do gestor (hash + bump de versão) — a sessão que
  fez a troca também mora e o cliente volta ao login.

## Alternativas
- **Reusar `cadastro_pendente`:** e-mail é UNIQUE lá; a recuperação brigaria
  com pendências de cadastro e a tabela exige nome/organizacao_nome.
- **Login automático após redefinir:** mascararia o evento de revogação e
  reemitiria sessão dentro do fluxo de token de e-mail — usuário faz login
  explicitamente.
- **Exceção para manter a sessão atual na troca de senha:** dividiria a
  regra de revogação; "todas as sessões moram" é simples e verificável.

## Consequências
- Custos: 1 pendência por usuário no máximo; limpeza compartilha o mesmo
  padrão do cadastro (comando diário já existente não cobre esta tabela —
  `limparExpirados` da recuperação roda a cada solicitação; agendar rotina
  junto com `cadastros:limpar` quando o e-mail real for homologado).
- O app mobile ganha troca de senha com o mesmo endpoint (plano em
  `PLANO_MOBILE.md`); a recuperação por e-mail continua web-only.
- O cliente de e-mail de pré-visualização (GET) não consome nada: só POST
  redefine.
