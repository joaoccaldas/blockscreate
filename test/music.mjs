/**
 * Per-era music: every implemented era has a palette, and the audio API is safe
 * to drive with no AudioContext (headless / sound off).
 */
import assert from 'node:assert';
import { Audio, MUSIC } from '../src/systems/Audio.js';
import { ERA_NODES } from '../src/core/eraGraph.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

// --- every implemented era has a music palette ---
{
  const implemented = Object.entries(ERA_NODES).filter(([, n]) => n.implemented).map(([k]) => k);
  for (const id of implemented) {
    const p = MUSIC[id];
    assert.ok(p, `era ${id} has a music palette`);
    assert.ok(Array.isArray(p.chord) && p.chord.length >= 3, `${id} palette has a drone chord`);
    assert.ok(Array.isArray(p.scale) && p.scale.length >= 3, `${id} palette has a melody scale`);
    assert.ok(Array.isArray(p.every) && p.every[0] < p.every[1], `${id} palette has a motif cadence`);
  }
  ok('every implemented era has a distinct music palette');
}

// --- palettes differ between ages (it actually sounds different) ---
{
  const sig = (id) => MUSIC[id].chord.join(',') + '|' + MUSIC[id].scale.join(',');
  const sigs = new Set(['cell', 'stone', 'bronze', 'iron', 'industrial', 'republic'].map(sig));
  assert.ok(sigs.size >= 5, 'eras have meaningfully different palettes');
  ok('era palettes are distinct, not a single reused drone');
}

// --- the audio API is safe with no AudioContext (no window in Node) ---
{
  const a = new Audio({ sound: false, music: false });
  assert.doesNotThrow(() => a.setEra('industrial'), 'setEra is safe with no context');
  assert.strictEqual(a.currentEra, 'industrial', 'setEra still records the current era for when music starts');
  assert.doesNotThrow(() => a.stopMusic(), 'stopMusic is safe when nothing is playing');
  assert.doesNotThrow(() => a.setEra(null), 'setEra tolerates a null era');
  ok('audio era control is crash-proof headless / with sound off');
}

console.log(`\nAll ${passed} music checks passed.`);
