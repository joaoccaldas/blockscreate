/**
 * Era market: each age sells era-relevant accelerants + a limited relic, priced
 * in an era-themed currency, bought with tokens earned through play.
 */
import assert from 'node:assert';
import { EraMarket, MARKET, CURRENCY } from '../src/systems/EraMarket.js';
import { getItem } from '../src/core/items.js';
import { POWERUPS } from '../src/systems/Powerups.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

const ERAS = ['cell', 'stone', 'bronze', 'iron', 'industrial'];

// --- every era has a themed currency and a full, valid catalog ---
for (const era of ERAS) {
  const offers = MARKET[era];
  assert.ok(Array.isArray(offers) && offers.length >= 4, `${era} has a stocked market`);
  assert.ok(CURRENCY[era]?.name && CURRENCY[era]?.icon, `${era} has a themed currency`);
  assert.strictEqual(offers.filter((o) => o.limited).length, 1, `${era} has exactly one limited relic`);
  for (const o of offers) {
    assert.ok(o.id && o.name && o.icon && o.desc, `${era}/${o.id} is fully described`);
    assert.ok(o.cost > 0, `${era}/${o.id} costs tokens`);
    if (o.kind === 'item') assert.ok(getItem(o.payload.id), `${era}/${o.id} grants a real item (${o.payload.id})`);
    else if (o.kind === 'powerup') assert.ok(POWERUPS[o.payload.id], `${era}/${o.id} grants a real powerup (${o.payload.id})`);
    else if (o.kind === 'stock') assert.ok(o.payload.key && o.payload.n > 0, `${era}/${o.id} adds town stock`);
    else if (o.kind === 'badge') assert.ok(o.payload.badge && o.limited, `${era}/${o.id} badge is a limited relic`);
    else throw new Error(`${era}/${o.id} has unknown kind ${o.kind}`);
  }
}
ok('every era ships a valid, themed catalog with one limited relic');

// --- offer ids are globally unique (buy-by-id is unambiguous) ---
const allIds = Object.values(MARKET).flat().map((o) => o.id);
assert.strictEqual(new Set(allIds).size, allIds.length, 'offer ids are unique across eras');
ok('offer ids are unique');

// --- affordability + claim bookkeeping ---
const m = new EraMarket();
const relic = MARKET.cell.find((o) => o.limited);
const cheap = MARKET.cell.find((o) => !o.limited);
assert.ok(!m.canBuy(relic, relic.cost - 1), 'cannot buy a relic without enough tokens');
assert.ok(m.canBuy(relic, relic.cost), 'can buy a relic with enough tokens');
m.claim(relic);
assert.ok(m.isClaimed(relic), 'a claimed relic is recorded');
assert.ok(!m.canBuy(relic, 9999), 'a claimed limited relic cannot be re-bought');
assert.ok(m.canBuy(cheap, cheap.cost), 'non-limited offers stay buyable');
assert.deepStrictEqual(m.badges().map((b) => b.id), [relic.id], 'earned relics are listed as badges');
ok('limited relics are one-time; consumables stay repeatable');

// --- serialize / restore round-trips claimed relics ---
const restored = new EraMarket(m.serialize());
assert.ok(restored.isClaimed(relic), 'claimed relics survive a save round-trip');
ok('market state serializes and restores');

console.log(`\nAll ${passed} era-market checks passed.`);
