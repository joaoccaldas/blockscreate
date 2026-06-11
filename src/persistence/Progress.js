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
    this.dailies = new Set();          // completed daily-challenge date keys
    this.streak = 0;                   // consecutive daily completions
    this.lastDaily = null;             // last completed daily date key
    this.descents = 0;                 // New Game+ "descend a layer" count (prestige)
    this.load();
  }

  // --- New Game+ / prestige ---
  /** Descend one simulation layer deeper; returns the new layer count. */
  descend() { this.descents = (this.descents || 0) + 1; this.save(); return this.descents; }

  /** Permanent legacy bonuses that carry across descents (compounding, capped). */
  prestige() {
    const d = this.descents || 0;
    return {
      layer: d,
      cpMult: 1 + Math.min(1.5, d * 0.15),     // up to +150% CP
      startTokens: Math.min(300, d * 30),       // a head-start wallet each layer
      miningMult: 1 + Math.min(0.8, d * 0.08),  // faster mining over time
    };
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

  // --- Daily challenge ---
  hasDailyDone(key) { return this.dailies.has(key); }

  /** Returns the day before `key` (UTC), for streak continuity checks. */
  _prevKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    const prev = new Date(Date.UTC(y, m - 1, d) - 86400000);
    return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}-${String(prev.getUTCDate()).padStart(2, '0')}`;
  }

  /** Record a daily completion and update the streak. Returns the new streak. */
  completeDaily(key) {
    if (this.dailies.has(key)) return this.streak;
    this.dailies.add(key);
    this.streak = (this.lastDaily && this.lastDaily === this._prevKey(key)) ? this.streak + 1 : 1;
    this.lastDaily = key;
    this.save();
    return this.streak;
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        unlocked: [...this.unlocked],
        dailies: [...this.dailies].slice(-120), // keep recent history bounded
        streak: this.streak,
        lastDaily: this.lastDaily,
        descents: this.descents,
      }));
    } catch (e) { /* storage may be unavailable */ }
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          // Legacy format: a bare array of unlocked era ids.
          this.unlocked = new Set(data);
        } else if (data && typeof data === 'object') {
          this.unlocked = new Set(data.unlocked || ['cell']);
          this.dailies = new Set(data.dailies || []);
          this.streak = data.streak || 0;
          this.lastDaily = data.lastDaily || null;
          this.descents = data.descents || 0;
        }
      }
      this.unlocked.add('cell');
    } catch (e) { /* ignore */ }
  }
}
