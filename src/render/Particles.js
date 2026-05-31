/**
 * Lightweight particle system in world-tile coordinates, so particles pan and
 * zoom with the camera. Used for block breaking, footsteps, hits, eating and
 * the era-unlock celebration. Capped so it can never hurt the frame rate.
 */
const MAX = 400;

export class Particles {
  constructor() {
    this.list = [];
  }

  spawn(x, y, vx, vy, { life = 0.6, color = '#fff', size = 0.12, gravity = 18 } = {}) {
    if (this.list.length >= MAX) this.list.shift();
    this.list.push({ x, y, vx, vy, life, maxLife: life, color, size, gravity });
  }

  /** A burst of n particles from a point — e.g. a block shattering. */
  burst(x, y, color, n = 8, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 1 + Math.random() * 3;
      this.spawn(x, y, Math.cos(a) * spd, Math.sin(a) * spd - 1, {
        color,
        life: 0.4 + Math.random() * 0.5,
        size: 0.08 + Math.random() * 0.1,
        ...opts,
      });
    }
  }

  /** Confetti-style upward fountain for celebrations. */
  fountain(x, y, colors, n = 30) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const spd = 6 + Math.random() * 8;
      this.spawn(x, y, Math.cos(a) * spd, Math.sin(a) * spd, {
        color: colors[(Math.random() * colors.length) | 0],
        life: 1.0 + Math.random() * 0.8,
        size: 0.1 + Math.random() * 0.12,
        gravity: 10,
      });
    }
  }

  update(dt) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) l.splice(i, 1);
    }
  }
}
