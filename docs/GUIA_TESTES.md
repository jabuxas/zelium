# Zelium — Guia de Testes e Operação

Este guia explica **como rodar o projeto**, **como testar cada funcionalidade** e
**o que ainda falta**. É o documento de referência para homologação das 7
funcionalidades do roadmap.

---

## 1. Como rodar o projeto

### 1.1 Docker Compose (recomendado para homologar)

Sobe banco + backend + frontend com tudo configurado:

```bash
cd src
docker compose up
```

| Serviço | URL |
| --- | --- |
| Frontend web | http://localhost:3000 |
| API (backend) | http://localhost:8000/api |
| Health check | http://localhost:8000/health |
| Banco | localhost:5432 (zelar / zelar / zelar) |

Na primeira subida o banco é criado e populado (`src/db/schema.sql` + `seed.sql`),
e o backend roda as migrações automaticamente na inicialização.

### 1.2 Rodando manualmente (sem Docker)

```bash
# 1) Banco: instale o PostgreSQL e crie o banco
psql -U postgres -c "CREATE USER zelar WITH PASSWORD 'zelar'; CREATE DATABASE zelar OWNER zelar;"

# 2) Backend (porta 8000)
cd src/backend
npm install
npm run dev

# 3) Frontend (porta 3000) — outro terminal
cd src/front
pnpm install
pnpm dev

# 4) App mobile — outro terminal (veja docs/APK.md para detalhes)
cd src/mobile
EXPO_PUBLIC_API_URL=http://<IP-da-sua-maquina>:8000/api npx expo start
```

> No celular, o `EXPO_PUBLIC_API_URL` precisa usar o IP da máquina na rede
> local (não `localhost`), e a máquina precisa estar acessível pelo celular.

### 1.3 Produção (servidor da equipe)

Configuração completa (DuckDNS, SSL, backup) em **[`docs/DEPLOY.md`](DEPLOY.md)**:

```bash
cd deploy
cp .env.example .env   # preencha domínio, senhas, JWT e SMTP
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

---

## 2. Contas de demonstração

| Papel | E-mail | Senha |
| --- | --- | --- |
| Gestor | `gestor@zelium.com` | `Zelium@2026` |
| Responsável | `responsavel@zelium.com` | `Zelium@2026` |
| Conferente | `conferente@zelium.com` | `Zelium@2026` |

**Matriz de permissões** (a API é a fonte da verdade; controles e guardas de página são UX):

| Ação | Gestor | Responsável | Conferente |
| --- | :-: | :-: | :-: |
| Ver patrimônios/ambientes | ✅ | ✅ | ✅ |
| Criar/editar/excluir/restaurar patrimônios e ambientes | ✅ | ✅ | ❌ |
| Abrir solicitações | ✅ | ✅ | ✅ |
| Mudar status de solicitação | ✅ | ✅ | ❌ |
| Registrar conferência em campo (app) | ✅ | ✅ | ✅ |
| Gerir cadastros (responsáveis, conferentes, fornecedores, tipos, estados) | ✅ | ❌ | ❌ |
| Usuários | ✅ | ❌ | ❌ |
| Relatórios | ✅ | ✅ | ❌ |
| Financeiro e notificações | ✅ | ❌ | ❌ |
| Histórico operacional e inspeção de registros | ✅ | ✅ | ✅ |
| Auditoria administrativa (cadastros/usuários) | ✅ | ❌ | ❌ |

O **Conferente abre e acompanha solicitações**, mas iniciar, concluir, cancelar ou
reabrir exige Gestor/Responsável. Criar uma solicitação já concluída também é
bloqueado pela API. A conferência em campo continua permitida aos três perfis;
ela não equivale à edição geral do patrimônio.

Web e mobile negam escrita sem sessão. No mobile, criação, edição e exclusão
seguem a mesma matriz; a consulta dos detalhes continua disponível. Os dashboards
mantêm seus indicadores se a consulta de atividades falhar, com aviso localizado.

---

## 3. Roteiro rápido (smoke test de 15 min)

Subindo o projeto, execute nesta ordem:

1. `GET /health` → `{"status":"ok"}` (sem token)
2. `GET /api/patrimonios` **sem token** → `401`
3. Login com `gestor@zelium.com` / `Zelium@2026` → recebe `token` + `organizacao`
4. `GET /api/patrimonios` **com token** → lista com 10 itens do seed
5. Login com `conferente@zelium.com` → `GET /api/usuarios` → `403`
6. `/relatorios` no navegador → tabelas por ambiente/responsável/estado
7. Baixar CSV e PDF na mesma página → abrem corretamente (acentuação OK no Excel)
8. `/financeiro` → cards com valores (o seed já tem depreciação ativa)
9. `/notificacoes` → histórico de e-mails (inicialmente vazio)
10. No app: login → aba **Escanear** → apontar para a etiqueta de um patrimônio

Login por curl (atalho para os passos acima):

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gestor@zelium.com","senha":"Zelium@2026"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -s http://localhost:8000/api/patrimonios -H "Authorization: Bearer $TOKEN"
```

