import assert from 'node:assert';
import { World } from '../src/world/World.js';
import { Mob, MOB_TYPES } from '../src/entities/Mob.js';
import { getEraTheme } from '../src/core/eraTheme.js';
import { isSolid } from '../src/core/blocks.js';

const t = getEraTheme('cell');
assert.ok(t.float, 'cell theme floats');
for (const [m] of [...t.passive, ...t.hostile]) assert.ok(MOB_TYPES[m], `mob ${m} exists`);
assert.ok(MOB_TYPES.phage.float && MOB_TYPES.phage.hostile, 'phage floats + hostile');
console.log('  ok: cell theme spawns microbe + phage (float)');

const w = new World({ seed: 5, eraId: 'cell', width: 40, height: 40 });
w.generate();
let ox = 20, oy = 8;
outer: for (let y = 2; y < w.height - 2; y++) for (let x = 10; x < 30; x++) if (!isSolid(w.get(x, y))) { ox = x; oy = y; break outer; }
const phage = new Mob('phage', ox + 4 + 0.5, oy + 0.5);
const target = { x: ox + 0.5, y: oy + 1.5, h: 1 };
let sapped = false;
for (let i = 0; i < 300; i++) { const r = phage.update(0.05, w, target); if (r && r.sap) { sapped = true; break; } }
assert.ok(sapped, 'phage produced a sap contact event near the cell');
console.log('  ok: phage homes in and saps on contact');

const microbe = new Mob('microbe', ox + 0.5, oy + 0.5);
let aggressive = false;
for (let i = 0; i < 100; i++) if (microbe.update(0.05, w, target)) aggressive = true;
assert.ok(!aggressive, 'passive microbe never attacks');
console.log('  ok: microbe is harmless ambient life');
console.log('PHAGE TEST OK');
