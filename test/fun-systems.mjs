/**
 * Logic tests for hidden discoveries, structure recognition and timed powerups.
 * Run with: node test/fun-systems.mjs
 */
import assert from 'node:assert';
import { World } from '../src/world/World.js';
import { blockId, AIR } from '../src/core/blocks.js';
import { StructureTracker, scan } from '../src/systems/Structures.js';
import { DiscoveryLog } from '../src/systems/Discoveries.js';
import { PowerupManager } from '../src/systems/Powerups.js';
import { HistoricalClueLog } from '../src/systems/HistoricalClues.js';
import { WorldEventLog } from '../src/systems/WorldEvents.js';
import { Civilization } from '../src/systems/Civilization.js';

let passed = 0;
function ok(name) { console.log(`  ✓ ${name}`); passed++; }

function emptyWorld() {
  const w = new World({ seed: 1, eraId: 'stone', width: 32, height: 24 });
  w.grid.fill(AIR);
  for (let x = 0; x < w.width; x++) w.recomputeColumnTop(x);
  w.spawn = { x: 10, y: 10 };
  return w;
}

// --- Structure recognition: hut ---
const world = emptyWorld();
const plank = blockId('planks');
for (let x = 8; x <= 12; x++) {
  world.set(x, 10, plank);
  world.set(x, 6, plank);
}
for (let y = 7; y <= 9; y++) {
  world.set(8, y, plank);
  world.set(12, y, plank);
}
const tracker = new StructureTracker();
const game = { world, player: { x: 10, y: 10 } };
const structures = tracker.evaluate(game, { x: 10, y: 10 });
assert.ok(structures.some((s) => s.id === 'hut'), 'hut should be recognized');
assert.ok(tracker.has('hut'), 'hut discovery persisted');
ok('structure tracker recognizes a player-built hut');

const defendedWorld = emptyWorld();
const campfire = blockId('campfire');
const torch = blockId('torch');
const hide = blockId('hide_wall');
defendedWorld.set(10, 10, campfire);
defendedWorld.set(8, 10, torch);
defendedWorld.set(12, 10, torch);
for (let x = 7; x <= 12; x++) defendedWorld.set(x, 12, hide);
const defended = new StructureTracker();
const defendedFound = defended.evaluate({ world: defendedWorld, player: { x: 10, y: 10 } }, { x: 10, y: 10 });
assert.ok(defendedFound.some((s) => s.id === 'defended_camp'), 'defended camp should be recognized');
ok('structure tracker recognizes dinosaur defenses');

// --- Structure scan primitives ---
const ctx = scan(world, { x: 10, y: 10 });
assert.strictEqual(ctx.roof, 5);
assert.strictEqual(ctx.floor, 5);
assert.strictEqual(ctx.leftWall, 4);
assert.strictEqual(ctx.rightWall, 4);
ok('structure scan exposes stable pattern metrics');

// --- Hidden discoveries grant once ---
const discoveries = new DiscoveryLog();
const civ = new Civilization('stone');
const fake = {
  structures: tracker,
  discoveries,
  civ,
  world,
  animalPeaceTime: 0,
};
const found = discoveries.evaluate(fake);
assert.ok(found.some((d) => d.id === 'first_shelter'), 'first shelter discovery');
assert.strictEqual(discoveries.evaluate(fake).length, 0, 'discovery is one-shot');
ok('hidden discoveries unlock once from structures');

// --- Historical clues ---
const clues = new HistoricalClueLog();
const fossil = clues.discover('fossil_bed');
assert.strictEqual(fossil.branch, 'saurian_echo');
assert.ok(clues.has('fossil_bed'), 'clue is recorded');
assert.strictEqual(clues.discover('fossil_bed'), null, 'clue is one-shot');
assert.strictEqual(clues.branchCounts().saurian_echo, 1, 'branch pressure counted');
ok('historical clues unlock journal entries and branch metadata');

