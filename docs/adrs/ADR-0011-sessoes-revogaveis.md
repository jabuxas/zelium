# ADR-0011 - Sessões revogáveis por versão de sessão

## Status
- Aceita

## Contexto
- O JWT vivia 7 dias e não podia ser revogado: troca de senha ou desativação
  de usuário não derrubavam tokens já emitidos (logout era só local).
- O cadastro self-service ampliará a base de usuários; revogação passa a ser
  requisito de segurança, não refinamento.

## Decisão
- `usuario.sessao_version` (inteiro, default 1), migração
  `20261030_001_usuario_sessao_version`.
- O JWT carrega `ver = sessao_version` no momento da emissão.
- O middleware de autenticação revalida **por requisição**: usuário ativo,
  organização ativa e `payload.ver === usuario.sessao_version`. Divergência →
  401 "Sessao desatualizada".
- Troca de senha ou desativação do usuário incrementam `sessao_version` na
  mesma transação da gravação — todas as sessões anteriores morram juntas.

## Alternativas
- **Denylist em memória:** some no restart e não cobre múltiplas instâncias.
- **Sessões em banco (tabela session):** mais estado e limpeza; não era
  necessário para o volume do piloto.
- **Refresh tokens:** complexidade maior (rotação, expiração dupla) adiada
  até houver requisito de sessão longa com renovação curta.

## Consequências
- Custo fixo de 2 consultas por requisição autenticada (usuário +
  organização). Aceito no volume do piloto; revisar com cache TTL se medido.
- Tokens emitidos antes da migração (sem `ver`) são recusados uma única vez:
  usuários relogam. Os clientes web e mobile já tratam 401 redirecionando ao
  login.
- Logout segue local (o token não é colocado em denylist); revogação serve
  para eventos administrativos (senha, desativação, organização inativa).
- Suítes unitárias sem banco simulam `revalidarSessao` como válida
  (`jest.mock`); a verificação real vive em `tests/sessao.test.ts` e nas
  suítes de integração. É boundary de teste, não exceção de produção.

## Relação
- Complementa ADR-0009 (JWT + RBAC) e ADR-0010 (isolamento por organização):
  organização desativada agora revoga as sessões de seus usuários.