---

## 4. Testando funcionalidade por funcionalidade

### 4.1 Infraestrutura própria

**O que verificar:** a stack de produção sobe, o domínio DuckDNS responde com
HTTPS válido e o backup roda.

1. `cd deploy && cp .env.example .env` e preencher os valores.
2. `docker compose -f docker-compose.prod.yml --env-file .env up -d --build`
3. `curl https://<seu-dominio>/health` → `{"status":"ok"}`
4. `curl -vI https://<seu-dominio>/` → certificado Let's Encrypt válido (HTTP/2 200)
5. Backup manual: `docker compose -f docker-compose.prod.yml exec backup /backup.sh`
6. Restauração: `./restore.sh backups/zelium_<data>.sql.gz`

**Critérios de aceite:**
- [ ] Banco **sem porta exposta** ao host (`docker ps` não mostra `5432->`)
- [ ] Certificado renovado automaticamente (Caddy gerencia)
- [ ] Backups diários às 02:00 UTC com retenção de `BACKUP_RETENTION_DAYS`

### 4.2 Autenticação e perfis

**O que verificar:** login bloqueia acesso sem token e cada papel enxerga só o
que deve.

1. Acesse `http://localhost:3000` sem login → é redirecionado para `/login`.
2. Entre com cada uma das 3 contas e compare o menu lateral:
   - Gestor vê todos os itens (incluindo Financeiro, Notificações, Relatórios)
   - Responsável não vê Fornecedores/Tipos/Estados/Financeiro/Notificações
   - Os três veem Histórico; Conferente também vê Dashboard, Patrimônios, Solicitações e Ambientes
3. Como conferente, tente `PUT /api/patrimonios/1` → `403`.
4. Feche e reabra o navegador → sessão mantida (JWT no localStorage).
5. "Sair" → volta para `/login`.
6. Como Conferente, abra uma solicitação: ela aparece como **Aberta**, com
   controles de status desabilitados e explicação da restrição.
7. Como Responsável, inicie/conclua a solicitação e confira o autor no Histórico.
8. Acesso direto a `/patrimonios/novo` como Conferente ou `/fornecedores/novo`
   como Responsável mostra **Acesso restrito**, sem montar o formulário.
9. No mobile, entre como Responsável/Conferente e confira os controles de escrita
   das sete listas; tocar no cartão ainda abre seus detalhes.

```bash
# 401 sem token / 403 sem permissão
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/api/patrimonios
CONF_TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"conferente@zelium.com","senha":"Zelium@2026"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/api/usuarios -H "Authorization: Bearer $CONF_TOKEN"
```

**Critérios de aceite:**
- [ ] Login inválido → mensagem "Email ou senha invalidos"
- [ ] `senha_hash` nunca aparece em respostas da API
- [ ] Criar usuário (gestor) em `POST /api/usuarios` e logar com ele
- [ ] 11 falhas de login seguidas do mesmo IP → `429` com `Retry-After`
      (só falha de credencial conta; sucesso não consome cota)
