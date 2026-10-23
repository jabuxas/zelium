import Link from 'next/link';
import { ExternalLink, History } from 'lucide-react';
import { acoesAudit, AuditEvent, camposRegistro, descricaoAudit, formatarValor, linkAudit } from '../lib/audit';
import { formatarDataHora } from '../lib/dates';

export default function AuditTimeline({ eventos, compacto = false }: { eventos: AuditEvent[]; compacto?: boolean }) {
  const visiveis = eventos.filter(log => log.tabela !== 'notificacao');
  if (!visiveis.length) return <p className="p-5 text-sm text-gray-500">Nenhuma atividade recente encontrada.</p>;
  return <ol className="divide-y divide-gray-200">
    {visiveis.map(log => {
      const href = linkAudit(log);
      const dados = log.dados_novos ?? log.dados_anteriores ?? {};
      const alteracoes = (log.alteracoes ?? []).filter(item => camposRegistro[item.campo]);
      const campos = Object.entries(dados).filter(([key]) => camposRegistro[key]);
      return <li key={log.id} className="p-4 sm:p-5">
        <div className="flex gap-3 items-start">
          <History size={18} className="text-gray-400 mt-1 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap justify-between gap-2">
              <p className="font-medium text-gray-900 break-words">{descricaoAudit(log)}</p>
              {href && <Link href={href} aria-label={`Inspecionar ${log.tabela === 'solicitacao' ? 'solicitação' : log.tabela === 'ambiente' ? 'ambiente' : 'patrimônio'} #${log.registro_id}`} className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline shrink-0"><ExternalLink size={15} />Inspecionar</Link>}
            </div>
            <p className="text-xs text-gray-500">{formatarDataHora(log.created_at ?? log.createdAt)} · {log.usuario && log.usuario !== 'sistema' ? log.usuario : 'Sistema / registro anterior'} · {acoesAudit[log.acao] ?? log.acao}</p>
            {alteracoes.length > 0 && <ul className="text-sm text-gray-600 space-y-1">
              {alteracoes.slice(0, compacto ? 2 : undefined).map(item => <li key={item.campo}><span className="font-medium">{camposRegistro[item.campo]}:</span> {formatarValor(item.campo, item.anterior)} <span aria-label="alterado para">→</span> {formatarValor(item.campo, item.novo)}</li>)}
            </ul>}
            {!compacto && campos.length > 0 && <details className="text-sm">
              <summary className="cursor-pointer text-blue-700 w-fit">Ver dados deste evento</summary>
              <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 rounded-lg p-3">
                {campos.map(([key, value]) => <div key={key}><dt className="text-xs text-gray-500">{camposRegistro[key]}</dt><dd className="text-gray-800 break-words">{formatarValor(key, value)}</dd></div>)}
              </dl>
            </details>}
          </div>
        </div>
      </li>;
    })}
  </ol>;
}
