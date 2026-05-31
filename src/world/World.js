/**
 * World model.
 *
 * The world is a dense 2D grid of block ids (Uint8Array, row-major). It is
 * generated deterministically from a seed, then mutated by the player. For
 * persistence we save the seed plus a run-length-encoded snapshot of the grid,
 * so even hand-built worlds stay small in localStorage.
 *
 * Generation is era-aware: deeper/rarer ores only appear once their era is the
 * world's era, which keeps each age feeling distinct.
 */
import { C } from '../core/constants.js';
import { blockId, AIR } from '../core/blocks.js';
import { fbm1D, hash2 } from './noise.js';
import { getEra } from '../core/eras.js';

export class World {
  constructor({ seed, eraId, width = C.WORLD_W, height = C.WORLD_H, originX = 0 }) {
    this.seed = seed >>> 0;
    this.eraId = eraId;
    this.originX = originX;
    this.width = width;
    this.height = height;
    this.grid = new Uint8Array(width * height);
    this.heightMap = new Int16Array(width);
    this.spawn = { x: Math.floor(width / 2), y: 0 };
  }

  idx(x, y) {
    return y * this.width + x;
  }

  inBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  get(x, y) {
    if (!this.inBounds(x, y)) return AIR;
    return this.grid[this.idx(x, y)];
  }

  set(x, y, id) {
    if (!this.inBounds(x, y)) return false;
    this.grid[this.idx(x, y)] = id;
    if (x >= 0 && x < this.width) this.recomputeColumnTop(x);
    return true;
  }

  recomputeColumnTop(x) {
    for (let y = 0; y < this.height; y++) {
      if (this.grid[this.idx(x, y)] !== AIR) {
        this.heightMap[x] = y;
        return;
      }
    }
    this.heightMap[x] = this.height;
  }

  /** Procedurally fill the grid based on seed + era. */
  generate() {
    const ID = blockIds();
    for (let x = 0; x < this.width; x++) this.generateColumn(x, ID);
    for (let x = 0; x < this.width; x++) this.carveColumn(x, ID, getEra(this.eraId));
    this.scatterTrees(ID, 0, this.width);
    this.findSpawn();
  }

  globalX(x) {
    return this.originX + x;
  }

  generateColumn(x, ID = blockIds()) {
    const gx = this.globalX(x);
    const seaLevel = C.SURFACE + 6;
    const n = fbm1D(gx * 0.06, this.seed, 4);
    const surf = Math.floor(C.SURFACE + (n - 0.5) * 26);
    this.heightMap[x] = surf;

    for (let y = 0; y < this.height; y++) {
      let id = AIR;
      if (y === this.height - 1) {
        id = ID.bedrock;
      } else if (y > surf) {
        const depth = y - surf;
        if (depth <= 1) id = ID.grass;
        else if (depth <= 4) id = ID.dirt;
        else if (depth <= 6 && hash2(gx, y, this.seed + 6060) > 0.82) id = ID.gravel;
        else id = ID.stone;
      } else if (y === surf) {
        id = ID.grass;
      }

      if (id === ID.grass && surf >= seaLevel) id = ID.sand;
      if (id === ID.dirt && surf >= seaLevel - 2 && hash2(gx, y, this.seed + 7070) > 0.72) id = ID.clay;
      this.grid[this.idx(x, y)] = id;
    }

    if (surf >= seaLevel) {
      for (let y = seaLevel; y < surf; y++) {
        if (this.grid[this.idx(x, y)] === AIR) this.grid[this.idx(x, y)] = ID.water;
      }
    }
  }

  carveColumn(x, ID = blockIds(), era = getEra(this.eraId)) {
    const gx = this.globalX(x);
    const surf = this.heightMap[x];
    for (let y = surf + 4; y < this.height - 1; y++) {
      const i = this.idx(x, y);
      if (this.grid[i] !== ID.stone) continue;

      const cave = fbm1D(gx * 0.12 + y * 0.09, this.seed + 777, 3);
      if (cave > 0.74 && y < this.height - 6) {
        this.grid[i] = AIR;
        continue;
      }

      const r = hash2(gx, y, this.seed + 4242);
      const depth = y - surf;
      if (r > 0.985 && depth > 4) this.grid[i] = ID.coal;
      else if (era.order >= 1 && r > 0.975 && r < 0.982 && depth > 10) this.grid[i] = ID.copper;
      else if (era.order >= 1 && r > 0.969 && r < 0.974 && depth > 12) this.grid[i] = ID.tin;
      else if (era.order >= 2 && r > 0.962 && r < 0.968 && depth > 18) this.grid[i] = ID.iron;
      else if (era.order >= 2 && r > 0.958 && r < 0.961 && depth > 26) this.grid[i] = ID.gold;
    }
  }

