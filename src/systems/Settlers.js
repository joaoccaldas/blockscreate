/**
 * Settlers — the villagers that make a civilization visible.
 *
 * Population was just a number; settlers turn it into people who live around
 * your settlement, wander the surface, and do small "work" that trickles
 * Civilization Points back — so building housing and growing population has a
 * felt, on-screen payoff (the core "civ sim" fantasy).
 *
 * Settlers are deliberately lightweight: they walk with gravity, loiter near a
 * town center, and emit periodic work ticks. They are not combat entities and
 * live in their own list (separate from mobs) so hostiles never target them and
 * the player can't attack them.
 *
 * Spawning/among count is driven by the Civilization (population + housing);
 * positions are derived, so saves only need the town center + count.
 */
import { C } from '../core/constants.js';
import { isSolid, blockId, AIR } from '../core/blocks.js';

let NEXT_ID = 1;

export class Settler {
  constructor(x, y, role = 'villager') {
    this.id = NEXT_ID++;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.w = 0.6;
    this.h = 1.7;
    this.role = role;
    this.facing = Math.random() < 0.5 ? -1 : 1;
    this.timer = Math.random() * 3;
    this.workTimer = 2 + Math.random() * 4;
    this.tone = 0.85 + Math.random() * 0.3; // slight per-villager color variance
    this.target = null; // { x, y } resource/crop a settler is walking to work
  }

  /**
   * @param {object} home  { x, y } town center the settler loiters around.
   * @returns {boolean} true if it produced a "work" tick this frame (the
   *   manager turns that into role-specific output).
   */
  update(dt, world, home) {
    this.timer -= dt;
    if (this.target) {
      // Walk toward the target resource; the manager harvests it on arrival.
      const dir = Math.sign(this.target.x + 0.5 - this.x);
      this.vx = dir * 2.2;
      if (dir !== 0) this.facing = dir;
    } else if (this.timer <= 0) {
      this.timer = 1.2 + Math.random() * 2.5;
      // Wander, but gently steer back toward home so the town stays cohesive.
      const pull = home ? Math.sign(home.x - this.x) : 0;
      const r = Math.random();
      if (r < 0.35) this.vx = 0;
      else if (home && Math.abs(this.x - home.x) > 10) this.vx = pull * 1.8;
      else this.vx = (Math.random() < 0.5 ? -1 : 1) * 1.8;
      if (this.vx !== 0) this.facing = Math.sign(this.vx);
    }

    // Gravity + simple ledge step-up so villagers don't get stuck on 1-blocks.
    this.vy = Math.min(C.MAX_FALL, this.vy + C.GRAVITY * dt);
    const nx = this.x + this.vx * dt;
    if (!this.collides(world, nx, this.y)) {
      this.x = nx;
    } else if (this.onGround(world) && !this.collides(world, nx, this.y - 1)) {
      this.vy = -8; // hop
    } else {
      this.vx = -this.vx;
    }
    const ny = this.y + this.vy * dt;
    if (!this.collides(world, this.x, ny)) this.y = ny;
    else this.vy = 0;

    // Work tick.
    this.workTimer -= dt;
    if (this.workTimer <= 0) {
      this.workTimer = 5 + Math.random() * 5;
      return true;
    }
    return false;
  }

  onGround(world) {
    return this.collides(world, this.x, this.y + 0.05);
  }

  /** Is the settler adjacent enough to its target to harvest it? */
  atTarget() {
    return this.target && Math.abs(this.target.x + 0.5 - this.x) < 1.2;
  }

  collides(world, x, y) {
    const minX = Math.floor(x - this.w / 2);
    const maxX = Math.floor(x + this.w / 2);
    const minY = Math.floor(y - this.h);
    const maxY = Math.floor(y);
    for (let ty = minY; ty <= maxY; ty++)
      for (let tx = minX; tx <= maxX; tx++)
        if (isSolid(world.get(tx, ty))) return true;
    return false;
  }

  serialize() {
    return { x: this.x, y: this.y, role: this.role };
  }

  static load(d) {
    const s = new Settler(d.x, d.y, d.role);
    return s; // transient target is recomputed in-world; not persisted
  }
}

/**
 * Manages the settler population for a world. Spawns/retires settlers to track
 * the civilization's population, anchored to a town center.
 */
export class SettlerManager {
  constructor(saved = null) {
    this.settlers = [];
    this.home = saved?.home || null;
    this.spawnTimer = 0;
    // Town stockpile: resources settlers gather/produce, deposited over time.
    // Pure economic record (not the player's inventory) so a living town
    // visibly accumulates goods even while the player is elsewhere.
    this.stock = { food: 0, wood: 0, ore: 0, wheat: 0, ...(saved?.stock || {}) };
    if (saved?.settlers) this.settlers = saved.settlers.map((d) => Settler.load(d));
  }