// --- Powerups ---
const powerups = new PowerupManager();
const glove = powerups.grant('builders_glove', 10);
assert.strictEqual(glove.label, "Builder's Glove");
assert.ok(powerups.value('reach') > 1, 'reach bonus active');
powerups.update(11);
assert.strictEqual(powerups.list().length, 0, 'powerup expires');
const bond = powerups.grant('grazer_bond', 10);
assert.ok(bond.effects.predatorDamage < 1, 'grazer bond reduces predator damage');
ok('powerups grant effects and expire');

// --- World events ---
const events = new WorldEventLog({ cooldowns: { meteor_shower: 0 } });
const eventWorld = emptyWorld();
for (let x = 0; x < eventWorld.width; x++) {
  eventWorld.set(x, 20, blockId('grass'));
  eventWorld.heightMap[x] = 20;
}
const eventGame = {
  mode: 'survival',
  eraId: 'stone',
  clock: 10,
  dayFactor: () => 0.1,
  world: eventWorld,
  player: { x: 15, y: 19 },
  particles: { fountain() {} },
};
const started = events.update(eventGame, 1);
assert.ok(events.isActive('cold_night'), 'cold night active at night');
assert.ok(started.some((e) => e.id === 'cold_night'), 'cold event starts');
assert.ok(started.some((e) => e.id === 'meteor_shower'), 'meteor event starts');
assert.ok(eventWorld.grid.includes(blockId('meteor_shard')), 'meteor event places a shard');
events.cooldowns.predator_migration = 0;
eventGame.spawnMobNearPlayer = (type) => { eventGame.spawned = type; return true; };
const predatorStarted = events.update(eventGame, 1);
assert.ok(predatorStarted.some((e) => e.id === 'predator_migration'), 'predator migration can start');
assert.ok(['raptor', 'rex'].includes(eventGame.spawned), 'predator migration spawns a predator');
events.cooldowns.alpha_predator = 0;
eventGame.dayFactor = () => 0.4;
const alphaStarted = events.update(eventGame, 1);
assert.ok(alphaStarted.some((e) => e.id === 'alpha_predator'), 'alpha predator event can start');
assert.strictEqual(eventGame.spawned, 'alpha_raptor', 'alpha event spawns an alpha raptor');
events.update(eventGame, 40);
assert.ok(!events.isActive('predator_migration'), 'temporary events expire');
ok('world events create hazards and physical artifacts');

const siegeEvents = new WorldEventLog({ cooldowns: { siege_raid: 0 } });
const siegeGame = {
  mode: 'survival',
  eraId: 'iron',
  clock: 99,
  dayFactor: () => 0.2,
  world: eventWorld,
  player: { x: 15, y: 19 },
  _hasTownDefense: () => true,
  spawnSiege(type, count) { this.siege = { type, count }; return count; },
};
const siegeStarted = siegeEvents.update(siegeGame, 1);
assert.ok(siegeStarted.some((e) => e.id === 'siege_raid'), 'siege event can start');
assert.deepStrictEqual(siegeGame.siege, { type: 'bandit', count: 2 }, 'siege event uses the siege spawner');
ok('Iron siege events test town defenses');

// --- Civilization records creative/building milestones ---
civ.onBuild('torch', 5, 4);
civ.onBuild('brick', 5, 3);
civ.onMine('stone', 22);
civ.onDefeat('raptor');
assert.ok(civ.light >= 1, 'light tracked');
assert.ok(civ.hasBuilt('brick'), 'placed material tracked');
assert.strictEqual(civ.defeated.raptor, 1, 'defeated enemies tracked');
assert.strictEqual(civ.highestBuild, 3, 'highest build keeps smallest y');
assert.strictEqual(civ.deepestMine, 22, 'deepest mining depth tracked');
ok('civilization stores hidden-task milestones');

console.log(`\nAll ${passed} fun-system checks passed.`);
