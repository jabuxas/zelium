# Migrações de banco — integridade multiempresa

## Mudança de 29/10/2026

O número patrimonial identifica um bem **dentro da organização**, não na plataforma
inteira. A restrição passa a ser `UNIQUE (organizacao_id, numero_patrimonio)` no
schema SQL e no modelo Sequelize. A numeração permanece textual: `000123` não é
convertido em `123`. Bens arquivados continuam reservando seu número; use a
restauração para recuperar a identidade original.

Isso permite importar inventários de empresas diferentes que usam a mesma
numeração institucional. Busca por número e leitura de QR continuam limitadas à
organização autenticada; o QR não concede acesso ao bem de outra empresa.

## Inicialização e histórico

`src/backend/src/database/migrate.ts` mantém o bootstrap das instalações antigas
e executa as migrações novas de `database/versionedMigrations.ts`.

- O bootstrap e as migrações novas compartilham uma transação PostgreSQL.
- Um advisory lock serializa inicializações concorrentes e reversões no mesmo
  banco. A espera por locks é limitada a cinco segundos: se exceder, a subida
  falha e deve ser repetida em janela sem concorrência, não ignorada.
- Cada migração nova só é registrada em `schema_migrations` após sua aplicação.
  Falha no DDL ou no histórico desfaz a transação.
- O bootstrap estrutural legado ainda é verificado nas inicializações. Não
  existe histórico retroativo de quando cada alteração antiga foi aplicada.
- Sequências PostgreSQL podem ter lacunas após falhas; isso não indica perda de
  registros e não autoriza renumerar IDs.

Consultar o histórico (leitura apenas):

```sql
SELECT id, applied_at FROM schema_migrations ORDER BY id;
```

Primeira migração: `20261029_001_numero_patrimonio_por_organizacao`. Ela cria a
unicidade por organização antes de retirar constraints ou índices únicos que
impõem unicidade somente ao número patrimonial. Não usa `CASCADE`; dependências
incompatíveis impedem a atualização, em vez de serem removidas silenciosamente.

## Dados que a inicialização não deve presumir

- Aquisição, vida útil e residual ausentes permanecem ausentes. `created_at` não
  é evidência da data de aquisição e dez anos não é uma vida útil confirmada.
- Se a coluna `avaria` já existe, sua configuração é preservada, mesmo que o
  nome do estado contenha “manutenção” ou “inservível”. A inferência por nome só
  ocorre na primeira introdução da coluna em um banco antigo.
- Valores financeiros preenchidos anteriormente não são apagados ou corrigidos
  automaticamente. Identificar quais datas foram inferidas por versões antigas
  exige examinar auditoria, backups ou confirmação do gestor.

**Limite deste incremento:** ele corrige persistência e migração. A retirada do
fallback de vida útil no cálculo, precisão monetária, validações compartilhadas,
onboarding e trial são entregas posteriores. As contas e o seed de demonstração
ainda exigem tratamento antes de liberar cadastro público.

## Atualização segura

1. Gerar backup e comprovar sua restauração em banco separado. Preservar também
   os uploads usados pelo ambiente; o dump SQL não contém os arquivos das fotos.
2. Ensaiar a atualização em uma cópia, comparando registros, vínculos, números,
   versões, campos financeiros e arquivamentos antes/depois.
3. Planejar uma janela curta sem escrita para atualizar. A criação da restrição
   usa DDL transacional e pode bloquear a tabela: não é uma migração sem downtime
   nem uma construção de índice `CONCURRENTLY` para tabelas de grande porte.
4. Subir o backend atualizado e conferir histórico, login, busca por número,
   cadastro e restauração. Não executar testes automatizados no banco real.

## Reversão deliberada

`rollbackLastMigration()` é uma função administrativa, sem rota HTTP e nunca
executada automaticamente. Ela desfaz somente a última migração conhecida e
remove seu registro **na mesma transação**. Uma versão desconhecida é recusada.

Antes de considerar reversão, parar a aplicação e consultar:

```sql
SELECT numero_patrimonio, COUNT(DISTINCT organizacao_id) AS organizacoes
FROM patrimonio
GROUP BY numero_patrimonio
HAVING COUNT(DISTINCT organizacao_id) > 1;
```

Se já houver números compartilhados entre empresas, inclusive em bens
arquivados, a recriação da unicidade global falha. A reversão preserva bens,
restrição por empresa e histórico; **nunca apaga ou renumera dados para forçar
rollback**. Prefira correção progressiva. A consulta prévia não substitui a
constraint, que também protege contra alterações concorrentes.

A próxima inicialização desta versão reaplica migrações pendentes. Reverter
somente o schema não fixa uma versão-alvo nem autoriza voltar a um binário antigo
sem revisão: versões anteriores ainda podem inferir datas e reativar avarias.

## Verificação reproduzível

No diretório `src/backend`, com Docker disponível:

```bash
npm test -- --runInBand tests/migrations.test.ts tests/multiempresa.test.ts
npm test -- --runInBand
npx --no-install tsc --noEmit
npx --no-install tsc -p tsconfig.build.json --noEmit
```

Os testes criam PostgreSQL descartável via Testcontainers. Cobrem instalação
nova concorrente, atualização de schema anterior, reinicialização, falha no
histórico com rollback de DDL, reversão permitida/recusada, numeração por empresa,
conflito concorrente, edição e reserva do número após arquivamento.

Verificado em 29/10/2026: **272 testes do backend / 24 suítes**, **17 E2E da API**
(`cd e2e && npm run test:api`) e as duas verificações TypeScript acima aprovados.
Os problemas tiveram reprodução RED antes da correção. Nenhum banco real foi
usado; estes resultados não constituem homologação em produção ou em aparelho.
