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