- [ ] Trocar a senha de um usuário (gestor, `PUT /api/usuarios/:id`) derruba
      as sessões dele: o token antigo passa a responder `401 Sessao
      desatualizada` e o novo login funciona
- [ ] Desativar um usuário revoga a sessão dele; desativar a organização
      revoga as sessões de todos os seus usuários

### 4.3 Isolamento multiempresa

**O que verificar:** usuários de organizações diferentes não veem dados uns dos
outros, nem conseguem referenciar cadastros de outra organização.

1. Crie uma segunda organização no banco (não há UI para isso — é gestão
   interna; veja "O que falta"):

```bash
docker compose exec db psql -U zelar -d zelar
```

```sql
INSERT INTO organizacao (nome, slug, ativo) VALUES ('Empresa Teste B', 'empresa-b', TRUE);

-- usuário gestor da org B (senha: Zelium@2026)
INSERT INTO usuario (nome, email, senha_hash, papel, ativo, organizacao_id)
VALUES ('Gestor B', 'gestor.b@teste.com',
        '$2b$10$cbRZLPMpC5p2.q1EsYT38.eCQTlTCsonhEMvOGAsNkoCnKRrQpJ82',
        'gestor', TRUE, 2);
```

2. Faça login com `gestor.b@teste.com` → todas as listas começam **vazias**.
3. Cadastre um tipo de material como org B e confirme que o gestor da org 1 não
   o vê.
4. Tente criar um patrimônio na org 1 referenciando um `tipo_material_id` da
   org 2 → `400 Referencia invalida ... outra organizacao`.

**Critérios de aceite:**
- [ ] Listagens, `GET /:id` (404) e busca por número são isoladas por org
- [ ] FKs cruzadas são bloqueadas na escrita
- [ ] Auditoria e notificações ficam ligadas à organização correta

**Numeração patrimonial por empresa (29/10/2026):** o mesmo número, inclusive
com zeros à esquerda, pode existir em empresas diferentes. Repeti-lo na mesma
empresa retorna `409`, inclusive se o original estiver arquivado. A busca por
número continua isolada pela sessão; use a restauração para recuperar um bem
arquivado, não um novo cadastro. Atualização de bancos existentes, histórico de
migrações e limites da reversão estão em [`MIGRACOES.md`](MIGRACOES.md).

### 4.4 Notificações automáticas (e-mail)

**O que verificar:** três gatilhos disparam e-mail e ficam registrados.

Sem SMTP configurado, os e-mails são **simulados** — o comportamento é idêntico,
mas em vez de enviar, o sistema grava em `notificacao` (visível em `/notificacoes`).

1. **Avaria:** em `/patrimonios`, clique no ícone laranja (Registrar Estado) de
   um item e mude para "Em manutenção" → notificação `avaria`.
2. **Solicitação:** em `/solicitacoes`, abra uma manutenção para um patrimônio →
   notificação `solicitacao_criada`.
3. **Status:** mude o status da solicitação (Iniciar/Concluir) →
   notificação `solicitacao_status`.
4. Confira em `/notificacoes` (gestor): destinatários incluem o responsável do
   bem e todos os gestores ativos da organização.

**Critérios de aceite:**
- [ ] Notificação criada com destinatários corretos e status (`simulada`/`enviada`)
- [ ] Falha de SMTP não derruba a operação principal
- [ ] Datas da página aceitam `createdAt` e `created_at`; valores ausentes/inválidos mostram "Data não informada"
- [ ] Em produção com `SMTP_*` configurado, os e-mails chegam de verdade

### 4.5 Relatórios e exportação

**O que verificar:** agrupamentos corretos e arquivos baixáveis.

1. `/relatorios`: confira totais de itens/valores por ambiente, responsável e estado.
2. Use os filtros de Patrimônios (ambiente + responsável + estado + busca).
3. Baixe **CSV** de cada seção → abre no Excel/LibreOffice com acentuação correta.
4. Baixe **PDF** de cada seção → documento formatado com título e data de geração.

