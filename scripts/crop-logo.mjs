import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath = join(__dirname, '../public/brand/Cota pro logo preta completa png.png');
const outputPath = join(__dirname, '../public/brand/cotapro-logo-cropped.png');

const image = sharp(inputPath);
const metadata = await image.metadata();
const { width: origW, height: origH } = metadata;

const trimmed = await image
  .trim({ threshold: 10 })
  .png()
  .toFile(outputPath);

const meta = await sharp(outputPath).metadata();
console.log('Original:', origW, 'x', origH);
console.log('Cropped:', meta.width, 'x', meta.height);
console.log('Saved to:', outputPath);
