/**
 * Era manifests describe the historical layer separately from the engine.
 *
 * The ids stay stable for save compatibility, while player-facing names,
 * historical context, goals, animals, hazards and alternate-history hooks can
 * evolve as data.
 */
export const ERA_MANIFESTS = {
  cell: {
    id: 'cell',
    title: 'First Cell',
    subtitle: 'gather chemistry, form a membrane, and cross the threshold into life',
    historicalNote:
      'A simplified origin-of-life sandbox inspired by warm vents, nutrient gradients, membranes, and self-organization. It teaches the game at tiny scale before history explodes outward.',
    accuracy: 'science-inspired abstraction',
    playerForm: 'proto-cell',
    coreLoop: ['absorb nutrients', 'sense gradients', 'collect minerals', 'form membrane', 'stabilize life'],
    hazards: ['dilution', 'scarcity', 'unstable chemistry'],
    animals: ['none yet'],
    decorations: ['bubbles', 'mineral vents', 'micro currents'],
    mandatory: ['Absorb nutrients', 'Collect vent minerals', 'Craft a lipid membrane', 'Build a membrane boundary', 'Stabilize a proto-cell'],
    mastery: ['Store extra nutrients', 'Map a warm vent', 'Build a stronger membrane'],
    historicalClues: ['chemical_gradient', 'warm_vent', 'first_membrane'],
    branches: [
      { id: 'cellular_line', label: 'Cellular Line', condition: 'stabilize the proto-cell' },
      { id: 'ventborn', label: 'Ventborn', condition: 'master mineral vents before evolving' },
    ],
  },
  stone: {
    id: 'stone',
    title: 'Age of Dinosaurs',
    subtitle: 'survive among the dinosaurs, master fire, and outlast the asteroid',
    historicalNote:
      'An alternate prehistory where early survivors live alongside living dinosaurs. Tame fire, build shelter, and endure meteor showers that build toward an extinction-level impact.',
    accuracy: 'alternate-history survival fantasy',
    playerForm: 'survivor',
    coreLoop: ['forage', 'shelter', 'fire', 'tools', 'evade dinosaurs', 'survive the sky'],
    hazards: ['raptors', 'T-Rex', 'night', 'hunger', 'meteor showers', 'the asteroid'],
    animals: ['stegosaurus', 'triceratops', 'raptor', 'tyrannosaurus', 'goat'],
    decorations: ['giant ferns', 'bones', 'standing stones', 'ember pits'],
    mandatory: ['Gather wood', 'Craft planks', 'Craft a stone pickaxe', 'Mine coal', 'Build a shelter', 'Cook food'],
    mastery: ['Survive an impact', 'Build a portal ring', 'Befriend a grazer', 'Reach deep caves', 'Craft a spear', 'Hunt a predator'],
    historicalClues: [
      'fossil_bed',
      'cave_painting',
      'charcoal_handprint',
      'meteor_shard',
      'migration_marker',
    ],
    branches: [
      { id: 'survivors_line', label: 'Survivors', condition: 'advance after mandatory goals' },
      { id: 'saurian_echo', label: 'Saurian Bond', condition: 'befriend dinosaurs before advancing' },
      { id: 'firekeepers', label: 'Firekeepers', condition: 'master fire and shelter goals' },
    ],
  },
  bronze: {
    id: 'bronze',
    title: 'Early Cities',
    subtitle: 'smelt metals, store food, trade, and organize settlements',
    historicalNote: 'Bronze-age play focuses on metallurgy, walls, trade, writing seeds, and town identity.',
    accuracy: 'historical sandbox',
    playerForm: 'settler-chief',
    coreLoop: ['smelt', 'farm', 'trade', 'walls', 'writing', 'ritual'],
    hazards: ['drought', 'raids', 'food shortages'],
    animals: ['goat', 'cow', 'pig', 'chicken'],
    decorations: ['pottery', 'kiln', 'brick walls', 'market markers', 'glyph tablets'],
    mandatory: ['Build a workshop', 'Mine copper', 'Mine tin', 'Craft bronze', 'Build town blocks'],
    mastery: ['Create roads', 'Store food', 'Light the town', 'Build walls', 'Discover glyph clues'],
    historicalClues: ['clay_tablet', 'trade_bead', 'kiln_mark', 'river_map'],
    branches: [
      { id: 'merchant_city', label: 'Merchant City', condition: 'prioritize trade and roads' },
      { id: 'fortress_city', label: 'Fortress City', condition: 'prioritize walls and towers' },
    ],
  },
  iron: {
    id: 'iron',
    title: 'Iron Kingdoms',
    subtitle: 'forge iron, expand roads, defend cities, and formalize law',
    historicalNote: 'Iron-age play focuses on durable tools, organized cities, roads, lamps, law, and expansion.',
    accuracy: 'historical sandbox',
    playerForm: 'city builder',
    coreLoop: ['forge', 'roads', 'laws', 'defense', 'expansion'],
    hazards: ['raids', 'fires', 'resource strain'],
    animals: ['horse', 'cow', 'goat', 'chicken'],
    decorations: ['lamp posts', 'stone roads', 'gates', 'banners', 'law stones'],
    mandatory: ['Mine iron', 'Forge iron', 'Craft iron tools', 'Light the city'],
    mastery: ['Build gates', 'Build roads', 'Create law stones', 'Master gold work'],
    historicalClues: ['road_marker', 'law_stone', 'forge_stamp', 'battle_relic'],
    branches: [
      { id: 'road_empire', label: 'Road Empire', condition: 'prioritize roads and expansion' },
      { id: 'city_state', label: 'City-State', condition: 'prioritize defense and law' },
    ],
  },
  industrial: {
    id: 'industrial',
    title: 'Industrial Acceleration',
    subtitle: 'machines, factories, energy, pollution, and mass production',
    historicalNote: 'Industrial play should introduce machines with social and environmental tradeoffs.',
    accuracy: 'historical sandbox',
    playerForm: 'engineer',
    coreLoop: ['machines', 'power', 'rails', 'factories', 'pollution'],
    hazards: ['fire', 'pollution', 'labor strain'],
    animals: ['horse', 'cow', 'chicken'],
    decorations: ['pipes', 'rails', 'gears', 'lamps', 'factory bricks'],
    mandatory: ['Build power', 'Craft machines', 'Move resources', 'Manage pollution'],
    mastery: ['Clean industry', 'Rail network', 'Automated workshops'],
    historicalClues: ['blueprint', 'gear_stamp', 'rail_spike', 'smog_record'],
    branches: [
      { id: 'clean_industry', label: 'Clean Industry', condition: 'minimize pollution' },
      { id: 'machine_city', label: 'Machine City', condition: 'maximize production' },
    ],
  },
  republic: {
    id: 'republic',
    title: 'The Trade Republic',
    subtitle: 'a reality where coin, caravans and roads outpace the furnace',
    historicalNote: 'A merchant-first branch of the Iron Age: prosperity through markets, trade routes and law rather than smokestacks.',
    accuracy: 'alternate history',
    playerForm: 'merchant-prince',
    coreLoop: ['markets', 'caravans', 'roads', 'banking', 'guilds'],
    hazards: ['bandits', 'rival guilds', 'market crashes'],
    animals: ['horse', 'cow', 'goat', 'chicken'],
    decorations: ['market markers', 'banners', 'stone roads', 'guild seals', 'coin scales'],
    mandatory: ['Open a market', 'Send a caravan', 'Pave trade roads', 'Grow the treasury'],
    mastery: ['Found a guild charter', 'Master the caravans', 'Become a city of wealth'],
    historicalClues: ['trade_bead', 'river_map', 'law_stone', 'forge_stamp'],
    branches: [
      { id: 'merchant_city', label: 'Merchant City', condition: 'maximize trade & coin' },
      { id: 'road_empire', label: 'Road Empire', condition: 'connect everything with roads' },
    ],
  },
};

export function getEraManifest(id) {
  return ERA_MANIFESTS[id] || ERA_MANIFESTS.stone;
}
