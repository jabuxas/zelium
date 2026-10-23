'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth-context';
import { apiFetch } from '../lib/api-client';
import { API_URL } from '../lib/api';
import { AuditPage, entidadesAudit } from '../lib/audit';
import AuditTimeline from './AuditTimeline';

const filtrosVazios = { tabela: '', registro_id: '', acao: '', usuario: '', busca: '', de: '', ate: '' };

export default function AuditLogPanel({ tabela, registroId, relacionados = false }: { tabela?: string; registroId?: number; relacionados?: boolean }) {
  const { papel } = useAuth();
  const [filtros, setFiltros] = useState(filtrosVazios);
  const [aplicados, setAplicados] = useState(filtrosVazios);
  const [page, setPage] = useState(1);
  const [resultado, setResultado] = useState<AuditPage | null>(null);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(true);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    const params = new URLSearchParams({ page: String(page), limit: '10' });
    Object.entries(aplicados).forEach(([key, value]) => { if (value) params.set(key, value); });
    if (tabela) params.set('tabela', tabela);
    if (registroId) params.set('registro_id', String(registroId));
    if (relacionados) params.set('relacionados', 'true');
    apiFetch(`${API_URL}/audit-log?${params}`)
      .then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.error ?? 'Erro ao carregar histórico'); return data as AuditPage; })
      .then(data => { if (ativo) setResultado(data); })
      .catch(err => { if (ativo) setErro(err instanceof Error ? err.message : 'Erro ao carregar histórico'); })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [aplicados, page, tabela, registroId, relacionados, tentativa]);

  function recarregar() { setLoading(true); setErro(''); }
  const operacionais = ['patrimonio', 'ambiente', 'solicitacao', 'conferencia', 'patrimonio_fotos'];
  return <section className="space-y-4">
    <form aria-label={tabela ? 'Filtrar histórico deste registro' : 'Filtrar histórico'} className="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" onSubmit={e => { e.preventDefault(); recarregar(); setPage(1); setAplicados({ ...filtros }); }}>
      {!tabela && <><label className="text-sm text-gray-700">Entidade<select className="mt-1 w-full p-2 border border-gray-300 rounded-lg" value={filtros.tabela} onChange={e => setFiltros({ ...filtros, tabela: e.target.value })}>
        <option value="">Todas as entidades disponíveis</option>
        {Object.entries(entidadesAudit).filter(([key]) => papel === 'gestor' || operacionais.includes(key)).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
      <label className="text-sm text-gray-700">ID do registro<input type="number" min="1" value={filtros.registro_id} onChange={e => setFiltros({ ...filtros, registro_id: e.target.value })} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" /></label></>}
      <label className="text-sm text-gray-700">Ação<select value={filtros.acao} onChange={e => setFiltros({ ...filtros, acao: e.target.value })} className="mt-1 w-full p-2 border border-gray-300 rounded-lg">
        <option value="">Todas</option><option value="CREATE">Cadastro</option><option value="UPDATE">Alteração</option><option value="DELETE">Remoção</option><option value="RESTORE">Restauração</option>
      </select></label>
      <label className="text-sm text-gray-700">Autor<input value={filtros.usuario} maxLength={200} onChange={e => setFiltros({ ...filtros, usuario: e.target.value })} placeholder="Nome ou ID do usuário" className="mt-1 w-full p-2 border border-gray-300 rounded-lg" /></label>
      <label className="text-sm text-gray-700">De<input type="date" value={filtros.de} onChange={e => setFiltros({ ...filtros, de: e.target.value })} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" /></label>
      <label className="text-sm text-gray-700">Até<input type="date" value={filtros.ate} onChange={e => setFiltros({ ...filtros, ate: e.target.value })} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" /></label>
      <label className="text-sm text-gray-700">Número, nome ou descrição<input value={filtros.busca} maxLength={200} onChange={e => setFiltros({ ...filtros, busca: e.target.value })} className="mt-1 w-full p-2 border border-gray-300 rounded-lg" /></label>
      <div className="flex items-end gap-2"><button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded-lg">Aplicar filtros</button><button type="button" className="px-3 py-2 border border-gray-300 rounded-lg" onClick={() => { recarregar(); setFiltros(filtrosVazios); setAplicados({ ...filtrosVazios }); setPage(1); }}>Limpar</button></div>
    </form>
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden" aria-busy={loading}>
      {loading ? <p role="status" className="p-5 text-gray-500">Carregando histórico...</p> : erro ? <div role="alert" className="p-5 text-red-700">{erro}<button className="block mt-2 text-blue-700 underline" onClick={() => { recarregar(); setTentativa(tentativa + 1); }}>Tentar novamente</button></div> : <>
        <AuditTimeline eventos={resultado?.data ?? []} />
        <div className="flex flex-wrap justify-between items-center gap-3 p-4 border-t border-gray-200 text-sm text-gray-600">
          <p>{resultado?.total ?? 0} evento(s) · Página {page} de {Math.max(resultado?.pages ?? 1, 1)}</p>
          <div className="flex gap-2"><button disabled={page <= 1} className="border border-gray-300 rounded px-3 py-1 disabled:opacity-40" onClick={() => { recarregar(); setPage(page - 1); }}>Anterior</button><button disabled={page >= (resultado?.pages ?? 1)} className="border border-gray-300 rounded px-3 py-1 disabled:opacity-40" onClick={() => { recarregar(); setPage(page + 1); }}>Próxima</button></div>
        </div>
      </>}
    </div>
  </section>;
}
