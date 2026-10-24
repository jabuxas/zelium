# Auditoria E2E — tarefas

- [x] Ambiente E2E isolado e reexecutável
  - Aceite: banco exclusivo, API real, frontends, limpeza nos sinais, rastros.
  - Verificar: smoke de login em web e Expo Web.
  - Arquivos: `e2e/{package.json,playwright.config.ts,support/*}`.
- [ ] E2E web: identidade, perfis, cadastros e ciclo de solicitação
  - Aceite: sete cadastros, editar/excluir, permissões e inspeção/histórico.
  - Verificar: `cd e2e && npm test -- --project=web`.
  - Arquivos: `e2e/tests/{web-crud,web-operations,web-auth}.spec.ts`, helpers.
- [ ] E2E API: isolamento, fotos, restauração, QR, relatórios e financeiro
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
- [ ] Dashboard e administração mobile
  - Aceite: ações úteis, totais corretos, histórico legível, conta e navegação claras.
  - Verificar: testes e E2E por perfil.
  - Arquivos: telas/componentes dashboard e administração.
- [ ] Listas, formulários e conferência mobile
  - Aceite: controles legíveis, consulta sem escrita, câmera com permissão/alternativa,
    conferência com sucesso/erro e recuperação.
  - Verificar: E2E de cadastros e conferência; unitários de permissões/erros.
  - Arquivos: componentes comuns e tela de escaneamento.
- [ ] Auditoria mobile
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

## Achados ainda abertos

- Concorrência da foto principal e auditoria da antiga principal.
- Falha no hook de auditoria pode persistir operação sem evento.
- Dependências HTTP de produção vulneráveis (atualizar sem `--force`).
- `PUT /ambientes/:id` sem `responsavel_id` responde 500 em vez de erro de validação.
- Scanner: permissões, entrada manual e dependência externa de jsQR no Expo Web.
- Logo/ícone/splash oficiais ausentes; nenhum dispositivo para validar recursos nativos.
