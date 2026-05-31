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
ok('powerups grant effects and expire');

// --- Civilization records creative/building milestones ---
civ.onBuild('torch', 5, 4);
civ.onBuild('brick', 5, 3);
civ.onMine('stone', 22);
assert.ok(civ.light >= 1, 'light tracked');
assert.ok(civ.hasBuilt('brick'), 'placed material tracked');
assert.strictEqual(civ.highestBuild, 3, 'highest build keeps smallest y');
assert.strictEqual(civ.deepestMine, 22, 'deepest mining depth tracked');
ok('civilization stores hidden-task milestones');

console.log(`\nAll ${passed} fun-system checks passed.`);
