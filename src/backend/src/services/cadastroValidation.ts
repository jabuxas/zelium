export interface PedidoCadastro {
  nome: string;
  email: string;
  organizacaoNome: string;
}

function objetoEstrito(value: unknown, campos: string[]): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === campos.length
    && Object.keys(value).every(campo => campos.includes(campo));
}

function texto(value: unknown, maximo: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maximo
    && !/[\u0000-\u001f\u007f]/.test(value);
}

export function validarPedidoCadastro(value: unknown): PedidoCadastro | null {
  if (!objetoEstrito(value, ['nome', 'email', 'organizacaoNome'])) return null;
  if (!texto(value.nome, 100) || !texto(value.organizacaoNome, 150) || !texto(value.email, 100)) return null;
  const email = value.email.trim().toLowerCase();
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/i.test(email)) return null;
  return { nome: value.nome.trim(), email, organizacaoNome: value.organizacaoNome.trim() };
}

export function validarConfirmacao(value: unknown): { token: string; senha: string } | null {
  if (!objetoEstrito(value, ['token', 'senha']) || typeof value.token !== 'string'
    || !/^[a-f0-9]{64}$/.test(value.token) || typeof value.senha !== 'string'
    || value.senha.length < 12 || Buffer.byteLength(value.senha, 'utf8') > 72
    || !value.senha.trim()) return null;
  return { token: value.token, senha: value.senha };
}

export function validarPedidoRecuperacao(value: unknown): { email: string } | null {
  if (!objetoEstrito(value, ['email']) || !texto(value.email, 100)) return null;
  const email = value.email.trim().toLowerCase();
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/i.test(email)) return null;
  return { email };
}
