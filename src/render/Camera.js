/**
 * Camera: follows a target (the player) and clamps to world bounds.
 * Works in tile units; the renderer converts to pixels.
 */
import { C } from '../core/constants.js';

export class Camera {
  constructor(world) {
    this.world = world;
    this.x = world.spawn.x;
    this.y = world.spawn.y;
    this.tilesX = C.CANVAS_W / C.TILE;
    this.tilesY = C.CANVAS_H / C.TILE;
  }

  follow(target, dt) {
    // Smooth follow.
    const lerp = Math.min(1, dt * 8);
    this.x += (target.x - this.x) * lerp;
    this.y += (target.y - this.y - this.tilesY * 0.1) * lerp;
    this.clamp();
  }

  snap(target) {
    this.x = target.x;
    this.y = target.y - this.tilesY * 0.1;
    this.clamp();
  }

  clamp() {
    const halfX = this.tilesX / 2;
    const halfY = this.tilesY / 2;
    this.x = Math.max(halfX, Math.min(this.world.width - halfX, this.x));
    this.y = Math.max(halfY, Math.min(this.world.height - halfY, this.y));
  }

  /** World tile coords -> screen pixel coords (top-left of the tile). */
  worldToScreen(tx, ty) {
    const sx = (tx - this.x) * C.TILE + C.CANVAS_W / 2;
    const sy = (ty - this.y) * C.TILE + C.CANVAS_H / 2;
    return { sx, sy };
  }

  /** Screen pixel coords -> world tile coords (floored). */
  screenToWorld(px, py) {
    const tx = (px - C.CANVAS_W / 2) / C.TILE + this.x;
    const ty = (py - C.CANVAS_H / 2) / C.TILE + this.y;
    return { tx, ty, tileX: Math.floor(tx), tileY: Math.floor(ty) };
  }
}
