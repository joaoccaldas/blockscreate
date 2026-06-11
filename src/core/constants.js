/**
 * Engine constants.
 *
 * These are tuning knobs for the whole game. Keeping them in one place makes
 * the engine easy to rebalance without hunting through gameplay code.
 */
export const C = {
  // Rendering / tiles
  TILE: 28, // base pixel size of one block at zoom 1
  CANVAS_W: 960, // default internal resolution (overridden by responsive resize)
  CANVAS_H: 600,
  ZOOM_MIN: 0.7,
  ZOOM_MAX: 1.8,
  TARGET_TILES_X: 22, // desired number of tiles visible across, for auto-fit zoom

  // World dimensions (in tiles)
  WORLD_W: 320,
  WORLD_H: 200, // deep worlds: ~150 tiles of underground below the surface
  SURFACE: 46, // average surface row (lower number = higher up)
  DEEP_START: 50, // depth below the surface where deep stone / crystal begin
  MAGMA_ZONE: 16, // bottom band (above bedrock) where magma pools form

  // Physics (in tiles, per second unless noted)
  GRAVITY: 52,
  MOVE_SPEED: 7.2,
  JUMP_VELOCITY: 15.5,
  MAX_FALL: 40,
  PLAYER_W: 0.7, // in tiles
  PLAYER_H: 1.8,

  // Interaction
  REACH: 5.2, // how far (tiles) the player can mine/place

  // Time
  DAY_LENGTH: 240, // seconds for a full day/night cycle
  TICK_HZ: 60,

  // Persistence
  SAVE_KEY: 'blockscreate.save.v1',
  SETTINGS_KEY: 'blockscreate.settings.v1',
  SAVE_VERSION: 1,
  AUTOSAVE_INTERVAL: 20, // seconds
};

export const MODE = {
  SURVIVAL: 'survival',
  CREATIVE: 'creative',
};
