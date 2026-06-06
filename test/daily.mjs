/**
 * Daily challenge: one shared, deterministic reality + goal per calendar day,
 * and a streak that rewards coming back.
 */
import assert from 'node:assert';
import { dailyChallenge, dateKey } from '../src/core/DailyChallenge.js';
import { ERA_NODES } from '../src/core/eraGraph.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

// --- the same day yields the same challenge for everyone ---
{
  const d = new Date(Date.UTC(2026, 5, 6));
  const a = dailyChallenge(d);
  const b = dailyChallenge(d);
  assert.strictEqual(a.seed, b.seed, 'same day → same seed');
  assert.strictEqual(a.era, b.era, 'same day → same era');
  assert.strictEqual(a.goal.text, b.goal.text, 'same day → same goal');
  assert.ok(ERA_NODES[a.era]?.implemented, 'the daily era is a real, playable era');
  ok('a day maps to one shared, deterministic, playable challenge');
}

// --- different days differ (variety) ---
{
  const keys = new Set();
  const eras = new Set();
  for (let i = 0; i < 14; i++) {
    const ch = dailyChallenge(new Date(Date.UTC(2026, 0, 1 + i)));
    keys.add(ch.seed);
    eras.add(ch.era);
  }
  assert.ok(keys.size >= 10, 'seeds vary across days');
  assert.ok(eras.size >= 2, 'the featured era rotates across days');
  ok('challenges vary day to day (seed + rotating era)');
}

// --- the cell-era daily never asks for mining/building (invalid there) ---
{
  // Scan a year; any cell-era day must use a cell-valid goal.
  for (let i = 0; i < 60; i++) {
    const ch = dailyChallenge(new Date(Date.UTC(2026, 0, 1 + i * 5)));
    if (ch.era === 'cell') {
      assert.ok(!['mine', 'build'].includes(ch.goal.id), `cell daily uses a valid goal, not ${ch.goal.id}`);
    }
  }
  ok('cell-era dailies only use goals achievable in the cell');
}

// --- goal progress + completion read from game state ---
{
  const ch = dailyChallenge(new Date(Date.UTC(2026, 5, 6)));
  const lo = { civ: { cp: 0, totalMined: 0, totalBuilt: 0 }, clues: { count: () => 0 }, eraStage: 0 };
  const hi = { civ: { cp: 9999, totalMined: 9999, totalBuilt: 9999 }, clues: { count: () => 99 }, eraStage: 9 };
  assert.ok(!ch.goal.done(lo), 'an untouched run has not met the goal');
  assert.ok(ch.goal.done(hi), 'a maxed run meets the goal');
  assert.ok(ch.goal.progress(lo) >= 0 && ch.goal.progress(hi) === 1, 'progress is a 0..1 fraction');
  ok('goal completion/progress derive from live game state');
}

// --- dateKey is stable + UTC ---
{
  assert.strictEqual(dateKey(new Date(Date.UTC(2026, 0, 9))), '2026-01-09', 'dateKey zero-pads in UTC');
  ok('the date key is a stable UTC YYYY-MM-DD');
}

// --- Progress: streak increments on consecutive days, resets after a gap ---
{
  // Re-import Progress with a stubbed localStorage so the test is isolated.
  const store = {};
  globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  const { Progress } = await import('../src/persistence/Progress.js');
  const p = new Progress();
  assert.strictEqual(p.completeDaily('2026-06-01'), 1, 'first completion → streak 1');
  assert.strictEqual(p.completeDaily('2026-06-02'), 2, 'next day → streak 2');
  assert.strictEqual(p.completeDaily('2026-06-02'), 2, 'same day again does not double-count');
  assert.strictEqual(p.completeDaily('2026-06-05'), 1, 'a gap resets the streak');
  assert.ok(p.hasDailyDone('2026-06-01') && p.hasDailyDone('2026-06-05'), 'completions are recorded');
  // round-trips through storage
  const p2 = new Progress();
  assert.ok(p2.hasDailyDone('2026-06-05'), 'daily history persists');
  assert.strictEqual(p2.streak, 1, 'streak persists');
  ok('daily streaks increment, reset on a gap, and persist');
}

console.log(`\nAll ${passed} daily-challenge checks passed.`);
