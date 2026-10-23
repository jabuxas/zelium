# ADR-0010 - Isolamento multiempresa por organização

## Status
- Aceita

## Contexto
- O Zelium passa a atender várias organizações (escolas, empresas, campi)
  simultaneamente. Dados de uma organização jamais podem vazar para outra,
  nem por leitura nem por escrita.

## Decisão
- Toda tabela de negócio carrega `organizacao_id` com FK para `organizacao`.
- O isolamento é aplicado **em todas as camadas**, no backend:
  1. O middleware de autenticação roda a requisição dentro de um
     `AsyncLocalStorage` com o contexto do usuário.
  2. Hooks globais do Sequelize filtram **todas** as consultas dos modelos
     marcados (`orgScoped`) pela organização do contexto — inclusive
     associações (includes).
  3. Escritas têm a `organizacao_id` preenchida pelo servidor (nunca vinda do
     corpo da requisição) e as referências (FKs) a cadastros de outra
     organização são bloqueadas com erro 400.
  4. O JWT carrega `organizacaoId`; tokens antigos sem o campo são recusados.

## Alternativas
- Filtro manual em cada service/repository (propenso a esquecimento).
- Schema por organização (bancos separados) — custo operacional alto para o
  estágio atual; o modelo de coluna permite migrar depois.

## Consequências
- Consultas `raw SQL` (relatórios) precisam incluir o filtro de organização
  explicitamente.
- Auditoria registra a organização de cada evento.
- A organização padrão (`IFSC Campus São José`) recebe todos os dados
  existentes na migração.
