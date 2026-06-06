/**
 * Simulation: the nested-reality revelation arc. Beats are gated by era + the
 * Timeline's divergence, fire in order, personalize from the run, and the
 * journal layer-map de-redacts as understanding (depth) grows.
 */
import assert from 'node:assert';
import { Simulation, REVELATIONS, LAYERS } from '../src/systems/Simulation.js';
import { DIVERGENCE } from '../src/systems/Timeline.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

// --- nothing reveals before its gates ---
{
  const sim = new Simulation();
  // Era 0, no divergence: only the era-0 beat is eligible.
  const first = sim.update({ eraOrder: 0, divergence: 0, seed: 42 });
  assert.ok(first && first.id === 'late_frame', 'the first beat lands in the opening era');
  assert.strictEqual(sim.depth, 1, 'understanding deepens to layer 1');
  // The seed beat needs era 2 + visible divergence; not yet.
  assert.strictEqual(sim.update({ eraOrder: 0, divergence: 0, seed: 42 }), null,
    'no deeper beat without reaching its era/divergence gates');
  ok('revelations stay hidden until their era + divergence gates are met');
}

// --- beats personalize from the actual run (world seed, branch count) ---
{
  const sim = new Simulation({ seen: ['late_frame', 'a_scorer'], depth: 1 });
  const seedBeat = sim.update({ eraOrder: 2, divergence: DIVERGENCE.VISIBLE, seed: 1337 });
  assert.ok(seedBeat && seedBeat.id === 'the_seed', 'the seed beat unlocks at era 2 + visible divergence');
  assert.ok(seedBeat.text.includes('1337'), 'the beat is personalized with the world seed');
  assert.strictEqual(sim.depth, 2, 'depth advances to the garden layer');
  ok('revelations are written from the player\'s real run');
}

// --- the branches beat reflects how many branches the player spawned ---
{
  const sim = new Simulation({ seen: ['late_frame', 'a_scorer', 'the_seed'], depth: 2 });
  const beat = sim.update({ eraOrder: 3, divergence: DIVERGENCE.GLITCH, branches: 4, seed: 7 });
  assert.ok(beat && beat.id === 'the_branches', 'the branches beat lands at iron-age + glitch divergence');
  assert.ok(/\b4 branches\b/.test(beat.text), 'it cites the actual branch count');
  ok('the nested-branches beat reflects the run\'s timeline');
}

// --- the capstone needs the deepest gates and reports the stack depth ---
{
  const sim = new Simulation({ seen: REVELATIONS.filter((r) => r.id !== 'the_stack').map((r) => r.id), depth: 3 });
  // Not enough: rift divergence but no crossover.
  assert.strictEqual(sim.update({ eraOrder: 4, divergence: DIVERGENCE.RIFT, crossovers: 0, seed: 1 }), null,
    'the Stack stays hidden without a crossover');
  const cap = sim.update({ eraOrder: 4, divergence: DIVERGENCE.RIFT, crossovers: 1, seed: 1 });
  assert.ok(cap && cap.id === 'the_stack', 'the Stack reveals at rift divergence after a crossover');
  assert.ok(/\d+ layers/.test(cap.text), 'the capstone reports the recorded depth');
  assert.strictEqual(sim.depth, 4, 'the player reaches the deepest understood layer');
  ok('the capstone only reveals after the deepest investigation');
}

// --- the journal layer-map de-redacts with depth ---
{
  const sim = new Simulation({ depth: 2 });
  const layers = sim.layers();
  assert.strictEqual(layers.length, LAYERS.length, 'all layers are represented');
  assert.ok(layers[0].revealed && layers[2].revealed, 'understood layers are revealed');
  assert.ok(!layers[3].revealed, 'deeper layers stay hidden');
  assert.ok(layers[3].edge, 'the next layer down is flagged as the redacted lure');
  ok('the nested-reality map reveals exactly as far as the player understands');
}

// --- serialize / restore round-trips the arc ---
{
  const sim = new Simulation();
  sim.update({ eraOrder: 1, divergence: 0, seed: 9 });
  const restored = new Simulation(sim.serialize());
  assert.strictEqual(restored.depth, sim.depth, 'depth round-trips');
  assert.deepStrictEqual([...restored.seen], [...sim.seen], 'seen beats round-trip');
  ok('simulation arc state serializes and restores');
}

console.log(`\nAll ${passed} simulation checks passed.`);
