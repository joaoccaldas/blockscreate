/**
 * Timeline — branching realities that quietly accumulate as you play.
 *
 * The premise: the player is steering one thread of a much larger possibility
 * space. At first nothing seems unusual. But every "special event" (a world
 * event, an era leap, an anomaly) nudges a hidden `divergence` meter, and as it
 * climbs, events stop resolving one way — they *split*, and the branch the
 * player lands on is recorded. Past certain thresholds the branches start to
 * leak into each other: a "bug in the matrix" (glitch) or a deliberate crossover
 * (rift) where resources/echoes cross from a parallel thread.
 *
 * Design goals:
 *  - Subtle → escalating: invisible early, eerie mid-game, overt late.
 *  - Deterministic & testable: all randomness comes through an injected rng, so
 *    tests can pin outcomes. No DOM, no world mutation — the Game decides how to
 *    *stage* a bleed; this class only decides *whether* and *what kind*.
 *  - Cheap & serializable: a scalar + a bounded branch log.
 */

// Divergence thresholds that unlock each layer of the effect.
export const DIVERGENCE = {
  VISIBLE: 1.0, // events begin to split two ways; a faint glyph appears
  GLITCH: 2.5,  // unintended bleeds (bug in the matrix) can occur
  RIFT: 4.0,    // intentional crossovers; events can split three ways
};

const MAX_BRANCH_LOG = 64;

export class Timeline {
  constructor(state = {}, rng = Math.random) {
    this.divergence = state.divergence || 0;
    this.branches = Array.isArray(state.branches) ? state.branches.slice() : [];
    this.crossovers = state.crossovers || 0;
    this.seenGlitch = !!state.seenGlitch;
    this.seenRift = !!state.seenRift;
    this.cooldown = state.cooldown || 0;
    this._rng = rng;
  }

  /** How many ways the next special event can split at the current divergence. */
  splitWidth() {
    if (this.divergence < DIVERGENCE.VISIBLE) return 1;
    if (this.divergence < DIVERGENCE.RIFT) return 2;
    return 3;
  }

  /** Convenience flags for HUD / staging. */
  get stage() {
    if (this.divergence >= DIVERGENCE.RIFT) return 3;
    if (this.divergence >= DIVERGENCE.GLITCH) return 2;
    if (this.divergence >= DIVERGENCE.VISIBLE) return 1;
    return 0;
  }

  /**
   * Resolve a special event into a branch. Records it and nudges divergence.
   * @returns {{variant:number, width:number, diverged:boolean}}
   *   variant 0 is the "prime" outcome; higher variants are alternate branches.
   */
  branchEvent(eventId, eraId = '') {
    const width = this.splitWidth();
    const variant = width <= 1 ? 0 : Math.floor(this._rng() * width) % width;
    this.branches.push({
      e: eventId,
      v: variant,
      era: eraId,
      d: Math.round(this.divergence * 100) / 100,
    });
    if (this.branches.length > MAX_BRANCH_LOG) this.branches.shift();
    this.divergence += 0.15;
    return { variant, width, diverged: variant > 0 };
  }

  /** Nudge divergence from a non-event source (era leap, anomaly, …). */
  note(amount = 0) {
    if (amount > 0) this.divergence += amount;
  }

  /**
   * Per-tick check for a reality bleed. Rare and gated by divergence + a long
   * cooldown so it stays special and escalating. Returns a descriptor the Game
   * stages (particles / toast / reward), or null.
   * @returns {{kind:'glitch'|'rift', first:boolean, divergence:number}|null}
   */
  update(dt) {
    if (this.divergence < DIVERGENCE.GLITCH) return null;
    this.cooldown -= dt;
    if (this.cooldown > 0) return null;
    // Next window: 60–150s, longer when reality is calmer (lower divergence).
    this.cooldown = 60 + this._rng() * 90;
    const canRift = this.divergence >= DIVERGENCE.RIFT;
    const kind = canRift && this._rng() < 0.4 ? 'rift' : 'glitch';
    const first = kind === 'glitch' ? !this.seenGlitch : !this.seenRift;
    if (kind === 'glitch') this.seenGlitch = true; else this.seenRift = true;
    this.crossovers++;
    return { kind, first, divergence: Math.round(this.divergence * 100) / 100 };
  }

  /** Count of distinct events that have ever branched off-prime. */
  divergedCount() {
    return this.branches.filter((b) => b.v > 0).length;
  }

  serialize() {
    return {
      divergence: Math.round(this.divergence * 1000) / 1000,
      branches: this.branches.slice(-MAX_BRANCH_LOG),
      crossovers: this.crossovers,
      seenGlitch: this.seenGlitch,
      seenRift: this.seenRift,
      cooldown: this.cooldown,
    };
  }
}
