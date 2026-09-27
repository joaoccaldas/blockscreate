export const GAME_SAVE_FORMAT = 'caldas-game-save';
export const GAME_SAVE_ENVELOPE_VERSION = 1;

/**
 * Wrap a game-specific save payload for portable export.
 *
 * The payload stays owned by the game. The envelope only identifies the
 * format, game and envelope version so imported files can fail safely.
 */
export function wrapGameSave(payload, {
  game = 'blockscreate',
  createdAt = new Date().toISOString(),
} = {}) {
  if (!payload || typeof payload !== 'object') {
    throw new TypeError('Save payload must be an object');
  }

  return {
    format: GAME_SAVE_FORMAT,
    version: GAME_SAVE_ENVELOPE_VERSION,
    game,
    created_at: createdAt,
    metadata: {
      save_schema_version: payload.version ?? null,
    },
    payload,
  };
}

/**
 * Return the game-specific payload from an exported save.
 *
 * Legacy exports did not use an envelope, so plain save objects continue to
 * work unchanged. Unknown/newer envelopes fail closed by returning null.
 */
export function unwrapGameSave(value, { expectedGame = 'blockscreate' } = {}) {
  if (!value || typeof value !== 'object') return null;

  // Backward compatibility: legacy exported saves were the payload itself.
  if (!Object.hasOwn(value, 'format')) return value;

  if (value.format !== GAME_SAVE_FORMAT) return null;
  if (value.version !== GAME_SAVE_ENVELOPE_VERSION) return null;
  if (value.game !== expectedGame) return null;
  if (!value.payload || typeof value.payload !== 'object') return null;

  return value.payload;
}
