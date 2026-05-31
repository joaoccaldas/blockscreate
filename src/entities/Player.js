/**
 * Player entity: AABB physics + interaction state.
 *
 * Physics resolves against solid world tiles each tick. Survival stats (health,
 * hunger, energy) live here too; in Creative mode they are simply ignored.
 */
import { C, MODE } from '../core/constants.js';
import { isSolid } from '../core/blocks.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.w = C.PLAYER_W;
    this.h = C.PLAYER_H;
    this.onGround = false;
    this.facing = 1;

    // Survival stats (0..100)
    this.health = 100;
    this.hunger = 100;
    this.energy = 100;
    this.alive = true;
  }

  /** Advance physics by dt seconds against the world. */
  update(dt, world, input, mode) {
    const flying = mode === MODE.CREATIVE && input.fly;

    // Horizontal intent
    let ax = 0;
    if (input.left) ax -= 1;
    if (input.right) ax += 1;
    if (ax !== 0) this.facing = ax;
    this.vx = ax * C.MOVE_SPEED;

    if (flying) {
      this.vy = 0;
      if (input.up) this.vy = -C.MOVE_SPEED;
      if (input.down) this.vy = C.MOVE_SPEED;
    } else {
      // Gravity
      this.vy += C.GRAVITY * dt;
      if (this.vy > C.MAX_FALL) this.vy = C.MAX_FALL;
      // Jump
      if (input.up && this.onGround) {
        this.vy = -C.JUMP_VELOCITY;
        this.onGround = false;
      }
    }

    this.moveAxis(world, this.vx * dt, 0);
    const before = this.vy;
    const hitGround = this.moveAxis(world, 0, this.vy * dt);
    if (hitGround) {
      if (before > 18 && mode === MODE.SURVIVAL) {
        // fall damage
        this.health = Math.max(0, this.health - (before - 18) * 2);
      }
      this.vy = 0;
    }

    if (mode === MODE.SURVIVAL) this.updateSurvival(dt);
  }

  /** Move along one axis and resolve collisions. Returns true if blocked. */
  moveAxis(world, dx, dy) {
    this.x += dx;
    this.y += dy;
    let blocked = false;

    const minX = Math.floor(this.x - this.w / 2);
    const maxX = Math.floor(this.x + this.w / 2);
    const minY = Math.floor(this.y - this.h);
    const maxY = Math.floor(this.y);

    for (let ty = minY; ty <= maxY; ty++) {
      for (let tx = minX; tx <= maxX; tx++) {
        if (!isSolid(world.get(tx, ty))) continue;
        // Resolve overlap
        const px = this.x;
        const py = this.y;
        const overlapX = px - tx;
        if (dx > 0 && tx >= px - this.w / 2) {
          this.x = tx - this.w / 2 - 0.001;
          blocked = true;
        } else if (dx < 0) {
          this.x = tx + 1 + this.w / 2 + 0.001;
          blocked = true;
        }
        if (dy > 0) {
          this.y = ty - 0.001;
          this.onGround = true;
          blocked = true;
        } else if (dy < 0) {
          this.y = ty + 1 + this.h + 0.001;
          blocked = true;
        }
        void overlapX; void py;
      }
    }

    if (dy > 0 && !blocked) this.onGround = false;
    return blocked;
  }

  updateSurvival(dt) {
    // Hunger slowly drains; energy regenerates when fed.
    this.hunger = Math.max(0, this.hunger - dt * 0.6);
    if (this.hunger <= 0) {
      this.health = Math.max(0, this.health - dt * 2);
    } else if (this.health < 100 && this.hunger > 40) {
      this.health = Math.min(100, this.health + dt * 1.2);
    }
    if (this.health <= 0) this.alive = false;
  }

  eat(amount) {
    this.hunger = Math.min(100, this.hunger + amount);
  }

  serialize() {
    return {
      x: this.x, y: this.y, vx: this.vx, vy: this.vy,
      health: this.health, hunger: this.hunger, energy: this.energy, facing: this.facing,
    };
  }

  load(d) {
    Object.assign(this, d);
    this.alive = this.health > 0;
  }
}
