/**
 * Mobs: passive animals that wander the surface.
 *
 * They reuse the artwork already in the repo (cow/pig/chicken/noah). Behaviour
 * is intentionally light for milestone 1 — wander, fall with gravity, and drop
 * raw food when hit — but the structure is ready for more species per era.
 */
import { C } from '../core/constants.js';
import { isSolid } from '../core/blocks.js';

export const MOB_TYPES = {
  cow: { sprite: 'cow', food: 3, w: 1.1, h: 1.0 },
  pig: { sprite: 'pig', food: 2, w: 1.0, h: 0.9 },
  chicken: { sprite: 'chicken', food: 1, w: 0.7, h: 0.7 },
};

export class Mob {
  constructor(type, x, y) {
    this.type = type;
    const def = MOB_TYPES[type] || MOB_TYPES.cow;
    this.def = def;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.w = def.w;
    this.h = def.h;
    this.facing = Math.random() < 0.5 ? -1 : 1;
    this.timer = Math.random() * 3;
    this.health = 6;
  }

  update(dt, world) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 1 + Math.random() * 3;
      const r = Math.random();
      this.vx = r < 0.4 ? 0 : (Math.random() < 0.5 ? -1 : 1) * 2.2;
      if (this.vx !== 0) this.facing = Math.sign(this.vx);
    }

    this.vy = Math.min(C.MAX_FALL, this.vy + C.GRAVITY * dt);

    // Horizontal
    const nx = this.x + this.vx * dt;
    if (!this.collides(world, nx, this.y)) this.x = nx;
    else this.vx = -this.vx;

    // Vertical
    const ny = this.y + this.vy * dt;
    if (!this.collides(world, this.x, ny)) {
      this.y = ny;
    } else {
      this.vy = 0;
    }
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
    return { type: this.type, x: this.x, y: this.y, health: this.health };
  }

  static load(d) {
    const m = new Mob(d.type, d.x, d.y);
    m.health = d.health;
    return m;
  }
}
