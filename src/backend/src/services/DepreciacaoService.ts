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
  /** Presente apenas quando depreciavel=false: qual dado falta. */
  motivo_nao_depreciavel?: 'data_aquisicao_ausente' | 'vida_util_ausente';
}

/**
 * Normaliza dinheiro para centavos (BigInt). NUMERIC chega como string do
 * driver; float legado pode trazer artefatos binários (0.30000000000000004).
 * Tudo é arredondado para o centavo antes de qualquer conta.
 */
function emCentavos(valor: number | string | null | undefined): bigint {
  const numero = Number(valor ?? 0);
  const finito = Number.isFinite(numero) ? numero : 0;
  // round half-up em centavos, estável para valores até 1e14
  const centavos = finito * 100;
  const inteiro = Math.round(centavos);
  return BigInt(inteiro);
}

function deCentavos(centavos: bigint): number {
  return Number(centavos) / 100;
}

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
 * Cálculo de depreciação pelo MÉTODO LINEAR (linha reta), em centavos:
 *
 *   base        = aquisição − residual
 *   acumulada   = round(base × meses / vidaEmMeses), limitada à base
 *   contábil    = aquisição − acumulada (nunca abaixo do residual)
 *
 * Aquisição ou vida útil ausentes NÃO presumem valores (sem fallback de
 * 10 anos): o bem é marcado como não depreciável com o motivo.
 */
