/**
 * Segredo JWT: produção não pode subir com o segredo de desenvolvimento.
 * Fail fast na inicialização, não na primeira requisição.
 */
const SEGREDO_DEV = 'zelium-dev-secret-troque-em-producao';

function resolverSegredo(): string {
  const segredo = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production' && (!segredo || segredo === SEGREDO_DEV)) {
    throw new Error(
      'JWT_SECRET obrigatorio em producao: defina um segredo forte ' +
        '(ex.: openssl rand -base64 48). Recusar segredo padrao evita tokens forjados.',
    );
  }
  return segredo ?? SEGREDO_DEV;
}

export const JWT_SECRET = resolverSegredo();

export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";
