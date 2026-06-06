/**
 * Achievements: the collection/retention spine. One-shot, gated by game state,
 * with early ones easy (instant dopamine) and a secret meta-arc.
 */
import assert from 'node:assert';
import { AchievementLog, ACHIEVEMENTS } from '../src/systems/Achievements.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

// Minimal game stub the checks read from.
function stubGame(over = {}) {
  return {
    eraId: 'cell',
    civ: { totalMined: 0, totalBuilt: 0, totalCrafted: 0, population: 1, tokensSpent: 0, hasBuilt: () => false },
    inventory: { count: () => 0 },
    clues: { count: () => 0 },
    market: { badges: () => [] },
    timeline: { divergedCount: () => 0, crossovers: 0 },
    simulation: { depth: 0 },
    industryStatus: null,
    ...over,
  };
}

// --- nothing unlocks on a blank slate; early ones unlock with first actions ---
{
  const log = new AchievementLog();
  assert.strictEqual(log.evaluate(stubGame()).length, 0, 'a fresh game unlocks nothing');
  const g = stubGame({ civ: { totalMined: 1, totalBuilt: 5, totalCrafted: 1, population: 1, hasBuilt: () => false } });
  const got = log.evaluate(g).map((a) => a.id);
  assert.ok(got.includes('first_touch'), 'interacting unlocks First Touch');
  assert.ok(got.includes('first_craft'), 'crafting unlocks Tinkerer');
  assert.ok(got.includes('first_build'), 'placing 5 blocks unlocks Builder');
  ok('early achievements unlock from the first actions (instant dopamine)');
}

// --- one-shot: an unlocked achievement is not re-reported ---
{
  const log = new AchievementLog();
  const g = stubGame({ clues: { count: () => 1 } });
  assert.ok(log.evaluate(g).some((a) => a.id === 'first_clue'), 'first clue unlocks');
  assert.ok(!log.evaluate(g).some((a) => a.id === 'first_clue'), 'it does not unlock twice');
  ok('achievements are one-shot');
}

// --- deep / secret achievements gate on the meta systems ---
{
  const log = new AchievementLog();
  const got = log.evaluate(stubGame({
    eraId: 'industrial',
    timeline: { divergedCount: () => 2, crossovers: 1 },
    simulation: { depth: 4 },
    civ: { totalMined: 0, totalBuilt: 0, totalCrafted: 0, population: 1, hasBuilt: (b) => b === 'factory' },
  })).map((a) => a.id);
  for (const id of ['evolved', 'industrialist', 'diverged', 'glitch', 'the_stack']) {
    assert.ok(got.includes(id), `${id} unlocks when its condition is met`);
  }
  ok('deep + secret achievements gate on era/timeline/simulation state');
}

// --- a faulty check never throws (defensive evaluation) ---
{
  const log = new AchievementLog();
  assert.doesNotThrow(() => log.evaluate({}), 'evaluate tolerates a malformed game');
  ok('evaluation is crash-proof against missing state');
}

// --- structure: ids unique, all named, secrets flagged ---
{
  const ids = ACHIEVEMENTS.map((a) => a.id);
  assert.strictEqual(new Set(ids).size, ids.length, 'achievement ids are unique');
  for (const a of ACHIEVEMENTS) assert.ok(a.name && a.desc && a.icon && typeof a.check === 'function', `${a.id} is complete`);
  assert.ok(ACHIEVEMENTS.some((a) => a.secret), 'there are secret achievements');
  ok('the achievement catalog is well-formed');
}

// --- serialize / restore ---
{
  const log = new AchievementLog();
  log.evaluate(stubGame({ civ: { totalMined: 1, totalBuilt: 5, totalCrafted: 1, population: 1, hasBuilt: () => false } }));
  const restored = new AchievementLog(log.serialize());
  assert.strictEqual(restored.count(), log.count(), 'unlocked set round-trips');
  assert.ok(restored.has('first_craft'), 'specific unlocks survive a save');
  ok('achievement progress serializes and restores');
}

console.log(`\nAll ${passed} achievement checks passed.`);
