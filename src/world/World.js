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
import { makeRng, fbm1D, hash2 } from './noise.js';
import { getEra } from '../core/eras.js';

export class World {
  constructor({ seed, eraId, width = C.WORLD_W, height = C.WORLD_H }) {
    this.seed = seed >>> 0;
    this.eraId = eraId;
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
    const ID = {
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
    };
    const rng = makeRng(this.seed);
    const era = getEra(this.eraId);
    const seaLevel = C.SURFACE + 6;

    for (let x = 0; x < this.width; x++) {
      // Surface height from fractal noise.
      const n = fbm1D(x * 0.06, this.seed, 4);
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
          else id = ID.stone;
        } else if (y === surf) {
          id = ID.grass;
        }

        // Beaches / water near sea level lows
        if (id === ID.grass && surf >= seaLevel) id = ID.sand;

        this.grid[this.idx(x, y)] = id;
      }

      // Fill shallow basins with water.
      if (surf >= seaLevel) {
        for (let y = seaLevel; y < surf; y++) {
          if (this.grid[this.idx(x, y)] === AIR) this.grid[this.idx(x, y)] = ID.water;
        }
      }
    }

    this.carveCavesAndOres(ID, era);
    this.scatterTrees(ID, rng);
    this.findSpawn();
  }

  carveCavesAndOres(ID, era) {
    for (let x = 0; x < this.width; x++) {
      const surf = this.heightMap[x];
      for (let y = surf + 4; y < this.height - 1; y++) {
        const i = this.idx(x, y);
        if (this.grid[i] !== ID.stone) continue;

        // Caves: sparse worm-ish pockets via thresholded noise.
        const cave = fbm1D(x * 0.12 + y * 0.09, this.seed + 777, 3);
        if (cave > 0.74 && y < this.height - 6) {
          this.grid[i] = AIR;
          continue;
        }

        // Ore distribution. Coal is common in every era; metal ores only
        // surface once the world has reached the era that uses them.
        const r = hash2(x, y, this.seed + 4242);
        const depth = y - surf;
        if (r > 0.985 && depth > 4) this.grid[i] = ID.coal;
        else if (era.order >= 1 && r > 0.975 && r < 0.982 && depth > 10) this.grid[i] = ID.copper;
        else if (era.order >= 1 && r > 0.969 && r < 0.974 && depth > 12) this.grid[i] = ID.tin;
        else if (era.order >= 2 && r > 0.962 && r < 0.968 && depth > 18) this.grid[i] = ID.iron;
        else if (era.order >= 2 && r > 0.958 && r < 0.961 && depth > 26) this.grid[i] = ID.gold;
      }
    }
  }

  scatterTrees(ID, rng) {
    for (let x = 3; x < this.width - 3; x++) {
      const surf = this.heightMap[x];
      if (this.grid[this.idx(x, surf)] !== ID.grass) continue;
      if (rng() > 0.12) continue;
      const h = 4 + Math.floor(rng() * 3);
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
    for (let x = 0; x < this.width; x++) this.recomputeColumnTop(x);
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
      width: this.width,
      height: this.height,
      rle: rleEncode(this.grid),
    };
  }

  static deserialize(data) {
    const w = new World({ seed: data.seed, eraId: data.eraId, width: data.width, height: data.height });
    rleDecode(data.rle, w.grid);
    for (let x = 0; x < w.width; x++) w.recomputeColumnTop(x);
    w.findSpawn();
    return w;
  }
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
