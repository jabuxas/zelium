import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

const previous = process.env.UPLOAD_ROOT;
export const testUploadRoot = mkdtempSync(path.join(tmpdir(), 'zelium-test-uploads-'));
process.env.UPLOAD_ROOT = testUploadRoot;

afterAll(() => {
  // Só remove o diretório exclusivo que este módulo acabou de criar.
  rmSync(testUploadRoot, { recursive: true, force: true });
  if (previous === undefined) delete process.env.UPLOAD_ROOT;
  else process.env.UPLOAD_ROOT = previous;
});
