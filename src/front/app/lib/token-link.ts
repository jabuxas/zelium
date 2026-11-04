"use client";

import { useEffect, useState } from "react";

/**
 * Lê o segredo do fragmento (#token=64 hex) dos links de e-mail:
 * 1. guarda-o por aba (sessionStorage) ANTES de removê-lo da URL;
 * 2. o roteador do Next se integra ao history e pode REMONTAR a página ao
 *    remover o fragmento — o resgate do storage mantém o formulário de pé
 *    (sem isso, o remount releria um hash vazio e derrubaria a tela).
 * O token nunca fica na barra de endereço/histórico.
 */
export function useTokenDeLink(chave: string) {
  const [token, setToken] = useState<string | null>(null);
  const [semToken, setSemToken] = useState(false);

  useEffect(() => {
    const match = /^#token=([a-f0-9]{64})$/.exec(window.location.hash);
    if (match) {
      sessionStorage.setItem(chave, match[1]);
      setToken(match[1]);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      return;
    }
    const guardado = sessionStorage.getItem(chave);
    if (guardado && /^[a-f0-9]{64}$/.test(guardado)) {
      setToken(guardado);
    } else {
      sessionStorage.removeItem(chave);
      setSemToken(true);
    }
  }, [chave]);

  return { token, semToken };
}

/** Descarta o segredo da aba (após consumo bem-sucedido). */
export function descartarTokenDeLink(chave: string): void {
  sessionStorage.removeItem(chave);
}
