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
import { isSolid } from '../core/blocks.js';

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
  }

  /**
   * @param {object} home  { x, y } town center the settler loiters around.
   * @returns {boolean} true if it produced a "work" tick this frame.
   */
  update(dt, world, home) {
    this.timer -= dt;
    if (this.timer <= 0) {
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
    return s;
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
    if (saved?.settlers) this.settlers = saved.settlers.map((d) => Settler.load(d));
  }

  setHome(x, y) {
    if (!this.home) this.home = { x, y };
  }

  /** How many settlers the settlement currently supports. */
  capacity(civ) {
    // Population is the cap, but housing gates it so you must build to grow.
    return Math.max(0, Math.min(civ.population - 1, Math.floor(civ.housing) + 1));
  }

  count() { return this.settlers.length; }

  /**
   * Advance settlers; spawn/retire toward capacity near home. Returns total
   * "work" ticks produced this frame (caller converts to CP).
   */
  update(dt, world, civ) {
    if (!this.home) return 0;
    const cap = this.capacity(civ);

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 3;
      if (this.settlers.length < cap) this._spawn(world);
      else if (this.settlers.length > cap) this.settlers.pop();
    }

    let work = 0;
    for (const s of this.settlers) {
      if (s.update(dt, world, this.home)) work++;
    }
    return work;
  }

  _spawn(world) {
    const hx = this.home.x + Math.round((Math.random() - 0.5) * 8);
    const x = Math.max(1, Math.min(world.width - 2, hx));
    const surf = world.heightMap[x] ?? Math.floor(world.height / 2);
    this.settlers.push(new Settler(x + 0.5, surf, Math.random() < 0.3 ? 'builder' : 'villager'));
  }

  serialize() {
    return { home: this.home, settlers: this.settlers.map((s) => s.serialize()) };
  }
}
