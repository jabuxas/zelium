# Auditoria funcional e visual — Zelium

Atualização: 25/10/2026. **Em andamento**: os resultados abaixo não representam
homologação nativa nem cobertura integral de todos os fluxos das interfaces.

## Ambiente e limites

- API real, PostgreSQL/Testcontainers e uploads exclusivos e descartáveis.
- SMTP desativado; navegadores impedem HTTP externo a localhost.
- Next usa `.next-e2e`; Expo Web usa `--no-dev --clear`, sem `.env` local.
- Não são usados dados de produção. Nenhum push faz parte desta auditoria.
- Perfis: Gestor administra; Responsável gerencia operações; Conferente consulta,
  confere e abre solicitações, sem gerenciar seu status.

## Evidências já concluídas

| Verificação | Resultado |
| --- | --- |
| API + Expo Web, rodada conjunta | 34 E2E aprovados |
| Mobile, suíte completa com configuração de avaria | 263 testes aprovados / 43 suites |
| Backend, após conferência transacional | 257 testes aprovados / 23 suites |
| Web, após correção do formulário e atualização Next | 116 testes aprovados / 19 suites |
| Cadastros web/app, CRUD dos cinco cadastros e restrições por perfil | 15 E2E aprovados |
| Campos obrigatórios mobile e cadastros, rodada focada | 11 E2E aprovados |
| Bens, ambientes e solicitações na interface web | 6 E2E aprovados |
| Bens e ambientes na interface mobile | 3 E2E aprovados |
| Avaria: criação, leitura e desativação na UI | Web e app aprovados |
| API completa após CRUD transacional | 16 E2E aprovados |
| Relatórios e downloads pela UI + API, incluindo financeiro | 10 E2E aprovados |
| Web completo com Next 16.4.1 em produção | 22 E2E aprovados |
| Exportação Expo (bundles Android, iOS e web) | Aprovada, 26 rotas estáticas web |
| Lint mobile | Aprovado |
| Lint web | Pendente: 1 erro anterior de estado em efeito no AuthProvider e 2 avisos |

As rodadas focadas se sobrepõem; **não somar** as contagens como testes distintos.
Na rodada conjunta de 71 cenários, API (17) e mobile (32) passaram; o web teve
uma corrida no formulário de ambiente, corrigida com regressão específica.
Depois da correção, os seis E2E operacionais passaram em produção; após atualizar
o Next, os **22 E2E web completos** passaram. Isso não é uma rodada única de
71 aprovações. Relatórios/exportações existem no web, não no app.

O build Next foi validado em `.next-e2e`. A exportação Expo ficou em
`/tmp/opencode/zelium-expo-export-20261025`, com API localhost **apenas para teste**;
não é artefato de distribuição nem substitui APK/IPA ou teste em aparelho.

### Fluxos cobertos na rodada de 34 E2E

- API: cinco cadastros administrativos (criação, edição, arquivamento,
  restauração, leitura pelos demais perfis e negações de escrita).
- API: conferência com atualização do estado, abertura de solicitação pelos
  três perfis e gestão de status apenas por Gestor/Responsável.
- API: QR SVG, histórico relacionado, patrimônio arquivado/restaurado e
  isolamento entre organizações.
- API: relatórios agrupados, filtros, arquivos CSV/PDF válidos, depreciação e
  financeiro, incluindo negações por perfil e dados da outra organização.
- Fotos: conteúdo falso rejeitado, download autenticado, isolamento, bem
  arquivado e miniatura/visualizador do app.
- App: login, dashboard, conta/saída e histórico para os três perfis.
- Histórico: 13 eventos em duas páginas, busca na API e leitura de antes/depois.
- Conferência manual nos três perfis; falha de gravação preserva o formulário.
- Leitura de QR real com MediaStream sintético local e encerramento da captura.

