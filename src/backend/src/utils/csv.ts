/**
 * Parser de CSV mínimo e sem dependências: detecta separador pelo
 * cabeçalho (`;` vence `,` no empate — padrão de planilha brasileira),
 * suporta campos entre aspas (separador, quebra de linha e aspas dobradas
 * `""` dentro), descarta BOM e ignora linhas em branco no fim.
 *
 * Não valida SEMÂNTICA (campos obrigatórios, valores) — isso é do serviço
 * de importação, que conhece o domínio patrimonial.
 */
export interface CsvAnalizado {
  separador: ";" | ",";
  headers: string[];
  linhas: string[][];
}

export function parseCsv(texto: string): CsvAnalizado {
  const limpo = texto.replace(/^\uFEFF/, "");
  const primeiraLinha = limpo.split(/\r?\n/, 1)[0] ?? "";
  const pontoVirgula = (primeiraLinha.match(/;/g) ?? []).length;
  const virgula = (primeiraLinha.match(/,/g) ?? []).length;
  const separador: ";" | "," = pontoVirgula >= virgula ? ";" : ",";

  const registros: string[][] = [];
  let campo = "";
  let registro: string[] = [];
  let dentroAspas = false;

  const fecharCampo = () => {
    registro.push(campo);
    campo = "";
  };
  const fecharRegistro = () => {
    fecharCampo();
    // Linha totalmente vazia (uma única célula vazia) é ignorada em
    // qualquer posição — inclusive após conteúdo, no fim do arquivo.
    if (!(registro.length === 1 && registro[0] === "")) {
      registros.push(registro);
    }
    registro = [];
  };

  for (let i = 0; i < limpo.length; i += 1) {
    const caractere = limpo[i];
    if (dentroAspas) {
      if (caractere === '"') {
        if (limpo[i + 1] === '"') { campo += '"'; i += 1; }
        else dentroAspas = false;
      } else campo += caractere;
      continue;
    }
    if (caractere === '"') {
      if (campo === "") dentroAspas = true;
      else campo += caractere; // aspas no meio de campo não-aspado: literal
      continue;
    }
    if (caractere === separador) { fecharCampo(); continue; }
    if (caractere === "\n" || caractere === "\r") {
      if (caractere === "\r" && limpo[i + 1] === "\n") i += 1;
      fecharRegistro();
      continue;
    }
    campo += caractere;
  }
  if (campo !== "" || registro.length > 0) fecharRegistro();

  const [cabecalho, ...linhas] = registros;
  if (!cabecalho || cabecalho.every(campo => campo.trim() === "")) {
    throw new Error("CSV sem cabeçalho: a primeira linha deve nomear as colunas");
  }
  const largura = cabecalho.length;
  return {
    separador,
    headers: cabecalho,
    linhas: linhas.map(linha => {
      const completa = [...linha];
      while (completa.length < largura) completa.push("");
      return completa;
    }),
  };
}
