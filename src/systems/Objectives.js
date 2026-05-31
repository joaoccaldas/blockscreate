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
  stone: [
    { id: 'gather_wood',  icon: '🪵', label: 'Punch trees for 3 Wood',     reward: 10, check: (g) => total(g, 'log') >= 3 },
    { id: 'make_planks',  icon: '🟫', label: 'Craft Wood Planks',          reward: 10, check: (g) => g.crafted.has('planks') },
    { id: 'make_pick',    icon: '⛏️', label: 'Craft a Stone Pickaxe',      reward: 20, check: (g) => g.crafted.has('stone_pickaxe') || total(g, 'stone_pickaxe') >= 1 },
    { id: 'mine_coal',    icon: '🪨', label: 'Mine some Coal',             reward: 15, check: (g) => total(g, 'coal') >= 1 },
    { id: 'build',        icon: '🏠', label: 'Place 10 blocks (build!)',   reward: 15, check: (g) => g.civ.totalBuilt >= 10 },
    { id: 'cook',         icon: '🍖', label: 'Cook food at a fire',        reward: 15, check: (g) => g.crafted.has('food') },
    { id: 'advance',      icon: '🌀', label: 'Open the next era portal',   reward: 0,  check: (g) => g.civ.canAdvance() },
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
    return this.list.filter((o) => !this.completed.has(o.id)).slice(0, limit);
  }

  isDone(id) { return this.completed.has(id); }
  get all() { return this.list; }
  serialize() { return [...this.completed]; }
}
