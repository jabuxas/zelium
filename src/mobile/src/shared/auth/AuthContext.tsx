import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiBaseUrl } from "@/src/shared/config/env";
import { setAuthToken } from "@/src/shared/auth/tokenStore";
import {
  clearSession,
  getToken,
  getUsuario,
  saveSession,
  type UsuarioSessao,
} from "@/src/shared/auth/session";

interface AuthContextValue {
  usuario: UsuarioSessao | null;
  autenticado: boolean;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  usuario: null,
  autenticado: false,
  carregando: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [token, usuarioSalvo] = await Promise.all([
          getToken(),
          getUsuario(),
        ]);
        if (token && usuarioSalvo) {
          setAuthToken(token);
          setUsuario(usuarioSalvo);
        }
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, senha: string) => {
    const res = await fetch(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      token?: string;
      usuario?: UsuarioSessao;
      organizacao?: { id: number; nome: string };
      error?: string;
    };

    if (!res.ok || !data.token || !data.usuario) {
      throw new Error(data.error ?? "Email ou senha invalidos");
    }

    setAuthToken(data.token);
    await saveSession(data.token, data.usuario, data.organizacao);
    setUsuario(data.usuario);
  }, []);

  const logout = useCallback(async () => {
    setAuthToken(null);
    await clearSession();
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        autenticado: usuario !== null,
        carregando,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
