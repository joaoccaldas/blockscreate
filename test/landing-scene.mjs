/**
 * LandingScene smoke test: it should construct, draw without throwing on a
 * stubbed 2D context, run a few animated frames, and render a single static
 * frame in reduce-motion mode.
 */
import assert from 'node:assert';

const calls = {};
const noop = () => {};
const ctx = new Proxy({}, { get: (_, k) => {
  if (k === 'createLinearGradient') return () => ({ addColorStop: noop });
  if (k === 'setTransform' || k === 'fillRect' || k === 'beginPath' || k === 'arc' ||
      k === 'fill' || k === 'moveTo' || k === 'lineTo' || k === 'closePath') {
    return (...a) => { calls[k] = (calls[k] || 0) + 1; void a; };
  }
  return () => {};
} });

globalThis.window = { addEventListener: () => {}, removeEventListener: () => {}, devicePixelRatio: 1, innerWidth: 390, innerHeight: 844 };
globalThis.performance = { now: () => Date.now() };
let rafCount = 0;
globalThis.requestAnimationFrame = (fn) => { if (rafCount++ < 3) fn(performance.now() + 16); };

const canvas = {
  width: 0, height: 0,
  getContext: () => ctx,
  getBoundingClientRect: () => ({ width: 390, height: 844 }),
};

const { LandingScene } = await import('../src/ui/LandingScene.js');

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

// Animated mode draws repeatedly without throwing.
const s = new LandingScene(canvas, { reduceMotion: false });
s.start();
assert.ok(calls.fillRect > 0, 'scene painted at least one rect');
assert.ok(canvas.width > 0 && canvas.height > 0, 'canvas got sized');
s.stop();
ok('animated landing scene draws frames without error');

// Reduce-motion renders exactly one static frame (no rAF loop needed).
calls.fillRect = 0; rafCount = 99; // block further rAF
const s2 = new LandingScene(canvas, { reduceMotion: true });
s2.start();
assert.ok(calls.fillRect > 0, 'reduce-motion drew a single static frame');
s2.stop();
ok('reduce-motion renders one static frame');

console.log(`\nAll ${passed} landing-scene checks passed.`);
