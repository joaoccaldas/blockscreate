/**
 * The Era Graph — the branching map of ages, encoded as data.
 *
 * This is the canonical structure described in docs/ERA_GRAPH.md and guarded by
 * test/era-graph.mjs. Ages form a directed graph of realities, not a line:
 *
 *   - prime  : the default spine; exactly one per non-terminal implemented era.
 *   - branch : taken only when the player's dominant reality branch matches AND
 *              the destination is implemented.
 *   - cross  : "realities meet" links, realized by Timeline/Simulation bleeds
 *              (they enrich the current age, never move the player).
 *
 * Routing always falls back to the prime spine when a branch destination is not
 * yet implemented, so a partial graph is always playable: the future is encoded
 * here but never blocks the present.
 */

// tier = depth from origin. implemented = has a real world in src/core/eras.js.
// Future nodes carry name/icon so the roadmap can be shown before they ship.
export const ERA_NODES = {
  // --- implemented prime spine ---
  cell: { tier: 0, implemented: true },
  stone: { tier: 1, implemented: true },
  bronze: { tier: 2, implemented: true },
  iron: { tier: 3, implemented: true },
  industrial: { tier: 4, implemented: true },
  // --- roadmap: prime spine continues ---
  electric: { tier: 5, implemented: false, name: 'Electric Age', icon: '⚡' },
  information: { tier: 6, implemented: false, name: 'Information Age', icon: '💾' },
  space: { tier: 7, implemented: false, name: 'Space Age', icon: '🚀' },
  synthetic: { tier: 8, implemented: false, name: 'Synthetic Age', icon: '🧠' },
  simulation: { tier: 9, implemented: false, name: 'Simulation Age', icon: '🌌' },
  stack: { tier: 10, implemented: false, name: 'The Stack', icon: '♾️' },
  // --- roadmap: branch ages ---
  flora: { tier: 1, implemented: true, name: 'Age of Flora', icon: '🌿' },
  republic: { tier: 4, implemented: true, name: 'Trade Republic', icon: '🏛️' },
  arcanum: { tier: 5, implemented: false, name: 'Steam Arcanum', icon: '🜨' },
  bio: { tier: 8, implemented: false, name: 'Bio-Singularity', icon: '🧬' },
};

// from -> [{ to, prime } | { to, branch }]
export const ERA_ROUTES = {
  cell: [{ to: 'stone', prime: true }, { to: 'flora', branch: 'photic' }],
  stone: [{ to: 'bronze', prime: true }],
  bronze: [{ to: 'iron', prime: true }],
  iron: [
    { to: 'industrial', prime: true },
    { to: 'republic', branch: 'merchant_city' },
    { to: 'republic', branch: 'road_empire' },
  ],
  industrial: [{ to: 'electric', prime: true }, { to: 'arcanum', branch: 'firekeepers' }],
  electric: [{ to: 'information', prime: true }],
  information: [{ to: 'space', prime: true }, { to: 'bio', branch: 'saurian_echo' }],
  space: [{ to: 'synthetic', prime: true }],
  synthetic: [{ to: 'simulation', prime: true }],
  simulation: [{ to: 'stack', prime: true }],
  // branch ages rejoin the spine
  flora: [{ to: 'bronze', prime: true }],
  republic: [{ to: 'information', prime: true }],
  arcanum: [{ to: 'information', prime: true }],
  bio: [{ to: 'simulation', prime: true }],
};

const isImplemented = (id) => !!ERA_NODES[id]?.implemented;

/** The prime-spine successor that is implemented, or null (terminal). */
export function primeNextId(eraId) {
  const r = (ERA_ROUTES[eraId] || []).find((e) => e.prime && isImplemented(e.to));
  return r ? r.to : null;
}

/**
 * Choose the next era to advance into. A matching, implemented branch route wins;
 * otherwise the prime spine; otherwise any implemented route; otherwise null.
 * @param {string} eraId
 * @param {{branch?: string}} ctx the player's dominant reality branch
 */
export function chooseNextEra(eraId, { branch } = {}) {
  const routes = ERA_ROUTES[eraId] || [];
  if (branch) {
    const m = routes.find((r) => r.branch === branch && isImplemented(r.to));
    if (m) return m.to;
  }
  const prime = routes.find((r) => r.prime && isImplemented(r.to));
  if (prime) return prime.to;
  const any = routes.find((r) => isImplemented(r.to));
  return any ? any.to : null;
}

/** The prime-spine era ids, walked from the origin via prime edges. */
export function spineEraIds() {
  const s = new Set(['cell']);
  let cur = 'cell';
  for (let i = 0; i < 64; i++) {
    const n = primeNextId(cur);
    if (!n || s.has(n)) break;
    s.add(n);
    cur = n;
  }
  return s;
}

/** Is this a branch (off-spine) era — a surprise reached by routing, not picking? */
export function isBranchEra(id) {
  return !!ERA_NODES[id] && !spineEraIds().has(id);
}

/** All routes leaving an era (implemented or not) — for the roadmap/journal. */
export function routesFrom(eraId) {
  return ERA_ROUTES[eraId] || [];
}

/** Branch ids referenced by any route (for validation). */
export function routeBranchIds() {
  const out = new Set();
  for (const routes of Object.values(ERA_ROUTES)) {
    for (const r of routes) if (r.branch) out.add(r.branch);
  }
  return out;
}
