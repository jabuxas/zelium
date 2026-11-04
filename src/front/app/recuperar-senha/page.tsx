"use client";

import { useState } from "react";
import Link from "next/link";
import { API_URL } from "../lib/api";
import ZeliumBrand from '../components/ZeliumBrand';

/** Solicitação de recuperação: resposta sempre genérica — nada revela se o
 * e-mail pertence a uma conta (contrato do backend). */
export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);
    setEnviando(true);
    try {
      const res = await fetch(`${API_URL}/auth/senha/recuperar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 202) {
        setSucesso(data.message ?? "Se o email pertencer a uma conta ativa, voce recebera um email com o link.");
        setEmail("");
      } else if (res.status === 404) {
        setErro("Recuperação de senha indisponível neste ambiente.");
      } else if (res.status === 429) {
        setErro(data.error ?? "Muitas tentativas. Aguarde antes de tentar novamente.");
      } else {
        setErro("Recuperação temporariamente indisponível. Tente novamente em instantes.");
      }
    } catch {
      setErro("Não foi possível conectar. Verifique sua conexão e tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex justify-center"><ZeliumBrand /></h1>
          <p className="text-gray-600 mt-1">Recuperar acesso</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-xl p-8 space-y-5 shadow-sm"
        >
          {sucesso ? (
            <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              {sucesso}
            </p>
          ) : (
            <>
              <div>
                <label htmlFor="recuperar-email" className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail
                </label>
                <input
                  id="recuperar-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@organizacao.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {erro && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{erro}</p>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
              >
                {enviando ? "Enviando..." : "Enviar link de recuperação"}
              </button>
            </>
          )}

          <p className="text-sm text-center">
            <Link href="/login" className="text-blue-600 hover:underline">Fazer login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
