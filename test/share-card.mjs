/**
 * Share card: pure card data from game state + drawing that never throws on a
 * 2D context, and a share/download path tolerant of missing platform APIs.
 */
import assert from 'node:assert';
import { shareCardData, drawShareCard, composeShareCardCanvas, shareCardImage } from '../src/ui/ShareCard.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

// A minimal game stub the card reads from.
function stubGame() {
  return {
    eraId: 'stone',
    mode: 'survival',
    world: { seed: 12345, variant: 'firekeepers' },
    civ: { cp: 240, totalMined: 33 },
    clues: { count: () => 2 },
    timeline: { divergedCount: () => 1 },
    achievements: { count: () => 4 },
    realityPath: [{ to: 'stone' }],
  };
}

// --- pure data carries the playable code + stats ---
{
  const d = shareCardData(stubGame());
  assert.ok(d.code.startsWith('R1.'), 'card includes a reality code');
  assert.ok(d.url.includes('?r='), 'card includes a play URL');
  assert.ok(d.eraName, 'card names the era/variant');
  assert.ok(d.colors.a && d.colors.accent, 'card derives era colors');
  assert.ok(d.stats.length >= 4 && d.stats.every((s) => s.label && s.value != null), 'card lists labeled stats');
  ok('share-card data carries a playable code, colors, and stats');
}

// --- drawing never throws on a stub 2D context ---
{
  const calls = {};
  const grad = { addColorStop: () => {} };
  const ctx = new Proxy({}, { get: (_, k) => {
    if (k === 'createLinearGradient') return () => grad;
    return (...a) => { calls[k] = (calls[k] || 0) + 1; void a; };
  } });
  assert.doesNotThrow(() => drawShareCard(ctx, 600, 800, shareCardData(stubGame())), 'drawShareCard runs');
  assert.ok(calls.fillRect > 0 && calls.fillText > 0, 'it painted rects + text');
  ok('the card draws on a 2D context without throwing');
}

// --- compose builds a canvas via an injected document ---
{
  const grad = { addColorStop: () => {} };
  const fakeCanvas = { width: 0, height: 0, getContext: () => new Proxy({}, { get: (_, k) => (k === 'createLinearGradient' ? () => grad : () => {}) }) };
  const doc = { createElement: () => fakeCanvas };
  const canvas = composeShareCardCanvas(shareCardData(stubGame()), doc, 600, 800);
  assert.strictEqual(canvas.width, 600, 'canvas sized');
  assert.strictEqual(canvas.height, 800, 'canvas sized');
  ok('composeShareCardCanvas builds a sized canvas');
}

// --- share path falls back to download when Web Share is unavailable ---
{
  let downloaded = false;
  const blob = {};
  const fakeCanvas = { toBlob: (cb) => cb(blob) };
  const a = { click: () => { downloaded = true; }, remove: () => {} };
  const doc = { createElement: () => a, body: { appendChild: () => {} } };
  globalThis.URL = { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} };
  shareCardImage(fakeCanvas, 'hi', { nav: {}, doc }); // nav has no share()
  assert.ok(downloaded, 'with no Web Share, the image downloads');
  ok('share gracefully falls back to download');
}

// --- missing document/canvas never throws ---
{
  assert.strictEqual(composeShareCardCanvas(shareCardData(stubGame()), null), null, 'no document → null, no throw');
  ok('compose tolerates a missing document');
}

console.log(`\nAll ${passed} share-card checks passed.`);
