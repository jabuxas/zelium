export interface DashboardStats {
  totalPatrimonios: number;
  totalAmbientes: number;
  totalConferentes: number;
  alertasAvaria: number;
}

export type { AuditLog as RecentAuditLog } from '@/src/features/audit-log/domain/types';
