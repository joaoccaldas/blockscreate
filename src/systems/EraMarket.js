/**
 * Era Market — an in-game shop whose stock is specific and relevant to each age.
 *
 * Motivation loop: you earn spendable *tokens* as a byproduct of play (see
 * Civilization.addCP), then trade them at the era's market for accelerants
 * (resources, timed boosts, town stock) that speed up exploration and
 * development — plus one-time **limited-edition** prestige rewards per era.
 *
 * The currency is one wallet mechanically, but reads differently per era
 * (Biomass in the primordial sea, Bone Tokens among dinosaurs, Credits in the
 * factory) so it always feels of-its-place.
 *
 * This module is pure data + bookkeeping: it owns the catalog and which limited
 * offers have been claimed. The Game applies an offer's effect and spends the
 * tokens, so all gameplay mutation stays in one place.
 */

// Per-era currency flavor. Mechanically identical; thematically distinct.
export const CURRENCY = {
  cell: { name: 'Biomass', icon: '🟢' },
  stone: { name: 'Bone Tokens', icon: '🦴' },
  bronze: { name: 'Trade Beads', icon: '🔵' },
  iron: { name: 'War Spoils', icon: '⚔️' },
  industrial: { name: 'Credits', icon: '💷' },
  republic: { name: 'Florins', icon: '🪙' },
};

