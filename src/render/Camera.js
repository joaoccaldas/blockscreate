/**
 * Camera: follows a target (the player), clamps to world bounds, and supports
 * zoom + a dynamically-sized canvas (for responsive / mobile layouts).
 *
 * Works in tile units; `tile` is the on-screen pixel size of one tile at the
 * current zoom, and the viewport tile counts are derived from the live canvas
 * size so the view stays correct after a resize.
 */
import { C } from '../core/constants.js';

export class Camera {
  constructor(world, canvas, zoom = 1) {
    this.world = world;
    this.canvas = canvas;
    this.zoom = zoom;
    this.x = world.spawn.x;
    this.y = world.spawn.y;

    // Screen-shake ("trauma") state. Trauma is a 0..1 charge that decays every
    // frame; the on-screen offset scales with trauma² so small hits barely
    // wobble while big ones really kick. Offsets are in TILE units and are
    // applied only to rendering (see Game.render), never to input hit-testing,
    // so mining/placing stays pixel-accurate while the world shakes.
    this.trauma = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this._shakeT = 0;
  }

  get tile() { return C.TILE * this.zoom; }
  get tilesX() { return this.canvas.width / this.tile; }
  get tilesY() { return this.canvas.height / this.tile; }

  /** Add screen-shake. amount ~0.15 = a tap, ~0.35 = a solid hit, ~0.7 = big. */
  addTrauma(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** Advance the shake each frame; call once per rendered frame with dt (s). */
  updateShake(dt) {
    this._shakeT += dt;
    const s = this.trauma * this.trauma;   // quadratic — punchier
    const amp = s * 0.55;                  // max ~0.55 tile of travel
    const t = this._shakeT;
    // Layered sines read as smooth pseudo-random jitter without a noise lib.
    this.shakeX = amp * (Math.sin(t * 47.0) * 0.6 + Math.sin(t * 28.7) * 0.4);
    this.shakeY = amp * (Math.cos(t * 53.0) * 0.6 + Math.sin(t * 36.3) * 0.4);
    this.trauma = Math.max(0, this.trauma - dt * 1.9); // ~0.5s to settle
  }

  follow(target, dt) {
    const lerp = Math.min(1, dt * 8);
    this.x += (target.x - this.x) * lerp;
    this.y += (target.y - this.y - this.tilesY * 0.08) * lerp;
    this.clamp();
  }

  snap(target) {
    this.x = target.x;
    this.y = target.y - this.tilesY * 0.08;
    this.clamp();
  }

  clamp() {
    const halfX = this.tilesX / 2;
    const halfY = this.tilesY / 2;
    // If the world is narrower than the view, just centre it.
    this.x = this.world.width <= this.tilesX
      ? this.world.width / 2
      : Math.max(halfX, Math.min(this.world.width - halfX, this.x));
    this.y = this.world.height <= this.tilesY
      ? this.world.height / 2
      : Math.max(halfY, Math.min(this.world.height - halfY, this.y));
  }

  /** World tile coords -> screen pixel coords (top-left of the tile). */
  worldToScreen(tx, ty) {
    const sx = (tx - this.x) * this.tile + this.canvas.width / 2;
    const sy = (ty - this.y) * this.tile + this.canvas.height / 2;
    return { sx, sy };
  }

  /** Screen pixel coords -> world tile coords (floored). */
  screenToWorld(px, py) {
    const tx = (px - this.canvas.width / 2) / this.tile + this.x;
    const ty = (py - this.canvas.height / 2) / this.tile + this.y;
    return { tx, ty, tileX: Math.floor(tx), tileY: Math.floor(ty) };
  }
}
