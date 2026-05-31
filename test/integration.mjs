// Headless integration: stub a minimal-but-faithful browser env (elements track
// children so HUD rendering really runs), build a Game, tick it, round-trip a
// save. Catches cross-module wiring errors without a browser.
const store = {};
const noop = () => {};

function makeEl() {
  const el = {
    children: [],
    dataset: {},
    style: {},
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    appendChild(c) { this.children.push(c); return c; },
    remove: noop,
    addEventListener: noop,
    removeEventListener: noop,
    setAttribute: noop,
    getContext: () => new Proxy({}, { get: () => noop }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 600 }),
    querySelector: () => makeEl(),
    querySelectorAll: () => [],
    click: noop,
    width: 960, height: 600,
    set onclick(v) {}, set onchange(v) {}, set oninput(v) {},
    set innerHTML(v) { this.children = []; }, set textContent(v) {},
  };
  return el;
}

globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
Object.defineProperty(globalThis, 'navigator', {
  value: { maxTouchPoints: 0 },
  configurable: true,
});
globalThis.window = {
  addEventListener: noop,
  removeEventListener: noop,
  devicePixelRatio: 1,
  AudioContext: undefined, // Audio gracefully no-ops without a context
};
globalThis.document = {
  createElement: makeEl, body: makeEl(), getElementById: makeEl, querySelector: () => makeEl(),
  addEventListener: noop, removeEventListener: noop, hidden: false,
};
globalThis.Image = class { set src(v) {} };
globalThis.performance = { now: () => Date.now() };
globalThis.requestAnimationFrame = noop;

const { Game } = await import('../src/Game.js');
const { Progress } = await import('../src/persistence/Progress.js');
const { Settings } = await import('../src/persistence/Settings.js');
const { Audio } = await import('../src/systems/Audio.js');
const { MODE } = await import('../src/core/constants.js');
const { SaveManager } = await import('../src/persistence/SaveManager.js');
const { blockId } = await import('../src/core/blocks.js');

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

const progress = new Progress();
const settings = new Settings();
const audio = new Audio({ sound: false, music: false });

function newGame() {
  return new Game({
    canvas: makeEl(), hudRoot: makeEl(), sprites: {},
    progress, settings, audio, onExit: () => {},
  });
}

const g = newGame();
g.newWorld('stone', MODE.SURVIVAL);
ok(`game built; world ${g.world.width}x${g.world.height}, spawn ${JSON.stringify(g.world.spawn)}`);

const gCell = newGame();
gCell.newWorld('cell', MODE.SURVIVAL);
if (gCell.eraId !== 'cell') throw new Error('cell era did not start');
if (gCell.player.h >= 1.8) throw new Error('cell player form was not applied');
gCell.world.set(Math.round(gCell.player.x) + 1, Math.round(gCell.player.y), blockId('nutrient_blob'));
gCell.update(0.2);
if (gCell.inventory.count('nutrient_blob') < 1) throw new Error('cell did not absorb nearby nutrients');
gCell.inventory.add('nutrient_blob', 3);
gCell.inventory.add('mineral_vent', 1);
gCell.inventory.add('lipid_membrane', 4);
gCell.civ.onBuild('lipid_membrane');
gCell.civ.onBuild('lipid_membrane');
gCell.civ.onBuild('lipid_membrane');
gCell.civ.onBuild('lipid_membrane');
gCell.crafted.add('proto_cell');
gCell.civ.cp = 80;
gCell.update(0.016);
if (!gCell.canAdvance()) throw new Error('cell era did not unlock evolution after mandatory goals');
if (!gCell._advanceEra() || gCell.eraId !== 'stone') throw new Error('cell era did not evolve into dinosaurs');
ok('first-cell era evolves into Age of Dinosaurs');

for (let i = 0; i < 60; i++) g.update(0.016);
if (!(g.player.health > 0)) throw new Error('player died unexpectedly');
ok(`60 ticks run; hp ${g.player.health.toFixed(1)}, onGround ${g.player.onGround}`);

