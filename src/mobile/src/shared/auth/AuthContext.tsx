import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiBaseUrl } from "@/src/shared/config/env";
import { onSessionExpired, setAuthToken } from "@/src/shared/auth/tokenStore";
import { PermissionProvider } from './permissions';
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
  erroSessao: string | null;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  usuario: null,
  autenticado: false,
  carregando: true,
  erroSessao: null,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroSessao, setErroSessao] = useState<string | null>(null);
  const revision = useRef(0);
  const storageQueue = useRef(Promise.resolve());

  // Serializa a persistência para uma gravação antiga não ressuscitar após logout.
  const persistir = useCallback((operation: number, action: () => Promise<void>) => {
    const task = storageQueue.current.catch(() => {}).then(async () => {
      if (revision.current === operation) await action();
    });
    storageQueue.current = task;
    return task;
  }, []);

  const encerrar = useCallback(async (mensagem: string | null = null) => {
    const operation = ++revision.current;
    setAuthToken(null);
    setUsuario(null);
    setCarregando(false);
    setErroSessao(mensagem);
    try {
      await persistir(operation, clearSession);
    } catch {
      if (revision.current === operation) setErroSessao('Sessão encerrada neste app, mas não foi possível apagar os dados salvos. Tente limpar a sessão novamente.');
    }
  }, [persistir]);

  useEffect(() => onSessionExpired(() => { void encerrar('Sua sessão expirou. Entre novamente.'); }), [encerrar]);

  useEffect(() => {
    let active = true;
    const operation = revision.current;
    (async () => {
      try {
        const [token, usuarioSalvo] = await Promise.all([
          getToken(),
          getUsuario(),
        ]);
        if (token && usuarioSalvo) {
          const res = await fetch(`${apiBaseUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
          if (!active || revision.current !== operation) return;
          if (!res.ok) {
            await persistir(operation, clearSession);
            throw new Error('Não foi possível validar a sessão salva. Entre novamente.');
          }
          if (active && revision.current === operation) {
            setAuthToken(token);
            setUsuario(usuarioSalvo);
          }
        }
      } catch {
        if (active && revision.current === operation) setErroSessao('Não foi possível validar a sessão salva. Entre novamente.');
      } finally {
        if (active && revision.current === operation) setCarregando(false);
      }
    })();
    return () => { active = false; };
  }, [persistir]);

  const login = useCallback(async (email: string, senha: string) => {
    const operation = ++revision.current;
    setErroSessao(null);
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

    if (revision.current !== operation) return;
    await persistir(operation, () => saveSession(data.token!, data.usuario!, data.organizacao));
    if (revision.current !== operation) return;
    setAuthToken(data.token);
    setUsuario(data.usuario);
    setCarregando(false);
  }, [persistir]);

  const logout = useCallback(async () => {
    await encerrar();
  }, [encerrar]);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        autenticado: usuario !== null,
        carregando,
        erroSessao,
        login,
        logout,
      }}
    >
      <PermissionProvider papel={usuario?.papel ?? null}>{children}</PermissionProvider>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
