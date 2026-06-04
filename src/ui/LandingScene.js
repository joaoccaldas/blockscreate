/**
 * Animated landing backdrop.
 *
 * A lightweight, self-contained canvas loop that previews the game's premise
 * behind the hero text: a parallax blocky horizon with a day→night sky, drifting
 * clouds, and a little walking figure — so the landing page *shows* gameplay
 * instead of a static image. No game modules imported; pure canvas.
 *
 * Honors reduced-motion (renders a single static frame) and stops painting
 * whenever the landing screen isn't visible, so it costs nothing in-game.
 */
export class LandingScene {
  constructor(canvas, { reduceMotion = false } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.reduceMotion = reduceMotion;
    this.t = 0;
    this.running = false;
    this._frame = this._frame.bind(this);
    this._onResize = () => this.resize();
  }

  start() {
    if (this.running) return;
    this.running = true;
    window.addEventListener('resize', this._onResize);
    this.resize();
    this.last = performance.now();
    if (this.reduceMotion) { this._draw(0); return; } // one static frame
    requestAnimationFrame(this._frame);
  }

  stop() {
    this.running = false;
    window.removeEventListener('resize', this._onResize);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, Math.round((r.width || window.innerWidth)));
    this.h = Math.max(1, Math.round((r.height || window.innerHeight)));
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _frame(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    this._draw(this.t);
    requestAnimationFrame(this._frame);
  }

  _draw(t) {
    const { ctx, w, h } = this;
    // Day/night cycle (slow).
    const day = (Math.sin(t * 0.15) + 1) / 2; // 0..1
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, mix('#0b1430', '#8fd0ff', day));
    sky.addColorStop(1, mix('#1c2a55', '#cdeeff', day));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Sun / moon arc.
    const ang = (t * 0.15) % (Math.PI * 2);
    const cx = w * 0.5 + Math.cos(ang - Math.PI / 2) * w * 0.42;
    const cy = h * 0.62 - Math.sin(ang) * h * 0.4;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = day > 0.5 ? '#ffe9a0' : '#dfe7ff';
    ctx.beginPath();
    ctx.arc(cx, cy, day > 0.5 ? 26 : 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Stars at night.
    if (day < 0.4) {
      ctx.fillStyle = `rgba(255,255,255,${(0.4 - day) * 1.6})`;
      for (let i = 0; i < 40; i++) {
        const sx = (i * 97.13 % w);
        const sy = (i * 53.7 % (h * 0.5));
        ctx.fillRect(sx, sy, 2, 2);
      }
    }

    // Parallax hill bands.
    this._hills(h * 0.62, '#2c5f6b', t * 6, 120, 0.55 + day * 0.2);
    this._hills(h * 0.72, '#244f4a', t * 11, 90, 0.7 + day * 0.2);

    // Blocky ground with a tiny grass top.
    const groundY = Math.round(h * 0.8);
    const T = 22;
    for (let x = -((t * 24) % T); x < w; x += T) {
      ctx.fillStyle = shade('#5a9e3f', 0.6 + day * 0.4);
      ctx.fillRect(x, groundY, T + 1, T * 0.4);
      ctx.fillStyle = shade('#7a5230', 0.6 + day * 0.4);
      ctx.fillRect(x, groundY + T * 0.4, T + 1, h - groundY);
    }

    // A little walking figure on the ground.
    const px = w * 0.5 + Math.sin(t * 0.6) * w * 0.22;
    const py = groundY;
    const bob = Math.abs(Math.sin(t * 6)) * 3;
    ctx.fillStyle = '#2f4f7a';
    ctx.fillRect(px - 5, py - 22 + bob, 10, 12);
    ctx.fillStyle = '#e9c39b';
    ctx.fillRect(px - 5, py - 30 + bob, 10, 9);
    ctx.fillStyle = '#1b1b1b';
    ctx.fillRect(px + (Math.sin(t * 0.6) >= 0 ? 1 : -4), py - 27 + bob, 3, 2);

    // Soft vignette for text legibility (matches the scrim).
    const v = ctx.createLinearGradient(0, 0, w, 0);
    v.addColorStop(0, 'rgba(6,9,20,0.85)');
    v.addColorStop(0.55, 'rgba(6,9,20,0.25)');
    v.addColorStop(1, 'rgba(6,9,20,0)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }

  _hills(baseY, color, offset, amp, lit) {
    const { ctx, w } = this;
    ctx.fillStyle = shade(color, lit);
    ctx.beginPath();
    ctx.moveTo(0, this.h);
    for (let x = 0; x <= w; x += 12) {
      const y = baseY + Math.sin((x + offset) * 0.01) * amp * 0.25;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, this.h);
    ctx.closePath();
    ctx.fill();
  }
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}
function mix(a, b, t) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return `rgb(${Math.round(x[0] + (y[0] - x[0]) * t)},${Math.round(x[1] + (y[1] - x[1]) * t)},${Math.round(x[2] + (y[2] - x[2]) * t)})`;
}
