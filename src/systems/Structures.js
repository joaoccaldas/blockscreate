/**
 * Structure recognition.
 *
 * This is the first bridge between free-form Minecraft-style building and the
 * civilization layer: players can build however they like, while lightweight
 * recognizers award meaning when useful patterns emerge.
 */
import { blockId, getBlock, AIR } from '../core/blocks.js';

const WOOD = new Set(['log', 'planks', 'thatch']);
const MASONRY = new Set(['stone', 'cobblestone', 'brick', 'clay', 'gravel']);

export const STRUCTURES = [
  {
    id: 'camp',
    icon: '🔥',
    label: 'Camp',
    reward: 12,
    check: (ctx) => ctx.counts.campfire >= 1 && ctx.counts.torch >= 1,
  },
  {
    id: 'hut',
    icon: '🏠',
    label: 'Shelter Hut',
    reward: 25,
    check: (ctx) => ctx.roof >= 3 && ctx.leftWall >= 2 && ctx.rightWall >= 2 && ctx.floor >= 3,
  },
  {
    id: 'workshop',
    icon: '🛠️',
    label: 'Workshop',
    reward: 30,
    check: (ctx) => ctx.counts.campfire >= 1 && ctx.wood >= 4 && ctx.masonry >= 4,
  },
  {
    id: 'watchtower',
    icon: '🗼',
    label: 'Watchtower',
    reward: 35,
    check: (ctx) => ctx.vertical >= 6 && ctx.platform >= 3,
  },
  {
    id: 'defended_camp',
    icon: '🛡️',
    label: 'Defended Camp',
    reward: 35,
    check: (ctx) => ctx.counts.campfire >= 1 && ctx.counts.torch >= 2 &&
      ((ctx.counts.hide_wall || 0) + (ctx.counts.cobblestone || 0) + (ctx.counts.thatch || 0)) >= 6,
  },
  {
    id: 'portal_ring',
    icon: '🌀',
    label: 'Portal Ring',
    reward: 45,
    check: (ctx) => ctx.ring >= 10 && ctx.counts.torch >= 2,
  },
];

export class StructureTracker {
  constructor(discovered = []) {
    this.discovered = new Set(discovered);
  }

  evaluate(game, origin = null) {
    const builtCells = game.civ?.builtCells instanceof Set ? game.civ.builtCells : null;
    const ctx = scan(game.world, origin || {
      x: Math.floor(game.player.x),
      y: Math.floor(game.player.y),
    }, 7, builtCells);
    const newly = [];
    for (const s of STRUCTURES) {
      if (this.discovered.has(s.id)) continue;
      if (s.check(ctx, game)) {
        this.discovered.add(s.id);
        newly.push(s);
      }
    }
    return newly;
  }

  has(id) { return this.discovered.has(id); }
  list() { return STRUCTURES.filter((s) => this.discovered.has(s.id)); }
  all() { return STRUCTURES; }
  serialize() { return [...this.discovered]; }
}

export function scan(world, origin, radius = 7, builtCells = null) {
  const counts = {};
  let wood = 0;
  let masonry = 0;
  let vertical = 0;
  let platform = 0;
  let ring = 0;
  const ids = {
    torch: blockId('torch'),
    campfire: blockId('campfire'),
  };

  for (let y = origin.y - radius; y <= origin.y + radius; y++) {
    for (let x = origin.x - radius; x <= origin.x + radius; x++) {
      const id = world.get(x, y);
      if (id === AIR || !included(builtCells, x, y)) continue;
      const name = getBlock(id).name;
      counts[name] = (counts[name] || 0) + 1;
      if (WOOD.has(name)) wood++;
      if (MASONRY.has(name)) masonry++;
    }
  }

  for (let y = origin.y - radius; y <= origin.y + radius; y++) {
    let run = 0;
    for (let x = origin.x - radius; x <= origin.x + radius; x++) {
      run = world.get(x, y) !== AIR && included(builtCells, x, y) ? run + 1 : 0;
      platform = Math.max(platform, run);
    }
  }

  for (let x = origin.x - radius; x <= origin.x + radius; x++) {
    let run = 0;
    for (let y = origin.y - radius; y <= origin.y + radius; y++) {
      run = world.get(x, y) !== AIR && included(builtCells, x, y) ? run + 1 : 0;
      vertical = Math.max(vertical, run);
    }
  }

  const roof = lineCount(world, origin.x - 2, origin.y - 4, 5, 0, builtCells);
  const floor = lineCount(world, origin.x - 2, origin.y, 5, 0, builtCells);
  const leftWall = lineCount(world, origin.x - 2, origin.y - 3, 0, 3, builtCells);
  const rightWall = lineCount(world, origin.x + 2, origin.y - 3, 0, 3, builtCells);

  for (let y = origin.y - 3; y <= origin.y + 3; y++) {
    for (let x = origin.x - 3; x <= origin.x + 3; x++) {
      const edge = x === origin.x - 3 || x === origin.x + 3 || y === origin.y - 3 || y === origin.y + 3;
      if (!edge) continue;
      const id = world.get(x, y);
      if (id !== AIR && id !== ids.torch && id !== ids.campfire && included(builtCells, x, y)) ring++;
    }
  }

  return { counts, wood, masonry, vertical, platform, roof, floor, leftWall, rightWall, ring };
}

function lineCount(world, x, y, dx, dy, builtCells = null) {
  const steps = Math.max(Math.abs(dx), Math.abs(dy)) + 1;
  let n = 0;
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  for (let i = 0; i < steps; i++) {
    const tx = x + sx * i;
    const ty = y + sy * i;
    if (world.get(tx, ty) !== AIR && included(builtCells, tx, ty)) n++;
  }
  return n;
}

function included(builtCells, x, y) {
  return !builtCells || builtCells.has(`${x},${y}`);
}