```bash
curl -s "http://localhost:8000/api/relatorios/por-ambiente" -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:8000/api/relatorios/exportar/csv?tipo=patrimonios&estado_item_id=2" \
  -H "Authorization: Bearer $TOKEN" -o relatorio.csv
curl -s "http://localhost:8000/api/relatorios/exportar/pdf?tipo=por-ambiente" \
  -H "Authorization: Bearer $TOKEN" -o relatorio.pdf
```

**Critérios de aceite:**
- [ ] Somas batem com o número de itens das listagens
- [ ] CSV e PDF respeitam os filtros e a organização do usuário
- [ ] Conferente recebe `403`

### 4.6 QR Code e inventário em campo

**O que verificar:** etiqueta legível e conferência registrada pelo app.

O app não abre a câmera automaticamente: use **Ativar câmera** e conceda a
permissão quando solicitado. **Número de patrimônio → Buscar patrimônio** permite
continuar sem câmera. No navegador, o leitor `jsqr` é empacotado localmente, sem
scripts de CDN. Ao sair da tela ou localizar um bem, a captura é encerrada.
Falha ao salvar mantém estado e observação para nova tentativa. O E2E web usa
captura sintética; câmera/permissões nativas ainda exigem aparelho ou emulador.

1. Web: em `/patrimonios`, clique no ícone de **QR Code** de um item →
   página da etiqueta com o QR e botão **Imprimir etiqueta**.
2. `GET /api/patrimonios/1/etiqueta` também retorna o HTML imprimível.
3. App: faça login e abra a aba **Escanear** → aponte a câmera para a etiqueta.
   - O QR contém `zelium://patrimonio/<número>`; o app também aceita QR/números
     puros (útil para testar com qualquer gerador de QR).
4. No resultado, escolha o estado e escreva uma observação → **Registrar
   conferência** → o estado do bem é atualizado e (se for avaria) a notificação
   é disparada.
5. `GET /api/patrimonios/1/conferencias` lista o histórico.

**Fotos privadas:** upload em `POST /api/patrimonios/:id/fotos` aceita JPEG, PNG e
WebP íntegros de até 5 MB e 20 megapixels. O conteúdo é decodificado e metadados
(inclusive GPS) são removidos. A URL retornada em `/uploads/patrimonios/...` também
exige `Authorization: Bearer ...`: sem sessão retorna `401`, outra organização ou
bem arquivado retorna `404`. Nunca coloque tokens na URL. O app já autentica as
miniaturas e o visualizador; imagens locais pendentes não recebem credenciais.

**Critérios de aceite:**
- [ ] QR da etiqueta é lido pelo app e abre o bem certo
- [ ] Conferência grava usuário, estado e observação
- [ ] APK gerado conforme [`docs/APK.md`](APK.md) instala em Android

### 4.7 Depreciação e valor do ativo

**O que verificar:** cálculo linear e visão financeira.

1. `/financeiro` (gestor): cards de aquisição, valor contábil, depreciação e
   residual + tabela por ambiente + CSV. Se houver bens sem data de aquisição ou
   vida útil, um aviso amarelo mostra a contagem — cadastre esses dados para
   incluí-los no cálculo.
2. O seed já contém bens adquiridos em anos anteriores — a depreciação acumulada
   deve ser maior que zero.
3. Crie/edite um patrimônio informando data de aquisição antiga, vida útil e
   valor residual → confira `GET /api/patrimonios/:id/depreciacao`
   (**exclusivo do Gestor**: Responsável e Conferente recebem `403`).
4. Tente editar com dados inválidos (ex.: vida útil `0`, residual maior que o
   valor): a API responde `400` e o formulário lista **um erro por campo**, com
   rótulo amigável, sem gravar nada.
5. Os valores são calculados em centavos e somados de forma idêntica no detalhe,
   resumo, agrupamento e exportação.

```bash
curl -s http://localhost:8000/api/patrimonios/1/depreciacao -H "Authorization: Bearer $TOKEN"
```

**Regra do cálculo (método linear, em centavos):**