  /** Expand horizontally, preserving all existing edits. Returns columns prepended/appended. */
  expand({ left = 0, right = 0 } = {}) {
    left = Math.max(0, Math.floor(left));
    right = Math.max(0, Math.floor(right));
    if (!left && !right) return { left: 0, right: 0 };

    const oldWidth = this.width;
    const oldGrid = this.grid;
    const newWidth = oldWidth + left + right;
    this.width = newWidth;
    this.originX -= left;
    this.grid = new Uint8Array(newWidth * this.height);
    this.heightMap = new Int16Array(newWidth);

    for (let y = 0; y < this.height; y++) {
      const src = oldGrid.subarray(y * oldWidth, y * oldWidth + oldWidth);
      this.grid.set(src, y * newWidth + left);
    }

    const ID = blockIds();
    const era = getEra(this.eraId);
    for (let x = 0; x < left; x++) this.generateColumn(x, ID);
    for (let x = left + oldWidth; x < newWidth; x++) this.generateColumn(x, ID);
    for (let x = 0; x < left; x++) this.carveColumn(x, ID, era);
    for (let x = left + oldWidth; x < newWidth; x++) this.carveColumn(x, ID, era);
    for (let x = left; x < left + oldWidth; x++) this.recomputeColumnTop(x);

    this.spawn.x += left;
    this.scatterTrees(ID, 0, left);
    this.scatterTrees(ID, left + oldWidth, right);
    return { left, right };
  }

  expandAround(x, margin = 48, amount = 160) {
    const left = x < margin ? amount : 0;
    const right = x > this.width - margin ? amount : 0;
    return this.expand({ left, right });
  }

  scatterTrees(ID, start = 0, count = this.width) {
    const end = Math.min(this.width - 3, start + count);
    for (let x = Math.max(3, start); x < end; x++) {
      const surf = this.heightMap[x];
      if (this.grid[this.idx(x, surf)] !== ID.grass) continue;
      const gx = this.globalX(x);
      if (hash2(gx, 17, this.seed + 9090) > 0.12) continue;
      const h = 4 + Math.floor(hash2(gx, 19, this.seed + 9191) * 3);
      const topY = surf - h;
      for (let y = surf - 1; y >= topY; y--) {
        if (this.inBounds(x, y)) this.grid[this.idx(x, y)] = ID.log;
      }
      // Leaf canopy
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 1; dy++) {
          const lx = x + dx;
          const ly = topY + dy;
          if (Math.abs(dx) === 2 && dy <= -1) continue;
          if (this.inBounds(lx, ly) && this.grid[this.idx(lx, ly)] === AIR) {
            this.grid[this.idx(lx, ly)] = ID.leaves;
          }
        }
      }
      x += 2; // spacing so trees don't clump
    }
    for (let x = Math.max(0, start - 2); x < Math.min(this.width, start + count + 2); x++) {
      this.recomputeColumnTop(x);
    }
  }

  findSpawn() {
    const x = Math.floor(this.width / 2);
    for (let y = 0; y < this.height; y++) {
      if (this.grid[this.idx(x, y)] !== AIR) {
        this.spawn = { x, y: y - 1 };
        return;
      }
    }
    this.spawn = { x, y: C.SURFACE - 1 };
  }

  // ---- Serialization (seed + RLE of the grid) ----

  serialize() {
    return {
      seed: this.seed,
      eraId: this.eraId,
      originX: this.originX,
      width: this.width,
      height: this.height,
      rle: rleEncode(this.grid),
    };
  }

  static deserialize(data) {
    const w = new World({
      seed: data.seed,
      eraId: data.eraId,
      width: data.width,
      height: data.height,
      originX: data.originX || 0,
    });
    rleDecode(data.rle, w.grid);
    for (let x = 0; x < w.width; x++) w.recomputeColumnTop(x);
    w.findSpawn();
    return w;
  }
}

function blockIds() {
  return {
    grass: blockId('grass'),
    dirt: blockId('dirt'),
    stone: blockId('stone'),
    sand: blockId('sand'),
    water: blockId('water'),
    bedrock: blockId('bedrock'),
    coal: blockId('coal_ore'),
    copper: blockId('copper_ore'),
    tin: blockId('tin_ore'),
    iron: blockId('iron_ore'),
    gold: blockId('gold_ore'),
    log: blockId('log'),
    leaves: blockId('leaves'),
    clay: blockId('clay'),
    gravel: blockId('gravel'),
  };
}

/** Run-length encode a Uint8Array as [value,count,...] pairs. */
export function rleEncode(arr) {
  const out = [];
  let prev = arr[0];
  let count = 1;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === prev && count < 65535) {
      count++;
    } else {
      out.push(prev, count);
      prev = arr[i];
      count = 1;
    }
  }
  out.push(prev, count);
  return out;
}

export function rleDecode(rle, target) {
  let p = 0;
  for (let i = 0; i < rle.length; i += 2) {
    const v = rle[i];
    const n = rle[i + 1];
    for (let k = 0; k < n; k++) target[p++] = v;
  }
  return target;
}
