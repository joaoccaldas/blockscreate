/**
 * Haptics: named patterns vibrate when enabled + supported, and are a safe
 * no-op otherwise (desktop, disabled, or unknown event).
 */
import assert from 'node:assert';
import { Haptics, PATTERNS } from '../src/systems/Haptics.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

function fakeNav() {
  const calls = [];
  return { calls, vibrate: (p) => { calls.push(p); return true; } };
}

// --- buzz issues the mapped pattern when enabled + supported ---
{
  const nav = fakeNav();
  const h = new Haptics(true, nav);
  assert.ok(h.supported, 'reports supported when navigator.vibrate exists');
  assert.ok(h.buzz('mine'), 'a known event buzzes');
  assert.deepStrictEqual(nav.calls[0], PATTERNS.mine, 'it issues the mapped pattern');
  h.buzz('unlock');
  assert.deepStrictEqual(nav.calls[1], PATTERNS.unlock, 'patterns can be arrays');
  ok('known events vibrate with their mapped pattern');
}

// --- disabled / unknown / unsupported are safe no-ops ---
{
  const nav = fakeNav();
  const h = new Haptics(false, nav);
  assert.strictEqual(h.buzz('mine'), false, 'disabled → no vibration');
  assert.strictEqual(nav.calls.length, 0, 'nothing was issued while disabled');
  h.setEnabled(true);
  assert.strictEqual(h.buzz('not_a_real_event'), false, 'unknown event → no-op');
  ok('disabled and unknown events do nothing');
}

// --- no navigator.vibrate (desktop) → safe no-op, not a crash ---
{
  const h = new Haptics(true, {}); // navigator without vibrate
  assert.ok(!h.supported, 'reports unsupported without navigator.vibrate');
  assert.strictEqual(h.buzz('hurt'), false, 'unsupported platform → no-op');
  const h2 = new Haptics(true, null); // no navigator at all
  assert.doesNotThrow(() => h2.buzz('hurt'), 'no navigator → no crash');
  ok('platforms without vibration degrade gracefully');
}

// --- a throwing vibrate is swallowed ---
{
  const h = new Haptics(true, { vibrate: () => { throw new Error('blocked'); } });
  assert.strictEqual(h.buzz('mine'), false, 'a throwing vibrate is caught');
  ok('vibration errors are swallowed');
}

console.log(`\nAll ${passed} haptics checks passed.`);
