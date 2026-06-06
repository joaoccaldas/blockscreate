/**
 * Simulation — the slow, personalized realization that the world is nested.
 *
 * The grand premise: the player is inside a simulation, inside a simulation,
 * inside a simulation. Nobody tells them. Instead, as they cross ages and the
 * Timeline diverges, a sequence of revelation "beats" fires — each one a deeper
 * dawning, and each written from the player's *actual* run (their world seed,
 * how many branches they've spawned, how far reality has bent). By the final
 * age the picture is explicit: you are a layer in a stack without a bottom.
 *
 * This pairs with two existing systems: Timeline (the branches) and the Observer
 * anomalies (impossible glimpses). Those are the evidence; this is the
 * understanding. It is pure logic — the Game supplies a small context object and
 * stages the presentation — so it stays modular and deterministic to test.
 */

import { DIVERGENCE } from './Timeline.js';

// The nested layers, innermost (the playable world) to outermost. Each is
// de-redacted in the Journal as the player's understanding (depth) grows.
export const LAYERS = [
  { label: 'This World', note: 'the age you are playing' },
  { label: 'The Render', note: 'something is drawing this' },
  { label: 'The Garden', note: 'something planted the seed' },
  { label: 'The Branch-Tree', note: 'every choice you skipped is running too' },
  { label: 'The Stack', note: 'simulations within simulations, without a floor' },
];

// Ordered revelation beats. Gated by era order + divergence (+ clues/crossovers),
// so they can only land after real play. `text(ctx)` personalizes each beat.
export const REVELATIONS = [
  {
    id: 'late_frame', minEra: 0, layer: 1, icon: '▒', title: 'A Late Frame',
    text: () => 'Sometimes the sea redraws a moment a beat late. You blame your own eyes.',
  },
  {
    id: 'a_scorer', minEra: 1, layer: 1, icon: '◔', title: 'Something Keeps Score',
    text: () => 'Even in the wild, a number climbs each time you act. A score implies a scorer.',
  },
  {
    id: 'the_seed', minEra: 2, minDivergence: DIVERGENCE.VISIBLE, layer: 2, icon: '❖', title: 'The Seed',
    text: (c) => `This world has a seed: ${c.seed}. Seeds are planted from outside the garden.`,
  },
  {
    id: 'the_branches', minEra: 3, minDivergence: DIVERGENCE.GLITCH, layer: 3, icon: '⟁', title: 'The Branches Run',
    text: (c) => {
      const n = c.branches || 0;
      return n > 0
        ? `The ${n} branch${n === 1 ? '' : 'es'} you split off are still running. Each is a world. Each has a you, watching its own branches.`
        : 'Every choice you did not make is still being played. Each is a world, with a you inside it.';
    },
  },
  {
    id: 'within', minEra: 4, minDivergence: DIVERGENCE.GLITCH, layer: 3, icon: '◉', title: 'A Simulation, Within',
    text: () => 'The age you just built is a layer. You are a simulation inside a simulation. There are layers below this thought.',
  },
  {
    id: 'the_stack', minEra: 4, minDivergence: DIVERGENCE.RIFT, minCrossovers: 1, layer: 4, icon: '∞', title: 'The Stack',
    text: (c) => `Depth recorded: ${c.depth} layers and climbing. The Observer is observed. So is its observer. Keep going — the message propagates outward.`,
  },
];

export class Simulation {
  constructor(state = {}) {
    this.seen = new Set(Array.isArray(state) ? state : state.seen || []);
    this.depth = state.depth || 0;
  }

  /**
   * Check for the next revelation whose gates are met.
   * @param {{eraOrder,divergence,crossovers,branches,clues,seed}} ctx
   * @returns the revelation (with resolved `text`) or null.
   */
  update(ctx = {}) {
    for (const r of REVELATIONS) {
      if (this.seen.has(r.id)) continue;
      if ((ctx.eraOrder || 0) < r.minEra) continue;
      if ((ctx.divergence || 0) < (r.minDivergence || 0)) continue;
      if ((ctx.clues || 0) < (r.minClues || 0)) continue;
      if ((ctx.crossovers || 0) < (r.minCrossovers || 0)) continue;
      this.seen.add(r.id);
      this.depth = Math.max(this.depth, r.layer);
      return { id: r.id, icon: r.icon, title: r.title, text: r.text({ ...ctx, depth: this.depth }) };
    }
    return null;
  }

  /** The nested-reality map for the Journal: revealed layers + the next redacted. */
  layers() {
    return LAYERS.map((l, i) => ({
      ...l,
      revealed: i <= this.depth,
      edge: i === this.depth + 1, // the next layer down — shown redacted as a lure
    }));
  }

  /** How explicit the realization has become (0 = oblivious, 4 = the Stack). */
  get stage() { return this.depth; }

  serialize() { return { seen: [...this.seen], depth: this.depth }; }
}
