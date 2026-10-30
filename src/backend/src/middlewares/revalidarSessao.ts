import { Organizacao } from "../models/Organizacao";
import { Usuario } from "../models/Usuario";

/**
 * Revalida a sessão a cada requisição: usuário existente e ativo, com
 * organização ativa. Retorna null quando qualquer condição falha (o token
 * morre com 401). A comparação da versão de sessão (payload.ver) fica no
 * middleware — aqui só o estado persistido.
 *
 * Cobertura real: tests/sessao.test.ts e as suítes de integração. Suítes
 * unitárias com services mockados (sem banco) simulam esta função como
 * válida via jest.mock — boundary de teste, não exceção de produção.
 */
export async function revalidarSessao(sub: string): Promise<Usuario | null> {
  const usuario = await Usuario.unscoped().findByPk(Number(sub));
  if (!usuario || !usuario.ativo) return null;
  const organizacao = await Organizacao.unscoped().findByPk(usuario.organizacao_id);
  if (!organizacao || !organizacao.ativo) return null;
  return usuario;
}
