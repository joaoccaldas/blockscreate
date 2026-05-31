/**
 * Headless logic smoke test for the DOM-free systems.
 * Run with: node test/smoke.mjs
 * Verifies world generation, RLE round-trip, inventory, crafting and civ rules
 * without needing a browser.
 */
import assert from 'node:assert';
import { World, rleEncode, rleDecode } from '../src/world/World.js';
import { Inventory } from '../src/systems/Inventory.js';
import { Civilization } from '../src/systems/Civilization.js';
import { craft, availableRecipes, canCraft } from '../src/systems/Crafting.js';
import { RECIPES } from '../src/core/recipes.js';
import { isSolid, AIR, blockId, dropsOf } from '../src/core/blocks.js';
import { ObjectiveTracker } from '../src/systems/Objectives.js';
import { getEra } from '../src/core/eras.js';
import { getEraManifest } from '../src/core/eraManifests.js';

let passed = 0;
function ok(name) { console.log(`  ✓ ${name}`); passed++; }

// --- World generation ---
const world = new World({ seed: 12345, eraId: 'stone' });
world.generate();
assert.ok(world.grid.length === world.width * world.height, 'grid sized');
let solidCount = 0;
for (let i = 0; i < world.grid.length; i++) if (world.grid[i] !== AIR) solidCount++;
assert.ok(solidCount > world.grid.length * 0.3, 'world has substantial terrain');
assert.ok(world.spawn.y > 0 && world.spawn.y < world.height, 'spawn inside world');
assert.ok(isSolid(world.get(world.spawn.x, world.spawn.y + 1)), 'ground beneath spawn');
assert.ok(world.grid.includes(blockId('clay')), 'world includes clay deposits');
assert.ok(world.grid.includes(blockId('gravel')), 'world includes gravel seams');
ok('world generates terrain + valid spawn');

// --- RLE round-trip ---
const rle = rleEncode(world.grid);
const restored = new Uint8Array(world.grid.length);
rleDecode(rle, restored);
assert.deepStrictEqual([...restored], [...world.grid], 'RLE round-trips losslessly');
assert.ok(rle.length < world.grid.length, 'RLE actually compresses');
ok(`RLE round-trip lossless (compressed ${world.grid.length} -> ${rle.length})`);

// --- World serialize/deserialize ---
const ser = world.serialize();
const w2 = World.deserialize(ser);
assert.deepStrictEqual([...w2.grid], [...world.grid], 'world serialize round-trip');
ok('world serialize/deserialize');

// --- Expandable world persistence ---
const expandable = new World({ seed: 777, eraId: 'stone', width: 40, height: 40 });
expandable.generate();
const marker = blockId('brick');
expandable.set(5, 10, marker);
const oldWidth = expandable.width;
const expanded = expandable.expand({ left: 8, right: 12 });
assert.deepStrictEqual(expanded, { left: 8, right: 12 }, 'expansion report');
assert.strictEqual(expandable.width, oldWidth + 20, 'world width grows');
assert.strictEqual(expandable.get(13, 10), marker, 'left expansion preserves edited tiles');
assert.ok(expandable.originX < 0, 'origin shifts when prepending');
const expandedRoundTrip = World.deserialize(expandable.serialize());
assert.strictEqual(expandedRoundTrip.get(13, 10), marker, 'expanded world save preserves edits');
assert.strictEqual(expandedRoundTrip.originX, expandable.originX, 'origin persists');
ok('world expands horizontally and persists edits');

// --- Inventory ---
const inv = new Inventory();
assert.strictEqual(inv.add('log', 5), 0, 'add returns 0 leftover');
assert.strictEqual(inv.count('log'), 5, 'count works');
assert.ok(inv.remove('log', 3), 'remove succeeds');
assert.strictEqual(inv.count('log'), 2, 'count after remove');
assert.ok(!inv.remove('log', 99), 'over-remove fails');
ok('inventory add/remove/count');

// --- Crafting (era-gated) ---
const stoneSet = new Set(['stone']);
const stoneRecipes = availableRecipes(stoneSet);
assert.ok(stoneRecipes.every((r) => r.era === 'stone'), 'only stone recipes when only stone unlocked');
assert.ok(stoneRecipes.length < RECIPES.length, 'bronze/iron recipes gated out');

const inv2 = new Inventory();
inv2.add('log', 1);
const planksRecipe = RECIPES.find((r) => r.id === 'planks');
assert.ok(canCraft(planksRecipe, inv2), 'can craft planks from a log');
assert.ok(craft(planksRecipe, inv2), 'craft planks');
assert.strictEqual(inv2.count('planks'), 4, 'planks produced');
assert.strictEqual(inv2.count('log'), 0, 'log consumed');
ok('crafting consumes inputs, produces outputs, respects era gate');

// --- Drops and stations ---
assert.deepStrictEqual(dropsOf(blockId('copper_ore')), ['copper_ore'], 'copper ore drops ore for smelting');
assert.ok(dropsOf(blockId('leaves'), () => 0).includes('fiber'), 'leaves can drop fiber');
const cook = RECIPES.find((r) => r.id === 'cook_food');
const inv3 = new Inventory();
inv3.add('raw_food', 1);
assert.ok(!canCraft(cook, inv3), 'station recipe blocked without station context');
assert.ok(canCraft(cook, inv3, { hasStation: (id) => id === 'campfire' }), 'station recipe allowed with station');
ok('resource drops and station-gated crafting');

// --- Civilization progression ---
const civ = new Civilization('stone');
for (let i = 0; i < 600; i++) civ.onMine(); // 0.5 CP each = 300 CP
assert.ok(civ.cp >= 250, 'CP accrues from mining');
assert.ok(civ.population > 1, 'population grows with CP');
assert.ok(civ.canAdvance(), 'can advance once advanceCost met');
civ.onBuild('campfire');
assert.ok(civ.hasBuilt('campfire'), 'built stations are tracked');
assert.ok(civ.light > 0, 'light infrastructure tracked');
assert.ok(civ.settlementScore() > 0, 'settlement score grows');
ok('civilization CP / population / advance gate');

// --- Per-era objectives ---
const bronzeObjectives = new ObjectiveTracker('bronze');
assert.ok(bronzeObjectives.all.some((o) => o.id === 'smelt_bronze'), 'bronze has era objectives');
const ironObjectives = new ObjectiveTracker('iron');
assert.ok(ironObjectives.all.some((o) => o.id === 'iron_pick'), 'iron has era objectives');
const firstHumans = new ObjectiveTracker('stone');
assert.ok(firstHumans.mandatory().length >= 5, 'first era has mandatory goals');
assert.ok(firstHumans.mastery().length >= 2, 'first era has mastery goals');
assert.ok(!firstHumans.mandatoryDone(), 'mandatory starts incomplete');
ok('per-era mandatory and mastery objective sets');

// --- Era manifests ---
const era = getEra('stone');
const manifest = getEraManifest('stone');
assert.strictEqual(era.name, 'First Humans');
assert.ok(manifest.historicalClues.includes('fossil_bed'), 'first humans has fossil clue metadata');
assert.ok(manifest.branches.some((b) => b.id === 'saurian_echo'), 'alternate-history branch is data-driven');
ok('era manifests provide historical context and branches');

console.log(`\nAll ${passed} smoke checks passed.`);
