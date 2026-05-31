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
  stone: {
    tint: 'rgba(120, 90, 40, 0.05)',
    weather: 'leaves',
    weatherRate: 1.2,
    accent: '#6fc04e',
    passive: [['goat', 3], ['pig', 2], ['chicken', 2], ['cow', 1]],
    hostile: [['wolf', 3], ['boar', 2]],
    hostileDay: false,
  },
  bronze: {
    tint: 'rgba(210, 170, 90, 0.06)',
    weather: 'dust',
    weatherRate: 1.0,
    accent: '#c89a5c',
    passive: [['cow', 3], ['pig', 2], ['goat', 2], ['chicken', 2]],
    hostile: [['raider', 3], ['wolf', 1]],
    hostileDay: false,
  },
  iron: {
    tint: 'rgba(90, 100, 120, 0.07)',
    weather: 'none',
    weatherRate: 0,
    accent: '#8c8c8c',
    passive: [['cow', 2], ['goat', 2], ['chicken', 2]],
    hostile: [['raider', 3], ['bandit', 2]],
    hostileDay: false,
  },
  industrial: {
    tint: 'rgba(70, 70, 80, 0.12)',
    weather: 'ash',
    weatherRate: 1.6,
    accent: '#7a7d86',
    passive: [['cow', 1], ['chicken', 2]],
    hostile: [['machine', 3], ['bandit', 2]],
    hostileDay: true,
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
