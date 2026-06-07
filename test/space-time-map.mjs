/**
 * Map of Space & Time: reveals where you've walked + immediate ages, fogs the
 * rest, redacts future/branch ages as ???, and only leaks the meta-layer once
 * reality has bent.
 */
import assert from 'node:assert';
import { buildMapModel } from '../src/systems/SpaceTimeMap.js';
import { DIVERGENCE } from '../src/systems/Timeline.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

function stub(over = {}) {
  return {
    eraId: 'cell',
    realityPath: [],
    unlocked: { isUnlocked: (id) => id === 'cell' },
    timeline: { divergence: 0, divergedCount: () => 0, crossovers: 0 },
    simulation: { layers: () => [] },
    ...over,
  };
}

const node = (model, id) => model.tiers.flatMap((t) => t.nodes).find((n) => n.id === id);

// --- a brand-new cell run: see yourself, the next age, and a fogged branch ---
{
  const m = buildMapModel(stub());
  const cell = node(m, 'cell');
  assert.strictEqual(cell.state, 'current', 'the cell is the current node');
  const stone = node(m, 'stone');
  assert.ok(stone && stone.state === 'known' && stone.label !== '???', 'the next implemented age is revealed as known');
  const flora = node(m, 'flora');
  assert.ok(flora && flora.state === 'known' && flora.label !== '???', 'the built Flora branch is reachable + named from the cell');
  assert.strictEqual(node(m, 'industrial'), undefined, 'far ages are fogged out entirely');
  assert.strictEqual(m.agesWalked, 1, 'one age walked so far');
  assert.strictEqual(m.leakage, null, 'no meta-leakage before reality bends');
  ok('a fresh first era shows you, your next age, and a redacted branch');
}

// --- after walking cell → stone, the path is recorded and revealed ---
{
  const m = buildMapModel(stub({ eraId: 'stone', realityPath: [{ from: 'cell', to: 'stone', branch: null }], unlocked: { isUnlocked: (id) => ['cell', 'stone'].includes(id) } }));
  assert.strictEqual(node(m, 'cell').state, 'visited', 'the cell is now visited');
  assert.strictEqual(node(m, 'stone').state, 'current', 'stone is current');
  const taken = m.edges.find((e) => e.from === 'cell' && e.to === 'stone');
  assert.ok(taken && taken.taken, 'the walked route is flagged as taken');
  assert.ok(m.agesWalked >= 2, 'two ages walked');
  ok('the walked route is recorded and revealed on the map');
}

// --- implemented next ages (spine + built branches) are named; unbuilt stay ??? ---
{
  const m = buildMapModel(stub({ eraId: 'iron', unlocked: { isUnlocked: (id) => ['cell', 'stone', 'bronze', 'iron'].includes(id) } }));
  const industrial = node(m, 'industrial');
  assert.ok(industrial && industrial.state === 'known' && industrial.label !== '???', 'the implemented spine next age is named');
  const republic = node(m, 'republic');
  assert.ok(republic && republic.state === 'known' && republic.label !== '???', 'the now-built Trade Republic branch is named when reachable');
  ok('implemented next ages (spine + built branches) are revealed by name');
}

// --- a still-unbuilt branch remains redacted (mystery preserved) ---
{
  // At the Industrial Age, the unbuilt Steam Arcanum branch should be a redacted lure.
  const m = buildMapModel(stub({ eraId: 'industrial', unlocked: { isUnlocked: (id) => ['cell', 'stone', 'bronze', 'iron', 'industrial'].includes(id) } }));
  const arcanum = node(m, 'arcanum');
  assert.ok(arcanum && arcanum.state === 'rumored' && arcanum.label === '???', 'the unbuilt Steam Arcanum branch stays redacted');
  ok('unbuilt branch ages stay ??? until they ship');
}

// --- the meta "leakage" layer only appears once divergence is visible ---
{
  const m = buildMapModel(stub({
    timeline: { divergence: DIVERGENCE.VISIBLE, divergedCount: () => 2, crossovers: 1 },
    simulation: { layers: () => [{ label: 'This World', note: 'x', revealed: true }, { label: 'The Render', note: 'y', revealed: false, edge: true }] },
  }));
  assert.ok(m.leakage, 'leakage appears at/above the visible divergence threshold');
  assert.strictEqual(m.leakage.branches, 2, 'it reports branches');
  assert.strictEqual(m.leakage.crossovers, 1, 'it reports crossovers');
  assert.strictEqual(m.leakage.layers[0].label, 'This World', 'revealed layers are named');
  assert.strictEqual(m.leakage.layers[1].label, '???', 'the next layer down is redacted');
  ok('the meta-layer leaks only after reality bends, and stays partly redacted');
}

// --- tiers are ordered by time (depth) ---
{
  const m = buildMapModel(stub({ eraId: 'bronze', unlocked: { isUnlocked: (id) => ['cell', 'stone', 'bronze'].includes(id) } }));
  const tierNums = m.tiers.map((t) => t.tier);
  assert.deepStrictEqual(tierNums, [...tierNums].sort((a, b) => a - b), 'tiers ascend by age');
  ok('the map is ordered along the time axis');
}

console.log(`\nAll ${passed} space-time-map checks passed.`);
