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
globalThis.document = { createElement: makeEl, body: makeEl(), getElementById: makeEl, querySelector: () => makeEl() };
globalThis.Image = class { set src(v) {} };
globalThis.performance = { now: () => Date.now() };
globalThis.requestAnimationFrame = noop;

const { Game } = await import('../src/Game.js');
const { Progress } = await import('../src/persistence/Progress.js');
const { Settings } = await import('../src/persistence/Settings.js');
const { Audio } = await import('../src/systems/Audio.js');
const { MODE } = await import('../src/core/constants.js');
const { SaveManager } = await import('../src/persistence/SaveManager.js');

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
for (const key of ['structures', 'discoveries', 'clues', 'powerups']) {
  if (!(key in json)) throw new Error(`save missing ${key}`);
}
const g2 = newGame();
g2.loadSave(json);
if (g2.world.grid.length !== g.world.grid.length) throw new Error('grid length mismatch after load');
if (!g2.objectives.isDone('gather_wood')) throw new Error('objective state lost across save');
if (!g2.structures || !g2.discoveries || !g2.clues || !g2.powerups) throw new Error('fun systems missing after load');
ok(`save/load round-trip; era ${g2.eraId}, objectives + fun systems restored`);

// Era advancement builds a fresh world and installs the next era objective set.
g2.civ.cp = 250;
for (const o of g2.objectives.mandatory()) g2.objectives.completed.add(o.id);
if (!g2._advanceEra()) throw new Error('advance era returned false');
if (g2.eraId !== 'bronze') throw new Error(`expected bronze era after advance, got ${g2.eraId}`);
if (!g2.unlocked.isUnlocked('bronze')) throw new Error('bronze was not unlocked');
if (!g2.objectives.all.some((o) => o.id === 'smelt_bronze')) throw new Error('bronze objectives missing after advance');
ok('HUD-era advancement enters a fresh Bronze Age world');

console.log(`\nAll ${passed} integration checks passed.`);
