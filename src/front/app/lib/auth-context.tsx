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
import {
  clearSession,
  getOrganizacao,
  getToken,
  getUsuario,
  setSession,
  type OrganizacaoSessao,
  type Papel,
  type UsuarioSessao,
} from "./auth";

export type Recurso =
  | "patrimonios"
  | "ambientes"
  | "solicitacoes"
  | "cadastros"
  | "usuarios"
  | "relatorios"
  | "financeiro";

const PERMISSOES_ESCRITA: Record<Papel, Recurso[]> = {
  gestor: [
    "patrimonios",
    "ambientes",
    "solicitacoes",
    "cadastros",
    "usuarios",
    "relatorios",
    "financeiro",
  ],
  responsavel: ["patrimonios", "ambientes", "solicitacoes", "relatorios"],
  conferente: ["solicitacoes"],
};

interface AuthContextValue {
  usuario: UsuarioSessao | null;
  organizacao: OrganizacaoSessao | null;
  papel: Papel | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  podeEscrever: (recurso: Recurso) => boolean;
}

const AuthContext = createContext<AuthContextValue>({
  usuario: null,
  organizacao: null,
  papel: null,
  carregando: false,
  login: async () => {},
  logout: () => {},
  podeEscrever: () => true, // sem provider (testes), mantém UI otimista; API é quem autoriza
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(null);
  const [organizacao, setOrganizacao] = useState<OrganizacaoSessao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setUsuario(getToken() ? getUsuario() : null);
    setOrganizacao(getToken() ? getOrganizacao() : null);
    setCarregando(false);
  }, []);

  const login = useCallback(
    async (email: string, senha: string) => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Falha ao entrar");
      }

      setSession(data.token, data.usuario, data.organizacao);
      setUsuario(data.usuario);
      setOrganizacao(data.organizacao ?? null);
      router.push("/");
      router.refresh();
    },
    [router]
  );

  const logout = useCallback(() => {
    clearSession();
    setUsuario(null);
    setOrganizacao(null);
    router.push("/login");
  }, [router]);

  const podeEscrever = useCallback(
    (recurso: Recurso) => {
      if (!usuario) return true; // otimista; a API aplica a regra real
      return PERMISSOES_ESCRITA[usuario.papel]?.includes(recurso) ?? false;
    },
    [usuario]
  );

  return (
    <AuthContext.Provider
      value={{ usuario, organizacao, papel: usuario?.papel ?? null, carregando, login, logout, podeEscrever }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
