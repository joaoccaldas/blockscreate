/**
 * Civilization system — the "civ sim meets Minecraft" layer.
 *
 * Civilization Points (CP) accrue from the acts that build a society: gathering
 * resources, crafting, and especially placing "settlement" blocks (planks,
 * brick, thatch, campfire...). CP grows population, and population + CP is what
 * opens the portal to the next era.
 *
 * This is deliberately a thin, readable model for milestone 1, but it owns the
 * progression rules so eras stay data-driven.
 */
import { getEra, nextEra } from '../core/eras.js';

// CP awarded for various actions. Tunable in one place.
const CP_GAINS = {
  mine: 0.5,
  craft: 3,
  build: 2, // placing a civilization block
  cook: 2,
  tame: 5,
  light: 1,
};

// Blocks that count as "building your settlement".
const SETTLEMENT_BLOCKS = new Set([
  'planks', 'cobblestone', 'brick', 'thatch', 'campfire', 'torch', 'log',
]);

export class Civilization {
  constructor(eraId) {
    this.eraId = eraId;
    this.cp = 0;
    this.population = 1;
    this.totalMined = 0;
    this.totalCrafted = 0;
    this.totalBuilt = 0;
    this.housing = 0;
    this.light = 0;
    this.placed = {};
    this.highestBuild = Number.MAX_SAFE_INTEGER;
    this.deepestMine = 0;
  }

  addCP(amount) {
    this.cp += amount;
    // Population grows with a soft curve off accumulated CP.
    const target = 1 + Math.floor(Math.sqrt(this.cp) / 3);
    if (target > this.population) this.population = target;
  }

  onMine(_itemId = null, y = 0) {
    this.totalMined++;
    this.deepestMine = Math.max(this.deepestMine, y);
    this.addCP(CP_GAINS.mine);
  }

  onCraft() {
    this.totalCrafted++;
    this.addCP(CP_GAINS.craft);
  }

  onBuild(itemId, x = 0, y = Infinity) {
    void x;
    this.placed[itemId] = (this.placed[itemId] || 0) + 1;
    this.highestBuild = Math.min(this.highestBuild, y);
    if (SETTLEMENT_BLOCKS.has(itemId)) {
      this.totalBuilt++;
      this.addCP(CP_GAINS.build);
      if (itemId === 'torch' || itemId === 'campfire') {
        this.light++;
        this.addCP(CP_GAINS.light);
      }
      if (itemId === 'planks' || itemId === 'log' || itemId === 'thatch') this.housing += 0.2;
      if (itemId === 'cobblestone' || itemId === 'brick') this.housing += 0.35;
    }
  }

  onCook() {
    this.addCP(CP_GAINS.cook);
  }

  /** Progress (0..1) toward unlocking the next era. */
  advanceProgress() {
    const era = getEra(this.eraId);
    if (!nextEra(this.eraId)) return 1;
    return Math.min(1, this.cp / era.advanceCost);
  }

  /** Has enough CP been earned to open the next portal? */
  canAdvance() {
    const era = getEra(this.eraId);
    return !!nextEra(this.eraId) && this.cp >= era.advanceCost;
  }

  canAdvanceWith(objectives) {
    return this.canAdvance() && (!objectives || objectives.mandatoryDone());
  }

  hasBuilt(itemId, count = 1) {
    return (this.placed[itemId] || 0) >= count;
  }

  settlementScore() {
    return Math.floor(this.housing + this.light * 0.8 + this.totalBuilt * 0.25);
  }

  serialize() {
    return {
      eraId: this.eraId, cp: this.cp, population: this.population,
      totalMined: this.totalMined, totalCrafted: this.totalCrafted, totalBuilt: this.totalBuilt,
      housing: this.housing, light: this.light, placed: this.placed,
      highestBuild: this.highestBuild, deepestMine: this.deepestMine,
    };
  }

  load(d) {
    if (d) Object.assign(this, d);
    this.housing ??= 0;
    this.light ??= 0;
    this.placed ??= {};
    this.highestBuild ??= Number.MAX_SAFE_INTEGER;
    this.deepestMine ??= 0;
  }
}
