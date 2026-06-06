/**
 * World model.
 *
 * The world is a dense 2D grid of block ids (Uint8Array, row-major). It is
 * generated deterministically from a seed, then mutated by the player. For
 * persistence we save the seed, chunk metadata and a run-length-encoded
 * snapshot of the loaded grid, so even hand-built worlds stay small in
 * localStorage while the format moves toward true chunk streaming.
 *
 * Generation is era-aware: deeper/rarer ores only appear once their era is the
 * world's era, which keeps each age feeling distinct.
 */
import { C } from '../core/constants.js';
import { blockId, AIR, isSolid } from '../core/blocks.js';
import { fbm1D, hash2 } from './noise.js';
import { getEra } from '../core/eras.js';

export const CHUNK_W = 32;

export const ERA_BIOMES = {
  cell: [
    { id: 'warm_vent', label: 'Warm Vent', clueBias: 1.2, treeBias: 0, ash: 0 },
    { id: 'nutrient_tide', label: 'Nutrient Tide', clueBias: 1.8, treeBias: 0, ash: 0 },
    { id: 'mineral_shelf', label: 'Mineral Shelf', clueBias: 1.4, treeBias: 0, ash: 0 },
  ],
  stone: [
    { id: 'fern_valley', label: 'Fern Valley', clueBias: 1.0, treeBias: 1.45, ash: 0 },
    { id: 'fossil_basin', label: 'Fossil Basin', clueBias: 2.4, treeBias: 0.75, ash: 0.05 },
    { id: 'meteor_scars', label: 'Meteor Scars', clueBias: 2.0, treeBias: 0.55, ash: 0.18 },
    { id: 'ash_field', label: 'Ash Field', clueBias: 1.35, treeBias: 0.35, ash: 0.32 },
  ],
  bronze: [
    { id: 'river_clay', label: 'River Clay', clueBias: 1.25, treeBias: 0.8, ash: 0 },
    { id: 'copper_hills', label: 'Copper Hills', clueBias: 0.9, treeBias: 0.7, ash: 0 },
    { id: 'trade_plain', label: 'Trade Plain', clueBias: 1.1, treeBias: 1.0, ash: 0 },
  ],
  iron: [
    { id: 'iron_ridge', label: 'Iron Ridge', clueBias: 0.9, treeBias: 0.55, ash: 0 },
    { id: 'kingdom_plain', label: 'Kingdom Plain', clueBias: 1.1, treeBias: 1.0, ash: 0 },
    { id: 'roadland', label: 'Roadland', clueBias: 1.2, treeBias: 0.85, ash: 0 },
  ],
  industrial: [
    { id: 'coal_belt', label: 'Coal Belt', clueBias: 0.8, treeBias: 0.35, ash: 0.2 },
    { id: 'rail_flat', label: 'Rail Flat', clueBias: 0.95, treeBias: 0.6, ash: 0.06 },
    { id: 'smog_lowland', label: 'Smog Lowland', clueBias: 1.0, treeBias: 0.3, ash: 0.25 },
  ],
};

export class World {
  constructor({ seed, eraId, width = C.WORLD_W, height = C.WORLD_H, originX = 0, chunks = null }) {
    this.seed = seed >>> 0;
    this.eraId = eraId;
    this.originX = originX;
    this.width = width;
    this.height = height;
    this.grid = new Uint8Array(width * height);
    this.heightMap = new Int16Array(width);
    this.spawn = { x: Math.floor(width / 2), y: 0 };
    this.chunkWidth = chunks?.width || CHUNK_W;
    this.generatedChunks = new Set(chunks?.generated || []);
    this.modifiedChunks = new Set(chunks?.modified || []);
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
    this.markModified(x);
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
    if (this.eraId !== 'cell') {
      for (let x = 0; x < this.width; x++) this.carveColumn(x, ID, getEra(this.eraId));
    }
    this.scatterTrees(ID, 0, this.width);
    this.scatterClues(ID, 0, this.width);
    this.markGeneratedRange(0, this.width);
    this.modifiedChunks.clear();
    this.findSpawn();
  }

  globalX(x) {
    return this.originX + x;
  }

  localX(gx) {
    return gx - this.originX;
  }

  chunkKeyAtLocal(x) {
    return this.chunkKeyAtGlobal(this.globalX(x));
  }

  chunkKeyAtGlobal(gx) {
    return Math.floor(gx / this.chunkWidth);
  }

