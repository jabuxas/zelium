# Identidade oficial do Zelium

A logo oficial ainda não foi fornecida. Os componentes **ZeliumBrand** usam o nome
em texto como fallback, sem criar ou atribuir um símbolo novo à marca. Falha de
carregamento da imagem também volta ao nome; proporção e espaço são preservados.

## Web

1. Adicione o arquivo oficial em `src/front/public/brand/zelium-logo.png`
   (SVG oficial também pode ser usado).
2. Configure `NEXT_PUBLIC_ZELIUM_LOGO_PATH=/brand/zelium-logo.png` no ambiente de
   build e reconstrua o Next. Sem essa variável, não há requisição para imagem ausente.
3. Login e menu lateral já usam `src/front/app/components/ZeliumBrand.tsx`.

## App

1. Adicione PNG transparente oficial em `src/mobile/assets/branding/zelium-logo.png`.
2. Em `src/mobile/src/shared/brand/config.ts`, troque `logoSource: null` por
   `logoSource: require('../../../assets/branding/zelium-logo.png')`.
3. O caminho estático permite empacotar a marca no APK, sem depender de internet.
   Login e superfícies do app usam o mesmo componente/configuração.

## Ícone, favicon e abertura do app

Não reutilize automaticamente uma logo horizontal como ícone quadrado. Quando
receber os arquivos oficiais, substitua os assets referenciados no `app.json`:

| Uso | Arquivo atual | Preparação |
| --- | --- | --- |
| Ícone | `assets/images/icon.png` | PNG quadrado de alta resolução, 1024×1024 |
| Android adaptativo | `assets/images/adaptive-icon.png` | Variante com área segura e fundo compatível |
| Splash | `assets/images/splash-icon.png` | PNG transparente com proporção original |
| Favicon app web | `assets/images/favicon.png` | Variante pequena legível |

Os arquivos atuais de ícone/splash são **provisórios**, não a logo oficial.
Alterações de ícone/splash exigem novo build nativo. Não desenhe outra marca para
preencher esses campos; peça as variantes corretas quando o material estiver disponível.

## Verificação

- Sem asset: nome Zelium legível, sem escudos ou monogramas fictícios.
- Com asset: proporção preservada, alternativa acessível e boa leitura em fundo claro.
- Arquivo inválido/indisponível: fallback textual em vez de ícone de imagem quebrada.
- Testes `ZeliumBrand.test.tsx` em web e mobile cobrem fallback e erro de imagem.
