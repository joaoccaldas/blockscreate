/**
 * Deep-time space-time clock configuration.
 * Maps ancestral threads (Salvador vs Stockholm) and paleogeographic coordinates
 * across different eras, correcting geology classifications (e.g. Early Archean for Cell).
 */

export const THREADS = {
  salvador: {
    id: 'salvador',
    name: 'Salvador',
    coords: { lat: -12.97, lon: -38.51 },
    climate: 'tropical',
  },
  stockholm: {
    id: 'stockholm',
    name: 'Stockholm',
    coords: { lat: 59.33, lon: 18.07 },
    climate: 'boreal',
  },
};

export const ERA_GEOLOGY = {
  cell: { period: 'Early Archean', date: '~3.8 billion years ago', climate: 'global ocean' },
  stone: { period: 'Mesozoic', date: '~150 million years ago' },
  bronze: { period: 'Bronze Age', date: '~3000 BCE' },
  iron: { period: 'Iron Age', date: '~1000 BCE' },
  industrial: { period: 'Industrial Age', date: '~1800 CE' },
  // branch ages
  flora: { period: 'an age that never was', date: 'a verdant dawn' },
  republic: { period: 'a history that forked', date: 'a republic of coin' },
  arcanum: { period: 'a dream of brass', date: 'a clockwork age' },
  bio: { period: 'a path not taken', date: 'a living machine age' },
};

export const PALEO = {
  salvador: {
    cell: null,
    stone: { lat: -23.9, lon: -11.0 },
    bronze: { lat: -12.97, lon: -38.51 },
    iron: { lat: -12.97, lon: -38.51 },
    industrial: { lat: -12.97, lon: -38.51 },
    flora: { lat: -12.97, lon: -38.51 },
    republic: { lat: -12.97, lon: -38.51 },
    arcanum: { lat: -12.97, lon: -38.51 },
    bio: { lat: -12.97, lon: -38.51 },
  },
  stockholm: {
    cell: null,
    stone: { lat: 38.3, lon: 19.3 },
    bronze: { lat: 59.33, lon: 18.07 },
    iron: { lat: 59.33, lon: 18.07 },
    industrial: { lat: 59.33, lon: 18.07 },
    flora: { lat: 59.33, lon: 18.07 },
    republic: { lat: 59.33, lon: 18.07 },
    arcanum: { lat: 59.33, lon: 18.07 },
    bio: { lat: 59.33, lon: 18.07 },
  },
};

export function getThread(threadId) {
  return THREADS[threadId] || THREADS.salvador;
}

export function geologyOf(eraId) {
  return ERA_GEOLOGY[eraId] || { period: 'deep time', date: 'unknown' };
}

export function paleoLocation(threadId, eraId) {
  const t = PALEO[threadId] || PALEO.salvador;
  return t[eraId] || null;
}

export function formatCoords(coords) {
  if (!coords) return 'location beyond reconstruction';
  const latDir = coords.lat >= 0 ? 'N' : 'S';
  const lonDir = coords.lon >= 0 ? 'E' : 'W';
  return `${Math.abs(coords.lat).toFixed(1)}° ${latDir}, ${Math.abs(coords.lon).toFixed(1)}° ${lonDir}`;
}
