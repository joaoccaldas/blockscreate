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
