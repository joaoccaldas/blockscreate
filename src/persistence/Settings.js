/**
 * User settings (sound, music, zoom preference) persisted across sessions.
 * Kept separate from save games so preferences survive starting a new world.
 */
import { C } from '../core/constants.js';

const DEFAULTS = {
  sound: true,
  music: false,
  zoomPref: 1.0, // multiplies the auto-fit zoom (0.7 .. 1.6)
};

export class Settings {
  constructor() {
    this.values = { ...DEFAULTS };
    this.load();
  }

  get(key) { return this.values[key]; }

  set(key, value) {
    this.values[key] = value;
    this.save();
  }

  save() {
    try { localStorage.setItem(C.SETTINGS_KEY, JSON.stringify(this.values)); }
    catch (e) { /* storage may be unavailable */ }
  }

  load() {
    try {
      const raw = localStorage.getItem(C.SETTINGS_KEY);
      if (raw) this.values = { ...DEFAULTS, ...JSON.parse(raw) };
    } catch (e) { /* ignore */ }
  }
}
