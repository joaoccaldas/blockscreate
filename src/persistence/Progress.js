/**
 * Global meta-progression: which eras the player has unlocked.
 *
 * Persisted separately from any single world save so that unlocking an era in
 * Survival permanently opens it for Creative mode too (per the design: advanced
 * eras, once unlocked, are available in creative).
 */
import { ERAS } from '../core/eras.js';

const KEY = 'blockscreate.progress.v1';

export class Progress {
  constructor() {
    this.unlocked = new Set(['cell']); // origin era always available
    this.load();
  }

  isUnlocked(eraId) {
    return this.unlocked.has(eraId);
  }

  unlock(eraId) {
    if (!this.unlocked.has(eraId)) {
      this.unlocked.add(eraId);
      this.save();
      return true;
    }
    return false;
  }

  unlockedList() {
    return ERAS.filter((e) => this.unlocked.has(e.id));
  }

  set() {
    return new Set(this.unlocked);
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify([...this.unlocked]));
    } catch (e) { /* storage may be unavailable */ }
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.unlocked = new Set(JSON.parse(raw));
      this.unlocked.add('cell');
    } catch (e) { /* ignore */ }
  }
}
