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
  trade: 4,
};

// Blocks that count as "building your settlement".
const SETTLEMENT_BLOCKS = new Set([
  'lipid_membrane', 'planks', 'cobblestone', 'brick', 'thatch', 'campfire', 'torch', 'log',
  'farm_plot', 'granary', 'market', 'caravan_post', 'gate', 'road', 'auto_miner', 'windmill', 'build_site',
  'smelter', 'factory', 'conveyor', 'generator', 'power_line',
]);

export class Civilization {
  constructor(eraId) {
    this.eraId = eraId;
    this.cp = 0;
    // Spendable era-market currency, earned as a byproduct of CP gains so it
    // never competes with the CP you need to advance. Displayed with an
    // era-themed name/icon (Biomass, Bone Tokens, Credits …) by the market.
    this.tokens = 0;
    this.population = 1;
    this.totalMined = 0;
    this.totalCrafted = 0;
    this.totalBuilt = 0;
    this.housing = 0;
    this.light = 0;
    this.placed = {};
    this.defeated = {};
    this.defense = 0;
    this.storage = 0;
    this.trade = 0;
    this.pollution = 0;
    this.highestBuild = Number.MAX_SAFE_INTEGER;
    this.deepestMine = 0;
  }

  addCP(amount) {
    this.cp += amount;
    // Earn market tokens alongside CP (positive gains only).
    if (amount > 0) this.tokens += amount * 0.6;
    // Population grows with a soft curve off accumulated CP.
    const target = 1 + Math.floor(Math.sqrt(this.cp) / 3);
    if (target > this.population) this.population = target;
  }

  /** Spend market tokens if affordable. Returns true on success. */
  spendTokens(amount) {
    if ((this.tokens || 0) < amount) return false;
    this.tokens -= amount;
    this.tokensSpent = (this.tokensSpent || 0) + amount; // for achievements/stats
    return true;
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
      if (itemId === 'farm_plot') this.housing += 0.05;
      if (itemId === 'granary') this.storage += 8;
      if (itemId === 'market') this.trade += 1;
      if (itemId === 'caravan_post') this.trade += 2;
      if (itemId === 'gate') this.defense += 3;
      if (itemId === 'road') this.trade += 0.1;
      if (itemId === 'auto_miner') this.pollution += 2;
      if (itemId === 'smelter') this.pollution += 2;
      if (itemId === 'factory') this.pollution += 3;
      if (itemId === 'generator') this.pollution += 2;
      if (itemId === 'windmill') this.pollution = Math.max(0, this.pollution - 1);
    }
  }

  onCook() {
    this.addCP(CP_GAINS.cook);
  }

  /**
   * A town building was destroyed (e.g. pillaged by raiders): drop it from the
   * placed tally and roll back the bonus it granted, so losing infrastructure
   * actually hurts the civilization.
   */
  onStructureLost(itemId) {
    if (this.placed[itemId]) this.placed[itemId] = Math.max(0, this.placed[itemId] - 1);
    if (itemId === 'granary') this.storage = Math.max(0, this.storage - 8);
    else if (itemId === 'market') this.trade = Math.max(0, this.trade - 1);
    else if (itemId === 'caravan_post') this.trade = Math.max(0, this.trade - 2);
    else if (itemId === 'gate') this.defense = Math.max(0, this.defense - 3);
  }

  onDefeat(type) {
    this.defeated[type] = (this.defeated[type] || 0) + 1;
  }

  onTrade(amount = CP_GAINS.trade) {
    this.addCP(amount);
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
    return Math.floor(this.housing + this.light * 0.8 + this.totalBuilt * 0.25 +
      this.defense * 0.8 + this.storage * 0.15 + this.trade * 1.2 - this.pollution * 0.25);
  }

  serialize() {
    return {
      eraId: this.eraId, cp: this.cp, tokens: this.tokens, tokensSpent: this.tokensSpent || 0, population: this.population,
      totalMined: this.totalMined, totalCrafted: this.totalCrafted, totalBuilt: this.totalBuilt,
      housing: this.housing, light: this.light, placed: this.placed, defeated: this.defeated,
      defense: this.defense, storage: this.storage, trade: this.trade, pollution: this.pollution,
      highestBuild: this.highestBuild, deepestMine: this.deepestMine,
    };
  }

  load(d) {
    if (d) Object.assign(this, d);
    this.tokens ??= 0;
    this.tokensSpent ??= 0;
    this.housing ??= 0;
    this.light ??= 0;
    this.placed ??= {};
    this.defeated ??= {};
    this.defense ??= 0;
    this.storage ??= 0;
    this.trade ??= 0;
    this.pollution ??= 0;
    this.highestBuild ??= Number.MAX_SAFE_INTEGER;
    this.deepestMine ??= 0;
  }
}
