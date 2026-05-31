/**
 * Save / load: localStorage autosave + downloadable export/import files.
 *
 * A save bundles the world (seed + RLE grid), player, inventory, mobs, clock,
 * civilization, mode and era. Export writes the same JSON to a .json file the
 * player can move between devices; import reads it back.
 */
import { C } from '../core/constants.js';

export const SaveManager = {
  toJSON(game) {
    return {
      version: C.SAVE_VERSION,
      savedAt: Date.now(),
      mode: game.mode,
      eraId: game.eraId,
      clock: game.clock,
      world: game.world.serialize(),
      player: game.player.serialize(),
      inventory: game.inventory.serialize(),
      civ: game.civ.serialize(),
      mobs: game.mobs.map((m) => m.serialize()),
      crafted: [...(game.crafted || [])],
      objectives: game.objectives ? game.objectives.serialize() : [],
    };
  },

  save(game) {
    try {
      localStorage.setItem(C.SAVE_KEY, JSON.stringify(this.toJSON(game)));
      return true;
    } catch (e) {
      console.warn('Save failed', e);
      return false;
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(C.SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  hasSave() {
    try {
      return !!localStorage.getItem(C.SAVE_KEY);
    } catch (e) {
      return false;
    }
  },

  clear() {
    try { localStorage.removeItem(C.SAVE_KEY); } catch (e) { /* ignore */ }
  },

  /** Trigger a browser download of the current game state. */
  exportFile(game) {
    const data = JSON.stringify(this.toJSON(game), null, 0);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    a.href = url;
    a.download = `blockscreate-${game.eraId}-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  /** Read a save file selected by the player. Returns a Promise of the parsed save. */
  importFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(JSON.parse(reader.result));
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  },
};