export function calcularDepreciacao(
  valorAquisicao: number | string,
  dataAquisicao: string | null,
  vidaUtilAnos: number | null,
  valorResidual: number | string | null,
  referencia: Date = new Date()
): DepreciacaoDetalhe {
  const aquisicaoCentavos = emCentavos(valorAquisicao);
  const residualCentavos = emCentavos(valorResidual);
  const valorAquisicaoNumero = Number(valorAquisicao);

  if (!dataAquisicao) {
    return {
      valor_aquisicao: valorAquisicaoNumero,
      data_aquisicao: dataAquisicao,
      vida_util_anos: vidaUtilAnos,
      valor_residual: deCentavos(residualCentavos),
      depreciacao_anual: 0,
      depreciacao_mensal: 0,
      meses_decorridos: 0,
      depreciacao_acumulada: 0,
      valor_contabil_atual: deCentavos(aquisicaoCentavos),
      depreciavel: false,
      motivo_nao_depreciavel: 'data_aquisicao_ausente',
    };
  }
  if (!vidaUtilAnos || vidaUtilAnos <= 0) {
    return {
      valor_aquisicao: valorAquisicaoNumero,
      data_aquisicao: dataAquisicao,
      vida_util_anos: vidaUtilAnos,
      valor_residual: deCentavos(residualCentavos),
      depreciacao_anual: 0,
      depreciacao_mensal: 0,
      meses_decorridos: 0,
      depreciacao_acumulada: 0,
      valor_contabil_atual: deCentavos(aquisicaoCentavos),
      depreciavel: false,
      motivo_nao_depreciavel: 'vida_util_ausente',
    };
  }

  const baseCentavos = aquisicaoCentavos > residualCentavos
    ? aquisicaoCentavos - residualCentavos
    : BigInt(0);
  const meses = mesesEntre(dataAquisicao, referencia);
  const vidaEmMeses = BigInt(vidaUtilAnos * 12);

  // round half-up: (base × meses + vida/2) ÷ vida, depois limitado à base.
  const bruto = baseCentavos * BigInt(meses);
  const acumuladaCentavos = meses === 0
    ? BigInt(0)
    : (bruto + vidaEmMeses / BigInt(2)) / vidaEmMeses;
  const acumuladaLimitada = acumuladaCentavos > baseCentavos
    ? baseCentavos
    : acumuladaCentavos;
  const contabilCentavos = aquisicaoCentavos - acumuladaLimitada;

  const acumulada = deCentavos(acumuladaLimitada);
  const depreciacaoAnual = deCentavos(baseCentavos) / vidaUtilAnos;

  return {
    valor_aquisicao: deCentavos(aquisicaoCentavos),
    data_aquisicao: dataAquisicao,
    vida_util_anos: vidaUtilAnos,
    valor_residual: deCentavos(residualCentavos),
    depreciacao_anual: depreciacaoAnual,
    depreciacao_mensal: depreciacaoAnual / 12,
    meses_decorridos: meses,
    depreciacao_acumulada: acumulada,
    valor_contabil_atual: deCentavos(contabilCentavos),
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
        patrimonio.vida_util_anos,
        patrimonio.valor_residual
      ),
      numero_patrimonio: patrimonio.numero_patrimonio,
      descricao: patrimonio.descricao,
    };
  }

  async resumoFinanceiro(): Promise<ResumoFinanceiro> {
    const orgId = currentOrgId() ?? DEFAULT_ORG_ID;

    // A ordem dos ambientes vem do SQL (por valor de aquisição, NUMERIC).
    // Os valores monetários são somados em centavos a partir dos itens,
    // garantindo que agrupamento e total sejam idênticos ao detalhe (C3).
    const ordemAmbientes = (await sequelize.query(
      `
      SELECT a.id AS ambiente_id, a.nome AS ambiente,
             COUNT(p.id)::int AS total_itens,
             COALESCE(SUM(p.valor), 0)::numeric AS valor_aquisicao
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
      valor_aquisicao: string | number;
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

    // Depreciação calculada por item (método linear, sem fallback de vida útil)
    const porItem = patrimonios.map((p) => {
      const dep = calcularDepreciacao(
        p.valor,
        p.data_aquisicao,
        p.vida_util_anos,
        p.valor_residual
      );
      return {
        ambiente_id: p.ambiente_id,
        valor_aquisicao: dep.valor_aquisicao,
        valor_residual: dep.valor_residual,
        depreciacao_acumulada: dep.depreciacao_acumulada,
        valor_contabil: dep.valor_contabil_atual,
        depreciavel: dep.depreciavel,
      };
    });

    // Somas em centavos: sem divergência de float entre linhas e total.
    const somarCentavos = (campo: 'valor_aquisicao' | 'valor_residual' | 'depreciacao_acumulada' | 'valor_contabil') =>
      porItem.reduce((soma, item) => soma + BigInt(Math.round(item[campo] * 100)), BigInt(0));
    const deCentavos = (centavos: bigint) => Number(centavos) / 100;

    const porAmbienteCompleto = ordemAmbientes.map((linha) => {
      const itensDoAmbiente = porItem.filter(
        (item) => item.ambiente_id === linha.ambiente_id
      );
      const somarAmbiente = (campo: 'valor_aquisicao' | 'depreciacao_acumulada' | 'valor_contabil') =>
        itensDoAmbiente.reduce(
          (soma, item) => soma + BigInt(Math.round(item[campo] * 100)),
          BigInt(0)
        );
      return {
        ambiente_id: linha.ambiente_id,
        ambiente: linha.ambiente,
        total_itens: itensDoAmbiente.length,
        valor_aquisicao: deCentavos(somarAmbiente('valor_aquisicao')),
        depreciacao_acumulada: deCentavos(somarAmbiente('depreciacao_acumulada')),
        valor_contabil: deCentavos(somarAmbiente('valor_contabil')),
      };
    });

    return {
      total: {
        total_itens: porItem.length,
        itens_depreciaveis: porItem.filter((item) => item.depreciavel).length,
        valor_aquisicao: deCentavos(somarCentavos('valor_aquisicao')),
        valor_residual: deCentavos(somarCentavos('valor_residual')),
        depreciacao_acumulada: deCentavos(somarCentavos('depreciacao_acumulada')),
        valor_contabil: deCentavos(somarCentavos('valor_contabil')),
      },
      por_ambiente: porAmbienteCompleto,
    };
  }
}
