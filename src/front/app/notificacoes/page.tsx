'use client'

import { useEffect, useState } from 'react';
import { Bell, Mail } from 'lucide-react';
import { API_URL } from '../lib/api';
import { apiFetch } from '../lib/api-client';

type Notificacao = {
  id: number;
  tipo: string;
  assunto: string;
  corpo: string;
  destinatarios: string[];
  status: string;
  created_at: string;
};

const TIPO_LABEL: Record<string, string> = {
  avaria: 'Avaria reportada',
  solicitacao_criada: 'Solicitação aberta',
  solicitacao_status: 'Status atualizado',
};

const STATUS_CLASSES: Record<string, string> = {
  enviada: 'bg-green-50 text-green-700 border-green-200',
  simulada: 'bg-amber-50 text-amber-700 border-amber-200',
  pendente: 'bg-blue-50 text-blue-700 border-blue-200',
  falha: 'bg-red-50 text-red-700 border-red-200',
};

function formatarData(valor: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(valor));
}

export default function NotificacoesPage() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`${API_URL}/notificacoes`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setNotificacoes)
      .catch(() => setErro('Erro ao carregar notificações'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Notificações</h1>
        <p className="text-gray-600">
          E-mails automáticos disparados em avarias e solicitações de manutenção
        </p>
      </div>

      {erro && <p className="text-red-600">{erro}</p>}
      {loading && <p className="text-gray-500">Carregando...</p>}

      {!loading && !erro && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {notificacoes.map((notificacao) => (
              <div key={notificacao.id} className="p-5 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600 mt-0.5">
                      {notificacao.tipo === 'avaria' ? <Bell size={18} /> : <Mail size={18} />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {TIPO_LABEL[notificacao.tipo] ?? notificacao.tipo}
                      </p>
                      <p className="text-gray-800 mt-0.5">{notificacao.assunto}</p>
                      <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{notificacao.corpo}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Para: {notificacao.destinatarios.join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full border ${STATUS_CLASSES[notificacao.status] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      {notificacao.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-2">{formatarData(notificacao.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
            {notificacoes.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Nenhuma notificação enviada ainda.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
