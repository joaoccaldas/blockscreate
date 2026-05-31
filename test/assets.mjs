/**
 * Asset contract checks for generated runtime PNGs.
 * Run with: node test/assets.mjs
 */
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

function pngSize(path) {
  const b = readFileSync(path);
  assert.deepStrictEqual([...b.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${path} is not a PNG`);
  return {
    width: b.readUInt32BE(16),
    height: b.readUInt32BE(20),
    colorType: b[25],
  };
}

const checks = [
  ['assets/generated/sprites/player.png', 128, 32],
  ['assets/generated/sprites/cow.png', 32, 32],
  ['assets/generated/sprites/pig.png', 32, 32],
  ['assets/generated/sprites/chicken.png', 32, 32],
  ['assets/generated/sprites/goat.png', 32, 32],
  ['assets/generated/textures/blocks.png', 128, 128],
  ['assets/generated/effects/effects.png', 128, 64],
];

let passed = 0;
for (const [path, width, height] of checks) {
  const actual = pngSize(path);
  assert.strictEqual(actual.width, width, `${path} width`);
  assert.strictEqual(actual.height, height, `${path} height`);
  assert.strictEqual(actual.colorType, 6, `${path} should be RGBA`);
  console.log(`  ✓ ${path} ${width}x${height}`);
  passed++;
}

console.log(`\nAll ${passed} asset checks passed.`);

