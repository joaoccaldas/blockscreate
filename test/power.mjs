/**
 * Power grid: generators/windmills feed machines through power lines, and a
 * machine browns out when its grid is overloaded (load > capacity).
 */
import assert from 'node:assert';
import { World } from '../src/world/World.js';
import { PowerGrid } from '../src/systems/PowerGrid.js';
import { blockId } from '../src/core/blocks.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

const grid = new PowerGrid();
const ID = {
  line: blockId('power_line'),
  generator: blockId('generator'),
  windmill: blockId('windmill'),
  miner: blockId('auto_miner'),
  smelter: blockId('smelter'),
  factory: blockId('factory'),
};

function world() {
  const w = new World({ seed: 8, eraId: 'industrial', width: 48, height: 32 });
  w.generate();
  return w;
}

// A generator (capacity 5) on a line powering 3 machines (load 3) — all powered.
const w1 = world();
const Y = 12;
for (let x = 10; x <= 13; x++) w1.set(x, Y, ID.line);
w1.set(10, Y - 1, ID.generator);
w1.set(11, Y - 1, ID.factory);
w1.set(12, Y - 1, ID.smelter);
w1.set(13, Y - 1, ID.miner);
const r1 = grid.evaluate(w1, 12, Y);
assert.strictEqual(r1.load, 3, 'three machines draw from the grid');
assert.strictEqual(r1.capacity, 5, 'one generator supplies capacity 5');
assert.strictEqual(r1.poweredCount, 3, 'a generator easily powers three machines');
assert.ok(!r1.overloaded, 'an adequately sized grid is not overloaded');
assert.ok(r1.poweredFraction === 1, 'whole line is powered');
ok('a generator powers a wired machine line');

// Swap the generator for a single windmill (capacity 2) under load 3 → brownout.
w1.set(10, Y - 1, ID.windmill);
const r2 = grid.evaluate(w1, 12, Y);
assert.strictEqual(r2.capacity, 2, 'one windmill supplies capacity 2');
assert.strictEqual(r2.poweredCount, 0, 'an overloaded grid powers nothing');
assert.ok(r2.overloaded, 'load above capacity flags an overload');
ok('overloading the grid browns out the machines (scale your power)');

// Add a generator alongside the windmill (capacity 2+5=7 ≥ 3) → recovered.
w1.set(9, Y, ID.line);
w1.set(9, Y - 1, ID.generator);
const r3 = grid.evaluate(w1, 12, Y);
assert.ok(r3.capacity >= 7, 'windmill + generator stack capacity');
assert.strictEqual(r3.poweredCount, 3, 'adding power restores the whole line');
assert.ok(!r3.overloaded, 'a sufficiently powered grid clears the overload');
ok('adding capacity clears a brownout');

// A machine not wired to any line is simply off-grid (not counted as powered).
const w2 = world();
w2.set(20, Y, ID.factory);
const r4 = grid.evaluate(w2, 20, Y);
assert.strictEqual(r4.poweredCount, 0, 'an unwired machine is not powered');
assert.ok(!r4.overloaded, 'an unwired machine does not flag overload');
ok('machines off the grid are simply unpowered');

console.log(`\nAll ${passed} power-grid checks passed.`);
