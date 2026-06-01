/**
 * Settler system: capacity scaling, spawn toward home, work ticks, and save
 * round-trip. Settlers are the visible "civilization" layer.
 */
import assert from 'node:assert';
import { World } from '../src/world/World.js';
import { SettlerManager } from '../src/systems/Settlers.js';
import { Civilization } from '../src/systems/Civilization.js';

let pass = 0; const ok = (m) => { console.log('  ✓ ' + m); pass++; };

const world = new World({ seed: 3, eraId: 'stone', width: 60, height: 40 });
world.generate();
const civ = new Civilization('stone');

const sm = new SettlerManager();
// No home yet → no settlers spawn.
sm.update(1, world, civ);
assert.strictEqual(sm.count(), 0, 'no settlers without a town home');
ok('no settlers until a town home exists');

// Give a home + population + housing, then let it spawn.
sm.setHome(30, world.heightMap[30]);
civ.population = 5; civ.housing = 3;
for (let i = 0; i < 20; i++) sm.update(3, world, civ); // advance past spawn timers
assert.ok(sm.count() >= 1, 'settlers spawn toward capacity');
assert.ok(sm.count() <= sm.capacity(civ), 'settlers never exceed capacity');
ok(`settlers spawn toward capacity (${sm.count()}/${sm.capacity(civ)})`);

// Capacity is gated by housing, not just population.
const sm2 = new SettlerManager();
sm2.setHome(30, world.heightMap[30]);
const poorCiv = new Civilization('stone');
poorCiv.population = 9; poorCiv.housing = 0;
assert.ok(sm2.capacity(poorCiv) <= 1, 'low housing caps settlers even with high population');
ok('housing gates settler capacity');

// Work ticks are produced over time (drive CP).
let work = 0;
for (let i = 0; i < 200; i++) work += sm.update(0.1, world, civ);
assert.ok(work > 0, 'settlers produce work ticks');
ok(`settlers produce work over time (${work} ticks)`);

// Save round-trip preserves home + settlers.
const data = sm.serialize();
const restored = new SettlerManager(data);
assert.strictEqual(restored.count(), sm.count(), 'settler count survives save');
assert.deepStrictEqual(restored.home, sm.home, 'home survives save');
ok('settlers + home round-trip through save');

console.log(`\nAll ${pass} settler checks passed.`);