```
base        = aquisição − residual
acumulada   = round(base × meses completos ÷ (vida útil × 12)), limitada à base
valor contábil = aquisição − acumulada (nunca abaixo do residual)
```

Sem data de aquisição **ou** sem vida útil, o bem não deprecia: a resposta traz
`depreciavel: false` e `motivo_nao_depreciavel`
(`data_aquisicao_ausente` ou `vida_util_ausente`). Não existe mais vida útil
presumida. Os valores são **estimativa gerencial** — a tela deixa isso explícito;
não substituem escrituração contábil nem avaliação de mercado.

**Critérios de aceite:**
- [ ] Bens sem data de aquisição ou vida útil não depreciam e aparecem no aviso do `/financeiro`
- [ ] Valor contábil nunca fica abaixo do valor residual
- [ ] Totais do `/financeiro` batem com a soma por ambiente e com o CSV/JSON
- [ ] Detalhe de depreciação por bem: `403` para Responsável e Conferente
- [ ] Edição inválida responde `400` com erros por campo e não altera o registro

**Persistência na inicialização (29/10/2026):** migrações não preenchem mais
aquisição ausente com a data de cadastro nem vida útil com dez anos. Valores já
preenchidos são preservados; eventual inferência por versões antigas exige
revisão, não limpeza indiscriminada. O cálculo, as validações compartilhadas e a
conversão monetária (`NUMERIC(14,2)` + CHECKs) estão implementados — detalhes de
sujeira legada e reversão em [`MIGRACOES.md`](MIGRACOES.md).

### 4.8 Histórico de atividades e inspeção

1. No dashboard, **Atividades Recentes** mostra eventos operacionais formatados,
   autor, data, principais alterações e **Inspecionar**. Eventos de e-mail não
   aparecem aqui (nem no Histórico); ficam em Notificações.
2. Abra **Histórico** (`/audit-log`) ou **Ver histórico completo**. Combine entidade,
   ID, ação, autor, número/nome/descrição e período; use **Aplicar filtros**,
   **Limpar**, **Anterior** e **Próxima**.
3. Inspecione uma solicitação pela lista ou pelo histórico: os dados atuais, o
   vínculo com o patrimônio e o histórico próprio aparecem em `/solicitacoes/:id`.
   Somente Gestor/Responsável têm controles de status habilitados.
4. Inspecione um patrimônio em `/patrimonios/:id`: o histórico inclui também
   solicitações, fotos e conferências vinculadas ao bem. Os filtros locais
   preservam esse vínculo. Ambientes também têm inspeção em `/ambientes/:id`.
5. Remova um registro de teste como Gestor e siga seu link no Histórico: o estado
   atual fica indisponível, mas os eventos históricos permanecem consultáveis.
6. Confira em uma tela estreita: o menu começa recolhido e não comprime os filtros;
   pode ser aberto pelo botão de navegação e fechado por seleção ou Escape.

**API de auditoria:**

```bash
# Filtros combináveis; período inclusivo por dia UTC
curl -s "http://localhost:8000/api/audit-log?tabela=solicitacao&acao=UPDATE&page=1&limit=10&de=2026-10-01&ate=2026-10-31" \
  -H "Authorization: Bearer $TOKEN"

# Eventos do patrimônio 1 e de seus registros relacionados
curl -s "http://localhost:8000/api/audit-log?tabela=patrimonio&registro_id=1&relacionados=true" \
  -H "Authorization: Bearer $TOKEN"
```

- Parâmetros adicionais: `usuario` (nome/ID do autor), `busca` (número, nome ou
  descrição nos snapshots), `operacional=true` (apenas eventos operacionais).
- Ações: `CREATE`, `UPDATE`, `DELETE`, `RESTORE`. Página começa em 1; limite
  padrão 10, máximo 100. Filtros inválidos retornam `400`.
- A resposta preserva `total`, `pages`, `currentPage`, `limit` e `data`; cada evento
  traz `registro_nome`, `patrimonio_id` e `alteracoes` com campo/valor anterior/novo.
  Totais e páginas também são isolados por organização.
