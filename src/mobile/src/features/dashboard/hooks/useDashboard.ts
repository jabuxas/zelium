import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDashboardData } from '../services/api';
import { DashboardStats, RecentAuditLog } from '../types/dashboard';

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<RecentAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getDashboardData();
      setStats(data.stats);
      setLogs(data.recentLogs);
      setError(false);
    } catch {
      const cached = await AsyncStorage.getItem('@zelium:dashboard_stats');
      if (cached) {
        setStats(JSON.parse(cached));
        setError(false);
      } else {
        setError(true);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setIsRefreshing(true);
    load();
  }, [load]);

  const retry = useCallback(() => {
    setLoading(true);
    load();
  }, [load]);

  return { stats, logs, loading, error, isRefreshing, load, refresh, retry };
}
