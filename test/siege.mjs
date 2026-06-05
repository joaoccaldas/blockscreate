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

// ---- Breach consequences: guards sally out --------------------------------
const gg = newGame();
gg.newWorld('iron', MODE.SURVIVAL);
gg.settlers.setHome(Math.round(gg.player.x), Math.round(gg.player.y));
gg.settlers.stock = { food: 0, wheat: 0, ore: 0, wood: 0 };
gg.townGuards = 2;
const guarded = new Mob('raider', gg.settlers.home.x + 0.5, gg.settlers.home.y);
gg.mobs = [guarded];
const defeatedBefore = gg.civ.defeated.raider || 0;
for (let i = 0; i < 12 && gg.mobs.length; i++) gg._updateRaiders(0.8);
assert.strictEqual(gg.mobs.length, 0, 'town guards eventually cut down a breaching raider');
assert.ok((gg.civ.defeated.raider || 0) > defeatedBefore, 'guard kill is recorded as a defeat');
ok('guards sally out and destroy raiders that reach the town');

// ---- Breach consequences: pillage (no guards, so the raider survives) ------
const gp = newGame();
gp.newWorld('iron', MODE.SURVIVAL);
gp.settlers.setHome(Math.round(gp.player.x), Math.round(gp.player.y));
gp.townGuards = 0;
gp.settlers.stock = { food: 10, wheat: 0, ore: 0, wood: 0 };
const home = gp.settlers.home;
gp.world.set(home.x + 1, home.y - 1, blockId('granary'));
gp.civ.onBuild('granary'); // storage +8, placed.granary = 1
const storageBefore = gp.civ.storage;
const looter = new Mob('raider', home.x + 0.5, home.y);
gp.mobs = [looter];
for (let i = 0; i < 6; i++) gp._updateRaiders(1.4);
assert.ok(gp.settlers.stock.food < 10, 'raiders loot the town stockpile');
assert.ok(!isSolid(gp.world.get(home.x + 1, home.y - 1)), 'raiders smash a town building');
assert.ok(gp.civ.storage < storageBefore, 'losing the granary rolls back its storage bonus');
assert.strictEqual(gp.civ.placed.granary || 0, 0, 'destroyed building leaves the placed tally');
ok('undefended breach: raiders loot stock and wreck town buildings');

// ---- Civilization.onStructureLost rolls back bonuses -----------------------
const civ = gp.civ;
civ.onBuild('market');      // trade +1
civ.onBuild('caravan_post'); // trade +2
const tradeBefore = civ.trade;
civ.onStructureLost('caravan_post');
assert.strictEqual(civ.trade, tradeBefore - 2, 'losing a caravan post removes its trade bonus');
assert.strictEqual(civ.placed.caravan_post || 0, 0, 'lost structure drops from the placed tally');
ok('Civilization.onStructureLost reverses a building’s contribution');

// ---- Raid telegraph: a muster window before the siege lands ----------------
const gt = newGame();
gt.newWorld('iron', MODE.SURVIVAL);
gt.settlers.setHome(Math.round(gt.player.x), Math.round(gt.player.y));
const mobsBefore = gt.mobs.length;
assert.ok(gt.telegraphRaid({ type: 'bandit', count: 3, delay: 14 }), 'telegraphRaid schedules a raid');
assert.ok(gt.pendingRaid, 'a raid is pending after the telegraph');
assert.strictEqual(gt.mobs.length, mobsBefore, 'a telegraphed raid does not spawn immediately');
gt._updateRaidTelegraph(1);
assert.ok(gt.raidStatus && gt.raidStatus.secondsLeft > 0 && gt.raidStatus.secondsLeft <= 14, 'HUD shows a muster countdown');
for (let i = 0; i < 20 && gt.pendingRaid; i++) gt._updateRaidTelegraph(1); // player is at home → mustered
assert.ok(!gt.pendingRaid, 'the pending raid resolves once the muster window closes');
assert.ok(gt.mobs.length > mobsBefore, 'the raid spawns when the window closes');
assert.ok(gt.rallyBuff > 0, 'mustering at the town grants a rally buff');
ok('raids are telegraphed with a muster window, then arrive');

// Rally buff makes guards hit harder.
const gr = newGame();
gr.newWorld('iron', MODE.SURVIVAL);
gr.settlers.setHome(Math.round(gr.player.x), Math.round(gr.player.y));
gr.settlers.stock = { food: 0, wheat: 0, ore: 0, wood: 0 };
gr.townGuards = 1;
const r1 = new Mob('bandit', gr.settlers.home.x + 0.5, gr.settlers.home.y);
gr.mobs = [r1]; gr.rallyBuff = 0;
const hp0 = r1.health;
gr._updateRaiders(0.8);
const dmgNoBuff = hp0 - r1.health;
const r2 = new Mob('bandit', gr.settlers.home.x + 0.5, gr.settlers.home.y);
gr.mobs = [r2]; gr.rallyBuff = 18;
const hp1 = r2.health;
gr._updateRaiders(0.8);
const dmgBuff = hp1 - r2.health;
assert.ok(dmgBuff > dmgNoBuff, 'a rallied defense makes guards hit harder');
ok('mustering rallies the militia to fight at full strength');

// The siege world-event telegraphs instead of ambushing.
const ge = newGame();
ge.newWorld('iron', MODE.SURVIVAL);
ge.settlers.setHome(Math.round(ge.player.x), Math.round(ge.player.y));
ge.dayFactor = () => 0.3;
ge.events.cooldowns.siege_raid = 0;
ge.events.cooldowns.raider_scouts = 999;
const em = ge.mobs.length;
ge.events.update(ge, 0.1);
assert.ok(ge.pendingRaid, 'the siege world-event schedules a telegraphed raid');
assert.strictEqual(ge.mobs.length, em, 'the siege world-event does not spawn raiders before the muster window');
ok('the siege world-event telegraphs the raid instead of ambushing');

console.log(`\nAll ${passed} siege checks passed.`);
