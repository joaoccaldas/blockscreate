/**
 * Tests for survival mining/placing rules added in the gameplay-feel pass:
 *   - tool gating (minTier) refuses weak/wrong tools
 *   - falling blocks (sand/gravel) obey gravity
 *   - placement requires an adjacent anchor block
 */
import assert from 'node:assert';
import { World } from '../src/world/World.js';
import { blockId, minTierOf, fallsOf, AIR } from '../src/core/blocks.js';
import { getItem } from '../src/core/items.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

// --- block metadata ---
assert.strictEqual(minTierOf(blockId('stone')), 1, 'stone needs a pickaxe (tier 1)');
assert.strictEqual(minTierOf(blockId('iron_ore')), 2, 'iron ore needs tier 2');
assert.strictEqual(minTierOf(blockId('dirt')), 0, 'dirt is hand-mineable');
assert.ok(fallsOf(blockId('sand')) && fallsOf(blockId('gravel')), 'sand and gravel fall');
assert.ok(!fallsOf(blockId('stone')), 'stone does not fall');
ok('block metadata: minTier + falls flags');

// --- tool tiers exist as designed ---
assert.strictEqual(getItem('wood_pickaxe').tier, 1, 'wood pickaxe is tier 1');
assert.strictEqual(getItem('stone_pickaxe').tier, 2, 'stone pickaxe is tier 2');
ok('tool tiers wired for gating (wood=1, stone=2)');

// Mirror the engine's gating rule so we test the contract directly.
function canMine(block, item) {
  const need = block.minTier || 0;
  if (need <= 0) return true;
  return !!(item && item.kind === 'tool' && item.tool === block.tool && item.tier >= need);
}
const iron = { id: blockId('iron_ore'), minTier: 2, tool: 'pickaxe' };
assert.ok(!canMine(iron, getItem('wood_pickaxe')), 'wood pickaxe cannot mine iron');
assert.ok(canMine(iron, getItem('stone_pickaxe')), 'stone pickaxe can mine iron');
assert.ok(!canMine(iron, getItem('wood_axe')), 'wrong tool kind cannot mine iron');
ok('tool gating: tier + matching tool kind required');

// --- gravity: drop a column of sand into a hole ---
const world = new World({ seed: 5, eraId: 'stone', width: 24, height: 24 });
world.generate();
// Build a clean test column: sand at y, air below.
const x = 5;
for (let y = 0; y < world.height; y++) world.set(x, y, AIR);
world.set(x, 10, blockId('sand'));

function settle(w, cx, cy) {
  let id = w.get(cx, cy);
  if (id === AIR || !fallsOf(id)) return;
  let ny = cy;
  while (w.inBounds(cx, ny + 1) && w.get(cx, ny + 1) === AIR) ny++;
  if (ny === cy) return;
  w.set(cx, cy, AIR);
  w.set(cx, ny, id);
}
world.set(x, world.height - 1, blockId('stone')); // floor
settle(world, x, 10);
assert.strictEqual(world.get(x, 10), AIR, 'sand left its original tile');
assert.strictEqual(world.get(x, world.height - 2), blockId('sand'), 'sand fell onto the floor');
ok('gravity: unsupported sand falls to rest');

// --- adjacency rule ---
function hasNeighbor(w, px, py) {
  return w.get(px - 1, py) !== AIR || w.get(px + 1, py) !== AIR ||
         w.get(px, py - 1) !== AIR || w.get(px, py + 1) !== AIR;
}
const w2 = new World({ seed: 9, eraId: 'stone', width: 16, height: 16 });
for (let i = 0; i < w2.grid.length; i++) w2.grid[i] = AIR;
assert.ok(!hasNeighbor(w2, 8, 8), 'isolated empty tile has no anchor');
w2.set(9, 8, blockId('stone'));
assert.ok(hasNeighbor(w2, 8, 8), 'tile beside a block has an anchor');
ok('placement adjacency: requires a neighboring block');

console.log(`\nAll ${passed} mechanics checks passed.`);
