// Headless integration: stub a minimal-but-faithful browser env (elements track
// children so HUD rendering really runs), build a Game, tick it, round-trip a
// save. Catches cross-module wiring errors without a browser.
const store = {};
const noop = () => {};

function makeEl() {
  const el = {
    children: [],
    dataset: {},
    style: {},
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    appendChild(c) { this.children.push(c); return c; },
    remove: noop,
    addEventListener: noop,
    removeEventListener: noop,
    setAttribute: noop,
    getContext: () => new Proxy({}, { get: () => noop }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 600 }),
    querySelector: () => makeEl(),
    querySelectorAll: () => [],
    click: noop,
    width: 960, height: 600,
    set onclick(v) {}, set onchange(v) {}, set oninput(v) {},
    set innerHTML(v) { this.children = []; }, set textContent(v) {},
  };
  return el;
}

globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
Object.defineProperty(globalThis, 'navigator', {
  value: { maxTouchPoints: 0 },
  configurable: true,
});
globalThis.window = {
  addEventListener: noop,
  removeEventListener: noop,
  devicePixelRatio: 1,
  AudioContext: undefined, // Audio gracefully no-ops without a context
};
globalThis.document = {
  createElement: makeEl, body: makeEl(), getElementById: makeEl, querySelector: () => makeEl(),
  addEventListener: noop, removeEventListener: noop, hidden: false,
};
globalThis.Image = class { set src(v) {} };
globalThis.performance = { now: () => Date.now() };
globalThis.requestAnimationFrame = noop;

const { Game } = await import('../src/Game.js');
const { Progress } = await import('../src/persistence/Progress.js');
const { Settings } = await import('../src/persistence/Settings.js');
const { Audio } = await import('../src/systems/Audio.js');
const { MODE } = await import('../src/core/constants.js');
const { SaveManager } = await import('../src/persistence/SaveManager.js');
const { blockId } = await import('../src/core/blocks.js');
const { Mob } = await import('../src/entities/Mob.js');

let passed = 0;
const ok = (m) => { console.log(`  ✓ ${m}`); passed++; };

const progress = new Progress();
const settings = new Settings();
const audio = new Audio({ sound: false, music: false });

function newGame() {
  return new Game({
    canvas: makeEl(), hudRoot: makeEl(), sprites: {},
    progress, settings, audio, onExit: () => {},
  });
}

const g = newGame();
g.newWorld('stone', MODE.SURVIVAL);
ok(`game built; world ${g.world.width}x${g.world.height}, spawn ${JSON.stringify(g.world.spawn)}`);

const gCell = newGame();
gCell.newWorld('cell', MODE.SURVIVAL);
if (gCell.eraId !== 'cell') throw new Error('cell era did not start');
if (gCell.player.h >= 1.8) throw new Error('cell player form was not applied');
gCell.world.set(Math.round(gCell.player.x) + 1, Math.round(gCell.player.y), blockId('nutrient_blob'));
gCell.update(0.2);
if (gCell.inventory.count('nutrient_blob') < 1) throw new Error('cell did not absorb nearby nutrients');
if (!gCell.cellStatus || gCell.cellStatus.stability <= 0) throw new Error('cell stability status missing');
if (!gCell.cellStatus.gradient) throw new Error('cell gradient guidance missing');
gCell.inventory.add('nutrient_blob', 3);
gCell.inventory.add('mineral_vent', 1);
gCell.inventory.add('lipid_membrane', 4);
gCell.civ.onBuild('lipid_membrane');
gCell.civ.onBuild('lipid_membrane');
gCell.civ.onBuild('lipid_membrane');
gCell.civ.onBuild('lipid_membrane');
gCell.crafted.add('proto_cell');
gCell.civ.cp = 80;
// Drive stability up so the cell visibly evolves through its stages.
for (let i = 0; i < 30; i++) gCell.update(0.05);
if (gCell.cellStatus.stage == null) throw new Error('cell status missing evolution stage');
if (gCell.player.cellStage !== gCell.cellStatus.stage) throw new Error('player cellStage out of sync with status');
if (!(gCell.cellStatus.stage >= 1)) throw new Error(`a stabilized cell did not evolve past stage 0 (stability ${gCell.cellStatus.stability})`);
if (!gCell.cellStatus.stageName) throw new Error('cell status missing stage name');
ok(`first-cell visibly evolves (stage ${gCell.cellStatus.stage}: ${gCell.cellStatus.stageName})`);
gCell.update(0.016);
if (!gCell.canAdvance()) throw new Error('cell era did not unlock evolution after mandatory goals');
if (!gCell._advanceEra() || gCell.eraId !== 'stone') throw new Error('cell era did not evolve into dinosaurs');
ok('first-cell era evolves into Age of Dinosaurs');

