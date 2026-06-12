/**
 * Points of interest: buried treasure chambers reward exploring the deep world —
 * ruin-walled rooms with a Buried Cache that drops loot when mined.
 */
import assert from 'node:assert';
import { World } from '../src/world/World.js';
import { blockId, AIR, isSolid } from '../src/core/blocks.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

const ID = { treasure: blockId('treasure'), ruin: blockId('ruin_brick') };

function survey(eraId) {
  const w = new World({ seed: 11, eraId });
  w.generate();
  let caches = 0; let ruin = 0; const cacheCells = [];
  for (let x = 0; x < w.width; x++) {
    for (let y = 0; y < w.height; y++) {
      const v = w.get(x, y);
      if (v === ID.treasure) { caches++; cacheCells.push([x, y]); }
      else if (v === ID.ruin) ruin++;
    }
  }
  return { w, caches, ruin, cacheCells };
}

// --- non-cell worlds host buried caches inside ruin chambers ---
{
  const s = survey('iron');
  assert.ok(s.caches >= 2, 'the world hosts several buried caches to find');
  assert.ok(s.ruin > s.caches * 4, 'each cache is walled by a ruin chamber');
  ok('the deep world is seeded with buried treasure chambers');
}

// --- a cache sits in carved-out space (a findable room, not solid rock) ---
{
  const s = survey('iron');
  const [cx, cy] = s.cacheCells[0];
  // there should be air directly around/above the cache (the room)
  const airNearby = [[cx, cy - 1], [cx - 1, cy], [cx + 1, cy]].some(([x, y]) => s.w.get(x, y) === AIR);
  assert.ok(airNearby, 'a cache opens into an explorable air pocket');
  ok('caches sit inside an explorable chamber, not buried in solid rock');
}

// --- the cache block is a treasure (flagged for the loot payoff) ---
{
  const { BLOCKS } = await import('../src/core/blocks.js');
  assert.ok(BLOCKS[ID.treasure].treasure, 'the cache block carries the treasure flag');
  ok('the cache is flagged so mining it pays out loot');
}

// --- the cell era stays POI-free (its own minimal generation) ---
{
  const s = survey('cell');
  assert.strictEqual(s.caches, 0, 'the First Cell has no buried caches');
  ok('the cell era has no POIs');
}

console.log(`\nAll ${passed} points-of-interest checks passed.`);
