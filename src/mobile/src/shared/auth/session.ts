import AsyncStorage from "@react-native-async-storage/async-storage";

export type Papel = "gestor" | "responsavel" | "conferente";

export interface UsuarioSessao {
  id: number;
  email: string;
  nome: string;
  papel: Papel;
  organizacaoId: number;
}

export interface OrganizacaoSessao {
  id: number;
  nome: string;
}

const TOKEN_KEY = "zelar_token";
const USUARIO_KEY = "zelar_usuario";
const ORGANIZACAO_KEY = "zelar_organizacao";

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

export async function getOrganizacao(): Promise<OrganizacaoSessao | null> {
  try {
    const raw = await AsyncStorage.getItem(ORGANIZACAO_KEY);
    return raw ? (JSON.parse(raw) as OrganizacaoSessao) : null;
  } catch {
    return null;
  }
}

export async function saveSession(
  token: string,
  usuario: UsuarioSessao,
  organizacao?: OrganizacaoSessao,
): Promise<void> {
  const pares: [string, string][] = [
    [TOKEN_KEY, token],
    [USUARIO_KEY, JSON.stringify(usuario)],
  ];
  if (organizacao) {
    pares.push([ORGANIZACAO_KEY, JSON.stringify(organizacao)]);
  }
  await AsyncStorage.multiSet(pares);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, USUARIO_KEY, ORGANIZACAO_KEY]);
}
