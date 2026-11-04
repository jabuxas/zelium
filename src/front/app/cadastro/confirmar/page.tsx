"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_URL } from "../../lib/api";
import { useTokenDeLink, descartarTokenDeLink } from "../../lib/token-link";
import ZeliumBrand from '../../components/ZeliumBrand';

/**
 * Confirmação do cadastro: o segredo chega no fragmento do link do e-mail
 * (#token=...). Lido pelo hook (que o guarda por aba e remove da URL) e
 * enviado por POST explícito; nada consome confirmação por GET (robôs de
 * pré-visualização de e-mail são inofensivos por construção, ADR-0012).
 */
export default function ConfirmarCadastroPage() {
  const [token, setToken] = useState<string | null>(null);
  const [semToken, setSemToken] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const estadoToken = useTokenDeLink("zelium_token_cadastro");
  useEffect(() => {
    setToken(estadoToken.token);
    setSemToken(estadoToken.semToken);
  }, [estadoToken.token, estadoToken.semToken]);

  function validarLocal(): string | null {
    if (senha.length < 12) return "A senha deve ter pelo menos 12 caracteres.";
    if (senha !== confirmarSenha) return "As senhas não coincidem.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErroLocal(null);
    setErro(null);
    const problema = validarLocal();
    if (problema) {
      setErroLocal(problema);
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch(`${API_URL}/auth/cadastros/confirmacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
        body: JSON.stringify({ token, senha }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201) {
        descartarTokenDeLink("zelium_token_cadastro");
        setSucesso(data.message ?? "Cadastro confirmado. Faça login para continuar.");
        setSenha("");
        setConfirmarSenha("");
      } else if (res.status === 400) {
        setErro(data.error ?? "Confirmação inválida ou expirada. Solicite novo cadastro.");
      } else if (res.status === 404) {
        setErro("Cadastro por conta própria indisponível neste ambiente.");
      } else {
        setErro("Confirmação temporariamente indisponível. Tente novamente em instantes.");
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
          <p className="text-gray-600 mt-1">Confirme seu cadastro e defina sua senha</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-5 shadow-sm">
          {semToken ? (
            <>
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                Link incompleto: abra o link completo enviado por e-mail.
              </p>
              <p className="text-sm text-center">
                <Link href="/cadastro" className="text-blue-600 hover:underline">
                  Solicitar novo cadastro
                </Link>
              </p>
            </>
          ) : sucesso ? (
            <>
              <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                {sucesso}
              </p>
              <p className="text-sm text-center">
                <Link href="/login" className="text-blue-600 hover:underline">
                  Fazer login
                </Link>
              </p>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="confirmar-senha" className="block text-sm font-medium text-gray-700 mb-1">
                  Nova senha
                </label>
                <input
                  id="confirmar-senha"
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
                <label htmlFor="confirmar-senha2" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar senha
                </label>
                <input
                  id="confirmar-senha2"
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
                  <Link href="/cadastro" className="text-blue-600 hover:underline">
                    Solicitar novo cadastro
                  </Link>
                </p>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
              >
                {enviando ? "Confirmando..." : "Confirmar cadastro"}
              </button>
            </form>
          )}

          {!semToken && !sucesso && (
            <p className="text-xs text-gray-500 text-center">
              Links expiram em 24 horas. Se o seu expirou, solicite um novo cadastro.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
