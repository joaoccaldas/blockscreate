/**
 * Gentle, persistent guidance for players who go quiet for too long.
 *
 * The game should feel mysterious, not opaque. These hints point toward the
 * next useful action and seed curiosity about artifacts without spoiling the
 * deeper premise.
 */
const OBJECTIVE_HINTS = {
  absorb_nutrients: 'Swim through glowing nutrient blobs. The first life learns by absorbing.',
  collect_minerals: 'Look for warm blue-white vents. Touch one to gather mineral energy.',
  make_membrane: 'Open Crafting and turn gathered materials into a Lipid Membrane.',
  build_membrane: 'Place Lipid Membranes around yourself. A boundary is the first home.',
  stabilize_cell: 'Craft the Proto-Cell once your membrane work is ready.',
  gather_wood: 'Punch or chop tree trunks until you have 3 Wood.',
  make_planks: 'Open Crafting and shape Wood into Planks.',
  make_pick: 'Craft a Stone Pickaxe so deeper stone and coal become reachable.',
  mine_coal: 'Dig into gray stone and look for black-flecked Coal Ore.',
  build_hut: 'Use planks, logs or thatch to make a small shelter with walls, floor and roof.',
  cook: 'Build a Campfire, then craft cooked Food when you have raw food.',
  build_fire: 'Place a Campfire to anchor the first workshop.',
  mine_copper: 'Search underground for orange-flecked Copper Ore.',
  mine_tin: 'Search underground for pale-flecked Tin Ore.',
  smelt_bronze: 'Use Copper and Tin in Crafting to make Bronze Ingots.',
  brick_town: 'Place town blocks near your settlement until it starts to feel planned.',
  mine_iron: 'Go deeper for Iron Ore. Stronger tools reveal stronger ages.',
  forge_iron: 'Craft Iron Ingots from mined Iron Ore.',
  iron_pick: 'Craft an Iron Pickaxe to unlock tougher resources.',
  light_city: 'Place torches, campfires or other light sources around town.',
  build_miner: 'Craft and place an Auto Miner to start industrial production.',
  stock_ore: 'Let Auto Miners and settlers build a small ore stockpile.',
};

const CURIOSITY_HINTS = [
  {
    id: 'artifact_hunt',
    text: 'Odd blocks can be more than resources. Fossils, shards, markings and standing stones may belong in your Journal.',
    check: (g) => (g.clues?.count?.() || 0) === 0 && g.eraId !== 'cell',
  },
  {
    id: 'journal_after_clue',
    text: 'The Journal keeps patterns from clues, structures and discoveries. If something felt unusual, check it there.',
    check: (g) => (g.clues?.count?.() || 0) > 0,
  },
  {
    id: 'stage_mystery',
    text: 'When an age changes stage, look around. Some changes are useful, and some are simply strange.',
    check: (g) => (g.eraStage || 0) >= 1,
  },
  {
    id: 'treasure_sense',
    text: 'Explore scarred ground, caves and bright fragments. The best treasures often look like the world made a mistake.',
    check: (g) => g.eraId !== 'cell',
  },
];

export class GuidanceHints {
  constructor(state = {}) {
    this.quiet = state.quiet || 0;
    this.cooldown = state.cooldown || 12;
    this.lastSignature = state.lastSignature || '';
    this.seen = new Set(state.seen || []);
  }

  update(dt, game) {
    if (game.mode !== 'survival' || !game.objectives) return null;

    const sig = this._signature(game);
    if (!this.lastSignature) this.lastSignature = sig;
    if (sig !== this.lastSignature) {
      this.lastSignature = sig;
      this.quiet = 0;
      this.cooldown = Math.min(this.cooldown, 10);
      return null;
    }

    this.quiet += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    const delay = game.objectives.completed.size ? 42 : 24;
    if (this.cooldown > 0 || this.quiet < delay) return null;

    const hint = this._pickHint(game);
    if (!hint) return null;
    this.seen.add(hint.id);
    this.quiet = 0;
    this.cooldown = 34;
    return hint;
  }

  _pickHint(game) {
    const active = game.objectives.active(1)[0];
    const curiosity = CURIOSITY_HINTS.find((h) => !this.seen.has(h.id) && h.check(game));

    if (!game.objectives.completed.size && active) return objectiveHint(active);
    if (curiosity && ((game.clues?.count?.() || 0) === 0 || (game.eraStage || 0) >= 1)) {
      return { id: curiosity.id, icon: '🔎', text: curiosity.text };
    }
    if (active) return objectiveHint(active);
    if (curiosity) return { id: curiosity.id, icon: '🔎', text: curiosity.text };
    return null;
  }

  _signature(game) {
    return [
      game.eraId,
      game.objectives.completed.size,
      game.clues?.count?.() || 0,
      game.discoveries?.list?.().length || 0,
      game.structures?.list?.().length || 0,
      game.eraStage || 0,
    ].join(':');
  }

  serialize() {
    return {
      quiet: this.quiet,
      cooldown: this.cooldown,
      lastSignature: this.lastSignature,
      seen: [...this.seen],
    };
  }
}

function objectiveHint(objective) {
  return {
    id: `objective_${objective.id}`,
    icon: objective.icon || '🎯',
    text: OBJECTIVE_HINTS[objective.id] || `Try this next: ${objective.label}.`,
  };
}
