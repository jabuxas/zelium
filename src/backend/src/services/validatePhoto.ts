import { readFile, writeFile } from 'fs/promises';
import sharp from 'sharp';
import { MAX_FILE_SIZE_BYTES } from '../config/upload';

export class InvalidPhotoError extends Error {
  constructor() { super('Imagem inválida. Envie JPEG, PNG ou WebP íntegro, com até 20 megapixels e 5 MB.'); }
}

/** Decodifica de verdade, limita expansão e remove metadados (inclusive GPS). */
export async function validatePhoto(filePath: string, declaredMime: string) {
  const input = await readFile(filePath);
  let output;
  try {
    const image = sharp(input, { limitInputPixels: 20_000_000, failOn: 'warning' });
    const metadata = await image.metadata();
    const mimes: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    if (!metadata.format || mimes[metadata.format] !== declaredMime) throw new InvalidPhotoError();
    output = await image.rotate().toBuffer({ resolveWithObject: true });
    if (output.data.length > MAX_FILE_SIZE_BYTES) throw new InvalidPhotoError();
  } catch {
    throw new InvalidPhotoError();
  }
  await writeFile(filePath, output.data);
  return { largura: output.info.width, altura: output.info.height, tamanho_bytes: output.data.length };
}
