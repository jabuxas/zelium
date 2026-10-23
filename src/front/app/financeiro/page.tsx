'use client'

import { useEffect, useState } from 'react';
import { Wallet, TrendingDown, PiggyBank, Download } from 'lucide-react';
import { API_URL } from '../lib/api';
import { apiFetch } from '../lib/api-client';
import { getToken } from '../lib/auth';

type ResumoFinanceiro = {
  total: {
    total_itens: number;
    itens_depreciaveis: number;
    valor_aquisicao: number;
    valor_residual: number;
    depreciacao_acumulada: number;
    valor_contabil: number;
  };
  por_ambiente: Array<{
    ambiente_id: number;
    ambiente: string;
    total_itens: number;
    valor_aquisicao: number;
    depreciacao_acumulada: number;
    valor_contabil: number;
  }>;
};

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function FinanceiroPage() {
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`${API_URL}/relatorios/financeiro`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setResumo)
      .catch(() => setErro('Erro ao carregar dados financeiros'))
      .finally(() => setLoading(false));
  }, []);

  function baixarCsv() {
    const token = getToken();
    fetch(`${API_URL}/relatorios/exportar/csv?tipo=financeiro`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => alert('Erro ao baixar o arquivo'));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Financeiro</h1>
          <p className="text-gray-600">
            Depreciação linear e valor contábil do parque de patrimônios
          </p>
        </div>
        <button
          onClick={baixarCsv}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          <Download size={18} />
          Exportar CSV
        </button>
      </div>

      {erro && <p className="text-red-600">{erro}</p>}
      {loading && <p className="text-gray-500">Carregando...</p>}

      {resumo && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Wallet size={20} />
                <p className="text-sm text-gray-600">Valor de aquisição</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {BRL.format(resumo.total.valor_aquisicao)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {resumo.total.total_itens} bens cadastrados
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <PiggyBank size={20} />
                <p className="text-sm text-gray-600">Valor contábil atual</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {BRL.format(resumo.total.valor_contabil)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                valor de aquisição menos depreciação
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <TrendingDown size={20} />
                <p className="text-sm text-gray-600">Depreciação acumulada</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {BRL.format(resumo.total.depreciacao_acumulada)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                método linear (linha reta)
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <Wallet size={20} />
                <p className="text-sm text-gray-600">Valor residual total</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {BRL.format(resumo.total.valor_residual)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {resumo.total.itens_depreciaveis} bens com depreciação ativa
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Valor contábil por ambiente
              </h2>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Ambiente</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Itens</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Aquisição</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Depreciação</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Valor contábil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {resumo.por_ambiente.map((linha) => (
                  <tr key={linha.ambiente_id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-900 font-medium">{linha.ambiente}</td>
                    <td className="px-6 py-3 text-sm text-gray-600 text-right">{linha.total_itens}</td>
                    <td className="px-6 py-3 text-sm text-gray-600 text-right">
                      {BRL.format(linha.valor_aquisicao)}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600 text-right">
                      {BRL.format(linha.depreciacao_acumulada)}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900 font-medium text-right">
                      {BRL.format(linha.valor_contabil)}
                    </td>
                  </tr>
                ))}
                {resumo.por_ambiente.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Nenhum patrimônio cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
