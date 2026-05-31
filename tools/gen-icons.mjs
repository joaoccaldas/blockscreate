/**
 * Generates the app icon / favicon set from committed code (no external tools).
 * Run: node tools/gen-icons.mjs
 *
 * Produces a simple, recognizable "stacked blocks" mark on the brand background
 * at the sizes a PWA + browsers expect.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { Pix } from './pnglib.mjs';

mkdirSync('assets/icons', { recursive: true });

const BG = [12, 16, 34, 255];       // --bg0
const GREEN = [111, 192, 78, 255];  // --accent
const BROWN = [138, 95, 56, 255];
const STONE = [125, 125, 125, 255];
const GOLD = [244, 210, 74, 255];

function icon(size) {
  const p = new Pix(size, size);
  p.rect(0, 0, size, size, BG);
  const u = size / 8; // grid unit
  const block = (gx, gy, color) => p.rect(Math.round(gx * u), Math.round(gy * u), Math.ceil(u), Math.ceil(u), color);
  // A little isometric-ish stack of blocks.
  block(2, 5, STONE); block(3, 5, STONE); block(4, 5, BROWN); block(5, 5, BROWN);
  block(2, 4, GREEN); block(3, 4, GREEN); block(4, 4, GREEN);
  block(3, 3, GOLD);
  // top highlight band on each block row for a lit look
  for (let gx = 2; gx <= 5; gx++) p.rect(Math.round(gx * u), Math.round(5 * u), Math.ceil(u), Math.max(1, Math.round(u * 0.18)), [255, 255, 255, 60]);
  return p;
}

const sizes = [32, 180, 192, 512];
for (const s of sizes) {
  const png = icon(s).toPNG();
  writeFileSync(`assets/icons/icon-${s}.png`, png);
  console.log(`  ✓ assets/icons/icon-${s}.png (${png.length} bytes)`);
}
// favicon.png at repo root for the <link rel=icon>.
writeFileSync('favicon.png', icon(32).toPNG());
console.log('  ✓ favicon.png');
console.log('\nGenerated app icons.');
