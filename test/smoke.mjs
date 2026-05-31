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
import { isSolid, AIR } from '../src/core/blocks.js';

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

// --- Civilization progression ---
const civ = new Civilization('stone');
for (let i = 0; i < 600; i++) civ.onMine(); // 0.5 CP each = 300 CP
assert.ok(civ.cp >= 250, 'CP accrues from mining');
assert.ok(civ.population > 1, 'population grows with CP');
assert.ok(civ.canAdvance(), 'can advance once advanceCost met');
ok('civilization CP / population / advance gate');

console.log(`\nAll ${passed} smoke checks passed.`);
