/**
 * Combo: the flow-state streak. Chained actions climb tiers (faster mining + CP
 * bursts), idle time or a hit breaks it.
 */
import assert from 'node:assert';
import { Combo, COMBO_TIERS } from '../src/systems/Combo.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

// --- streak climbs tiers and reports each tier-up exactly once ---
{
  const c = new Combo();
  assert.strictEqual(c.multiplier(), 1, 'a cold combo has no speed bonus');
  let tierUps = 0;
  for (let i = 0; i < COMBO_TIERS[0].at; i++) { const r = c.add(); if (r.tierUp) tierUps++; }
  assert.strictEqual(tierUps, 1, 'the first tier triggers exactly once at its threshold');
  assert.ok(c.multiplier() > 1, 'reaching a tier boosts mining speed');
  assert.strictEqual(c.count, COMBO_TIERS[0].at, 'the count tracks the streak');
  ok('a streak climbs tiers and boosts mining speed');
}

// --- higher tiers give bigger multipliers ---
{
  const c = new Combo();
  let prev = 1;
  for (const tier of COMBO_TIERS) {
    while (c.count < tier.at) c.add();
    assert.ok(c.multiplier() >= prev, `tier at ${tier.at} is at least as fast`);
    prev = c.multiplier();
  }
  assert.ok(c.multiplier() >= COMBO_TIERS.at(-1).speed - 1e-9, 'the top tier gives the top multiplier');
  ok('multipliers escalate with the tiers');
}

// --- a tier-up reports its CP bonus ---
{
  const c = new Combo();
  let lastBonus = 0;
  for (let i = 0; i < COMBO_TIERS[1].at; i++) { const r = c.add(); if (r.tierUp) lastBonus = r.tierUp.bonus; }
  assert.strictEqual(lastBonus, COMBO_TIERS[1].bonus, 'crossing a tier reports its CP burst');
  ok('tier-ups carry a CP bonus to celebrate');
}

// --- idle past the window breaks the streak ---
{
  const c = new Combo();
  for (let i = 0; i < 10; i++) c.add();
  assert.strictEqual(c.update(1).broken, false, 'a short pause keeps the streak');
  const r = c.update(5);
  assert.ok(r.broken && r.final === 10, 'idling past the window breaks the streak and reports the final count');
  assert.strictEqual(c.count, 0, 'the streak resets after timing out');
  ok('idle time breaks the streak');
}

// --- a hit snaps the streak immediately + best is tracked ---
{
  const c = new Combo();
  for (let i = 0; i < 30; i++) c.add();
  assert.strictEqual(c.best, 30, 'best streak is remembered');
  assert.strictEqual(c.breakStreak(), 30, 'breaking returns the lost count');
  assert.strictEqual(c.count, 0, 'a hit snaps the streak to zero');
  assert.strictEqual(c.multiplier(), 1, 'a broken streak has no bonus');
  ok('a hit instantly snaps the streak');
}

console.log(`\nAll ${passed} combo checks passed.`);
