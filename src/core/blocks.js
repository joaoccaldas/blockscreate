/**
 * Block registry.
 *
 * Blocks are the building material of the world grid. Each block has a numeric
 * id (0 = air) so the world can be stored compactly and serialized cheaply.
 *
 * Adding a new block = adding one entry here. Everything else (rendering,
 * mining, placing, inventory) is data-driven off this registry, which is what
 * keeps the engine modular and scalable across eras.
 *
 * Fields:
 *   id       numeric grid id
 *   name     stable string key (also the inventory item id when placeable)
 *   label    human readable
 *   solid    blocks movement / collides
 *   hardness mining time in seconds with bare hands (0 = instant)
 *   tool     preferred tool kind ('pickaxe'|'axe'|'shovel'|'hand')
 *   colors   { base, top, side } for the pseudo-3D shaded look
 *   drops    item id, weighted list, or null (defaults to the block's own name)
 *   era      earliest era this block naturally generates / is craftable in
 *   light    light emitted (0..1), used for torches/fire later
 *   minTier  minimum matching-tool tier required to harvest a drop (0 = hands).
 *            Mining with a weaker/wrong tool is refused; see Game._canMine.
 *   falls    true if the block obeys gravity (sand/gravel) when unsupported.
 */

export const AIR = 0;

