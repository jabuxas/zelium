import path from 'path';

it('permite armazenamento isolado sem usar o diretório real de uploads', () => {
  const previous = process.env.UPLOAD_ROOT;
  const isolated = path.resolve('/tmp/opencode/zelium-upload-config-test');
  process.env.UPLOAD_ROOT = isolated;
  try {
    jest.isolateModules(() => {
      const config = require('../src/config/upload');
      expect(config.UPLOAD_ROOT).toBe(isolated);
      expect(config.PATRIMONIO_FOTOS_DIR).toBe(path.join(isolated, 'patrimonios'));
    });
  } finally {
    if (previous === undefined) delete process.env.UPLOAD_ROOT;
    else process.env.UPLOAD_ROOT = previous;
  }
});
