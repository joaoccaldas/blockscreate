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
    id: 'storm_shelter',
    icon: '❄️',
    label: 'Storm Shelter',
    reward: { cp: 30, powerup: 'ember_heart' },
    check: (g) => g.events?.seen?.has?.('cold_night') && g._hasWarmth?.(),
  },
  {
    id: 'deep_delver',
    icon: '🕳️',
    label: 'Deep Delver',
    reward: { cp: 30, powerup: 'miners_charm' },
    check: (g) => g.civ.deepestMine >= g.world.height - 22 || g.clues?.has('fossil_bed'),
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
    id: 'saurian_echo',
    icon: '🦴',
    label: 'Saurian Echo',
    reward: { cp: 40, powerup: 'fossil_charm' },
    check: (g) => g.clues?.has('fossil_bed') && g.clues?.has('meteor_shard'),
  },
  {
    id: 'meteor_smith',
    icon: '☄️',
    label: 'Meteor Smith',
    reward: { cp: 45, powerup: 'meteor_pick' },
    check: (g) => g.clues?.has('meteor_shard') && (g.crafted?.has('flint_spear') || g.crafted?.has('bone_knife')),
  },
  {
    id: 'first_town_plan',
    icon: '🏛️',
    label: 'First Town Plan',
    reward: { cp: 35, powerup: 'city_planner' },
    check: (g) => g.eraId === 'bronze' && g.civ.totalBuilt >= 12 && g.civ.light >= 3,
  },
  {
    id: 'food_store',
    icon: '🏺',
    label: 'Food Store',
    reward: { cp: 30, powerup: 'granary_feast' },
    check: (g) => g.eraId === 'bronze' && g.inventory?.count('food') >= 3,
  },
  {
    id: 'animal_friend',
    icon: '🐾',
    label: 'Animal Friend',
    reward: { cp: 20, powerup: 'feast' },
    check: (g) => g.animalPeaceTime >= 8,
  },
  {
    id: 'grazer_bond',
    icon: '🌿',
    label: 'Grazer Bond',
    reward: { cp: 30, powerup: 'grazer_bond' },
    check: (g) => (g.grazerBondTime || 0) >= 10,
  },
  {
    id: 'defended_camp',
    icon: '🛡️',
    label: 'Defended Camp',
    reward: { cp: 35, powerup: 'fossil_charm' },
    check: (g) => g.eraId === 'stone' && g.structures?.has('defended_camp'),
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

  all() { return DISCOVERIES; }
  has(id) { return this.unlocked.has(id); }

  serialize() {
    return [...this.unlocked];
  }
}