const defs = [
  { id: 0,  name: 'air',        label: 'Air',          solid: false, hardness: 0,  tool: 'hand',    colors: null, era: 'stone' },

  // Natural terrain
  { id: 1,  name: 'grass',      label: 'Grass',        solid: true,  hardness: 0.6, tool: 'shovel',  colors: { base: '#5a9e3f', top: '#6fc04e', side: '#4a8233' }, era: 'stone' },
  { id: 2,  name: 'dirt',       label: 'Dirt',         solid: true,  hardness: 0.5, tool: 'shovel',  colors: { base: '#7a5230', top: '#8a5f38', side: '#653f23' }, era: 'stone' },
  { id: 3,  name: 'stone',      label: 'Stone',        solid: true,  hardness: 1.6, tool: 'pickaxe', minTier: 1, colors: { base: '#7d7d7d', top: '#8c8c8c', side: '#6a6a6a' }, era: 'stone', drops: 'cobblestone' },
  { id: 4,  name: 'sand',       label: 'Sand',         solid: true,  hardness: 0.5, tool: 'shovel',  falls: true, colors: { base: '#dccb8a', top: '#e8d99c', side: '#c6b673' }, era: 'stone' },
  { id: 5,  name: 'water',      label: 'Water',        solid: false, hardness: 0,  tool: 'hand',    colors: { base: '#3b6fd4', top: '#4f86ee', side: '#2f5bb0' }, era: 'stone', liquid: true },
  { id: 6,  name: 'bedrock',    label: 'Bedrock',      solid: true,  hardness: Infinity, tool: 'pickaxe', colors: { base: '#3a3a3a', top: '#454545', side: '#2c2c2c' }, era: 'stone' },

  // Wood / plants
  { id: 7,  name: 'log',        label: 'Wood Log',     solid: true,  hardness: 1.1, tool: 'axe',     colors: { base: '#7b5a31', top: '#caa56a', side: '#684c29' }, era: 'stone', drops: 'log' },
  { id: 8,  name: 'leaves',     label: 'Leaves',       solid: true,  hardness: 0.2, tool: 'hand',    colors: { base: '#3f8a37', top: '#4ea043', side: '#347430' }, era: 'stone', drops: [{ id: 'stick', chance: 0.45 }, { id: 'fiber', chance: 0.35 }] },
  { id: 9,  name: 'planks',     label: 'Wood Planks',  solid: true,  hardness: 1.0, tool: 'axe',     colors: { base: '#b78a4e', top: '#c89a5c', side: '#9e7740' }, era: 'stone' },

  // Ores
  { id: 10, name: 'coal_ore',   label: 'Coal Ore',     solid: true,  hardness: 2.2, tool: 'pickaxe', minTier: 1, colors: { base: '#5a5a5a', top: '#6a6a6a', side: '#484848' }, era: 'stone', drops: 'coal', fleck: '#1a1a1a' },
  { id: 11, name: 'copper_ore', label: 'Copper Ore',   solid: true,  hardness: 2.6, tool: 'pickaxe', minTier: 1, colors: { base: '#857c6e', top: '#968b7b', side: '#6f675b' }, era: 'bronze', drops: 'copper_ore', fleck: '#c87f4a' },
  { id: 12, name: 'tin_ore',    label: 'Tin Ore',      solid: true,  hardness: 2.6, tool: 'pickaxe', minTier: 1, colors: { base: '#8a8a86', top: '#9b9b96', side: '#727270' }, era: 'bronze', drops: 'tin_ore', fleck: '#d8d8d0' },
  { id: 13, name: 'iron_ore',   label: 'Iron Ore',     solid: true,  hardness: 3.2, tool: 'pickaxe', minTier: 2, colors: { base: '#8a7f76', top: '#9a8e84', side: '#736a62' }, era: 'iron', drops: 'iron_ore', fleck: '#d6b8a0' },
  { id: 14, name: 'gold_ore',   label: 'Gold Ore',     solid: true,  hardness: 3.0, tool: 'pickaxe', minTier: 2, colors: { base: '#8a8260', top: '#9c9470', side: '#726b4f' }, era: 'iron', drops: 'gold_ore', fleck: '#f4d24a' },

  // Crafted / civilization building blocks
  { id: 15, name: 'cobblestone',label: 'Cobblestone',  solid: true,  hardness: 1.8, tool: 'pickaxe', minTier: 1, colors: { base: '#6f6f6f', top: '#808080', side: '#5c5c5c' }, era: 'stone' },
  { id: 16, name: 'brick',      label: 'Bricks',       solid: true,  hardness: 2.0, tool: 'pickaxe', colors: { base: '#9e4b3a', top: '#b25946', side: '#853d30' }, era: 'bronze' },
  { id: 17, name: 'thatch',     label: 'Thatch Roof',  solid: true,  hardness: 0.4, tool: 'hand',    colors: { base: '#c2a martyr', top: '#d4b15a', side: '#a88f3f' }, era: 'stone' },
  { id: 18, name: 'torch',      label: 'Torch',        solid: false, hardness: 0,  tool: 'hand',    colors: { base: '#ffb347', top: '#ffd27a', side: '#e08a2a' }, era: 'stone', light: 0.9 },
  { id: 19, name: 'campfire',   label: 'Campfire',     solid: true,  hardness: 0.3, tool: 'hand',    colors: { base: '#a8521f', top: '#ff7b29', side: '#7d3c16' }, era: 'stone', light: 0.8 },
  { id: 20, name: 'clay',       label: 'Clay Deposit', solid: true,  hardness: 0.7, tool: 'shovel',  colors: { base: '#9a8d7a', top: '#afa18a', side: '#807462' }, era: 'stone', drops: 'clay' },
  { id: 21, name: 'gravel',     label: 'Gravel',       solid: true,  hardness: 0.7, tool: 'shovel',  falls: true, colors: { base: '#77756f', top: '#8a8882', side: '#62605b' }, era: 'stone', drops: [{ id: 'flint', chance: 0.4 }, { id: 'gravel', chance: 1 }] },

  // Historical clues / decorations
  { id: 22, name: 'fossil_bed',         label: 'Fossil Bed',         solid: true,  hardness: 1.4, tool: 'pickaxe', colors: { base: '#8d826f', top: '#d9cfb7', side: '#6f6658' }, era: 'stone', drops: 'fossil_bed', clue: 'fossil_bed' },
  { id: 23, name: 'meteor_shard',       label: 'Meteor Shard',       solid: true,  hardness: 2.0, tool: 'pickaxe', colors: { base: '#51485c', top: '#8e6bd6', side: '#2e2938' }, era: 'stone', drops: 'meteor_shard', clue: 'meteor_shard', light: 0.35 },
  { id: 24, name: 'charcoal_handprint', label: 'Charcoal Handprint', solid: false, hardness: 0.2, tool: 'hand',    colors: { base: '#2c2520', top: '#3a3028', side: '#181411' }, era: 'stone', drops: 'charcoal_handprint', clue: 'charcoal_handprint' },
  { id: 25, name: 'standing_stone',     label: 'Standing Stone',     solid: true,  hardness: 2.2, tool: 'pickaxe', colors: { base: '#6c6f68', top: '#85887f', side: '#4f524c' }, era: 'stone', drops: 'standing_stone', clue: 'migration_marker' },
  { id: 26, name: 'hide_wall',          label: 'Hide Wall',          solid: true,  hardness: 0.5, tool: 'hand',    colors: { base: '#9a6a42', top: '#b78254', side: '#704a2c' }, era: 'stone' },
  { id: 27, name: 'bone_pile',          label: 'Bone Pile',          solid: true,  hardness: 0.6, tool: 'hand',    colors: { base: '#cfc5a8', top: '#eee3c5', side: '#9b9077' }, era: 'stone', drops: 'bone_pile' },

  // Origin-of-life era
  { id: 28, name: 'primordial_mud',      label: 'Primordial Mud',     solid: true,  hardness: 0.25, tool: 'hand',   colors: { base: '#276f68', top: '#3fb8a8', side: '#1d514d' }, era: 'cell', drops: 'primordial_mud' },
  { id: 29, name: 'nutrient_blob',       label: 'Nutrient Blob',      solid: true,  hardness: 0.15, tool: 'hand',   colors: { base: '#73e06a', top: '#b8ff85', side: '#3aa84d' }, era: 'cell', drops: 'nutrient_blob', light: 0.15 },
  { id: 30, name: 'mineral_vent',        label: 'Mineral Vent',       solid: true,  hardness: 0.35, tool: 'hand',   colors: { base: '#506a76', top: '#9bd6e0', side: '#35424a' }, era: 'cell', drops: 'mineral_vent', light: 0.25 },
  { id: 31, name: 'lipid_membrane',      label: 'Lipid Membrane',     solid: true,  hardness: 0.2,  tool: 'hand',   colors: { base: '#e8a8ff', top: '#ffd6ff', side: '#9f66c8' }, era: 'cell', drops: 'lipid_membrane' },
];

