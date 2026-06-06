/**
 * Achievements — the collection/retention spine.
 *
 * Early ones fire within the first minute (mine, craft, build) for instant
 * dopamine; later ones are aspirational (reach an age, branch reality, descend
 * the simulation). Pure check list against game state — the Game evaluates them
 * on a throttle and stages the unlock toast. Secret ones show as ??? in the
 * Journal until earned, which is itself a curiosity hook.
 *
 * Adding one = a data entry with a `check(game)`; everything else is automatic.
 */
import { getEra } from '../core/eras.js';

export const ACHIEVEMENTS = [
  // --- first minute (instant dopamine) ---
  { id: 'first_touch', icon: '👆', name: 'First Touch', desc: 'Interact with the world for the first time.', check: (g) => (g.civ?.totalMined || 0) + (g.civ?.totalBuilt || 0) + g.inventory.count('nutrient_blob') >= 1 },
  { id: 'first_craft', icon: '🔧', name: 'Tinkerer', desc: 'Craft something.', check: (g) => (g.civ?.totalCrafted || 0) >= 1 },
  { id: 'first_build', icon: '🧱', name: 'Builder', desc: 'Place 5 blocks.', check: (g) => (g.civ?.totalBuilt || 0) >= 5 },
  { id: 'first_clue', icon: '🔎', name: 'Curious', desc: 'Discover your first clue.', check: (g) => (g.clues?.count?.() || 0) >= 1 },
  // --- early goals ---
  { id: 'evolved', icon: '🧬', name: 'It Lives!', desc: 'Evolve beyond the first cell.', check: (g) => g.eraId !== 'cell' },
  { id: 'shopper', icon: '🛒', name: 'Trader', desc: 'Buy from an era market.', check: (g) => (g.civ?.tokensSpent || 0) > 0 },
  { id: 'miner', icon: '⛏️', name: 'Prospector', desc: 'Mine 50 blocks.', check: (g) => (g.civ?.totalMined || 0) >= 50 },
  { id: 'town', icon: '🏘️', name: 'Founder', desc: 'Grow a settlement of 5.', check: (g) => (g.civ?.population || 0) >= 5 },
  // --- mid / deep ---
  { id: 'ancient', icon: '🛡️', name: 'Through the Ages', desc: 'Reach the Iron Age or beyond.', check: (g) => (getEra(g.eraId)?.order || 0) >= 3 },
  { id: 'industrialist', icon: '🏭', name: 'Industrialist', desc: 'Build a factory.', check: (g) => !!g.civ?.hasBuilt?.('factory') },
  { id: 'powered', icon: '⚡', name: 'On the Grid', desc: 'Power a machine with the grid.', check: (g) => (g.industryStatus?.poweredCount || 0) >= 1 },
  { id: 'archivist', icon: '📚', name: 'Archivist', desc: 'Collect 5 clues.', check: (g) => (g.clues?.count?.() || 0) >= 5 },
  { id: 'collector', icon: '🏅', name: 'Relic Hunter', desc: 'Claim a limited relic.', check: (g) => (g.market?.badges?.()?.length || 0) >= 1 },
  // --- the meta-arc (secret) ---
  { id: 'diverged', icon: '✷', name: 'Forking Paths', desc: 'Cause reality to branch.', check: (g) => (g.timeline?.divergedCount?.() || 0) >= 1, secret: true },
  { id: 'glitch', icon: '⌁', name: 'Bug in the Matrix', desc: 'Witness a reality bleed.', check: (g) => (g.timeline?.crossovers || 0) >= 1, secret: true },
  { id: 'the_stack', icon: '∞', name: 'Down the Stack', desc: 'Understand the nested simulation.', check: (g) => (g.simulation?.depth || 0) >= 4, secret: true },
];

export class AchievementLog {
  constructor(state = {}) {
    this.unlocked = new Set(Array.isArray(state) ? state : state.unlocked || []);
  }

  /** Returns achievements newly unlocked this evaluation (for toasts). */
  evaluate(game) {
    const newly = [];
    for (const a of ACHIEVEMENTS) {
      if (this.unlocked.has(a.id)) continue;
      let ok = false;
      try { ok = !!a.check(game); } catch (e) { ok = false; }
      if (ok) { this.unlocked.add(a.id); newly.push(a); }
    }
    return newly;
  }

  has(id) { return this.unlocked.has(id); }
  count() { return this.unlocked.size; }
  total() { return ACHIEVEMENTS.length; }
  all() { return ACHIEVEMENTS; }
  serialize() { return { unlocked: [...this.unlocked] }; }
}
