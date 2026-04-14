/**
 * Gera WebP otimizados para o mosaico em img/webp/solucoes/
 * Uso: npm i sharp && node scripts/generate-mosaic-webp.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'img', 'webp', 'solucoes');

const files = [
  'backdrops.png',
  'paineismodulares.jpg',
  'porticosimples.png',
  'gradesplasticas.png',
  'porticos.png',
  'porticosbox.png',
  'porticosboxq15.png',
  'tendas.png',
  'tendaspiramidais.png',
  'backdropcustom.png',
  'bebedourosindustriais.png',
  'gradesmetalicas.png',
];

fs.mkdirSync(outDir, { recursive: true });

for (const name of files) {
  const input = path.join(root, 'img', name);
  const base = name.replace(/\.(png|jpg|jpeg)$/i, '');
  const output = path.join(outDir, `${base}.webp`);
  if (!fs.existsSync(input)) {
    console.warn('Pulando (não encontrado):', input);
    continue;
  }
  await sharp(input)
    .resize(900, 900, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78, effort: 6 })
    .toFile(output);
  const inSt = fs.statSync(input);
  const outSt = fs.statSync(output);
  console.log(`${name} → ${base}.webp  (${(inSt.size / 1024).toFixed(0)} KB → ${(outSt.size / 1024).toFixed(0)} KB)`);
}
console.log('Concluído:', outDir);
