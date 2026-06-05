/**
 * Timeline: branching realities accumulate with play, events split as divergence
 * climbs, and reality "bleeds" (glitch / rift) unlock past thresholds. All
 * randomness is injected so outcomes are deterministic here.
 */
import assert from 'node:assert';
import { Timeline, DIVERGENCE } from '../src/systems/Timeline.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

// A scripted rng that returns a fixed queue, then 0.5 forever.
function scripted(values) {
  let i = 0;
  return () => (i < values.length ? values[i++] : 0.5);
}

// --- split width escalates with divergence ---
{
  const tl = new Timeline({}, () => 0.99);
  assert.strictEqual(tl.splitWidth(), 1, 'no splitting before the VISIBLE threshold');
  tl.divergence = DIVERGENCE.VISIBLE;
  assert.strictEqual(tl.splitWidth(), 2, 'events split two ways once visible');
  tl.divergence = DIVERGENCE.RIFT;
  assert.strictEqual(tl.splitWidth(), 3, 'events split three ways at rift-level divergence');
  ok('split width escalates with divergence');
}

// --- early events never diverge; they just accumulate divergence ---
{
  const tl = new Timeline({}, () => 0.99);
  const r = tl.branchEvent('meteor_shower', 'stone');
  assert.strictEqual(r.width, 1, 'width 1 while reality is stable');
  assert.strictEqual(r.variant, 0, 'prime outcome only');
  assert.strictEqual(r.diverged, false, 'no divergence flagged early');
  assert.ok(tl.divergence > 0, 'but the event still nudged divergence');
  assert.strictEqual(tl.branches.length, 1, 'the branch is logged');
  ok('early special events resolve prime but accumulate divergence');
}

// --- once visible, an event can land on an alternate branch ---
{
  // rng 0.9 → variant = floor(0.9 * 2) = 1 (an alternate branch)
  const tl = new Timeline({ divergence: DIVERGENCE.VISIBLE }, scripted([0.9]));
  const r = tl.branchEvent('drought', 'industrial');
  assert.strictEqual(r.width, 2, 'two possibilities are open');
  assert.strictEqual(r.variant, 1, 'rng selects the alternate branch');
  assert.ok(r.diverged, 'an off-prime outcome is flagged as diverged');
  assert.strictEqual(tl.divergedCount(), 1, 'diverged branches are countable');
  ok('a visible timeline can branch an event off-prime');
}

// --- no bleed below the GLITCH threshold ---
{
  const tl = new Timeline({ divergence: DIVERGENCE.GLITCH - 0.1 }, () => 0.1);
  assert.strictEqual(tl.update(1000), null, 'no reality bleed before GLITCH divergence');
  ok('reality stays intact below the glitch threshold');
}

// --- a glitch bleeds once past GLITCH, respecting the cooldown ---
{
  const tl = new Timeline({ divergence: DIVERGENCE.GLITCH + 0.1 }, scripted([0.0, 0.0]));
  const first = tl.update(1); // cooldown starts at 0 → fires
  assert.ok(first && first.kind === 'glitch', 'a glitch occurs at glitch-level divergence');
  assert.ok(first.first, 'the very first glitch is flagged');
  assert.strictEqual(tl.update(1), null, 'a long cooldown blocks back-to-back bleeds');
  assert.strictEqual(tl.crossovers, 1, 'crossovers are counted');
  ok('glitches bleed through past the threshold, gated by a cooldown');
}

// --- rifts (intentional crossovers) require RIFT-level divergence ---
{
  // update() consumes one rng for the next-window cooldown, then one for the
  // kind roll (<0.4 selects 'rift' when divergence allows it).
  const tl = new Timeline({ divergence: DIVERGENCE.RIFT + 0.5 }, scripted([0.0, 0.1]));
  const r = tl.update(1);
  assert.ok(r && r.kind === 'rift', 'a rift can occur at rift-level divergence');
  assert.ok(tl.seenRift, 'the rift is remembered');
  ok('rifts open only once divergence is high enough');
}

// --- serialize / restore round-trips the whole state ---
{
  const tl = new Timeline({ divergence: 3.2 }, scripted([0.9, 0.9]));
  tl.branchEvent('siege_raid', 'iron');
  tl.update(1);
  const restored = new Timeline(tl.serialize(), () => 0.5);
  assert.strictEqual(restored.divergence, tl.divergence, 'divergence round-trips');
  assert.strictEqual(restored.branches.length, tl.branches.length, 'branch log round-trips');
  assert.strictEqual(restored.crossovers, tl.crossovers, 'crossover count round-trips');
  assert.strictEqual(restored.seenGlitch, tl.seenGlitch, 'seen flags round-trip');
  ok('timeline state serializes and restores faithfully');
}

console.log(`\nAll ${passed} timeline checks passed.`);