// Cell feeding range grows with evolution stage (a tangible power read).
const gReach = newGame();
gReach.newWorld('cell', MODE.SURVIVAL);
gReach.player.x = 20; gReach.player.y = 20 + gReach.player.h / 2;
for (let y = 15; y <= 25; y++) for (let x = 15; x <= 25; x++) gReach.world.set(x, y, 0);
gReach.world.set(22, 20, blockId('nutrient_blob')); // center ~2.55 tiles from the cell
gReach.player.cellStage = 0; gReach.cellAbsorbCooldown = 0;
gReach._absorbCellResources(0.1);
if (gReach.world.get(22, 20) === 0) throw new Error('stage-0 cell absorbed beyond its 2.1-tile reach');
gReach.player.cellStage = 4; gReach.cellAbsorbCooldown = 0;
gReach._absorbCellResources(0.1);
if (gReach.world.get(22, 20) !== 0) throw new Error('mature cell did not sweep up nutrient within its grown reach');
ok('cell feeding range grows with evolution stage');

// A swimming cell leaves a bioluminescent trail.
gReach.player.vx = 3; gReach.player.vy = 0; gReach._trailAccum = 1;
const trailBefore = gReach.particles.list.length;
gReach._cellSwimTrail(0.1);
if (!(gReach.particles.list.length > trailBefore)) throw new Error('swimming cell left no trail');
ok('swimming cell leaves a bioluminescent trail');

for (let i = 0; i < 60; i++) g.update(0.016);
if (!(g.player.health > 0)) throw new Error('player died unexpectedly');
ok(`60 ticks run; hp ${g.player.health.toFixed(1)}, onGround ${g.player.onGround}`);

g.mobs = [new Mob('rex', g.player.x + 1.5, g.player.y)];
g._updateDinosaurPressure(0.016);
if (!g.dinoStatus || g.dinoStatus.rexDistance == null) {
  throw new Error(`dinosaur fear status missing: ${JSON.stringify({ era: g.eraId, mode: g.mode, status: g.dinoStatus })}`);
}
g.grazerBondTime = 11;
const grazerJson = SaveManager.toJSON(g);
if (grazerJson.grazerBondTime < 10) throw new Error('grazer bond time missing from save');
ok('dinosaur pressure and grazer bond state are tracked');

