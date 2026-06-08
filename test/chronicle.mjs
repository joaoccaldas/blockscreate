/**
 * Chronicle: where/when the player is, and whether this is the prime history of
 * the world or an alternate one they forked into.
 */
import assert from 'node:assert';
import { chronicleOf, isAlternate } from '../src/systems/Chronicle.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

function stub(over = {}) {
  return { eraId: 'cell', realityPath: [], world: { variant: null }, cellStatus: { stageName: 'a protocell' }, objectives: { stageProgress: () => ({ label: 'Awakening' }) }, ...over };
}

// --- prime spine runs read as the prime timeline ---
{
  const c = chronicleOf(stub({ eraId: 'stone', realityPath: [{ from: 'cell', to: 'stone', branch: null }] }));
  assert.strictEqual(c.alternate, false, 'cell→stone is the prime route');
  assert.strictEqual(c.realityLabel, 'Prime timeline', 'labelled prime');
  assert.ok(/Mesozoic/.test(c.when), 'the era has a deep-time epoch');
  assert.strictEqual(c.where, 'Age of Dinosaurs', 'where = the era name when no variant');
  ok('prime-spine runs read as the prime timeline with a real epoch');
}

// --- a branch route flags the run as an alternate timeline ---
{
  const c = chronicleOf(stub({ eraId: 'flora', realityPath: [{ from: 'cell', to: 'flora', branch: 'photic' }], objectives: { stageProgress: () => ({ label: 'Awakening' }) } }));
  assert.strictEqual(c.alternate, true, 'cell→flora diverged from the prime spine');
  assert.strictEqual(c.realityLabel, 'Alternate timeline', 'labelled alternate');
  assert.ok(/never was|forked|not taken|dream/.test(c.when), 'a branch age gets uncanny, forked time');
  ok('a branch route reads as an alternate timeline with forked time');
}

// --- being in a branch age directly (no path) is still alternate ---
{
  assert.strictEqual(isAlternate([], 'republic'), true, 'a branch era is alternate even with no recorded path');
  assert.strictEqual(isAlternate([], 'cell'), false, 'the origin is prime');
  assert.strictEqual(isAlternate([], 'industrial'), false, 'a deep spine era is prime');
  ok('alternate detection covers branch eras and the prime spine');
}

// --- the phase reflects in-era evolution (cell stages vs era stage) ---
{
  const cell = chronicleOf(stub({ cellStatus: { stageName: 'a true cell' } }));
  assert.strictEqual(cell.phase, 'true cell', 'the cell phase comes from its evolution stage');
  const iron = chronicleOf(stub({ eraId: 'iron', objectives: { stageProgress: () => ({ label: 'Evolved' }) } }));
  assert.strictEqual(iron.phase, 'Evolved', 'a later era phase comes from its stage');
  ok('the phase surfaces in-era evolution progress');
}

console.log(`\nAll ${passed} chronicle checks passed.`);
