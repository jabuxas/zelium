# Zelium — App mobile (Android APK e inventário em campo)

O aplicativo mobile (Expo SDK 54) permite consultar patrimônios, ambientes e
**realizar inventário em campo escaneando a etiqueta QR Code** dos bens.

## 1. Como o QR Code funciona

- A **etiqueta** é gerada pelo backend (`GET /api/patrimonios/:id/etiqueta`,
  com botão de imprimir) ou pela página `/patrimonios/etiqueta/[id]` no web.
- O QR code contém um deep link no formato `zelium://patrimonio/<número>`.
- No app, a aba **Escanear** abre a câmera e, ao ler o código, busca o
  patrimônio e permite registrar a **conferência física** (estado atual +
  observação). O registro fica em `conferencia` e atualiza o estado do bem,
  disparando a notificação de avaria quando aplicável.

## 2. Gerar o APK distribuível (EAS Build)

O projeto já está configurado com o perfil `preview` do EAS
(`src/mobile/eas.json`), que gera um **APK** instalável diretamente no
Android — ideal para distribuir à equipe de conferentes sem publicar na
Play Store.

### Pré-requisitos

1. Conta em https://expo.dev e login local:

   ```bash
   cd src/mobile
   npx eas-cli login
   ```

2. A variável de ambiente da API precisa apontar para a URL pública do
   backend em produção (definida no momento do build):

   ```bash
   EXPO_PUBLIC_API_URL=https://zelium.duckdns.org/api npx eas build -p android --profile preview
   ```

> A URL é gravada no binário. Para apontar o app para outro servidor,
> gere um novo build com a variável correspondente.

### Resultado

Ao final, o EAS fornece o link do APK (ex.: `https://expo.dev/artifacts/eas/...`).
Baixe e instale em qualquer Android (ative "instalar de fontes desconhecidas").

### Build de produção (Play Store)

```bash
EXPO_PUBLIC_API_URL=https://zelium.duckdns.org/api npx eas build -p android
```

## 3. Rodar em desenvolvimento

```bash
cd src/mobile
EXPO_PUBLIC_API_URL=http://192.168.0.10:8000/api npx expo start
```

- Escaneie o QR code do Metro com o app **Expo Go**.
- O endereço da API deve ser acessível pelo celular (use o IP da máquina na
  rede local, não `localhost`).

## 4. Permissões

O app solicita permissão de **câmera** (escaneamento de etiquetas) e de
**localização** (registro de ambientes) — ambas declaradas em `app.json`
via plugins do Expo.
