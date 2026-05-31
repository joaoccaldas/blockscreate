/**
 * Hidden discoveries.
 *
 * Visible objectives teach the core loop. Hidden discoveries reward curiosity:
 * strange builds, deep mining, high construction, peaceful animal encounters,
 * and other "I wonder if..." play.
 */
export const DISCOVERIES = [
  {
    id: 'first_shelter',
    icon: '🏠',
    label: 'First Shelter',
    reward: { cp: 20, powerup: 'builders_glove' },
    check: (g) => g.structures.has('hut'),
  },
  {
    id: 'firekeeper',
    icon: '🔥',
    label: 'Firekeeper',
    reward: { cp: 25, powerup: 'feast' },
    check: (g) => g.civ.light >= 6,
  },
  {
    id: 'deep_delver',
    icon: '🕳️',
    label: 'Deep Delver',
    reward: { cp: 30, powerup: 'miners_charm' },
    check: (g) => g.civ.deepestMine >= g.world.height - 22,
  },
  {
    id: 'sky_builder',
    icon: '☁️',
    label: 'Sky Builder',
    reward: { cp: 30, powerup: 'architects_eye' },
    check: (g) => g.civ.highestBuild <= g.world.spawn.y - 12,
  },
  {
    id: 'ancient_mason',
    icon: '🧱',
    label: 'Ancient Mason',
    reward: { cp: 35, powerup: 'time_shard' },
    check: (g) => g.civ.hasBuilt('brick') || g.civ.hasBuilt('cobblestone', 12),
  },
  {
    id: 'portal_architect',
    icon: '🌀',
    label: 'Portal Architect',
    reward: { cp: 50, powerup: 'time_shard' },
    check: (g) => g.structures.has('portal_ring'),
  },
  {
    id: 'animal_friend',
    icon: '🐾',
    label: 'Animal Friend',
    reward: { cp: 20, powerup: 'feast' },
    check: (g) => g.animalPeaceTime >= 8,
  },
];

export class DiscoveryLog {
  constructor(unlocked = []) {
    this.unlocked = new Set(unlocked);
    this.recent = [];
  }

  evaluate(game) {
    const newly = [];
    for (const d of DISCOVERIES) {
      if (this.unlocked.has(d.id)) continue;
      if (d.check(game)) {
        this.unlocked.add(d.id);
        this.recent.unshift(d);
        this.recent = this.recent.slice(0, 3);
        newly.push(d);
      }
    }
    return newly;
  }

  list() {
    return DISCOVERIES.filter((d) => this.unlocked.has(d.id));
  }

  serialize() {
    return [...this.unlocked];
  }
}