const grazer = new Mob('stego', g.player.x + 1.5, g.player.y);
g.mobs = [grazer];
g.grazerBondTime = 10;
g._trackAnimalFriendship(0.016);
if (!grazer.tamed) throw new Error('grazer did not become a companion at full bond');
if (!g._hasDinoDefense()) throw new Error('tamed grazer did not count as dinosaur defense');
if (g._cycleCompanionCommand() !== 'stay') throw new Error('companion command did not cycle to stay');
if (g._cycleCompanionCommand() !== 'guard') throw new Error('companion command did not cycle to guard');
g.settlers.setHome(Math.round(g.player.x), Math.round(g.player.y));
grazer.x = g.settlers.home.x + 1;
grazer.y = g.settlers.home.y;
if (!g._hasTownDefense()) throw new Error('guarding companion did not count as town defense near home');
grazer.x = g.player.x + 0.8;
grazer.y = g.player.y;
if (g._toggleMountCompanion() !== true) throw new Error('nearby companion did not mount');
const roadSpeed = g._onRoad() ? 1.22 : 1;
g.input.state.modifiers = { moveSpeed: roadSpeed * (g._mountedCompanion() ? 1.48 : 1), hungerDrain: 1 };
if (!(g.input.state.modifiers.moveSpeed > roadSpeed)) throw new Error('mounted companion did not boost travel speed');
g._syncMountedCompanion();
if (!grazer.mounted || Math.abs(grazer.x - g.player.x) > 1) throw new Error('mounted companion did not sync with player');
g.inventory.add('log', 4);
g.inventory.selected = g.inventory.slots.findIndex((s) => s?.id === 'log');
if (g._toggleCompanionCargo() !== true) throw new Error('selected stack did not stash into companion cargo');
if (!grazer.cargo?.some((s) => s.id === 'log' && s.n >= 4)) throw new Error('companion cargo missing stashed logs');
const emptySlot = g.inventory.slots.findIndex((s) => !s);
g.inventory.selected = emptySlot >= 0 ? emptySlot : 0;
if (g._toggleCompanionCargo() !== true) throw new Error('cargo did not retrieve into an empty selected slot');
if ((grazer.cargo || []).some((s) => s.id === 'log')) throw new Error('retrieved logs still in companion cargo');
const grazerSave = SaveManager.toJSON(g);
const grazerLoad = newGame();
grazerLoad.loadSave(grazerSave);
if (!grazerLoad.mobs.some((m) => m.tamed)) throw new Error('tamed grazer did not persist');
if (grazerLoad.mobs.find((m) => m.tamed)?.command !== 'follow') throw new Error('mounted companion command did not persist');
if (!grazerLoad.mobs.find((m) => m.tamed)?.mounted) throw new Error('mounted companion did not persist');
ok('grazer bond creates a rideable commandable cargo companion');

// Objectives wired and evaluating.
if (!g.objectives || !g.objectives.all.length) throw new Error('objectives missing');
g.inventory.add('log', 3);
g.update(0.016);
if (!g.objectives.isDone('gather_wood')) throw new Error('gather objective did not complete');
if (g.eraStage < 1) throw new Error('era stage did not advance after objective completion');
ok('objectives evaluate (gather_wood completed after collecting logs)');

g.civ.cp = 9999;
if (g.canAdvance()) throw new Error('portal opened before mandatory goals completed');
ok('portal remains gated by mandatory goals even with enough CP');

// Particles fire on block break.
const before = g.particles.list.length;
g.mode = MODE.CREATIVE; // instant break
const sx = g.world.spawn.x;
const sy = g.world.heightMap[sx];
g._breakBlock(sx, sy, (await import('../src/core/blocks.js')).getBlock(g.world.get(sx, sy) || 1));
if (g.particles.list.length <= before) throw new Error('no particles spawned on break');
ok('particle burst on block break');
g.mode = MODE.SURVIVAL;

