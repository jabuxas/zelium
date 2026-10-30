/**
 * Validação compartilhada dos campos de depreciação do patrimônio.
 *
 * A MESMA regra vale para cadastro (POST), edição (PUT) e, no futuro,
 * importação. O controller não duplica condições: recebe a lista de erros
 * e responde 400 sem alterar dados.
 */

export interface ErroValidacao {
  campo: string;
  mensagem: string;
}

export interface CamposDepreciacao {
  valor?: number | null;
  data_aquisicao?: string | null;
  vida_util_anos?: number | null;
  valor_residual?: number | null;
}

/** Referência para validar campos que dependem do registro persistido. */
export interface ValoresPersistidos {
  valor?: number | null;
  valor_residual?: number | null;
}

const VIDA_UTIL_MAXIMA = 100;
const VALOR_MAXIMO = 1e14;

function numeroFinitoNaoNegativo(candidato: unknown): number | null {
  const numero = Number(candidato);
  if (candidato === null || candidato === undefined || candidato === '') {
    return null;
  }
  if (Number.isNaN(numero) || !Number.isFinite(numero) || numero < 0) {
    return null;
  }
  return numero;
}

/**
 * Data aceita somente no formato AAAA-MM-DD e apenas se existir no
 * calendário: 2024-02-30 rola para 1º de março e é recusada.
 */
function validarDataAquisicao(
  candidata: unknown,
  erros: ErroValidacao[],
): void {
  if (candidata === undefined || candidata === null || candidata === '') {
    return;
  }
  if (typeof candidata !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(candidata)) {
    erros.push({
      campo: 'data_aquisicao',
      mensagem: 'data_aquisicao invalida (use AAAA-MM-DD)',
    });
    return;
  }
  const [ano, mes, dia] = candidata.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  const existente =
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia;
  if (!existente) {
    erros.push({
      campo: 'data_aquisicao',
      mensagem: 'data_aquisicao nao existe no calendario',
    });
  }
}

/**
 * @param campos    corpo da requisição (apenas os campos presentes são
 *                  validados; null explícito LIMPA o campo)
 * @param persistidos valores atuais do registro, para validar combinações
 *                  entre campo enviado e campo não enviado (PUT parcial)
 */
export function validarCamposDepreciacao(
  campos: CamposDepreciacao,
  persistidos: ValoresPersistidos = {},
): ErroValidacao[] {
  const erros: ErroValidacao[] = [];

  const valorInformado = campos.valor !== undefined;
  const residualInformado = campos.valor_residual !== undefined;
  const vidaInformada = campos.vida_util_anos !== undefined;

  if (valorInformado) {
    const valor = numeroFinitoNaoNegativo(campos.valor);
    if (valor === null) {
      erros.push({
        campo: 'valor',
        mensagem:
          'valor e obrigatorio e deve ser um numero nao negativo',
      });
    } else if (valor >= VALOR_MAXIMO) {
      erros.push({
        campo: 'valor',
        mensagem: 'valor excede o limite suportado',
      });
    }
  }

  validarDataAquisicao(campos.data_aquisicao, erros);

  if (vidaInformada && campos.vida_util_anos !== null) {
    const vida = Number(campos.vida_util_anos);
    if (!Number.isInteger(vida) || vida < 1 || vida > VIDA_UTIL_MAXIMA) {
      erros.push({
        campo: 'vida_util_anos',
        mensagem: 'vida_util_anos deve ser um inteiro entre 1 e 100',
      });
    }
  }

  if (residualInformado && campos.valor_residual !== null) {
    const residual = numeroFinitoNaoNegativo(campos.valor_residual);
    if (residual === null) {
      erros.push({
        campo: 'valor_residual',
        mensagem:
          'valor_residual deve ser um numero entre 0 e o valor do bem',
      });
    } else {
      const valorReferencia = valorInformado
        ? numeroFinitoNaoNegativo(campos.valor)
        : numeroFinitoNaoNegativo(persistidos.valor);
      if (
        valorReferencia !== null &&
        residual > valorReferencia
      ) {
        erros.push({
          campo: 'valor_residual',
          mensagem:
            'valor_residual deve ser um numero entre 0 e o valor do bem',
        });
      }
    }
  }

  // PUT que reduz o valor abaixo do residual já persistido também é recusado.
  if (valorInformado && !residualInformado) {
    const valor = numeroFinitoNaoNegativo(campos.valor);
    const residualPersistido = numeroFinitoNaoNegativo(
      persistidos.valor_residual,
    );
    if (valor !== null && residualPersistido !== null && valor < residualPersistido) {
      erros.push({
        campo: 'valor',
        mensagem: 'valor nao pode ficar abaixo do valor_residual persistido',
      });
    }
  }

  return erros;
}

/** Extrai do corpo apenas os campos aceitos, preservando null explícito. */
export function camposDepreciacaoDoCorpo(corpo: Record<string, unknown>): CamposDepreciacao {
  const presente = (campo: string) => Object.prototype.hasOwnProperty.call(corpo, campo);
  return {
    ...(presente('valor') ? { valor: corpo.valor as number | null } : {}),
    ...(presente('data_aquisicao')
      ? { data_aquisicao: corpo.data_aquisicao as string | null }
      : {}),
    ...(presente('vida_util_anos')
      ? { vida_util_anos: corpo.vida_util_anos as number | null }
      : {}),
    ...(presente('valor_residual')
      ? { valor_residual: corpo.valor_residual as number | null }
      : {}),
  };
}
