import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '@/src/shared/api/client';
import { AuditLogRepositoryImpl } from '@/src/features/audit-log/data/repository';
import { DashboardStats } from '../types/dashboard';

const auditLogRepository = new AuditLogRepositoryImpl();

export async function getDashboardData() {
  const [patrimonios, ambientes, conferentes, atividades] = await Promise.all([
    apiClient('/patrimonios'),
    apiClient('/ambientes'),
    apiClient('/conferentes'),
    auditLogRepository.list({ limit: 5, operacional: true })
      .then(logs => ({ logs, indisponivel: false }))
      .catch(() => ({ logs: [], indisponivel: true })),
  ]) as [{ estado_item_id: number }[], unknown[], unknown[], { logs: Awaited<ReturnType<AuditLogRepositoryImpl['list']>>; indisponivel: boolean }];

  const alertas = patrimonios.filter(p => p.estado_item_id === 2 || p.estado_item_id === 3).length;

  const stats: DashboardStats = {
    totalPatrimonios: patrimonios.length,
    totalAmbientes: ambientes.length,
    totalConferentes: conferentes.length,
    alertasAvaria: alertas
  };

  await AsyncStorage.setItem('@zelium:dashboard_stats', JSON.stringify(stats));

  const recentLogs = [...atividades.logs]
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    .slice(0, 5);

  return {
    stats,
    recentLogs,
    atividadesIndisponiveis: atividades.indisponivel,
  };
}
