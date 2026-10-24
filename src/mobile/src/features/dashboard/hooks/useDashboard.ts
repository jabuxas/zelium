import { useState, useCallback, useEffect, useRef } from 'react';
import { getDashboardData } from '../services/api';
import { DashboardStats, RecentAuditLog } from '../types/dashboard';
import { dashboardCacheKey, readDashboardCache, writeDashboardCache } from '../services/dashboardCache';
import { useAuth } from '@/src/shared/auth/AuthContext';
import { authGeneration } from '@/src/shared/auth/tokenStore';

export function useDashboard() {
  const { usuario } = useAuth();
  const usuarioId = usuario?.id;
  const organizacaoId = usuario?.organizacaoId;
  const key = usuarioId && organizacaoId ? dashboardCacheKey(usuarioId, organizacaoId) : null;
  const identity = useRef(key);
  identity.current = key;
  const mounted = useRef(true);
  const request = useRef(0);
  const latest = useRef<{ key: string; stats: DashboardStats } | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<RecentAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [atividadesIndisponiveis, setAtividadesIndisponiveis] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dadosEmCache, setDadosEmCache] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(async () => {
    if (!key) return;
    const operation = ++request.current;
    const generation = authGeneration();
    const atual = () => mounted.current && identity.current === key && request.current === operation && authGeneration() === generation;
    if (latest.current?.key !== key) {
      setStats(null); setLogs([]); setOwner(key); setLoading(true);
    }
    try {
      const data = await getDashboardData();
      if (!atual()) return;
      latest.current = { key, stats: data.stats };
      setStats(data.stats);
      setLogs(data.recentLogs);
      setAtividadesIndisponiveis(data.atividadesIndisponiveis);
      setError(false);
      setDadosEmCache(false);
      await writeDashboardCache(key, data.stats);
    } catch {
      const cached = latest.current?.key === key ? latest.current.stats : await readDashboardCache(key);
      if (!atual()) return;
      if (cached !== null) {
        latest.current = { key, stats: cached };
        setStats(cached);
        setError(false);
        setDadosEmCache(true);
        setAtividadesIndisponiveis(true);
      } else {
        setError(true);
      }
    } finally {
      if (atual()) { setLoading(false); setIsRefreshing(false); }
    }
  }, [key]);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    load();
  }, [load]);

  const retry = useCallback(() => {
    setLoading(true);
    load();
  }, [load]);

  return { stats: owner === key ? stats : null, logs: owner === key ? logs : [], loading: loading || owner !== key, error, atividadesIndisponiveis, dadosEmCache, isRefreshing, load, refresh, retry };
}
