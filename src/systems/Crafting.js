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

export function hasStation(recipe, context) {
  if (!recipe.station) return true;
  if (!context) return false;
  if (typeof context.hasStation === 'function') return context.hasStation(recipe.station);
  if (context.civ && typeof context.civ.hasBuilt === 'function') return context.civ.hasBuilt(recipe.station);
  return false;
}

export function canCraft(recipe, inventory, context = null) {
  for (const id in recipe.in) {
    if (inventory.count(id) < recipe.in[id]) return false;
  }
  if (!hasStation(recipe, context)) return false;
  return true;
}

export function craft(recipe, inventory, context = null) {
  if (!canCraft(recipe, inventory, context)) return false;
  for (const id in recipe.in) inventory.remove(id, recipe.in[id]);
  inventory.add(recipe.out.id, recipe.out.n);
  return true;
}
