import type { UsuarioPapel } from '../../src/models/Usuario';

/** Hash da senha de teste (não é credencial de ambiente real). */
const SENHA_HASH_FIXA = '$2b$10$cbRZLPMpC5p2.q1EsYT38.eCQTlTCsonhEMvOGAsNkoCnKRrQpJ82';

/**
 * Usuários reais para os tokens fabricados por helpers/request.ts.
 *
 * O middleware de autenticação revalida usuário e organização a cada
 * requisição (sessões revogáveis), então as suítes precisam de registros que
 * existam de verdade. IDs fixos (1 gestor, 2 responsável, 3 conferente)
 * casam com bearerToken(papel, subject) e com o contexto organizacaoId 1.
 *
 * Idempotente: findOrCreate preserva suítes que criam seus próprios dados.
 * Import lazy: as suítes reconfiguram a conexão antes de importar o app.
 */
export async function criarUsuariosDeTeste(): Promise<void> {
  const { Organizacao } = await import('../../src/models/Organizacao');
  const { Usuario } = await import('../../src/models/Usuario');

  await Organizacao.findOrCreate({
    where: { id: 1 },
    defaults: { id: 1, nome: 'Org Testes', slug: 'org-testes' },
  });

  const usuarios: Array<{ id: number; nome: string; email: string; papel: UsuarioPapel }> = [
    { id: 1, nome: 'Teste Gestor', email: 'gestor@teste.zelium.com', papel: 'gestor' },
    { id: 2, nome: 'Teste Responsavel', email: 'responsavel@teste.zelium.com', papel: 'responsavel' },
    { id: 3, nome: 'Teste Conferente', email: 'conferente@teste.zelium.com', papel: 'conferente' },
  ];
  for (const usuario of usuarios) {
    await Usuario.findOrCreate({
      where: { id: usuario.id },
      defaults: { ...usuario, ativo: true, senha_hash: SENHA_HASH_FIXA, organizacao_id: 1 },
    });
  }
}
