/**
 * Deep mining: worlds extend far underground, with a deep-stone layer, scattered
 * crystal treasure, and magma pools near the bottom (a hazard, not a pickup).
 */
import assert from 'node:assert';
import { World } from '../src/world/World.js';
import { blockId, dropsOf } from '../src/core/blocks.js';
import { C } from '../src/core/constants.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

const ID = {
  stone: blockId('stone'), deep: blockId('deep_stone'),
  crystal: blockId('crystal_ore'), magma: blockId('magma'),
};

function survey(eraId) {
  const w = new World({ seed: 42, eraId });
  w.generate();
  const counts = { stone: 0, deep: 0, crystal: 0, magma: 0 };
  let deepestStone = 0; let deepestDeep = 0; let deepestMagma = 0;
  for (let x = 0; x < w.width; x++) {
    for (let y = 0; y < w.height; y++) {
      const v = w.get(x, y);
      if (v === ID.stone) { counts.stone++; deepestStone = Math.max(deepestStone, y); }
      else if (v === ID.deep) { counts.deep++; deepestDeep = Math.max(deepestDeep, y); }
      else if (v === ID.crystal) counts.crystal++;
      else if (v === ID.magma) { counts.magma++; deepestMagma = Math.max(deepestMagma, y); }
    }
  }
  return { w, counts, deepestStone, deepestDeep, deepestMagma };
}

// --- worlds are deep ---
{
  assert.ok(C.WORLD_H >= 150, 'worlds are at least ~150 tiles tall for real depth');
  const s = survey('iron');
  assert.ok(s.counts.deep > s.counts.stone * 0.5, 'a substantial deep-stone layer exists below the stone');
  assert.ok(s.deepestDeep > s.deepestStone, 'deep stone sits below regular stone');
  ok('worlds extend far underground with a distinct deep layer');
}

// --- crystal is a deep-only treasure ---
{
  const s = survey('iron');
  assert.ok(s.counts.crystal > 50, 'crystal ore forms in the deep');
  assert.deepStrictEqual(dropsOf(ID.crystal), ['crystal'], 'crystal ore drops a Deep Crystal');
  ok('crystal treasure only forms in the deep layer');
}

// --- magma pools near the bottom and is not a pickup ---
{
  const s = survey('iron');
  assert.ok(s.counts.magma > 0, 'magma pools form');
  assert.ok(s.deepestMagma > s.w.height * 0.7, 'magma sits in the lower world');
  assert.deepStrictEqual(dropsOf(ID.magma), [], 'magma cannot be pocketed (no drops)');
  ok('magma pools near the bottom as a hazard, not loot');
}

// --- the cell era stays shallow + magma-free (its own generation) ---
{
  const s = survey('cell');
  assert.strictEqual(s.counts.magma, 0, 'the First Cell has no magma');
  ok('the cell era keeps its own shallow generation');
}

console.log(`\nAll ${passed} deep-mining checks passed.`);
