/**
 * Item registry.
 *
 * Items are anything that can sit in the inventory: placeable blocks, raw
 * materials, and tools. Placeable items carry a `place` block id so the world
 * knows what to drop into the grid.
 *
 * Placeable items are generated automatically from the block registry, then we
 * layer on materials and tools. Keeping items data-driven means a new craftable
 * tool or resource is just one entry.
 */
import { BLOCKS } from './blocks.js';

/** id -> { id, label, kind, place?, tool?, tier?, damage?, stack } */
export const ITEMS = {};

function add(item) {
  ITEMS[item.id] = { stack: 99, ...item };
}

// 1) Every non-air block that has a sensible "name drop" becomes a placeable item.
for (const id in BLOCKS) {
  const b = BLOCKS[id];
  if (b.id === 0) continue;
  add({ id: b.name, label: b.label, kind: 'block', place: b.id, colors: b.colors });
}

// 2) Raw materials (mined drops that are not placeable on their own).
const materials = [
  ['proto_cell', 'Proto-Cell', '#76f7dd'],
  ['stick', 'Stick', '#9a7038'],
  ['coal', 'Coal', '#222222'],
  ['copper', 'Copper Ingot', '#c87f4a'],
  ['tin', 'Tin Ingot', '#cfd0c8'],
  ['bronze', 'Bronze Ingot', '#a9743b'],
  ['iron', 'Iron Ingot', '#d8c9bc'],
  ['gold', 'Gold Ingot', '#f4d24a'],
  ['flint', 'Flint', '#3a3a3a'],
  ['fiber', 'Plant Fiber', '#9bbf5a'],
  ['food', 'Cooked Food', '#d6692f'],
  ['raw_food', 'Raw Meat', '#cf5d6a'],
  ['wheat', 'Wheat', '#e3c14e'],
  ['clay', 'Clay', '#9a8d7a'],
];
for (const [id, label, color] of materials) {
  add({ id, label, kind: 'material', colors: { base: color, top: color, side: color } });
}

// 3) Tools. Tier scales mining speed and gates progression by era.
const tools = [
  // id, label, tool kind, tier, color
  ['wood_pickaxe', 'Wooden Pickaxe', 'pickaxe', 1, '#b78a4e'],
  ['wood_axe', 'Wooden Axe', 'axe', 1, '#b78a4e'],
  ['wood_shovel', 'Wooden Shovel', 'shovel', 1, '#b78a4e'],
  ['stone_pickaxe', 'Stone Pickaxe', 'pickaxe', 2, '#8c8c8c'],
  ['stone_axe', 'Stone Axe', 'axe', 2, '#8c8c8c'],
  ['stone_shovel', 'Stone Shovel', 'shovel', 2, '#8c8c8c'],
  ['bronze_pickaxe', 'Bronze Pickaxe', 'pickaxe', 3, '#a9743b'],
  ['iron_pickaxe', 'Iron Pickaxe', 'pickaxe', 4, '#d8c9bc'],
];
for (const [id, label, tool, tier, color] of tools) {
  add({ id, label, kind: 'tool', tool, tier, stack: 1, colors: { base: color, top: color, side: color } });
}

const weapons = [
  ['bone_knife', 'Bone Knife', 6, '#d9cfb7'],
  ['flint_spear', 'Flint Spear', 9, '#6c6f68'],
];
for (const [id, label, damage, color] of weapons) {
  add({ id, label, kind: 'weapon', damage, stack: 1, colors: { base: color, top: color, side: color } });
}

export function getItem(id) {
  return ITEMS[id] || null;
}

export function isPlaceable(id) {
  const it = ITEMS[id];
  return !!(it && it.place != null);
}
