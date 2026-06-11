/**
 * Chronicle — where & when the player is, and whose story it is.
 *
 * Answers three questions for the HUD/map/scene:
 *   WHERE  — the era + reality variant (the place).
 *   WHEN   — a deep-time epoch label for the age.
 *   WHOSE  — the *prime* history of the world, or an *alternate* one the player
 *            forked into. Branch ages (and any run that took a branch route) read
 *            as alternate, and the epoch text itself turns fuzzy/uncanny.
 *
 * It also surfaces the in-era evolution PHASE (the cell's protocell→true-cell
 * stages, or an age's awakening→evolved stage) so progression within an era is
 * visible. Pure: game in → model out; the view layers render it.
 */
import { getEra } from '../core/eras.js';
import { primeNextId } from '../core/eraGraph.js';
import { variantInfo } from '../core/eraTheme.js';

// Deep-time "when" per era. Prime ages get real epochs; branch ages get uncanny,
// forked phrasing (they are stories that never happened).
const EPOCHS = {
  cell: 'Hadean Ocean · ~3.8 billion years ago',
  stone: 'Mesozoic · ~150 million years ago',
  bronze: 'Bronze Age · ~3000 BCE',
  iron: 'Iron Age · ~1000 BCE',
  industrial: 'Industrial Age · ~1800 CE',
  // branch / alternate ages — time that forked off the real line
  flora: 'a verdant dawn · an age that never was',
  republic: 'a republic of coin · a history that forked',
  arcanum: 'a clockwork age · a dream of brass',
  bio: 'a living machine age · a path not taken',
};

/** The prime-spine era ids, walked from the origin via prime edges. */
function spineSet() {
  const s = new Set(['cell']);
  let cur = 'cell';
  for (let i = 0; i < 64; i++) {
    const n = primeNextId(cur);
    if (!n || s.has(n)) break;
    s.add(n);
    cur = n;
  }
  return s;
}

/** Is this run in an alternate timeline (off the prime spine)? */
export function isAlternate(realityPath = [], eraId = 'cell') {
  if (!spineSet().has(eraId)) return true; // currently in a branch age
  for (const step of realityPath) {
    if (step && step.to !== primeNextId(step.from)) return true; // diverged earlier
  }
  return false;
}

/** The in-era evolution phase label (cell stages, else the era's stage name). */
function phaseLabel(game) {
  if (game.eraId === 'cell') {
    return (game.cellStatus?.stageName || 'Protocell').replace(/^a /, '');
  }
  return game.objectives?.stageProgress?.()?.label || 'Dawn';
}

export function chronicleOf(game) {
  const era = getEra(game.eraId);
  const v = variantInfo(game.eraId, game.world?.variant);
  const variantName = v ? v.name : null;
  const alternate = isAlternate(game.realityPath, game.eraId);
  return {
    icon: era.icon || '🌀',
    era: era.name,
    where: variantName || era.name,
    when: EPOCHS[game.eraId] || 'deep time',
    phase: phaseLabel(game),
    alternate,
    realityLabel: alternate ? 'Alternate timeline' : 'Prime timeline',
    layer: game.layer || 0, // nested-simulation depth from New Game+ descents
  };
}
