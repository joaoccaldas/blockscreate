/**
 * Rare world lapses that hint at a deeper layer without explaining it.
 *
 * These are one-shot, achievement-gated moments. They deliberately read like
 * impossible observations rather than lore exposition, so the player feels a
 * mystery before they understand the pattern.
 */
export const ANOMALIES = [
  {
    id: 'checksum_echo',
    clue: 'checksum_echo',
    icon: '∴',
    label: 'Checksum Echo',
    text: 'A tile repeats. Then every tile insists it was always unique.',
    check: (g) => (g.eraStage || 0) >= 1,
  },
  {
    id: 'duplicate_sun',
    clue: 'duplicate_sun',
    icon: '☉',
    label: 'Duplicate Sun',
    text: 'For a blink, the sky draws itself twice.',
    check: (g) => g.events?.seen?.has?.('meteor_shower') || g.clues?.has?.('meteor_shard'),
  },
  {
    id: 'memory_leak',
    clue: 'memory_leak',
    icon: '⌁',
    label: 'Memory Leak',
    text: 'Your companion remembers a route you never walked.',
    check: (g) => (g.mobs || []).some((m) =>
      m.tamed && (m.mounted || (m.cargo || []).some(Boolean) || m.command === 'guard')),
  },
  {
    id: 'observer_signal',
    clue: 'observer_signal',
    icon: '◌',
    label: 'Observer Signal',
    text: 'Something counts the stage before you name it.',
    check: (g) => (g.eraStage || 0) >= 3 && (g.clues?.count?.() || 0) >= 3,
  },

  // ---- The Observer arc: an escalating thread that rewards investigation. ----
  // Early signals surface from ordinary play; deeper ones only appear once the
  // timeline has begun to branch, so chasing the mystery and pushing divergence
  // feed each other. Each is a fleeting "impossible observation"; the matching
  // clue (same id) is the journal lore + CP reward.
  {
    id: 'phantom_settler',
    clue: 'phantom_settler',
    icon: '☻',
    label: 'Phantom Settler',
    text: 'A worker you never recruited waves once — then forgets it exists.',
    check: (g) => (g.settlers?.count?.() || 0) >= 3,
  },
  {
    id: 'compiler_warning',
    clue: 'compiler_warning',
    icon: '⎘',
    label: 'Premonition Recipe',
    text: 'A recipe you have not learned lists itself, for a blink, as already known.',
    check: (g) => (g.crafted?.size || 0) >= 6,
  },
  {
    id: 'unwritten_gate',
    clue: 'unwritten_gate',
    icon: '⧉',
    label: 'Unwritten Gate',
    text: 'The portal ahead flickers with a structure no one has designed yet.',
    check: (g) => !!g.canAdvance?.(),
  },
  {
    id: 'divergent_echo',
    clue: 'divergent_echo',
    icon: '⟁',
    label: 'Divergent Echo',
    text: 'From a branch you did not choose, your own decision answers back.',
    check: (g) => (g.timeline?.divergence || 0) >= 2.5,
  },
  {
    id: 'chorus_of_worlds',
    clue: 'chorus_of_worlds',
    icon: '≋',
    label: 'Chorus of Worlds',
    text: 'For a heartbeat, a thousand parallel settlements count to the same number.',
    check: (g) => (g.timeline?.crossovers || 0) >= 1,
  },
  {
    id: 'observer_reply',
    clue: 'observer_reply',
    icon: '✶',
    label: 'The Observer Replies',
    text: 'Through the static it forms words: keep going. We are watching with hope.',
    check: (g) => (g.timeline?.divergence || 0) >= 4
      && g.clues?.has?.('divergent_echo') && g.clues?.has?.('chorus_of_worlds'),
  },
];

export class SimulationAnomalyLog {
  constructor(state = {}) {
    const seen = Array.isArray(state) ? state : (state.seen || []);
    this.seen = new Set(seen);
    this.cooldown = state.cooldown || 0;
    this.recent = [];
  }

  update(dt, game) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.cooldown > 0 || game.mode !== 'survival') return [];

    for (const anomaly of ANOMALIES) {
      if (this.seen.has(anomaly.id)) continue;
      if (!anomaly.check(game)) continue;
      this.seen.add(anomaly.id);
      this.cooldown = 18;
      this.recent.unshift(anomaly);
      this.recent = this.recent.slice(0, 3);
      return [anomaly];
    }
    return [];
  }

  has(id) { return this.seen.has(id); }
  list() { return ANOMALIES.filter((a) => this.seen.has(a.id)); }
  all() { return ANOMALIES; }

  serialize() {
    return {
      seen: [...this.seen],
      cooldown: this.cooldown,
    };
  }
}
