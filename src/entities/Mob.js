/**
 * Mobs: surface creatures. Two kinds, driven by data so eras can mix freely:
 *
 *   - passive animals wander and, when hit, drop food (the original behavior).
 *   - hostile enemies chase the player when close, deal contact damage, and
 *     drop materials when defeated. Most only spawn at night (see eraTheme).
 *
 * Behavior stays light and deterministic-friendly; the structure is ready for
 * per-era species and richer AI without touching the game loop.
 */
import { C } from '../core/constants.js';
import { isSolid } from '../core/blocks.js';

export const MOB_TYPES = {
  // ---- passive ----
  cow: { sprite: 'cow', food: 3, w: 1.1, h: 1.0, hp: 6, hostile: false },
  pig: { sprite: 'pig', food: 2, w: 1.0, h: 0.9, hp: 6, hostile: false },
  chicken: { sprite: 'chicken', food: 1, w: 0.7, h: 0.7, hp: 4, hostile: false },
  goat: { sprite: 'goat', food: 2, w: 1.0, h: 0.95, hp: 6, hostile: false },

  // ---- hostile ---- (color is used when no sprite exists yet)
  wolf: { sprite: 'wolf', w: 1.0, h: 0.8, hp: 10, hostile: true, damage: 8, speed: 3.6, color: '#6b6b73', drop: 'raw_food', dropN: 1, cp: 4 },
  boar: { sprite: 'boar', w: 1.1, h: 0.9, hp: 12, hostile: true, damage: 10, speed: 3.0, color: '#7a5a3a', drop: 'raw_food', dropN: 2, cp: 4 },
  raider: { sprite: 'raider', w: 0.8, h: 1.8, hp: 16, hostile: true, damage: 12, speed: 3.2, color: '#8a3b3b', drop: 'copper', dropN: 1, cp: 6 },
  bandit: { sprite: 'bandit', w: 0.8, h: 1.8, hp: 20, hostile: true, damage: 14, speed: 3.4, color: '#5b3b6a', drop: 'iron', dropN: 1, cp: 8 },
  machine: { sprite: 'machine', w: 1.1, h: 1.4, hp: 26, hostile: true, damage: 16, speed: 2.6, color: '#5a5e66', drop: 'coal', dropN: 2, cp: 10 },
};

export class Mob {
  constructor(type, x, y) {
    this.type = type;
    const def = MOB_TYPES[type] || MOB_TYPES.cow;
    this.def = def;
    this.hostile = !!def.hostile;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.w = def.w;
    this.h = def.h;
    this.facing = Math.random() < 0.5 ? -1 : 1;
    this.timer = Math.random() * 3;
    this.health = def.hp || 6;
    this.hitFlash = 0; // seconds of "just got hit" tint
    this.attackCd = 0; // contact-attack cooldown
  }

  /**
   * @param {object} target optional player {x,y} so hostiles can chase.
   * @returns {object|null} { damage } if it lands a contact hit this tick.
   */
  update(dt, world, target = null) {
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.attackCd > 0) this.attackCd -= dt;

    if (this.hostile && target) {
      this._think(dt, target);
    } else {
      this._wander(dt);
    }

    this.vy = Math.min(C.MAX_FALL, this.vy + C.GRAVITY * dt);

    // Horizontal move with simple step-up so chasers don't get stuck on 1-blocks.
    const nx = this.x + this.vx * dt;
    if (!this.collides(world, nx, this.y)) {
      this.x = nx;
    } else if (this.hostile && this._onGround(world)) {
      if (!this.collides(world, nx, this.y - 1)) this.vy = -9; // hop the ledge
      else this.vx = -this.vx;
    } else {
      this.vx = -this.vx;
    }

    // Vertical move.
    const ny = this.y + this.vy * dt;
    if (!this.collides(world, this.x, ny)) this.y = ny;
    else this.vy = 0;

    // Contact damage when adjacent to the target.
    if (this.hostile && target && this.attackCd <= 0) {
      if (Math.abs(this.x - target.x) < 0.8 && Math.abs(this.y - target.y) < 1.4) {
        this.attackCd = 0.9;
        return { damage: this.def.damage || 8 };
      }
    }
    return null;
  }

  _wander(dt) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 1 + Math.random() * 3;
      const r = Math.random();
      this.vx = r < 0.4 ? 0 : (Math.random() < 0.5 ? -1 : 1) * 2.2;
      if (this.vx !== 0) this.facing = Math.sign(this.vx);
    }
  }

  _think(dt, target) {
    const dx = target.x - this.x;
    const dist = Math.abs(dx);
    if (dist < 12) {
      // Chase.
      const spd = this.def.speed || 3;
      this.vx = Math.sign(dx) * spd;
      this.facing = Math.sign(dx) || this.facing;
    } else {
      this._wander(dt);
    }
  }

  _onGround(world) {
    return this.collides(world, this.x, this.y + 0.05);
  }

  hurt(amount) {
    this.health -= amount;
    this.hitFlash = 0.2;
    this.vy = -6;
    return this.health <= 0;
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
