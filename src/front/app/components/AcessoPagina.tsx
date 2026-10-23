'use client';

import Link from 'next/link';
import { useAuth } from '../lib/auth-context';
import { podeAcessarPagina } from '../lib/permissions';

export default function AcessoPagina({ path, children }: { path: string; children: React.ReactNode }) {
  const { papel, carregando } = useAuth();
  if (carregando) return <p role="status">Verificando permissões...</p>;
  if (!podeAcessarPagina(papel, path)) return (
    <section role="status" className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
      <h1 className="text-xl font-semibold text-gray-900">Acesso restrito</h1>
      <p className="text-gray-600">Seu perfil não permite esta operação. Você pode continuar consultando os registros disponíveis.</p>
      <Link href={papel ? '/' : '/login'} className="inline-block text-blue-700 underline">{papel ? 'Voltar ao dashboard' : 'Fazer login'}</Link>
    </section>
  );
  return <>{children}</>;
}
