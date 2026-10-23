'use client'

import { useEffect, useState } from 'react';
import { Building2, Users, Activity, Download, FileText } from 'lucide-react';
import { API_URL } from '../lib/api';
import { apiFetch } from '../lib/api-client';
import { getToken } from '../lib/auth';

type Resumo = {
  ambiente_id?: number;
  ambiente?: string;
  responsavel_id?: number;
  responsavel?: string;
  estado_item_id?: number;
  estado?: string;
  total_itens: number;
  valor_total: number;
};

type LinhaPatrimonio = {
  id: number;
  numero_patrimonio: string;
  descricao: string;
  valor: number;
  ambiente: string | null;
  responsavel: string | null;
  estado: string | null;
  tipo_material: string | null;
  fornecedor: string | null;
};

type Opcao = { id: number; nome: string };

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function baixar(tipo: string, filtros: Record<string, string> = {}) {
  const token = getToken();
  const params = new URLSearchParams({ tipo, ...filtros });
  fetch(`${API_URL}/relatorios/exportar/csv?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then((r) => {
      if (!r.ok) throw new Error();
      return r.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${tipo}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch(() => alert('Erro ao baixar o arquivo'));
}

function baixarPdf(tipo: string, filtros: Record<string, string> = {}) {
  const token = getToken();
  const params = new URLSearchParams({ tipo, ...filtros });
  fetch(`${API_URL}/relatorios/exportar/pdf?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then((r) => {
      if (!r.ok) throw new Error();
      return r.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${tipo}-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch(() => alert('Erro ao baixar o arquivo'));
}

function BotoesDownload({ tipo, filtros = {} }: { tipo: string; filtros?: Record<string, string> }) {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => baixar(tipo, filtros)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
      >
        <Download size={16} />
        CSV
      </button>
      <button
        onClick={() => baixarPdf(tipo, filtros)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
      >
        <FileText size={16} />
        PDF
      </button>
    </div>
  );
}

function TabelaResumo({
  colunaNome,
  linhas,
}: {
  colunaNome: string;
  linhas: Resumo[];
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">{colunaNome}</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Itens</th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Valor total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {linhas.map((linha, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-6 py-3 text-sm text-gray-900 font-medium">
                {linha[colunaNome as keyof Resumo] as string}
              </td>
              <td className="px-6 py-3 text-sm text-gray-600 text-right">{linha.total_itens}</td>
              <td className="px-6 py-3 text-sm text-gray-600 text-right">{BRL.format(linha.valor_total)}</td>
            </tr>
          ))}
          {linhas.length === 0 && (
            <tr>
              <td colSpan={3} className="px-6 py-6 text-center text-gray-500">
                Nenhum dado encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function RelatoriosPage() {
  const [porAmbiente, setPorAmbiente] = useState<Resumo[]>([]);
  const [porResponsavel, setPorResponsavel] = useState<Resumo[]>([]);
  const [porEstado, setPorEstado] = useState<Resumo[]>([]);
  const [patrimonios, setPatrimonios] = useState<LinhaPatrimonio[]>([]);
  const [ambientes, setAmbientes] = useState<Opcao[]>([]);
  const [responsaveis, setResponsaveis] = useState<Opcao[]>([]);
  const [estados, setEstados] = useState<Opcao[]>([]);
  const [filtros, setFiltros] = useState({ ambiente_id: '', responsavel_id: '', estado_item_id: '', busca: '' });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch(`${API_URL}/relatorios/por-ambiente`).then((r) => r.json()),
      apiFetch(`${API_URL}/relatorios/por-responsavel`).then((r) => r.json()),
      apiFetch(`${API_URL}/relatorios/por-estado`).then((r) => r.json()),
      apiFetch(`${API_URL}/ambientes`).then((r) => r.json()),
      apiFetch(`${API_URL}/responsaveis`).then((r) => r.json()),
      apiFetch(`${API_URL}/estados-item`).then((r) => r.json()),
    ])
      .then(([amb, resp, est, ambientesOpt, respOpt, estOpt]) => {
        setPorAmbiente(amb);
        setPorResponsavel(resp);
        setPorEstado(est);
        setAmbientes(ambientesOpt);
        setResponsaveis(respOpt);
        setEstados(estOpt);
      })
      .catch(() => setErro('Erro ao carregar relatórios'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([chave, valor]) => {
      if (valor) params.set(chave, valor);
    });
    apiFetch(`${API_URL}/relatorios/patrimonios?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setPatrimonios)
      .catch(() => undefined);
  }, [filtros]);

  const filtrosAtivos = Object.fromEntries(
    Object.entries(filtros).filter(([, valor]) => valor !== '')
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Relatórios</h1>
        <p className="text-gray-600">
          Relatórios por ambiente, responsável e estado, com exportação em PDF e CSV
        </p>
      </div>

      {erro && <p className="text-red-600">{erro}</p>}
      {loading && <p className="text-gray-500">Carregando...</p>}

      {!loading && !erro && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Building2 size={18} />
                <p className="text-sm font-medium">Por ambiente</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {porAmbiente.reduce((s, l) => s + Number(l.valor_total), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <Users size={18} />
                <p className="text-sm font-medium">Por responsável</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {porResponsavel.reduce((s, l) => s + Number(l.valor_total), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-600 mb-1">
                <Activity size={18} />
                <p className="text-sm font-medium">Por estado</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {porEstado.reduce((s, l) => s + Number(l.valor_total), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Relatório por Ambiente</h2>
              <BotoesDownload tipo="por-ambiente" />
            </div>
            <TabelaResumo colunaNome="ambiente" linhas={porAmbiente} />
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Relatório por Responsável</h2>
              <BotoesDownload tipo="por-responsavel" />
            </div>
            <TabelaResumo colunaNome="responsavel" linhas={porResponsavel} />
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Relatório por Estado</h2>
              <BotoesDownload tipo="por-estado" />
            </div>
            <TabelaResumo colunaNome="estado" linhas={porEstado} />
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Patrimônios</h2>
              <BotoesDownload tipo="patrimonios" filtros={filtrosAtivos} />
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <select
                aria-label="Filtrar por ambiente"
                className="px-3 py-2 border border-gray-300 rounded-lg"
                value={filtros.ambiente_id}
                onChange={(e) => setFiltros({ ...filtros, ambiente_id: e.target.value })}
              >
                <option value="">Todos os ambientes</option>
                {ambientes.map((a) => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </select>
              <select
                aria-label="Filtrar por responsável"
                className="px-3 py-2 border border-gray-300 rounded-lg"
                value={filtros.responsavel_id}
                onChange={(e) => setFiltros({ ...filtros, responsavel_id: e.target.value })}
              >
                <option value="">Todos os responsáveis</option>
                {responsaveis.map((a) => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </select>
              <select
                aria-label="Filtrar por estado"
                className="px-3 py-2 border border-gray-300 rounded-lg"
                value={filtros.estado_item_id}
                onChange={(e) => setFiltros({ ...filtros, estado_item_id: e.target.value })}
              >
                <option value="">Todos os estados</option>
                {estados.map((a) => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </select>
              <input
                type="text"
                aria-label="Buscar por número ou descrição"
                placeholder="Buscar por número ou descrição..."
                className="px-3 py-2 border border-gray-300 rounded-lg"
                value={filtros.busca}
                onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
              />
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Número</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Descrição</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Ambiente</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Responsável</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Estado</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {patrimonios.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{p.numero_patrimonio}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.descricao}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.ambiente ?? '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.responsavel ?? '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.estado ?? '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{BRL.format(p.valor)}</td>
                    </tr>
                  ))}
                  {patrimonios.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        Nenhum patrimônio encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
