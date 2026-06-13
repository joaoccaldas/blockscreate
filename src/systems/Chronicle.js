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
import { primeNextId, spineEraIds } from '../core/eraGraph.js';
import { variantInfo } from '../core/eraTheme.js';
import { geologyOf, getThread, paleoLocation, formatCoords } from '../core/deepTime.js';

/** Is this run in an alternate timeline (off the prime spine)? */
export function isAlternate(realityPath = [], eraId = 'cell') {
  if (!spineEraIds().has(eraId)) return true; // currently in a branch age
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

  const threadId = game.thread || 'salvador';
  const thread = getThread(threadId);
  const geo = geologyOf(game.eraId);
  const coords = paleoLocation(threadId, game.eraId);
  const located = formatCoords(coords);
  const climate = game.eraId === 'cell' ? 'global ocean' : thread.climate;

  // Format: period · date · thread · coordinates · climate
  const when = `${geo.period} · ${geo.date} · ${thread.name} · ${located} · ${climate}`;

  return {
    icon: era.icon || '🌀',
    era: era.name,
    where: variantName || era.name,
    when,
    period: geo.period,
    date: geo.date,
    climate,
    thread: thread.name,
    coords: located,
    located,
    phase: phaseLabel(game),
    alternate,
    realityLabel: alternate ? 'Alternate timeline' : 'Prime timeline',
    layer: game.layer || 0, // nested-simulation depth from New Game+ descents
  };
}
