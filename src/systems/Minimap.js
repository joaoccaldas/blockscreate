/**
 * Minimap — a downsampled side-view of the world around the player.
 *
 * Pure sampling: given the world + a centre, it returns a flat colour grid the
 * HUD paints onto a tiny canvas. Keeping the colour mapping and sampling pure
 * makes "what shows on the map" testable without a canvas; the HUD only blits.
 *
 * It reads as a real map: sky is transparent, solids take their block colour,
 * water/magma/ore stay legible, and the player is a bright dot — so you can read
 * the cave/depth layout of the expansive, deep world at a glance.
 */
import { BLOCKS, AIR } from '../core/blocks.js';

/** Minimap colour for a block id, or null for sky/air (transparent). */
export function minimapColor(id) {
  if (id === AIR) return null;
  const b = BLOCKS[id];
  if (!b) return null;
  // Ores pop with their fleck colour so loot is visible at a glance.
  if (b.fleck) return b.fleck;
  return b.colors?.base || '#7a7a7a';
}

/**
 * Sample a box around (cx, cy). Returns a flat grid of colours (row-major) plus
 * the player's cell, clamped to the world height.
 * @returns {{w:number,h:number,x0:number,y0:number,colors:(string|null)[],
 *           px:number,py:number}}
 */
export function buildMinimap(world, cx, cy, { halfW = 64, halfH = 40 } = {}) {
  const x0 = Math.round(cx - halfW);
  const y0 = Math.max(0, Math.round(cy - halfH));
  const y1 = Math.min(world.height - 1, Math.round(cy + halfH));
  const w = halfW * 2 + 1;
  const h = (y1 - y0) + 1;
  const colors = new Array(w * h);
  for (let row = 0; row < h; row++) {
    const wy = y0 + row;
    for (let col = 0; col < w; col++) {
      const wx = x0 + col;
      colors[row * w + col] = minimapColor(world.get(wx, wy));
    }
  }
  return { w, h, x0, y0, colors, px: Math.round(cx) - x0, py: Math.round(cy) - y0 };
}
