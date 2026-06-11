/**
 * Minimap: pure colour mapping + sampling of the world around the player.
 */
import assert from 'node:assert';
import { minimapColor, buildMinimap } from '../src/systems/Minimap.js';
import { World } from '../src/world/World.js';
import { blockId, AIR } from '../src/core/blocks.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

// --- colour mapping: air is transparent, solids get a colour, ores pop ---
{
  assert.strictEqual(minimapColor(AIR), null, 'air/sky is transparent on the map');
  assert.ok(minimapColor(blockId('stone')), 'stone has a colour');
  assert.notStrictEqual(minimapColor(blockId('magma')), null, 'magma is visible');
  // an ore uses its fleck colour so loot pops
  assert.strictEqual(minimapColor(blockId('crystal_ore')), '#b388ff', 'crystal ore shows its fleck colour');
  ok('colour mapping: sky transparent, solids coloured, ores pop with their fleck');
}

// --- sampling returns a grid centred on the player ---
{
  const w = new World({ seed: 5, eraId: 'iron' });
  w.generate();
  const px = Math.round(w.spawn.x); const py = Math.round(w.spawn.y);
  const m = buildMinimap(w, px, py, { halfW: 20, halfH: 15 });
  assert.strictEqual(m.w, 41, 'width = 2*halfW + 1');
  assert.strictEqual(m.colors.length, m.w * m.h, 'the colour grid is fully populated');
  assert.strictEqual(m.px, px - m.x0, 'the player column is centred');
  assert.ok(m.py >= 0 && m.py < m.h, 'the player row is inside the sampled box');
  // there should be both sky (null) above and ground (colour) below the player
  const hasSky = m.colors.some((c) => c === null);
  const hasGround = m.colors.some((c) => c !== null);
  assert.ok(hasSky && hasGround, 'the sample captures both sky and ground');
  ok('sampling returns a player-centred grid of sky + ground');
}

// --- sampling clamps to the world vertically (no out-of-bounds) ---
{
  const w = new World({ seed: 5, eraId: 'iron' });
  w.generate();
  const m = buildMinimap(w, 50, 5, { halfW: 10, halfH: 40 });
  assert.strictEqual(m.y0, 0, 'sampling clamps to the top of the world');
  assert.ok(m.y0 + m.h <= w.height, 'sampling never reads past the world bottom');
  ok('vertical sampling clamps to the world bounds');
}

console.log(`\nAll ${passed} minimap checks passed.`);