  chunkBounds(key) {
    const globalStart = key * this.chunkWidth;
    const start = Math.max(0, this.localX(globalStart));
    const end = Math.min(this.width, this.localX(globalStart + this.chunkWidth));
    return { key, globalStart, start, end, width: Math.max(0, end - start) };
  }

  markGeneratedRange(start, count) {
    const end = start + count;
    for (let x = start; x < end; x += this.chunkWidth) {
      const key = this.chunkKeyAtLocal(x);
      this.generatedChunks.add(key);
    }
    if (count > 0) this.generatedChunks.add(this.chunkKeyAtLocal(end - 1));
  }

  markModified(x) {
    this.generatedChunks.add(this.chunkKeyAtLocal(x));
    this.modifiedChunks.add(this.chunkKeyAtLocal(x));
  }

  biomeAtLocal(x) {
    return this.biomeAtGlobal(this.globalX(x));
  }

  biomeAtGlobal(gx) {
    const list = ERA_BIOMES[this.eraId] || ERA_BIOMES.stone;
    const chunk = this.chunkKeyAtGlobal(gx);
    const n = hash2(chunk, this.seed % 9973, this.seed + 8181);
    return list[Math.min(list.length - 1, Math.floor(n * list.length))];
  }

  generateColumn(x, ID = blockIds()) {
    const gx = this.globalX(x);
    const biome = this.biomeAtLocal(x);
    if (this.eraId === 'cell') {
      this.generateCellColumn(x, ID, biome);
      return;
    }
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

      if (id === ID.grass && biome.ash && hash2(gx, y, this.seed + 7171) < biome.ash) id = ID.gravel;
      if (id === ID.grass && surf >= seaLevel) id = ID.sand;
      if (id === ID.dirt && surf >= seaLevel - 2 && hash2(gx, y, this.seed + 7070) > 0.72) id = ID.clay;
      if (id === ID.stone && biome.id === 'fossil_basin' && hash2(gx, y, this.seed + 7272) > 0.992) id = ID.fossil;
      this.grid[this.idx(x, y)] = id;
    }