// Objectives wired and evaluating.
if (!g.objectives || !g.objectives.all.length) throw new Error('objectives missing');
g.inventory.add('log', 3);
g.update(0.016);
if (!g.objectives.isDone('gather_wood')) throw new Error('gather objective did not complete');
ok('objectives evaluate (gather_wood completed after collecting logs)');

g.civ.cp = 9999;
if (g.canAdvance()) throw new Error('portal opened before mandatory goals completed');
ok('portal remains gated by mandatory goals even with enough CP');

// Particles fire on block break.
const before = g.particles.list.length;
g.mode = MODE.CREATIVE; // instant break
const sx = g.world.spawn.x;
const sy = g.world.heightMap[sx];
g._breakBlock(sx, sy, (await import('../src/core/blocks.js')).getBlock(g.world.get(sx, sy) || 1));
if (g.particles.list.length <= before) throw new Error('no particles spawned on break');
ok('particle burst on block break');
g.mode = MODE.SURVIVAL;

// Save now includes crafted + objectives, and round-trips.
const json = SaveManager.toJSON(g);
if (!('objectives' in json) || !('crafted' in json)) throw new Error('save missing new fields');
for (const key of ['structures', 'discoveries', 'clues', 'powerups', 'events']) {
  if (!(key in json)) throw new Error(`save missing ${key}`);
}
if (!json.world.chunks?.generated?.length) throw new Error('save missing generated chunk metadata');
g.civ.onDefeat('raptor');
g.events.cooldowns.predator_migration = 12;
g.events.durations.predator_migration = 8;
g.events.active.add('predator_migration');
const jsonWithRpg = SaveManager.toJSON(g);
if (jsonWithRpg.civ.defeated.raptor !== 1) throw new Error('save missing defeated enemy stats');
if (!jsonWithRpg.events.durations.predator_migration) throw new Error('save missing event durations');
const g2 = newGame();
g2.loadSave(jsonWithRpg);
if (g2.world.grid.length !== g.world.grid.length) throw new Error('grid length mismatch after load');
if (g2.world.getChunkSummary().generated !== g.world.getChunkSummary().generated) throw new Error('chunk metadata lost across save');
if (g2.civ.defeated.raptor !== 1) throw new Error('defeated enemy stats lost across save');
if (!g2.events.isActive('predator_migration')) throw new Error('active RPG event lost across save');
if (!g2.objectives.isDone('gather_wood')) throw new Error('objective state lost across save');
if (!g2.structures || !g2.discoveries || !g2.clues || !g2.powerups || !g2.events) throw new Error('fun systems missing after load');
ok(`save/load round-trip; era ${g2.eraId}, objectives + fun systems restored`);

// Era advancement builds a fresh world and installs the next era objective set.
g2.civ.cp = 250;
for (const o of g2.objectives.mandatory()) g2.objectives.completed.add(o.id);
if (!g2._advanceEra()) throw new Error('advance era returned false');
if (g2.eraId !== 'bronze') throw new Error(`expected bronze era after advance, got ${g2.eraId}`);
if (!g2.unlocked.isUnlocked('bronze')) throw new Error('bronze was not unlocked');
if (!g2.objectives.all.some((o) => o.id === 'smelt_bronze')) throw new Error('bronze objectives missing after advance');
ok('HUD-era advancement enters a fresh Bronze Age world');

// Asteroid event: a meteor impact carves a crater and hurts a nearby player.
const g3 = newGame();
g3.newWorld('stone', MODE.SURVIVAL);
const ix = Math.round(g3.player.x) + 1;
const iy = g3.world.heightMap[ix];
g3.player.x = ix + 0.5; g3.player.y = iy; g3.player.health = 100;
const solidBefore = g3.world.get(ix, iy);
g3._meteorImpact(ix, iy);
if (g3.world.get(ix, iy) !== 0) throw new Error('impact did not carve a crater');
if (g3.player.health >= 100) throw new Error('impact did not damage a nearby player');
void solidBefore;
ok('asteroid impact craters terrain and damages a nearby player');

console.log(`\nAll ${passed} integration checks passed.`);