  setHome(x, y) {
    // y is the original ground surface — snapshot it as the village's base
    // level so build-height caps don't drift as builders raise the terrain.
    if (!this.home) this.home = { x, y, baseSurf: y };
  }

  /** How many settlers the settlement currently supports. */
  capacity(civ) {
    // Population is the cap, but housing gates it so you must build to grow.
    return Math.max(0, Math.min(civ.population - 1, Math.floor(civ.housing) + 1));
  }

  count() { return this.settlers.length; }

  /** Tally of settlers per role, for the HUD. */
  roleCounts() {
    const out = {};
    for (const s of this.settlers) out[s.role] = (out[s.role] || 0) + 1;
    return out;
  }

  /**
   * Choose the role a new settler should take, balancing the town's needs:
   * always keep food coming, gather materials, then builders, then guards.
   */
  _neededRole() {
    const c = this.roleCounts();
    const n = this.settlers.length + 1;
    if ((c.farmer || 0) < Math.ceil(n * 0.35)) return 'farmer';
    if ((c.gatherer || 0) < Math.ceil(n * 0.35)) return 'gatherer';
    if ((c.builder || 0) < Math.ceil(n * 0.2)) return 'builder';
    return 'guard';
  }

  /**
   * Advance settlers; spawn/retire toward capacity near home, and turn each
   * settler's work tick into role-specific output.
   *
   * @returns {{cp:number, produced:object, guards:number}} this frame's output.
   */
  update(dt, world, civ) {
    if (!this.home) return { cp: 0, produced: {}, guards: 0 };
    const cap = this.capacity(civ);

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 3;
      if (this.settlers.length < cap) this._spawn(world);
      else if (this.settlers.length > cap) this.settlers.pop();
    }

