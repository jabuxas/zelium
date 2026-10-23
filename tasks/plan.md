# Plano — auditoria E2E e qualidade do Zelium

## Objetivo e escopo

Verificar os fluxos implementados da API, web Next.js e app Expo 54 com dados
descartáveis; corrigir falhas comprovadas; melhorar a interface do app sem
substituir a arquitetura; preparar a marca oficial sem inventar uma logo.
Autorizado pelo pedido de revisão abrangente de 23/10/2026. Execução autônoma,
mantendo as decisões de perfis já acordadas e commits pequenos.

## Capacidades e ordem

| ID | Entrega | Dependência |
| --- | --- | --- |
| e2e | Ambiente isolado, testes reproduzíveis, screenshots e rastros | — |
| confiabilidade | Regressões de sessão, permissões, isolamento e fluxos | e2e |
| identidade | Componentes de marca com fallback e ponto de troca da logo | — |
| mobile-ui | Tema coerente, navegação, leitura e ações de campo | identidade, e2e |
| verificacao | Suites, builds, revisão e relatório de evidências/limitações | todas |

## Contrato de testes

- E2E usa a API real e PostgreSQL/Testcontainers exclusivo; nunca limpa banco de
  desenvolvimento. SMTP real é desabilitado. Uploads ficam em diretório temporário.
- Testes por domínio: sessão e três perfis; sete cadastros; solicitações e status;
  estado/conferência; fotos; QR; relatórios CSV/PDF; financeiro; auditoria; isolamento.
- Web e Expo Web são exercitados em navegador real. Responsividade em 320, 375,
  414 e 768 px. Falhas de JS e requisições inesperadas são verificadas.
- Não chamar testes Expo Web de testes nativos. Câmera, GPS, teclado e instalação
  Android/iOS exigem hardware/emulador; nenhum estava conectado no início.
- Testes unitários/de integração existentes não são substituídos nem enfraquecidos.

## Arquivos previstos (sem exclusões)

- Criar `e2e/package.json`, lockfile, configuração Playwright, suporte de servidor
  e testes por domínio em `e2e/`.
- Criar componentes/configuração de marca em `src/front/app/components/`,
  `src/front/app/lib/`, `src/mobile/src/shared/brand/`, documentação de assets.
- Adaptar `src/front/app/login/page.tsx` e `SidebarLayout.tsx` para a marca.
- Ajustar `src/mobile/src/shared/theme/tokens.ts`, `constants/Colors.ts`,
  `app/login.tsx`, `app/(tabs)/_layout.tsx`, `app.json`.
- Revisar dashboard, administração, escaneamento, auditoria e componentes comuns
  de listas/formulários em `src/mobile/src/features/` e `src/shared/ui/`.
- Correções adicionais de comportamento serão delimitadas por regressão primeiro.
- Criar `design.md`, atualizar o guia de testes e registrar achados em
  `docs/AUDITORIA_E2E.md`. Não apagar rotas, componentes ou dados existentes.

## Comandos e verificações

```bash
cd src/backend && npm test -- --runInBand && npx tsc --noEmit
cd src/front && pnpm test --runInBand && pnpm build
cd src/mobile && npm test -- --runInBand && npm run typecheck && npm run lint
cd e2e && npm ci && npx playwright install chromium && npm test
```

Os comandos são executados a partir da raiz em terminais separados (o `cd` de
uma linha não é base para a próxima). Dependências E2E ficam em pacote separado;
sem upgrades de frameworks, alterações de schema ou implantação em produção.

## Critérios de aceite

1. Testes E2E versionados executam sem depender de scripts pessoais em `/tmp`.
2. Bugs encontrados têm reprodução, regressão, correção e severidade registradas.
3. App mantém funções e permissões, oferece navegação e estados de erro claros,
   não corta ações essenciais em telas pequenas e usa tokens consistentes.
4. Marca tem fallback textual íntegro, substituição documentada e nenhum asset
   fictício apresentado como logo oficial.
5. Evidências distinguem testes automatizados, inspeção visual e pendências nativas.

## Riscos

- Falta da logo: usar somente o nome Zelium até receber o arquivo oficial.
- App sem emulador: automatizar Expo Web e documentar pendências de dispositivo.
- Escopo amplo: priorizar segurança/correção, depois usabilidade; não criar features
  de produto novas ou declarar cobertura exaustiva do que não foi exercitado.
- Revisões independentes são evidência adicional, não substituem regressões.
