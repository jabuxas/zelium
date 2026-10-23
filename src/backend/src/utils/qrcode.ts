import QRCode from "qrcode";

export function qrConteudoPatrimonio(numeroPatrimonio: string): string {
  // Deep link lido pelo app mobile Zelium ao escanear a etiqueta
  return `zelium://patrimonio/${encodeURIComponent(numeroPatrimonio)}`;
}

export async function gerarQrCodeSvg(conteudo: string): Promise<string> {
  return QRCode.toString(conteudo, {
    type: "svg",
    margin: 1,
    width: 240,
    color: { dark: "#111827", light: "#ffffff" },
  });
}
