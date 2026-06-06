/**
 * Reality codes: a deterministic, shareable handle for one exact world.
 * Round-trips, tolerates junk, and only ever lands players in real eras.
 */
import assert from 'node:assert';
import { encodeReality, decodeReality, realityUrl, parseRealityFromUrl } from '../src/core/RealityCode.js';
import { variantsFor } from '../src/core/eraTheme.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

// --- round-trip preserves the reality ---
{
  const r = { seed: 123456789, era: 'cell', variant: 'sunlit', mode: 'survival' };
  const code = encodeReality(r);
  const back = decodeReality(code);
  assert.strictEqual(back.seed, r.seed, 'seed round-trips');
  assert.strictEqual(back.era, r.era, 'era round-trips');
  assert.strictEqual(back.variant, r.variant, 'variant round-trips');
  assert.strictEqual(back.mode, r.mode, 'mode round-trips');
  ok('a reality round-trips through encode → decode');
}

// --- the code is compact and stable for a given reality (shareable) ---
{
  const a = encodeReality({ seed: 42, era: 'iron', mode: 'creative' });
  const b = encodeReality({ seed: 42, era: 'iron', mode: 'creative' });
  assert.strictEqual(a, b, 'the same reality always encodes to the same code');
  assert.ok(a.length < 40, `the code is short and shareable (${a})`);
  assert.ok(a.startsWith('R1.'), 'the code is versioned');
  ok('codes are deterministic, short, and versioned');
}

// --- creative vs survival is preserved ---
{
  assert.strictEqual(decodeReality(encodeReality({ seed: 7, era: 'bronze', mode: 'creative' })).mode, 'creative', 'creative mode survives');
  assert.strictEqual(decodeReality(encodeReality({ seed: 7, era: 'bronze' })).mode, 'survival', 'survival is the default');
  ok('mode survives the round-trip');
}

// --- no variant encodes/decodes cleanly ---
{
  const code = encodeReality({ seed: 9, era: 'iron' });
  assert.strictEqual(decodeReality(code).variant, null, 'absent variant decodes to null');
  ok('a reality with no variant round-trips as null');
}

// --- decoding is tolerant: junk and bad eras never throw, return null ---
{
  assert.strictEqual(decodeReality('not a code'), null, 'garbage → null');
  assert.strictEqual(decodeReality('R1.zz.notanera.-.s'), null, 'unknown era → null');
  assert.strictEqual(decodeReality('R1.zz.electric.-.s'), null, 'unimplemented era → null (no dead ends)');
  assert.strictEqual(decodeReality(''), null, 'empty → null');
  assert.strictEqual(decodeReality(null), null, 'non-string → null');
  ok('invalid codes decode to null instead of crashing');
}

// --- an unknown variant on a real era is tolerated (dropped), not fatal ---
{
  const decoded = decodeReality('R1.5.cell.bogus_variant.s');
  assert.ok(decoded && decoded.era === 'cell', 'a real era with a stale variant still decodes');
  assert.strictEqual(decoded.variant, null, 'the unknown variant is dropped, not kept');
  // and a real variant is kept
  const realV = variantsFor('cell')[0];
  assert.strictEqual(decodeReality(`R1.5.cell.${realV}.s`).variant, realV, 'a known variant is preserved');
  ok('variant drift is tolerated (forward/backward compatible)');
}

// --- URL helpers ---
{
  const code = encodeReality({ seed: 99, era: 'stone', variant: 'firekeepers' });
  const url = realityUrl(code, 'https://example.com/play');
  assert.ok(url.includes('?r='), 'the URL carries the code as ?r=');
  const fromUrl = parseRealityFromUrl(`?foo=1&r=${encodeURIComponent(code)}&bar=2`);
  assert.strictEqual(fromUrl.era, 'stone', 'a reality parses back out of a URL query');
  assert.strictEqual(fromUrl.variant, 'firekeepers', 'the variant survives the URL round-trip');
  assert.strictEqual(parseRealityFromUrl('?nothing=here'), null, 'no code in the URL → null');
  ok('reality codes travel cleanly through a share URL');
}

console.log(`\nAll ${passed} reality-code checks passed.`);
