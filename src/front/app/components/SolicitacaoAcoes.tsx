'use client';

import { CheckCircle, PlayCircle, RotateCcw, XCircle } from 'lucide-react';
import { useAuth } from '../lib/auth-context';

export type StatusSolicitacao = 'aberta' | 'em_andamento' | 'concluida' | 'cancelada';
export const statusSolicitacaoLabels: Record<StatusSolicitacao, string> = {
  aberta: 'Aberta', em_andamento: 'Em andamento', concluida: 'Concluida', cancelada: 'Cancelada',
};

export default function SolicitacaoAcoes({ id, status, onChange, ocupado = false }: {
  id: number; status: StatusSolicitacao; onChange: (status: StatusSolicitacao) => void; ocupado?: boolean;
}) {
  const { podeEscrever } = useAuth();
  const podeGerenciar = podeEscrever('solicitacoes');
  const bloqueado = !podeGerenciar || ocupado;
  const motivo = !podeGerenciar ? 'Somente Gestor e Responsável podem gerenciar o status.' : undefined;
  const acoes = status === 'aberta' || status === 'em_andamento'
    ? [
      ...(status === 'aberta' ? [{ label: 'Iniciar', valor: 'em_andamento' as const, Icon: PlayCircle }] : []),
      { label: 'Concluir', valor: 'concluida' as const, Icon: CheckCircle },
      { label: 'Cancelar', valor: 'cancelada' as const, Icon: XCircle },
    ]
    : [{ label: 'Reabrir', valor: 'aberta' as const, Icon: RotateCcw }];

  return (
    <div className="flex flex-col items-end gap-2" title={motivo}>
      <select aria-label={`Alterar status da solicitacao ${id}`} disabled={bloqueado}
        className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        value={status} onChange={e => { if (!bloqueado) onChange(e.target.value as StatusSolicitacao); }}>
        {Object.entries(statusSolicitacaoLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <div className="flex flex-wrap justify-end gap-2">
        {acoes.map(({ label, valor, Icon }) => (
          <button key={valor} type="button" disabled={bloqueado} title={motivo}
            aria-label={`${label} solicitacao ${id}`} onClick={() => { if (!bloqueado) onChange(valor); }}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed">
            <Icon size={16} />{label}
          </button>
        ))}
      </div>
    </div>
  );
}