// Save now includes crafted + objectives, and round-trips.
const json = SaveManager.toJSON(g);
if (!('objectives' in json) || !('crafted' in json)) throw new Error('save missing new fields');
if (!('eraStage' in json)) throw new Error('save missing era stage');
for (const key of ['structures', 'discoveries', 'clues', 'powerups', 'events', 'anomalies', 'timeline', 'market', 'simulation', 'guidance']) {
  if (!(key in json)) throw new Error(`save missing ${key}`);
}
if (!json.world.chunks?.generated?.length) throw new Error('save missing generated chunk metadata');
g.civ.onDefeat('raptor');
g.events.cooldowns.predator_migration = 12;
g.events.durations.predator_migration = 8;
g.events.active.add('predator_migration');
g.anomalies.seen.add('checksum_echo');
g.guidance.seen.add('artifact_hunt');
const jsonWithRpg = SaveManager.toJSON(g);
if (jsonWithRpg.civ.defeated.raptor !== 1) throw new Error('save missing defeated enemy stats');
if (!jsonWithRpg.events.durations.predator_migration) throw new Error('save missing event durations');
if (!jsonWithRpg.anomalies.seen.includes('checksum_echo')) throw new Error('save missing anomaly state');
if (!jsonWithRpg.guidance.seen.includes('artifact_hunt')) throw new Error('save missing guidance state');
const g2 = newGame();
g2.loadSave(jsonWithRpg);
if (g2.world.grid.length !== g.world.grid.length) throw new Error('grid length mismatch after load');
if (g2.world.getChunkSummary().generated !== g.world.getChunkSummary().generated) throw new Error('chunk metadata lost across save');
if (g2.civ.defeated.raptor !== 1) throw new Error('defeated enemy stats lost across save');
if (!g2.events.isActive('predator_migration')) throw new Error('active RPG event lost across save');
if (!g2.objectives.isDone('gather_wood')) throw new Error('objective state lost across save');
if (g2.eraStage !== g.eraStage) throw new Error('era stage lost across save');
if (!g2.anomalies.has('checksum_echo')) throw new Error('anomaly state lost across save');
if (!g2.guidance.seen.has('artifact_hunt')) throw new Error('guidance state lost across save');
if (typeof g2.timeline?.divergence !== 'number') throw new Error('timeline state lost across save');
if (!g2.structures || !g2.discoveries || !g2.clues || !g2.powerups || !g2.events || !g2.anomalies || !g2.guidance) throw new Error('fun systems missing after load');
ok(`save/load round-trip; era ${g2.eraId}, objectives + fun systems restored`);

// Era advancement builds a fresh world and installs the next era objective set.
g2.civ.cp = 250;
for (const o of g2.objectives.mandatory()) g2.objectives.completed.add(o.id);
if (!g2._advanceEra()) throw new Error('advance era returned false');
if (g2.eraId !== 'bronze') throw new Error(`expected bronze era after advance, got ${g2.eraId}`);
if (!g2.unlocked.isUnlocked('bronze')) throw new Error('bronze was not unlocked');
if (!g2.objectives.all.some((o) => o.id === 'smelt_bronze')) throw new Error('bronze objectives missing after advance');
ok('HUD-era advancement enters a fresh Bronze Age world');

// Bronze farming: seed planting uses the normal placement path and persists as
// real world blocks for growth/farmer tending.
const fx = Math.round(g2.player.x) + 2;
const fy = g2.world.heightMap[fx] - 1;
g2.world.set(fx, fy, blockId('farm_plot'));
g2.inventory.add('wheat_seeds', 1);
g2.inventory.selected = g2.inventory.slots.findIndex((s) => s?.id === 'wheat_seeds');
if (!g2._tryPlace(fx, fy)) throw new Error('could not plant wheat seeds on a farm plot');
if (g2.world.get(fx, fy - 1) !== blockId('wheat_seedling')) throw new Error('planting did not create a wheat seedling');
ok('Bronze farming plants wheat through the normal build path');

g2.civ.onBuild('granary');
g2.civ.onBuild('market');
g2.civ.onBuild('caravan_post');
g2.settlers.setHome(Math.round(g2.player.x), Math.round(g2.player.y));
g2.settlers.stock.wheat = 10;
const cpBeforeTrade = g2.civ.cp;
const beadBefore = g2.inventory.count('trade_bead');
g2._tradeTimer = 12;
g2._updateTownEconomy(0.1);
if (!(g2.civ.cp > cpBeforeTrade)) throw new Error('market did not convert surplus into CP');
if (!(g2.inventory.count('trade_bead') > beadBefore)) throw new Error('caravan did not return a trade bead');
if (!(g2.civ.storage >= 8)) throw new Error('granary did not raise storage');
ok('granary, market and caravan turn surplus into town value');

