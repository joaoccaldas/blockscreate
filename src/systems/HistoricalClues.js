/**
 * Historical clues found in the world.
 *
 * Clues are physical blocks first, then journal entries. This keeps the history
 * layer tangible: players mine or inspect artifacts, and the timeline reacts.
 */
export const CLUES = {
  fossil_bed: {
    id: 'fossil_bed',
    icon: '🦴',
    label: 'Fossil Bed',
    era: 'stone',
    text: 'A deep-time reminder: dinosaurs belong to a world long before humans.',
    branch: 'saurian_echo',
    reward: 18,
  },
  charcoal_handprint: {
    id: 'charcoal_handprint',
    icon: '✋',
    label: 'Charcoal Handprint',
    era: 'stone',
    text: 'Fire becomes memory. Culture starts when survival leaves a mark.',
    branch: 'firekeepers',
    reward: 16,
  },
  meteor_shard: {
    id: 'meteor_shard',
    icon: '☄️',
    label: 'Meteor Shard',
    era: 'stone',
    text: 'A fragment of catastrophe. In alternate timelines, impact becomes a tool.',
    branch: 'saurian_echo',
    reward: 24,
  },
  migration_marker: {
    id: 'migration_marker',
    icon: '🪨',
    label: 'Migration Marker',
    era: 'stone',
    text: 'A standing stone points outward: survival eventually becomes movement.',
    branch: 'accurate_line',
    reward: 14,
  },
  checksum_echo: {
    id: 'checksum_echo',
    icon: '∴',
    label: 'Checksum Echo',
    era: 'hidden',
    text: 'A number-pattern under the soil. It does not explain itself.',
    branch: 'observer',
    reward: 18,
  },
  duplicate_sun: {
    id: 'duplicate_sun',
    icon: '☉',
    label: 'Duplicate Sun',
    era: 'hidden',
    text: 'The sky briefly rendered two answers to one question.',
    branch: 'observer',
    reward: 22,
  },
  memory_leak: {
    id: 'memory_leak',
    icon: '⌁',
    label: 'Memory Leak',
    era: 'hidden',
    text: 'A memory attached to motion, not to you.',
    branch: 'observer',
    reward: 20,
  },
  observer_signal: {
    id: 'observer_signal',
    icon: '◌',
    label: 'Observer Signal',
    era: 'hidden',
    text: 'Progress was measured before anyone built a measuring tool.',
    branch: 'observer',
    reward: 30,
  },

  // The Observer arc (revealed by the matching anomalies in SimulationAnomalies).
  phantom_settler: {
    id: 'phantom_settler',
    icon: '☻',
    label: 'Phantom Settler',
    era: 'hidden',
    text: 'The town remembers a citizen who was never born. Population is a number that can be edited.',
    branch: 'observer',
    reward: 20,
  },
  compiler_warning: {
    id: 'compiler_warning',
    icon: '⎘',
    label: 'Premonition Recipe',
    era: 'hidden',
    text: 'Knowledge arrives out of order here. The future leaks backward into the recipe book.',
    branch: 'observer',
    reward: 22,
  },
  unwritten_gate: {
    id: 'unwritten_gate',
    icon: '⧉',
    label: 'Unwritten Gate',
    era: 'hidden',
    text: 'The next age already exists, finished, waiting for you to catch up to it.',
    branch: 'observer',
    reward: 24,
  },
  divergent_echo: {
    id: 'divergent_echo',
    icon: '⟁',
    label: 'Divergent Echo',
    era: 'hidden',
    text: 'Every choice you skip is still being played — by someone wearing your shape.',
    branch: 'observer',
    reward: 26,
  },
  chorus_of_worlds: {
    id: 'chorus_of_worlds',
    icon: '≋',
    label: 'Chorus of Worlds',
    era: 'hidden',
    text: 'The worlds are not separate. They share one ledger, and it is being audited.',
    branch: 'observer',
    reward: 28,
  },
  observer_reply: {
    id: 'observer_reply',
    icon: '✶',
    label: 'The Observer Replies',
    era: 'hidden',
    text: 'You were never the experiment. You are the message the experiment was written to send.',
    branch: 'observer',
    reward: 40,
  },
};

export class HistoricalClueLog {
  constructor(found = []) {
    this.found = new Set(found);
    this.recent = [];
  }

  discover(id) {
    const clue = CLUES[id];
    if (!clue || this.found.has(id)) return null;
    this.found.add(id);
    this.recent.unshift(clue);
    this.recent = this.recent.slice(0, 3);
    return clue;
  }

  has(id) { return this.found.has(id); }
  count() { return this.found.size; }
  list() { return Object.values(CLUES).filter((c) => this.found.has(c.id)); }
  all() { return Object.values(CLUES); }
  branchCounts() {
    const out = {};
    for (const c of this.list()) out[c.branch] = (out[c.branch] || 0) + 1;
    return out;
  }
  serialize() { return [...this.found]; }
}

export function clueForBlock(block) {
  return block?.clue || null;
}
