/**
 * Tests for the era-theme + enemy layer:
 *  - weighted spawn tables resolve to real mob types
 *  - hostile mobs chase the player and deal contact damage
 *  - hostiles drop materials + award CP on defeat
 */
import assert from 'node:assert';
import { World } from '../src/world/World.js';
import { Mob, MOB_TYPES } from '../src/entities/Mob.js';
import { getEraTheme, weightedPick, ERA_THEME } from '../src/core/eraTheme.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

// Every era theme references only real mob types.
for (const id in ERA_THEME) {
  const t = ERA_THEME[id];
  for (const [type] of [...t.passive, ...t.hostile]) {
    assert.ok(MOB_TYPES[type], `era ${id} references unknown mob '${type}'`);
  }
}
ok('every era theme spawn table references real mob types');

// weightedPick respects the table and is deterministic with a fixed rng.
const table = [['a', 1], ['b', 0]];
assert.strictEqual(weightedPick(table, () => 0.99), 'a', 'zero-weight entry never picked');
ok('weightedPick honors weights');

// Age of Dinosaurs has predator dinosaurs as hostiles, and a meteor event.
const stone = getEraTheme('stone');
assert.ok(stone.hostile.some(([t]) => t === 'raptor'), 'dino era has raptors');
assert.ok(stone.hostile.some(([t]) => t === 'rex'), 'dino era has a T-Rex');
assert.ok(stone.passive.some(([t]) => t === 'stego' || t === 'trike'), 'dino era has grazers');
assert.ok(stone.asteroidEvent, 'dino era has the asteroid event');
ok('Age of Dinosaurs defines dinosaur spawns + asteroid event');

// Build a tiny flat world for behavior tests.
const world = new World({ seed: 7, eraId: 'stone', width: 40, height: 40 });
world.generate();
const groundY = world.heightMap[20];

// Hostile chases the player horizontally.
const wolf = new Mob('wolf', 25, groundY);
const player = { x: 18, y: groundY, alive: true };
const vxBefore = wolf.vx;
wolf.update(0.05, world, player); // player is to the left
assert.ok(wolf.vx < 0 || wolf.facing === -1, 'wolf turns toward the player');
ok('hostile mob chases the player');

// Contact damage fires when adjacent.
const close = new Mob('wolf', groundClose(), groundY);
function groundClose() { return 20.3; }
const result = close.update(0.05, world, { x: 20, y: groundY, alive: true });
assert.ok(result && result.damage > 0, 'adjacent hostile returns a contact hit');
ok('hostile deals contact damage when adjacent');

const raptor = new Mob('raptor', groundClose(), groundY);
const packHit = raptor.update(0.05, world, { x: 20, y: groundY, alive: true, packPressure: 2 });
assert.ok(packHit.damage > MOB_TYPES.raptor.damage, 'raptor pack pressure boosts contact damage');
ok('raptor packs increase danger');

const alpha = new Mob('alpha_raptor', groundClose(), groundY);
const alphaHit = alpha.update(0.05, world, { x: 20, y: groundY, alive: true, packPressure: 2 });
assert.ok(alphaHit.damage > MOB_TYPES.raptor.damage, 'alpha raptor hits harder than a normal raptor');
assert.strictEqual(MOB_TYPES.alpha_raptor.drop, 'alpha_tooth', 'alpha raptor has a trophy drop');
assert.ok(MOB_TYPES.alpha_raptor.cp > MOB_TYPES.raptor.cp, 'alpha raptor is worth boss-level CP');
ok('alpha raptor is a stronger trophy predator');

// hurt() returns true when killed and respects hp.
const boar = new Mob('boar', 20, groundY);
assert.ok(!boar.hurt(4), 'boar survives a single hit');
assert.ok(boar.hurt(100), 'boar dies from a big hit');
ok('mob.hurt tracks health and death');

console.log(`\nAll ${passed} enemy/theme checks passed.`);