- `GET /api/audit-log/:tabela/:registroId` mantém a consulta direta ao histórico
  da entidade; auditoria administrativa retorna `403` para os outros perfis.
- Credenciais são removidas na gravação e na resposta, inclusive de snapshots
  antigos. Eventos anteriores sem autor continuam como **Sistema / registro
  anterior**: não há atribuição retroativa. Referências são resolvidas pelos nomes
  atuais dos cadastros, inclusive arquivados.

**Critérios de aceite:**
- [ ] Dashboard carrega com os três perfis e não depende da disponibilidade da auditoria
- [ ] Conferente abre solicitações sem receber `403` por ações oferecidas pela interface
- [ ] Histórico operacional acessível aos três perfis; administrativo apenas ao Gestor
- [ ] Filtros e paginação não misturam organizações ou registros
- [ ] Inspeção permite seguir solicitação → patrimônio → eventos relacionados
- [ ] Alterações são legíveis, sem JSON técnico ou credenciais na interface

---

## 5. Testes automatizados

Tudo o que está automatizado:

| Projeto | Comando | O que cobre |
| --- | --- | --- |
| Backend | `cd src/backend && npm test -- --runInBand` | 301 testes na rodada de 30/10/2026: CRUDs, RBAC, multiempresa e numeração por organização, migrações/reversão (incl. monetária), validação compartilhada, notificações, relatórios (CSV/PDF), QR/conferência, depreciação em centavos, auditoria/rollback, versionamento |
| Frontend | `cd src/front && pnpm test --runInBand` | 123 testes: listas, formulários acessíveis e carregamento seguro, dashboard, permissões, notificações, inspeção, histórico, navegação, configuração de avaria, financeiro (aviso de cadastro incompleto) e erros por campo |
| Mobile | `cd src/mobile && npm test -- --runInBand` | 263 testes: telas, permissões, sessão, repositórios, hooks, dashboard, auditoria, fotos autenticadas, câmera/QR e formulários |
| E2E API | `cd e2e && npm run test:api` | API real e PostgreSQL descartável; CRUDs, isolamento, fotos, relatórios, financeiro e permissões |
| E2E interfaces | `cd e2e && npm test -- --project=web --project=mobile` | Login, cadastros, inventário, solicitações web, relatórios/downloads web, conferência, fotos e histórico do app |
| E2E produção | `cd e2e && npm run test:production` | Mesmos cenários com build Next em `.next-e2e`; Expo Web continua distinto de homologação nativa |
| Infraestrutura E2E | `cd e2e && npm run test:infrastructure` | Encerramento dos processos filhos/netos da UI |

> Os testes de banco do backend usam **containers isolados** (Testcontainers) —
> não dependem de um PostgreSQL local. É preciso ter Docker rodando.

Não execute duas rodadas Playwright simultaneamente: elas usam portas fixas
8870/3370/8170. Os servidores e anexos são descartáveis, com SMTP desativado;
nenhuma execução deve apontar ao banco real. Consulte `AUDITORIA_E2E.md` para
resultados por rodada, evidências e limitações. As contagens acima não significam
validação de câmera/GPS/teclado/instalação em dispositivo físico.

Em **Estados do Item**, o Gestor pode configurar **Indica avaria** no web/app.
Essa configuração alimenta os indicadores de avaria e notificações de mudança
de estado; não depende do nome ou ID do cadastro. Confira também se editar
preserva a configuração e se desativá-la persiste após reabrir o formulário.

O lint mobile passou; o web ainda registra um erro anterior em
`app/lib/auth-context.tsx` e dois avisos (navegação em `api-client.ts` e etiqueta). Build Next e exportação Expo
passaram, mas não substituem corrigir esses achados nem as dependências de
desenvolvimento/Expo abertas no relatório de auditoria.

CI: `.github/workflows/test.yml` roda backend e frontend a cada push/PR.
(O job do mobile não está no workflow — veja "O que falta".)

---

## 6. O que falta

### Funcional (por ordem de prioridade)

