/** Nunca encaminha o token da sessão para imagens de outro servidor. */
export function privatePhotoHeaders(uri: string | undefined, token: string | null): Record<string, string> | undefined {
  const root = process.env.EXPO_PUBLIC_API_URL?.replace(/\/api\/?$/, '');
  return root && token && uri?.startsWith(`${root}/uploads/patrimonios/`)
    ? { Authorization: `Bearer ${token}` } : undefined;
}
