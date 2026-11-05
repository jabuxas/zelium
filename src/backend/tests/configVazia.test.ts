/**
 * docker-compose repassa "" quando a variável não está no .env. Variável
 * vazia precisa significar "padrão", não "valor vazio".
 */
const SALVO = { ...process.env };

afterEach(() => {
  process.env = { ...SALVO };
  jest.resetModules();
});

function carregar<T>(modulo: string, env: Record<string, string>): T {
  process.env = { ...SALVO, ...env };
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(modulo) as T;
}

describe('Variáveis vazias usam o padrão', () => {
  it('SMTP_FROM e SMTP_PORT vazios', () => {
    const { mailConfig } = carregar<typeof import('../src/config/mail')>('../src/config/mail', {
      SMTP_FROM: '', SMTP_PORT: '',
    });
    expect(mailConfig.from).toBe('Zelium <no-reply@zelium.local>');
    expect(mailConfig.port).toBe(587);
  });

  it('SMTP_FROM e SMTP_PORT informados são respeitados', () => {
    const { mailConfig } = carregar<typeof import('../src/config/mail')>('../src/config/mail', {
      SMTP_FROM: 'Zelium <a@b.test>', SMTP_PORT: '465',
    });
    expect(mailConfig.from).toBe('Zelium <a@b.test>');
    expect(mailConfig.port).toBe(465);
  });

  it('JWT_EXPIRES_IN vazio', () => {
    const { JWT_EXPIRES_IN } = carregar<typeof import('../src/config/auth')>('../src/config/auth', {
      JWT_EXPIRES_IN: '', JWT_SECRET: 'segredo-de-teste',
    });
    expect(JWT_EXPIRES_IN).toBe('7d');
  });
});
