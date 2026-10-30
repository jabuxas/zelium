describe('Config JWT (produção segura)', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  function carregarConfig(): typeof import('../src/config/auth') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../src/config/auth');
  }

  it('recusa subir em produção sem JWT_SECRET', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    expect(() => carregarConfig()).toThrow(/JWT_SECRET/);
  });

  it('recusa subir em produção com o segredo de desenvolvimento', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'zelium-dev-secret-troque-em-producao';
    expect(() => carregarConfig()).toThrow(/JWT_SECRET/);
  });

  it('aceita segredo forte em produção', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'segredo-forte-de-teste-com-64-bytes-0123456789';
    expect(() => carregarConfig()).not.toThrow();
    expect(carregarConfig().JWT_SECRET).toBe('segredo-forte-de-teste-com-64-bytes-0123456789');
  });

  it('desenvolvimento/testes usam o segredo padrão sem lançar', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.JWT_SECRET;
    expect(() => carregarConfig()).not.toThrow();
    expect(carregarConfig().JWT_SECRET).toBe('zelium-dev-secret-troque-em-producao');
  });
});
