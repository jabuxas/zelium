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
