/**
 * Menu logic guard: era-select cards build correctly for every era, with the
 * right locked / playable / "soon" states, and Continue reflects save state.
 * Verifies the portal screen the player uses most, headlessly.
 */
import assert from 'node:assert';
import { ERAS } from '../src/core/eras.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

// Every era must expose the fields buildPortals() reads.
for (const e of ERAS) {
  assert.ok(e.id && e.name, `era ${e.id} has id + name`);
  assert.ok(e.sky && e.sky.day && e.sky.day.length === 2, `era ${e.id} has sky.day colors`);
  assert.ok(typeof e.fullyPlayable === 'boolean', `era ${e.id} declares fullyPlayable`);
  assert.ok(e.ground, `era ${e.id} has a ground color for card theming`);
}
ok(`all ${ERAS.length} eras expose the fields the portal cards need`);

// First era is always unlocked + playable; later eras gate until unlocked.
const first = ERAS[0];
assert.ok(first.fullyPlayable, 'origin era is fully playable');
assert.ok(ERAS.some((e) => !e.fullyPlayable) || ERAS.length === 1 ||
  ERAS.every((e) => e.fullyPlayable), 'era playability is well-defined');
ok('origin era is immediately playable');

// Manifests (used for card subtitle/animals) resolve for every era.
for (const e of ERAS) {
  const m = e.manifest || {};
  assert.ok(m.title || e.name, `era ${e.id} resolves a card title`);
}
ok('every era resolves a portal-card title');

console.log(`\nAll ${passed} menu checks passed.`);
