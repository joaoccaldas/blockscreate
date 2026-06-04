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
};

export function getEraTheme(id) {
  return ERA_THEME[id] || ERA_THEME.stone;
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
