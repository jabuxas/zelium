export interface PatrimonioEscaneado {
  id: number;
  numero_patrimonio: string;
  descricao: string;
  valor: number;
  estado_item_id: number;
  ambiente_id: number;
  responsavel_id: number;
  foto_principal_url: string | null;
}

export interface OpcaoEstado {
  id: number;
  nome: string;
}

/** Extrai o número do patrimônio do conteúdo de um QR code lido. */
export function numeroDeConteudoQr(conteudo: string): string | null {
  const prefixo = "zelium://patrimonio/";
  if (conteudo.startsWith(prefixo)) {
    try {
      return decodeURIComponent(conteudo.slice(prefixo.length)) || null;
    } catch {
      return null;
    }
  }
  // Aceita também etiquetas com o número puro
  const texto = conteudo.trim();
  return texto.length > 0 ? texto : null;
}
