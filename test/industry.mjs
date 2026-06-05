/**
 * Industry logistics: conveyors wire machines into a real supply line
 *   auto miner ─belt─ smelter ─belt─ factory
 * and the network analyzer reports who is fed + an efficiency multiplier.
 */
import assert from 'node:assert';
import { World } from '../src/world/World.js';
import { IndustryNetwork } from '../src/systems/IndustryNetwork.js';
import { blockId } from '../src/core/blocks.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

const net = new IndustryNetwork();
const ID = {
  miner: blockId('auto_miner'),
  smelter: blockId('smelter'),
  factory: blockId('factory'),
  conveyor: blockId('conveyor'),
};

function world() {
  const w = new World({ seed: 3, eraId: 'industrial', width: 48, height: 32 });
  w.generate();
  return w;
}

// A straight belt line connecting all three machines.
const wLine = world();
const Y = 10;
wLine.set(10, Y, ID.miner);
wLine.set(11, Y, ID.conveyor);
wLine.set(12, Y, ID.smelter);
wLine.set(13, Y, ID.conveyor);
wLine.set(14, Y, ID.factory);
const r = net.evaluate(wLine, 12, Y);
assert.strictEqual(r.miners, 1, 'counts the miner');
assert.strictEqual(r.smelters, 1, 'counts the smelter');
assert.strictEqual(r.factories, 1, 'counts the factory');
assert.strictEqual(r.linkedSmelters, 1, 'smelter is fed by the miner via belt');
assert.strictEqual(r.linkedFactories, 1, 'factory is fed by the smelter via belt');
assert.ok(r.efficiency > 1.5, `a fully wired line is highly efficient (got ${r.efficiency})`);
ok('a conveyor line wires miner → smelter → factory into a fed chain');

// Remove the belts: nothing is connected anymore.
wLine.set(11, Y, 0);
wLine.set(13, Y, 0);
const r2 = net.evaluate(wLine, 12, Y);
assert.strictEqual(r2.linkedFactories, 0, 'no belts → factory is not fed');
assert.strictEqual(r2.linkedSmelters, 0, 'no belts → smelter is not fed');
assert.strictEqual(r2.efficiency, 1, 'disconnected machines run at base efficiency');
ok('pulling the belts breaks the supply line (re-evaluated from the world)');

// A factory wired only to an UNfed smelter (no miner upstream) is not fed:
// the chain must reach back to a miner end-to-end.
const wPartial = world();
wPartial.set(20, Y, ID.smelter);   // smelter with no miner belt
wPartial.set(21, Y, ID.conveyor);
wPartial.set(22, Y, ID.factory);
const r3 = net.evaluate(wPartial, 21, Y);
assert.strictEqual(r3.linkedSmelters, 0, 'a smelter with no miner is not fed');
assert.strictEqual(r3.linkedFactories, 0, 'a factory behind an unfed smelter is not fed');
ok('factories require an end-to-end line back to a miner');

console.log(`\nAll ${passed} industry-network checks passed.`);