Capturas reais de login, início, conta, histórico e conferência foram verificadas
em 320, 375, 414 e 768 px. Evidências intermediárias preservadas em
`/tmp/opencode/zelium-dashboard-evidencias` e
`/tmp/opencode/zelium-mobile-audit-account-evidencias`; novas execuções substituem
`e2e/test-results`. Não publicar traces indiscriminadamente: contêm sessões e
credenciais de demonstração do ambiente descartável.

## Correções comprovadas

- Uploads dos testes não removem arquivos reais. A suíte de depreciação só
  importa a conexão após configurar o container e confere seu destino antes de
  recriar tabelas; a tentativa anterior no banco local foi recusada na conexão.
- Organização forjada bloqueada; contagens seguem o mesmo escopo das consultas.
- Auditoria preserva o autor mesmo com nome longo; etiqueta escapa HTML vindo
  do número e da descrição do bem.
- Fotos privadas, decodificação real, limites de tamanho/expansão e remoção de
  metadados. Eleição da principal serializada por bem e antiga principal
  auditada. Validação de referências reutiliza a conexão da transação, evitando
  esgotar o pool em uploads concorrentes.
- Falha de auditoria **dentro de transação** provoca rollback; isso não resolve
  automaticamente gravações diretas de modelos fora de uma transação. O
  `BaseRepository` agora abre transações para criação, edição, exclusão e
  restauração, abrangendo cadastros, patrimônios e solicitações. Testes da API
  injetam falha no evento e conferem que nem o dado nem a auditoria parcial ficam.
- Conferência, mudança de estado e seus eventos compartilham a mesma transação.
  Falha no evento da conferência ou do patrimônio desfaz o fluxo inteiro;
  notificação de avaria só dispara após commit, nunca em rollback (`e8de33e`).
- Sessão expirada, logout com falha de armazenamento e respostas antigas
  tratados; cache do dashboard separado por conta/organização.
- Tema compartilhado, contraste testado, login rolável e recuperação de sessão.
- Dashboard com ações de campo e avarias pela configuração do estado, sem IDs
  fixos; rótulos de conferentes corrigidos.
- Histórico paginado e filtrado no servidor, com alterações legíveis em vez de
  JSON. Conta rolável, histórico disponível aos três perfis e abas legíveis.
- Scanner só abre a câmera após ação explícita, oferece entrada manual, mantém
  dados após erro e não importa scripts externos de CDN.
- Cadastros mobile indicam e validam e-mail/CNPJ obrigatórios antes da requisição;
  o formulário não fecha pelo backdrop enquanto grava. Campos e ações dos sete
  cadastros web têm nomes acessíveis.
- Gestor configura avaria nos estados do item no web/app; a edição mantém o
  valor existente e permite desativá-lo. O app também permite limpar a descrição.
- `PUT /ambientes/:id` rejeita responsável ausente/inválido com 400 e não altera
  o registro; a exigência de responsável foi mantida.
- E2E de download real encontrou a importação dinâmica quebrada no CSV
  financeiro, não detectada pelo Jest. Importação corrigida e CSV/PDF validados
  no runtime da API, com totais isolados por organização.
- O formulário web de ambiente aguarda os dados para liberar edição/envio e
  ignora respostas após sair da tela. Evita sobrescrever o que o usuário digitou
  com a resposta inicial, corrida comprovada no trace de produção (`d9b62db`).

## Dependências

O backend passou de 7 para **2 achados de produção, ambos moderados**, sem
achados altos/críticos na auditoria atual. Atualizações dentro das versões
principais existentes: Express 4.22.3, Multer 2.5.0 e correções transitivas de
`body-parser`, `proxy-addr`, `qs` e `moment`. Instalações executadas com scripts
desativados, sem `audit fix --force`.

Os dois achados restantes são a mesma cadeia `sequelize → uuid`
([GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)). O alerta
envolve v3/v5/v6 com buffer fornecido; os caminhos inspecionados do Sequelize
usam v1/v4 sem buffer de usuário. O npm sugere downgrade incompatível do ORM
para 3.30.0: **não aplicado**. Reavaliar até 24/11/2026 ou quando houver patch
compatível. Não há declaração de risco zero, nem dispensa de auditoria de build.

