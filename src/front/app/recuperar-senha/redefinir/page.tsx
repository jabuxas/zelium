"use client";

import { useState } from "react";
import Link from "next/link";
import { API_URL } from "../../lib/api";
import { useTokenDeLink, descartarTokenDeLink } from "../../lib/token-link";
import ZeliumBrand from '../../components/ZeliumBrand';

/** Redefinição por token do e-mail: mesmo mecanismo da confirmação de
 * cadastro (hook concentra leitura do fragmento + resgate no remount). */
export default function RedefinirSenhaPage() {
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const estadoToken = useTokenDeLink("zelium_token_senha");
  const { token, semToken } = estadoToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErroLocal(null);
    setErro(null);
    if (senha.length < 12) {
      setErroLocal("A senha deve ter pelo menos 12 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setErroLocal("As senhas não coincidem.");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch(`${API_URL}/auth/senha/redefinir`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
        body: JSON.stringify({ token, senha }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 200) {
        descartarTokenDeLink("zelium_token_senha");
        setSucesso(data.message ?? "Senha redefinida. Faça login com a nova senha.");
        setSenha("");
        setConfirmarSenha("");
      } else if (res.status === 400) {
        setErro(data.error ?? "Redefinição inválida ou expirada. Solicite nova recuperação.");
      } else if (res.status === 404) {
        setErro("Recuperação de senha indisponível neste ambiente.");
      } else {
        setErro("Redefinição temporariamente indisponível. Tente novamente em instantes.");
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
          <p className="text-gray-600 mt-1">Defina uma nova senha</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-5 shadow-sm">
          {semToken ? (
            <>
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                Link incompleto: abra o link completo enviado por e-mail.
              </p>
              <p className="text-sm text-center">
                <Link href="/recuperar-senha" className="text-blue-600 hover:underline">Novo link</Link>
              </p>
            </>
          ) : sucesso ? (
            <>
              <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                {sucesso}
              </p>
              <p className="text-sm text-center">
                <Link href="/login" className="text-blue-600 hover:underline">Fazer login</Link>
              </p>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="redefinir-senha" className="block text-sm font-medium text-gray-700 mb-1">
                  Nova senha
                </label>
                <input
                  id="redefinir-senha"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Pelo menos 12 caracteres"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="redefinir-senha2" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar senha
                </label>
                <input
                  id="redefinir-senha2"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {(erroLocal || erro) && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  {erroLocal ?? erro}
                </p>
              )}

              {erro && (
                <p className="text-sm text-center">
                  <Link href="/recuperar-senha" className="text-blue-600 hover:underline">Novo link</Link>
                </p>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
              >
                {enviando ? "Redefinindo..." : "Redefinir senha"}
              </button>
            </form>
          )}

          {!semToken && !sucesso && (
            <p className="text-xs text-gray-500 text-center">
              Links expiram em 24 horas. Se o seu expirou, solicite nova recuperação.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