// kind: 'item'    → payload { id, n }      grant inventory items
//       'powerup' → payload { id, seconds } grant a timed powerup
//       'stock'   → payload { key, n }      add to the town stockpile
//       'badge'   → payload { badge }       one-time prestige cosmetic (limited)
export const MARKET = {
  cell: [
    { id: 'c_nutrients', icon: '🫧', name: 'Nutrient Cache', cost: 8, kind: 'item', payload: { id: 'nutrient_blob', n: 3 }, desc: 'Draw a rich nutrient cloud your way — grow faster.' },
    { id: 'c_vent', icon: '♨️', name: 'Vent Sample', cost: 10, kind: 'item', payload: { id: 'mineral_vent', n: 2 }, desc: 'Bottled vent minerals to speed your first objectives.' },
    { id: 'c_membrane', icon: '🧬', name: 'Membrane Kit', cost: 14, kind: 'item', payload: { id: 'lipid_membrane', n: 2 }, desc: 'Pre-formed lipids — build your boundary sooner.' },
    { id: 'c_surge', icon: '⚡', name: 'Metabolic Surge', cost: 16, kind: 'powerup', payload: { id: 'time_shard', seconds: 45 }, desc: 'Absorb evolution points faster for a while.' },
    { id: 'c_spark', icon: '🌟', name: 'Primordial Spark', cost: 30, kind: 'badge', payload: { badge: 'first_light' }, limited: true, desc: 'Limited: a relic marking the very first life. Prestige only.' },
  ],
  stone: [
    { id: 's_food', icon: '🍖', name: "Hunter's Cache", cost: 10, kind: 'item', payload: { id: 'food', n: 4 }, desc: 'Cured meat to outlast cold nights and long hunts.' },
    { id: 's_ember', icon: '🔥', name: 'Ember Heart', cost: 14, kind: 'powerup', payload: { id: 'ember_heart', seconds: 90 }, desc: 'Carry warmth — shrug off the night chill.' },
    { id: 's_bone', icon: '🦴', name: 'Bone Charm', cost: 16, kind: 'powerup', payload: { id: 'fossil_charm', seconds: 90 }, desc: 'Predators bite softer while it lasts.' },
    { id: 's_stone', icon: '🪨', name: 'Stone Cache', cost: 12, kind: 'item', payload: { id: 'stone', n: 12 }, desc: 'A heap of cut stone to raise shelter fast.' },
    { id: 's_crest', icon: '🦕', name: 'Saurian Crest', cost: 40, kind: 'badge', payload: { badge: 'saurian_crest' }, limited: true, desc: 'Limited: worn by those the great beasts respect.' },
  ],
  bronze: [
    { id: 'b_seeds', icon: '🌾', name: 'Seed Pack', cost: 10, kind: 'item', payload: { id: 'wheat_seeds', n: 4 }, desc: 'Sow more fields, feed more people.' },
    { id: 'b_rations', icon: '🥖', name: 'Ration Crate', cost: 12, kind: 'item', payload: { id: 'food', n: 5 }, desc: 'Stored meals so growth never stalls.' },
    { id: 'b_bronze', icon: '🔨', name: 'Bronze Billet', cost: 18, kind: 'item', payload: { id: 'bronze', n: 3 }, desc: 'Ready alloy to skip the smelting queue.' },
    { id: 'b_favor', icon: '🏺', name: 'Merchant Favor', cost: 20, kind: 'powerup', payload: { id: 'time_shard', seconds: 60 }, desc: 'Trade momentum — civilization points roll in faster.' },
    { id: 'b_idol', icon: '👑', name: 'Golden Idol', cost: 45, kind: 'badge', payload: { badge: 'golden_idol' }, limited: true, desc: 'Limited: a city treasure that outlives its makers.' },
  ],
  iron: [
    { id: 'i_iron', icon: '🛡️', name: 'Iron Billet', cost: 16, kind: 'item', payload: { id: 'iron', n: 3 }, desc: 'Forged iron to arm and armor your town.' },
    { id: 'i_ramparts', icon: '🧱', name: 'Rampart Kit', cost: 18, kind: 'stock', payload: { key: 'ore', n: 8 }, desc: 'Town ore stock for raising walls before a raid.' },
    { id: 'i_meal', icon: '🥩', name: 'Garrison Rations', cost: 14, kind: 'item', payload: { id: 'food', n: 6 }, desc: 'Keep defenders fed through a siege.' },
    { id: 'i_charm', icon: '⛏️', name: "Meteor Pick", cost: 24, kind: 'powerup', payload: { id: 'meteor_pick', seconds: 75 }, desc: 'Tear through stone — fortify in record time.' },
    { id: 'i_aegis', icon: '🏰', name: "Hero's Aegis", cost: 50, kind: 'badge', payload: { badge: 'heros_aegis' }, limited: true, desc: 'Limited: borne by the defender who never fell.' },
  ],
  industrial: [
    { id: 'n_steel', icon: '🔩', name: 'Steel Crate', cost: 18, kind: 'item', payload: { id: 'steel', n: 4 }, desc: 'Pre-rolled steel to skip ahead in the chain.' },
    { id: 'n_parts', icon: '⚙️', name: 'Parts Crate', cost: 22, kind: 'item', payload: { id: 'machine_part', n: 2 }, desc: 'Finished machine parts, straight to your stock.' },
    { id: 'n_grid', icon: '🔌', name: 'Grid Kit', cost: 16, kind: 'item', payload: { id: 'power_line', n: 6 }, desc: 'A reel of power line to wire the factory.' },
    { id: 'n_surge', icon: '⚡', name: 'Output Surge', cost: 22, kind: 'powerup', payload: { id: 'time_shard', seconds: 60 }, desc: 'Production momentum — CP rolls in faster.' },
    { id: 'n_plaque', icon: '🏭', name: "Founder's Plaque", cost: 60, kind: 'badge', payload: { badge: 'founders_plaque' }, limited: true, desc: 'Limited: cast for the architect of the machine age.' },
  ],
  republic: [
    { id: 'r_beads', icon: '🔵', name: 'Bead Purse', cost: 12, kind: 'item', payload: { id: 'trade_bead', n: 2 }, desc: 'Trade beads to grease the caravans.' },
    { id: 'r_rations', icon: '🥖', name: 'Caravan Rations', cost: 12, kind: 'item', payload: { id: 'food', n: 6 }, desc: 'Provisions to keep the routes moving.' },
    { id: 'r_stone', icon: '🛣️', name: 'Road Stone', cost: 14, kind: 'item', payload: { id: 'stone', n: 16 }, desc: 'Cut stone to pave trade roads fast.' },
    { id: 'r_favor', icon: '🏺', name: 'Guild Favor', cost: 22, kind: 'powerup', payload: { id: 'time_shard', seconds: 70 }, desc: 'Commerce momentum — coin rolls in faster.' },
    { id: 'r_charter', icon: '📜', name: 'Charter Seal', cost: 50, kind: 'badge', payload: { badge: 'charter_seal' }, limited: true, desc: 'Limited: the founding seal of a great republic.' },
  ],
};

export class EraMarket {
  constructor(state = {}) {
    this.owned = new Set(Array.isArray(state) ? state : state.owned || []);
  }

  currency(eraId) { return CURRENCY[eraId] || { name: 'Tokens', icon: '🪙' }; }

  offersFor(eraId) { return MARKET[eraId] || []; }

  /** A limited offer already claimed cannot be bought again. */
  isClaimed(offer) { return !!offer?.limited && this.owned.has(offer.id); }

  canBuy(offer, tokens) {
    if (!offer || this.isClaimed(offer)) return false;
    return (tokens || 0) >= offer.cost;
  }

  /** Mark a limited offer as claimed (called by the Game after a purchase). */
  claim(offer) { if (offer?.limited) this.owned.add(offer.id); }

  /** All limited prestige rewards earned, across every era. */
  badges() {
    const out = [];
    for (const offers of Object.values(MARKET)) {
      for (const o of offers) if (o.limited && this.owned.has(o.id)) out.push(o);
    }
    return out;
  }

  find(eraId, offerId) { return this.offersFor(eraId).find((o) => o.id === offerId) || null; }

  serialize() { return { owned: [...this.owned] }; }
}
