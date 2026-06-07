/**
 * Haptics — tactile feedback on phones via the Vibration API.
 *
 * A tiny, dependency-free wrapper: named events map to vibration patterns, and
 * every call is a safe no-op when haptics are off or the platform lacks
 * navigator.vibrate (i.e. desktop). Kept separate from Audio so feel can be
 * tuned and toggled on its own.
 */
export const PATTERNS = {
  mine: 6,
  break: 16,
  place: 10,
  hurt: [0, 38, 26, 38],
  defeat: [0, 14, 18, 22],
  craft: [0, 8, 14, 8],
  unlock: [0, 12, 36, 12, 36, 24], // achievements / daily / era reveal
  portal: [0, 20, 30, 20, 30, 40],
};

export class Haptics {
  constructor(enabled = true, nav = (typeof navigator !== 'undefined' ? navigator : null)) {
    this.enabled = !!enabled;
    this.nav = nav;
  }

  setEnabled(on) { this.enabled = !!on; }

  /** Whether vibration is actually available on this platform. */
  get supported() { return !!(this.nav && typeof this.nav.vibrate === 'function'); }

  /** Buzz a named pattern. Returns true if a vibration was issued. */
  buzz(name) {
    if (!this.enabled || !this.supported) return false;
    const pattern = PATTERNS[name];
    if (pattern == null) return false;
    try { return this.nav.vibrate(pattern); } catch (e) { return false; }
  }
}
