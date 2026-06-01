/**
 * Crafting recipes — gated by era so progression feels earned.
 *
 * A recipe is pure data: inputs (item id -> qty), an output (item id + qty),
 * the era it unlocks in, and an optional station requirement. The Crafting
 * system reads this list; adding content never touches gameplay code.
 */

export const RECIPES = [
  // --- First Cell ---
  { id: 'lipid_membrane', era: 'cell', out: { id: 'lipid_membrane', n: 4 }, in: { nutrient_blob: 2 } },
  { id: 'proto_cell',     era: 'cell', out: { id: 'proto_cell', n: 1 }, in: { nutrient_blob: 3, mineral_vent: 1, lipid_membrane: 2 } },

  // --- Stone Age ---
  { id: 'planks',        era: 'stone', out: { id: 'planks', n: 4 }, in: { log: 1 } },
  { id: 'stick',         era: 'stone', out: { id: 'stick', n: 4 }, in: { planks: 2 } },
  { id: 'wood_pickaxe',  era: 'stone', out: { id: 'wood_pickaxe', n: 1 }, in: { planks: 3, stick: 2 } },
  { id: 'wood_axe',      era: 'stone', out: { id: 'wood_axe', n: 1 }, in: { planks: 3, stick: 2 } },
  { id: 'wood_shovel',   era: 'stone', out: { id: 'wood_shovel', n: 1 }, in: { planks: 1, stick: 2 } },
  { id: 'stone_pickaxe', era: 'stone', out: { id: 'stone_pickaxe', n: 1 }, in: { cobblestone: 3, stick: 2 } },
  { id: 'stone_axe',     era: 'stone', out: { id: 'stone_axe', n: 1 }, in: { cobblestone: 3, stick: 2 } },
  { id: 'stone_shovel',  era: 'stone', out: { id: 'stone_shovel', n: 1 }, in: { cobblestone: 1, stick: 2 } },
  { id: 'torch',         era: 'stone', out: { id: 'torch', n: 4 }, in: { stick: 1, coal: 1 } },
  { id: 'campfire',      era: 'stone', out: { id: 'campfire', n: 1 }, in: { log: 1, stick: 3 } },
  { id: 'thatch',        era: 'stone', out: { id: 'thatch', n: 4 }, in: { fiber: 2 } },
  { id: 'bone_knife',    era: 'stone', out: { id: 'bone_knife', n: 1 }, in: { bone_pile: 1, stick: 1 } },
  { id: 'flint_spear',   era: 'stone', out: { id: 'flint_spear', n: 1 }, in: { flint: 2, stick: 2, fiber: 1 } },
  { id: 'cook_food',     era: 'stone', out: { id: 'food', n: 1 }, in: { raw_food: 1 }, station: 'campfire' },

  // --- Bronze Age (defined so the system is complete; needs the era unlocked) ---
  { id: 'copper_ingot',  era: 'bronze', out: { id: 'copper', n: 1 }, in: { copper_ore: 1, coal: 1 }, station: 'campfire' },
  { id: 'tin_ingot',     era: 'bronze', out: { id: 'tin', n: 1 }, in: { tin_ore: 1, coal: 1 }, station: 'campfire' },
  { id: 'bronze_ingot',  era: 'bronze', out: { id: 'bronze', n: 2 }, in: { copper: 1, tin: 1 } },
  { id: 'brick',         era: 'bronze', out: { id: 'brick', n: 4 }, in: { clay: 4, coal: 1 }, station: 'campfire' },
  { id: 'farm_plot',     era: 'bronze', out: { id: 'farm_plot', n: 4 }, in: { dirt: 2, clay: 1 } },
  { id: 'wheat_seeds',   era: 'bronze', out: { id: 'wheat_seeds', n: 2 }, in: { fiber: 1 } },
  { id: 'bake_bread',    era: 'bronze', out: { id: 'food', n: 2 }, in: { wheat: 3 }, station: 'campfire' },
  { id: 'bronze_pickaxe',era: 'bronze', out: { id: 'bronze_pickaxe', n: 1 }, in: { bronze: 3, stick: 2 } },

  // --- Iron Age ---
  { id: 'iron_ingot',    era: 'iron', out: { id: 'iron', n: 1 }, in: { iron_ore: 1, coal: 1 }, station: 'campfire' },
  { id: 'gold_ingot',    era: 'iron', out: { id: 'gold', n: 1 }, in: { gold_ore: 1, coal: 1 }, station: 'campfire' },
  { id: 'iron_pickaxe',  era: 'iron', out: { id: 'iron_pickaxe', n: 1 }, in: { iron: 3, stick: 2 } },
];

/** Recipes available given the set of unlocked era ids. */
export function recipesForEras(unlockedSet) {
  return RECIPES.filter((r) => unlockedSet.has(r.era));
}
