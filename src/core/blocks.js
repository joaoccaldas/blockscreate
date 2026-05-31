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
 *   drops    item id(s) produced when mined (defaults to the block's own name)
 *   era      earliest era this block naturally generates / is craftable in
 *   light    light emitted (0..1), used for torches/fire later
 */

export const AIR = 0;

const defs = [
  { id: 0,  name: 'air',        label: 'Air',          solid: false, hardness: 0,  tool: 'hand',    colors: null, era: 'stone' },

  // Natural terrain
  { id: 1,  name: 'grass',      label: 'Grass',        solid: true,  hardness: 0.6, tool: 'shovel',  colors: { base: '#5a9e3f', top: '#6fc04e', side: '#4a8233' }, era: 'stone' },
  { id: 2,  name: 'dirt',       label: 'Dirt',         solid: true,  hardness: 0.5, tool: 'shovel',  colors: { base: '#7a5230', top: '#8a5f38', side: '#653f23' }, era: 'stone' },
  { id: 3,  name: 'stone',      label: 'Stone',        solid: true,  hardness: 1.6, tool: 'pickaxe', colors: { base: '#7d7d7d', top: '#8c8c8c', side: '#6a6a6a' }, era: 'stone' },
  { id: 4,  name: 'sand',       label: 'Sand',         solid: true,  hardness: 0.5, tool: 'shovel',  colors: { base: '#dccb8a', top: '#e8d99c', side: '#c6b673' }, era: 'stone' },
  { id: 5,  name: 'water',      label: 'Water',        solid: false, hardness: 0,  tool: 'hand',    colors: { base: '#3b6fd4', top: '#4f86ee', side: '#2f5bb0' }, era: 'stone', liquid: true },
  { id: 6,  name: 'bedrock',    label: 'Bedrock',      solid: true,  hardness: Infinity, tool: 'pickaxe', colors: { base: '#3a3a3a', top: '#454545', side: '#2c2c2c' }, era: 'stone' },

  // Wood / plants
  { id: 7,  name: 'log',        label: 'Wood Log',     solid: true,  hardness: 1.1, tool: 'axe',     colors: { base: '#7b5a31', top: '#caa56a', side: '#684c29' }, era: 'stone', drops: 'log' },
  { id: 8,  name: 'leaves',     label: 'Leaves',       solid: true,  hardness: 0.2, tool: 'hand',    colors: { base: '#3f8a37', top: '#4ea043', side: '#347430' }, era: 'stone', drops: 'stick' },
  { id: 9,  name: 'planks',     label: 'Wood Planks',  solid: true,  hardness: 1.0, tool: 'axe',     colors: { base: '#b78a4e', top: '#c89a5c', side: '#9e7740' }, era: 'stone' },

  // Ores
  { id: 10, name: 'coal_ore',   label: 'Coal Ore',     solid: true,  hardness: 2.2, tool: 'pickaxe', colors: { base: '#5a5a5a', top: '#6a6a6a', side: '#484848' }, era: 'stone', drops: 'coal', fleck: '#1a1a1a' },
  { id: 11, name: 'copper_ore', label: 'Copper Ore',   solid: true,  hardness: 2.6, tool: 'pickaxe', colors: { base: '#857c6e', top: '#968b7b', side: '#6f675b' }, era: 'bronze', drops: 'copper', fleck: '#c87f4a' },
  { id: 12, name: 'tin_ore',    label: 'Tin Ore',      solid: true,  hardness: 2.6, tool: 'pickaxe', colors: { base: '#8a8a86', top: '#9b9b96', side: '#727270' }, era: 'bronze', drops: 'tin', fleck: '#d8d8d0' },
  { id: 13, name: 'iron_ore',   label: 'Iron Ore',     solid: true,  hardness: 3.2, tool: 'pickaxe', colors: { base: '#8a7f76', top: '#9a8e84', side: '#736a62' }, era: 'iron', drops: 'iron', fleck: '#d6b8a0' },
  { id: 14, name: 'gold_ore',   label: 'Gold Ore',     solid: true,  hardness: 3.0, tool: 'pickaxe', colors: { base: '#8a8260', top: '#9c9470', side: '#726b4f' }, era: 'iron', drops: 'gold', fleck: '#f4d24a' },

  // Crafted / civilization building blocks
  { id: 15, name: 'cobblestone',label: 'Cobblestone',  solid: true,  hardness: 1.8, tool: 'pickaxe', colors: { base: '#6f6f6f', top: '#808080', side: '#5c5c5c' }, era: 'stone' },
  { id: 16, name: 'brick',      label: 'Bricks',       solid: true,  hardness: 2.0, tool: 'pickaxe', colors: { base: '#9e4b3a', top: '#b25946', side: '#853d30' }, era: 'bronze' },
  { id: 17, name: 'thatch',     label: 'Thatch Roof',  solid: true,  hardness: 0.4, tool: 'hand',    colors: { base: '#c2a martyr', top: '#d4b15a', side: '#a88f3f' }, era: 'stone' },
  { id: 18, name: 'torch',      label: 'Torch',        solid: false, hardness: 0,  tool: 'hand',    colors: { base: '#ffb347', top: '#ffd27a', side: '#e08a2a' }, era: 'stone', light: 0.9 },
  { id: 19, name: 'campfire',   label: 'Campfire',     solid: true,  hardness: 0.3, tool: 'hand',    colors: { base: '#a8521f', top: '#ff7b29', side: '#7d3c16' }, era: 'stone', light: 0.8 },
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

/** Item id dropped when a block is mined. */
export function dropOf(id) {
  const b = BLOCKS[id];
  if (!b) return null;
  return b.drops || b.name;
}