| Falta | Detalhe |
| --- | --- |
| **Troca/recuperação de senha** | Usuário não consegue trocar a própria senha nem recuperá-la por e-mail (a senha padrão `Zelium@2026` só muda via gestor em `PUT /api/usuarios/:id`) |
| **UI de gestão de usuários** | O CRUD `/api/usuarios` existe, mas não há página no frontend — gestão é via API/SQL |
| **UI de gestão de organizações** | Criar org só via SQL; não há tela de multiempresa para o operador |
| **Paginação nas listas web** | Listas carregam tudo de uma vez; com milhares de bens ficará lento |
| **Job mobile no CI** | Os testes do app não rodam no GitHub Actions |
| **E-mail real homologado** | O fluxo SMTP está pronto, mas não foi testado com um provedor real de e-mail |
| **Deploy real no servidor** | A stack de produção está pronta, mas a migração física do Render para o servidor da equipe ainda não foi executada |
| **APK real distribuído** | O perfil EAS existe, mas o build ainda não foi executado (requer conta expo.dev) |
| **Importação em lote** | Cadastro via CSV (comum em implantações patrimoniais) não existe |
| **Impressão de etiquetas em lote** | A etiqueta é individual; não há seleção múltipla |

### Segurança / operação

| Falta | Detalhe |
| --- | --- |
| **Cookie de sessão httpOnly na web** | Token segue no `localStorage` (o app mobile usa `AsyncStorage`); migração para cookie `HttpOnly`/`Secure` + CSRF é o próximo passo de hardening |
| Retenção de logs | `audit_log` e `notificacao` crescem sem política de expurgo |
| Monitoramento/alertas | Sem métricas ou alertas de saúde (além do `/health`) |
| Backup externo | O backup roda local; a cópia para fora do servidor é manual (documentada em `docs/DEPLOY.md`) |

Resolvidos em 29–30/10/2026: ~~rate limiting no login~~ (`429` após 10 falhas
de credencial por IP a cada 15 min, `Retry-After` incluso) e ~~refresh token /
revogação~~ (sessões revogáveis por `sessao_version` — troca de senha,
desativação de usuário ou organização matam os tokens; ADR-0011). O segredo
JWT padrão também é recusado na subida em produção.

### Fora do escopo atual (deliberado)

- Depreciação acelerada ou por turnos (só método linear)
- Baixa/alienação patrimonial com lançamento contábil
- Assinatura digital de conferências
- PWA/offline do inventário em campo (o app mobile cobre o fluxo)

---

## 7. Problemas comuns

| Sintoma | Causa provável | Solução |
| --- | --- | --- |
| `429 Muitas tentativas de login` | 10+ falhas de credencial do mesmo IP em 15 min | Aguardar o tempo do header `Retry-After` (sucesso não conta para o limite) |
| `401 Sessao desatualizada` em tudo | Token de versão anterior: troca de senha, desativação ou organização desativada revogaram a sessão (ou token antigo sem `ver`) | Fazer login novamente |
| `401 Sessao expirada ou token invalido` em tudo | Token expirado ou inválido | Fazer login novamente |
| Frontend não carrega listas | `NEXT_PUBLIC_API_URL` errado | Dev: `http://localhost:8000/api`. Recriar o build se mudou |
| App mostra "Env EXPO_PUBLIC_API_URL não está definida" | Falta a variável | Rodar `EXPO_PUBLIC_API_URL=http://<ip>:8000/api npx expo start` |
| Câmera não abre no app | Permissão negada | Liberar câmera nas configurações do Android e reiniciar |
| Migrações não aplicaram | Backend subiu antes do banco | Reiniciar o backend (as migrações rodam a cada subida) |
| Testes de banco falham localmente | Docker parado | `docker info` e rodar `npm test` de novo |
| E-mails "não chegam" | SMTP não configurado (modo simulado) | Configurar `SMTP_*` ou conferir `/notificacoes` |
| Banco não sobe no Docker | Porta 5432 ocupada | Parar o Postgres local ou trocar a porta no compose |
| `pnpm install` falha no mobile | Diretório node_modules de outra config | `rm -rf node_modules && pnpm install` |
