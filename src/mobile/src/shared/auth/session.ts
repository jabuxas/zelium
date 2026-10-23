import AsyncStorage from "@react-native-async-storage/async-storage";

export type Papel = "gestor" | "responsavel" | "conferente";

export interface UsuarioSessao {
  id: number;
  email: string;
  nome: string;
  papel: Papel;
}

const TOKEN_KEY = "zelar_token";
const USUARIO_KEY = "zelar_usuario";

export async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getUsuario(): Promise<UsuarioSessao | null> {
  try {
    const raw = await AsyncStorage.getItem(USUARIO_KEY);
    return raw ? (JSON.parse(raw) as UsuarioSessao) : null;
  } catch {
    return null;
  }
}

export async function saveSession(
  token: string,
  usuario: UsuarioSessao,
): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USUARIO_KEY, JSON.stringify(usuario)],
  ]);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, USUARIO_KEY]);
}