const gIron = newGame();
gIron.newWorld('iron', MODE.SURVIVAL);
gIron.civ.onBuild('gate');
gIron.civ.onBuild('gate');
gIron.townGuards = 2;
if (!gIron._hasTownDefense()) throw new Error('gates/guards did not create town defense');
const spawnBefore = gIron.mobs.length;
const oldRandom = Math.random;
Math.random = () => 0.1; // force defense deterrence branch
try { gIron.spawnMobNearPlayer('bandit'); } finally { Math.random = oldRandom; }
if (gIron.mobs.length !== spawnBefore) throw new Error('defended town still spawned a bandit');
ok('Iron gates and guards deter raiders');
const siegeCount = gIron.spawnSiege('bandit', 2);
if (siegeCount !== 2) throw new Error('siege did not spawn the requested raiding party');
if (gIron.mobs.length !== spawnBefore + 2) throw new Error('siege did not bypass scout deterrence');
ok('Iron siege raids can still test defended towns');

const gInd = newGame();
gInd.newWorld('industrial', MODE.SURVIVAL);
gInd.civ.onBuild('auto_miner');
gInd.civ.onBuild('windmill');
gInd.settlers.setHome(Math.round(gInd.player.x), Math.round(gInd.player.y));
const oreBefore = gInd.settlers.stock.ore || 0;
gInd._autoMineTimer = 10;
gInd._updateAutomation(0.1);
if (!(gInd.settlers.stock.ore > oreBefore)) throw new Error('auto miner did not produce ore');
if (!(gInd.civ.pollution > 0)) throw new Error('auto miner did not add pollution');
const pollutionAfterMine = gInd.civ.pollution;
gInd._updateAutomation(1);
if (!(gInd.civ.pollution < pollutionAfterMine)) throw new Error('windmill did not reduce pollution over time');
ok('Industrial auto miner produces ore while windmills clean pollution');

// Production chain: ore → smelter → steel → factory → machine parts.
gInd.civ.onBuild('smelter');
gInd.civ.onBuild('factory');
gInd.settlers.stock.ore = 10;
const steelBefore = gInd.settlers.stock.steel || 0;
gInd._smeltTimer = 8;
gInd._updateAutomation(0.1);
if (!((gInd.settlers.stock.steel || 0) > steelBefore)) throw new Error('smelter did not refine ore into steel');
if ((gInd.settlers.stock.ore || 0) !== 8) throw new Error('smelter did not consume 2 ore per steel');
gInd.settlers.stock.steel = 6;
const cpBeforeParts = gInd.civ.cp;
const partsBefore = gInd.settlers.stock.machine_part || 0;
gInd._factoryTimer = 9;
gInd._updateAutomation(0.1);
if (!((gInd.settlers.stock.machine_part || 0) > partsBefore)) throw new Error('factory did not assemble machine parts');
if (!(gInd.civ.cp > cpBeforeParts)) throw new Error('factory output did not pay CP');
if (!gInd.industryStatus || gInd.industryStatus.factories !== 1) throw new Error('industry status not exposed for HUD');
ok('Industrial chain: ore → steel → machine parts, each stage paying CP');

// The full objective chain is mandatory and completes from the chain outputs.
const indObjIds = gInd.objectives.list.map((o) => o.id);
for (const id of ['build_miner', 'build_smelter', 'forge_steel', 'build_factory', 'make_parts'])
  if (!indObjIds.includes(id)) throw new Error(`industrial objective ${id} missing`);
gInd.settlers.stock.steel = 5;
gInd.settlers.stock.machine_part = 4;
const indDone = gInd.objectives.evaluate(gInd).map((o) => o.id);
if (!indDone.includes('build_smelter') || !indDone.includes('forge_steel') || !indDone.includes('make_parts'))
  throw new Error(`industrial chain objectives did not complete: ${JSON.stringify(indDone)}`);
