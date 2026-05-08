import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WIDTH = 1200;
const HEIGHT = 630;
const logoPath = join(__dirname, '..', 'img', 'logo-nova-2.png');
const outPath = join(__dirname, '..', '..', 'public', 'og-image.jpg');

const logo = sharp(logoPath);
const meta = await logo.metadata();
const maxW = WIDTH - 160;
const maxH = HEIGHT - 160;
const scale = Math.min(maxW / meta.width, maxH / meta.height);
const newW = Math.round(meta.width * scale);
const newH = Math.round(meta.height * scale);

const resized = await sharp(logoPath).resize(newW, newH).png().toBuffer();
const left = Math.round((WIDTH - newW) / 2);
const top = Math.round((HEIGHT - newH) / 2);

await sharp({
  create: {
    width: WIDTH,
    height: HEIGHT,
    channels: 3,
    background: { r: 0, g: 0, b: 0 },
  },
})
  .composite([{ input: resized, left, top }])
  .jpeg({ quality: 92, mozjpeg: true })
  .toFile(outPath);

const info = await sharp(outPath).metadata();
console.log(`og-image.jpg → ${outPath} (${info.width}×${info.height})`);
