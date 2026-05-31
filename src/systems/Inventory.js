/**
 * Inventory + hotbar.
 *
 * A flat list of { id, n } slots. The first HOTBAR_SIZE slots are the hotbar.
 * Stacking is handled on add; the UI reads slots directly.
 */
import { getItem } from '../core/items.js';

export const HOTBAR_SIZE = 9;
export const TOTAL_SLOTS = 36;

export class Inventory {
  constructor() {
    this.slots = new Array(TOTAL_SLOTS).fill(null); // null | { id, n }
    this.selected = 0; // hotbar index
  }

  selectedItem() {
    return this.slots[this.selected];
  }

  count(id) {
    let total = 0;
    for (const s of this.slots) if (s && s.id === id) total += s.n;
    return total;
  }

  /** Add items; returns leftover count that didn't fit. */
  add(id, n = 1) {
    const item = getItem(id);
    const max = item ? item.stack : 99;
    // Top up existing stacks
    for (const s of this.slots) {
      if (s && s.id === id && s.n < max) {
        const space = max - s.n;
        const take = Math.min(space, n);
        s.n += take;
        n -= take;
        if (n === 0) return 0;
      }
    }
    // New stacks
    for (let i = 0; i < this.slots.length; i++) {
      if (!this.slots[i]) {
        const take = Math.min(max, n);
        this.slots[i] = { id, n: take };
        n -= take;
        if (n === 0) return 0;
      }
    }
    return n;
  }

  /** Remove n of id; returns true if fully removed. */
  remove(id, n = 1) {
    if (this.count(id) < n) return false;
    for (const s of this.slots) {
      if (n === 0) break;
      if (s && s.id === id) {
        const take = Math.min(s.n, n);
        s.n -= take;
        n -= take;
        if (s.n === 0) {
          const i = this.slots.indexOf(s);
          this.slots[i] = null;
        }
      }
    }
    return true;
  }

  /** Consume one of the currently selected item (e.g. after placing). */
  consumeSelected(n = 1) {
    const s = this.slots[this.selected];
    if (!s) return false;
    s.n -= n;
    if (s.n <= 0) this.slots[this.selected] = null;
    return true;
  }

  serialize() {
    return { slots: this.slots, selected: this.selected };
  }

  load(d) {
    if (!d) return;
    this.slots = d.slots && d.slots.length ? d.slots : this.slots;
    this.selected = d.selected || 0;
  }
}
