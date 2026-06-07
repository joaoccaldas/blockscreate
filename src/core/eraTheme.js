/**
 * Era theming — the data that makes each age look, sound, and feel distinct.
 *
 * The engine (World, Renderer, Game) stays generic; this module is the single
 * place that says "the First-Humans world has wolves at night, drifting embers,
 * and a warm haze" vs "the Industrial world has smog, falling ash, and roaming
 * machines". Adding flavor to an era = editing one entry here.
 *
 * Fields per era:
 *   tint        rgba overlay multiplied over the scene for a signature mood
 *   weather     ambient particle style: 'embers'|'leaves'|'dust'|'snow'|'ash'|'none'
 *   weatherRate particles spawned per second (visual density)
 *   passive     spawn table of harmless animals (weighted)
 *   hostile     spawn table of enemies (weighted); spawn mostly at night
 *   hostileDay  if true, hostiles can also appear in daytime
 *   accent      decoration/foliage accent color used by the renderer
 */
export const ERA_THEME = {
  cell: {
    tint: 'rgba(60, 210, 190, 0.12)',
    weather: 'bubbles',
    weatherRate: 1.8,
    accent: '#55f0d8',
    passive: [['microbe', 3]],
    hostile: [['phage', 1]],
    hostileDay: true,    // microscopic life has no day/night — phages always drift
    hostileChance: 0.3,  // mostly harmless microbes; phages are the minority
    float: true,         // spawn entities in open water, not on the ground
    decorations: [
      { kind: 'bubble', chance: 0.08 },
      { kind: 'vent', chance: 0.018 },
    ],
  },
  stone: {
    tint: 'rgba(120, 110, 40, 0.06)',
    weather: 'leaves',
    weatherRate: 1.4,
    accent: '#6fc04e',
    // The age of dinosaurs: grazers roam by day, predators hunt day and night.
    passive: [['stego', 3], ['trike', 3], ['goat', 2], ['chicken', 1]],
    hostile: [['raptor', 3], ['rex', 1], ['boar', 1]],
    hostileDay: true,
    // Rare meteors streak the sky, building toward an extinction-level event.
    asteroidEvent: true,
    // Surface scenery props, drawn (non-collidable) by the renderer. Each entry:
    // { kind, chance } — chance is per surface column.
    decorations: [
      { kind: 'fern', chance: 0.06 },
      { kind: 'standing_stone', chance: 0.01 },
      { kind: 'bones', chance: 0.02 },
      { kind: 'shrub', chance: 0.03 },
    ],
  },
  // Branch age: a lush, overgrown world. Deep green, heavy foliage, herbivores
  // roam by day; thorny beasts are the threat.
  flora: {
    tint: 'rgba(80, 200, 110, 0.10)',
    weather: 'leaves',
    weatherRate: 2.0,
    accent: '#4fd06a',
    passive: [['stego', 3], ['trike', 3], ['goat', 2], ['chicken', 2]],
    hostile: [['boar', 2], ['raptor', 1]],
    hostileDay: true,
    decorations: [
      { kind: 'fern', chance: 0.12 },
      { kind: 'shrub', chance: 0.08 },
      { kind: 'standing_stone', chance: 0.008 },
    ],
  },
  bronze: {
    tint: 'rgba(210, 170, 90, 0.06)',
    weather: 'dust',
    weatherRate: 1.0,
    accent: '#c89a5c',
    passive: [['cow', 3], ['pig', 2], ['goat', 2], ['chicken', 2]],
    hostile: [['raider', 3], ['wolf', 1]],
    hostileDay: false,
    decorations: [
      { kind: 'pot', chance: 0.03 },
      { kind: 'kiln', chance: 0.01 },
      { kind: 'shrub', chance: 0.03 },
    ],
  },
  iron: {
    tint: 'rgba(90, 100, 120, 0.07)',
    weather: 'none',
    weatherRate: 0,
    accent: '#8c8c8c',
    passive: [['cow', 2], ['goat', 2], ['chicken', 2]],
    hostile: [['raider', 3], ['bandit', 2]],
    hostileDay: false,
    decorations: [
      { kind: 'lamp_post', chance: 0.02 },
      { kind: 'banner', chance: 0.015 },
    ],
  },
  industrial: {
    tint: 'rgba(70, 70, 80, 0.12)',
    weather: 'ash',
    weatherRate: 1.6,
    accent: '#7a7d86',
    passive: [['cow', 1], ['chicken', 2]],
    hostile: [['machine', 3], ['bandit', 2]],
    hostileDay: true,
    decorations: [
      { kind: 'smokestack', chance: 0.018 },
      { kind: 'lamp_post', chance: 0.02 },
      { kind: 'pipe', chance: 0.025 },
    ],
  },
  // Branch age: a prosperous trade reality. Warmer, brighter, clean (no smog);
  // wealth attracts bandits rather than machines.
  republic: {
    tint: 'rgba(214, 184, 110, 0.07)',
    weather: 'leaves',
    weatherRate: 0.7,
    accent: '#d9b25a',
    passive: [['cow', 3], ['goat', 2], ['pig', 2], ['chicken', 2]],
    hostile: [['bandit', 3], ['raider', 1]],
    hostileDay: false,
    decorations: [
      { kind: 'banner', chance: 0.025 },
      { kind: 'lamp_post', chance: 0.018 },
      { kind: 'pot', chance: 0.02 },
    ],
  },
};

