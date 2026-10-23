'use client'

import { useEffect, useState } from 'react';
import { Package, MapPin, Users, AlertTriangle } from 'lucide-react';
import { API_URL } from '../lib/api';
import { apiFetch } from '../lib/api-client';
import Link from 'next/link';
import AuditTimeline from './AuditTimeline';
import type { AuditEvent, AuditPage } from '../lib/audit';

type Patrimonio = {
  id: number;
  numero_patrimonio: string;
  descricao: string;
  estado_item_id: number;
};

type Opcao = { id: number; nome: string };

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

async function buscarJson<T>(url: string): Promise<T> {
  const resposta = await apiFetch(url);

  if (!resposta.ok) {
    throw new Error('Erro ao carregar dados do dashboard');
  }

  return resposta.json();
}

export default function Dashboard() {
  const [patrimonios, setPatrimonios] = useState<Patrimonio[]>([]);
  const [ambientes, setAmbientes] = useState<Opcao[]>([]);
  const [responsaveis, setResponsaveis] = useState<Opcao[]>([]);
  const [estados, setEstados] = useState<Opcao[]>([]);
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [erroAtividades, setErroAtividades] = useState(false);
  const [loadingAtividades, setLoadingAtividades] = useState(true);

  useEffect(() => {
    Promise.all([
      buscarJson<Patrimonio[]>(`${API_URL}/patrimonios`),
      buscarJson<Opcao[]>(`${API_URL}/ambientes`),
      buscarJson<Opcao[]>(`${API_URL}/responsaveis`),
      buscarJson<Opcao[]>(`${API_URL}/estados-item`),
    ])
      .then(([pats, ambs, resps, ests]) => {
        setPatrimonios(pats);
        setAmbientes(ambs);
        setResponsaveis(resps);
        setEstados(ests);
      })
      .catch(() => setErro('Erro ao carregar dados do dashboard'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    buscarJson<AuditPage>(`${API_URL}/audit-log?limit=5&operacional=true`)
      .then(auditLogs => setLogs(auditLogs.data ?? []))
      .catch(() => setErroAtividades(true))
      .finally(() => setLoadingAtividades(false));
  }, []);

  const estadosManutencao = new Set(
    estados
      .filter((estado) => normalizar(estado.nome).includes('manutencao'))
      .map((estado) => estado.id),
  );

  const stats = [
    { label: 'Total de Patrimônios', value: patrimonios.length, icon: Package, color: 'bg-blue-50 text-blue-600' },
    { label: 'Ambientes Cadastrados', value: ambientes.length, icon: MapPin, color: 'bg-green-50 text-green-600' },
    { label: 'Responsáveis Ativos', value: responsaveis.length, icon: Users, color: 'bg-purple-50 text-purple-600' },
    {
      label: 'Itens em Manutenção',
      value: patrimonios.filter((patrimonio) => estadosManutencao.has(patrimonio.estado_item_id)).length,
      icon: AlertTriangle,
      color: 'bg-orange-50 text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Visão geral do sistema de gestão patrimonial</p>
      </div>

      {erro && <p className="text-red-600">{erro}</p>}
      {loading && <p className="text-gray-500">Carregando...</p>}

      {!loading && !erro && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                      <Icon size={24} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-6 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Atividades Recentes</h2>
              <Link href="/audit-log" className="text-sm text-blue-700 hover:underline">Ver histórico completo</Link>
            </div>
            <div className="divide-y divide-gray-200">
              {erroAtividades && <p role="status" className="p-4 text-gray-600">Atividades indisponíveis no momento. Os indicadores continuam disponíveis.</p>}
              {loadingAtividades && <p role="status" className="p-4 text-gray-500">Buscando atividades...</p>}
              {!loadingAtividades && !erroAtividades && <AuditTimeline eventos={logs} compacto />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
