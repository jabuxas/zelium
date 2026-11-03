describe('Config de sessão por cookie', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  function carregar(): typeof import('../src/config/sessao') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../src/config/sessao');
  }

  it('cookie é Secure apenas em produção', () => {
    process.env.NODE_ENV = 'production';
    expect(carregar().cookieSeguro()).toBe(true);
    process.env.NODE_ENV = 'development';
    expect(carregar().cookieSeguro()).toBe(false);
  });

  it('max-age do cookie acompanha JWT_EXPIRES_IN (dias, horas, minutos, segundos)', () => {
    process.env.JWT_EXPIRES_IN = '7d';
    expect(carregar().cookieMaxAgeSegundos()).toBe(7 * 24 * 60 * 60);
    process.env.JWT_EXPIRES_IN = '12h';
    expect(carregar().cookieMaxAgeSegundos()).toBe(12 * 60 * 60);
    process.env.JWT_EXPIRES_IN = '30m';
    expect(carregar().cookieMaxAgeSegundos()).toBe(30 * 60);
    process.env.JWT_EXPIRES_IN = '90s';
    expect(carregar().cookieMaxAgeSegundos()).toBe(90);
    delete process.env.JWT_EXPIRES_IN;
    expect(carregar().cookieMaxAgeSegundos()).toBe(7 * 24 * 60 * 60);
    process.env.JWT_EXPIRES_IN = 'valor-invalido';
    expect(carregar().cookieMaxAgeSegundos()).toBe(7 * 24 * 60 * 60);
  });

  it('origens da web vêm de WEB_ORIGINS; sem ela, dev tem padrões e produção não permite nenhuma', () => {
    process.env.NODE_ENV = 'development';
    expect(carregar().origensWebPermitidas()).toEqual([
      'http://localhost:3000', 'http://localhost:3370', 'http://localhost:8170',
    ]);
    process.env.WEB_ORIGINS = ' https://zelium.test , http://localhost:3000 ,';
    expect(carregar().origensWebPermitidas()).toEqual(['https://zelium.test', 'http://localhost:3000']);
    process.env.NODE_ENV = 'production';
    delete process.env.WEB_ORIGINS;
    expect(carregar().origensWebPermitidas()).toEqual([]);
  });

  it('lê apenas o cookie de sessão do cabeçalho Cookie', () => {
    const { lerCookieSessao } = carregar();
    expect(lerCookieSessao('outro=1; zelium_sessao=abc.def_ghi; mais=2')).toBe('abc.def_ghi');
    expect(lerCookieSessao('outro=1')).toBeNull();
    expect(lerCookieSessao(undefined)).toBeNull();
    expect(lerCookieSessao('zelium_sessao=')).toBe('');
  });
});