// fix accidental typo above without breaking the table layout
defs[17].colors = { base: '#c2a14a', top: '#d4b15a', side: '#a88f3f' };

/** id -> def */
export const BLOCKS = {};
/** name -> def */
export const BLOCK_BY_NAME = {};

for (const d of defs) {
  BLOCKS[d.id] = d;
  BLOCK_BY_NAME[d.name] = d;
}

export function getBlock(id) {
  return BLOCKS[id] || BLOCKS[AIR];
}

export function blockId(name) {
  const b = BLOCK_BY_NAME[name];
  return b ? b.id : AIR;
}

export function isSolid(id) {
  const b = BLOCKS[id];
  return !!(b && b.solid);
}

/** Backward-compatible primary item dropped when a block is mined. */
export function dropOf(id) {
  const drops = dropsOf(id, () => 0);
  return drops[0] || null;
}

/** All item ids dropped when a block is mined. */
export function dropsOf(id, rng = Math.random) {
  const b = BLOCKS[id];
  if (!b) return [];
  if (b.drops == null) return [b.name];
  if (typeof b.drops === 'string') return [b.drops];
  const out = [];
  for (const d of b.drops) {
    if ((d.chance ?? 1) >= 1 || rng() <= d.chance) out.push(d.id);
  }
  return out;
}

/** Minimum matching-tool tier needed to harvest this block (0 = bare hands). */
export function minTierOf(id) {
  const b = BLOCKS[id];
  return b && b.minTier ? b.minTier : 0;
}

/** Does this block fall when the tile beneath it is empty? */
export function fallsOf(id) {
  const b = BLOCKS[id];
  return !!(b && b.falls);
}
