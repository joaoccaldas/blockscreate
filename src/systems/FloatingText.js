/**
 * Floating text — the "every action pays" juice layer.
 *
 * Tiny world-space labels that rise and fade: damage numbers, +CP, +tokens,
 * "Absorbed!". Pure data the renderer draws; no DOM. Kept separate from the
 * particle system so text can have its own motion/lifetime and be skipped
 * wholesale under reduce-motion.
 */
export class FloatingTextLayer {
  constructor() { this.list = []; }

  /** Spawn a floater at world (x, y). opts: { color, size, life, vy, dx } */
  add(x, y, text, { color = '#fff', size = 0.5, life = 0.9, vy = -1.6, dx = 0 } = {}) {
    if (this.list.length > 60) this.list.shift(); // cap for safety
    this.list.push({ x: x + dx, y, text: String(text), color, size, life, maxLife: life, vy });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i];
      f.y += f.vy * dt;
      f.vy *= 0.92; // ease the rise
      f.life -= dt;
      if (f.life <= 0) this.list.splice(i, 1);
    }
  }

  clear() { this.list.length = 0; }
}
