# E2E Zelium

Playwright + API real + PostgreSQL descartável (Docker/Testcontainers). Os testes
nunca reutilizam o banco local nem serviços que já estejam nas portas de teste.

## Preparação

Instale as dependências dos três projetos conforme o guia principal. Depois:

```bash
cd e2e
npm ci
npx playwright install chromium
npm test
```

- Node compatível com Expo SDK 54 e pnpm no PATH; Docker em execução.
- API `127.0.0.1:8870`, web `localhost:3370`, Expo Web `localhost:8170`.
- Banco e uploads exclusivos por execução; SMTP desativado; limpeza ao encerrar.
- Navegadores bloqueiam chamadas HTTP fora de localhost. O Expo ignora `.env`
  local e limpa o cache de transformações para não reutilizar URLs de homologação.
- O Next usa `.next-e2e`, separado do build normal.

## Comandos

```bash
npm test -- --project=web
npm test -- --project=mobile
npm test -- --project=api
npm run test:production
npm run report
```

`test:production` usa o build de produção do **Next**. O app é servido pelo
Expo Web com bundle `--no-dev`: isso não é um APK nem prova câmera/GPS/teclado nativo. A exportação do
app e verificações de hardware são registradas separadamente na auditoria.

O E2E do scanner também decodifica um QR real usando um vídeo **sintético local**
(Canvas/MediaStream). Isso verifica o leitor web empacotado e a liberação da captura,
mas não substitui validar câmera e permissões em um aparelho físico.

Relatório HTML, screenshots e traces ficam em diretórios ignorados pelo Git.
Traces podem conter credenciais **de demonstração** e tokens do banco descartável;
não publique esses arquivos indiscriminadamente. Asserções e seed usam somente
contas de teste, nunca credenciais reais.
