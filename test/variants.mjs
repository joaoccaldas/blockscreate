/**
 * Reality variants: a modular skin layer over the base era theme so each
 * era × branch (× future universe) can differ by editing data only.
 */
import assert from 'node:assert';
import {
  getEraTheme, getEraUI, ERA_VARIANTS, variantsFor, variantInfo, pickVariant,
} from '../src/core/eraTheme.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

// --- a variant is a partial override; unset fields inherit the base ---
{
  const base = getEraTheme('cell');
  const sunlit = getEraTheme('cell', 'sunlit');
  assert.notStrictEqual(sunlit.tint, base.tint, 'the variant overrides the tint');
  assert.notStrictEqual(sunlit.accent, base.accent, 'the variant overrides the accent');
  assert.deepStrictEqual(sunlit.passive, base.passive, 'unset fields inherit from the base theme');
  assert.ok(sunlit.float, 'inherited gameplay flags survive the merge');
  ok('a variant overrides only the fields it sets, inheriting the rest');
}

// --- unknown era / variant falls back gracefully (never throws) ---
{
  assert.ok(getEraTheme('cell', 'does_not_exist').tint, 'unknown variant falls back to the base theme');
  assert.ok(getEraTheme('nope').tint, 'unknown era falls back to a default theme');
  assert.strictEqual(getEraTheme('cell', null).tint, getEraTheme('cell').tint, 'no variant = base theme');
  ok('missing eras/variants fall back to a base theme (engine never breaks)');
}

// --- seed pick is deterministic: a run\'s look is fixed and shareable ---
{
  const a = pickVariant('cell', { seed: 12345 });
  const b = pickVariant('cell', { seed: 12345 });
  assert.strictEqual(a, b, 'the same seed always yields the same reality variant');
  assert.ok(variantsFor('cell').includes(a), 'the pick is a real variant of the era');
  // Different seeds should be able to produce different variants (variety).
  const seen = new Set();
  for (let s = 0; s < 60; s++) seen.add(pickVariant('cell', { seed: s }));
  assert.ok(seen.size >= 2, 'different seeds produce varied first-era realities');
  ok('seed-derived variants are deterministic yet varied (replayable first era)');
}

// --- a branch-named variant wins over the seed pick when routed in ---
{
  const v = pickVariant('stone', { branch: 'firekeepers', seed: 1 });
  assert.strictEqual(v, 'firekeepers', 'routing in via a branch selects its matching variant');
  const fallback = pickVariant('stone', { branch: 'no_such_branch', seed: 1 });
  assert.ok(variantsFor('stone').includes(fallback), 'an unmatched branch falls back to a seed pick');
  ok('branch-named variants are chosen when the player routes in via that branch');
}

// --- eras with no variants simply return null (prime/base look) ---
{
  assert.strictEqual(pickVariant('bronze', { seed: 5 }), null, 'an era without variants has no variant');
  assert.deepStrictEqual(variantsFor('bronze'), [], 'and reports an empty variant list');
  ok('eras without variants stay on the base look (incremental adoption)');
}

// --- variantInfo gives display data for the intro, null for prime ---
{
  const info = variantInfo('cell', 'abyssal');
  assert.ok(info && info.name && info.blurb, 'variantInfo returns name + blurb for the intro');
  assert.strictEqual(variantInfo('cell', null), null, 'no variant = no info (prime look)');
  ok('variantInfo surfaces a shareable name for each reality');
}

// --- structural integrity: every variant carries a display name ---
for (const [era, variants] of Object.entries(ERA_VARIANTS)) {
  for (const [id, v] of Object.entries(variants)) {
    assert.ok(v.name, `${era}/${id} variant has a display name`);
  }
}
ok('every defined variant is named (ready to surface in UI)');

const uiSigs = new Set(['cell', 'stone', 'flora', 'bronze', 'iron', 'industrial', 'republic']
  .map((id) => JSON.stringify(getEraUI(id))));
assert.strictEqual(uiSigs.size, 7, 'every age should expose a distinct UI presentation');
assert.notStrictEqual(getEraUI('cell', 'abyssal').panel, getEraUI('cell', 'sunlit').panel,
  'reality variants should alter the interface, not only the world');
ok('each age and named reality carries its own interface art direction');

console.log(`\nAll ${passed} variant checks passed.`);
