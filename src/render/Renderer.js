/**
 * Canvas renderer with a 2D "pseudo-3D" look.
 *
 * Depth tricks that sell the 2.5D feel without a real 3D pipeline:
 *   - each block draws a lit top bevel + a shaded right/bottom edge
 *   - blocks darken with depth underground (ambient-occlusion-ish)
 *   - parallax sky gradient, drifting clouds, and a starfield at night
 *   - a day/night tint multiplies the whole scene
 *   - particles, a ghost placement preview, and a small walk animation
 *
 * Everything is zoom- and resize-aware (reads camera.tile + live canvas size),
 * and only tiles inside the viewport are drawn so big worlds stay cheap.
 */
import { getBlock, AIR } from '../core/blocks.js';
import { getEra } from '../core/eras.js';
import { getEraTheme } from '../core/eraTheme.js';

const BLOCK_ATLAS = {
  grass: [0, 0], dirt: [1, 0], stone: [2, 0], cobblestone: [2, 0], sand: [3, 0],
  water: [0, 1], log: [1, 1], leaves: [2, 1], planks: [3, 1],
  coal_ore: [0, 2], copper_ore: [1, 2], tin_ore: [2, 2], iron_ore: [3, 2],
  clay: [0, 3], gravel: [1, 3], brick: [2, 3], campfire: [3, 3], torch: [3, 3],
};