    if (surf >= seaLevel) {
      for (let y = seaLevel; y < surf; y++) {
        if (this.grid[this.idx(x, y)] === AIR) this.grid[this.idx(x, y)] = ID.water;
      }
    }
  }

  generateCellColumn(x, ID = blockIds(), biome = this.biomeAtLocal(x)) {
    const gx = this.globalX(x);
    const n = fbm1D(gx * 0.08, this.seed + 1919, 3);
    const surf = Math.floor(C.SURFACE + 2 + (n - 0.5) * 12);
    this.heightMap[x] = surf;

    for (let y = 0; y < this.height; y++) {
      let id = AIR;
      if (y === this.height - 1) id = ID.bedrock;
      else if (y >= surf) {
        const depth = y - surf;
        id = depth <= 3 ? ID.primordial : ID.stone;
        const r = hash2(gx, y, this.seed + 191);
        const nutrientRate = biome.id === 'nutrient_tide' ? 0.17 : 0.09;
        const ventRate = biome.id === 'warm_vent' || biome.id === 'mineral_shelf' ? 0.07 : 0.035;
        if (depth <= 7 && r < nutrientRate) id = ID.nutrient;
        else if (depth >= 2 && depth <= 12 && r > 1 - ventRate) id = ID.vent;
      } else if (y >= surf - 8) {
        id = ID.water;
      }
      this.grid[this.idx(x, y)] = id;
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
      else if (era.id === 'stone' && r > 0.955 && r < 0.957 && depth > 16) this.grid[i] = ID.fossil;
    }
  }

  /** Expand horizontally, preserving all existing edits. Returns columns prepended/appended. */
  expand({ left = 0, right = 0 } = {}) {
    left = Math.max(0, Math.floor(left));
    right = Math.max(0, Math.floor(right));
    if (!left && !right) return { left: 0, right: 0 };

    const oldWidth = this.width;
    const oldGrid = this.grid;
    const oldModified = new Set(this.modifiedChunks);
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
    if (this.eraId !== 'cell') {
      for (let x = 0; x < left; x++) this.carveColumn(x, ID, era);
      for (let x = left + oldWidth; x < newWidth; x++) this.carveColumn(x, ID, era);
    }
    for (let x = left; x < left + oldWidth; x++) this.recomputeColumnTop(x);

    this.spawn.x += left;
    this.markGeneratedRange(0, left);
    this.markGeneratedRange(left + oldWidth, right);
    this.scatterTrees(ID, 0, left);
    this.scatterTrees(ID, left + oldWidth, right);
    this.scatterClues(ID, 0, left);
    this.scatterClues(ID, left + oldWidth, right);
    this.modifiedChunks = oldModified;
    return { left, right };
  }

  expandAround(x, margin = 48, amount = 160) {
    const left = x < margin ? amount : 0;
    const right = x > this.width - margin ? amount : 0;
    return this.expand({ left, right });
  }

  scatterTrees(ID, start = 0, count = this.width) {
    if (this.eraId === 'cell') return;
    const end = Math.min(this.width - 3, start + count);
    for (let x = Math.max(3, start); x < end; x++) {
      const surf = this.heightMap[x];
      if (this.grid[this.idx(x, surf)] !== ID.grass) continue;
      const gx = this.globalX(x);
      const biome = this.biomeAtLocal(x);
      if (hash2(gx, 17, this.seed + 9090) > 0.12 * (biome.treeBias || 1)) continue;
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

  scatterClues(ID, start = 0, count = this.width) {
    if (this.eraId !== 'stone') return;
    const end = Math.min(this.width - 4, start + count);
    for (let x = Math.max(4, start); x < end; x++) {
      const gx = this.globalX(x);
      const biome = this.biomeAtLocal(x);
      const clueBias = biome.clueBias || 1;
      const surf = this.heightMap[x];
      if (hash2(gx, 31, this.seed + 1111) < 0.006 * clueBias && this.get(x, surf - 1) === AIR) {
        this.set(x, surf - 1, ID.meteor);
      }
      if (hash2(gx, 37, this.seed + 2222) < 0.008 * clueBias && this.get(x, surf) !== AIR && this.get(x, surf - 1) === AIR) {
        this.set(x, surf - 1, ID.standingStone);
        if (this.inBounds(x, surf - 2)) this.set(x, surf - 2, ID.standingStone);
      }
      if (hash2(gx, 41, this.seed + 3333) < 0.006 * clueBias) {
        const y = Math.max(4, surf - 2);
        if (this.get(x, y) === AIR) this.set(x, y, ID.handprint);
      }
    }
  }

  findSpawn() {
    const x = Math.floor(this.width / 2);
    for (let y = 0; y < this.height; y++) {
      if (isSolid(this.grid[this.idx(x, y)])) {
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
      variant: this.variant || null,
      originX: this.originX,
      width: this.width,
      height: this.height,
      chunks: this.serializeChunks(),
      rle: rleEncode(this.grid),
    };
  }

  serializeChunks() {
    const modified = [...this.modifiedChunks].sort((a, b) => a - b);
    return {
      width: this.chunkWidth,
      generated: [...this.generatedChunks].sort((a, b) => a - b),
      modified,
      biomes: [...this.generatedChunks].sort((a, b) => a - b)
        .map((key) => ({ key, id: this.biomeAtGlobal(key * this.chunkWidth).id })),
      snapshots: modified.map((key) => {
        const bounds = this.chunkBounds(key);
        return { key, start: bounds.globalStart, width: bounds.width, rle: this.rleSlice(bounds.start, bounds.end) };
      }),
    };
  }

  rleSlice(start, end) {
    const width = Math.max(0, end - start);
    const slice = new Uint8Array(width * this.height);
    if (!width) return [];
    for (let y = 0; y < this.height; y++) {
      slice.set(this.grid.subarray(y * this.width + start, y * this.width + end), y * width);
    }
    return rleEncode(slice);
  }

  getChunkSummary() {
    return {
      width: this.chunkWidth,
      generated: this.generatedChunks.size,
      modified: this.modifiedChunks.size,
      visibleRange: {
        from: this.chunkKeyAtLocal(0),
        to: this.chunkKeyAtLocal(this.width - 1),
      },
    };
  }

  static deserialize(data) {
    const w = new World({
      seed: data.seed,
      eraId: data.eraId,
      width: data.width,
      height: data.height,
      originX: data.originX || 0,
      chunks: data.chunks,
    });
    w.variant = data.variant || null;
    rleDecode(data.rle, w.grid);
    for (let x = 0; x < w.width; x++) w.recomputeColumnTop(x);
    if (!data.chunks) w.markGeneratedRange(0, w.width);
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
    fossil: blockId('fossil_bed'),
    meteor: blockId('meteor_shard'),
    handprint: blockId('charcoal_handprint'),
    standingStone: blockId('standing_stone'),
    hideWall: blockId('hide_wall'),
    primordial: blockId('primordial_mud'),
    nutrient: blockId('nutrient_blob'),
    vent: blockId('mineral_vent'),
    membrane: blockId('lipid_membrane'),
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
