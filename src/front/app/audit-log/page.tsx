import AuditLogPanel from '../components/AuditLogPanel';

export default function AuditLogPage() {
  return <div className="space-y-6">
    <header><h1 className="text-2xl font-bold text-gray-900">Histórico de atividades</h1><p className="text-gray-600 mt-2">Consulte quem alterou cada registro e o que mudou ao longo do tempo. Disparos de e-mail ficam em Notificações.</p></header>
    <AuditLogPanel />
  </div>;
}