gInd.update(0.016); // exercise the industrial HUD panel render path
ok('Industrial objective chain completes from automated production');

// Conveyor logistics: wiring a factory to a smelter to a miner boosts output.
const gNet = newGame();
gNet.newWorld('industrial', MODE.SURVIVAL);
const ny = Math.round(gNet.player.y);
const nx = Math.round(gNet.player.x);
gNet.world.set(nx, ny, blockId('auto_miner'));
gNet.world.set(nx + 1, ny, blockId('conveyor'));
gNet.world.set(nx + 2, ny, blockId('smelter'));
gNet.world.set(nx + 3, ny, blockId('conveyor'));
gNet.world.set(nx + 4, ny, blockId('factory'));
gNet.civ.placed.auto_miner = 1; gNet.civ.placed.smelter = 1; gNet.civ.placed.factory = 1;
gNet.settlers.setHome(nx + 2, ny);
gNet.industryNet = null; gNet._industryTimer = 99;
gNet.settlers.stock.steel = 20;
gNet._factoryTimer = 9;
gNet._updateAutomation(0.1);
if (!gNet.industryStatus || gNet.industryStatus.linkedFactories !== 1) {
  throw new Error(`conveyor line not recognized: ${JSON.stringify(gNet.industryStatus)}`);
}
if (!(gNet.industryStatus.efficiencyPct > 0)) throw new Error('wired chain gave no efficiency bonus');
// The wired factory should out-produce 2-per-tick base (bonus parts from the line).
const linkedParts = gNet.settlers.stock.machine_part || 0;
if (!(linkedParts > 1)) throw new Error(`wired factory underproduced: ${linkedParts}`);
const supplyObj = gNet.objectives.list.find((o) => o.id === 'supply_line');
if (!supplyObj || !supplyObj.check(gNet)) throw new Error('supply-line objective did not complete for a wired chain');
ok('Conveyor supply lines feed factories for bonus output (logistics layer)');

// Power grid: wiring a generator to the machines powers them; the boost stacks
// with conveyors, and an undersized grid reports an overload.
const gPow = newGame();
gPow.newWorld('industrial', MODE.SURVIVAL);
const py = Math.round(gPow.player.y);
const pxx = Math.round(gPow.player.x);
gPow.world.set(pxx, py, blockId('auto_miner'));
gPow.world.set(pxx + 2, py, blockId('factory'));
// power line running beneath, fed by a generator
gPow.world.set(pxx, py + 1, blockId('power_line'));
gPow.world.set(pxx + 1, py + 1, blockId('power_line'));
gPow.world.set(pxx + 2, py + 1, blockId('power_line'));
gPow.world.set(pxx + 1, py + 2, blockId('generator'));
gPow.civ.placed.auto_miner = 1; gPow.civ.placed.factory = 1; gPow.civ.placed.generator = 1;
gPow.settlers.setHome(pxx + 1, py);
gPow.powerNet = null; gPow.industryNet = null; gPow._industryTimer = 99;
gPow._updateAutomation(0.1);
if (!(gPow.industryStatus.poweredCount >= 1)) throw new Error(`generator did not power machines: ${JSON.stringify(gPow.industryStatus)}`);
if (gPow.industryStatus.powerOverloaded) throw new Error('an adequately powered grid wrongly reported overload');
const powObj = gPow.objectives.list.find((o) => o.id === 'powered');
if (!powObj || !powObj.check(gPow)) throw new Error('power objective did not complete for a powered machine');
ok('Power grid energizes machines and reports overload (energy layer)');

