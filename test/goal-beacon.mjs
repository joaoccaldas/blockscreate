/**
 * Goal beacon: the Game points new players at the nearest era-relevant resource.
 * Tests the pure target-finding (the renderer arrow is drawn separately).
 */
import assert from 'node:assert';
import { World } from '../src/world/World.js';
import { blockId, AIR } from '../src/core/blocks.js';
import { MODE } from '../src/core/constants.js';

// Reuse the integration harness's headless Game bootstrap.
const store = {}; const noop = () => {};
function makeEl() { return { children: [], dataset: {}, style: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, appendChild(c) { this.children.push(c); return c; }, remove: noop, addEventListener: noop, removeEventListener: noop, setAttribute: noop, getContext: () => new Proxy({}, { get: () => noop }), getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }), querySelector: () => makeEl(), querySelectorAll: () => [], click: noop, width: 800, height: 600, set onclick(v) {}, set onchange(v) {}, set oninput(v) {}, set innerHTML(v) { this.children = []; }, set textContent(v) {} }; }
globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
Object.defineProperty(globalThis, 'navigator', { value: { maxTouchPoints: 0 }, configurable: true });
globalThis.window = { addEventListener: noop, removeEventListener: noop, devicePixelRatio: 1, AudioContext: undefined };
globalThis.document = { createElement: makeEl, body: makeEl(), getElementById: makeEl, querySelector: () => makeEl(), addEventListener: noop, removeEventListener: noop, hidden: false };
globalThis.Image = class { set src(v) {} };
globalThis.performance = { now: () => Date.now() };
globalThis.requestAnimationFrame = noop;

const { Game } = await import('../src/Game.js');
const { Progress } = await import('../src/persistence/Progress.js');
const { Settings } = await import('../src/persistence/Settings.js');
const { Audio } = await import('../src/systems/Audio.js');

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };
const settings = new Settings();
const mk = () => new Game({ canvas: makeEl(), hudRoot: makeEl(), sprites: {}, progress: new Progress(), settings, audio: new Audio({ sound: false, music: false }), onExit: noop });

// --- cell era beacon points at the nearest nutrient ---
{
  const g = mk();
  g.newWorld('cell', MODE.SURVIVAL);
  // Clear a pocket and drop one nutrient a few tiles away.
  const px = Math.round(g.player.x); const py = Math.round(g.player.y - g.player.h / 2);
  for (let y = py - 6; y <= py + 6; y++) for (let x = px - 6; x <= px + 6; x++) g.world.set(x, y, AIR);
  g.world.set(px + 4, py, blockId('nutrient_blob'));
  const t = g._goalTarget();
  assert.ok(t, 'cell era produces a goal target');
  assert.ok(Math.abs(t.x - (px + 4 + 0.5)) < 0.01 && t.icon === '🫧', 'it points at the nutrient');
  ok('cell beacon points at the nearest nutrient');
}

// --- later era beacon points at an era-relevant resource ---
{
  const g = mk();
  g.newWorld('iron', MODE.SURVIVAL);
  const px = Math.round(g.player.x); const py = Math.round(g.player.y - g.player.h / 2);
  for (let y = py - 8; y <= py + 8; y++) for (let x = px - 8; x <= px + 8; x++) g.world.set(x, y, AIR);
  g.world.set(px + 5, py, blockId('iron_ore'));
  const t = g._goalTarget();
  assert.ok(t && Math.abs(t.x - (px + 5 + 0.5)) < 0.01, 'iron era beacon finds the iron ore');
  ok('later-era beacon points at an era-relevant resource');
}

// --- no target when nothing relevant is near → beacon simply hides ---
{
  const g = mk();
  g.newWorld('iron', MODE.SURVIVAL);
  const px = Math.round(g.player.x); const py = Math.round(g.player.y - g.player.h / 2);
  for (let y = py - 30; y <= py + 30; y++) for (let x = px - 30; x <= px + 30; x++) g.world.set(x, y, AIR);
  assert.strictEqual(g._goalTarget(), null, 'no relevant resource nearby → null target');
  ok('beacon yields no target when nothing relevant is in range');
}

// --- creative mode has no goal beacon ---
{
  const g = mk();
  g.newWorld('iron', MODE.CREATIVE);
  assert.strictEqual(g._goalTarget(), null, 'creative mode has no goal beacon');
  ok('creative mode shows no goal beacon');
}

console.log(`\nAll ${passed} goal-beacon checks passed.`);
