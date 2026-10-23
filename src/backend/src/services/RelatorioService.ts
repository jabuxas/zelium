import { QueryTypes } from "sequelize";
import PDFDocument from "pdfkit";
import { sequelize } from "../database/connection";
import { currentOrgId, DEFAULT_ORG_ID } from "../context/requestContext";

function orgId(): number {
  return currentOrgId() ?? DEFAULT_ORG_ID;
}

export interface FiltrosPatrimonios {
  ambiente_id?: number;
  responsavel_id?: number;
  estado_item_id?: number;
  busca?: string;
}

export type TipoRelatorio =
  | "por-ambiente"
  | "por-responsavel"
  | "por-estado"
  | "patrimonios";

export class RelatorioService {
  async porAmbiente() {
    return sequelize.query(
      `
      SELECT a.id AS ambiente_id, a.nome AS ambiente,
             COUNT(p.id)::int AS total_itens,
             COALESCE(SUM(p.valor), 0)::float AS valor_total
      FROM ambiente a
      LEFT JOIN patrimonio p
        ON p.ambiente_id = a.id AND p.deleted_at IS NULL
      WHERE a.organizacao_id = :orgId AND a.deleted_at IS NULL
      GROUP BY a.id, a.nome
      ORDER BY valor_total DESC, a.nome ASC
      `,
      { replacements: { orgId: orgId() }, type: QueryTypes.SELECT }
    );
  }

  async porResponsavel() {
    return sequelize.query(
      `
      SELECT r.id AS responsavel_id, r.nome AS responsavel,
             COUNT(p.id)::int AS total_itens,
             COALESCE(SUM(p.valor), 0)::float AS valor_total
      FROM responsavel r
      LEFT JOIN patrimonio p
        ON p.responsavel_id = r.id AND p.deleted_at IS NULL
      WHERE r.organizacao_id = :orgId AND r.deleted_at IS NULL
      GROUP BY r.id, r.nome
      ORDER BY valor_total DESC, r.nome ASC
      `,
      { replacements: { orgId: orgId() }, type: QueryTypes.SELECT }
    );
  }

  async porEstado() {
    return sequelize.query(
      `
      SELECT e.id AS estado_item_id, e.nome AS estado,
             COUNT(p.id)::int AS total_itens,
             COALESCE(SUM(p.valor), 0)::float AS valor_total
      FROM estado_item e
      LEFT JOIN patrimonio p
        ON p.estado_item_id = e.id AND p.deleted_at IS NULL
      WHERE e.organizacao_id = :orgId AND e.deleted_at IS NULL
      GROUP BY e.id, e.nome
      ORDER BY valor_total DESC, e.nome ASC
      `,
      { replacements: { orgId: orgId() }, type: QueryTypes.SELECT }
    );
  }

  async patrimonios(filtros: FiltrosPatrimonios = {}) {
    const where: string[] = ["p.organizacao_id = :orgId", "p.deleted_at IS NULL"];

    if (filtros.ambiente_id) {
      where.push("p.ambiente_id = :ambienteId");
    }
    if (filtros.responsavel_id) {
      where.push("p.responsavel_id = :responsavelId");
    }
    if (filtros.estado_item_id) {
      where.push("p.estado_item_id = :estadoItemId");
    }
    if (filtros.busca) {
      where.push(
        "(p.numero_patrimonio ILIKE :busca OR p.descricao ILIKE :busca)"
      );
    }

    return sequelize.query(
      `
      SELECT p.id, p.numero_patrimonio, p.descricao, p.valor,
             p.observacoes, p.created_at,
             a.nome AS ambiente,
             r.nome AS responsavel,
             e.nome AS estado,
             t.nome AS tipo_material,
             f.nome AS fornecedor
      FROM patrimonio p
      LEFT JOIN ambiente a ON a.id = p.ambiente_id
      LEFT JOIN responsavel r ON r.id = p.responsavel_id
      LEFT JOIN estado_item e ON e.id = p.estado_item_id
      LEFT JOIN tipo_material t ON t.id = p.tipo_material_id
      LEFT JOIN fornecedor f ON f.id = p.fornecedor_id
      WHERE ${where.join(" AND ")}
      ORDER BY p.numero_patrimonio ASC
      `,
      {
        replacements: {
          orgId: orgId(),
          ambienteId: filtros.ambiente_id ?? null,
          responsavelId: filtros.responsavel_id ?? null,
          estadoItemId: filtros.estado_item_id ?? null,
          busca: filtros.busca ? `%${filtros.busca}%` : null,
        },
        type: QueryTypes.SELECT,
      }
    );
  }

  async dadosDoRelatorio(tipo: TipoRelatorio, filtros: FiltrosPatrimonios) {
    switch (tipo) {
      case "por-ambiente":
        return { titulo: "Relatório por Ambiente", linhas: await this.porAmbiente() };
      case "por-responsavel":
        return { titulo: "Relatório por Responsável", linhas: await this.porResponsavel() };
      case "por-estado":
        return { titulo: "Relatório por Estado", linhas: await this.porEstado() };
      case "patrimonios":
        return { titulo: "Relatório de Patrimônios", linhas: await this.patrimonios(filtros) };
    }
  }
}

// ---------------------------------------------------------------------------
// Exportação CSV
// ---------------------------------------------------------------------------

function escaparCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor);
  if (/[;"\n\r]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export function gerarCsv(linhas: Record<string, unknown>[]): string {
  if (linhas.length === 0) return "";

  const colunas = Object.keys(linhas[0]);
  const linhasCsv = [
    colunas.map(escaparCsv).join(";"),
    ...linhas.map((linha) => colunas.map((c) => escaparCsv(linha[c])).join(";")),
  ];

  // BOM UTF-8 para o Excel abrir acentuação corretamente
  return "\uFEFF" + linhasCsv.join("\r\n");
}

// ---------------------------------------------------------------------------
// Exportação PDF
// ---------------------------------------------------------------------------

export function gerarPdf(
  titulo: string,
  linhas: Record<string, unknown>[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text(titulo, { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor("#555555")
      .text(
        `Gerado em ${new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date())}`,
        { align: "center" }
      );
    doc.moveDown(1);

    if (linhas.length === 0) {
      doc.fontSize(12).fillColor("#000000").text("Nenhum registro encontrado.");
      doc.end();
      return;
    }

    const colunas = Object.keys(linhas[0]);
    const largura = (doc.page.width - 100) / colunas.length;
    const linhaBase = doc.y;

    // Cabeçalho
    doc.font("Helvetica-Bold").fontSize(9);
    colunas.forEach((coluna, i) => {
      doc.text(coluna.toUpperCase(), 50 + i * largura, linhaBase, {
        width: largura,
        ellipsis: true,
      });
    });
    doc.moveDown(0.6);

    // Linhas
    doc.font("Helvetica").fontSize(9);
    for (const linha of linhas) {
      if (doc.y > doc.page.height - 80) {
        doc.addPage();
      }
      const y = doc.y;
      colunas.forEach((coluna, i) => {
        doc.text(String(linha[coluna] ?? ""), 50 + i * largura, y, {
          width: largura,
          ellipsis: true,
        });
      });
      doc.moveDown(0.35);
    }

    doc.end();
  });
}
