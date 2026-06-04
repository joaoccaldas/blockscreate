/**
 * Iron-age physical sieges: walls are a real, breakable defense.
 *
 *  - marauders (raider/bandit/machine) march on the town when the player is far
 *  - a wall too tall to climb is attacked, not fled from (Mob returns breakWall)
 *  - non-siege targets (no canBreakWalls) just turn around at a wall
 *  - Game._raiderBreakWall chips wall integrity, scaled by block hardness, and
 *    collapses the tile when spent
 *  - end-to-end: a raider penned out by a cobblestone wall breaches it over time
 */
import assert from 'node:assert';

const store = {};
const noop = () => {};
function makeEl() {
  return {
    children: [], dataset: {}, style: {},
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    appendChild(c) { this.children.push(c); return c; },
    remove: noop, addEventListener: noop, removeEventListener: noop, setAttribute: noop,
    getContext: () => new Proxy({}, { get: () => noop }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 600 }),
    querySelector: () => makeEl(), querySelectorAll: () => [], click: noop,
    width: 960, height: 600,
    set onclick(v) {}, set onchange(v) {}, set oninput(v) {},
    set innerHTML(v) { this.children = []; }, set textContent(v) {},
  };
}
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
Object.defineProperty(globalThis, 'navigator', { value: { maxTouchPoints: 0 }, configurable: true });
globalThis.window = { addEventListener: noop, removeEventListener: noop, devicePixelRatio: 1, AudioContext: undefined };
globalThis.document = {
  createElement: makeEl, body: makeEl(), getElementById: makeEl, querySelector: () => makeEl(),
  addEventListener: noop, removeEventListener: noop, hidden: false,
};
globalThis.Image = class { set src(v) {} };
globalThis.performance = { now: () => Date.now() };
globalThis.requestAnimationFrame = noop;

const { World } = await import('../src/world/World.js');
const { Mob } = await import('../src/entities/Mob.js');
const { Game } = await import('../src/Game.js');
const { Progress } = await import('../src/persistence/Progress.js');
const { Settings } = await import('../src/persistence/Settings.js');
const { Audio } = await import('../src/systems/Audio.js');
const { MODE } = await import('../src/core/constants.js');
const { blockId, isSolid } = await import('../src/core/blocks.js');

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

const progress = new Progress();
const settings = new Settings();
const audio = new Audio({ sound: false, music: false });
const newGame = () => new Game({ canvas: makeEl(), hudRoot: makeEl(), sprites: {}, progress, settings, audio, onExit: () => {} });

// ---- Mob-level: pathing ----------------------------------------------------
const world = new World({ seed: 11, eraId: 'iron', width: 60, height: 40 });
world.generate();
const gy = world.heightMap[30];

// A siege marauder advances toward a distant town goal even past chase range.
const marcher = new Mob('raider', 30, gy);
marcher.update(0.05, world, { x: 5, y: gy, alive: true, siege: true, goalX: 50, canBreakWalls: true });
assert.ok(marcher.vx > 0 || marcher.facing === 1, 'siege raider marches toward the distant town goal');
ok('siege marauder advances on the town from beyond sight range');

// Without a siege flag, the same raider just chases the nearby player.
const chaser = new Mob('raider', 30, gy);
chaser.update(0.05, world, { x: 25, y: gy, alive: true });
assert.ok(chaser.vx < 0 || chaser.facing === -1, 'non-siege raider chases the nearby player');
ok('raider falls back to chasing the player when close');

// ---- Mob-level: wall attack vs. turn-around ---------------------------------
function buildWall(w, x, baseY, h) {
  for (let dy = 0; dy < h; dy++) w.set(x, baseY - dy, blockId('cobblestone'));
}

const wWorld = new World({ seed: 12, eraId: 'iron', width: 60, height: 40 });
wWorld.generate();
const wy = wWorld.heightMap[30];
buildWall(wWorld, 32, wy, 3); // a 3-tall wall to the raider's right

