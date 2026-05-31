/**
 * Era registry — the heart of the "different times" progression.
 *
 * Each era is a discrete world you can travel to through a portal. Survival mode
 * progresses you forward by accumulating Civilization Points (CP); when an era's
 * unlock cost is met the next era's portal opens. Unlocked eras also become
 * available in Creative mode (free build, no survival pressure).
 *
 * Eras are data: adding a fully new age later means adding an entry here plus
 * its blocks/recipes. Milestone 1 ships the Stone Age fully playable; later eras
 * are defined so the portal + unlock system is real and demonstrable.
 */
import { getEraManifest } from './eraManifests.js';

export const ERAS = [
  {
    id: 'stone',
    order: 0,
    name: 'First Humans',
    blurb: 'Survive as early humans: shelter, fire, food, tools, clues, and alternate-history echoes.',
    icon: '🔥',
    unlockCost: 0, // first era, always available
    // CP needed (while in this era) to open the NEXT era's portal
    advanceCost: 250,
    sky: { day: ['#8fd0ff', '#cdeeff'], night: ['#0b1430', '#1c2a55'] },
    ground: '#4a8233',
    starter: ['wood_pickaxe', 'wood_axe'],
    fullyPlayable: true,
  },
  {
    id: 'bronze',
    order: 1,
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
    order: 2,
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
    order: 3,
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
];

for (const e of ERAS) e.manifest = getEraManifest(e.id);

export const ERA_BY_ID = {};
for (const e of ERAS) ERA_BY_ID[e.id] = e;

export function getEra(id) {
  return ERA_BY_ID[id] || ERAS[0];
}

export function nextEra(id) {
  const e = getEra(id);
  return ERAS[e.order + 1] || null;
}
