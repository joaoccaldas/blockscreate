/**
 * Era registry — the heart of the "different times" progression.
 *
 * Each era is a discrete world you can travel to through a portal. Survival mode
 * progresses you forward by accumulating Civilization Points (CP); when an era's
 * unlock cost is met the next era's portal opens. Unlocked eras also become
 * available in Creative mode (free build, no survival pressure).
 *
 * Eras are data: adding a fully new age later means adding an entry here plus
 * its blocks/recipes. The opening era is intentionally tiny: the first cell
 * teaches interaction before the UI and simulation broaden into later ages.
 */
import { getEraManifest } from './eraManifests.js';
import { primeNextId, chooseNextEra as graphChooseNextEra } from './eraGraph.js';

export const ERAS = [
  {
    id: 'cell',
    order: 0,
    name: 'First Cell',
    blurb: 'Begin as chemistry at a warm vent: absorb nutrients, form a membrane, and become alive.',
    icon: '🫧',
    unlockCost: 0,
    advanceCost: 80,
    sky: { day: ['#69d6d0', '#b8fff2'], night: ['#071a28', '#123c4a'] },
    ground: '#2aa79b',
    starter: [],
    fullyPlayable: true,
  },
  {
    id: 'stone',
    order: 1,
    name: 'Age of Dinosaurs',
    blurb: 'Survive among living dinosaurs: tame fire, build shelter, dodge raptors and a T-Rex, and outlast the asteroid.',
    icon: '🦖',
    unlockCost: 80,
    // CP needed (while in this era) to open the NEXT era's portal
    advanceCost: 250,
    sky: { day: ['#8fd0ff', '#cdeeff'], night: ['#0b1430', '#1c2a55'] },
    ground: '#4a8233',
    starter: ['wood_pickaxe', 'wood_axe'],
    fullyPlayable: true,
  },
  {
    id: 'bronze',
    order: 2,
    name: 'Bronze Age',
    blurb: 'Smelt copper and tin, lay bricks, and grow a true town.',
    icon: '⚒️',
    unlockCost: 250,
    advanceCost: 600,
    sky: { day: ['#9bd0f5', '#e9d9b0'], night: ['#101a38', '#243a66'] },
    ground: '#8a5f38',
    starter: ['stone_pickaxe'],
    fullyPlayable: true,
  },
  {
    id: 'iron',
    order: 3,
    name: 'Iron Age',
    blurb: 'Forge iron, mint gold, and build a city that endures.',
    icon: '🛡️',
    unlockCost: 600,
    advanceCost: 1200,
    sky: { day: ['#a9cbe8', '#d6c79f'], night: ['#0e1730', '#2a3a5e'] },
    ground: '#6a6a6a',
    starter: ['bronze_pickaxe'],
    fullyPlayable: true,
  },
  {
    id: 'industrial',
    order: 4,
    name: 'Industrial Age',
    blurb: 'Steam, steel and smoke — civilization accelerates.',
    icon: '🏭',
    unlockCost: 1200,
    advanceCost: Infinity,
    sky: { day: ['#b8b6ac', '#d9cdb8'], night: ['#15161c', '#33303a'] },
    ground: '#555',
    starter: ['iron_pickaxe'],
    fullyPlayable: true,
  },
  {
    // Branch age (Iron → merchant/road lean). A wealthier, trade-first path that
    // diverges from the Industrial spine — see docs/ERA_GRAPH.md.
    id: 'republic',
    order: 4,
    name: 'Trade Republic',
    blurb: 'Coin over coal: markets, caravans and roads build a republic of wealth.',
    icon: '🏛️',
    unlockCost: 1200,
    advanceCost: Infinity,
    sky: { day: ['#bcd6e6', '#efe0b8'], night: ['#101a30', '#2a3358'] },
    ground: '#7a6a4a',
    starter: ['iron_pickaxe'],
    fullyPlayable: true,
  },
];

for (const e of ERAS) e.manifest = getEraManifest(e.id);

export const ERA_BY_ID = {};
for (const e of ERAS) ERA_BY_ID[e.id] = e;

export function getEra(id) {
  return ERA_BY_ID[id] || ERAS[0];
}

/**
 * The default (prime-spine) successor era, as an era object — what the HUD shows
 * and what advancement falls back to. Driven by the era graph (docs/ERA_GRAPH.md)
 * so it stays in lockstep with the branching map; for the current implemented
 * eras this is identical to walking `order + 1`.
 */
export function nextEra(id) {
  const nid = primeNextId(id);
  return nid ? ERA_BY_ID[nid] || null : null;
}

/**
 * The era the player actually advances into, given their dominant reality
 * branch. Falls back to the prime spine when a branch destination isn't
 * implemented yet. Returns an era object or null.
 */
export function chooseNextEra(id, ctx = {}) {
  const nid = graphChooseNextEra(id, ctx);
  return nid ? ERA_BY_ID[nid] || null : null;
}
