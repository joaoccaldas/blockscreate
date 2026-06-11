/**
 * New Game+ / prestige: descending a layer banks a permanent, compounding legacy
 * (CP/mining multipliers + a token head-start) and persists across sessions.
 */
import assert from 'node:assert';

const store = {};
globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
const { Progress } = await import('../src/persistence/Progress.js');
const { Civilization } = await import('../src/systems/Civilization.js');

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

// --- descents accumulate and grant a compounding, capped legacy ---
{
  const p = new Progress();
  assert.strictEqual(p.descents, 0, 'a new player has not descended');
  assert.strictEqual(p.prestige().layer, 0, 'no legacy at layer 0');
  assert.strictEqual(p.prestige().cpMult, 1, 'no CP bonus at layer 0');
  assert.strictEqual(p.descend(), 1, 'descending returns the new layer');
  const pr = p.prestige();
  assert.ok(pr.cpMult > 1 && pr.startTokens > 0 && pr.miningMult > 1, 'layer 1 grants real bonuses');
  // compounding but capped
  for (let i = 0; i < 50; i++) p.descend();
  assert.ok(p.prestige().cpMult <= 2.5 + 1e-9, 'CP multiplier is capped');
  assert.ok(p.prestige().startTokens <= 300, 'token head-start is capped');
  ok('descents grant a compounding, capped legacy');
}

// --- the legacy persists across sessions ---
{
  const store2 = {};
  globalThis.localStorage = { getItem: (k) => (k in store2 ? store2[k] : null), setItem: (k, v) => { store2[k] = String(v); }, removeItem: (k) => { delete store2[k]; } };
  const a = new Progress();
  a.descend(); a.descend();
  const b = new Progress(); // reloads from storage
  assert.strictEqual(b.descents, 2, 'descent count persists across sessions');
  assert.ok(b.prestige().cpMult > 1, 'the legacy bonus persists');
  ok('the prestige legacy persists across sessions');
}

// --- the CP multiplier actually boosts civ CP gains ---
{
  const plain = new Civilization('cell');
  plain.addCP(100);
  const boosted = new Civilization('cell');
  boosted.cpMult = 1.5;
  boosted.addCP(100);
  assert.ok(boosted.cp > plain.cp, 'a prestige cpMult boosts CP gains');
  assert.strictEqual(Math.round(boosted.cp), 150, 'the multiplier is applied exactly');
  // and it round-trips through the save
  const restored = new Civilization('cell');
  restored.load(boosted.serialize());
  assert.strictEqual(restored.cpMult, 1.5, 'cpMult survives serialize/load');
  ok('the prestige CP multiplier boosts gains and persists in the save');
}

console.log(`\nAll ${passed} prestige checks passed.`);
