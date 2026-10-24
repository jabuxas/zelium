import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DashboardStats } from '../types/dashboard';

export function dashboardCacheKey(usuarioId: number, organizacaoId: number): string {
  return `@zelium:dashboard:v2:${organizacaoId}:${usuarioId}`;
}

export async function readDashboardCache(key: string): Promise<DashboardStats | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const campos: (keyof DashboardStats)[] = ['totalPatrimonios', 'totalAmbientes', 'totalConferentes', 'alertasAvaria'];
    const dados = value as Record<string, unknown>;
    if (!campos.every(campo => typeof dados[campo] === 'number' && Number.isFinite(dados[campo]) && Number(dados[campo]) >= 0)) return null;
    return value as DashboardStats;
  } catch {
    return null;
  }
}

export async function writeDashboardCache(key: string, stats: DashboardStats): Promise<void> {
  try { await AsyncStorage.setItem(key, JSON.stringify(stats)); }
  catch { /* Cache opcional não pode esconder os dados recebidos da API. */ }
}