const breaker = new Mob('raider', 31.5, wy);
breaker.facing = 1; breaker.vx = 3.2;
const hit = breaker.update(0.05, wWorld, { x: 50, y: wy, alive: true, siege: true, goalX: 50, canBreakWalls: true });
assert.ok(hit && hit.breakWall, 'a wall too tall to climb yields a breakWall event');
assert.strictEqual(hit.breakWall.x, 32, 'breakWall targets the wall column ahead');
ok('siege raider attacks an unclimbable wall instead of fleeing');

// A target without canBreakWalls (e.g. a wolf chasing) just turns around.
const wolf = new Mob('wolf', 31.5, wy);
wolf.facing = 1; wolf.vx = 3.6;
const wolfHit = wolf.update(0.05, wWorld, { x: 50, y: wy, alive: true });
assert.ok(!wolfHit || !wolfHit.breakWall, 'non-siege mob never reports a wall break');
ok('ordinary mobs cannot break walls');

// ---- Game-level: wall integrity scales with hardness -----------------------
const g = newGame();
g.newWorld('iron', MODE.SURVIVAL);
const cx = Math.round(g.player.x) + 8;
const cy = g.world.heightMap[cx];

// Cobblestone (hardness 1.8 -> integrity ~14.4) survives one bandit blow (14).
g.world.set(cx, cy, blockId('cobblestone'));
g._raiderBreakWall(new Mob('bandit', cx, cy), { x: cx, y: cy }, 14);
assert.ok(isSolid(g.world.get(cx, cy)), 'cobblestone wall survives a single siege blow');
g._raiderBreakWall(new Mob('bandit', cx, cy), { x: cx, y: cy }, 14);
assert.ok(!isSolid(g.world.get(cx, cy)), 'cobblestone wall collapses after sustained battering');
ok('wall integrity scales with hardness and collapses when spent');

// A flimsy thatch wall falls to a single blow.
g.world.set(cx, cy, blockId('thatch'));
g._raiderBreakWall(new Mob('bandit', cx, cy), { x: cx, y: cy }, 14);
assert.ok(!isSolid(g.world.get(cx, cy)), 'thatch gives way immediately under siege');
ok('weaker walls fall faster than stone ramparts');

// Bedrock is never gnawed through.
g.world.set(cx, cy, blockId('bedrock'));
for (let i = 0; i < 50; i++) g._raiderBreakWall(new Mob('bandit', cx, cy), { x: cx, y: cy }, 50);
assert.ok(isSolid(g.world.get(cx, cy)), 'bedrock resists any siege');
ok('bedrock is immune to siege');

// ---- End-to-end: a penned-out raider breaches a cobblestone wall -----------
const gi = newGame();
gi.newWorld('iron', MODE.SURVIVAL);
gi.settlers.setHome(Math.round(gi.player.x), Math.round(gi.player.y));
const wallX = Math.round(gi.player.x) + 5;
const wallY = gi.world.heightMap[wallX];
// Flatten a clear strip around the wall so the raider's approach is deterministic
// (generated terrain would otherwise let it wander or hop unpredictably).
for (let x = wallX - 1; x <= wallX + 4; x++) {
  gi.world.set(x, wallY, blockId('dirt'));
  for (let dy = 1; dy <= 6; dy++) gi.world.set(x, wallY - dy, 0);
}
buildWall(gi.world, wallX, wallY, 3);
const raider = new Mob('raider', wallX + 2.5, wallY);
gi.mobs = [raider];

const solidCount = () => [0, 1, 2].filter((dy) => isSolid(gi.world.get(wallX, wallY - dy))).length;
const before = solidCount();
assert.strictEqual(before, 3, 'wall starts fully intact');
for (let i = 0; i < 800 && solidCount() === before; i++) {
  const ctx = gi._mobTargetContext(raider);
  const h = raider.update(0.05, gi.world, ctx);
  if (h && h.breakWall) gi._raiderBreakWall(raider, h.breakWall, h.dps);
}
assert.ok(solidCount() < before, 'a determined raider physically breaches the wall over time');
ok('end-to-end: raiders break through a cobblestone wall to reach the town');

console.log(`\nAll ${passed} siege checks passed.`);
