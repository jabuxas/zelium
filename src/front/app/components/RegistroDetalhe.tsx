'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { API_URL } from '../lib/api';
import { apiFetch } from '../lib/api-client';
import { camposRegistro, formatarValor } from '../lib/audit';
import { formatarDataHora } from '../lib/dates';
import { useAuth } from '../lib/auth-context';
import AuditLogPanel from './AuditLogPanel';
import SolicitacaoAcoes, { StatusSolicitacao } from './SolicitacaoAcoes';

type Tipo = 'patrimonio' | 'solicitacao' | 'ambiente';
const recursos = {
  patrimonio: { rota: 'patrimonios', titulo: 'Patrimônio' },
  solicitacao: { rota: 'solicitacoes', titulo: 'Solicitação' },
  ambiente: { rota: 'ambientes', titulo: 'Ambiente' },
};
const referencias: Record<string, string> = { estado_item_id: 'estados-item', ambiente_id: 'ambientes', responsavel_id: 'responsaveis', tipo_material_id: 'tipo-material', fornecedor_id: 'fornecedores', conferente_id: 'conferentes', patrimonio_id: 'patrimonios' };

export default function RegistroDetalhe({ tipo }: { tipo: Tipo }) {
  const { id } = useParams<{ id: string }>();
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) {
    return <p role="alert">Registro inválido</p>;
  }
  return <RegistroConteudo key={`${tipo}-${id}`} tipo={tipo} id={id} />;
}

function RegistroConteudo({ tipo, id }: { tipo: Tipo; id: string }) {
  const recurso = recursos[tipo];
  const { podeEscrever } = useAuth();
  const [registro, setRegistro] = useState<Record<string, unknown> | null>(null);
  const [nomes, setNomes] = useState<Record<string, Record<number, string>>>({});
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [revisao, setRevisao] = useState(0);

  useEffect(() => {
    let ativo = true;
    apiFetch(`${API_URL}/${recurso.rota}/${id}`).then(async res => {
      if (!res.ok) throw new Error(res.status === 404 ? 'Registro removido ou não encontrado. O histórico disponível permanece abaixo.' : 'Erro ao carregar registro');
      return res.json();
    }).then(async data => {
      if (ativo) setRegistro(data);
      const campos = Object.keys(data).filter(campo => referencias[campo] && data[campo]);
      const entries = await Promise.all(campos.map(async campo => {
        try {
          const res = await apiFetch(`${API_URL}/${referencias[campo]}/${data[campo]}`);
          if (!res.ok) return [campo, {}] as const;
          const item = await res.json() as { id: number; nome?: string; numero_patrimonio?: string };
          return [campo, { [item.id]: item.nome ?? item.numero_patrimonio ?? `#${item.id}` }] as const;
        } catch {
          // Uma referência indisponível não deve esconder o registro principal.
          return [campo, {}] as const;
        }
      }));
      if (ativo) setNomes(Object.fromEntries(entries));
    }).catch(err => { if (ativo) setErro(err instanceof Error ? err.message : 'Erro ao carregar registro'); })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [id, recurso.rota]);

  async function alterarStatus(status: StatusSolicitacao) {
    if (!podeEscrever('solicitacoes') || salvando) return;
    setSalvando(true); setErro('');
    try {
      const res = await apiFetch(`${API_URL}/solicitacoes/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao alterar status');
      setRegistro(data); setRevisao(valor => valor + 1);
    } catch (err) { setErro(err instanceof Error ? err.message : 'Erro ao alterar status'); }
    finally { setSalvando(false); }
  }

  return <div className="space-y-6">
    <Link href={`/${recurso.rota}`} className="inline-flex items-center gap-2 text-sm text-blue-700 hover:underline"><ArrowLeft size={16} />Voltar à lista</Link>
    <header className="flex flex-wrap justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-gray-900">{recurso.titulo} {String(registro?.numero_patrimonio ?? `#${id}`)}</h1><p className="text-gray-600 mt-1">Inspeção e histórico de atividades</p></div>
      {registro && tipo !== 'solicitacao' && <div className="flex gap-3 items-center">
        {podeEscrever(recurso.rota as 'patrimonios' | 'ambientes') && <Link className="text-blue-700 hover:underline" href={`/${recurso.rota}/editar/${id}`}>Editar</Link>}
        {tipo === 'patrimonio' && <Link className="text-blue-700 hover:underline" href={`/patrimonios/etiqueta/${id}`}>Etiqueta QR Code</Link>}
      </div>}
    </header>
    {loading && <p role="status">Carregando registro...</p>}
    {erro && <p role="alert" className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-900">{erro}</p>}
    {registro && <section className="bg-white border border-gray-200 rounded-lg p-5 space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">Dados atuais</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Object.entries(registro).filter(([campo]) => camposRegistro[campo]).map(([campo, value]) => <div key={campo}>
          <dt className="text-sm text-gray-500">{camposRegistro[campo]}</dt>
          <dd className="text-gray-900 break-words mt-1">{campo === 'patrimonio_id' && typeof value === 'number' ? <Link href={`/patrimonios/${value}`} className="inline-flex items-center gap-1 text-blue-700 hover:underline">{nomes[campo]?.[value] ?? `#${value}`}<ExternalLink size={14} /></Link> : nomes[campo]?.[Number(value)] ?? formatarValor(campo, value)}</dd>
        </div>)}
        <div><dt className="text-sm text-gray-500">Cadastrado em</dt><dd className="mt-1 text-gray-900">{formatarDataHora((registro.created_at ?? registro.createdAt) as string)}</dd></div>
      </dl>
      {tipo === 'solicitacao' && <><SolicitacaoAcoes id={Number(id)} status={registro.status as StatusSolicitacao} ocupado={salvando} onChange={alterarStatus} />{!podeEscrever('solicitacoes') && <p className="text-sm text-gray-500">Você pode acompanhar esta solicitação. Somente Gestor e Responsável podem alterar o status.</p>}</>}
    </section>}
    <section className="space-y-3"><h2 className="text-lg font-semibold text-gray-900">Histórico deste {tipo === 'solicitacao' ? 'registro' : tipo === 'patrimonio' ? 'patrimônio' : 'ambiente'}</h2>
      {tipo === 'patrimonio' && <p className="text-sm text-gray-600">Inclui alterações do bem, solicitações, fotos e conferências relacionadas.</p>}
      <AuditLogPanel key={`${id}-${revisao}`} tabela={tipo} registroId={Number(id)} relacionados={tipo === 'patrimonio'} />
    </section>
  </div>;
}
