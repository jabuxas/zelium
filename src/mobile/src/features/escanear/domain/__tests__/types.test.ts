import { numeroDeConteudoQr } from "../types";

describe("numeroDeConteudoQr", () => {
  it("extrai o numero de um deep link zelium://", () => {
    expect(numeroDeConteudoQr("zelium://patrimonio/QR-001")).toBe("QR-001");
  });

  it("decodifica numeros com caracteres especiais", () => {
    expect(numeroDeConteudoQr("zelium://patrimonio/2024%2F001")).toBe("2024/001");
  });

  it("aceita o numero puro (etiquetas antigas)", () => {
    expect(numeroDeConteudoQr("2024/001")).toBe("2024/001");
  });

  it("rejeita conteudo vazio", () => {
    expect(numeroDeConteudoQr("")).toBeNull();
  });
});