    let cp = 0;
    let guards = 0;
    const produced = {};
    for (const s of this.settlers) {
      if (s.role === 'guard') guards++;

      // Farmers seek nearby crop plots; ripe crops are harvested, young crops
      // are tended forward one growth stage. Abstract food only fills gaps.
      if (s.role === 'farmer' && world) {
        if (!s.target || !this._isCropTarget(world, s.target)) {
          s.target = this._findCrop(world, s);
        }
      }

      // Gatherers physically seek + chop a nearby resource: acquire a target,
      // walk to it (Settler.update steers), and harvest it on arrival. This
      // happens regardless of the work-tick so the action reads on-screen.
      if (s.role === 'gatherer' && world) {
        if (!s.target || world.get(s.target.x, s.target.y) !== s.target.id) {
          s.target = this._findResource(world, s);
        }
      }

      const tick = s.update(dt, world, this.home);

      if (s.role === 'farmer' && s.atTarget() && world) {
        const got = this._tendCrop(world, s.target);
        s.target = null;
        if (got) {
          this.stock.food = (this.stock.food || 0) + got.food;
          this.stock.wheat = (this.stock.wheat || 0) + got.wheat;
          produced.food = (produced.food || 0) + got.food;
          if (got.wheat) produced.wheat = (produced.wheat || 0) + got.wheat;
          cp += got.cp;
        }
        continue;
      }

      if (s.role === 'gatherer' && s.atTarget() && world) {
        const got = this._harvest(world, s.target);
        s.target = null;
        if (got) {
          this.stock[got] = (this.stock[got] || 0) + 1;
          produced[got] = (produced[got] || 0) + 1;
          cp += 0.5;
        }
        continue;
      }

      if (!tick) continue;
      // Non-gather roles convert a work tick into role-specific output + CP.
      switch (s.role) {
        case 'farmer':   this.stock.food += 1; produced.food = (produced.food || 0) + 1; cp += 0.25; break;
        case 'gatherer': break; // handled above by physical harvesting
        case 'builder': {
          cp += 1.0; produced.build = (produced.build || 0) + 1;
          // Builders visibly grow the village: when the town has spare wood,
          // a builder lays a plank block on open ground near home.
          if (world && this.stock.wood >= 2 && this._buildNearHome(world, s)) {
            this.stock.wood -= 2;
            produced.placed = (produced.placed || 0) + 1;
          }
          break;
        }
        case 'guard':    cp += 0.3; break;
        default:         cp += 0.5; break;
      }
    }
    return { cp, produced, guards };
  }

  _spawn(world) {
    const hx = this.home.x + Math.round((Math.random() - 0.5) * 8);
    const x = Math.max(1, Math.min(world.width - 2, hx));
    const surf = world.heightMap[x] ?? Math.floor(world.height / 2);
    this.settlers.push(new Settler(x + 0.5, surf, this._neededRole()));
  }

  _cropIds() {
    if (!this._crops) {
      this._crops = {
        plot: blockId('farm_plot'),
        seedling: blockId('wheat_seedling'),
        green: blockId('wheat_green'),
        ripe: blockId('wheat_ripe'),
      };
    }
    return this._crops;
  }

  _isCropTarget(world, target) {
    if (!target) return false;
    const ids = this._cropIds();
    const id = world.get(target.x, target.y);
    return id === ids.seedling || id === ids.green || id === ids.ripe;
  }

  _findCrop(world, s) {
    const ids = this._cropIds();
    const cx = Math.round(s.x);
    const cy = Math.round(s.y);
    let best = null;
    let bestD = Infinity;
    const R = 10;
    for (let y = cy - R; y <= cy + R; y++) {
      for (let x = cx - R; x <= cx + R; x++) {
        if (Math.abs(x - this.home.x) > 14) continue;
        const id = world.get(x, y);
        if (id !== ids.seedling && id !== ids.green && id !== ids.ripe) continue;
        const priority = id === ids.ripe ? -6 : 0;
        const d = Math.abs(x - s.x) + Math.abs(y - s.y) + priority;
        if (d < bestD) { bestD = d; best = { x, y, id, kind: 'crop' }; }
      }
    }
    return best;
  }

  _tendCrop(world, target) {
    if (!target) return null;
    const ids = this._cropIds();
    const id = world.get(target.x, target.y);
    if (id === ids.seedling) {
      world.set(target.x, target.y, ids.green);
      return { food: 0, wheat: 0, cp: 0.35 };
    }
    if (id === ids.green) {
      world.set(target.x, target.y, ids.ripe);
      return { food: 0, wheat: 0, cp: 0.45 };
    }
    if (id === ids.ripe) {
      world.set(target.x, target.y, AIR);
      return { food: 2, wheat: 1, cp: 0.9 };
    }
    return null;
  }

  /**
   * Find the nearest harvestable resource within the town radius for a
   * gatherer to walk to. Wood (logs/leaves) and ore are the targets.
   */
  _findResource(world, s) {
    if (!this._resIds) {
      this._resIds = {
        [blockId('log')]: 'wood', [blockId('leaves')]: 'wood',
        [blockId('coal_ore')]: 'ore', [blockId('copper_ore')]: 'ore',
        [blockId('tin_ore')]: 'ore', [blockId('iron_ore')]: 'ore',
      };
    }
    const cx = Math.round(s.x);
    const cy = Math.round(s.y);
    let best = null;
    let bestD = Infinity;
    const R = 9;
    for (let y = cy - R; y <= cy + R; y++) {
      for (let x = cx - R; x <= cx + R; x++) {
        if (Math.abs(x - this.home.x) > 13) continue; // stay near town
        const id = world.get(x, y);
        const kind = this._resIds[id];
        if (!kind) continue;
        const d = Math.abs(x - s.x) + Math.abs(y - s.y);
        if (d < bestD) { bestD = d; best = { x, y, id, kind }; }
      }
    }
    return best;
  }

  /** Remove the target block and return the resource kind it yields. */
  _harvest(world, target) {
    if (!target || world.get(target.x, target.y) !== target.id) return null;
    world.set(target.x, target.y, AIR);
    return target.kind;
  }

  /**
   * Place one plank on open ground a few tiles from the builder, inside a
   * bounded town radius, so the settlement visibly grows without sprawling or
   * burying the player's own builds. Returns true if a block was placed.
   */
  _buildNearHome(world, builder) {
    const plank = blockId('planks');
    const bx = Math.round(builder.x);
    // Cap how high the village stacks so builders make low structures, not
    // endless pillars (placing raises the height map).
    const baseSurf = this.home?.baseSurf ?? world.heightMap?.[this.home.x] ?? 0;
    for (let i = 0; i < 4; i++) {
      const x = bx + (Math.random() < 0.5 ? -1 : 1) * (1 + (Math.random() * 3 | 0));
      if (Math.abs(x - this.home.x) > 12) continue;            // keep it a village, not sprawl
      const surf = world.heightMap?.[x];
      if (surf == null) continue;
      const groundY = surf;          // first solid tile
      const openY = groundY - 1;     // tile just above the ground
      if (groundY < baseSurf - 3) continue;                    // max ~3 tiles tall
      if (!world.inBounds(x, openY)) continue;
      if (world.get(x, openY) !== AIR) continue;               // don't stack/overwrite
      if (!isSolid(world.get(x, groundY))) continue;           // need solid support
      world.set(x, openY, plank);
      return true;
    }
    return false;
  }

  serialize() {
    return { home: this.home, stock: this.stock, settlers: this.settlers.map((s) => s.serialize()) };
  }
}
