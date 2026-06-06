/**
 * Floating text: world-space reward/damage labels that rise, fade, and expire.
 */
import assert from 'node:assert';
import { FloatingTextLayer } from '../src/systems/FloatingText.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

// --- spawned floaters rise and expire on their own ---
{
  const fx = new FloatingTextLayer();
  fx.add(5, 10, '+5 CP', { color: '#9be86a', life: 0.5 });
  assert.strictEqual(fx.list.length, 1, 'a floater is queued');
  const y0 = fx.list[0].y;
  fx.update(0.1);
  assert.ok(fx.list[0].y < y0, 'the floater rises (y decreases)');
  fx.update(0.5);
  assert.strictEqual(fx.list.length, 0, 'the floater expires after its life');
  ok('floaters rise and expire');
}

// --- text is coerced to a string; defaults are sane ---
{
  const fx = new FloatingTextLayer();
  fx.add(0, 0, 12);
  const f = fx.list[0];
  assert.strictEqual(f.text, '12', 'numeric text is stringified');
  assert.ok(f.color && f.maxLife > 0, 'defaults fill in color + lifetime');
  ok('floater payloads are normalized with sane defaults');
}

// --- the list is capped so a spammy combat scene cannot grow unbounded ---
{
  const fx = new FloatingTextLayer();
  for (let i = 0; i < 200; i++) fx.add(i, 0, `-${i}`);
  assert.ok(fx.list.length <= 61, 'the floater list is capped');
  ok('floater count is bounded (no runaway growth)');
}

console.log(`\nAll ${passed} floating-text checks passed.`);
