'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { API_URL } from '../../../lib/api';
import { apiFetch } from '../../../lib/api-client';

type Patrimonio = {
  id: number;
  numero_patrimonio: string;
  descricao: string;
};

export default function EtiquetaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [patrimonio, setPatrimonio] = useState<Patrimonio | null>(null);
  const [qrSvg, setQrSvg] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    Promise.all([
      apiFetch(`${API_URL}/patrimonios/${params.id}`).then((r) => (r.ok ? r.json() : Promise.reject())),
      apiFetch(`${API_URL}/patrimonios/${params.id}/qrcode`).then((r) => (r.ok ? r.text() : Promise.reject())),
    ])
      .then(([item, svg]) => {
        setPatrimonio(item);
        setQrSvg(svg);
      })
      .catch(() => setErro('Erro ao carregar etiqueta'));
  }, [params?.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Voltar
        </button>
        {patrimonio && (
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Printer size={18} />
            Imprimir etiqueta
          </button>
        )}
      </div>

      {erro && <p className="text-red-600">{erro}</p>}

      {patrimonio && (
        <div className="flex justify-center">
          <div className="etiqueta bg-white border-2 border-gray-900 rounded-xl p-6 w-80">
            <p className="text-xs tracking-widest uppercase text-gray-500 mb-1">
              Zelium · Gestão Patrimonial
            </p>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {patrimonio.numero_patrimonio}
            </p>
            <p className="text-sm text-gray-700 mb-4">{patrimonio.descricao}</p>
            <div
              className="flex justify-center [&_svg]:w-40 [&_svg]:h-40"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="text-center text-xs text-gray-400 mt-3">
              Escaneie com o app Zelium para conferir em campo
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
