/**
 * Input: keyboard + mouse, with a small touch fallback.
 *
 * Exposes a simple polled state object (`state`) the game reads each tick, plus
 * mouse position and button state for mining/placing. Hotbar selection and
 * one-shot actions (craft menu, save, etc.) are dispatched via callbacks so the
 * Game stays in control of behaviour.
 */
import { HOTBAR_SIZE } from '../systems/Inventory.js';

export class Input {
  constructor(canvas, handlers = {}) {
    this.canvas = canvas;
    this.handlers = handlers;
    this.state = { left: false, right: false, up: false, down: false, fly: false };
    this.mouse = { x: 0, y: 0, down: false, button: 0 };
    this._bind();
  }

  _bind() {
    const map = {
      ArrowLeft: 'left', a: 'left',
      ArrowRight: 'right', d: 'right',
      ArrowUp: 'up', w: 'up', ' ': 'up',
      ArrowDown: 'down', s: 'down',
    };

    window.addEventListener('keydown', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (map[k] !== undefined) { this.state[map[k]] = true; e.preventDefault(); }

      // Hotbar number keys 1..9
      if (k >= '1' && k <= '9') {
        const idx = Math.min(HOTBAR_SIZE - 1, parseInt(k, 10) - 1);
        this.handlers.onHotbar?.(idx);
      }
      if (k === 'e') this.handlers.onToggleInventory?.();
      if (k === 'c') this.handlers.onToggleCrafting?.();
      if (k === 'f') this.state.fly = !this.state.fly;
      if (k === 'Escape') this.handlers.onEscape?.();
    });

    window.addEventListener('keyup', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (map[k] !== undefined) { this.state[map[k]] = false; e.preventDefault(); }
    });

    const setMouse = (e) => {
      const r = this.canvas.getBoundingClientRect();
      const sx = this.canvas.width / r.width;
      const sy = this.canvas.height / r.height;
      this.mouse.x = (e.clientX - r.left) * sx;
      this.mouse.y = (e.clientY - r.top) * sy;
    };

    this.canvas.addEventListener('mousemove', setMouse);
    this.canvas.addEventListener('mousedown', (e) => {
      setMouse(e);
      this.mouse.down = true;
      this.mouse.button = e.button;
    });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Scroll to change hotbar slot.
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.handlers.onScroll?.(Math.sign(e.deltaY));
    }, { passive: false });

    // Minimal touch: tap = mine/place at point, drag bottom-left to move.
    this.canvas.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      setMouse(t);
      this.mouse.down = true;
      this.mouse.button = 0;
    }, { passive: true });
    this.canvas.addEventListener('touchend', () => { this.mouse.down = false; });
  }
}
