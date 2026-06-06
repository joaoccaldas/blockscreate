/**
 * Daily Challenge — the "come back tomorrow" loop.
 *
 * Every calendar day maps deterministically to one shared reality (seed + era +
 * variant) and one goal, so every player worldwide gets the *same* daily — a
 * talking point and a reason to return. Built on the same seed→reality machinery
 * as reality codes, so a daily is just a reality with a goal attached.
 *
 * Pure + deterministic (date in → challenge out); the Game checks goal
 * completion and Progress records the streak.
 */
import { ERA_NODES } from './eraGraph.js';
import { pickVariant } from './eraTheme.js';

// Implemented eras the daily rotates through (featured — playable regardless of
// the player's own unlock progress, which is part of the appeal).
const DAILY_ERAS = ['cell', 'stone', 'bronze', 'iron', 'industrial'];

// Goal archetypes valid across eras. `noCell` ones are skipped in the cell era
// (where there is no real mining/building).
const GOAL_POOL = {
  cp: { icon: '✨', text: (n) => `Earn ${n} Civ Points`, stat: (g) => g.civ?.cp || 0, amount: (t) => 80 + t * 45 },
  clues: { icon: '🔎', text: (n) => `Find ${n} clues`, stat: (g) => g.clues?.count?.() || 0, amount: () => 2 },
  stage: { icon: '🧭', text: (n) => `Reach era stage ${n}`, stat: (g) => g.eraStage || 0, amount: () => 2 },
  mine: { icon: '⛏️', text: (n) => `Mine ${n} blocks`, stat: (g) => g.civ?.totalMined || 0, amount: (t) => 30 + t * 15, noCell: true },
  build: { icon: '🧱', text: (n) => `Place ${n} blocks`, stat: (g) => g.civ?.totalBuilt || 0, amount: (t) => 15 + t * 8, noCell: true },
};

function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Stable YYYY-MM-DD key in UTC so the daily flips at the same instant globally. */
export function dateKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

/** The challenge for a given day: a fixed reality + a goal. */
export function dailyChallenge(date = new Date()) {
  const key = dateKey(date);
  const seed = hashStr(key);
  const dayIndex = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
  const era = DAILY_ERAS[((dayIndex % DAILY_ERAS.length) + DAILY_ERAS.length) % DAILY_ERAS.length];
  const tier = ERA_NODES[era]?.tier || 0;
  const variant = pickVariant(era, { seed });

  const valid = Object.keys(GOAL_POOL).filter((k) => !(GOAL_POOL[k].noCell && era === 'cell'));
  const gk = valid[hashStr(`${key}:goal`) % valid.length];
  const def = GOAL_POOL[gk];
  const amount = def.amount(tier);

  return {
    dateKey: key,
    seed,
    era,
    variant,
    mode: 'survival',
    goal: {
      id: gk,
      icon: def.icon,
      text: def.text(amount),
      amount,
      stat: def.stat,
      progress: (g) => Math.min(1, def.stat(g) / amount),
      done: (g) => def.stat(g) >= amount,
    },
  };
}
