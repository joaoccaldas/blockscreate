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

// Builders visibly grow the village: place planks near home, but bounded
// (capped footprint + height) so they don't build infinite pillars.
import { Settler } from '../src/systems/Settlers.js';
import { AIR, blockId } from '../src/core/blocks.js';
const plank = blockId('planks');
const builder = new Settler(sm.home.x + 0.5, world.heightMap[sm.home.x], 'builder');
sm.stock.wood = 999;
const planksBefore = world.grid.reduce((n, v) => n + (v === plank ? 1 : 0), 0);
let built = 0;
for (let i = 0; i < 600; i++) { if (sm._buildNearHome(world, builder)) built++; builder.x = sm.home.x + 0.5; }
const planksAfter = world.grid.reduce((n, v) => n + (v === plank ? 1 : 0), 0);
assert.ok(built > 0, 'builders place village blocks');
assert.ok(built < 600, 'town building is bounded (no infinite pillars)');
assert.strictEqual(planksAfter - planksBefore, built, 'placements match world changes');
ok(`builders grow a bounded village (${built} blocks placed)`);

// Save round-trip preserves home + settlers + stock.
const data = sm.serialize();
const restored = new SettlerManager(data);
assert.strictEqual(restored.count(), sm.count(), 'settler count survives save');
assert.deepStrictEqual(restored.home, sm.home, 'home survives save');
assert.deepStrictEqual(restored.stock, sm.stock, 'town stockpile survives save');
ok('settlers + home + stock round-trip through save');

// Gatherers physically seek and harvest a nearby resource block, depositing
// to the town stock (visible "settlers work the world" loop).
const gw = new World({ seed: 21, eraId: 'stone', width: 60, height: 40 });
gw.generate();
const gsm = new SettlerManager();
const ghx = 30, ghy = gw.heightMap[30];
gsm.setHome(ghx, ghy);
const logId = blockId('log');
gw.set(ghx + 3, gw.heightMap[ghx + 3] - 1, logId);
gsm.settlers.push(new Settler(ghx + 0.5, ghy, 'gatherer'));
const bigCiv = { population: 12, housing: 10 }; // keep capacity above our gatherer
let gotWood = false;
for (let i = 0; i < 800; i++) { if (gsm.update(0.05, gw, bigCiv).produced.wood) { gotWood = true; break; } }
assert.ok(gotWood, 'gatherer harvested wood from the world');
ok('gatherers seek + harvest resources into town stock');

// Farmers physically tend and harvest crop blocks into the town stock.
const fw = new World({ seed: 31, eraId: 'bronze', width: 60, height: 40 });
fw.generate();
const fsm = new SettlerManager();
const fhx = 30, fhy = fw.heightMap[30];
fsm.setHome(fhx, fhy);
const plot = blockId('farm_plot');
const seedling = blockId('wheat_seedling');
const plotY = fw.heightMap[fhx + 2] - 1;
const cropY = plotY - 1;
fw.set(fhx + 2, plotY, plot);
fw.set(fhx + 2, cropY, seedling);
fsm.settlers.push(new Settler(fhx + 0.5, fhy, 'farmer'));
let harvestedCrop = false;
for (let i = 0; i < 1000; i++) {
  if (fsm.update(0.05, fw, bigCiv).produced.food) { harvestedCrop = true; break; }
}
assert.ok(harvestedCrop, 'farmer harvested a crop into food stock');
assert.strictEqual(fw.get(fhx + 2, cropY), AIR, 'ripe crop is cleared after harvest');
assert.ok(fsm.stock.food >= 2, 'crop harvest adds food to town stock');
assert.ok(fsm.stock.wheat >= 1, 'crop harvest records wheat surplus');
ok('farmers tend and harvest visible crops');

console.log(`\nAll ${pass} settler checks passed.`);
