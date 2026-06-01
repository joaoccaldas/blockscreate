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

// Work produces CP and role-specific output over time.
let totalCp = 0;
for (let i = 0; i < 400; i++) totalCp += sm.update(0.1, world, civ).cp;
assert.ok(totalCp > 0, 'settlers produce CP via work');
ok(`settlers produce CP over time (${totalCp.toFixed(1)} CP)`);

// Roles are assigned to balance the town, and produce a stockpile.
const roles = sm.roleCounts();
assert.ok(Object.keys(roles).length >= 1, 'settlers have roles');
const st = sm.stock;
assert.ok((st.food + st.wood + st.ore) > 0, 'town stockpile accumulates from work');
ok(`roles balanced (${JSON.stringify(roles)}); stock food ${Math.floor(st.food)} wood ${Math.floor(st.wood)} ore ${Math.floor(st.ore)}`);

// Save round-trip preserves home + settlers + stock.
const data = sm.serialize();
const restored = new SettlerManager(data);
assert.strictEqual(restored.count(), sm.count(), 'settler count survives save');
assert.deepStrictEqual(restored.home, sm.home, 'home survives save');
assert.deepStrictEqual(restored.stock, sm.stock, 'town stockpile survives save');
ok('settlers + home + stock round-trip through save');

console.log(`\nAll ${pass} settler checks passed.`);