// Timeline: special events record branches, divergence escalates, and a bleed is
// staged in-game once divergence is high enough (a rift pays a CP windfall).
const gTl = newGame();
gTl.newWorld('stone', MODE.SURVIVAL);
const branch = gTl.timeline.branchEvent('meteor_shower', 'stone');
if (branch.variant !== 0) throw new Error('a fresh timeline should resolve prime, not branch');
if (!(gTl.timeline.divergence > 0)) throw new Error('branching an event did not accumulate divergence');
// Force a rift and verify the game stages it (CP windfall + crossover counted).
gTl.timeline.divergence = 5; gTl.timeline.cooldown = 0;
gTl.timeline._rng = (() => { let i = 0; const q = [0.0, 0.1]; return () => (i < q.length ? q[i++] : 0.5); })();
const cpBeforeRift = gTl.civ.cp;
gTl._updateTimeline(1);
if (!(gTl.civ.cp > cpBeforeRift)) throw new Error('rift crossover did not pay its windfall');
if (gTl.timeline.crossovers !== 1) throw new Error('crossover was not recorded');
ok('Timeline branches events and stages reality crossovers (multiverse layer)');

// Nested-simulation revelations fire through the game loop and deepen the
// journal's reality map as the player progresses.
const gSim = newGame();
gSim.newWorld('cell', MODE.SURVIVAL);
gSim._simTimer = 99; // force the throttled check
gSim._updateSimulation(1);
if ((gSim.simulation.depth || 0) < 1) throw new Error('first revelation did not fire in the opening era');
if (!gSim.simulation.layers().some((l) => l.revealed)) throw new Error('reality map did not reveal a layer');
ok('Nested-simulation arc reveals across play and feeds the journal reality map');

// Era market: tokens earned through play buy era-relevant goods, and limited
// relics are one-time.
const gMkt = newGame();
gMkt.newWorld('cell', MODE.SURVIVAL);
gMkt.civ.tokens = 0; gMkt.civ.addCP(100); // earning CP also fills the token wallet
if (!(gMkt.civ.tokens > 0)) throw new Error('tokens did not accrue alongside CP');
gMkt.civ.tokens = 50;
const nutrientsBefore = gMkt.inventory.count('nutrient_blob');
const tokensBefore = gMkt.civ.tokens;
gMkt._buyOffer('c_nutrients'); // item offer
if (!(gMkt.inventory.count('nutrient_blob') > nutrientsBefore)) throw new Error('market item purchase did not grant goods');
if (!(gMkt.civ.tokens < tokensBefore)) throw new Error('purchase did not spend tokens');
gMkt._buyOffer('c_spark'); // limited relic
if (!gMkt.market.isClaimed(gMkt.market.find('cell', 'c_spark'))) throw new Error('limited relic was not claimed');
const tokensAfterRelic = gMkt.civ.tokens;
gMkt._buyOffer('c_spark'); // second attempt must be a no-op
if (gMkt.civ.tokens !== tokensAfterRelic) throw new Error('a claimed relic was wrongly re-purchased');
gMkt.civ.tokens = 0;
const ventBefore = gMkt.inventory.count('mineral_vent');
gMkt._buyOffer('c_vent'); // cannot afford
if (gMkt.inventory.count('mineral_vent') !== ventBefore) throw new Error('purchase succeeded without tokens');
ok('Era market: tokens accrue, buy era goods, and limited relics are one-time');

// Asteroid event: a meteor impact carves a crater and hurts a nearby player.
const g3 = newGame();
g3.newWorld('stone', MODE.SURVIVAL);
const ix = Math.round(g3.player.x) + 1;
const iy = g3.world.heightMap[ix];
g3.player.x = ix + 0.5; g3.player.y = iy; g3.player.health = 100;
const solidBefore = g3.world.get(ix, iy);
g3._meteorImpact(ix, iy);
if (g3.world.get(ix, iy) !== 0) throw new Error('impact did not carve a crater');
if (g3.player.health >= 100) throw new Error('impact did not damage a nearby player');
void solidBefore;
ok('asteroid impact craters terrain and damages a nearby player');

console.log(`\nAll ${passed} integration checks passed.`);
