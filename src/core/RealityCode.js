/**
 * Reality codes — a short, shareable handle for one exact world.
 *
 * Everything that defines a run's *reality* is deterministic: the world seed
 * fixes the terrain, the era fixes the age, and the variant (itself seed- or
 * branch-derived) fixes the look. So a whole reality compresses to a tiny code
 * a player can copy, paste, or put in a URL — and a friend lands in the same
 * world. This is the seed-sharing loop, made era- and branch-aware.
 *
 * Format (v1):  R1.<seed base36>.<era>.<variant|->.<mode s|c>
 *   e.g.  R1.2gk4f9.cell.sunlit.s   or   R1.9x12.iron.-.c
 * Five fixed, dot-separated fields → unambiguous and human-readable. Decoding is
 * tolerant: unknown/unimplemented eras or variants are rejected/ignored rather
 * than throwing, so a bad code never crashes the app.
 */
import { ERA_NODES } from './eraGraph.js';
import { variantsFor } from './eraTheme.js';

const PREFIX = 'R1';

export function encodeReality({ seed = 0, era = 'cell', variant = null, mode = 'survival' } = {}) {
  const s = (seed >>> 0).toString(36);
  const v = variant || '-';
  const m = mode === 'creative' ? 'c' : 's';
  return [PREFIX, s, era, v, m].join('.');
}

/** Decode a code into { seed, era, variant, mode }, or null if invalid. */
export function decodeReality(code) {
  if (typeof code !== 'string') return null;
  const parts = code.trim().split('.');
  if (parts.length !== 5 || parts[0].toUpperCase() !== PREFIX) return null;
  const seed = parseInt(parts[1], 36);
  if (!Number.isFinite(seed)) return null;
  const era = parts[2];
  if (!ERA_NODES[era]?.implemented) return null; // only land players in real eras
  let variant = parts[3] === '-' ? null : parts[3];
  if (variant && !variantsFor(era).includes(variant)) variant = null; // tolerate drift
  const mode = parts[4] === 'c' ? 'creative' : 'survival';
  return { seed: seed >>> 0, era, variant, mode };
}

/** A clickable share URL (?r=CODE) for the current page. */
export function realityUrl(code, base = null) {
  const root = base
    || (typeof location !== 'undefined' ? location.origin + location.pathname : '');
  return `${root}?r=${encodeURIComponent(code)}`;
}

/** Pull a reality out of a URL query string (defaults to the live location). */
export function parseRealityFromUrl(search = null) {
  const q = search != null ? search : (typeof location !== 'undefined' ? location.search : '');
  const m = /[?&]r=([^&]+)/.exec(q || '');
  return m ? decodeReality(decodeURIComponent(m[1])) : null;
}
