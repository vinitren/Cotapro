/**
 * Script para recortar a logo do Login removendo margens transparentes.
 * Usa sharp para trim e gera versão cropped.
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const brandDir = join(__dirname, '..', 'public', 'brand');
const inputPath = join(brandDir, 'Cota pro logo branca completa png.png');
const outputPath = join(brandDir, 'cotapro-logo-branca-login.png');

async function main() {
  const inputBuffer = readFileSync(inputPath);
  const image = sharp(inputBuffer);

  // trim() remove pixels "boring" (incluindo transparentes) das bordas
  const { data, info } = await image
    .trim({ threshold: 1 })
    .png()
    .toBuffer({ resolveWithObject: true });

  writeFileSync(outputPath, data);
  console.log(`Logo cropped salva em: ${outputPath}`);
  console.log(`Dimensões: ${info.width}x${info.height}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
