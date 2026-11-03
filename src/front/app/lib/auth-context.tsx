"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "./api";
import { apiFetch } from "./api-client";
import {
  limparSessaoInfo,
  getOrganizacao,
  getUsuario,
  setSessaoInfo,
  type OrganizacaoSessao,
  type Papel,
  type UsuarioSessao,
} from "./auth";
import { podeEscreverRecurso, type Recurso } from './permissions';
export type { Recurso } from './permissions';

interface AuthContextValue {
  usuario: UsuarioSessao | null;
  organizacao: OrganizacaoSessao | null;
  papel: Papel | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  podeEscrever: (recurso: Recurso) => boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  usuario: null,
  organizacao: null,
  papel: null,
  carregando: false,
  login: async () => {},
  logout: () => {},
  podeEscrever: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(null);
  const [organizacao, setOrganizacao] = useState<OrganizacaoSessao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [trialExpirado, setTrialExpirado] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const aoExpirar = () => setTrialExpirado(true);
    window.addEventListener("zelium:trial-expirado", aoExpirar);
    return () => window.removeEventListener("zelium:trial-expirado", aoExpirar);
  }, []);

  useEffect(() => {
    // O cookie é HttpOnly: o cliente descobre a sessão perguntando à API.
    // Sonda SEM redirecionamento automático (fetch puro, não apiFetch):
    // páginas públicas (/cadastro) renderizam sem sessão e não podem ser
    // expulsas para /login pela checagem inicial.
    // /me também atualiza os dados de exibição se mudarem (ex.: outro tab).
    let ativo = true;
    fetch(`${API_URL}/auth/me`, {
      credentials: "include",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
      .then(async (res) => {
        if (!res.ok) {
          limparSessaoInfo();
          if (ativo) {
            setUsuario(null);
            setOrganizacao(null);
          }
          return;
        }
        const data = await res.json();
        if (!ativo) return;
        setUsuario(data.usuario ?? null);
        setOrganizacao(data.organizacao ?? null);
        if (data.usuario) setSessaoInfo(data.usuario, data.organizacao ?? undefined);
      })
      .catch(() => {
        if (ativo) setCarregando(false);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, senha: string) => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
        body: JSON.stringify({ email, senha }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Falha ao entrar");
      }

      // O token vem no corpo (uso do mobile) mas NÃO é guardado: a sessão
      // web é o cookie HttpOnly definido pela resposta.
      setSessaoInfo(data.usuario, data.organizacao ?? undefined);
      setUsuario(data.usuario);
      setOrganizacao(data.organizacao ?? null);
      setTrialExpirado(false);
      router.push("/");
      router.refresh();
    },
    [router]
  );

  const logout = useCallback(() => {
    // Tenta apagar o cookie no servidor; limpa local em qualquer caso.
    void apiFetch(`${API_URL}/auth/logout`, { method: "POST" }).catch(() => {});
    limparSessaoInfo();
    setUsuario(null);
    setOrganizacao(null);
    setTrialExpirado(false);
    router.push("/login");
  }, [router]);

  const podeEscrever = useCallback(
    (recurso: Recurso) => {
      return podeEscreverRecurso(usuario?.papel ?? null, recurso);
    },
    [usuario]
  );

  return (
    <AuthContext.Provider
      value={{ usuario, organizacao, papel: usuario?.papel ?? null, carregando, login, logout, podeEscrever }}
    >
      {trialExpirado && (
        <div
          role="alert"
          className="bg-amber-50 border-b border-amber-300 text-amber-900 text-sm px-4 py-2.5 flex items-center justify-between gap-4"
        >
          <span>
            O período de avaliação da sua organização expirou. Consultas e
            exportações continuam disponíveis; novas escritas estão bloqueadas.
          </span>
          <button
            type="button"
            onClick={() => setTrialExpirado(false)}
            className="shrink-0 px-3 py-1 border border-amber-400 rounded-md hover:bg-amber-100"
          >
            Entendi
          </button>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
