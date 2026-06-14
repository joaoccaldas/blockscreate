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
      structures: game.structures ? game.structures.serialize() : [],
      discoveries: game.discoveries ? game.discoveries.serialize() : [],
      clues: game.clues ? game.clues.serialize() : [],
      powerups: game.powerups ? game.powerups.serialize() : [],
      events: game.events ? game.events.serialize() : {},
      anomalies: game.anomalies ? game.anomalies.serialize() : {},
      timeline: game.timeline ? game.timeline.serialize() : {},
      market: game.market ? game.market.serialize() : {},
      simulation: game.simulation ? game.simulation.serialize() : {},
      achievements: game.achievements ? game.achievements.serialize() : {},
      guidance: game.guidance ? game.guidance.serialize() : {},
      settlers: game.settlers ? game.settlers.serialize() : null,
      animalPeaceTime: game.animalPeaceTime || 0,
      grazerBondTime: game.grazerBondTime || 0,
      eraStage: game.eraStage || 0,
      realityPath: game.realityPath || [],
      prelife: game.prelife || { active: false, nutrients: 0, minerals: 0 },
      thread: game.thread || 'salvador',
      runId: game.runId,
    };
  },

  save(game) {
    try {
      if (!game.runId) {
        game.runId = (game.thread || 'salvador') + '-' + Date.now();
      }
      const data = JSON.stringify(this.toJSON(game));
      
      // Write to the specific slot
      localStorage.setItem('blockscreate.save.' + game.runId, data);
      
      // Also write to the default/legacy pointer for "Continue"
      localStorage.setItem(C.SAVE_KEY, data);
      
      return true;
    } catch (e) {
      console.warn('Save failed', e);
      return false;
    }
  },

  load(runId = null) {
    try {
      let raw = null;
      if (runId) {
        raw = localStorage.getItem('blockscreate.save.' + runId);
      } else {
        // Fallback to legacy/latest key
        raw = localStorage.getItem(C.SAVE_KEY);
      }
      if (!raw) return null;
      return this.migrate(JSON.parse(raw));
    } catch (e) {
      console.warn('Save load failed; ignoring corrupt save.', e);
      return null;
    }
  },

  listSaves() {
    const saves = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('blockscreate.save.') && key !== C.SAVE_KEY) {
        try {
          const raw = localStorage.getItem(key);
          const parsed = JSON.parse(raw);
          if (parsed && parsed.world) {
            saves.push({
              runId: parsed.runId || key.replace('blockscreate.save.', ''),
              thread: parsed.thread || 'salvador',
              savedAt: parsed.savedAt || 0,
              eraId: parsed.eraId || 'cell',
              mode: parsed.mode || 'survival',
            });
          }
        } catch (e) {}
      }
    }
    // Return sorted by newest first
    return saves.sort((a, b) => b.savedAt - a.savedAt);
  },

  deleteSave(runId) {
    try {
      localStorage.removeItem('blockscreate.save.' + runId);
      // If we deleted the active default save, clear it too so Continue is disabled
      const def = localStorage.getItem(C.SAVE_KEY);
      if (def) {
        const p = JSON.parse(def);
        if (p.runId === runId) localStorage.removeItem(C.SAVE_KEY);
      }
    } catch (e) {}
  },

  /**
   * Bring an older/foreign save up to the current schema. Returns null if the
   * save is too broken or from a newer version we can't understand, so the
   * caller falls back to the main menu instead of crashing.
   */
  migrate(save) {
    if (!save || typeof save !== 'object' || !save.world) return null;
    const v = save.version || 1;
    if (v > C.SAVE_VERSION) {
      console.warn(`Save is from a newer version (v${v}); refusing to load.`);
      return null;
    }
    // Defaults for fields added after a save was written, so old saves load.
    save.mode = save.mode || 'survival';
    save.eraId = save.eraId || 'cell';
    save.clock = typeof save.clock === 'number' ? save.clock : 0;
    save.crafted = save.crafted || [];
    save.civ = save.civ || {};
    save.civ.builtCells = save.civ.builtCells || [];
    save.objectives = save.objectives || [];
    save.mobs = save.mobs || [];
    save.structures = save.structures || [];
    save.discoveries = save.discoveries || [];
    save.clues = save.clues || [];
    save.powerups = save.powerups || [];
    save.events = save.events || {};
    save.anomalies = save.anomalies || {};
    save.timeline = save.timeline || {};
    save.market = save.market || {};
    save.simulation = save.simulation || {};
    save.achievements = save.achievements || {};
    save.guidance = save.guidance || {};
    save.grazerBondTime = save.grazerBondTime || 0;
    save.eraStage = save.eraStage || 0;
    save.realityPath = save.realityPath || [];
    save.prelife = save.prelife || { active: false, nutrients: 0, minerals: 0 };
    save.thread = save.thread || 'salvador';
    save.runId = save.runId || null;
    save.version = C.SAVE_VERSION;
    return save;
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