No web, a auditoria identificou vulnerabilidades críticas no Next 16.2.4.
Next e eslint-config-next foram atualizados para **16.4.1**, junto de transitivas
compatíveis de Babel/Browserslist/source-map-js. A
[release oficial](https://github.com/vercel/next.js/releases/tag/v16.4.1) corrige
RCE em otimização SVG e funções `use cache` com typed arrays. Instalação sem
scripts, lockfile congelado verificado, 116 testes e 22 E2E web em produção
aprovados. `pnpm audit --prod` terminou com **zero achados conhecidos**;
isso não garante ausência de vulnerabilidades desconhecidas.

A instalação congelada também detectou a configuração obsoleta
`ignoredBuiltDependencies` (removida no pnpm 11). No web, foi migrada para
`allowBuilds` com `sharp: false` e `unrs-resolver: false`: nenhum script novo foi
aprovado, e `pnpm install --frozen-lockfile --ignore-scripts` passou no pnpm
12.11.2 (`b7a99f9`). Não houve desativação de `strictDepBuilds`.

### Ferramentas ainda abertas — não liberadas para lançamento

Auditorias completas de 25/10/2026, por árvore do gerenciador (ocorrências não
equivalem a vulnerabilidades únicas):

| Árvore completa | Baixas | Moderadas | Altas | Críticas |
| --- | ---: | ---: | ---: | ---: |
| Backend, incluindo desenvolvimento | 2 | 6 | 8 | 1 |
| Web, após atualizar Next | 0 | 8 | 26 | 0 |
| App, incluindo tooling Expo/Metro | 3 | 21 | 58 | 2 |

No backend, o crítico remanescente é `handlebars` na árvore de ferramentas de
teste/build; produção tem somente as duas ocorrências moderadas já descritas.
No app, `tar` via `@expo/cli` e `shell-quote` via `react-devtools-core` exigem
tratamento de entradas não confiáveis em build/desenvolvimento. Estarem no
tooling não elimina o risco para estações e CI; não são atribuídos ao `jsqr`
novo, que não tem transitivas. A remediação compatível ainda não foi aplicada;
priorizar em **26/10/2026 e antes de publicar artefatos**. Não foi usada correção
forçada nem alterada a versão principal do Expo.

Logs/evidências locais: `/tmp/opencode/zelium-{backend,mobile,web}-all-audit-*.json`,
`zelium-web-production-audit-final.json`, `zelium-backend-production-audit-20261025.json`,
`zelium-backend-conferencia-final.log`, `zelium-web-security-production-e2e.log`
e `zelium-expo-export-final.log`.

Ao encerrar as verificações, 8870/3370/8170 estavam livres e não havia containers
ativos com o rótulo `org.testcontainers=true`. Não foram encerrados serviços
reais por estarem usando uma porta conhecida.

## Pendências para encerrar a auditoria

- Concluir revisão visual/funcional das listas e formulários mobile (incluindo
  ações auxiliares e estados de erro); CRUD real e consulta por perfil já passaram.
- Triar dependências de desenvolvimento/Expo e aplicar atualizações compatíveis.
- Resolver o lint de `src/front/app/lib/auth-context.tsx:52`
  (`react-hooks/set-state-in-effect`) com regressões de hidratação/sessão;
  não foi desativada a regra. Há também avisos de navegação com `window.location`
  em `app/lib/api-client.ts:23` e de diretiva não utilizada em
  `app/patrimonios/etiqueta/[id]/page.tsx`. O lint ignora apenas o build gerado
  `.next-e2e`, assim como já ignora `.next`.
- Validar câmera, GPS, teclado e instalação em aparelho/emulador Android/iOS.
- Receber logo e variantes oficiais. Fallback textual/configuração estão prontos;
  instruções em `docs/MARCA.md`, sem criação de uma marca substituta.
