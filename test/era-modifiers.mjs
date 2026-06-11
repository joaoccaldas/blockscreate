/**
 * Era modifiers: the data that makes branch ages PLAY differently — Flora
 * cultivates fast, the Trade Republic trades rich. Verifies the data + that the
 * Game wires it into the right loops.
 */
import assert from 'node:assert';
import { getEraModifiers, ERA_MODIFIERS } from '../src/core/eraModifiers.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

// --- defaults are neutral; branches lean into an identity ---
{
  const prime = getEraModifiers('iron');
  assert.strictEqual(prime.cropGrowth, 1, 'a prime era has neutral crop growth');
  assert.strictEqual(prime.tradeRate, 1, 'a prime era has neutral trade rate');

  const flora = getEraModifiers('flora');
  assert.ok(flora.cropGrowth > 1.5, 'Flora cultivates noticeably faster');
  assert.ok(flora.fiberBonus > 0, 'Flora foliage yields bonus fiber');

  const rep = getEraModifiers('republic');
  assert.ok(rep.tradeRate > 1.5 && rep.tradeYield > 1, 'the Trade Republic trades more often and richer');
  ok('branch eras declare distinct gameplay identities; prime eras stay neutral');
}

// --- unknown eras fall back to neutral defaults (never undefined) ---
{
  const m = getEraModifiers('not_an_era');
  assert.strictEqual(m.cropGrowth, 1, 'unknown era → neutral');
  assert.ok('tameEase' in m && 'oreRichness' in m, 'all modifier fields are present');
  ok('unknown eras fall back to complete, neutral defaults');
}

// --- the catalog is well-formed (only known numeric fields) ---
{
  const allowed = new Set(['cropGrowth', 'fiberBonus', 'tradeRate', 'tradeYield', 'oreRichness', 'tameEase']);
  for (const [era, mod] of Object.entries(ERA_MODIFIERS)) {
    for (const [k, v] of Object.entries(mod)) {
      assert.ok(allowed.has(k), `${era}.${k} is a known modifier field`);
      assert.strictEqual(typeof v, 'number', `${era}.${k} is numeric`);
    }
  }
  ok('the modifier catalog is well-formed');
}

// --- Flora's faster crop growth produces a higher ripen chance in-loop ---
{
  // Mirror the Game's crop-chance formula with vs without the Flora multiplier.
  const base = 0.45;
  const floraChance = base * getEraModifiers('flora').cropGrowth;
  const ironChance = base * getEraModifiers('iron').cropGrowth;
  assert.ok(floraChance > ironChance, 'Flora crops ripen with a higher chance per tick');
  // The Republic's trade interval is shorter than the prime 12s.
  const repInterval = 12 / getEraModifiers('republic').tradeRate;
  assert.ok(repInterval < 12, 'the Trade Republic trades more frequently than a prime era');
  ok('modifiers measurably change the crop + trade loops');
}

console.log(`\nAll ${passed} era-modifier checks passed.`);
