/**
 * Canvas renderer with a 2D "pseudo-3D" look.
 *
 * Depth tricks that sell the 2.5D feel without a real 3D pipeline:
 *   - each block draws a lit top bevel + a shaded right/bottom edge
 *   - blocks darken with depth underground (ambient occlusion-ish)
 *   - a parallax sky gradient + far hills shift slowly behind the world
 *   - a day/night tint multiplies the whole scene
 *
 * Only the tiles inside the camera viewport are drawn, so large worlds stay
 * cheap. The renderer is stateless beyond its canvas refs — all data comes in.
 */
import { C } from '../core/constants.js';
import { getBlock, AIR } from '../core/blocks.js';
import { getEra } from '../core/eras.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = C.CANVAS_W;
    canvas.height = C.CANVAS_H;
    this.sprites = {};
  }

  setSprites(sprites) {
    this.sprites = sprites;
  }

  /** dayFactor: 1 = noon, 0 = midnight. */
  render(world, camera, player, mobs, dayFactor, hover) {
    const ctx = this.ctx;
    const era = getEra(world.eraId);
    ctx.clearRect(0, 0, C.CANVAS_W, C.CANVAS_H);

    this.drawSky(era, dayFactor, camera);

    // Visible tile range.
    const x0 = Math.floor(camera.x - camera.tilesX / 2) - 1;
    const x1 = Math.ceil(camera.x + camera.tilesX / 2) + 1;
    const y0 = Math.floor(camera.y - camera.tilesY / 2) - 1;
    const y1 = Math.ceil(camera.y + camera.tilesY / 2) + 1;

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const id = world.get(tx, ty);
        if (id === AIR) continue;
        this.drawBlock(camera, world, tx, ty, id);
      }
    }

    this.drawMobs(camera, mobs);
    this.drawPlayer(camera, player);

    if (hover && hover.valid) this.drawHover(camera, hover);

    this.applyDayNight(dayFactor);
  }

  drawSky(era, dayFactor, camera) {
    const ctx = this.ctx;
    const [d0, d1] = era.sky.day;
    const [n0, n1] = era.sky.night;
    const top = mix(n0, d0, dayFactor);
    const bottom = mix(n1, d1, dayFactor);
    const g = ctx.createLinearGradient(0, 0, 0, C.CANVAS_H);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, C.CANVAS_W, C.CANVAS_H);

    // Sun / moon arc.
    const t = (camera.world.clock !== undefined) ? 0 : 0;
    void t;
    const angle = (dayFactor) * Math.PI;
    const cx = C.CANVAS_W * 0.5 + Math.cos(Math.PI - angle) * C.CANVAS_W * 0.4;
    const cy = C.CANVAS_H * 0.7 - Math.sin(angle) * C.CANVAS_H * 0.55;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = dayFactor > 0.4 ? '#fff4c2' : '#dfe7ff';
    ctx.beginPath();
    ctx.arc(cx, cy, dayFactor > 0.4 ? 26 : 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Far parallax hills.
    const off = -(camera.x * C.TILE * 0.25) % 240;
    ctx.fillStyle = shade(era.ground, dayFactor * 0.5 + 0.2);
    for (let i = -1; i < C.CANVAS_W / 240 + 2; i++) {
      const bx = i * 240 + off;
      ctx.beginPath();
      ctx.moveTo(bx, C.CANVAS_H);
      ctx.quadraticCurveTo(bx + 120, C.CANVAS_H * 0.55, bx + 240, C.CANVAS_H);
      ctx.fill();
    }
  }

  drawBlock(camera, world, tx, ty, id) {
    const ctx = this.ctx;
    const b = getBlock(id);
    if (!b.colors) return;
    const { sx, sy } = camera.worldToScreen(tx, ty);
    const T = C.TILE;

    // Depth darkening.
    const depth = ty - world.heightMap[clamp(tx, 0, world.width - 1)];
    const dk = depth > 0 ? Math.max(0.55, 1 - depth * 0.012) : 1;

    if (b.liquid) {
      ctx.fillStyle = withAlpha(shade(b.colors.base, dk), 0.78);
      ctx.fillRect(sx, sy + T * 0.15, T, T * 0.85);
      return;
    }

    // Body
    ctx.fillStyle = shade(b.colors.base, dk);
    ctx.fillRect(sx, sy, T, T);

    // Lit top bevel
    ctx.fillStyle = shade(b.colors.top, dk);
    ctx.fillRect(sx, sy, T, Math.max(2, T * 0.18));

    // Shaded right + bottom edge (the pseudo-3D depth cue)
    ctx.fillStyle = shade(b.colors.side, dk * 0.82);
    ctx.fillRect(sx + T - Math.max(2, T * 0.16), sy, Math.max(2, T * 0.16), T);
    ctx.fillRect(sx, sy + T - Math.max(2, T * 0.16), T, Math.max(2, T * 0.16));

    // Ore flecks
    if (b.fleck) {
      ctx.fillStyle = b.fleck;
      const r = pseudoRand(tx, ty);
      for (let k = 0; k < 4; k++) {
        const fx = sx + ((r * (k + 3)) % 1) * (T - 5) + 2;
        const fy = sy + ((r * (k + 7)) % 1) * (T - 5) + 2;
        ctx.fillRect(fx, fy, 3, 3);
      }
    }
  }

  drawPlayer(camera, player) {
    const ctx = this.ctx;
    const T = C.TILE;
    const { sx, sy } = camera.worldToScreen(player.x, player.y);
    const w = player.w * T;
    const h = player.h * T;
    const px = sx - w / 2;
    const py = sy - h;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx, sy, w * 0.6, T * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Simple blocky avatar.
    ctx.fillStyle = '#3a6ea5';
    ctx.fillRect(px, py + h * 0.45, w, h * 0.55); // body/legs
    ctx.fillStyle = '#e9c39b';
    ctx.fillRect(px, py, w, h * 0.45); // head
    // Eyes (facing)
    ctx.fillStyle = '#1b1b1b';
    const eo = player.facing > 0 ? w * 0.55 : w * 0.2;
    ctx.fillRect(px + eo, py + h * 0.16, w * 0.18, h * 0.1);
  }

  drawMobs(camera, mobs) {
    const ctx = this.ctx;
    const T = C.TILE;
    for (const m of mobs) {
      const { sx, sy } = camera.worldToScreen(m.x, m.y);
      const w = m.w * T;
      const h = m.h * T;
      const sprite = this.sprites[m.def.sprite];
      ctx.save();
      if (m.facing < 0) {
        ctx.translate(sx, 0);
        ctx.scale(-1, 1);
        ctx.translate(-sx, 0);
      }
      if (sprite && sprite.complete && sprite.naturalWidth) {
        ctx.drawImage(sprite, sx - w / 2, sy - h, w, h);
      } else {
        ctx.fillStyle = '#cf9d6a';
        ctx.fillRect(sx - w / 2, sy - h, w, h);
      }
      ctx.restore();
    }
  }

  drawHover(camera, hover) {
    const ctx = this.ctx;
    const T = C.TILE;
    const { sx, sy } = camera.worldToScreen(hover.x, hover.y);
    ctx.strokeStyle = hover.mode === 'mine' ? 'rgba(255,80,80,0.9)' : 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, sy + 1, T - 2, T - 2);
    if (hover.progress > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(sx, sy, T * hover.progress, 4);
    }
  }

  applyDayNight(dayFactor) {
    const ctx = this.ctx;
    const darkness = (1 - dayFactor) * 0.55;
    if (darkness <= 0.01) return;
    ctx.fillStyle = `rgba(6,10,30,${darkness})`;
    ctx.fillRect(0, 0, C.CANVAS_W, C.CANVAS_H);
  }
}

// ---- color helpers ----
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}

function withAlpha(rgb, a) {
  return rgb.replace('rgb(', 'rgba(').replace(')', `,${a})`);
}

function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

function pseudoRand(x, y) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
