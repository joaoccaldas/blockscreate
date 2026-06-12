/**
 * Combo — the flow-state engine.
 *
 * Chain rewarding actions (mining, absorbing, defeating) without pausing and the
 * streak climbs through tiers: each tier mines faster, pays a CP burst, and
 * celebrates harder. Stop (or get hit) and the streak breaks. This is the
 * classic "one more block" juice loop: play *faster* because it feels better.
 *
 * Pure logic — the Game stages the celebration and reads multiplier() for
 * mining speed.
 */
export const COMBO_TIERS = [
  { at: 5, speed: 1.15, bonus: 5, label: 'Combo' },
  { at: 12, speed: 1.3, bonus: 12, label: 'Hot Streak' },
  { at: 25, speed: 1.5, bonus: 25, label: 'Blazing' },
  { at: 50, speed: 1.75, bonus: 50, label: 'UNSTOPPABLE' },
];

const WINDOW = 4; // seconds between actions before the streak breaks

export class Combo {
  constructor() {
    this.count = 0;
    this.idle = 0;
    this.best = 0;
  }

  /** Current tier index (-1 below the first tier). */
  get tier() {
    let t = -1;
    for (let i = 0; i < COMBO_TIERS.length; i++) if (this.count >= COMBO_TIERS[i].at) t = i;
    return t;
  }

  /** Mining-speed multiplier from the active streak (1 when cold). */
  multiplier() {
    const t = this.tier;
    return t < 0 ? 1 : COMBO_TIERS[t].speed;
  }

  /**
   * Register a rewarding action. Returns { count, tierUp } where tierUp is the
   * tier definition just reached (for celebration + CP burst), or null.
   */
  add() {
    const before = this.tier;
    this.count++;
    this.best = Math.max(this.best, this.count);
    this.idle = 0;
    const after = this.tier;
    return { count: this.count, tierUp: after > before ? COMBO_TIERS[after] : null };
  }

  /**
   * Tick the idle clock. Returns { broken, final } when the streak times out
   * (so the Game can show a "combo ended" beat for streaks worth mourning).
   */
  update(dt) {
    if (this.count === 0) return { broken: false };
    this.idle += dt;
    if (this.idle < WINDOW) return { broken: false };
    const final = this.count;
    this.count = 0;
    this.idle = 0;
    return { broken: true, final };
  }

  /** Taking a hit snaps the streak instantly. Returns the lost count. */
  breakStreak() {
    const lost = this.count;
    this.count = 0;
    this.idle = 0;
    return lost;
  }
}
