import assert from 'node:assert';
import {
  GAME_SAVE_FORMAT,
  GAME_SAVE_ENVELOPE_VERSION,
  wrapGameSave,
  unwrapGameSave,
} from '../src/persistence/SaveEnvelope.js';

const payload = {
  version: 9,
  world: { seed: 123 },
  player: { x: 1, y: 2 },
};

const wrapped = wrapGameSave(payload, {
  game: 'blockscreate',
  createdAt: '2026-09-27T00:00:00.000Z',
});

assert.strictEqual(wrapped.format, GAME_SAVE_FORMAT);
assert.strictEqual(wrapped.version, GAME_SAVE_ENVELOPE_VERSION);
assert.strictEqual(wrapped.game, 'blockscreate');
assert.strictEqual(wrapped.created_at, '2026-09-27T00:00:00.000Z');
assert.strictEqual(wrapped.metadata.save_schema_version, 9);
assert.deepStrictEqual(wrapped.payload, payload);

assert.deepStrictEqual(
  unwrapGameSave(wrapped, { expectedGame: 'blockscreate' }),
  payload,
  'current envelope should unwrap to payload',
);

assert.deepStrictEqual(
  unwrapGameSave(payload, { expectedGame: 'blockscreate' }),
  payload,
  'legacy unwrapped saves must remain compatible',
);

assert.strictEqual(
  unwrapGameSave({ ...wrapped, game: 'other-game' }, { expectedGame: 'blockscreate' }),
  null,
  'foreign game saves must fail closed',
);

assert.strictEqual(
  unwrapGameSave({ ...wrapped, version: 99 }, { expectedGame: 'blockscreate' }),
  null,
  'unknown future envelope versions must fail closed',
);

assert.strictEqual(
  unwrapGameSave({ format: GAME_SAVE_FORMAT, version: 1, game: 'blockscreate' }),
  null,
  'missing payload must fail closed',
);

console.log('Save envelope tests passed.');
