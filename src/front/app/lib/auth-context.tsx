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
  getToken,
  getUsuario,
  setSession,
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
  papel: Papel | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  podeEscrever: (recurso: Recurso) => boolean;
}

const AuthContext = createContext<AuthContextValue>({
  usuario: null,
  papel: null,
  carregando: false,
  login: async () => {},
  logout: () => {},
  podeEscrever: () => true, // sem provider (testes), mantém UI otimista; API é quem autoriza
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setUsuario(getToken() ? getUsuario() : null);
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

      setSession(data.token, data.usuario);
      setUsuario(data.usuario);
      router.push("/");
      router.refresh();
    },
    [router]
  );

  const logout = useCallback(() => {
    clearSession();
    setUsuario(null);
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
      value={{ usuario, papel: usuario?.papel ?? null, carregando, login, logout, podeEscrever }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
