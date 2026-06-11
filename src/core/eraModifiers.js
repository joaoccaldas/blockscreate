/**
 * Era modifiers — the data that makes each age (and each *branch*) actually
 * PLAY differently, not just look different.
 *
 * A modifier is a small set of multipliers/flags the Game reads to bend its core
 * loops: how fast crops grow, how often trade pays, how rich mining is, etc. The
 * branch ages lean hard into an identity — Flora = cultivation, the Trade
 * Republic = commerce — so two players on different routes have different *play*,
 * not just different art.
 *
 * Adding/​tuning an era's feel = one entry here. Missing fields default to 1/false.
 */
const DEFAULTS = {
  cropGrowth: 1,   // multiplier on crop ripening chance
  fiberBonus: 0,   // extra chance to also drop fiber when harvesting foliage
  tradeRate: 1,    // multiplier on market/caravan trade frequency
  tradeYield: 1,   // multiplier on CP earned per trade
  oreRichness: 1,  // (reserved) multiplier on ore generation odds
  tameEase: 1,     // multiplier on taming/bonding speed
};

export const ERA_MODIFIERS = {
  // Age of Flora — cultivation reality: crops race up, foliage gives more fiber,
  // grazers bond fast. Building a living garden is the whole point.
  flora: { cropGrowth: 2.2, fiberBonus: 0.4, tameEase: 1.6 },
  // Trade Republic — commerce reality: trade fires far more often and pays more;
  // wealth, not war, builds the civilization.
  republic: { tradeRate: 1.9, tradeYield: 1.6 },
  // Bronze already leans agrarian/mercantile a touch.
  bronze: { cropGrowth: 1.2, tradeRate: 1.15 },
};

export function getEraModifiers(eraId) {
  return { ...DEFAULTS, ...(ERA_MODIFIERS[eraId] || {}) };
}
