/**
 * Crafting system.
 *
 * Pure functions over an inventory + the set of unlocked eras. The UI asks for
 * the list of currently-craftable recipes and calls craft() when a player picks
 * one. Civilization Points are awarded by the caller, not here, to keep this
 * module focused.
 */
import { recipesForEras } from '../core/recipes.js';

export function availableRecipes(unlockedSet) {
  return recipesForEras(unlockedSet);
}

export function canCraft(recipe, inventory) {
  for (const id in recipe.in) {
    if (inventory.count(id) < recipe.in[id]) return false;
  }
  return true;
}

export function craft(recipe, inventory) {
  if (!canCraft(recipe, inventory)) return false;
  for (const id in recipe.in) inventory.remove(id, recipe.in[id]);
  inventory.add(recipe.out.id, recipe.out.n);
  return true;
}