const ATLAS_TILE = 32;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sprites = {};
    this.t = 0;
  }

  setSprites(sprites) { this.sprites = sprites; }

  /**
   * scene = { world, camera, player, mobs, particles, dayFactor, hover, ghost, dt }
   */
  render(scene) {
    const { world, camera, player, mobs, particles, dayFactor, tint, meteors, hover, ghost, dt = 0 } = scene;
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const T = camera.tile;
    this.t += dt;
    const era = getEra(world.eraId);

    ctx.clearRect(0, 0, W, H);
    this.drawSky(era, dayFactor, camera, W, H);
    if (world.eraId === 'cell') this.drawMicroscopeField(camera, W, H);

    // Visible tile range.
    const x0 = Math.floor(camera.x - camera.tilesX / 2) - 1;
    const x1 = Math.ceil(camera.x + camera.tilesX / 2) + 1;
    const y0 = Math.floor(camera.y - camera.tilesY / 2) - 1;
    const y1 = Math.ceil(camera.y + camera.tilesY / 2) + 1;

    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const id = world.get(tx, ty);
        if (id === AIR) continue;
        this.drawBlock(camera, world, tx, ty, id, T);
      }
    }

    this.drawDecorations(world, era, camera, T, x0, x1);
    if (meteors && meteors.length) this.drawMeteors(camera, meteors, T);
    this.drawMobs(camera, mobs, T);
    this.drawPlayer(camera, player, T);
    if (particles) this.drawParticles(camera, particles, T);

    if (ghost && ghost.valid) this.drawGhost(camera, ghost, T);
    if (hover && hover.valid) this.drawHover(camera, hover, T);

    this.applyDayNight(dayFactor, W, H);

    // Era signature color wash, on top of everything.
    if (tint) {
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, W, H);
    }
  }

  drawSky(era, dayFactor, camera, W, H) {
    const ctx = this.ctx;
    const [d0, d1] = era.sky.day;
    const [n0, n1] = era.sky.night;
    const top = mix(n0, d0, dayFactor);
    const bottom = mix(n1, d1, dayFactor);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Stars (fade in at night).
    const nightAlpha = Math.max(0, 1 - dayFactor * 1.6);
    if (nightAlpha > 0.02) {
      ctx.fillStyle = `rgba(255,255,255,${nightAlpha * 0.9})`;
      for (let i = 0; i < 60; i++) {
        const sx = (hash(i, 1) * W);
        const sy = (hash(i, 2) * H * 0.6);
        const tw = 0.5 + 0.5 * Math.sin(this.t * 2 + i);
        ctx.globalAlpha = nightAlpha * (0.4 + tw * 0.6);
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
    }

    // Sun / moon arc.
    const angle = dayFactor * Math.PI;
    const cx = W * 0.5 + Math.cos(Math.PI - angle) * W * 0.42;
    const cy = H * 0.72 - Math.sin(angle) * H * 0.55;
    ctx.globalAlpha = 0.92;
    if (dayFactor > 0.4) {
      ctx.fillStyle = '#fff4c2';
      ctx.shadowColor = '#ffe9a0';
      ctx.shadowBlur = 30;
    } else {
      ctx.fillStyle = '#dfe7ff';
      ctx.shadowColor = '#bcd0ff';
      ctx.shadowBlur = 18;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, dayFactor > 0.4 ? 26 : 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Drifting clouds (parallax).
    const cloudAlpha = 0.5 + dayFactor * 0.4;
    ctx.fillStyle = `rgba(255,255,255,${cloudAlpha * 0.7})`;
    for (let i = 0; i < 5; i++) {
      const base = (i * 257.3) % 1;
      const speed = 8 + i * 3;
      let cxp = ((base * W + this.t * speed - camera.x * 6) % (W + 200)) - 100;
      if (cxp < -100) cxp += W + 200;
      const cyp = H * (0.1 + base * 0.25);
      this.cloud(cxp, cyp, 60 + i * 14);
    }

    // Far parallax hills.
    const off = -(camera.x * camera.tile * 0.25) % 240;
    ctx.fillStyle = shade(era.ground, dayFactor * 0.5 + 0.2);
    for (let i = -1; i < W / 240 + 2; i++) {
      const bx = i * 240 + off;
      ctx.beginPath();
      ctx.moveTo(bx, H);
      ctx.quadraticCurveTo(bx + 120, H * 0.6, bx + 240, H);
      ctx.fill();
    }
  }

  cloud(x, y, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
    ctx.arc(x + r * 0.4, y + 4, r * 0.38, 0, Math.PI * 2);
    ctx.arc(x - r * 0.4, y + 4, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
  }

  drawMicroscopeField(camera, W, H) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 36; i++) {
      const depth = 0.25 + (i % 5) * 0.16;
      const sx = (((hash(i, 11) * W * 1.5) - camera.x * 17 * depth + this.t * (7 + i % 6)) % (W + 160)) - 80;
      const sy = (((hash(i, 12) * H * 1.25) - camera.y * 9 * depth + Math.sin(this.t + i) * 8) % (H + 120)) - 60;
      const r = 5 + hash(i, 13) * 20;
      ctx.globalAlpha = 0.08 + hash(i, 14) * 0.12;
      ctx.strokeStyle = i % 4 === 0 ? '#ffd6ff' : '#76f7dd';
      ctx.lineWidth = Math.max(1, r * 0.12);
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = '#b8fff2';
    for (let i = 0; i < 9; i++) {
      const y = H * (0.15 + i * 0.085) + Math.sin(this.t * 0.7 + i) * 10;
      ctx.beginPath();
      for (let x = -30; x <= W + 30; x += 18) {
        const yy = y + Math.sin((x + camera.x * 22) * 0.018 + i) * 10;
        if (x === -30) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    const vignette = ctx.createRadialGradient(
      W * 0.52, H * 0.48, Math.min(W, H) * 0.18,
      W * 0.52, H * 0.48, Math.max(W, H) * 0.64,
    );
    vignette.addColorStop(0, 'rgba(255,255,255,0)');
    vignette.addColorStop(0.68, 'rgba(4,18,32,0.08)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.36)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  drawBlock(camera, world, tx, ty, id, T) {
    const ctx = this.ctx;
    const b = getBlock(id);
    if (!b.colors) return;
    const { sx, sy } = camera.worldToScreen(tx, ty);

    const depth = ty - world.heightMap[clamp(tx, 0, world.width - 1)];
    const dk = depth > 0 ? Math.max(0.55, 1 - depth * 0.012) : 1;
    const bevel = Math.max(2, T * 0.16);

    if (this.drawBlockTexture(b, sx, sy, T, dk)) {
      if (b.light) this.drawLightGlow(sx, sy, T);
      return;
    }

    if (b.liquid) {
      const wob = Math.sin(this.t * 2 + tx * 0.6) * T * 0.04;
      ctx.fillStyle = withAlpha(shade(b.colors.base, dk), 0.78);
      ctx.fillRect(sx, sy + T * 0.15 + wob, T + 1, T * 0.85);
      return;
    }

    ctx.fillStyle = shade(b.colors.base, dk);
    ctx.fillRect(sx, sy, T + 1, T + 1);

    ctx.fillStyle = shade(b.colors.top, dk);
    ctx.fillRect(sx, sy, T + 1, Math.max(2, T * 0.18));

    ctx.fillStyle = shade(b.colors.side, dk * 0.82);
    ctx.fillRect(sx + T - bevel, sy, bevel, T + 1);
    ctx.fillRect(sx, sy + T - bevel, T + 1, bevel);

    if (b.fleck) {
      ctx.fillStyle = b.fleck;
      const r = hash2(tx, ty);
      const fsz = Math.max(2, T * 0.1);
      for (let k = 0; k < 4; k++) {
        const fx = sx + ((r * (k + 3)) % 1) * (T - fsz) ;
        const fy = sy + ((r * (k + 7)) % 1) * (T - fsz);
        ctx.fillRect(fx, fy, fsz, fsz);
      }
    }

    if (b.light) this.drawLightGlow(sx, sy, T);
  }

  drawBlockTexture(block, sx, sy, T, darkness) {
    const atlas = this.sprites.blockAtlas;
    const pos = BLOCK_ATLAS[block.name];
    if (!atlas || !atlas.complete || !atlas.naturalWidth || !pos) return false;
    const ctx = this.ctx;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(atlas, pos[0] * ATLAS_TILE, pos[1] * ATLAS_TILE, ATLAS_TILE, ATLAS_TILE, sx, sy, T + 1, T + 1);
    if (darkness < 0.98) {
      ctx.globalAlpha = Math.min(0.45, 1 - darkness);
      ctx.fillStyle = '#000';
      ctx.fillRect(sx, sy, T + 1, T + 1);
    }
    ctx.restore();
    return true;
  }

  drawLightGlow(sx, sy, T) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.1 * Math.sin(this.t * 6 + sx * 0.05);
    ctx.fillStyle = '#ffdf91';
    ctx.beginPath();
    ctx.arc(sx + T / 2, sy + T / 2, T * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawPlayer(camera, player, T) {
    const ctx = this.ctx;
    const { sx, sy } = camera.worldToScreen(player.x, player.y);
    const w = player.w * T;
    const h = player.h * T;
    const px = sx - w / 2;
    const py = sy - h;

    if (player.form === 'cell') {
      const pulse = 1 + Math.sin(this.t * 5) * 0.08;
      ctx.save();
      const sprite = this.sprites.cell;
      if (sprite && sprite.complete && sprite.naturalWidth) {
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = 0.38;
        ctx.fillStyle = '#76f7dd';
        ctx.beginPath();
        ctx.arc(sx, sy - h * 0.45, h * 0.68 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        const size = Math.max(w, h) * 1.55 * pulse;
        ctx.drawImage(sprite, sx - size / 2, sy - h * 0.48 - size / 2, size, size);
        ctx.restore();
        return;
      }
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = 'rgba(118,247,221,0.26)';
      ctx.beginPath();
      ctx.arc(sx, sy - h * 0.45, h * 0.58 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd6ff';
      ctx.lineWidth = Math.max(2, T * 0.08);
      ctx.stroke();
      ctx.fillStyle = '#9f66c8';
      ctx.beginPath();
      ctx.arc(sx + w * 0.14, sy - h * 0.5, h * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx, sy, w * 0.6, T * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    const sheet = this.sprites.player;
    if (sheet && sheet.complete && sheet.naturalWidth) {
      const moving = Math.abs(player.vx) > 0.2 && player.onGround;
      const frame = !player.onGround ? 3 : moving ? (Math.floor(this.t * 8) % 2 ? 1 : 2) : 0;
      const drawW = T * 1.25;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (player.facing < 0) {
        ctx.translate(sx, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(sheet, frame * ATLAS_TILE, 0, ATLAS_TILE, ATLAS_TILE, -drawW / 2, py, drawW, h);
      } else {
        ctx.drawImage(sheet, frame * ATLAS_TILE, 0, ATLAS_TILE, ATLAS_TILE, sx - drawW / 2, py, drawW, h);
      }
      ctx.restore();
      return;
    }

    // Walk-cycle leg swing based on horizontal motion.
    const moving = Math.abs(player.vx) > 0.2 && player.onGround;
    const swing = moving ? Math.sin(this.t * 12) * h * 0.12 : 0;

    // Legs
    ctx.fillStyle = '#2f4f7a';
    ctx.fillRect(px + w * 0.08, py + h * 0.55, w * 0.36, h * 0.45 + swing);
    ctx.fillRect(px + w * 0.56, py + h * 0.55, w * 0.36, h * 0.45 - swing);
    // Body
    ctx.fillStyle = '#3a6ea5';
    ctx.fillRect(px, py + h * 0.42, w, h * 0.2);
    // Head
    ctx.fillStyle = '#e9c39b';
    ctx.fillRect(px + w * 0.1, py, w * 0.8, h * 0.42);
    // Hair
    ctx.fillStyle = '#5a3a23';
    ctx.fillRect(px + w * 0.1, py, w * 0.8, h * 0.1);
    // Eyes (facing)
    ctx.fillStyle = '#1b1b1b';
    const eo = player.facing > 0 ? w * 0.55 : w * 0.22;
    ctx.fillRect(px + eo, py + h * 0.16, w * 0.16, h * 0.08);
  }

  /**
   * Era-flavored surface scenery (non-collidable). Deterministic from the
   * world seed + column, so props are stable as the camera pans and across
   * reloads. Drawn on top of the surface tile of each visible column.
   */
  drawDecorations(world, era, camera, T, x0, x1) {
    const theme = getEraTheme(world.eraId);
    if (!theme.decorations || !theme.decorations.length) return;
    const ctx = this.ctx;
    for (let tx = x0; tx <= x1; tx++) {
      if (tx < 0 || tx >= world.width) continue;
      const surf = world.heightMap[tx];
      // Don't decorate underwater / out-of-range columns.
      if (surf <= 0 || surf >= world.height) continue;
      const top = world.get(tx, surf);
      if (top === AIR) continue;
      // Pick at most one prop per column via stable hash.
      const h = hash2(tx + (world.originX || 0), world.seed % 9973);
      let acc = 0;
      let chosen = null;
      for (const d of theme.decorations) {
        acc += d.chance;
        if (h < acc) { chosen = d.kind; break; }
      }
      if (!chosen) continue;
      const { sx, sy } = camera.worldToScreen(tx, surf);
      this.drawProp(ctx, chosen, sx, sy, T, hash2(tx * 3 + 1, world.seed % 7919));
    }
  }

  drawProp(ctx, kind, sx, sy, T, r) {
    const baseX = sx + T / 2;
    const groundY = sy; // top of the surface tile
    switch (kind) {
      case 'fern': {
        // Prehistoric fronds fanning up from the ground.
        ctx.strokeStyle = '#3f8a44';
        ctx.lineWidth = Math.max(1.5, T * 0.05);
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(baseX, groundY);
          ctx.quadraticCurveTo(baseX + i * T * 0.12, groundY - T * 0.5,
            baseX + i * T * 0.28, groundY - T * 0.9 + Math.abs(i) * T * 0.12);
          ctx.stroke();
        }
        break;
      }
      case 'shrub':
        ctx.fillStyle = '#3f7a32';
        ctx.beginPath();
        ctx.arc(baseX, groundY - T * 0.18, T * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4e9a3e';
        ctx.beginPath();
        ctx.arc(baseX - T * 0.18, groundY - T * 0.1, T * 0.18, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'bubble':
        ctx.strokeStyle = 'rgba(190,255,245,0.65)';
        ctx.lineWidth = Math.max(1, T * 0.04);
        ctx.beginPath();
        ctx.arc(baseX + (r - 0.5) * T * 0.4, groundY - T * (0.25 + r * 0.8), T * (0.12 + r * 0.12), 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'vent':
        ctx.fillStyle = '#40545d';
        ctx.fillRect(baseX - T * 0.18, groundY - T * 0.65, T * 0.36, T * 0.65);
        ctx.fillStyle = 'rgba(140,255,235,0.55)';
        ctx.beginPath();
        ctx.arc(baseX, groundY - T * 0.72, T * 0.28, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'bones':
        ctx.strokeStyle = '#e6e1cf';
        ctx.lineWidth = Math.max(2, T * 0.08);
        ctx.beginPath();
        ctx.moveTo(baseX - T * 0.25, groundY - 2);
        ctx.lineTo(baseX + T * 0.25, groundY - 2);
        ctx.stroke();
        ctx.fillStyle = '#e6e1cf';
        ctx.fillRect(baseX - T * 0.3, groundY - 4, 3, 4);
        ctx.fillRect(baseX + T * 0.25, groundY - 4, 3, 4);
        break;
      case 'standing_stone':
        ctx.fillStyle = '#6f6f78';
        ctx.fillRect(baseX - T * 0.18, groundY - T * 1.4, T * 0.36, T * 1.4);
        ctx.fillStyle = '#565660';
        ctx.fillRect(baseX - T * 0.18, groundY - T * 1.4, T * 0.12, T * 1.4);
        ctx.fillStyle = 'rgba(255,210,120,0.5)';
        ctx.fillRect(baseX - T * 0.05, groundY - T * 0.9, T * 0.08, T * 0.5); // carved glyph glow
        break;
      case 'pot':
        ctx.fillStyle = '#a9743b';
        ctx.beginPath();
        ctx.ellipse(baseX, groundY - T * 0.3, T * 0.22, T * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7d5026';
        ctx.fillRect(baseX - T * 0.12, groundY - T * 0.62, T * 0.24, T * 0.12);
        break;
      case 'kiln':
        ctx.fillStyle = '#8a5230';
        ctx.fillRect(baseX - T * 0.3, groundY - T * 0.8, T * 0.6, T * 0.8);
        ctx.fillStyle = '#3a2418';
        ctx.fillRect(baseX - T * 0.12, groundY - T * 0.4, T * 0.24, T * 0.4); // mouth
        ctx.fillStyle = `rgba(255,140,40,${0.5 + 0.3 * Math.sin(this.t * 5 + r * 6)})`;
        ctx.fillRect(baseX - T * 0.08, groundY - T * 0.32, T * 0.16, T * 0.3); // fire glow
        break;
      case 'lamp_post': {
        ctx.fillStyle = '#3a3a42';
        ctx.fillRect(baseX - 2, groundY - T * 1.6, 4, T * 1.6);
        ctx.fillStyle = '#2c2c33';
        ctx.fillRect(baseX - T * 0.16, groundY - T * 1.8, T * 0.32, T * 0.24);
        ctx.save();
        ctx.globalAlpha = 0.6 + 0.2 * Math.sin(this.t * 3 + r * 6);
        ctx.fillStyle = '#ffdf91';
        ctx.beginPath();
        ctx.arc(baseX, groundY - T * 1.68, T * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'banner':
        ctx.fillStyle = '#5a3a23';
        ctx.fillRect(baseX - 1, groundY - T * 1.5, 3, T * 1.5);
        ctx.fillStyle = r < 0.5 ? '#8a3b3b' : '#3b5a8a';
        ctx.fillRect(baseX + 2, groundY - T * 1.45, T * 0.4, T * 0.7);
        break;
      case 'smokestack': {
        ctx.fillStyle = '#5a4038';
        ctx.fillRect(baseX - T * 0.18, groundY - T * 2.0, T * 0.36, T * 2.0);
        ctx.fillStyle = '#3a2a24';
        ctx.fillRect(baseX - T * 0.22, groundY - T * 2.05, T * 0.44, T * 0.14);
        // puffs of smoke
        ctx.fillStyle = 'rgba(120,120,128,0.5)';
        for (let i = 0; i < 3; i++) {
          const pY = groundY - T * 2.1 - ((this.t * 12 + i * 14 + r * 20) % 40);
          ctx.beginPath();
          ctx.arc(baseX, pY, T * 0.2 + i * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'pipe':
        ctx.fillStyle = '#6a6e76';
        ctx.fillRect(baseX - T * 0.3, groundY - T * 0.3, T * 0.6, T * 0.3);
        ctx.fillStyle = '#52555c';
        ctx.fillRect(baseX - T * 0.3, groundY - T * 0.3, T * 0.6, 3);
        break;
      default:
        break;
    }
  }

  /** Falling meteors: a glowing head with a fiery tail. */
  drawMeteors(camera, meteors, T) {
    const ctx = this.ctx;
    for (const m of meteors) {
      const { sx, sy } = camera.worldToScreen(m.x, m.y);
      const len = m.impact ? 2.4 : 1.6;
      // Tail (opposite the velocity direction).
      const grad = ctx.createLinearGradient(sx, sy, sx - m.vx * len, sy - m.vy * len);
      grad.addColorStop(0, m.impact ? 'rgba(255,180,80,0.95)' : 'rgba(255,220,150,0.9)');
      grad.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = m.impact ? T * 0.32 : T * 0.18;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - m.vx * len, sy - m.vy * len);
      ctx.stroke();
      // Head.
      ctx.fillStyle = '#fff4d6';
      ctx.beginPath();
      ctx.arc(sx, sy, (m.impact ? 0.32 : 0.2) * T, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawMobs(camera, mobs, T) {
    const ctx = this.ctx;
    for (const m of mobs) {
      const { sx, sy } = camera.worldToScreen(m.x, m.y);
      const w = m.w * T;
      const h = m.h * T;
      const sprite = this.sprites[m.def.sprite];
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(sx, sy, w * 0.5, T * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      if (m.facing < 0) {
        ctx.translate(sx, 0);
        ctx.scale(-1, 1);
        ctx.translate(-sx, 0);
      }
      if (sprite && sprite.complete && sprite.naturalWidth) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sprite, sx - w / 2, sy - h, w, h);
      } else {
        // No sprite yet (e.g. enemies): draw a readable blocky creature.
        this.drawCreatureShape(ctx, sx, sy, w, h, m);
      }
      ctx.restore();

      // Hit flash overlay (drawn unflipped).
      if (m.hitFlash > 0) {
        ctx.globalAlpha = Math.min(0.6, m.hitFlash * 3);
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx - w / 2, sy - h, w, h);
        ctx.globalAlpha = 1;
      }

      // Health bar for hostiles that have taken damage.
      if (m.hostile && m.health < (m.def.hp || 10)) {
        const frac = Math.max(0, m.health / (m.def.hp || 10));
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(sx - w / 2, sy - h - 7, w, 4);
        ctx.fillStyle = '#ff5b5b';
        ctx.fillRect(sx - w / 2, sy - h - 7, w * frac, 4);
      }
    }
  }

  /** Simple procedural body for sprite-less creatures (enemies). */
  drawCreatureShape(ctx, sx, sy, w, h, m) {
    const color = m.def.color || '#cf9d6a';
    ctx.fillStyle = color;
    ctx.fillRect(sx - w / 2, sy - h, w, h);
    // darker legs/base
    ctx.fillStyle = shade(color, 0.7);
    ctx.fillRect(sx - w / 2, sy - h * 0.25, w, h * 0.25);
    // menacing eye
    ctx.fillStyle = m.hostile ? '#ff3b3b' : '#1b1b1b';
    const eo = (m.facing > 0 ? 0.2 : -0.35) * w;
    ctx.fillRect(sx + eo, sy - h * 0.8, w * 0.16, h * 0.12);
  }

  drawParticles(camera, particles, T) {
    const ctx = this.ctx;
    for (const p of particles.list) {
      const { sx, sy } = camera.worldToScreen(p.x, p.y);
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.fillStyle = p.color;
      const s = p.size * T;
      ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
  }

  drawGhost(camera, ghost, T) {
    const ctx = this.ctx;
    const { sx, sy } = camera.worldToScreen(ghost.x, ghost.y);
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = ghost.color || '#fff';
    ctx.fillRect(sx, sy, T, T);
    ctx.globalAlpha = 1;
  }

  drawHover(camera, hover, T) {
    const ctx = this.ctx;
    const { sx, sy } = camera.worldToScreen(hover.x, hover.y);
    ctx.strokeStyle = hover.mode === 'mine' ? 'rgba(255,90,90,0.95)' : 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, sy + 1, T - 2, T - 2);
    if (hover.progress > 0 && hover.progress < 1) {
      // Mining crack overlay.
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(sx, sy, T, T);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(sx, sy + T - 4, T * hover.progress, 4);
    }
  }

  applyDayNight(dayFactor, W, H) {
    const ctx = this.ctx;
    const darkness = (1 - dayFactor) * 0.55;
    if (darkness <= 0.01) return;
    ctx.fillStyle = `rgba(6,10,30,${darkness})`;
    ctx.fillRect(0, 0, W, H);
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

function hash2(x, y) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function hash(i, salt) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
