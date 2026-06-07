/**
 * Objectives — short, guided goals that teach the loop and give the player a
 * sense of progress. Each objective is data: an id, label, a check(game)
 * predicate, and a CP reward. Completed objectives are sticky and tracked on
 * the Game so they persist in saves.
 *
 * Designed so survival has a clear early path (gather -> craft -> tool -> build
 * -> advance) and so adding per-era objective sets later is just more data.
 */
export const OBJECTIVES = {
  cell: [
    { id: 'absorb_nutrients', kind: 'mandatory', icon: '🫧', label: 'Absorb 3 Nutrient Blobs',             reward: 12, check: (g) => total(g, 'nutrient_blob') >= 3 },
    { id: 'collect_minerals', kind: 'mandatory', icon: '♨️', label: 'Collect minerals from a warm vent',  reward: 12, check: (g) => total(g, 'mineral_vent') >= 1 },
    { id: 'make_membrane',    kind: 'mandatory', icon: '🟣', label: 'Craft a Lipid Membrane',             reward: 16, check: (g) => g.crafted.has('lipid_membrane') || total(g, 'lipid_membrane') >= 1 },
    { id: 'build_membrane',   kind: 'mandatory', icon: '🧬', label: 'Build a 4-block membrane boundary',  reward: 18, check: (g) => g.civ.hasBuilt('lipid_membrane', 4) },
    { id: 'stabilize_cell',   kind: 'mandatory', icon: '🧫', label: 'Stabilize a Proto-Cell',             reward: 22, check: (g) => g.crafted.has('proto_cell') || total(g, 'proto_cell') >= 1 },
    { id: 'extra_nutrients',  kind: 'mastery',   icon: '🌿', label: 'Mastery: store extra nutrients',     reward: 18, check: (g) => total(g, 'nutrient_blob') >= 6 },
    { id: 'ventborn',         kind: 'mastery',   icon: '♨️', label: 'Mastery: map 3 warm vents',          reward: 20, check: (g) => total(g, 'mineral_vent') >= 3 },
    { id: 'advance',          kind: 'portal',    icon: '🦖', label: 'Evolve into the Age of Dinosaurs',   reward: 0,  check: (g) => g.canAdvance() },
  ],
  flora: [
    { id: 'forage_fiber', kind: 'mandatory', icon: '🌾', label: 'Forage 5 Plant Fiber',                 reward: 12, check: (g) => total(g, 'fiber') >= 5 },
    { id: 'gather_wood',  kind: 'mandatory', icon: '🪵', label: 'Gather 3 Wood for tools',              reward: 10, check: (g) => total(g, 'log') >= 3 },
    { id: 'cultivate',    kind: 'mandatory', icon: '🌱', label: 'Cultivate a farm plot',                reward: 22, check: (g) => g.civ.hasBuilt('farm_plot') },
    { id: 'grow_grove',   kind: 'mandatory', icon: '🌳', label: 'Plant a grove (place 4 logs)',         reward: 20, check: (g) => g.civ.hasBuilt('log', 4) },
    { id: 'green_world',  kind: 'mastery',   icon: '🍃', label: 'Mastery: forage 12 plant fiber',       reward: 20, check: (g) => total(g, 'fiber') >= 12 },
    { id: 'tend_grazers', kind: 'mastery',   icon: '🦕', label: 'Mastery: tame a grazer companion',     reward: 30, check: (g) => g.mobs?.some?.((m) => m.tamed) },
    { id: 'advance',      kind: 'portal',    icon: '🌀', label: 'Open the Early Cities portal',          reward: 0,  check: (g) => g.canAdvance() },
  ],
  stone: [
    { id: 'gather_wood',  kind: 'mandatory', icon: '🪵', label: 'Forage: collect 3 Wood',                reward: 10, check: (g) => total(g, 'log') >= 3 },
    { id: 'make_planks',  kind: 'mandatory', icon: '🟫', label: 'Shape wood into Planks',                reward: 10, check: (g) => g.crafted.has('planks') },
    { id: 'make_pick',    kind: 'mandatory', icon: '⛏️', label: 'Craft a Stone Pickaxe',                 reward: 20, check: (g) => g.crafted.has('stone_pickaxe') || total(g, 'stone_pickaxe') >= 1 },
    { id: 'mine_coal',    kind: 'mandatory', icon: '⚫', label: 'Find Coal for controlled fire',          reward: 15, check: (g) => total(g, 'coal') >= 1 },
    { id: 'build_hut',    kind: 'mandatory', icon: '🏠', label: 'Build a shelter hut',                   reward: 25, check: (g) => g.structures?.has('hut') },
    { id: 'cook',         kind: 'mandatory', icon: '🍖', label: 'Cook food at a campfire',               reward: 15, check: (g) => g.crafted.has('food') },
    { id: 'cave_paint',   kind: 'mastery',   icon: '🎨', label: 'Mastery: leave cave-art clues',         reward: 20, check: (g) => g.discoveries?.unlocked?.has('first_shelter') && g.civ.hasBuilt('torch', 3) },
    { id: 'fossil_memory',kind: 'mastery',   icon: '🦴', label: 'Mastery: decode fossil memories',       reward: 25, check: (g) => g.clues?.has('fossil_bed') },
    { id: 'meteor_omen',  kind: 'mastery',   icon: '☄️', label: 'Mastery: recover a meteor shard',       reward: 25, check: (g) => g.clues?.has('meteor_shard') },
    { id: 'tame_grazer',  kind: 'mastery',   icon: '🌿', label: 'Mastery: tame a grazer companion',       reward: 30, check: (g) => g.mobs?.some?.((m) => m.tamed) },
    { id: 'make_spear',   kind: 'mastery',   icon: '🪨', label: 'Mastery: craft a Flint Spear',           reward: 20, check: (g) => g.crafted.has('flint_spear') || total(g, 'flint_spear') >= 1 },
    { id: 'hunt_predator',kind: 'mastery',   icon: '🦖', label: 'Mastery: drive off a predator',          reward: 30, check: (g) => (g.civ.defeated?.raptor || 0) + (g.civ.defeated?.rex || 0) >= 1 },
    { id: 'portal_ring',  kind: 'mastery',   icon: '🌀', label: 'Mastery: build a portal ring',          reward: 35, check: (g) => g.structures?.has('portal_ring') },
    { id: 'advance',      kind: 'portal',    icon: '🌀', label: 'Open the Early Cities portal',          reward: 0,  check: (g) => g.canAdvance() },
  ],
  bronze: [
    { id: 'build_fire',   kind: 'mandatory', icon: '🔥', label: 'Build a campfire workshop',        reward: 10, check: (g) => g.civ.hasBuilt('campfire') },
    { id: 'mine_copper',  kind: 'mandatory', icon: '🟠', label: 'Mine Copper Ore',                  reward: 15, check: (g) => total(g, 'copper_ore') >= 1 },
    { id: 'mine_tin',     kind: 'mandatory', icon: '⚪', label: 'Mine Tin Ore',                     reward: 15, check: (g) => total(g, 'tin_ore') >= 1 },
    { id: 'smelt_bronze', kind: 'mandatory', icon: '⚒️', label: 'Craft Bronze Ingots',              reward: 25, check: (g) => total(g, 'bronze') >= 1 },
    { id: 'brick_town',   kind: 'mandatory', icon: '🧱', label: 'Place 8 town blocks',               reward: 20, check: (g) => g.civ.totalBuilt >= 8 },
    { id: 'workshop',     kind: 'mastery',   icon: '🛠️', label: 'Mastery: recognized Workshop',     reward: 25, check: (g) => g.structures?.has('workshop') },
    { id: 'first_harvest',kind: 'mastery',   icon: '🌾', label: 'Mastery: harvest the first wheat',  reward: 25, check: (g) => total(g, 'wheat') >= 1 || (g.settlers?.stock?.food || 0) >= 2 },
    { id: 'food_store',   kind: 'mastery',   icon: '🏺', label: 'Mastery: store 3 food',             reward: 25, check: (g) => total(g, 'food') >= 3 || (g.settlers?.stock?.food || 0) >= 3 },
    { id: 'market_trade', kind: 'mastery',   icon: '⚖️', label: 'Mastery: build a market',          reward: 25, check: (g) => g.civ.hasBuilt('market') },
    { id: 'lit_town',     kind: 'mastery',   icon: '🔥', label: 'Mastery: light the first town',     reward: 25, check: (g) => g.civ.light >= 3 },
    { id: 'advance',      kind: 'portal',    icon: '🌀', label: 'Open the Iron Kingdoms portal',     reward: 0,  check: (g) => g.canAdvance() },
  ],
  iron: [
    { id: 'mine_iron',    kind: 'mandatory', icon: '⛓️', label: 'Mine Iron Ore',                    reward: 20, check: (g) => total(g, 'iron_ore') >= 1 },
    { id: 'forge_iron',   kind: 'mandatory', icon: '🛡️', label: 'Craft Iron Ingots',                reward: 30, check: (g) => total(g, 'iron') >= 1 },
    { id: 'iron_pick',    kind: 'mandatory', icon: '⛏️', label: 'Craft an Iron Pickaxe',             reward: 35, check: (g) => g.crafted.has('iron_pickaxe') || total(g, 'iron_pickaxe') >= 1 },
    { id: 'light_city',   kind: 'mandatory', icon: '🏮', label: 'Place 6 light sources',             reward: 25, check: (g) => g.civ.light >= 6 },
    { id: 'watchtower',   kind: 'mastery',   icon: '🗼', label: 'Mastery: build a Watchtower',       reward: 35, check: (g) => g.structures?.has('watchtower') },
    { id: 'city_gates',   kind: 'mastery',   icon: '🚪', label: 'Mastery: build city gates',         reward: 35, check: (g) => g.civ.hasBuilt('gate', 2) },
    { id: 'roads',        kind: 'mastery',   icon: '🛤️', label: 'Mastery: lay roads',                reward: 25, check: (g) => g.civ.hasBuilt('road', 6) },
    { id: 'advance',      kind: 'portal',    icon: '🌀', label: 'Open the Industrial portal',        reward: 0,  check: (g) => g.canAdvance() },
  ],
  industrial: [
    { id: 'build_miner',   kind: 'mandatory', icon: '⚙️', label: 'Build an Auto Miner',                 reward: 40, check: (g) => g.civ.hasBuilt('auto_miner') },
    { id: 'build_smelter', kind: 'mandatory', icon: '🔥', label: 'Build a Smelter',                      reward: 45, check: (g) => g.civ.hasBuilt('smelter') },
    { id: 'forge_steel',   kind: 'mandatory', icon: '🔩', label: 'Produce 3 steel',                      reward: 45, check: (g) => ((g.settlers?.stock?.steel || 0) + g.inventory.count('steel')) >= 3 },
    { id: 'build_factory', kind: 'mandatory', icon: '🏭', label: 'Build a Factory',                      reward: 60, check: (g) => g.civ.hasBuilt('factory') },
    { id: 'make_parts',    kind: 'mandatory', icon: '🛠️', label: 'Manufacture 2 machine parts',         reward: 70, check: (g) => ((g.settlers?.stock?.machine_part || 0) + g.inventory.count('machine_part')) >= 2 },
    { id: 'supply_line',   kind: 'mandatory', icon: '🔗', label: 'Wire a factory to a smelter with conveyors', reward: 55, check: (g) => (g.industryStatus?.linkedFactories || 0) >= 1 },
    { id: 'powered',       kind: 'mastery',   icon: '⚡', label: 'Mastery: power a machine with the grid', reward: 55, check: (g) => (g.industryStatus?.poweredCount || 0) >= 1 },
    { id: 'mass_produce',  kind: 'mastery',   icon: '📦', label: 'Mastery: stockpile 10 machine parts',  reward: 60, check: (g) => ((g.settlers?.stock?.machine_part || 0) + g.inventory.count('machine_part')) >= 10 },
    { id: 'pollution',     kind: 'mastery',   icon: '🌫️', label: 'Mastery: keep a factory under 10 smog', reward: 50, check: (g) => g.civ.hasBuilt('factory') && (g.civ.pollution || 0) < 10 },
  ],
  republic: [
    { id: 'open_market',   kind: 'mandatory', icon: '🏺', label: 'Open a market',                        reward: 40, check: (g) => g.civ.hasBuilt('market') },
    { id: 'send_caravan',  kind: 'mandatory', icon: '🐪', label: 'Establish a caravan post',             reward: 50, check: (g) => g.civ.hasBuilt('caravan_post') },
    { id: 'pave_roads',    kind: 'mandatory', icon: '🛣️', label: 'Pave 6 stretches of road',             reward: 45, check: (g) => g.civ.hasBuilt('road', 6) },
    { id: 'treasury',      kind: 'mandatory', icon: '💰', label: 'Grow the treasury to 400 Civ Points',  reward: 60, check: (g) => (g.civ.cp || 0) >= 400 },
    { id: 'caravan_master',kind: 'mastery',   icon: '🧭', label: 'Mastery: bank 3 trade beads',          reward: 55, check: (g) => g.inventory.count('trade_bead') >= 3 },
    { id: 'guild_charter', kind: 'mastery',   icon: '📜', label: 'Mastery: reach a trade network of 8',  reward: 60, check: (g) => (g.civ.trade || 0) >= 8 },
  ],
};

