/**
 * Input: keyboard + mouse for desktop, and finger-on-canvas for touch.
 *
 * It exposes a polled `state` (movement intents) the game reads each tick, plus
 * `mouse` (position + button) used for mining/placing. Movement on touch comes
 * from on-screen buttons the HUD builds — those set `state` directly — while
 * tapping the world canvas drives mining/placing through `mouse`.
 *
 * One-shot actions (hotbar, menus, pause) are dispatched via handler callbacks
 * so the Game keeps control of behaviour.
 */
import { HOTBAR_SIZE } from '../systems/Inventory.js';

export const isTouch = ('ontouchstart' in window) ||
  (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);

export class Input {
  constructor(canvas, handlers = {}) {
    this.canvas = canvas;
    this.handlers = handlers;
    this.state = { left: false, right: false, up: false, down: false, fly: false };
    this.mouse = { x: 0, y: 0, down: false, button: 0 };
    this.touchId = null;
    this._bound = [];
    this._bind();
  }

  _on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    this._bound.push([target, type, fn, opts]);
  }

  /** Detach all listeners (called when a game ends to avoid leaks). */
  destroy() {
    for (const [t, type, fn, opts] of this._bound) t.removeEventListener(type, fn, opts);
    this._bound = [];
  }

  _setFromClient(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    const sx = this.canvas.width / r.width;
    const sy = this.canvas.height / r.height;
    this.mouse.x = (clientX - r.left) * sx;
    this.mouse.y = (clientY - r.top) * sy;
  }

  _bind() {
    const map = {
      ArrowLeft: 'left', a: 'left',
      ArrowRight: 'right', d: 'right',
      ArrowUp: 'up', w: 'up', ' ': 'up',
      ArrowDown: 'down', s: 'down',
    };

    this._on(window, 'keydown', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (map[k] !== undefined) { this.state[map[k]] = true; e.preventDefault(); }
      if (k >= '1' && k <= '9') {
        this.handlers.onHotbar?.(Math.min(HOTBAR_SIZE - 1, parseInt(k, 10) - 1));
      }
      if (k === 'e') this.handlers.onToggleInventory?.();
      if (k === 'c') this.handlers.onToggleCrafting?.();
      if (k === 'b') this.handlers.onToggleMarket?.();
      if (k === 'f') this.state.fly = !this.state.fly;
      if (k === 'q') this.handlers.onToggleBuild?.();
      if (k === 'r') this.handlers.onCompanionCommand?.();
      if (k === 'x') this.handlers.onToggleMount?.();
      if (k === 'v') this.handlers.onCompanionCargo?.();
      if (k === 'p' || k === 'Escape') this.handlers.onPause?.();
    });

    this._on(window, 'keyup', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (map[k] !== undefined) { this.state[map[k]] = false; e.preventDefault(); }
    });

    // ---- mouse (desktop) ----
    this._on(this.canvas, 'mousemove', (e) => this._setFromClient(e.clientX, e.clientY));
    this._on(this.canvas, 'mousedown', (e) => {
      this._setFromClient(e.clientX, e.clientY);
      this.mouse.down = true;
      this.mouse.button = e.button;
    });
    this._on(window, 'mouseup', () => { this.mouse.down = false; });
    this._on(this.canvas, 'contextmenu', (e) => e.preventDefault());
    this._on(this.canvas, 'wheel', (e) => {
      e.preventDefault();
      this.handlers.onScroll?.(Math.sign(e.deltaY));
    }, { passive: false });

    // ---- touch (mobile): finger on the world canvas mines/places ----
    this._on(this.canvas, 'touchstart', (e) => {
      if (this.touchId !== null) return;
      const t = e.changedTouches[0];
      this.touchId = t.identifier;
      this._setFromClient(t.clientX, t.clientY);
      this.mouse.down = true;
      this.mouse.button = 0; // action resolved by Game (build-mode aware)
      e.preventDefault();
    }, { passive: false });

    this._on(this.canvas, 'touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.touchId) {
          this._setFromClient(t.clientX, t.clientY);
          e.preventDefault();
        }
      }
    }, { passive: false });

    const endTouch = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.touchId) {
          this.touchId = null;
          this.mouse.down = false;
        }
      }
    };
    this._on(this.canvas, 'touchend', endTouch);
    this._on(this.canvas, 'touchcancel', endTouch);
  }
}
