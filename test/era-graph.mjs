/**
 * Era graph guard — enforces the invariants in docs/ERA_GRAPH.md so the
 * branching roadmap and the code can never silently drift apart.
 */
import assert from 'node:assert';
import { ERA_NODES, ERA_ROUTES, chooseNextEra, primeNextId, routeBranchIds } from '../src/core/eraGraph.js';
import { ERAS, ERA_BY_ID, nextEra } from '../src/core/eras.js';
import { CLUES } from '../src/systems/HistoricalClues.js';

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

const impl = (id) => !!ERA_NODES[id]?.implemented;
const implementedIds = Object.keys(ERA_NODES).filter(impl);

// Inv 3: no route targets an unknown era, and every route source is a node.
for (const [from, routes] of Object.entries(ERA_ROUTES)) {
  assert.ok(ERA_NODES[from], `route source ${from} is a known node`);
  for (const r of routes) assert.ok(ERA_NODES[r.to], `route ${from}->${r.to} targets a known node`);
}
ok('every route connects known era nodes');

// Inv 1: every implemented era is reachable from cell via implemented routes.
const seen = new Set(['cell']);
const queue = ['cell'];
while (queue.length) {
  const cur = queue.shift();
  for (const r of ERA_ROUTES[cur] || []) {
    if (impl(r.to) && !seen.has(r.to)) { seen.add(r.to); queue.push(r.to); }
  }
}
for (const id of implementedIds) assert.ok(seen.has(id), `${id} is reachable from cell`);
ok('every implemented era is reachable from the origin');

// Inv 2: each non-terminal implemented era has exactly one implemented prime edge.
for (const id of implementedIds) {
  const primes = (ERA_ROUTES[id] || []).filter((r) => r.prime && impl(r.to));
  assert.ok(primes.length <= 1, `${id} has at most one implemented prime edge`);
  // It's terminal only if it has no implemented out-edge at all.
  const outs = (ERA_ROUTES[id] || []).filter((r) => impl(r.to));
  if (outs.length > 0) assert.strictEqual(primes.length, 1, `${id} has a prime spine edge`);
}
ok('the prime spine is unambiguous (one prime edge per non-terminal era)');

// Inv 5: prime edges go strictly deeper by tier.
for (const id of implementedIds) {
  const p = primeNextId(id);
  if (p) assert.ok(ERA_NODES[p].tier > ERA_NODES[id].tier, `${id}->${p} prime edge goes deeper`);
}
ok('prime edges always advance to a deeper tier');

// Inv 4: every branch route names a branch documented in docs/ERA_GRAPH.md.
// Branches originate across clues, structures and discoveries; the canonical set
// lives in the roadmap table, mirrored here. 'photic' ships with the Age of Flora.
const DOCUMENTED_BRANCHES = new Set([
  'saurian_echo', 'firekeepers', 'accurate_line', 'merchant_city',
  'road_empire', 'fortress_city', 'city_state', 'observer', 'photic',
]);
// Sanity: the clue-sourced branches are a subset of the documented set.
for (const c of Object.values(CLUES)) assert.ok(DOCUMENTED_BRANCHES.has(c.branch), `clue branch '${c.branch}' is documented`);
for (const b of routeBranchIds()) {
  assert.ok(DOCUMENTED_BRANCHES.has(b), `branch route '${b}' is a documented reality branch`);
}
ok('branch routes reference documented reality branches');

// The implemented graph must match the era registry's prime spine exactly.
for (const e of ERAS) {
  const nxt = nextEra(e.id);
  const p = primeNextId(e.id);
  assert.strictEqual(nxt ? nxt.id : null, p, `nextEra(${e.id}) matches the graph prime spine`);
  if (p) assert.ok(ERA_BY_ID[p], `${e.id}'s prime successor ${p} is a registered era`);
}
ok('era registry and graph agree on the prime spine');

// Routing: a matching, implemented branch wins; else prime; future branch falls back.
assert.strictEqual(chooseNextEra('cell', {}), 'stone', 'default cell route is the prime spine');
assert.strictEqual(chooseNextEra('cell', { branch: 'photic' }), 'stone',
  'an unimplemented branch (flora) falls back to the prime spine — partial graph stays playable');
assert.strictEqual(chooseNextEra('iron', { branch: 'merchant_city' }), 'republic',
  'iron merchant lean now diverges to the Trade Republic branch age');
assert.strictEqual(chooseNextEra('iron', {}), 'industrial', 'the default iron route is still the Industrial spine');
assert.strictEqual(chooseNextEra('industrial', {}), null, 'industrial is a deepest-tier terminal era');
assert.strictEqual(chooseNextEra('republic', {}), null, 'the Trade Republic is a deepest-tier terminal era');
ok('routing prefers branch, falls back to prime, and never dead-ends mid-graph');

console.log(`\nAll ${passed} era-graph checks passed.`);
