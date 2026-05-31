/**
 * Tiny seeded value-noise + PRNG.
 *
 * Self-contained so world generation is deterministic from a single seed,
 * which is essential for reproducible worlds and compact saves (we only need
 * to store the seed plus the player's edits).
 */

/** Mulberry32 PRNG: fast, seedable, good enough for terrain. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash1(x, seed) {
  let h = Math.imul(x ^ seed, 2654435761);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

/** 1D value noise in [0,1]. */
export function valueNoise1D(x, seed) {
  const xi = Math.floor(x);
  const xf = x - xi;
  const a = hash1(xi, seed);
  const b = hash1(xi + 1, seed);
  return a + (b - a) * smooth(xf);
}

/** Layered 1D noise (fractal Brownian motion) -> smooth rolling hills. */
export function fbm1D(x, seed, octaves = 4, lacunarity = 2, gain = 0.5) {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise1D(x * freq, seed + o * 1013);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/** 2D-ish hash for ore/cave scattering. */
export function hash2(x, y, seed) {
  let h = Math.imul(x * 374761393 + y * 668265263 ^ seed, 1274126177);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}