export function getEraTheme(id, variant = null) {
  const base = ERA_THEME[id] || ERA_THEME.stone;
  if (!variant) return base;
  const v = ERA_VARIANTS[id]?.[variant];
  return v ? { ...base, ...v } : base;
}

/**
 * Reality variants — a modular "skin" layer over the base era theme so each
 * era × branch (× future universe) combination can look and feel distinct by
 * editing data only. A variant is a *partial* theme: any field it sets overrides
 * the base; everything else is inherited. Adding a new reality = adding an entry
 * here (plus, if you want, world-gen flavor keyed off `world.variant`).
 *
 * Variants are chosen by `pickVariant`: a branch-named variant when the player
 * routed in via that branch, otherwise a seed-derived one so even the very first
 * era differs run to run (and is shareable: "I got the Abyssal start").
 */
export const ERA_VARIANTS = {
  cell: {
    hydrothermal: {
      name: 'Hydrothermal Vents', blurb: 'Born in scalding mineral plumes near the seafloor.',
      tint: 'rgba(255, 120, 50, 0.13)', accent: '#ff8a4a', weather: 'embers', weatherRate: 2.2,
      decorations: [{ kind: 'vent', chance: 0.03 }, { kind: 'bubble', chance: 0.06 }],
    },
    sunlit: {
      name: 'Sunlit Shallows', blurb: 'Drifting in bright, oxygen-rich shallows.',
      tint: 'rgba(120, 230, 255, 0.12)', accent: '#7be4ff', weather: 'bubbles', weatherRate: 2.6,
      decorations: [{ kind: 'bubble', chance: 0.12 }, { kind: 'vent', chance: 0.008 }],
    },
    abyssal: {
      name: 'Abyssal Dark', blurb: 'Adrift in the crushing, lightless deep.',
      tint: 'rgba(40, 50, 130, 0.22)', accent: '#6a7bff', weather: 'bubbles', weatherRate: 1.0,
      decorations: [{ kind: 'vent', chance: 0.022 }, { kind: 'bubble', chance: 0.05 }],
    },
  },
  stone: {
    saurian_echo: { name: 'Saurian Echo', tint: 'rgba(120, 90, 40, 0.10)', accent: '#8a6f3a' },
    firekeepers: { name: 'Firekeepers', tint: 'rgba(200, 90, 40, 0.10)', accent: '#e0762a', weather: 'embers', weatherRate: 1.8 },
  },
};

/** Variant ids available for an era (excluding the implicit prime/base). */
export function variantsFor(id) { return Object.keys(ERA_VARIANTS[id] || {}); }

/** Display info for a variant, or null for the prime/base look. */
export function variantInfo(id, variant) {
  const v = variant && ERA_VARIANTS[id]?.[variant];
  return v ? { id: variant, name: v.name, blurb: v.blurb || '' } : null;
}

/**
 * Choose a reality variant for a fresh world. A branch-named variant wins when
 * the player routed in via that branch; otherwise the era's variants are sampled
 * deterministically from the world seed (so a run's look is fixed + shareable).
 * Returns a variant id or null (the prime/base look).
 */
export function pickVariant(id, { branch = null, seed = 0 } = {}) {
  const variants = variantsFor(id);
  if (!variants.length) return null;
  if (branch && variants.includes(branch)) return branch;
  // Deterministic seed pick so the same seed always yields the same reality.
  return variants[Math.abs(seed >>> 0) % variants.length];
}

/** Pick a weighted key from a [[key, weight], ...] table. */
export function weightedPick(table, rnd = Math.random) {
  let total = 0;
  for (const [, w] of table) total += w;
  let r = rnd() * total;
  for (const [key, w] of table) {
    r -= w;
    if (r <= 0) return key;
  }
  return table.length ? table[0][0] : null;
}
