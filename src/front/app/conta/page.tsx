"use client";

import { useState } from "react";
import Link from "next/link";
import { API_URL } from "../lib/api";
import { apiFetch } from "../lib/api-client";
import { limparSessaoInfo } from "../lib/auth";

/**
 * Alteração da própria senha (qualquer perfil). A API revoga TODAS as
 * sessões ao trocar a senha — inclusive a atual: o usuário volta ao login.
 */
export default function ContaPage() {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }
    setEnviando(true);
    try {
      const res = await apiFetch(`${API_URL}/usuarios/senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha_atual: senhaAtual, senha }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 200) {
        limparSessaoInfo();
        setSucesso(data.message ?? "Senha alterada. Faça login novamente com a nova senha.");
        setSenhaAtual("");
        setSenha("");
        setConfirmarSenha("");
      } else {
        setErro(data.error ?? "Não foi possível alterar a senha.");
      }
    } catch {
      setErro("Não foi possível conectar. Verifique sua conexão e tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Minha conta</h1>
        <p className="text-gray-600">Altere sua senha de acesso</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5 shadow-sm">
        <div>
          <label htmlFor="conta-senha-atual" className="block text-sm font-medium text-gray-700 mb-1">
            Senha atual
          </label>
          <input
            id="conta-senha-atual"
            type="password"
            required
            autoComplete="current-password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="conta-senha" className="block text-sm font-medium text-gray-700 mb-1">
            Nova senha
          </label>
          <input
            id="conta-senha"
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
          <label htmlFor="conta-senha2" className="block text-sm font-medium text-gray-700 mb-1">
            Confirmar nova senha
          </label>
          <input
            id="conta-senha2"
            type="password"
            required
            autoComplete="new-password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            placeholder="Repita a nova senha"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {(erro || sucesso) && (
          <p className={`text-sm rounded-lg px-4 py-3 border ${sucesso
            ? "text-green-700 bg-green-50 border-green-200"
            : "text-red-600 bg-red-50 border-red-200"}`}>
            {sucesso ?? erro}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando || !!sucesso}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
        >
          {enviando ? "Alterando..." : "Alterar senha"}
        </button>

        {sucesso && (
          <p className="text-sm text-center">
            <Link href="/login" className="text-blue-600 hover:underline">Fazer login</Link>
          </p>
        )}

        <p className="text-xs text-gray-500">
          Ao alterar a senha, todas as sessões desta conta são encerradas —
          inclusive esta — e será preciso entrar novamente.
        </p>
      </form>
    </div>
  );
}
