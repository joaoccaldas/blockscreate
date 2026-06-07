/**
 * Map of Space & Time — a redacted atlas of the era graph.
 *
 * "Space" = the realities (era-graph nodes); "Time" = the ages (tiers) and the
 * route the player has actually walked. It shows where you've been, where you
 * are, the immediate ages you can reach — and, as fog, that *other paths exist*
 * (redacted ??? branches) without naming the future. A deeper "leakage" layer
 * (divergence, crossovers, the nested-simulation stack) only surfaces once
 * reality has begun to bend, so the mystery is preserved and discovery is the
 * reward.
 *
 * Pure: state in → render model out. The HUD draws it; this never touches DOM.
 */
import { ERA_NODES, ERA_ROUTES } from '../core/eraGraph.js';
import { getEra } from '../core/eras.js';
import { DIVERGENCE } from './Timeline.js';

const REDACTED = { label: '???', icon: '▓' };

function isImplemented(id) { return !!ERA_NODES[id]?.implemented; }

/** Build the map model from the live game (or a stub with the same shape). */
export function buildMapModel(game) {
  // The path actually walked this reality: [firstFrom, ...each .to], + current.
  const path = [];
  const rp = game.realityPath || [];
  if (rp.length) path.push(rp[0].from);
  for (const step of rp) path.push(step.to);
  if (!path.includes(game.eraId)) path.push(game.eraId);
  const walked = new Set(path);

  // "Visited" across all play = walked ∪ meta-unlocked eras.
  const visited = new Set(walked);
  for (const id of Object.keys(ERA_NODES)) {
    if (isImplemented(id) && game.unlocked?.isUnlocked?.(id)) visited.add(id);
  }

  // Reachability: nodes one implemented step from a visited node are "known";
  // branch/future targets you've glimpsed a route to are "rumored" (redacted).
  const known = new Set();
  const rumored = new Set();
  for (const src of visited) {
    for (const r of ERA_ROUTES[src] || []) {
      if (visited.has(r.to)) continue;
      if (isImplemented(r.to)) known.add(r.to);
      else rumored.add(r.to); // a path exists, but the age is not yet revealed
    }
  }

  const stateOf = (id) => {
    if (id === game.eraId) return 'current';
    if (visited.has(id)) return 'visited';
    if (known.has(id)) return 'known';
    if (rumored.has(id)) return 'rumored';
    return 'hidden';
  };

  const nodes = [];
  for (const [id, node] of Object.entries(ERA_NODES)) {
    const state = stateOf(id);
    if (state === 'hidden') continue;
    const reveal = state !== 'rumored'; // rumored stays redacted to keep mystery
    const era = getEra(id);
    nodes.push({
      id,
      tier: node.tier,
      state,
      label: reveal ? (era?.name || node.name || id) : REDACTED.label,
      icon: reveal ? (era?.icon || node.icon || '🌀') : REDACTED.icon,
    });
  }

  const shown = new Set(nodes.map((n) => n.id));
  const takenSet = new Set(rp.map((s) => `${s.from}>${s.to}`));
  const edges = [];
  for (const [from, routes] of Object.entries(ERA_ROUTES)) {
    if (!shown.has(from)) continue;
    for (const r of routes) {
      if (!shown.has(r.to)) continue;
      edges.push({
        from,
        to: r.to,
        type: r.prime ? 'prime' : 'branch',
        taken: takenSet.has(`${from}>${r.to}`),
        toRumored: rumored.has(r.to),
      });
    }
  }

  // Group shown nodes by tier (the time axis).
  const tiers = [];
  for (const n of nodes) {
    let t = tiers.find((x) => x.tier === n.tier);
    if (!t) { t = { tier: n.tier, nodes: [] }; tiers.push(t); }
    t.nodes.push(n);
  }
  tiers.sort((a, b) => a.tier - b.tier);
  for (const t of tiers) t.nodes.sort((a, b) => (a.state === 'current' ? -1 : 0) - (b.state === 'current' ? -1 : 0));

  // The hidden "leakage" layer only appears once reality has begun to branch.
  const div = game.timeline?.divergence || 0;
  let leakage = null;
  if (div >= DIVERGENCE.VISIBLE) {
    const layers = game.simulation?.layers?.() || [];
    leakage = {
      divergence: Math.round(div * 10) / 10,
      branches: game.timeline?.divergedCount?.() || 0,
      crossovers: game.timeline?.crossovers || 0,
      layers: layers.filter((l) => l.revealed || l.edge).map((l) => ({
        label: l.revealed ? l.label : REDACTED.label,
        note: l.revealed ? l.note : 'something contains this',
        revealed: l.revealed,
      })),
    };
  }

  return {
    current: game.eraId,
    agesWalked: walked.size, // milestone: ages actually walked this reality
    tiers,
    edges,
    rumoredCount: rumored.size,
    leakage,
  };
}
