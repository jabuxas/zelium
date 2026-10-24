import { apiClient } from '@/src/shared/api/client';
import { AuditLogRepositoryImpl } from '@/src/features/audit-log/data/repository';
import { DashboardStats } from '../types/dashboard';

const auditLogRepository = new AuditLogRepositoryImpl();

export async function getDashboardData() {
  const [patrimonios, ambientes, conferentes, estados, atividades] = await Promise.all([
    apiClient('/patrimonios') as Promise<{ estado_item_id: number }[]>,
    apiClient('/ambientes') as Promise<unknown[]>,
    apiClient('/conferentes') as Promise<unknown[]>,
    apiClient('/estados-item') as Promise<{ id: number; avaria: boolean }[]>,
    auditLogRepository.list({ limit: 5, operacional: true })
      .then(logs => ({ logs, indisponivel: false }))
      .catch(() => ({ logs: [], indisponivel: true })),
  ]);

  const estadosComAvaria = new Set(estados.filter(estado => estado.avaria).map(estado => estado.id));
  const alertas = patrimonios.filter(p => estadosComAvaria.has(p.estado_item_id)).length;

  const stats: DashboardStats = {
    totalPatrimonios: patrimonios.length,
    totalAmbientes: ambientes.length,
    totalConferentes: conferentes.length,
    alertasAvaria: alertas
  };

  const recentLogs = [...atividades.logs]
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    .slice(0, 5);

  return {
    stats,
    recentLogs,
    atividadesIndisponiveis: atividades.indisponivel,
  };
}
