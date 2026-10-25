# Auditoria E2E — tarefas

- [x] Ambiente E2E isolado e reexecutável
  - Aceite: banco exclusivo, API real, frontends, limpeza nos sinais, rastros.
  - Verificar: smoke de login em web e Expo Web.
  - Arquivos: `e2e/{package.json,playwright.config.ts,support/*}`.
- [x] E2E web: identidade, perfis, cadastros e ciclo de solicitação
  - Aceite: sete cadastros, editar/excluir, permissões e inspeção/histórico.
  - Verificar: `cd e2e && npm test -- --project=web`.
  - Arquivos: `e2e/tests/{web-catalogs,web-operations,web-auth,web-reports}.spec.ts`, helpers.
- [x] E2E API: isolamento, fotos, restauração, QR, relatórios e financeiro
  - Aceite: teste positivo e negações; exports válidos; mutações isoladas.
  - Verificar: `cd e2e && npm test -- --project=api`.
  - Arquivos: `e2e/tests/{api-isolation,api-assets,api-reports}.spec.ts`.
- [ ] Corrigir regressões comprovadas de confiabilidade
  - Aceite: RED → GREEN sem enfraquecer asserções.
  - Verificar: testes focados e suites completas afetadas.
  - Arquivos: definidos por cada achado.
- [x] Preparar marca oficial
  - Aceite: fallback textual, logo configurável com tamanho/aspecto preservados.
  - Verificar: testes dos componentes e screenshots login/cabeçalho.
  - Arquivos: componentes/config web/mobile e `docs/MARCA.md`.
- [x] Tema e login mobile (validação Expo Web; teclado nativo pendente)
  - Aceite: tokens, contraste, campos acessíveis, erros, teclado e layout estreito.
  - Verificar: testes e screenshots 320/375/414/768 px.
  - Arquivos: tema, cores, login, layout de abas, app config.
- [x] Dashboard e administração mobile
  - Aceite: ações úteis, totais corretos, histórico legível, conta e navegação claras.
  - Verificar: testes e E2E por perfil.
  - Arquivos: telas/componentes dashboard e administração.
- [ ] Listas, formulários e conferência mobile
  - Aceite: controles legíveis, consulta sem escrita, câmera com permissão/alternativa,
    conferência com sucesso/erro e recuperação.
  - Verificar: E2E de cadastros e conferência; unitários de permissões/erros.
  - Arquivos: componentes comuns e tela de escaneamento.
- [x] Auditoria mobile
  - Aceite: eventos legíveis, acesso operacional e consulta além da primeira página.
  - Verificar: testes de repositório/hook e E2E de paginação.
  - Arquivos: domínio, repositório, hook e tela de auditoria.
- [ ] Verificação final e relatório
  - Aceite: suites/builds, revisão dos diffs, screenshots reais e limitações explícitas.
  - Verificar: comandos do plano; serviços descartáveis encerrados.
  - Arquivos: `docs/{AUDITORIA_E2E,GUIA_TESTES}.md`, este checklist.

## Incrementos verificados

- Uploads de testes isolados, organização forjada/contagens cruzadas bloqueadas e
  autor de nome longo preservado na auditoria.
- Sessões expiradas e respostas antigas tratadas; cache do dashboard separado
  por conta/organização, com aviso e recuperação de falhas de armazenamento.
- Fotos privadas com validação real do conteúdo e remoção de metadados;
  E2E de download, isolamento e visualizador autenticado do app.
- Tema/login com contraste e recuperação; capturas em 320/375/414/768 px.
- Dashboard compacto, ações de conferência/consulta e contagem de avarias por
  configuração (`dbeef0a`, `5fb8682`); E2E passou nos três perfis/quatro larguras.
- Sete cadastros web com campos/ações acessíveis; cinco cadastros administrativos
  passaram em CRUD real web/app e consulta restrita dos demais perfis.
- Campos obrigatórios mobile e proteção do formulário durante gravação;
  CRUD/inspeção de bens/ambientes no web/app e solicitações pelos três perfis.
- Configuração de avaria no web/app com ativação, leitura e desativação persistida;
  descrição do estado pode ser removida no app.
- Ambiente sem responsável válido responde 400 sem alterar dados (`3602c36`).
- CRUD do repositório e auditoria confirmam juntos; quatro regressões da API
  comprovam rollback (`d16ed5f`). Conferência, estado e eventos também são
  atômicos, com notificação só após commit (`e8de33e`).
- Downloads CSV/PDF pelos controles web; corrigida importação do financeiro que
  falhava no runtime real (`74c160d`).
- Corrida de carregamento do formulário de ambiente corrigida (`d9b62db`).
- Suites: backend 257/23, web 116/19, mobile 263/43. Next 16.4.1 passou nos 22 E2E
  web em produção; API 17 e mobile 32 passaram na rodada conjunta anterior.
- Exportação Expo Android/iOS/web aprovada; lint mobile aprovado. Portas dos
  serviços descartáveis verificadas livres após os testes.
- Next e transitivas de produção corrigidos sem scripts de instalação; audit
  web de produção sem achados conhecidos (`30f38f8`).

## Achados ainda abertos

- CRUD do repositório, conferência e fotos confirmam junto com seus eventos.
  Chamadas diretas aos modelos fora de transação não recebem garantia implícita
  de rollback.
- Cadeia moderada `sequelize → uuid` sem correção compatível; demais achados de
  produção HTTP corrigidos, com 240 testes do backend aprovados após atualizar.
- Dependências Expo/Metro e de desenvolvimento aguardam triagem/atualização
  compatível; patches esperados do SDK 54 ainda não foram aplicados.
- Lint web: erro anterior de estado em efeito no AuthProvider e avisos em
  `api-client.ts` e na etiqueta;
  nenhuma regra foi enfraquecida. Excluído apenas o build gerado `.next-e2e`.
- Revisão final de listas/formulários e recursos auxiliares mobile; exportação
  de bundles não equivale a homologação nativa nem a APK/IPA distribuído.
- Scanner: fluxo manual e QR sintético aprovados; hardware nativo ainda pendente.
- Logo/ícone/splash oficiais ausentes; nenhum dispositivo para validar recursos nativos.
