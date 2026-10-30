/**
 * Cálculo de depreciação em centavos: determinístico, sem artefato binário
 * de float, sem fallback de vida útil inventado.
 */
import { calcularDepreciacao } from '../src/services/DepreciacaoService';

describe('Depreciação em centavos (determinística)', () => {
  it('caso clássico: 5000 → residual 500, vida 5, 24 meses = 1800 acumulados', () => {
    const dep = calcularDepreciacao(5000, '2024-01-01', 5, 500, new Date('2026-01-01T00:00:00'));
    expect(dep.depreciacao_anual).toBeCloseTo(900, 2);
    expect(dep.depreciacao_acumulada).toBeCloseTo(1800, 2);
    expect(dep.valor_contabil_atual).toBeCloseTo(3200, 2);
    expect(dep.depreciavel).toBe(true);
  });

  it('não produz artefato binário: divisão não exata em centavos', () => {
    // 1000 / 3 meses: float daria 333.33333...; em centavos o resultado é
    // determinístico e limitado à base.
    const dep = calcularDepreciacao(10, '2025-10-01', 1, 0, new Date('2026-01-01T00:00:00'));
    // 3 meses de vida útil 12: 10 * 3/12 = 2.50 exato em centavos.
    expect(dep.depreciacao_acumulada).toBeCloseTo(2.5, 2);
    expect(dep.valor_contabil_atual).toBeCloseTo(7.5, 2);
  });

  it('0.1 + 0.2 do float legado não vira 0.30000000000000004 na API', () => {
    const dep = calcularDepreciacao(1, '2025-10-01', 1, 0.30000000000000004, new Date('2025-11-01T00:00:00'));
    // residual normalizado para centavo: 0.30; contábil 1 − 1 mês depreciado.
    expect(dep.valor_residual).toBeCloseTo(0.3, 2);
    expect(dep.depreciacao_acumulada).toBeLessThanOrEqual(0.7);
    expect(dep.valor_contabil_atual).toBeGreaterThanOrEqual(0.3);
  });

  it('nunca deprecia abaixo do residual (em centavos)', () => {
    const dep = calcularDepreciacao(5000, '2024-01-01', 5, 500, new Date('2040-01-01T00:00:00'));
    expect(dep.depreciacao_acumulada).toBeCloseTo(4500, 2);
    expect(dep.valor_contabil_atual).toBeCloseTo(500, 2);
  });

  it('sem data de aquisição não deprecia', () => {
    const dep = calcularDepreciacao(1000, null, 5, 0, new Date());
    expect(dep.depreciavel).toBe(false);
    expect(dep.depreciacao_acumulada).toBe(0);
    expect(dep.valor_contabil_atual).toBe(1000);
  });

  it('SEM vida útil NÃO presume 10 anos (fallback removido)', () => {
    const dep = calcularDepreciacao(5000, '2024-01-01', null, 500, new Date('2026-01-01T00:00:00'));
    expect(dep.depreciavel).toBe(false);
    expect(dep.depreciacao_acumulada).toBe(0);
    expect(dep.valor_contabil_atual).toBe(5000);
    expect(dep.motivo_nao_depreciavel).toBe('vida_util_ausente');
  });

  it('motivo de não-depreciação distingue dado ausente', () => {
    expect(calcularDepreciacao(1000, null, 5, 0, new Date()).motivo_nao_depreciavel)
      .toBe('data_aquisicao_ausente');
    expect(calcularDepreciacao(1000, '2024-01-01', null, 0, new Date()).motivo_nao_depreciavel)
      .toBe('vida_util_ausente');
    expect(calcularDepreciacao(1000, null, null, null, new Date()).motivo_nao_depreciavel)
      .toBe('data_aquisicao_ausente');
  });

  it('aceita valores string de NUMERIC (driver pg) e normaliza', () => {
    const dep = calcularDepreciacao('5000.00' as unknown as number, '2024-01-01', 5, '500.00' as unknown as number, new Date('2026-01-01T00:00:00'));
    expect(dep.depreciacao_acumulada).toBeCloseTo(1800, 2);
    expect(dep.valor_contabil_atual).toBeCloseTo(3200, 2);
  });
});
