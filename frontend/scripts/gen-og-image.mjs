// One-time rasterizer: SVG source -> committed PNG social card.
// Run: node scripts/gen-og-image.mjs
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(here, '../public/og-card.svg'));

await sharp(svg)
  .resize(1200, 630)
  .png()
  .toFile(join(here, '../public/og-default.png'));

console.log('Wrote frontend/public/og-default.png (1200x630)');
