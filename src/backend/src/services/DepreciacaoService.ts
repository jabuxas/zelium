import { QueryTypes } from "sequelize";
import { sequelize } from "../database/connection";
import { Patrimonio } from "../models/Patrimonio";
import { currentOrgId, DEFAULT_ORG_ID } from "../context/requestContext";

export interface DepreciacaoDetalhe {
  valor_aquisicao: number;
  data_aquisicao: string | null;
  vida_util_anos: number | null;
  valor_residual: number;
  depreciacao_anual: number;
  depreciacao_mensal: number;
  meses_decorridos: number;
  depreciacao_acumulada: number;
  valor_contabil_atual: number;
  depreciavel: boolean;
}

const MESES_VIDA_UTIL_PADRAO = 10 * 12;

function mesesEntre(inicio: string, fim: Date): number {
  const dataInicio = new Date(`${inicio}T00:00:00`);
  if (Number.isNaN(dataInicio.getTime()) || dataInicio > fim) {
    return 0;
  }
  let meses =
    (fim.getFullYear() - dataInicio.getFullYear()) * 12 +
    (fim.getMonth() - dataInicio.getMonth());
  if (fim.getDate() < dataInicio.getDate()) {
    meses -= 1;
  }
  return Math.max(meses, 0);
}

/**
 * Cálculo de depreciação pelo MÉTODO LINEAR (linha reta):
 *
 *   taxa anual  = (valor de aquisição − valor residual) / vida útil
 *   acumulada   = taxa mensal × meses decorridos (limitada ao valor depreciável)
 *   valor contábil = aquisição − acumulada (nunca abaixo do residual)
 */
export function calcularDepreciacao(
  valorAquisicao: number,
  dataAquisicao: string | null,
  vidaUtilAnos: number | null,
  valorResidual: number | null,
  referencia: Date = new Date()
): DepreciacaoDetalhe {
  const residual = Math.max(Number(valorResidual ?? 0), 0);
  const valorDepreciavel = Math.max(valorAquisicao - residual, 0);

  if (!dataAquisicao || !vidaUtilAnos || vidaUtilAnos <= 0) {
    return {
      valor_aquisicao: valorAquisicao,
      data_aquisicao: dataAquisicao,
      vida_util_anos: vidaUtilAnos,
      valor_residual: residual,
      depreciacao_anual: 0,
      depreciacao_mensal: 0,
      meses_decorridos: 0,
      depreciacao_acumulada: 0,
      valor_contabil_atual: valorAquisicao,
      depreciavel: false,
    };
  }

  const meses = mesesEntre(dataAquisicao, referencia);
  const depreciacaoAnual = valorDepreciavel / vidaUtilAnos;
  const depreciacaoMensal = depreciacaoAnual / 12;
  const acumulada = Math.min(
    depreciacaoMensal * meses,
    valorDepreciavel
  );

  return {
    valor_aquisicao: valorAquisicao,
    data_aquisicao: dataAquisicao,
    vida_util_anos: vidaUtilAnos,
    valor_residual: residual,
    depreciacao_anual: depreciacaoAnual,
    depreciacao_mensal: depreciacaoMensal,
    meses_decorridos: meses,
    depreciacao_acumulada: acumulada,
    valor_contabil_atual: valorAquisicao - acumulada,
    depreciavel: true,
  };
}

export interface ResumoFinanceiro {
  total: {
    total_itens: number;
    itens_depreciaveis: number;
    valor_aquisicao: number;
    valor_residual: number;
    depreciacao_acumulada: number;
    valor_contabil: number;
  };
  por_ambiente: Array<{
    ambiente_id: number;
    ambiente: string;
    total_itens: number;
    valor_aquisicao: number;
    depreciacao_acumulada: number;
    valor_contabil: number;
  }>;
}

export class DepreciacaoService {
  async detalhe(patrimonioId: number) {
    const patrimonio = await Patrimonio.findByPk(patrimonioId);
    if (!patrimonio) return null;

    return {
      ...calcularDepreciacao(
        patrimonio.valor,
        patrimonio.data_aquisicao,
        patrimonio.vida_util_anos ?? MESES_VIDA_UTIL_PADRAO / 12,
        patrimonio.valor_residual
      ),
      numero_patrimonio: patrimonio.numero_patrimonio,
      descricao: patrimonio.descricao,
    };
  }

  async resumoFinanceiro(): Promise<ResumoFinanceiro> {
    const orgId = currentOrgId() ?? DEFAULT_ORG_ID;

    // Valores por ambiente
    const porAmbiente = (await sequelize.query(
      `
      SELECT a.id AS ambiente_id, a.nome AS ambiente,
             COUNT(p.id)::int AS total_itens,
             COALESCE(SUM(p.valor), 0)::float AS valor_aquisicao,
             COALESCE(SUM(COALESCE(p.valor_residual, 0)), 0)::float AS valor_residual
      FROM ambiente a
      LEFT JOIN patrimonio p
        ON p.ambiente_id = a.id AND p.deleted_at IS NULL
      WHERE a.organizacao_id = :orgId AND a.deleted_at IS NULL
      GROUP BY a.id, a.nome
      ORDER BY valor_aquisicao DESC
      `,
      { replacements: { orgId }, type: QueryTypes.SELECT }
    )) as Array<{
      ambiente_id: number;
      ambiente: string;
      total_itens: number;
      valor_aquisicao: number;
      valor_residual: number;
    }>;

    const patrimonios = await Patrimonio.findAll({
      attributes: [
        "id",
        "valor",
        "data_aquisicao",
        "vida_util_anos",
        "valor_residual",
        "ambiente_id",
      ],
    });

    // Depreciação calculada por item (método linear)
    const porItem = patrimonios.map((p) => {
      const dep = calcularDepreciacao(
        p.valor,
        p.data_aquisicao,
        p.vida_util_anos ?? MESES_VIDA_UTIL_PADRAO / 12,
        p.valor_residual
      );
      return {
        ambiente_id: p.ambiente_id,
        valor_aquisicao: p.valor,
        valor_residual: dep.valor_residual,
        depreciacao_acumulada: dep.depreciacao_acumulada,
        valor_contabil: dep.valor_contabil_atual,
        depreciavel: dep.depreciavel,
      };
    });

    const somar = (campo: keyof (typeof porItem)[number]) =>
      porItem.reduce((soma, item) => soma + (item[campo] as number), 0);

    const porAmbienteCompleto = porAmbiente.map((linha) => {
      const itensDoAmbiente = porItem.filter(
        (item) => item.ambiente_id === linha.ambiente_id
      );
      return {
        ...linha,
        depreciacao_acumulada: itensDoAmbiente.reduce(
          (soma, item) => soma + item.depreciacao_acumulada,
          0
        ),
        valor_contabil: itensDoAmbiente.reduce(
          (soma, item) => soma + item.valor_contabil,
          0
        ),
      };
    });

    return {
      total: {
        total_itens: porItem.length,
        itens_depreciaveis: porItem.filter((item) => item.depreciavel).length,
        valor_aquisicao: somar("valor_aquisicao"),
        valor_residual: somar("valor_residual"),
        depreciacao_acumulada: somar("depreciacao_acumulada"),
        valor_contabil: somar("valor_contabil"),
      },
      por_ambiente: porAmbienteCompleto,
    };
  }
}
