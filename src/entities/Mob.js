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
  // ---- First Cell era (microscopic, float instead of fall) ----
  // Passive drifter: harmless life that makes the primordial sea feel alive.
  microbe: { sprite: 'microbe', w: 0.5, h: 0.5, hp: 3, hostile: false, float: true, color: '#8effd9' },
  // Gentle predator: a phage that drifts toward the cell and saps stability on
  // contact (handled in Game, not raw HP) — stakes without punishment.
  phage: { sprite: 'phage', w: 0.6, h: 0.6, hp: 5, hostile: true, float: true, damage: 6, speed: 2.2, color: '#c86bff', drop: 'nutrient_blob', dropN: 1, cp: 3, saps: 'stability' },

  // ---- passive ----
  cow: { sprite: 'cow', food: 3, w: 1.1, h: 1.0, hp: 6, hostile: false },
  pig: { sprite: 'pig', food: 2, w: 1.0, h: 0.9, hp: 6, hostile: false },
  chicken: { sprite: 'chicken', food: 1, w: 0.7, h: 0.7, hp: 4, hostile: false },
  goat: { sprite: 'goat', food: 2, w: 1.0, h: 0.95, hp: 6, hostile: false },

  // ---- dinosaurs (Age of Dinosaurs era) ----
  // Passive grazers: lots of food, slow, big.
  stego: { sprite: 'stego', food: 5, w: 1.6, h: 1.2, hp: 16, hostile: false },
  trike: { sprite: 'trike', food: 5, w: 1.5, h: 1.1, hp: 18, hostile: false },
  // Predators.
  raptor: { sprite: 'raptor', w: 1.0, h: 1.0, hp: 12, hostile: true, damage: 12, speed: 4.6, color: '#7c8a4a', drop: 'raw_food', dropN: 2, cp: 6 },
  alpha_raptor: { sprite: 'raptor', w: 1.25, h: 1.2, hp: 32, hostile: true, damage: 18, speed: 5.0, color: '#a05a3a', drop: 'alpha_tooth', dropN: 1, cp: 26 },
  rex: { sprite: 'rex', w: 1.8, h: 2.0, hp: 40, hostile: true, damage: 24, speed: 3.0, color: '#5f7242', drop: 'raw_food', dropN: 4, cp: 16 },

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
    this.tamed = false;
    this.command = 'follow'; // tamed companion command: follow, stay, guard
    this.mounted = false;
    this.cargo = [];
  }

  /**
   * @param {object} target optional player {x,y} so hostiles can chase.
   * @returns {object|null} { damage } if it lands a contact hit this tick.
   */
  update(dt, world, target = null) {
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.attackCd > 0) this.attackCd -= dt;

    // Floating microscopic life (First Cell): drift in 2D, no gravity. Phages
    // gently home in on the cell; microbes just bob around.
    if (this.def.float) {
      return this._floatUpdate(dt, world, target);
    }

    if (this.mounted) {
      this.vx = 0;
      this.vy = 0;
    } else if (this.tamed) {
      if (target) this._follow(dt, target);
      else this.vx *= 0.5;
    } else if (this.hostile && target) {
      this._think(dt, target);
    } else {
      this._wander(dt);
    }

    this.vy = Math.min(C.MAX_FALL, this.vy + C.GRAVITY * dt);

    // Horizontal move with simple step-up so chasers don't get stuck on 1-blocks.
    const nx = this.x + this.vx * dt;
    if (!this.collides(world, nx, this.y)) {
      this.x = nx;
    } else if ((this.hostile || this.tamed) && this._onGround(world)) {
      if (!this.collides(world, nx, this.y - 1)) this.vy = -9; // hop the ledge
      else if (!this.collides(world, nx, this.y - 2)) this.vy = -11; // recover from rougher terrain
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
        let damage = this.def.damage || 8;
        if ((this.type === 'raptor' || this.type === 'alpha_raptor') && (target.packPressure || 0) >= 2) damage *= 1.35;
        if (this.type === 'rex' && target.fearExposed) damage *= 1.15;
        return { damage };
      }
    }
    return null;
  }

  /**
   * 2D floating movement for microscopic life. Phages drift toward the cell;
   * microbes meander. Returns a { sap } contact event for phages so the game
   * can drain stability instead of dealing hard HP damage.
   */
  _floatUpdate(dt, world, target) {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.8 + Math.random() * 1.8;
      // base gentle drift
      this.vx = (Math.random() - 0.5) * 2;
      this.vy = (Math.random() - 0.5) * 1.6;
    }
    // Phages home in on a nearby cell.
    if (this.hostile && target) {
      const dx = target.x - this.x;
      const dy = (target.y - this.h / 2) - this.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 13) {
        const spd = this.def.speed || 2;
        this.vx += (dx / d) * spd * dt * 4;
        this.vy += (dy / d) * spd * dt * 4;
      }
      this.facing = Math.sign(this.vx) || this.facing;
    }
    // Damp + clamp so they glide, not rocket.
    this.vx *= 1 - dt * 1.2;
    this.vy *= 1 - dt * 1.2;
    const maxV = 3;
    this.vx = Math.max(-maxV, Math.min(maxV, this.vx));
    this.vy = Math.max(-maxV, Math.min(maxV, this.vy));

    const nx = this.x + this.vx * dt;
    if (!this.collides(world, nx, this.y)) this.x = nx; else this.vx = -this.vx * 0.5;
    const ny = this.y + this.vy * dt;
    if (!this.collides(world, this.x, ny)) this.y = ny; else this.vy = -this.vy * 0.5;

    // Contact "sap" event for phages.
    if (this.hostile && target && this.attackCd <= 0 &&
        Math.abs(this.x - target.x) < 0.8 && Math.abs((this.y) - (target.y - target.h / 2)) < 1.0) {
      this.attackCd = 1.1;
      return { sap: this.def.damage || 6 };
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
      let spd = this.def.speed || 3;
      if (this.type === 'raptor' || this.type === 'alpha_raptor') spd *= 1 + Math.min(0.35, (target.packPressure || 0) * 0.12);
      if (this.type === 'rex' && target.fearExposed) spd *= 1.08;
      this.vx = Math.sign(dx) * spd;
      this.facing = Math.sign(dx) || this.facing;
    } else {
      this._wander(dt);
    }
  }

  _follow(dt, target) {
    const dx = target.x - this.x;
    const dist = Math.abs(dx);
    if (dist > 18) {
      this.x = target.x - Math.sign(dx || 1) * 3;
      this.y = target.y;
      this.vx = 0;
      return;
    }
    if (dist > 3) {
      this.vx = Math.sign(dx) * 2.7;
      this.facing = Math.sign(dx) || this.facing;
    } else {
      this.vx *= 0.6;
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
    return {
      type: this.type, x: this.x, y: this.y, health: this.health,
      tamed: this.tamed, command: this.command, mounted: this.mounted,
      cargo: this.cargo || [],
    };
  }

  static load(d) {
    const m = new Mob(d.type, d.x, d.y);
    m.health = d.health;
    m.tamed = !!d.tamed;
    m.command = d.command || (m.tamed ? 'follow' : 'follow');
    m.mounted = !!d.mounted;
    m.cargo = Array.isArray(d.cargo) ? d.cargo : [];
    return m;
  }
}