function total(game, id) {
  return game.inventory.count(id);
}

export class ObjectiveTracker {
  constructor(eraId, completed = []) {
    this.list = (OBJECTIVES[eraId] || []).map((o) => ({ ...o }));
    this.completed = new Set(completed);
  }

  /** Returns newly completed objectives this tick (for toasts / rewards). */
  evaluate(game) {
    const newly = [];
    for (const o of this.list) {
      if (this.completed.has(o.id)) continue;
      if (o.check(game)) {
        this.completed.add(o.id);
        newly.push(o);
      }
    }
    return newly;
  }

  /** The next 1-2 incomplete objectives to surface to the player. */
  active(limit = 3) {
    return this.list
      .filter((o) => !this.completed.has(o.id))
      .sort((a, b) => order(a.kind) - order(b.kind))
      .slice(0, limit);
  }

  mandatory() { return this.list.filter((o) => o.kind === 'mandatory'); }
  mastery() { return this.list.filter((o) => o.kind === 'mastery'); }
  mandatoryDone() { return this.mandatory().every((o) => this.completed.has(o.id)); }
  stageProgress() {
    const mandatory = this.mandatory();
    const done = mandatory.filter((o) => this.completed.has(o.id)).length;
    const total = Math.max(1, mandatory.length);
    const stage = done >= total ? 3 : done >= Math.ceil(total * 0.55) ? 2 : done > 0 ? 1 : 0;
    return { stage, done, total, label: stageLabel(stage), percent: done / total };
  }
  masteryDone() { return this.mastery().filter((o) => this.completed.has(o.id)).length; }
  masteryTotal() { return this.mastery().length; }
  isDone(id) { return this.completed.has(id); }
  get all() { return this.list; }
  serialize() { return [...this.completed]; }
}

function stageLabel(stage) {
  return ['Dormant', 'Awakening', 'Adapting', 'Evolved'][stage] || 'Dormant';
}

function order(kind) {
  if (kind === 'mandatory') return 0;
  if (kind === 'portal') return 1;
  if (kind === 'mastery') return 2;
  return 3;
}
