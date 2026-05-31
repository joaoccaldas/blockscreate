// Headless integration: stub a minimal-but-faithful browser env (elements track
// children so HUD rendering really runs), build a Game, tick it, round-trip a
// save. Catches cross-module wiring errors without a browser.
const store = {};
const noop = () => {};

function makeEl() {
  const el = {
    children: [],
    style: {},
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    appendChild(c) { this.children.push(c); return c; },
    remove: noop,
    addEventListener: noop,
    setAttribute: noop,
    getContext: () => new Proxy({}, { get: () => noop }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 600 }),
    querySelector: () => makeEl(),
    querySelectorAll: () => [],
    width: 960, height: 600,
    set onclick(v) {}, set onchange(v) {}, set innerHTML(v) { this.children = []; }, set textContent(v) {},
  };
  return el;
}

globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
globalThis.window = { addEventListener: noop };
globalThis.document = { createElement: makeEl, body: makeEl(), getElementById: makeEl, querySelector: () => makeEl() };
globalThis.Image = class { set src(v) {} };
globalThis.performance = { now: () => Date.now() };
globalThis.requestAnimationFrame = noop;

const { Game } = await import('../src/Game.js');
const { Progress } = await import('../src/persistence/Progress.js');
const { MODE } = await import('../src/core/constants.js');
const { SaveManager } = await import('../src/persistence/SaveManager.js');

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

const progress = new Progress();
const g = new Game({ canvas: makeEl(), hudRoot: makeEl(), sprites: {}, progress, onExit: () => {} });
g.newWorld('stone', MODE.SURVIVAL);
ok(`game built; world ${g.world.width}x${g.world.height}, spawn ${JSON.stringify(g.world.spawn)}`);

for (let i = 0; i < 60; i++) g.update(0.016);
if (!(g.player.health > 0)) throw new Error('player died unexpectedly');
ok(`60 ticks run; hp ${g.player.health.toFixed(1)}, onGround ${g.player.onGround}`);

const json = SaveManager.toJSON(g);
const g2 = new Game({ canvas: makeEl(), hudRoot: makeEl(), sprites: {}, progress, onExit: () => {} });
g2.loadSave(json);
if (g2.world.grid.length !== g.world.grid.length) throw new Error('grid length mismatch after load');
let same = true;
for (let i = 0; i < g.world.grid.length; i += 257) if (g2.world.grid[i] !== g.world.grid[i]) { same = false; break; }
if (!same) throw new Error('grid contents mismatch after load');
ok(`save/load round-trip; era ${g2.eraId}, mode ${g2.mode}`);

console.log(`\nAll ${passed} integration checks passed.`);
