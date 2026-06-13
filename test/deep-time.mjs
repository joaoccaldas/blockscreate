import assert from 'node:assert';
import {
  getThread,
  geologyOf,
  paleoLocation,
  formatCoords,
  THREADS,
} from '../src/core/deepTime.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

// Test threads retrieval
{
  const salvador = getThread('salvador');
  assert.strictEqual(salvador.name, 'Salvador');
  assert.strictEqual(salvador.climate, 'tropical');

  const stockholm = getThread('stockholm');
  assert.strictEqual(stockholm.name, 'Stockholm');
  assert.strictEqual(stockholm.climate, 'boreal');

  const fallback = getThread('nonexistent');
  assert.strictEqual(fallback.id, 'salvador', 'default fallback is salvador');
  ok('getThread retrieves correct threads and falls back safely');
}

// Test geology Of
{
  const cell = geologyOf('cell');
  assert.strictEqual(cell.period, 'Early Archean');
  assert.strictEqual(cell.date, '~3.8 billion years ago');

  const stone = geologyOf('stone');
  assert.strictEqual(stone.period, 'Mesozoic');

  const unknown = geologyOf('nonexistent');
  assert.strictEqual(unknown.period, 'deep time');
  ok('geologyOf maps era IDs to period and date');
}

// Test paleo locations
{
  const salvadorCell = paleoLocation('salvador', 'cell');
  assert.strictEqual(salvadorCell, null, 'cell era has no reconstruction coordinates');

  const salvadorStone = paleoLocation('salvador', 'stone');
  assert.deepStrictEqual(salvadorStone, { lat: -23.9, lon: -11.0 });

  const stockholmStone = paleoLocation('stockholm', 'stone');
  assert.deepStrictEqual(stockholmStone, { lat: 38.3, lon: 19.3 });

  const salvadorBronze = paleoLocation('salvador', 'bronze');
  assert.deepStrictEqual(salvadorBronze, { lat: -12.97, lon: -38.51 });
  ok('paleoLocation retrieves coordinates by era and thread');
}

// Test coordinate formatting
{
  const formattedNull = formatCoords(null);
  assert.strictEqual(formattedNull, 'location beyond reconstruction');

  const formattedSalvador = formatCoords({ lat: -12.97, lon: -38.51 });
  assert.strictEqual(formattedSalvador, '13.0° S, 38.5° W');

  const formattedStockholm = formatCoords({ lat: 59.33, lon: 18.07 });
  assert.strictEqual(formattedStockholm, '59.3° N, 18.1° E');
  ok('formatCoords formats latitude and longitude strings correctly');
}

console.log(`\nAll ${passed} deep-time checks passed.`);
