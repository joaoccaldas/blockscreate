/**
 * Era manifests describe the historical layer separately from the engine.
 *
 * The ids stay stable for save compatibility, while player-facing names,
 * historical context, goals, animals, hazards and alternate-history hooks can
 * evolve as data.
 */
export const ERA_MANIFESTS = {
  stone: {
    id: 'stone',
    title: 'First Humans',
    subtitle: 'survive, learn fire, and leave the first traces of culture',
    historicalNote:
      'Modern humans appear long after non-avian dinosaurs. This era treats dinosaurs as fossils, memories, and optional alternate-timeline pressure.',
    accuracy: 'historical with alternate-reality branches',
    playerForm: 'forager',
    coreLoop: ['forage', 'shelter', 'fire', 'tools', 'clues', 'migration'],
    hazards: ['night cold', 'predators', 'hunger', 'storms', 'asteroid omens'],
    animals: ['goat', 'boar', 'aurochs', 'wolf', 'mammoth'],
    decorations: ['bones', 'hide walls', 'cave paint', 'standing stones', 'ember pits'],
    mandatory: ['Gather wood', 'Craft planks', 'Craft a stone pickaxe', 'Mine coal', 'Build a shelter', 'Cook food'],
    mastery: ['Decode fossils', 'Build a portal ring', 'Befriend animals', 'Reach deep caves', 'Build high watch points'],
    historicalClues: [
      'fossil_bed',
      'cave_painting',
      'charcoal_handprint',
      'meteor_shard',
      'migration_marker',
    ],
    branches: [
      { id: 'accurate_line', label: 'Historical Line', condition: 'advance after mandatory goals' },
      { id: 'saurian_echo', label: 'Saurian Echo', condition: 'master fossil clues before advancing' },
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
    mastery: ['Create roads', 'Store food', 'Build walls', 'Discover glyph clues'],
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
};

export function getEraManifest(id) {
  return ERA_MANIFESTS[id] || ERA_MANIFESTS.stone;
}

