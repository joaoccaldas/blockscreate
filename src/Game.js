/**
 * Game engine: owns the world + entities and runs the update/render loop. Wires
 * input -> simulation -> renderer -> HUD, plus audio, particles and objectives.
 * Each system is replaceable and the loop stays small.
 */
import { C, MODE } from './core/constants.js';
import { World } from './world/World.js';
import { Player } from './entities/Player.js';
import { Mob, MOB_TYPES } from './entities/Mob.js';
import { Inventory, HOTBAR_SIZE } from './systems/Inventory.js';
import { Civilization } from './systems/Civilization.js';
import { craft } from './systems/Crafting.js';
import { ObjectiveTracker } from './systems/Objectives.js';
import { DiscoveryLog } from './systems/Discoveries.js';
import { HistoricalClueLog, clueForBlock } from './systems/HistoricalClues.js';
import { StructureTracker } from './systems/Structures.js';
import { PowerupManager } from './systems/Powerups.js';
import { WorldEventLog } from './systems/WorldEvents.js';
import { SimulationAnomalyLog } from './systems/SimulationAnomalies.js';
import { Timeline, DIVERGENCE } from './systems/Timeline.js';
import { EraMarket } from './systems/EraMarket.js';
import { Simulation } from './systems/Simulation.js';
import { AchievementLog } from './systems/Achievements.js';
import { GuidanceHints } from './systems/GuidanceHints.js';
import { SettlerManager } from './systems/Settlers.js';
import { IndustryNetwork } from './systems/IndustryNetwork.js';
import { PowerGrid } from './systems/PowerGrid.js';
import { Camera } from './render/Camera.js';
import { Renderer } from './render/Renderer.js';
import { Particles } from './render/Particles.js';
import { FloatingTextLayer } from './systems/FloatingText.js';
import { Combo } from './systems/Combo.js';
import { Haptics } from './systems/Haptics.js';
import { Input, isTouch } from './input/Input.js';
import { HUD } from './ui/HUD.js';
import { MatrixTerminal } from './ui/MatrixTerminal.js';
import { SaveManager } from './persistence/SaveManager.js';
import { getBlock, dropsOf, isSolid, AIR, blockId, minTierOf, fallsOf } from './core/blocks.js';
import { getItem, isPlaceable } from './core/items.js';
import { getEra, nextEra, chooseNextEra } from './core/eras.js';
import { getEraTheme, weightedPick, pickVariant, variantInfo } from './core/eraTheme.js';
import { encodeReality, realityUrl } from './core/RealityCode.js';
import { isAlternate } from './systems/Chronicle.js';
import { getEraModifiers } from './core/eraModifiers.js';
import { shareCardData, composeShareCardCanvas, shareCardImage } from './ui/ShareCard.js';

// Buildings a raider will smash when it breaches the town (drives _pillageTown).
const TOWN_BUILDINGS = new Set(['granary', 'market', 'caravan_post', 'windmill', 'auto_miner', 'gate']);

// What the goal beacon points a new player toward in each age (block names).
const GOAL_RESOURCES = {
  stone: ['log', 'coal_ore', 'stone'],
  bronze: ['copper_ore', 'tin_ore', 'log', 'clay'],
  iron: ['iron_ore', 'coal_ore', 'log'],
  industrial: ['iron_ore', 'coal_ore'],
  republic: ['log', 'stone', 'clay'],
  _default: ['log', 'stone'],
};

// First Cell evolution stages — the cell visibly gains structure as it stabilizes.
const CELL_STAGE_NAMES = [
  'a bare protocell',
  'a nucleus',
  'energy organelles',
  'a beating flagellum',
  'a complete cell — ready to evolve!',
];

export class Game {
  constructor({ canvas, hudRoot, sprites, progress, settings, audio, onExit, onDailyComplete }) {
    this.canvas = canvas;
    this.sprites = sprites;
    this.unlocked = progress;
    this.settings = settings;
    this.audio = audio;
    this.onExit = onExit;
    this.onDailyComplete = onDailyComplete;
    this.daily = null; // set when launched as the daily challenge
    this.renderer = new Renderer(canvas);
    this.renderer.setSprites(sprites);
    this.hudRoot = hudRoot;
    this.running = false;
    this.paused = false;
    this.buildMode = false;
    this.particles = new Particles();
    this.floaters = new FloatingTextLayer();
    this.combo = new Combo();
    this.haptics = new Haptics(settings?.get?.('haptics') ?? true);
    this.crafted = new Set();
    this.mineTarget = null;
    this.mineProgress = 0;
    this.placeCooldown = 0;
    this.attackCooldown = 0;
    this.stepTimer = 0;
    this.autosaveTimer = 0;
    this.mobTimer = 0;
    this.structureScanTimer = 0;
    this.animalPeaceTime = 0;
    this.eraStage = 0;
    this.thread = 'salvador';
  }

  // ---- lifecycle ----

  newWorld(eraId, mode, { branch = null, seed = null, variant = null, thread = null } = {}) {
    this.dead = false;
    this.showIntro = true; // fresh era entry → show the era-reveal on start
    this.mode = mode;
    this.eraId = eraId;
    if (thread) this.thread = thread;
    this.eraMods = getEraModifiers(eraId);
    this.clock = C.DAY_LENGTH * 0.3;
    this.world = new World({ seed: seed != null ? (seed >>> 0) : ((Math.random() * 1e9) | 0), eraId, thread: this.thread });
    // Pick this run's reality variant — branch-flavored when routed in via a
    // branch, else seed-derived so every fresh start has its own look. An
    // explicit variant (from a shared reality code) wins, for an exact match.
    this.world.variant = variant || pickVariant(eraId, { branch, seed: this.world.seed });
    this.world.generate();
    this.player = new Player(this.world.spawn.x + 0.5, this.world.spawn.y);
    this._applyEraPlayerForm();
    this.inventory = new Inventory();
    this.civ = new Civilization(eraId);
    this.objectives = new ObjectiveTracker(eraId);
    this.structures = new StructureTracker();
    this.discoveries = new DiscoveryLog();
    this.clues = new HistoricalClueLog();
    this.powerups = new PowerupManager();
    this.events = new WorldEventLog();
    this.anomalies = new SimulationAnomalyLog();
    this.timeline = new Timeline();
    this.market = new EraMarket();
    this.simulation = new Simulation();
    this.achievements = new AchievementLog();
    this.guidance = new GuidanceHints();
    this.settlers = new SettlerManager();
    this.mobs = [];
    this.eraStage = 0;
    this.realityPath = []; // the route of branches taken through the era graph
    this.eraPortal = null;
    // The first ever survival run begins one beat before life. This is a tiny,
    // movement-only tutorial whose ingredients become the First Cell.
    this.prelife = eraId === 'cell' && mode === MODE.SURVIVAL && !this.settings?.get?.('seenPrelife')
      ? { active: true, nutrients: 0, minerals: 0 }
      : { active: false, nutrients: 0, minerals: 0 };
    if (this.prelife.active) this.player.form = 'spark';
    this._grantStarter();
    this._setup();
  }

  loadSave(save) {
    this.dead = false;
    this.mode = save.mode;
    this.eraId = save.eraId;
    this.eraMods = getEraModifiers(save.eraId);
    this.clock = save.clock ?? 0;
    this.thread = save.thread || 'salvador';
    this.world = World.deserialize(save.world);
    this.player = new Player(0, 0);
    this.player.load(save.player);
    this._applyEraPlayerForm();
    this.inventory = new Inventory();
    this.inventory.load(save.inventory);
    this.civ = new Civilization(this.eraId);
    this.civ.load(save.civ);
    this.crafted = new Set(save.crafted || []);
    this.objectives = new ObjectiveTracker(this.eraId, save.objectives || []);
    this.structures = new StructureTracker(save.structures || []);
    this.discoveries = new DiscoveryLog(save.discoveries || []);
    this.clues = new HistoricalClueLog(save.clues || []);
    this.powerups = new PowerupManager(save.powerups || []);
    this.events = new WorldEventLog(save.events || {});
    this.anomalies = new SimulationAnomalyLog(save.anomalies || {});
    this.timeline = new Timeline(save.timeline || {});
    this.market = new EraMarket(save.market || {});
    this.simulation = new Simulation(save.simulation || {});
    this.achievements = new AchievementLog(save.achievements || {});
    this.guidance = new GuidanceHints(save.guidance || {});
    this.settlers = new SettlerManager(save.settlers || null);
    this.mobs = (save.mobs || []).map((m) => Mob.load(m));
    this.animalPeaceTime = save.animalPeaceTime || 0;
    this.grazerBondTime = save.grazerBondTime || 0;
    this.eraStage = save.eraStage || 0;
    this.realityPath = save.realityPath || [];
    this.eraPortal = null;
    this.prelife = save.prelife || { active: false, nutrients: 0, minerals: 0 };
    if (this.prelife.active) this.player.form = 'spark';
    this._setup();
  }

  _grantStarter() {
    const era = getEra(this.eraId);
    for (const id of era.starter || []) this.inventory.add(id, 1);
    // New Game+ legacy head-start (only on a fresh run, never on loadSave).
    const pr = this.unlocked?.prestige ? this.unlocked.prestige() : null;
    if (pr && pr.layer) {
      this.civ.cpMult = pr.cpMult;
      if (pr.startTokens) this.civ.tokens = (this.civ.tokens || 0) + pr.startTokens;
    }
    if (this.mode === MODE.CREATIVE) {
      ['primordial_mud', 'nutrient_blob', 'mineral_vent', 'lipid_membrane',
        'grass', 'dirt', 'stone', 'cobblestone', 'sand', 'water', 'log', 'planks', 'leaves',
        'thatch', 'brick', 'torch', 'campfire', 'clay', 'gravel',
        'farm_plot', 'wheat_seeds', 'wheat_seedling', 'wheat_green', 'wheat_ripe',
        'granary', 'market', 'caravan_post', 'gate', 'road', 'auto_miner', 'windmill', 'build_site',
        'smelter', 'factory', 'conveyor', 'generator', 'power_line',
        'deep_stone', 'magma', 'crystal_ore',
        'coal_ore', 'copper_ore', 'tin_ore', 'iron_ore', 'gold_ore']
        .forEach((id) => this.inventory.add(id, 99));
      this.inventory.add('blueprint_tool', 1);
    } else if (this.eraId !== 'cell') {
      // Survival: a couple of torches to start; everything else is earned.
      this.inventory.add('torch', 4);
    }
  }

  _applyEraPlayerForm() {
    if (!this.player) return;
    if (this.eraId === 'cell') {
      this.player.w = 0.55;
      this.player.h = 0.9;
      this.player.form = 'cell';
    }
  }

  _setup() {
    this.world.clock = this.clock;
    this.camera = new Camera(this.world, this.canvas, 1);
    this.input = new Input(this.canvas, this._inputHandlers());
    this.hud = new HUD(this.hudRoot, {
      handlers: this._hudHandlers(),
      settings: this.settings,
      isTouch,
      mode: this.mode,
      eraId: this.eraId,
    });
    this.matrixTerminal = new MatrixTerminal(this.hudRoot, {
      onClose: () => { this.paused = false; },
      onWin: (x, y) => this._onMatrixWin(x, y),
    });
    this.invOpen = false;
    this.craftOpen = false;
    this.pendingRaid = null; // telegraphed siege awaiting its muster window
    this.raidStatus = null;  // HUD countdown banner state
    this.rallyBuff = 0;      // seconds of boosted guard damage after a mustered defense
    this._lastCellStage = null; // tracks First Cell evolution stage for celebrations
    this.industry = new IndustryNetwork(); // spatial logistics analyzer (read-only)
    this.industryNet = null;
    this.power = new PowerGrid(); // energy network analyzer (read-only)
    this.powerNet = null;
    this.blueprints = SaveManager.loadBlueprints(); // universal blueprint repository
    this.resize();
    this.camera.snap(this.player);
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);

    // Auto-pause when the tab is hidden or loses focus, so the player never
    // returns to a dead character or a huge time-skip; also flushes a save.
    this._onHide = (event) => {
      if ((document.hidden || event?.type === 'blur') && !this.paused && this.running) {
        this._pause();
        try { SaveManager.save(this); } catch (e) { /* best effort */ }
      }
    };
    document.addEventListener('visibilitychange', this._onHide);
    window.addEventListener('blur', this._onHide);

    this._applyReduceMotion();
  }

  _teardownView() {
    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('orientationchange', this._onResize);
      this._onResize = null;
    }
    if (this._onHide) {
      document.removeEventListener('visibilitychange', this._onHide);
      window.removeEventListener('blur', this._onHide);
      this._onHide = null;
    }
    this.input?.destroy();
    this.hud?.destroy();
  }

  /** Fit the canvas to its displayed size and derive a comfortable zoom. */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = rect.width || C.CANVAS_W;
    const cssH = rect.height || C.CANVAS_H;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    const autoFit = this.canvas.width / (C.TARGET_TILES_X * C.TILE);
    const pref = this.settings?.get('zoomPref') ?? 1;
    this.camera.zoom = Math.max(C.ZOOM_MIN, Math.min(C.ZOOM_MAX, autoFit * pref));
    this.camera.clamp();
  }

  start() {
    this.running = true;
    this.resize();
    this.camera.snap(this.player);
    // Permanent prestige (miningMult / layer) applies to every run, incl. continue.
    this.prestige = this.unlocked?.prestige ? this.unlocked.prestige() : null;
    this.layer = this.prestige?.layer || 0;
    this.audio?.setEra?.(this.eraId); // give this age its own music palette
    this.last = performance.now();
    requestAnimationFrame(this._frame);
    this._introThenOnboard();
  }

  /** On a fresh era, reveal the era first, then run any first-time coach-marks. */
  _introThenOnboard() {
    if (this.prelife?.active && this.mode === MODE.SURVIVAL) {
      this.showIntro = false;
      this.paused = true;
      this.hud.showPrologueIntro(() => { this.paused = false; }, isTouch);
      return;
    }
    if (this.showIntro && this.mode === MODE.SURVIVAL) {
      this.showIntro = false;
      this.paused = true;
      const route = (this.realityPath || []).slice(-1)[0] || null;
      const variant = variantInfo(this.eraId, this.world?.variant);
      this.hud.showEraIntro(getEra(this.eraId), () => {
        this.paused = false;
        this._maybeOnboard();
      }, route, variant);
    } else {
      this._maybeOnboard();
    }
  }

  stop() {
    this.running = false;
    this._teardownView();
  }

  // ---- handlers ----

  _inputHandlers() {
    return {
      onHotbar: (i) => { this.inventory.selected = i; this.audio?.play('ui'); },
      onScroll: (d) => {
        this.inventory.selected = (this.inventory.selected + d + HOTBAR_SIZE) % HOTBAR_SIZE;
      },
      onToggleInventory: () => this._toggleInventory(),
      onToggleCrafting: () => this._toggleCrafting(),
      onToggleMarket: () => this._toggleMarket(),
      onToggleMap: () => this._toggleCodex('codex-map'),
      onToggleCodex: () => this._toggleCodex('codex-journal'),
      onInteract: () => this._doInteract(),
      onToggleBuild: () => { this.buildMode = !this.buildMode; },
      onCompanionCommand: () => this._cycleCompanionCommand(),
      onToggleMount: () => this._toggleMountCompanion(),
      onCompanionCargo: () => this._toggleCompanionCargo(),
      onPause: () => this._onPause(),
    };
  }

  _hudHandlers() {
    return {
      onHotbar: (i) => { this.inventory.selected = i; },
      onToggleInventory: () => this._toggleInventory(),
      onToggleCrafting: () => this._toggleCrafting(),
      onToggleMarket: () => this._toggleMarket(),
      onToggleMap: () => this._toggleCodex('codex-map'),
      onToggleCodex: () => this._toggleCodex('codex-journal'),
      onBuyOffer: (id) => this._buyOffer(id),
      onCraft: (r) => this._craft(r),
      onPickSlot: (i) => {
        const s = this.inventory.slots[i];
        if (!s) return;
        const sel = this.inventory.selected;
        this.inventory.slots[i] = this.inventory.slots[sel];
        this.inventory.slots[sel] = s;
        this.hud.renderInventory(this);
      },
      onSortInventory: () => {
        this.inventory.sortBackpack();
        this.audio?.play('ui');
        this.hud.renderInventory(this);
      },
      onPause: () => this._onPause(),
      onResume: () => this._resume(),
      onSetSound: (v) => { this.audio?.setSound(v); this.settings?.set('sound', v); },
      onSetMusic: (v) => { this.audio?.setMusic(v); this.settings?.set('music', v); },
      onSetZoom: (v) => { this.settings?.set('zoomPref', v); this.resize(); },
      onSetReduceMotion: (v) => { this.settings?.set('reduceMotion', v); this._applyReduceMotion(); },
      onSetHaptics: (v) => { this.settings?.set('haptics', v); this.haptics?.setEnabled(v); if (v) this.haptics?.buzz('place'); },
      onSave: () => SaveManager.save(this),
      onShareReality: () => this._shareReality(),
      onExport: () => SaveManager.exportFile(this),
      onImport: (f) => this._import(f),
      onMainMenu: () => this.hud.confirm('Return to the main menu?', 'Your game is saved automatically.', () => this.exit()),
      onAdvanceEra: () => (this.canDescend() ? this._descend() : this._advanceEra()),
      // Death screen
      onShareRun: () => this._shareRun(),
      onShareCard: () => this._shareCardImage(),
      onRespawn: () => this._respawn(),
      onDeathLoad: () => this.hud.confirm('Load your last save?', 'This reloads the world from the autosave.', () => { const s = SaveManager.load(); if (s) { this.stop(); this.loadSave(s); this.start(); } }),
      onDeathMenu: () => this.exit(),
      // touch controls
      onMove: (dir, pressed) => { this.input.state[dir] = pressed; },
      onJump: (pressed) => { this.input.state.up = pressed; if (pressed) this.audio?.play('jump'); },
      onFly: () => { this.input.state.fly = !this.input.state.fly; },
      onToggleBuild: () => { this.buildMode = !this.buildMode; this.audio?.play('ui'); },
      onCompanionCommand: () => this._cycleCompanionCommand(),
      onToggleMount: () => this._toggleMountCompanion(),
      onCompanionCargo: () => this._toggleCompanionCargo(),
    };
  }

  async _import(file) {
    try {
      const save = SaveManager.migrate(await SaveManager.importFile(file));
      if (!save) throw new Error('Invalid or unsupported save');
      // Importing replaces the current world, so confirm before discarding it.
      this.hud.confirm('Import this world?', 'Your current world will be replaced (the autosave is kept until you save again).', () => {
        this.stop();
        this.loadSave(save);
        this.start();
        this.hud.toast('World imported');
      });
    } catch (e) {
      this.hud.toast('Import failed');
    }
  }

  _onPause() {
    if (this.dead) return; // death screen owns the input until the player acts
    if (this._anyMenuOpen()) { this._closeMenus(); this.paused = false; return; }
    this.paused ? this._resume() : this._pause();
  }

  _pause() { this.paused = true; this.hud.showPause(true); this.audio?.play('ui'); }
  _resume() { this.paused = false; this.hud.showPause(false); }

  _toggleInventory() {
    const opening = !this.invOpen;
    this._closeMenus();
    this.invOpen = opening;
    if (this.invOpen) this.hud.renderInventory(this);
    this.hud.showInventory(this.invOpen);
    this.hud.showPause(false);
    this.paused = this.invOpen;
    this.audio?.play('ui');
  }

  _toggleCrafting() {
    const opening = !this.craftOpen;
    this._closeMenus();
    this.craftOpen = opening;
    if (this.craftOpen) this.hud.renderCrafting(this);
    this.hud.showCrafting(this.craftOpen);
    this.hud.showPause(false);
    this.paused = this.craftOpen;
    this.audio?.play('ui');
  }

  _toggleCodex(tab = 'codex-journal') {
    const opening = !this.codexOpen || this.codexTab !== tab;
    this._closeMenus();
    this.codexOpen = opening;
    this.codexTab = tab;
    if (this.codexOpen) {
      this.hud.renderJournal(this);
      this.hud.renderMap(this);
    }
    this.hud.showCodex(this.codexOpen, tab);
    this.hud.showPause(false);
    this.paused = this.codexOpen; // pause behind the codex, like other menus
    this.audio?.play('ui');
  }

  _closeMenus() {
    this.invOpen = this.craftOpen = this.codexOpen = this.marketOpen = false;
    this.hud.showInventory(false);
    this.hud.showCrafting(false);
    this.hud.showCodex(false);
    this.hud.showMarket(false);
  }

  _anyMenuOpen() {
    return !!(this.invOpen || this.craftOpen || this.codexOpen || this.marketOpen);
  }

  _craft(recipe) {
    if (craft(recipe, this.inventory, this)) {
      this.civ.onCraft();
      if (recipe.id === 'cook_food') this.civ.onCook();
      this.crafted.add(recipe.out.id);
      this.audio?.play('craft'); this.haptics?.buzz('craft');
      this.hud.toast(`Crafted ${getItem(recipe.out.id)?.label || recipe.out.id}`);
      this.hud.renderCrafting(this);
    } else {
      this.hud.toast('Missing materials');
    }
  }

  _toggleMarket() {
    const opening = !this.marketOpen;
    this._closeMenus();
    this.marketOpen = opening;
    if (this.marketOpen) this.hud.renderMarket(this);
    this.hud.showMarket(this.marketOpen);
    this.hud.showPause(false);
    this.paused = this.marketOpen; // pause behind the shop, like other menus
    this.audio?.play('ui');
  }



  /** Buy an era-market offer: spend tokens, then apply its effect. */
  _buyOffer(offerId) {
    const offer = this.market.find(this.eraId, offerId);
    if (!offer) return;
    if (this.market.isClaimed(offer)) { this.hud.toast('Already owned'); return; }
    if (!this.civ.spendTokens(offer.cost)) {
      const cur = this.market.currency(this.eraId);
      this.hud.toast(`Not enough ${cur.icon} ${cur.name}`);
      this.audio?.play('error');
      return;
    }
    this._applyOffer(offer);
    this.market.claim(offer);
    this.audio?.play(offer.kind === 'badge' ? 'unlock' : 'craft');
    if (offer.kind === 'badge') {
      this.particles.fountain(this.player.x, this.player.y - 1, ['#f4d24a', '#fff0a8', '#ffd6ff'], 30);
      this.hud.bigToast(`${offer.icon} <b>${offer.name}</b><br><small>Limited relic claimed — a mark of this age.</small>`, 3200);
    } else {
      this.hud.toast(`${offer.icon} Bought ${offer.name}`);
    }
    this.hud.renderMarket(this);
  }

  /** Apply a purchased offer's effect (grant items / boosts / stock / badge). */
  _applyOffer(offer) {
    const p = offer.payload || {};
    if (offer.kind === 'item') {
      this.inventory.add(p.id, p.n || 1);
    } else if (offer.kind === 'powerup') {
      this.powerups.grant(p.id, p.seconds);
    } else if (offer.kind === 'stock') {
      if (this.settlers) {
        this.settlers.stock = this.settlers.stock || {};
        this.settlers.stock[p.key] = (this.settlers.stock[p.key] || 0) + (p.n || 0);
      }
    }
    // 'badge' is pure prestige, recorded via market.claim().
  }

  /** The shareable code for this exact world (seed + era + variant + mode). */
  realityCode() {
    return encodeReality({
      seed: this.world?.seed ?? 0,
      era: this.eraId,
      variant: this.world?.variant || null,
      mode: this.mode,
    });
  }

  /** Copy a shareable link to this reality to the clipboard, with a fallback. */
  _shareReality() {
    const code = this.realityCode();
    const url = realityUrl(code);
    const done = () => this.hud.toast(`🔗 Reality link copied · ${code}`, 3400);
    try {
      const p = navigator.clipboard?.writeText?.(url);
      if (p && p.then) p.then(done).catch(() => this.hud.toast(`🔗 Your reality: ${code}`, 5000));
      else done();
    } catch (e) {
      this.hud.toast(`🔗 Your reality: ${code}`, 5000);
    }
    this.audio?.play('ui');
  }

  /** A boastable one-liner about this run + a link to play the same reality. */
  runShareText() {
    const era = getEra(this.eraId).name;
    const ages = (this.realityPath?.length || 0) + 1;
    const bits = [`I reached the ${era}`, `${ages} age${ages > 1 ? 's' : ''}`, `${Math.floor(this.civ.cp)} CP`];
    if ((this.civ.totalMined || 0) > 0) bits.push(`${this.civ.totalMined} mined`);
    if ((this.timeline?.divergedCount?.() || 0) > 0) bits.push(`${this.timeline.divergedCount()} realities branched`);
    return `🌍 BlocksCreate — ${bits.join(' · ')}. Play my reality: ${realityUrl(this.realityCode())}`;
  }

  /** Copy the run summary (text + reality link) to the clipboard. */
  _shareRun() {
    const text = this.runShareText();
    const done = () => this.hud.toast('🔗 Run copied — paste it anywhere!', 3200);
    try {
      const p = navigator.clipboard?.writeText?.(text);
      if (p && p.then) p.then(done).catch(() => this.hud.toast('🔗 Share text ready in the console', 3000));
      else done();
    } catch (e) { this.hud.toast(`🔗 ${this.realityCode()}`, 4000); }
    this.audio?.play('ui');
  }

  /** Compose a PNG share card of this run and share/download it. */
  _shareCardImage() {
    try {
      const canvas = composeShareCardCanvas(shareCardData(this));
      if (!canvas) { this.hud.toast('🔗 Image sharing not available'); return; }
      shareCardImage(canvas, this.runShareText());
      this.hud.toast('📸 Share image ready!', 2600);
      this.audio?.play('ui');
    } catch (e) {
      this.hud.toast('🔗 Could not make an image — try Share run');
    }
  }

  hasStation(itemId) {
    return this.mode === MODE.CREATIVE || this.civ.hasBuilt(itemId) || this.inventory.count(itemId) > 0;
  }

  canAdvance() {
    return this.civ.canAdvanceWith(this.objectives);
  }

  advancementStatus() {
    const era = getEra(this.eraId);
    return {
      cp: this.civ.cp,
      needed: era.advanceCost,
      cpReady: this.civ.canAdvance(),
      mandatoryReady: this.objectives?.mandatoryDone?.() ?? true,
      masteryDone: this.objectives?.masteryDone?.() ?? 0,
      masteryTotal: this.objectives?.masteryTotal?.() ?? 0,
      ready: this.canAdvance(),
      canDescend: this.canDescend(),
      layer: this.layer || 0,
    };
  }

  exit() {
    SaveManager.save(this);
    this.stop();
    this.onExit?.();
  }

  /** Player died: freeze the sim and show the death screen with run stats. */
  _onDeath() {
    this.dead = true;
    this.paused = true;
    this.audio?.play('hurt');
    // A hunger death has no explicit cause recorded; infer it.
    const cause = this.player.hunger <= 0 ? 'starvation' : (this.lastDamageCause || 'the wilds');
    SaveManager.save(this); // preserve world progress; only the player respawns
    this.hud.showDeath({
      cause,
      stats: {
        era: getEra(this.eraId).name,
        ages: (this.realityPath?.length || 0) + 1,
        cp: Math.floor(this.civ.cp),
        population: this.civ.population,
        mined: this.civ.totalMined,
        built: this.civ.totalBuilt,
        deepest: this.civ.deepestMine,
        clues: this.clues?.count?.() || 0,
        achievements: `${this.achievements?.count?.() || 0}/${this.achievements?.total?.() || 0}`,
        branches: this.timeline?.divergedCount?.() || 0,
        daily: this.daily ? (this.daily._done ? '✓ complete' : 'in progress') : null,
      },
    });
  }

  /** Revive the player at spawn, keeping the world and civilization intact. */
  _respawn() {
    this.dead = false;
    this.paused = false;
    this.hud.showDeath(false);
    this.player.x = this.world.spawn.x + 0.5;
    this.player.y = this.world.spawn.y;
    this.player.health = 100;
    this.player.hunger = 60;
    this.player.alive = true;
    this.lastDamageCause = null;
    this.hud.toast('Revived at your spawn point', 2000);
  }

  /** Show first-run coach-marks once, then remember it in settings. */
  _maybeOnboard() {
    if (this.mode !== MODE.SURVIVAL) return;
    // Show the coach-marks once per era family: the First Cell plays very
    // differently (swim + absorb) from the build/mine eras, so each gets one.
    const key = this.eraId === 'cell' ? 'cell' : 'land';
    const seen = (this.settings?.get('seenTutorial') || '').toString().split(',');
    if (seen.includes(key)) return;
    this.paused = true; // freeze the world behind the coach-marks
    this.hud.showOnboarding(() => {
      const next = seen.filter(Boolean).concat(key).join(',');
      this.settings?.set('seenTutorial', next);
      this.paused = false;
    }, isTouch);
  }

  // ---- main loop ----

  _frame = (now) => {
    if (!this.running) return;
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05; // clamp big stalls (and tab-restore jumps)
    try {
      if (!this.paused) this.update(dt);
      this.draw(dt);
      this._crashes = 0;
    } catch (err) {
      // A single bad frame must never kill the game. Log, count, and keep
      // going; if it persists, save and surface a friendly message instead of
      // a frozen black screen.
      console.error('Frame error:', err);
      this._crashes = (this._crashes || 0) + 1;
      if (this._crashes >= 60) {
        this.running = false;
        try { SaveManager.save(this); } catch (e) { /* best effort */ }
        this.hud?.bigToast?.('⚠️ Something went wrong — your progress was saved.<br><small>Return to the menu and reload.</small>', 8000);
        return;
      }
    }
    requestAnimationFrame(this._frame);
  };

  update(dt) {
    const menus = this.invOpen || this.craftOpen;
    this.placeCooldown = Math.max(0, this.placeCooldown - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    if (!menus) {
      const wasGround = this.player.onGround;
      this.input.state.modifiers = {
        hungerDrain: this.powerups.multiplier('hungerDrain') * (this._mountedCompanion() ? 0.72 : 1),
        cellStability: this.eraId === 'cell',
        moveSpeed: (this._onRoad() ? 1.22 : 1) * (this._mountedCompanion() ? 1.48 : 1),
      };
      this.player.update(dt, this.world, this.input.state, this.mode);
      this._syncMountedCompanion();
      this._expandWorldIfNeeded();
      this._absorbCellResources(dt);
      this._cellSwimTrail(dt);
      this._updateCellStatus(dt);
      this._footsteps(dt, wasGround);
      this._handleInteraction(dt);
    }

    for (const m of this.mobs) {
      if (m.mounted) { this._syncMountedCompanion(m); continue; }
      const target = this.mode === MODE.SURVIVAL ? this._mobTargetContext(m) : null;
      const hit = m.update(dt, this.world, target);
      if (hit) {
        if (hit.breakWall) this._raiderBreakWall(m, hit.breakWall, hit.dps); // siege chews through walls
        else if (this.player.alive) {
          if (hit.sap) this._sapCell(hit.sap, m);   // phage drains stability, doesn't maul
          else if (hit.damage) this._damagePlayer(hit.damage, `a ${m.type}`);
        }
      }
    }
    this._updateDinosaurPressure(dt);
    this._spawnMobs(dt);
    this._updateSettlers(dt);
    this._updateTownEconomy(dt);
    this._updateRaidTelegraph(dt);
    this._updateRaiders(dt);
    this._updateAutomation(dt);
    this.powerups.update(dt);
    this._trackAnimalFriendship(dt);
    this._ambientWeather(dt);
    this._updateMeteors(dt);
    this._updateCrops(dt);
    this._updateFlora(dt);
    this._updateCommerce(dt);
    this.particles.update(dt);
    this.floaters.update(dt);
    this.combo.update(dt); // lets a streak time out when you stop acting

    this.clock = (this.clock + dt) % C.DAY_LENGTH;
    this.world.clock = this.clock;
    this.audio?.setDayFactor(this.dayFactor());
    this._updateWorldEvents(dt);

    this.camera.follow(this.player, dt);

    // Objectives.
    if (this.mode === MODE.SURVIVAL && !this.prelife?.active) {
      const done = this.objectives.evaluate(this);
      for (const o of done) {
        if (o.reward) this.civ.addCP(o.reward);
        this.audio?.play('objective');
        this.hud.toast(`${o.icon} Objective complete: ${o.label}${o.reward ? ` (+${o.reward} CP)` : ''}`, 2600);
      }
      if (done.length) this._checkEraStage();
    }

    this._evaluateFunSystems(dt);
    this._updateSimulationAnomalies(dt);
    this._updateTimeline(dt);
    this._updateSimulation(dt);
    this._updateAchievements(dt);
    this._updateDaily(dt);
    this._updateGoalBeacon(dt);
    this._updateEraPortal();
    this._updateGuidanceHints(dt);

    // Era advancement.
    if (this.mode === MODE.SURVIVAL && this.canAdvance()) {
      const nxt = this._nextEraChoice();
      if (nxt && this.unlocked.unlock(nxt.id)) {
        this.audio?.play('unlock');
        this.timeline?.note(0.5); // a leap between ages widens the possibility space
        this.particles.fountain(this.player.x, this.player.y - 1,
          ['#f4d24a', '#6fc04e', '#4f86ee', '#ff7b29', '#fff'], 40);
        this.hud.bigToast(`🌀 <b>${nxt.name}</b> portal unlocked!<br><small>Now playable in Creative too.</small>`);
      }
    }

    // Survival death -> death screen (player chooses to respawn / load / menu).
    if (this.mode === MODE.SURVIVAL && !this.player.alive && !this.dead) {
      this._onDeath();
    }

    // Autosave.
    this.autosaveTimer += dt;
    if (this.autosaveTimer >= C.AUTOSAVE_INTERVAL) {
      this.autosaveTimer = 0;
      SaveManager.save(this);
    }

    this.hud.update(this);
  }

  /**
   * The reality branch the player is leaning into — what routes them through the
   * era graph so two players reach different ages by different play. It blends
   * the Journal's clue tally with *playstyle* signals (trade, roads, defense),
   * since branches like merchant_city/road_empire are earned by how you build,
   * not just what you find. Returns a branch only when a lean is clearly
   * dominant, so divergence is intentional, not accidental.
   */
  _dominantBranch() {
    const w = {};
    const add = (b, n) => { if (b && b !== 'observer' && n > 0) w[b] = (w[b] || 0) + n; };
    for (const [b, n] of Object.entries(this.clues?.branchCounts?.() || {})) add(b, n);
    // The First Cell's starting biome decides its evolutionary branch: a cell
    // born in the Sunlit Shallows leans photic → the Age of Flora.
    if (this.eraId === 'cell' && this.world?.variant === 'sunlit') add('photic', 5);
    // Playstyle leans (the merchant/road/fortress identities).
    add('merchant_city', this.civ?.trade || 0);
    add('road_empire', (this.civ?.placed?.road || 0) * 0.5);
    add('fortress_city', (this.civ?.defense || 0) * 0.4 + (this.civ?.placed?.gate || 0));
    let best = null;
    let top = 0;
    for (const [b, n] of Object.entries(w)) if (n > top) { top = n; best = b; }
    // Require a real commitment before diverging off the prime spine.
    return top >= 3 ? best : null;
  }

  getBranchCompass() {
    const weights = {};
    const add = (name, val) => { if (val > 0) weights[name] = (weights[name] || 0) + val; };

    if (this.eraId === 'cell') {
      const photic = (this.world?.variant === 'sunlit' ? 5 : 0) + 
                     (this.inventory?.count('nutrient_blob') || 0) * 0.5 + 
                     (this.clues?.has('chemical_gradient') ? 2 : 0);
      const ventborn = (this.world?.variant !== 'sunlit' ? 5 : 0) + 
                       (this.inventory?.count('mineral_vent') || 0) * 1.5 + 
                       (this.clues?.has('warm_vent') ? 2 : 0);
      add('Photic', photic);
      add('Ventborn', ventborn);
    } else if (this.eraId === 'iron') {
      add('Merchant', this.civ?.trade || 0);
      add('Road', (this.civ?.placed?.road || 0) * 0.5);
      add('Fortress', (this.civ?.defense || 0) * 0.4 + (this.civ?.placed?.gate || 0));
    } else {
      const counts = this.clues?.branchCounts?.() || {};
      for (const [b, n] of Object.entries(counts)) {
        if (n > 0) {
          const name = b.split('_')[0].charAt(0).toUpperCase() + b.split('_')[0].slice(1);
          add(name, n);
        }
      }
    }

    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    const unknownWeight = Math.max(1, 10 - sum);
    weights['Unknown'] = unknownWeight;

    const total = sum + unknownWeight;
    const pcts = {};
    let runningSum = 0;
    const keys = Object.keys(weights);
    
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (i === keys.length - 1) {
        pcts[k] = 100 - runningSum;
      } else {
        const pct = Math.round((weights[k] / total) * 100);
        pcts[k] = pct;
        runningSum += pct;
      }
    }

    return Object.entries(pcts)
      .filter(([k, v]) => v > 0)
      .map(([k, v]) => `${k} ${v}%`)
      .join(' · ');
  }

  /** The era the player will advance into, routed through the era graph. */
  _nextEraChoice() {
    return chooseNextEra(this.eraId, { branch: this._dominantBranch() }) || nextEra(this.eraId);
  }

  /**
   * Can the player descend a simulation layer (New Game+)? True at the end of a
   * terminal age once its mandatory goals are done — the run has nowhere deeper
   * in *time*, so it folds inward into the next nested simulation instead.
   */
  canDescend() {
    return this.mode === MODE.SURVIVAL
      && !nextEra(this.eraId)
      && (this.objectives?.mandatoryDone?.() ?? false);
  }

  /**
   * Descend a layer: bank a permanent legacy (prestige), then reboot the whole
   * journey from the First Cell one simulation deeper — the sim-within-sim loop
   * that makes the game endless.
   */
  _descend() {
    if (!this.canDescend()) return false;
    const layer = this.unlocked.descend ? this.unlocked.descend() : 0;
    SaveManager.clear?.(); // the old run is consumed; the legacy carries forward
    this._teardownView();
    this.newWorld('cell', MODE.SURVIVAL); // _grantStarter applies the legacy head-start
    this.prestige = this.unlocked.prestige ? this.unlocked.prestige() : null;
    this.layer = this.prestige?.layer || 0;
    this.audio?.setEra?.('cell');
    this.audio?.play('unlock');
    this.haptics?.buzz('portal');
    this.particles.fountain(this.player.x, this.player.y - 1, ['#b388ff', '#7be4ff', '#fff', '#f4d24a'], 50);
    SaveManager.save(this);
    this.hud?.bigToast?.(
      `∞ <b>You descend a layer</b><br><small>Simulation layer ${layer} · your legacy carries forward. The First Cell begins again, deeper.</small>`,
      5200,
    );
    this._introThenOnboard();
    return true;
  }

  _advanceEra() {
    if (this.mode !== MODE.SURVIVAL || !this.canAdvance()) return false;
    const branch = this._dominantBranch();
    const nxt = this._nextEraChoice();
    if (!nxt) return false;
    // Capture the route taken; newWorld() resets state, so re-apply it after.
    const route = { from: this.eraId, to: nxt.id, branch: branch || null };
    const priorPath = this.realityPath || [];
    this.unlocked.unlock(nxt.id);
    SaveManager.save(this);
    this._teardownView();
    this.newWorld(nxt.id, MODE.SURVIVAL, { branch }); // branch flavors the new reality
    this.realityPath = [...priorPath, route]; // each reality's path is its own
    this.audio?.setEra?.(nxt.id); // crossfade the music into the new age
    this.audio?.play('unlock');
    this.haptics?.buzz('portal');
    SaveManager.save(this);
    // Reveal the new era full-screen, then resume (mirrors start()).
    this._introThenOnboard();
    return true;
  }

  triggerRealitySplit() {
    this.unlocked.unlock('flora');
    SaveManager.save(this);
    this._teardownView();
    // The simulation forces a branch into the Flora Age
    this.newWorld('flora', MODE.SURVIVAL, { branch: 'mutation' }); 
    const priorPath = this.realityPath || [];
    this.realityPath = [...priorPath, { from: this.eraId, to: 'flora', branch: 'mutation' }];
    this.audio?.setEra?.('flora');
    this.audio?.play('unlock');
    this.haptics?.buzz('portal');
    SaveManager.save(this);
    this._introThenOnboard();
  }

  _checkEraStage() {
    const progress = this.objectives?.stageProgress?.();
    if (!progress || progress.stage <= (this.eraStage || 0)) return;
    this.eraStage = progress.stage;
    const info = this._eraStageInfo(progress.stage);
    this.audio?.play(progress.stage >= 3 ? 'unlock' : 'objective');
    this.particles.fountain(this.player.x, this.player.y - 1,
      ['#f4d24a', '#6fc04e', '#4f86ee', '#ff7b29', '#fff'], 24 + progress.stage * 8);
    this.hud?.bigToast?.(`${info.icon} <b>${info.title}</b><br><small>${info.text}</small>`, 3000);
  }

  _eraStageInfo(stage) {
    const era = getEra(this.eraId);
    const name = era?.name || 'Era';
    const labels = {
      1: { icon: '✨', title: `${name}: Awakening`, text: 'Your actions are changing this age.' },
      2: { icon: '⚡', title: `${name}: Adapting`, text: 'New habits are becoming a civilization.' },
      3: { icon: '🌟', title: `${name}: Evolved`, text: 'This age is ready for its next leap.' },
    };
    return labels[stage] || { icon: '✨', title: `${name}: Progress`, text: 'Keep shaping history.' };
  }

  _expandWorldIfNeeded() {
    const expanded = this.world.expandAround(this.player.x);
    if (!expanded.left && !expanded.right) return;
    if (expanded.left) {
      this.player.x += expanded.left;
      this.camera.x += expanded.left;
      for (const mob of this.mobs) mob.x += expanded.left;
      for (const p of this.particles.list) p.x += expanded.left;
      if (this.mineTarget) this.mineTarget.x += expanded.left;
      if (this.hover) this.hover.x += expanded.left;
      if (this.ghost) this.ghost.x += expanded.left;
    }
    this.camera.clamp();
    this.hud?.toast(`World expanded: ${this.world.width} tiles wide`, 1600);
  }

  _updateWorldEvents(dt) {
    if (!this.events) return;
    const started = this.events.update(this, dt);
    for (const e of started) {
      this.audio?.play('unlock');
      // Every special event resolves into a branch of the timeline. Early on the
      // split width is 1 (nothing changes); as divergence grows the same event
      // can land on an alternate outcome, marked with a subtle glyph.
      const branch = this.mode === MODE.SURVIVAL && this.timeline
        ? this.timeline.branchEvent(e.id, this.eraId)
        : { diverged: false, variant: 0 };
      const tag = branch.diverged ? ` ✷ <small>variant ${branch.variant}</small>` : '';
      this.hud?.toast(`${e.icon} ${e.label}: ${e.text}${tag}`, 3000);
      // Alternate branches pay a small "echo" — a hint that other outcomes exist.
      if (branch.diverged) this.civ.addCP(4 * this.powerups.multiplier('cpMultiplier'));
    }
    this._applyHazards(dt);
  }

  _applyHazards(dt) {
    if (this.mode !== MODE.SURVIVAL) return;
    // Deep-mining hazard: standing in magma scorches you (any era).
    if (this.eraId !== 'cell' && this._touchingMagma()) {
      this.player.health = Math.max(0, this.player.health - dt * 14);
      this._magmaSpark = (this._magmaSpark || 0) + dt;
      if (this._magmaSpark > 0.25) {
        this._magmaSpark = 0;
        this.particles.burst(this.player.x, this.player.y - 0.5, '#ff7b29', 6);
        this.audio?.play('hurt');
      }
      if (this.player.health <= 0) { this.lastDamageCause = 'magma'; this.player.alive = false; }
    }
    if (this.events?.isActive('drought')) {
      this.player.hunger = Math.max(0, this.player.hunger - dt * 0.12);
      const stored = (this.settlers?.stock?.food || 0) + this.inventory.count('food');
      if (stored >= 3 || (this.civ.storage || 0) >= 8) this.events._setActive?.('drought', false);
    }
    if (this.eraId === 'industrial' && (this.civ.pollution || 0) > 4) {
      this.player.hunger = Math.max(0, this.player.hunger - dt * 0.08);
      if ((this.civ.pollution || 0) > 10) this.player.health = Math.max(0, this.player.health - dt * 0.08);
      if (this.player.health <= 0) this.player.alive = false;
    }
    if (!this.events?.isActive('cold_night')) return;
    if (this._hasWarmth()) return;
    const ember = this.powerups.value('warmth', 0) > 0 ? 0.35 : 1;
    this.player.hunger = Math.max(0, this.player.hunger - dt * 0.5 * ember);
    this.player.health = Math.max(0, this.player.health - dt * 0.25 * ember);
    if (this.player.health <= 0) this.player.alive = false;
  }

  /** Is the player's body overlapping a magma tile? */
  _touchingMagma() {
    const magma = blockId('magma');
    const px = Math.round(this.player.x);
    const py0 = Math.floor(this.player.y - this.player.h);
    const py1 = Math.floor(this.player.y);
    for (let y = py0; y <= py1; y++) {
      if (this.world.get(px, y) === magma) return true;
    }
    return false;
  }

  _hasWarmth(radius = 6) {
    if (this.structures?.has('hut') || this.structures?.has('camp')) return true;
    if (this.powerups.value('warmth', 0) > 0) return true;
    const px = Math.floor(this.player.x);
    const py = Math.floor(this.player.y);
    for (let y = py - radius; y <= py + radius; y++) {
      for (let x = px - radius; x <= px + radius; x++) {
        const b = getBlock(this.world.get(x, y));
        if (b.light && Math.hypot(x - px, y - py) <= radius) return true;
      }
    }
    return false;
  }

  _footsteps(dt, wasGround) {
    const p = this.player;
    if (!wasGround && p.onGround) {
      // Landing puff.
      this.particles.burst(p.x, p.y, '#caa', 5, { gravity: 22, life: 0.3 });
    }
    if (p.onGround && Math.abs(p.vx) > 0.3) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = 0.32;
        this.audio?.play('step');
        this.particles.spawn(p.x, p.y, -Math.sign(p.vx) * 1.5, -1,
          { color: 'rgba(180,160,140,0.8)', life: 0.3, size: 0.08, gravity: 14 });
      }
    }
  }

  _absorbCellResources(dt) {
    if (this.mode !== MODE.SURVIVAL || this.eraId !== 'cell') return;
    // The prologue teaches movement: ingredients only combine while the player
    // is actively steering the chemical spark.
    if (this.prelife?.active && Math.hypot(this.player.vx || 0, this.player.vy || 0) < 0.25) return;
    this.cellAbsorbCooldown = Math.max(0, (this.cellAbsorbCooldown || 0) - dt);
    if (this.cellAbsorbCooldown > 0) return;

    const targets = new Map([
      [blockId('nutrient_blob'), { item: 'nutrient_blob', cp: 1.5, color: '#b8ff85' }],
      [blockId('mineral_vent'), { item: 'mineral_vent', cp: 2.5, color: '#9bd6e0' }],
    ]);
    // Feeding range grows as the cell evolves — a tangible sense of power: a
    // mature cell sweeps up nearby food it couldn't reach as a bare protocell.
    const reach = 2.1 + (this.prelife?.active ? 0 : (this.player.cellStage || 0) * 0.28);
    const R = Math.ceil(reach);
    const px = Math.round(this.player.x);
    const py = Math.round(this.player.y - this.player.h / 2);
    for (let y = py - R; y <= py + R; y++) {
      for (let x = px - R; x <= px + R; x++) {
        const def = targets.get(this.world.get(x, y));
        if (!def || Math.hypot(x + 0.5 - this.player.x, y + 0.5 - this.player.y) > reach) continue;
        this.world.set(x, y, AIR);
        if (this.prelife?.active) {
          this._notePrelifeAbsorb(def.item);
          this.particles.fountain(x + 0.5, y + 0.5, [def.color, '#76f7dd', '#fff'], 18);
          this.audio?.play('mine');
          if (this.prelife.active) this.hud?.toast(def.item === 'nutrient_blob' ? '✦ Molecule aligned' : '♨️ Vent energy captured', 1100);
          this.cellAbsorbCooldown = 0.45;
          return;
        }
        this.inventory.add(def.item, 1);
        this.civ.addCP(def.cp * this.powerups.multiplier('cpMultiplier'));
        this._floatText(x + 0.5, y, `+${def.cp} CP`, { color: def.color, size: 0.5, life: 0.8 });
        this._comboHit(x + 0.5, y);
        this.player.eat(def.item === 'nutrient_blob' ? 8 : 3);
        this.cellStability = Math.min(100, (this.cellStability ?? this.player.hunger) + (def.item === 'nutrient_blob' ? 7 : 4));
        // A little flow toward the cell sells the "absorb" read.
        this.particles.fountain(x + 0.5, y + 0.5, [def.color, '#76f7dd', '#fff'], 12);
        this.particles.spawn(x + 0.5, y + 0.5,
          (this.player.x - x - 0.5) * 2, (this.player.y - this.player.h / 2 - y - 0.5) * 2,
          { color: def.color, life: 0.4, size: 0.16, gravity: 0 });
        this.audio?.play('mine');
        // Throttle the toast so rapid feeding doesn't spam the banner.
        const now = Date.now();
        if (!this._lastAbsorbToast || now - this._lastAbsorbToast > 2200) {
          this._lastAbsorbToast = now;
          this.hud?.toast(def.item === 'nutrient_blob' ? '🫧 Absorbed nutrients' : '♨️ Absorbed vent minerals', 900);
        }
        this.cellAbsorbCooldown = 0.35;
        return;
      }
    }
  }

  _notePrelifeAbsorb(itemId) {
    if (!this.prelife?.active) return;
    if (itemId === 'nutrient_blob') this.prelife.nutrients++;
    if (itemId === 'mineral_vent') this.prelife.minerals++;
    if (this.prelife.nutrients < 2 || this.prelife.minerals < 1) return;

    this.prelife.active = false;
    this.settings?.set?.('seenPrelife', true);
    this.player.form = 'cell';
    this.player.cellGrowth = 0.75;
    this.player.cellStage = 0;
    this.inventory = new Inventory();
    this.civ.cp = 0;
    this.cellStability = 28;
    this.audio?.play('unlock');
    this.haptics?.buzz('portal');
    this.particles.fountain(this.player.x, this.player.y - 0.5,
      ['#76f7dd', '#b8ff85', '#ffd6ff', '#fff'], 48);
    SaveManager.save(this);

    this.paused = true;
    this.hud.bigToast('🫧 <b>Against impossible odds, life begins.</b>', 3200);
    const variant = variantInfo(this.eraId, this.world?.variant);
    this.hud.showEraIntro(getEra(this.eraId), () => {
      this.paused = false;
      this._maybeOnboard();
    }, null, variant);
  }

  /**
   * The current "go here" target for the goal beacon — what a new player should
   * head toward next. Cell: the nearest nutrient/vent. Other ages: the nearest
   * era-relevant resource. Throttled by _updateGoalBeacon; the renderer points
   * an arrow at it so "what do I do?" never stalls a first session.
   */
  _goalTarget() {
    if (this.mode !== MODE.SURVIVAL || !this.world) return null;
    if (this.canAdvance()) return this._ensureEraPortal();
    if (this.eraId === 'cell') {
      const n = this._nearestCellResource(24);
      return n ? { x: n.x + 0.5, y: n.y + 0.5, icon: '🫧' } : null;
    }
    const want = GOAL_RESOURCES[this.eraId] || GOAL_RESOURCES._default;
    const found = this._nearestBlock(want.map((id) => blockId(id)).filter((n) => n != null), 28);
    return found ? { x: found.x + 0.5, y: found.y + 0.5, icon: '⛏️' } : null;
  }

  _ensureEraPortal() {
    if (this.eraPortal) return this.eraPortal;
    const dir = this.player.x < this.world.width / 2 ? 1 : -1;
    const x = Math.max(4, Math.min(this.world.width - 4, this.player.x + dir * 8));
    const column = Math.max(0, Math.min(this.world.width - 1, Math.round(x)));
    const y = this.eraId === 'cell'
      ? Math.max(5, Math.min(this.world.height - 5, this.player.y - 1))
      : this.world.heightMap[column] - 1;
    const nxt = this._nextEraChoice();
    this.eraPortal = {
      x, y, icon: '🌀', kind: 'portal',
      label: nxt ? `ENTER ${nxt.name.toUpperCase()}` : 'DESCEND',
    };
    this.hud?.bigToast?.('🌀 <b>A rift has opened nearby.</b><br><small>Follow it and enter the next age.</small>', 4200);
    return this.eraPortal;
  }

  _updateEraPortal() {
    if (!this.canAdvance()) { this.eraPortal = null; return; }
    const portal = this._ensureEraPortal();
    if (Math.hypot(portal.x - this.player.x, portal.y - this.player.y) > 1.55) return;
    
    if (this.hud && this.mode === MODE.SURVIVAL) {
      this.hud.showPortalPreview(this, () => {
        this.eraPortal = null;
        if (this.canDescend()) this._descend();
        else this._advanceEra();
      });
    } else {
      this.eraPortal = null;
      if (this.canDescend()) this._descend();
      else this._advanceEra();
    }
  }

  _nearestBlock(idList, radius = 24) {
    const ids = new Set(idList);
    const px = Math.round(this.player.x);
    const py = Math.round(this.player.y - this.player.h / 2);
    let best = null;
    for (let y = py - radius; y <= py + radius; y++) {
      for (let x = px - radius; x <= px + radius; x++) {
        if (!ids.has(this.world.get(x, y))) continue;
        const d = Math.hypot(x + 0.5 - this.player.x, y + 0.5 - this.player.y);
        if (d > radius || (best && d >= best.distance)) continue;
        best = { x, y, distance: d };
      }
    }
    return best;
  }

  /** Recompute the goal beacon target on a throttle (the scan is bounded). */
  _updateGoalBeacon(dt) {
    this._beaconTimer = (this._beaconTimer || 0) + dt;
    if (this._beaconTimer < 0.5 && this.goalTarget !== undefined) return;
    this._beaconTimer = 0;
    this.goalTarget = this._goalTarget();
  }

  /** Bioluminescent trail behind a swimming cell — makes movement feel alive. */
  _cellSwimTrail(dt) {
    if (this.eraId !== 'cell' || this.reduceMotion) return;
    const speed = Math.hypot(this.player.vx || 0, this.player.vy || 0);
    if (speed < 0.6) return;
    this._trailAccum = (this._trailAccum || 0) + dt;
    if (this._trailAccum < 0.06) return;
    this._trailAccum = 0;
    const cy = this.player.y - this.player.h / 2;
    this.particles.spawn(this.player.x, cy, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4,
      { color: Math.random() < 0.5 ? '#76f7dd' : '#b8ff85', life: 0.7 + Math.random() * 0.5, size: 0.09, gravity: 0 });
  }

  _updateCellStatus(dt) {
    if (this.eraId !== 'cell') {
      this.cellStatus = null;
      return;
    }
    if (this.prelife?.active) {
      const nearest = this._nearestCellResource(14);
      this.cellStatus = {
        stability: 0, stage: 0, stageName: 'chemistry before life',
        gradient: nearest ? nearest.label : 'primordial ocean',
        distance: nearest?.distance ?? null, ready: false,
      };
      return;
    }
    const nearest = this._nearestCellResource(14);
    const membrane = Math.min(1, this.inventory.count('lipid_membrane') / 4);
    const proto = this.inventory.count('proto_cell') > 0 || this.crafted.has('proto_cell') ? 1 : 0;
    const resourceBonus = Math.min(18, this.inventory.count('nutrient_blob') * 2 + this.inventory.count('mineral_vent') * 3);
    const structureBonus = Math.min(16, (this.civ.placed.lipid_membrane || 0) * 4);
    const target = Math.min(100, 28 + resourceBonus + membrane * 18 + structureBonus + proto * 20);
    this.cellStability = this.cellStability == null ? target : this.cellStability + (target - this.cellStability) * Math.min(1, dt * 2);
    // Visible growth + evolution stages: the cell swells AND grows organelles as
    // it stabilizes, so the player *sees* themselves becoming a real cell.
    const stage = this._cellStage(this.cellStability);
    if (this.player) {
      this.player.cellGrowth = 1 + (this.cellStability / 100) * 0.7;
      this.player.cellStage = stage;
    }
    this._celebrateCellStage(stage);
    this.cellStatus = {
      stability: Math.round(this.cellStability),
      stage,
      stageName: CELL_STAGE_NAMES[stage],
      gradient: nearest ? nearest.label : 'quiet chemistry',
      distance: nearest ? nearest.distance : null,
      ready: this.objectives?.mandatoryDone?.() && this.civ.canAdvance(),
    };
  }

  /** Map stability (0..100) to an evolution stage (0..4). */
  _cellStage(stability) {
    if (stability >= 90) return 4;
    if (stability >= 70) return 3;
    if (stability >= 50) return 2;
    if (stability >= 33) return 1;
    return 0;
  }

  /** Toast + sparkle the first time the cell reaches a new evolution stage. */
  _celebrateCellStage(stage) {
    if (this._lastCellStage == null) { this._lastCellStage = stage; return; }
    if (stage <= this._lastCellStage) { this._lastCellStage = Math.min(this._lastCellStage, stage); return; }
    this._lastCellStage = stage;
    this.hud?.toast(`🧬 Your cell evolved: ${CELL_STAGE_NAMES[stage]}`, 2800);
    this.audio?.play('objective');
    this.particles?.fountain?.(this.player.x, this.player.y - 0.5,
      ['#b8ff85', '#76f7dd', '#ffd6ff', '#fff'], 20);
  }

  _nearestCellResource(radius = 12) {
    if (!this.world || this.eraId !== 'cell') return null;
    const ids = new Map([
      [blockId('nutrient_blob'), 'nutrient gradient'],
      [blockId('mineral_vent'), 'warm vent minerals'],
    ]);
    const px = Math.round(this.player.x);
    const py = Math.round(this.player.y - this.player.h / 2);
    let best = null;
    for (let y = py - radius; y <= py + radius; y++) {
      for (let x = px - radius; x <= px + radius; x++) {
        const label = ids.get(this.world.get(x, y));
        if (!label) continue;
        const distance = Math.hypot(x + 0.5 - this.player.x, y + 0.5 - this.player.y);
        if (distance > radius || (best && distance >= best.distance)) continue;
        best = { x, y, label, distance };
      }
    }
    return best;
  }

  /** Era-flavored ambient weather particles drifting across the view. */
  _applyReduceMotion() {
    const on = !!this.settings?.get('reduceMotion');
    try { document.body.classList.toggle('reduce-motion', on); } catch (e) { /* no DOM in tests */ }
  }

  get reduceMotion() { return !!this.settings?.get('reduceMotion'); }

  _ambientWeather(dt) {
    if (this.reduceMotion) return; // accessibility: no drifting particles
    const theme = getEraTheme(this.eraId, this.world?.variant);
    if (!theme.weather || theme.weather === 'none' || !theme.weatherRate) return;
    this._weatherAccum = (this._weatherAccum || 0) + dt * theme.weatherRate;
    while (this._weatherAccum >= 1) {
      this._weatherAccum -= 1;
      const cam = this.camera;
      const x = cam.x + (Math.random() - 0.5) * cam.tilesX;
      const yTop = cam.y - cam.tilesY / 2 - 1;
      switch (theme.weather) {
        case 'leaves':
          this.particles.spawn(x, yTop + Math.random() * 2, (Math.random() - 0.5) * 1.5, 1.2,
            { color: ['#5a9e3f', '#6fc04e', '#caa55a'][(Math.random() * 3) | 0], life: 4, size: 0.12, gravity: 1.5 });
          break;
        case 'dust':
          this.particles.spawn(x, cam.y + (Math.random() - 0.5) * cam.tilesY, 2 + Math.random() * 2, 0,
            { color: 'rgba(210,190,140,0.5)', life: 2.5, size: 0.08, gravity: 0 });
          break;
        case 'snow':
          this.particles.spawn(x, yTop, (Math.random() - 0.5) * 0.8, 1.6,
            { color: '#eaf2ff', life: 5, size: 0.1, gravity: 0.8 });
          break;
        case 'ash':
          this.particles.spawn(x, yTop, (Math.random() - 0.5) * 0.6, 1.0,
            { color: ['#444', '#666', '#888'][(Math.random() * 3) | 0], life: 5, size: 0.1, gravity: 1.0 });
          break;
        case 'bubbles':
          this.particles.spawn(x, cam.y + cam.tilesY / 2, (Math.random() - 0.5) * 0.4, -1.5,
            { color: 'rgba(180,255,245,0.65)', life: 4, size: 0.12, gravity: -0.2 });
          break;
        default: break;
      }
    }
  }

  /**
   * Asteroid / meteor-shower event for the age of dinosaurs.
   *
   * Streaking meteors cross the sky as omens; occasionally one impacts near the
   * player — shaking the screen, scorching a small crater, throwing fire
   * particles, and damaging anything close. It is dangerous but survivable
   * (shelter helps), reinforcing the "survive the extinction" fantasy.
   */
  _updateMeteors(dt) {
    const theme = getEraTheme(this.eraId, this.world?.variant);
    if (!theme.asteroidEvent || this.mode !== MODE.SURVIVAL) { this.meteors = this.meteors || []; return; }
    this.meteors = this.meteors || [];

    // Spawn cadence: a meteor every ~18-34s; impact chance rises a little with
    // accumulated time so the era trends toward its climax.
    this._meteorTimer = (this._meteorTimer || 8) - dt;
    if (this._meteorTimer <= 0) {
      this._meteorTimer = 18 + Math.random() * 16;
      const willImpact = Math.random() < 0.4;
      const camLeft = this.camera.x - this.camera.tilesX / 2;
      const tx = willImpact
        ? this.player.x + (Math.random() - 0.5) * 8     // aim near the player
        : camLeft + Math.random() * this.camera.tilesX; // just a sky streak
      this.meteors.push({
        x: tx + 10, y: this.camera.y - this.camera.tilesY * 0.7,
        vx: -7 - Math.random() * 3, vy: 11 + Math.random() * 4,
        impact: willImpact, life: 6,
      });
      if (willImpact) this.hud?.toast('☄️ The sky burns — take cover!', 2200);
    }

    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.life -= dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      // Smoke/fire trail.
      if (!this.reduceMotion && Math.random() < 0.8) {
        this.particles.spawn(m.x, m.y, -m.vx * 0.1, -m.vy * 0.05,
          { color: ['#ff9b3b', '#ffd27a', '#7a4a2a'][(Math.random() * 3) | 0], life: 0.5, size: 0.14, gravity: 0 });
      }
      const groundY = this.world.heightMap[Math.round(m.x)] ?? 9999;
      if (m.impact && m.y >= groundY - 1) {
        this._meteorImpact(Math.round(m.x), groundY);
        this.meteors.splice(i, 1);
      } else if (m.life <= 0 || m.y > this.world.height) {
        this.meteors.splice(i, 1);
      }
    }
  }

  _meteorImpact(cx, cy) {
    this.audio?.play('break'); this.haptics?.buzz('break');
    if (!this.reduceMotion) this.hud?.shake?.();
    this.particles.fountain(cx + 0.5, cy - 0.5, ['#ff9b3b', '#ffd27a', '#ff5b3b', '#7a4a2a'], 40);

    // Carve a shallow crater and scorch the rim.
    const r = 2;
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (dx * dx + dy * dy > r * r) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (this.world.inBounds(x, y) && getBlock(this.world.get(x, y)).hardness !== Infinity) {
          this.world.set(x, y, AIR);
        }
      }
    }
    // Let sand/gravel slump into the fresh crater.
    for (let dx = -r - 1; dx <= r + 1; dx++) this._settleFalling(cx + dx, cy - r - 1);

    // Damage the player + mobs caught in the blast.
    if (Math.hypot(this.player.x - (cx + 0.5), this.player.y - (cy + 0.5)) < 4) {
      this._damagePlayer(35, 'a meteor impact');
    }
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const mob = this.mobs[i];
      if (Math.hypot(mob.x - (cx + 0.5), mob.y - (cy + 0.5)) < 4) {
        if (mob.hurt(30)) this.mobs.splice(i, 1);
      }
    }
    this.hud?.toast('☄️ Impact!', 1500);
  }
  showMatrixTerminal(x, y) {
    if (this.isDead || this.paused) return;
    this.paused = true;
    this.matrixTerminal.show(x, y);
  }

  _onMatrixWin(x, y) {
    this.world.set(x, y, AIR);
    this.inventory?.add?.('matrix_fragment', 1);
    this.hud?.toast('💠 Encrypted fragment recovered!', 2000);
    this.audio?.play?.('pickup');
    
    // Unlock matrix lore discovery
    this.discoveries?.unlock?.('matrix_fragment_1');
  }

  _getInteractTarget() {
    const cx = Math.floor(this.player.x);
    const cy = Math.floor(this.player.y);
    const radius = 2;
    
    let closest = null;
    let minDist = Infinity;

    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        const id = this.world.get(x, y);
        const block = getItem(id);
        if (block && typeof block.interact === 'function') {
          const dist = Math.hypot(x + 0.5 - this.player.x, y + 0.5 - this.player.y);
          if (dist <= 2.5 && dist < minDist) {
            minDist = dist;
            closest = { x, y, block };
          }
        }
      }
    }
    return closest;
  }

  _doInteract() {
    if (this.isDead || this.paused) return;
    const target = this._getInteractTarget();
    if (target) {
      target.block.interact(this, target.x, target.y);
    }
  }

  _handleInteraction(dt) {
    const m = this.input.mouse;
    const { tileX, tileY, tx, ty } = this.camera.screenToWorld(m.x, m.y);
    const dist = Math.hypot(tx - this.player.x, ty - (this.player.y - this.player.h / 2));
    const reach = C.REACH + this.powerups.value('reach', 0);
    const inReach = dist <= reach;
    const sel = this.inventory.selectedItem();

    // Blueprint selection tool logic.
    if (sel?.id === 'blueprint_tool') {
      this.hover = { x: tileX, y: tileY, valid: true, mode: 'select', progress: 0 };
      this.ghost = null;
      if (!m.down) {
        if (this.selectionStart && this.selectionEnd) {
          this._promptBlueprintSave(this.selectionStart, this.selectionEnd);
          this.selectionStart = null;
          this.selectionEnd = null;
        }
        return;
      }
      if (!this.selectionStart) {
        this.selectionStart = { x: tileX, y: tileY };
      }
      this.selectionEnd = { x: tileX, y: tileY };
      return;
    }

    // Normal interactions
    const placeIntent = m.button === 2 || this.buildMode;

    this.hover = { x: tileX, y: tileY, valid: inReach, mode: placeIntent ? 'place' : 'mine', progress: 0 };

    // Ghost placement preview.
    this.ghost = null;
    if (placeIntent && inReach && sel && isPlaceable(sel.id) &&
        this.world.get(tileX, tileY) === AIR && !this._overlapsPlayer(tileX, tileY)) {
      this.ghost = { x: tileX, y: tileY, valid: true, color: getItem(sel.id)?.colors?.base };
    }

    if (!m.down || !inReach) { this.mineTarget = null; this.mineProgress = 0; return; }

    if (placeIntent) {
      if (this.placeCooldown <= 0 && this._tryPlace(tileX, tileY)) this.placeCooldown = 0.14;
      return;
    }

    // Hit a mob standing on this tile first.
    const hitMob = this.mobs.find((mb) =>
      Math.abs(mb.x - (tileX + 0.5)) < 0.7 && Math.abs((mb.y - mb.h / 2) - (tileY + 0.5)) < 1);
    if (hitMob) {
      if (this.attackCooldown <= 0) { this._hitMob(hitMob); this.attackCooldown = 0.4; }
      return;
    }

    // Mining.
    const id = this.world.get(tileX, tileY);
    if (id === AIR) { this.mineTarget = null; return; }
    const block = getBlock(id);
    if (block.hardness === Infinity) return;

    // Tool gating: a block with minTier needs a matching tool of at least that
    // tier (creative ignores this). Refuse with a one-time hint otherwise.
    if (this.mode === MODE.SURVIVAL && !this._canMine(block)) {
      this.mineTarget = null;
      this.mineProgress = 0;
      this.hover.blocked = true;
      if (!this._toolHintAt || this._toolHintAt !== `${tileX},${tileY}`) {
        this._toolHintAt = `${tileX},${tileY}`;
        const need = block.minTier >= 2 ? 'a stone pickaxe or better' : 'a pickaxe';
        this.hud.toast(`Need ${need} to mine ${block.label}`, 1600);
        this.audio?.play('ui');
      }
      return;
    }

    if (!this.mineTarget || this.mineTarget.x !== tileX || this.mineTarget.y !== tileY) {
      this.mineTarget = { x: tileX, y: tileY };
      this.mineProgress = 0;
    }

    const speed = this._miningSpeed(block);
    this.mineProgress += dt * speed;
    this.hover.progress = this.mode === MODE.CREATIVE ? 1 : Math.min(1, this.mineProgress / block.hardness);

    // Mining particles + tick sound while breaking.
    if (block.colors && Math.random() < 0.4) {
      this.particles.spawn(tileX + 0.5, tileY + 0.5,
        (Math.random() - 0.5) * 2, -Math.random() * 2,
        { color: block.colors.base, life: 0.3, size: 0.08 });
    }
    if (Math.random() < 0.25) this.audio?.play('mine');

    if (this.mode === MODE.CREATIVE || this.mineProgress >= block.hardness) {
      this._breakBlock(tileX, tileY, block);
      this.mineTarget = null;
      this.mineProgress = 0;
    }
  }

  _miningSpeed(block) {
    const sel = this.inventory.selectedItem();
    const item = sel ? getItem(sel.id) : null;
    const legacy = this.prestige?.miningMult || 1; // New Game+ permanent boost
    const combo = this.combo?.multiplier?.() || 1;  // flow-state streak boost
    if (item && item.kind === 'tool' && item.tool === block.tool) {
      return (1 + item.tier * 1.4) * this.powerups.multiplier('miningSpeed') * legacy * combo;
    }
    return this.powerups.multiplier('miningSpeed') * legacy * combo;
  }

  /** Can the currently held tool harvest this block? (minTier gating) */
  _canMine(block) {
    const need = minTierOf(block.id);
    if (need <= 0) return true;
    const sel = this.inventory.selectedItem();
    const item = sel ? getItem(sel.id) : null;
    return !!(item && item.kind === 'tool' && item.tool === block.tool && item.tier >= need);
  }

  _breakBlock(x, y, block) {
    this.world.set(x, y, AIR);
    if (block.colors) this.particles.burst(x + 0.5, y + 0.5, block.colors.base, 10);
    this.audio?.play('break'); this.haptics?.buzz('break');
    this._discoverClue(block);
    const drops = dropsOf(block.id);
    if (this.mode === MODE.SURVIVAL) {
      for (const drop of drops) this.inventory.add(drop, 1);
      // Branch identity: Flora's lush foliage yields extra fiber.
      const fb = this.eraMods?.fiberBonus || 0;
      if (fb && block.name === 'leaves' && Math.random() < fb) this.inventory.add('fiber', 1);
    }
    if (block.treasure && this.mode === MODE.SURVIVAL) this._openTreasure(x, y);
    this.civ.onMine(block.name, y);
    if (this.mode === MODE.SURVIVAL) this._comboHit(x + 0.5, y);
    // Removing a block can drop falling blocks stacked above it.
    this._settleFalling(x, y - 1);
  }

  _promptBlueprintSave(start, end) {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    if (w * h > 400) {
      this.hud.toast('Selection too large (max 400 blocks)', 2000);
      return;
    }

    const blocks = [];
    let empty = true;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const id = this.world.get(x, y);
        blocks.push(id);
        if (id !== 0) empty = false;
      }
    }

    if (empty) {
      this.hud.toast('No structure selected', 2000);
      return;
    }

    const bp = { id: 'bp_' + Date.now(), w, h, blocks, name: 'New Blueprint' };
    this.hud.prompt('Name this blueprint:', 'Custom Blueprint', (name) => {
      if (name) {
        bp.name = name;
        this.blueprints = this.blueprints || [];
        this.blueprints.push(bp);
        SaveManager.saveBlueprints(this.blueprints);
        this.hud.toast(`Saved blueprint: ${name}`);
        this.audio?.play('ui');
        
        // Reward truth shards for epic builds (large structures)
        const blockCount = blocks.filter(id => id !== 0).length;
        if (blockCount > 25) {
          this.inventory.add('matrix_shard', 1);
          this.hud.bigToast('💠 Epic Structure Detected!<br><small>A Matrix Shard materializes in your inventory.</small>', 3000);
          this.audio?.play('level_up');
        }
      }
    });
  }

  fillGhostBlock(x, y) {
    // If the player holds an item that matches the ghost block's requirement, or just uses any block, replace it.
    // For now, let's just make it a visual effect where it turns into a random useful block if they have raw material.
    if (this.inventory.has('stone', 1)) {
      this.inventory.remove('stone', 1);
      this.world.set(x, y, 1); // stone
      this.hud.toast('Ghost projection solidified!');
      this.particles.burst(x + 0.5, y + 0.5, '#00ffff', 15);
      this.audio?.play('place');
    } else {
      this.hud.toast('Need Stone to solidify this projection.');
    }
  }

  /** Crack open a buried cache: a burst of loot + CP — the explorer's payoff. */
  _openTreasure(x, y) {
    const pool = ['crystal', 'gold', 'iron', 'machine_part', 'trade_bead', 'flint', 'coal'];
    const rolls = 2 + ((Math.random() * 3) | 0); // 2–4 stacks of loot
    const got = {};
    for (let i = 0; i < rolls; i++) {
      const id = pool[(Math.random() * pool.length) | 0];
      const n = 1 + ((Math.random() * 3) | 0);
      this.inventory.add(id, n);
      got[id] = (got[id] || 0) + n;
    }
    const cp = 30 + ((Math.random() * 30) | 0);
    this.civ.addCP(cp);
    this.audio?.play('unlock');
    this.haptics?.buzz('unlock');
    this.particles.fountain(x + 0.5, y + 0.5, ['#f4d24a', '#fff0a8', '#fff', '#9be86a'], 40);
    const items = Object.entries(got).map(([id, n]) => `${n}× ${getItem(id)?.label || id}`).join(', ');
    this.hud?.bigToast(`🏆 <b>Buried Cache!</b><br><small>+${cp} CP and ${items}.</small>`, 3600);
    this._floatText(x + 0.5, y, `+${cp} CP`, { color: '#f4d24a', size: 0.7, life: 1.3 });
  }

  /**
   * Register a combo action and celebrate when the streak crosses a tier — the
   * flow-state juice. Each tier mines faster (read via combo.multiplier()).
   */
  _comboHit(fx, fy) {
    const r = this.combo.add();
    if (r.tierUp) {
      const t = r.tierUp;
      this.civ.addCP(t.bonus);
      this.audio?.play(t.at >= 25 ? 'unlock' : 'objective');
      this.haptics?.buzz(t.at >= 25 ? 'unlock' : 'craft');
      this.particles.fountain(this.player.x, this.player.y - 1,
        ['#ffd36b', '#ff7b29', '#fff', '#9be86a'], 16 + t.at);
      this._floatText(this.player.x, this.player.y - this.player.h - 0.4,
        `${t.label}! ×${this.combo.count}`, { color: '#ffd36b', size: 0.72, life: 1.3 });
    } else if (this.combo.count >= 3 && fx != null) {
      this._floatText(fx, fy, `×${this.combo.count}`, { color: '#ffe14a', size: 0.42, life: 0.6 });
    }
  }

  _discoverClue(block) {
    const id = clueForBlock(block);
    if (!id || !this.clues) return;
    const clue = this.clues.discover(id);
    if (!clue) return;
    if (this.mode === MODE.SURVIVAL && clue.reward) {
      this.civ.addCP(clue.reward * this.powerups.multiplier('cpMultiplier'));
    }
    this.audio?.play('objective');
    this.particles.fountain(this.player.x, this.player.y - 1,
      ['#f4d24a', '#8e6bd6', '#d9cfb7', '#fff'], 22);
    this.hud?.bigToast(`${clue.icon} <b>${clue.label}</b><br><small>${clue.text}</small>`, 3800);
  }

  _tryPlace(x, y) {
    const sel = this.inventory.selectedItem();
    if (!sel) return false;
    // Consumables: eat instead of place.
    if (sel.id === 'food' || sel.id === 'raw_food') {
      if (this.mode === MODE.SURVIVAL && this.player.hunger < 100) {
        this.player.eat(sel.id === 'food' ? 30 : 12);
        this.inventory.consumeSelected(1);
        this.audio?.play('eat');
        this.particles.burst(this.player.x, this.player.y - 0.8, '#cf5d6a', 6, { gravity: 10 });
        this.hud.toast('Ate food');
        return true;
      }
      return false;
    }
    if (sel.id === 'wheat_seeds') return this._tryPlantWheat(x, y);
    if (!isPlaceable(sel.id)) return false;
    if (this.world.get(x, y) !== AIR) return false;
    if (this._overlapsPlayer(x, y)) return false;
    // Adjacency: a new block must touch an existing solid block (or any
    // non-air, e.g. water) on at least one side, so you can't place in mid-air.
    if (!this._hasNeighbor(x, y)) {
      if (!this._placeHintT || performance.now() - this._placeHintT > 1500) {
        this._placeHintT = performance.now();
        this.hud.toast('Place next to an existing block', 1400);
      }
      return false;
    }
    const id = getItem(sel.id).place;
    this.world.set(x, y, id);
    this._settleFalling(x, y - 1); // a block placed under floating sand re-supports it
    const b = getBlock(id);
    if (b.colors) this.particles.burst(x + 0.5, y + 0.5, b.colors.base, 5, { gravity: 8, life: 0.3 });
    this.audio?.play('place'); this.haptics?.buzz('place');
    this.civ.onBuild(sel.id, x, y);
    this._evaluateStructures({ x, y });
    if (this.mode === MODE.SURVIVAL) this.inventory.consumeSelected(1);
    return true;
  }

  _tryPlantWheat(x, y) {
    const plot = blockId('farm_plot');
    const seedling = blockId('wheat_seedling');
    let cropX = x;
    let cropY = y;
    if (this.world.get(x, y) === plot && this.world.get(x, y - 1) === AIR) {
      cropY = y - 1;
    } else if (this.world.get(x, y) === AIR && this.world.get(x, y + 1) === plot) {
      cropY = y;
    } else {
      this.hud.toast('Plant seeds on a Farm Plot', 1400);
      return false;
    }
    if (this._overlapsPlayer(cropX, cropY)) return false;
    this.world.set(cropX, cropY, seedling);
    this.audio?.play('place'); this.haptics?.buzz('place');
    this.particles.burst(cropX + 0.5, cropY + 0.5, '#9ed36a', 6, { gravity: 5, life: 0.35 });
    this.civ.onBuild('wheat_seedling', cropX, cropY);
    if (this.mode === MODE.SURVIVAL) this.inventory.consumeSelected(1);
    this.hud.toast('Planted wheat');
    return true;
  }

  _updateCrops(dt) {
    if (!this.world || this.world.eraId === 'cell') return;
    this._cropTimer = (this._cropTimer || 0) + dt;
    if (this._cropTimer < 4) return;
    this._cropTimer = 0;

    const ids = {
      plot: blockId('farm_plot'),
      seedling: blockId('wheat_seedling'),
      green: blockId('wheat_green'),
      ripe: blockId('wheat_ripe'),
    };
    const centers = [{ x: Math.round(this.player.x), y: Math.round(this.player.y) }];
    if (this.settlers?.home) centers.push(this.settlers.home);
    const drought = this.events?.isActive('drought');
    for (const c of centers) {
      for (let y = Math.round(c.y) - 12; y <= Math.round(c.y) + 6; y++) {
        for (let x = Math.round(c.x) - 16; x <= Math.round(c.x) + 16; x++) {
          const id = this.world.get(x, y);
          if (id !== ids.seedling && id !== ids.green) continue;
          if (this.world.get(x, y + 1) !== ids.plot) continue;
          const nearWater = this._nearBlock(x, y, blockId('water'), 3);
          const crop = this.eraMods?.cropGrowth || 1; // branch identity: Flora cultivates fast
          const chance = (id === ids.seedling ? 0.45 : 0.32) * (nearWater ? 1.45 : 1) * (drought ? 0.35 : 1) * crop;
          if (Math.random() > chance) continue;
          this.world.set(x, y, id === ids.seedling ? ids.green : ids.ripe);
          if (!this.reduceMotion && Math.random() < 0.5) {
            this.particles.burst(x + 0.5, y + 0.5, '#d9b84a', 3, { gravity: 3, life: 0.4 });
          }
        }
      }
    }
  }

  _updateFlora(dt) {
    if (!this.world || this.world.eraId !== 'flora') return;
    this._floraTimer = (this._floraTimer || 0) + dt;
    if (this._floraTimer < 5) return;
    this._floraTimer = 0;

    const vineId = blockId('giant_vine');
    if (vineId === 0) return; // not defined

    const cx = Math.floor(this.player.x);
    const cy = Math.floor(this.player.y);
    for (let i = 0; i < 4; i++) { // small number of attempts per tick
      const rx = cx + Math.floor((Math.random() - 0.5) * 40);
      const ry = cy + Math.floor((Math.random() - 0.5) * 30);
      const target = this.world.get(rx, ry);
      if (target === vineId) {
        // Grow upwards
        if (this.world.get(rx, ry - 1) === 0) {
          if (Math.random() < 0.4) {
            this.world.set(rx, ry - 1, vineId);
            this.particles.burst(rx + 0.5, ry - 0.5, '#70e28b', 2, { gravity: 2, life: 0.3 });
          }
        }
      } else if (target === blockId('spore_pod') && this.world.get(rx, ry + 1) === 0) {
        // rare vine spawn under spore pod
        if (Math.random() < 0.05) {
          this.world.set(rx, ry + 1, vineId);
        }
      }
    }
  }

  _updateCommerce(dt) {
    if (!this.world || this.world.eraId !== 'republic') return;
    this._commerceTimer = (this._commerceTimer || 0) + dt;
    if (this._commerceTimer < 10) return; // run every 10 seconds
    this._commerceTimer = 0;

    // Apply vault interest
    let vaults = this.civ.structures.get('vault') || 0;
    if (vaults > 0 && this.civ.cp > 0) {
      const interest = Math.floor(this.civ.cp * 0.01 * vaults); // 1% per vault
      if (interest > 0) {
        this.civ.cp += interest;
        this.floaters.add('+', this.player.x, this.player.y - 1, '#f2cd78', `+${interest} CP Interest`);
      }
    }

    // Process mints
    let mints = this.civ.structures.get('mint') || 0;
    if (mints > 0) {
      let coinsMinted = 0;
      // take from settler stock or player inventory
      for (let i = 0; i < mints; i++) {
        let source = null;
        if (this.inventory.count('gold_ore') > 0) source = { inv: true, item: 'gold_ore' };
        else if ((this.settlers?.stock?.gold_ore || 0) > 0) source = { inv: false, item: 'gold_ore' };
        else if (this.inventory.count('copper_ore') > 0) source = { inv: true, item: 'copper_ore' };
        else if ((this.settlers?.stock?.copper_ore || 0) > 0) source = { inv: false, item: 'copper_ore' };

        if (source) {
          if (source.inv) this.inventory.consume(source.item, 1);
          else {
            this.settlers.stock[source.item]--;
            // prevent negative stock
            if (this.settlers.stock[source.item] < 0) this.settlers.stock[source.item] = 0;
          }
          
          this.inventory.add('trade_bead', 1);
          coinsMinted++;
        }
      }

      if (coinsMinted > 0) {
        this.hud.toast(`Mints struck ${coinsMinted} coins`);
        // assume an generic audio like 'craft' or 'place' works as we don't have 'coin' specifically
        this.audio?.play('place'); 
      }
    }
  }

  _nearBlock(cx, cy, wanted, radius = 3) {
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (Math.hypot(x - cx, y - cy) <= radius && this.world.get(x, y) === wanted) return true;
      }
    }
    return false;
  }

  _onRoad() {
    if (!this.world) return false;
    const road = blockId('road');
    const px = Math.floor(this.player.x);
    const py = Math.floor(this.player.y);
    return this.world.get(px, py) === road || this.world.get(px, py + 1) === road;
  }

  _evaluateStructures(origin = null) {
    if (!this.structures) return;
    const found = this.structures.evaluate(this, origin);
    for (const s of found) {
      if (s.reward) this.civ.addCP(s.reward * this.powerups.multiplier('cpMultiplier'));
      this.audio?.play('objective');
      this.particles.fountain(this.player.x, this.player.y - 1, ['#f4d24a', '#6fc04e', '#4f86ee'], 18);
      this.hud?.toast(`${s.icon} Structure discovered: ${s.label}${s.reward ? ` (+${s.reward} CP)` : ''}`, 2600);
    }
    
    // Evaluate continuous Architectural Score
    const newArchScore = this.structures.scoreArchitecture(this);
    if (newArchScore > this.civ.archScore) {
      const diff = newArchScore - this.civ.archScore;
      this.civ.addCP(diff * 0.5 * this.powerups.multiplier('cpMultiplier')); // Reward expansion
      this.civ.archScore = newArchScore;
      
      // Every 100 points of architecture provides a passive milestone toast
      if (Math.floor(newArchScore / 100) > Math.floor((this.civ.archScore - diff) / 100)) {
        this.audio?.play('objective');
        this.hud?.toast(`🏛️ Grand Architecture! (Score: ${newArchScore})`, 3000);
      }
    }
  }

  _evaluateFunSystems(dt) {
    this.structureScanTimer -= dt;
    const fastScan = this.powerups.value('structureScan', 0) > 0;
    if (this.structureScanTimer <= 0) {
      this.structureScanTimer = fastScan ? 1.5 : 5;
      this._evaluateStructures();
    }

    if (!this.discoveries) return;
    const found = this.discoveries.evaluate(this);
    for (const d of found) {
      const reward = d.reward || {};
      if (reward.cp) this.civ.addCP(reward.cp * this.powerups.multiplier('cpMultiplier'));
      let suffix = reward.cp ? ` (+${reward.cp} CP)` : '';
      if (reward.powerup) {
        const p = this.powerups.grant(reward.powerup);
        if (p) suffix += ` · ${p.icon} ${p.label}`;
      }
      this.audio?.play('unlock');
      this.particles.fountain(this.player.x, this.player.y - 1,
        ['#f4d24a', '#6fc04e', '#4f86ee', '#ff7b29', '#fff'], 28);
      this.hud?.bigToast(`${d.icon} <b>Hidden discovery</b><br><small>${d.label}${suffix}</small>`, 3400);
    }
  }

  _updateSimulationAnomalies(dt) {
    if (!this.anomalies || !this.clues) return;
    const found = this.anomalies.update(dt, this);
    for (const a of found) {
      this.timeline?.note(0.3); // each anomaly destabilizes the timeline a little
      const clue = this.clues.discover(a.clue);
      if (clue?.reward && this.mode === MODE.SURVIVAL) {
        this.civ.addCP(clue.reward * this.powerups.multiplier('cpMultiplier'));
      }
      this.audio?.play('unlock');
      this.particles.fountain(this.player.x, this.player.y - 1,
        ['#f4d24a', '#8e6bd6', '#7be4ff', '#fff'], 34);
      this.hud?.bigToast(`${a.icon} <b>${a.label}</b><br><small>${a.text}</small>`, 4200);
    }
  }

  /**
   * Stage a reality bleed when the timeline decides one occurs. The Timeline
   * system owns the *decision*; the Game owns the *presentation* (particles,
   * toast, and a small cross-branch reward). Two flavors:
   *   glitch — an unintended "bug in the matrix"; eerie, a faint resource echo.
   *   rift   — a deliberate crossover; a real windfall pulled from another thread.
   */
  _updateTimeline(dt) {
    if (this.mode !== MODE.SURVIVAL || !this.timeline) return;
    const bleed = this.timeline.update(dt);
    if (!bleed) return;
    const px = this.player.x;
    const py = this.player.y - 1;
    if (bleed.kind === 'rift') {
      this.audio?.play('unlock');
      this.particles.fountain(px, py, ['#b388ff', '#7be4ff', '#fff', '#ff7be4'], 46);
      const windfall = Math.round(40 * this.powerups.multiplier('cpMultiplier'));
      this.civ.addCP(windfall);
      // A rift hands you tangible loot pulled from a parallel reality.
      const loot = this._riftLoot();
      if (loot) { this.inventory.add(loot.id, loot.n); this._floatText(px, py, `+${loot.n} ${loot.label}`, { color: '#b388ff', size: 0.6, life: 1.4 }); }
      this.hud?.bigToast(
        `🌀 <b>Rift Crossover</b><br><small>${bleed.first ? 'A parallel thread opens. ' : ''}+${windfall} CP${loot ? ` and ${loot.n}× ${loot.label}` : ''} crosses over.</small>`,
        4200,
      );
    } else {
      this.audio?.play('mine');
      this.particles.fountain(px, py, ['#8e6bd6', '#7be4ff', '#cfd0ff'], 22);
      this.civ.addCP(8 * this.powerups.multiplier('cpMultiplier'));
      // A glitch leaves an impossible tile from another reality nearby to find.
      const placed = this._placeGlitchTile();
      this.hud?.bigToast(
        `⌁ <b>Glitch in the Matrix</b><br><small>${bleed.first ? 'Two timelines overlap for a heartbeat. ' : 'Reality stutters. '}${placed ? 'A tile from another reality bleeds in nearby.' : 'An echo bleeds through.'}</small>`,
        3600,
      );
    }
  }

  /** Tangible loot a rift pulls across — biased to out-of-era treasures. */
  _riftLoot() {
    const pool = ['crystal', 'machine_part', 'steel', 'gold', 'trade_bead', 'iron'];
    const id = pool[(Math.random() * pool.length) | 0];
    const item = getItem(id);
    if (!item) return null;
    return { id, n: 1 + ((Math.random() * 2) | 0), label: item.label || id };
  }

  /** Place a single "impossible" out-of-era block on solid ground near the player. */
  _placeGlitchTile() {
    if (this.eraId === 'cell') return false;
    const choices = ['crystal_ore', 'conveyor', 'standing_stone', 'fossil_bed', 'lamp_post', 'magma'];
    const id = blockId(choices[(Math.random() * choices.length) | 0]);
    if (id == null) return false;
    const px = Math.round(this.player.x);
    for (let tries = 0; tries < 24; tries++) {
      const x = px + (((Math.random() * 16) | 0) - 8);
      const surf = this.world.heightMap[x - this.world.originX] ?? null;
      // Find an air tile sitting on solid ground in a small vertical scan.
      for (let y = Math.round(this.player.y) - 6; y <= Math.round(this.player.y) + 6; y++) {
        if (this.world.get(x, y) === AIR && isSolid(this.world.get(x, y + 1))) {
          this.world.set(x, y, id);
          this.particles.fountain(x + 0.5, y + 0.5, ['#8e6bd6', '#7be4ff', '#fff'], 14);
          return true;
        }
      }
    }
    return false;
  }

  /**
   * The nested-simulation revelation arc: spaced out so each beat lands as a
   * moment, and gated by Simulation against the player's real run (era reached,
   * how far the Timeline has bent, their world seed). This is the slow dawning
   * that the world is a layer in a deeper stack.
   */
  _updateSimulation(dt) {
    if (this.mode !== MODE.SURVIVAL || !this.simulation || !this.timeline) return;
    this._simTimer = (this._simTimer || 0) + dt;
    if (this._simTimer < 6) return;
    this._simTimer = 0;
    const ctx = {
      eraOrder: getEra(this.eraId)?.order ?? 0,
      divergence: this.timeline.divergence || 0,
      crossovers: this.timeline.crossovers || 0,
      branches: this.timeline.divergedCount?.() || 0,
      clues: this.clues?.count?.() || 0,
      seed: this.world?.seed ?? 0,
    };
    const rev = this.simulation.update(ctx);
    if (!rev) return;
    this.audio?.play('unlock');
    this.particles.fountain(this.player.x, this.player.y - 1, ['#7be4ff', '#b388ff', '#cfd0ff', '#fff'], 30);
    this.hud?.bigToast(`${rev.icon} <b>${rev.title}</b><br><small>${rev.text}</small>`, 5200);
  }

  /** Detect completion of the daily challenge goal and celebrate it once. */
  _updateDaily(dt) {
    const d = this.daily;
    if (!d || d._done || this.mode !== MODE.SURVIVAL) return;
    if (!d.goal?.done?.(this)) return;
    d._done = true;
    const streak = this.onDailyComplete?.(d.dateKey) || 0;
    this.audio?.play('unlock');
    this.haptics?.buzz('unlock');
    this.particles.fountain(this.player.x, this.player.y - 1, ['#f4d24a', '#6fc04e', '#7be4ff', '#fff'], 44);
    this.hud?.bigToast?.(
      `🗓️ <b>Daily Challenge complete!</b><br><small>${d.goal.text}${streak > 1 ? ` · 🔥 ${streak}-day streak` : ''}</small>`,
      4200,
    );
  }

  /** Award achievements (throttled) and celebrate each unlock. */
  _updateAchievements(dt) {
    if (!this.achievements) return;
    this._achTimer = (this._achTimer || 0) + dt;
    if (this._achTimer < 1.5) return;
    this._achTimer = 0;
    const newly = this.achievements.evaluate(this);
    for (const a of newly) {
      this.audio?.play('unlock');
      this.particles.fountain(this.player.x, this.player.y - 1, ['#f4d24a', '#fff0a8', '#6fc04e', '#fff'], 26);
      this.haptics?.buzz('unlock');
      this.hud?.bigToast?.(`🏆 <b>${a.name}</b><br><small>${a.desc}</small>`, 2800);
    }
  }

  _updateGuidanceHints(dt) {
    if (!this.guidance || !this.hud) return;
    const hint = this.guidance.update(dt, this);
    if (!hint) return;
    this.hud.toast(`${hint.icon} ${hint.text}`, 4200);
  }

  _trackAnimalFriendship(dt) {
    if (this.mode !== MODE.SURVIVAL || !this.mobs.length) return;
    const near = this.mobs.some((m) => Math.hypot(m.x - this.player.x, m.y - this.player.y) < 3);
    this.animalPeaceTime = near ? this.animalPeaceTime + dt : Math.max(0, this.animalPeaceTime - dt * 0.5);
    if (this.eraId === 'stone') {
      const nearGrazer = this.mobs.some((m) => (m.type === 'stego' || m.type === 'trike') &&
        Math.hypot(m.x - this.player.x, m.y - this.player.y) < 4);
      this.grazerBondTime = nearGrazer ? (this.grazerBondTime || 0) + dt : Math.max(0, (this.grazerBondTime || 0) - dt * 0.35);
      if ((this.grazerBondTime || 0) >= 10 && !this.mobs.some((m) => m.tamed)) {
        const grazer = this.mobs.find((m) => (m.type === 'stego' || m.type === 'trike') &&
          Math.hypot(m.x - this.player.x, m.y - this.player.y) < 4);
        if (grazer) this._tameGrazer(grazer);
      }
    }
  }

  _tameGrazer(grazer) {
    grazer.tamed = true;
    grazer.command = 'follow';
    grazer.health = Math.max(grazer.health, grazer.def.hp || grazer.health);
    this.civ.addCP(18 * (this.powerups?.multiplier('cpMultiplier') || 1));
    this.powerups?.grant?.('grazer_bond');
    this.audio?.play('objective');
    this.particles.fountain(grazer.x, grazer.y - 1, ['#6fc04e', '#f4d24a', '#fff'], 24);
    this.hud?.bigToast(`🌿 <b>Grazer companion</b><br><small>Your bond turned a ${grazer.type} into a town guardian.</small>`, 3200);
  }

  _cycleCompanionCommand() {
    const companion = this._nearestCompanion();
    if (!companion) {
      this.hud?.toast('No grazer companion nearby', 1400);
      return null;
    }
    const order = ['follow', 'stay', 'guard'];
    const next = order[(order.indexOf(companion.command || 'follow') + 1) % order.length];
    companion.command = next;
    this.audio?.play('ui');
    const label = next === 'follow' ? 'Follow me' : next === 'stay' ? 'Stay here' : 'Guard town';
    this.hud?.toast(`🌿 Companion: ${label}`, 1800);
    return next;
  }

  _toggleMountCompanion() {
    const mounted = this._mountedCompanion();
    if (mounted) {
      mounted.mounted = false;
      mounted.command = 'follow';
      mounted.x = this.player.x - this.player.facing * 1.1;
      mounted.y = this.player.y;
      this.audio?.play('ui');
      this.hud?.toast('🌿 Dismounted companion', 1500);
      return false;
    }
    const companion = this._nearestCompanion(3);
    if (!companion) {
      this.hud?.toast('Stand near your grazer to mount', 1400);
      return null;
    }
    for (const m of this.mobs || []) m.mounted = false;
    companion.mounted = true;
    companion.command = 'follow';
    this._syncMountedCompanion(companion);
    this.audio?.play('objective');
    this.hud?.toast('🌿 Mounted grazer: faster travel', 1800);
    return true;
  }

  _toggleCompanionCargo() {
    const companion = this._mountedCompanion() || this._nearestCompanion(4);
    if (!companion) {
      this.hud?.toast('Stand near your grazer cargo', 1400);
      return null;
    }
    companion.cargo = companion.cargo || [];
    const selected = this.inventory.selectedItem();
    if (selected) {
      const n = selected.n;
      const leftover = this._cargoAdd(companion, selected.id, n);
      const moved = n - leftover;
      if (!moved) {
        this.hud?.toast('Grazer cargo is full', 1400);
        return false;
      }
      this.inventory.consumeSelected(moved);
      this.audio?.play('ui');
      this.hud?.toast(`📦 Stashed ${moved} ${getItem(selected.id)?.label || selected.id}`, 1600);
      return true;
    }
    const first = companion.cargo.find((s) => s && s.n > 0);
    if (!first) {
      this.hud?.toast('Grazer cargo is empty', 1200);
      return false;
    }
    const leftover = this.inventory.add(first.id, first.n);
    const moved = first.n - leftover;
    if (!moved) {
      this.hud?.toast('Inventory is full', 1400);
      return false;
    }
    first.n = leftover;
    companion.cargo = companion.cargo.filter((s) => s && s.n > 0);
    this.audio?.play('ui');
    this.hud?.toast(`📦 Retrieved ${moved} ${getItem(first.id)?.label || first.id}`, 1600);
    return true;
  }

  _cargoAdd(companion, id, n) {
    companion.cargo = companion.cargo || [];
    const max = getItem(id)?.stack ?? 99;
    for (const s of companion.cargo) {
      if (s.id !== id || s.n >= max) continue;
      const take = Math.min(max - s.n, n);
      s.n += take;
      n -= take;
      if (n <= 0) return 0;
    }
    while (n > 0 && companion.cargo.length < 6) {
      const take = Math.min(max, n);
      companion.cargo.push({ id, n: take });
      n -= take;
    }
    return n;
  }

  _companionCargoSummary() {
    const c = this._mountedCompanion() || this._nearestCompanion(6) || (this.mobs || []).find((m) => m.tamed);
    if (!c) return null;
    const used = (c.cargo || []).filter((s) => s && s.n > 0).length;
    const total = (c.cargo || []).reduce((sum, s) => sum + (s?.n || 0), 0);
    return { used, capacity: 6, total };
  }

  _mountedCompanion() {
    return (this.mobs || []).find((m) => m.tamed && m.mounted) || null;
  }

  _syncMountedCompanion(companion = this._mountedCompanion()) {
    if (!companion || !this.player) return;
    companion.x = this.player.x - this.player.facing * 0.2;
    companion.y = this.player.y;
    companion.vx = this.player.vx;
    companion.vy = this.player.vy;
    companion.facing = this.player.facing || companion.facing;
  }

  _nearestCompanion(radius = 6) {
    let best = null;
    for (const m of this.mobs || []) {
      if (!m.tamed) continue;
      const d = Math.hypot(m.x - this.player.x, m.y - this.player.y);
      if (d <= radius && (!best || d < best.d)) best = { mob: m, d };
    }
    return best?.mob || null;
  }

  _mobTargetContext(mob = null) {
    if (mob?.tamed) {
      if ((mob.command || 'follow') === 'stay') return null;
      if (mob.command === 'guard' && this.settlers?.home) {
        return { x: this.settlers.home.x, y: this.settlers.home.y, alive: true };
      }
      return this.player;
    }
    if (this.eraId === 'stone') {
      const packPressure = this.mobs.filter((m) => (m.type === 'raptor' || m.type === 'alpha_raptor') &&
        Math.hypot(m.x - this.player.x, m.y - this.player.y) < 10).length;
      const rexDistance = this._nearestMobDistance('rex');
      const defended = this._hasDinoDefense();
      return Object.assign(Object.create(this.player), this.player, {
        packPressure,
        fearExposed: rexDistance != null && rexDistance < 13 && !defended,
        defended,
      });
    }

    // Iron-age physical sieges: raiders/bandits (and industrial machines) march
    // on the settlement and smash through walls to reach it. Close to the player
    // they switch to chasing them directly. Walls become a real, breakable
    // defense — see Mob._tryBreakWall / Game._raiderBreakWall.
    if (mob && (mob.type === 'raider' || mob.type === 'bandit' || mob.type === 'machine')) {
      const home = this.settlers?.home;
      const chasePlayer = !home || Math.abs(mob.x - this.player.x) < 11;
      return Object.assign(Object.create(this.player), this.player, {
        canBreakWalls: true,
        siege: home ? !chasePlayer : false,
        chasePlayer,
        goalX: home?.x,
        goalY: home?.y,
      });
    }
    return this.player;
  }

  _updateDinosaurPressure(dt) {
    if (this.mode !== MODE.SURVIVAL || this.eraId !== 'stone') {
      this.dinoStatus = null;
      return;
    }
    const packPressure = this.mobs.filter((m) => (m.type === 'raptor' || m.type === 'alpha_raptor') &&
      Math.hypot(m.x - this.player.x, m.y - this.player.y) < 10).length;
    const rexDistance = this._nearestMobDistance('rex');
    const defended = this._hasDinoDefense();
    const fear = rexDistance != null && rexDistance < 13 && !defended;
    const alphaDistance = this._nearestMobDistance('alpha_raptor');
    const companion = this.mobs.find((m) => m.tamed);
    const command = companion?.command || null;
    const mounted = !!this._mountedCompanion();
    const cargo = this._companionCargoSummary();
    if (fear) {
      this.player.hunger = Math.max(0, this.player.hunger - dt * 0.16);
      if (!this.reduceMotion && Math.random() < dt * 0.6) this.hud?.shake?.();
    }
    this.dinoStatus = {
      packPressure,
      rexDistance,
      alphaDistance,
      defended,
      grazerBond: Math.min(100, Math.round(((this.grazerBondTime || 0) / 10) * 100)),
      companion: !!companion,
      command,
      mounted,
      cargo,
      warning: alphaDistance != null && alphaDistance < 13 ? 'alpha raptor challenge' :
        fear ? 'T-Rex fear zone' : packPressure >= 2 ? 'raptor pack nearby' :
        mounted ? 'mounted grazer' : companion ? `grazer: ${command || 'follow'}` : defended ? 'defenses steady' : '',
    };
  }

  _nearestMobDistance(type) {
    let best = null;
    for (const m of this.mobs) {
      if (m.type !== type) continue;
      const d = Math.hypot(m.x - this.player.x, m.y - this.player.y);
      if (best == null || d < best) best = d;
    }
    return best;
  }

  _hasDinoDefense(radius = 7) {
    if (this.structures?.has('defended_camp') || this.structures?.has('watchtower')) return true;
    if (this.mobs?.some((m) => m.tamed && Math.hypot(m.x - this.player.x, m.y - this.player.y) < 10)) return true;
    if (this.settlers?.home && this.mobs?.some((m) => m.tamed && m.command === 'guard' &&
        Math.hypot(m.x - this.settlers.home.x, m.y - this.settlers.home.y) < 10)) return true;
    // Guards in the settlement help defend it: 2+ guards count as defense when
    // you're near the town center.
    if ((this.townGuards || 0) >= 2 && this.settlers?.home &&
        Math.abs(this.player.x - this.settlers.home.x) < 16) return true;
    const px = Math.floor(this.player.x);
    const py = Math.floor(this.player.y);
    let defense = 0;
    for (let y = py - radius; y <= py + radius; y++) {
      for (let x = px - radius; x <= px + radius; x++) {
        const b = getBlock(this.world.get(x, y));
        if (b.name === 'torch' || b.name === 'campfire' || b.name === 'hide_wall') defense++;
      }
    }
    return defense >= 4;
  }

  /** Spawn a rising world-space label (juice). Skipped under reduce-motion. */
  _floatText(x, y, text, opts = {}) {
    if (this.reduceMotion || !this.floaters) return;
    this.floaters.add(x, y, text, opts);
  }

  _hitMob(mob) {
    const weapon = this.inventory.selectedItem();
    const weaponDef = weapon ? getItem(weapon.id) : null;
    const damage = weaponDef?.kind === 'weapon' ? weaponDef.damage : 4;
    const dead = mob.hurt(damage);
    this.audio?.play('hurt');
    this.particles.burst(mob.x, mob.y - mob.h / 2, mob.hostile ? '#ff7b6b' : '#cf5d6a', 8);
    this._floatText(mob.x, mob.y - mob.h, `-${damage}`, { color: '#ffd36b', dx: (Math.random() - 0.5) * 0.4 });
    if (!dead) return;
    this.mobs.splice(this.mobs.indexOf(mob), 1);
    if (this.mode === MODE.SURVIVAL) {
      if (mob.hostile) {
        if (mob.def.drop) this.inventory.add(mob.def.drop, mob.def.dropN || 1);
      } else {
        this.inventory.add('raw_food', mob.def.food);
      }
    }
    const cp = mob.def.cp || 2;
    this.civ.onDefeat(mob.type);
    this.civ.addCP(cp * (this.powerups?.multiplier('cpMultiplier') || 1));
    this._floatText(mob.x, mob.y - mob.h, `+${cp} CP`, { color: '#9be86a', size: 0.55, life: 1.1 });
    this.haptics?.buzz('defeat');
    if (this.mode === MODE.SURVIVAL) this._comboHit(mob.x, mob.y - mob.h);
    this.hud.toast(mob.hostile ? `Defeated a ${mob.type} (+${cp} CP)` : `Caught a ${mob.type}`);
  }

  _overlapsPlayer(x, y) {
    const p = this.player;
    return x >= Math.floor(p.x - p.w / 2) && x <= Math.floor(p.x + p.w / 2) &&
           y >= Math.floor(p.y - p.h) && y <= Math.floor(p.y);
  }

  /** True if any of the 4 orthogonal neighbors is non-air (a placement anchor). */
  _hasNeighbor(x, y) {
    return this.world.get(x - 1, y) !== AIR || this.world.get(x + 1, y) !== AIR ||
           this.world.get(x, y - 1) !== AIR || this.world.get(x, y + 1) !== AIR;
  }

  /**
   * Gravity for falling blocks (sand/gravel): if (x,y) holds a falling block
   * with air beneath, drop it as far as it can go. Cheap and localized — called
   * right after a block is removed or placed nearby.
   */
  _settleFalling(x, y) {
    if (!this.world.inBounds(x, y)) return;
    const id = this.world.get(x, y);
    if (id === AIR || !fallsOf(id)) return;
    let ny = y;
    while (this.world.inBounds(x, ny + 1) && this.world.get(x, ny + 1) === AIR) ny++;
    if (ny === y) return;
    this.world.set(x, y, AIR);
    this.world.set(x, ny, id);
    const b = getBlock(id);
    if (b.colors) this.particles.burst(x + 0.5, ny + 0.5, b.colors.base, 4, { gravity: 14, life: 0.25 });
    this.audio?.play('step');
    // A block that fell may expose another above it.
    this._settleFalling(x, y - 1);
  }

  /**
   * Settlers bring the civilization to life. They only exist once you have a
   * recognized settlement (a town home) and a population to draw on; the cell
   * era has no citizens. Their "work" trickles Civ Points back.
   */
  _updateSettlers(dt) {
    if (!this.settlers || this.eraId === 'cell' || this.mode !== MODE.SURVIVAL) return;
    // Anchor the town to the first hut/camp/workshop the player builds.
    if (!this.settlers.home && (this.structures?.has('hut') || this.structures?.has('camp') || this.structures?.has('workshop'))) {
      this.settlers.setHome(Math.round(this.player.x), Math.round(this.player.y));
      this.hud?.toast('🏘️ Your settlement attracts its first villagers', 2600);
    }
    const out = this.settlers.update(dt, this.world, this.civ);
    if (out.cp > 0) this.civ.addCP(out.cp * (this.powerups?.multiplier('cpMultiplier') || 1));
    // Farmers feed the town: a fed settlement slowly tops up the player's
    // hunger near home, so growing a food economy has a survival payoff.
    if (out.produced.food && this.player.hunger < 100 &&
        Math.abs(this.player.x - this.settlers.home.x) < 14) {
      this.player.eat(out.produced.food * 0.5);
    }
    this.townGuards = out.guards; // used to deter raids near the settlement
  }

  _spawnMobs(dt) {
    if (this.prelife?.active) return;
    this.mobTimer -= dt;
    if (this.mobTimer > 0 || this.mobs.length >= 9) return;
    this.mobTimer = 4 + Math.random() * 3;

    const theme = getEraTheme(this.eraId, this.world?.variant);
    const isDay = this.dayFactor() > 0.4;

    // Decide passive vs hostile. Hostiles come out at night (or any time in
    // eras flagged hostileDay), and only in Survival.
    const wantHostile = this.mode === MODE.SURVIVAL && theme.hostile.length &&
      (!isDay || theme.hostileDay) && Math.random() < (theme.hostileChance ?? 0.6);
    const table = wantHostile ? theme.hostile : theme.passive;
    if (!table || !table.length) return;
    const type = weightedPick(table);
    if (!type || !MOB_TYPES[type]) return;

    if (theme.float) this._spawnFloatMob(type);
    else this.spawnMobNearPlayer(type);
  }

  /** Spawn a floating microbe/phage in open water a short distance away. */
  _spawnFloatMob(type) {
    if (this.mobs.length >= 10) return false;
    for (let tries = 0; tries < 8; tries++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 6 + Math.random() * 6;
      const sx = Math.round(this.player.x + Math.cos(ang) * dist);
      const sy = Math.round(this.player.y + Math.sin(ang) * dist);
      if (!this.world.inBounds(sx, sy)) continue;
      // Open water/empty tile (not inside solid rock).
      if (isSolid(this.world.get(sx, sy))) continue;
      this.mobs.push(new Mob(type, sx + 0.5, sy + 0.5));
      return true;
    }
    return false;
  }

  spawnMobNearPlayer(type) {
    if (!type || !MOB_TYPES[type] || this.mobs.length >= 12) return false;
    // A well-watched town turns away some lone scouts, but most raiders now come
    // and test the walls themselves — physical defense (walls/gates) is the point.
    if ((type === 'raider' || type === 'bandit') && this._hasTownDefense() && Math.random() < 0.4) {
      this.hud?.toast('🛡️ Town watch turned away a scout', 1800);
      return false;
    }
    const dir = Math.random() < 0.5 ? -1 : 1;
    const sx = Math.floor(this.player.x + dir * (12 + Math.random() * 6));
    if (sx < 1 || sx >= this.world.width - 1) return false;
    const surf = this.world.heightMap[sx];
    if (!isSolid(this.world.get(sx, surf))) return false;
    this.mobs.push(new Mob(type, sx + 0.5, surf));
    return true;
  }

  spawnSiege(type = 'bandit', count = 2) {
    if (!MOB_TYPES[type]) return 0;
    let spawned = 0;
    for (let i = 0; i < count && this.mobs.length < 14; i++) {
      const dir = i % 2 === 0 ? -1 : 1;
      const base = Math.floor(this.player.x + dir * (10 + i * 2));
      // Probe outward for a column with solid ground so a requested raid never
      // silently under-spawns on water/caves (search is bounded).
      let placed = false;
      for (let off = 0; off <= 8 && !placed; off++) {
        for (const s of off === 0 ? [0] : [off, -off]) {
          const sx = base + dir * s;
          if (sx < 1 || sx >= this.world.width - 1) continue;
          const surf = this.world.heightMap[sx];
          if (surf == null || !isSolid(this.world.get(sx, surf))) continue;
          this.mobs.push(new Mob(type, sx + 0.5, surf));
          spawned++;
          placed = true;
          break;
        }
      }
    }
    if (spawned) this.hud?.toast('⚔️ Siege raid incoming', 2200);
    return spawned;
  }

  /**
   * A marauder is chewing on a wall tile. Walls have no stored HP, so we track
   * transient siege damage in a Map keyed by tile and scale the threshold to the
   * block's mining hardness — a cobblestone rampart outlasts a thatch hut. When
   * a tile's integrity is spent it collapses (and any block above it settles).
   */
  _raiderBreakWall(mob, pos, dps = 10) {
    if (!pos || this.mode !== MODE.SURVIVAL) return;
    const { x, y } = pos;
    const id = this.world.get(x, y);
    const b = getBlock(id);
    if (!b.solid || b.hardness === Infinity) return; // never gnaw bedrock
    if (!this._wallDamage) this._wallDamage = new Map();
    const key = `${x},${y}`;
    const integrity = Math.max(6, (b.hardness || 1) * 8);
    const dmg = (this._wallDamage.get(key) || 0) + dps;
    this.audio?.play('mine');
    this.particles.burst(x + 0.5, y + 0.5, b.colors?.base || '#999', 5, { gravity: 10, life: 0.3 });
    if (dmg >= integrity) {
      this._wallDamage.delete(key);
      this.world.set(x, y, AIR);
      this.particles.burst(x + 0.5, y + 0.5, b.colors?.base || '#999', 12, { gravity: 14, life: 0.5 });
      this._settleFalling(x, y - 1);
      const t = Date.now();
      if (!this._lastBreachToast || t - this._lastBreachToast > 2500) {
        this._lastBreachToast = t;
        if (!this.reduceMotion) this.hud?.shake?.();
        this.hud?.toast('⚔️ Raiders breached a wall!', 2200);
      }
    } else {
      this._wallDamage.set(key, dmg);
    }
  }

  /**
   * Telegraph an incoming siege: sound the horn, raise a HUD warning, and open a
   * short muster window before the raiders actually arrive — so defending becomes
   * an active decision (rush back, raise walls, light the gate) instead of a
   * surprise. Returns true if a raid was scheduled.
   */
  telegraphRaid({ type = 'bandit', count = 3, delay = 14 } = {}) {
    if (this.mode !== MODE.SURVIVAL || this.pendingRaid) return false;
    this.pendingRaid = { type, count, timer: delay, total: delay };
    this.audio?.play('horn');
    if (!this.reduceMotion) this.hud?.shake?.();
    this.hud?.bigToast(
      `📯 <b>Raiders sighted!</b><br><small>~${Math.round(delay)}s to muster — raise walls, light the gate, and rally at your town.</small>`,
      3200,
    );
    return true;
  }

  /** Count down a telegraphed raid; spawn it (with a rally bonus) when it lands. */
  _updateRaidTelegraph(dt) {
    if (this.rallyBuff > 0) this.rallyBuff = Math.max(0, this.rallyBuff - dt);
    const pr = this.pendingRaid;
    if (!pr) { this.raidStatus = null; return; }
    pr.timer -= dt;
    if (pr.timer > 0) {
      this.raidStatus = { secondsLeft: Math.ceil(pr.timer), count: pr.count, fraction: 1 - pr.timer / pr.total };
      return;
    }
    // The raid arrives. Mustering at the town (player near home) rallies the
    // militia: guards fight at doubled strength for a window.
    this.pendingRaid = null;
    this.raidStatus = null;
    const home = this.settlers?.home;
    const mustered = home && Math.abs(this.player.x - home.x) < 13;
    if (mustered) this.rallyBuff = 18;
    const spawned = this.spawnSiege(pr.type, pr.count);
    if (spawned) {
      this.audio?.play('horn');
      this.hud?.bigToast(
        mustered
          ? '⚔️ <b>The raid is here!</b><br><small>🛡️ You rallied the town — guards fight at full strength.</small>'
          : '⚔️ <b>The raid is here!</b><br><small>No one rallied the defense — the militia is on its own.</small>',
        2800,
      );
    }
  }

  /**
   * Closes the siege loop once raiders reach the settlement: the town militia
   * (guards) sallies out to fight them within a defensive perimeter, and any
   * raider that makes it to the town center pillages — looting the stockpile and
   * battering town buildings. Defense architecture + guards now have stakes:
   * walls buy time, guards win the fight, an undefended breach costs you.
   */
  _updateRaiders(dt) {
    if (this.mode !== MODE.SURVIVAL) return;
    const home = this.settlers?.home;
    if (!home) return;
    const guards = this.townGuards || 0;
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i];
      if (m.tamed) continue;
      if (m.type !== 'raider' && m.type !== 'bandit' && m.type !== 'machine') continue;
      const dxHome = Math.abs(m.x - home.x);

      // Guards sally out: militia engages raiders within the town's perimeter,
      // dealing steady damage scaled by how many guards the town supports.
      if (guards > 0 && dxHome < 9 && Math.abs(m.y - home.y) < 6) {
        m._guardCd = (m._guardCd || 0) - dt;
        if (m._guardCd <= 0) {
          m._guardCd = 0.8;
          this.particles.burst(m.x, m.y - m.h / 2, '#ffd36b', 6);
          // A rallied defense (player mustered at the town) doubles guard punch.
          const guardPunch = (2 + guards * 1.5) * (this.rallyBuff > 0 ? 2 : 1);
          if (m.hurt(guardPunch)) {
            this.mobs.splice(i, 1);
            this.civ.onDefeat(m.type);
            this.civ.addCP((m.def.cp || 4) * 0.5 * (this.powerups?.multiplier('cpMultiplier') || 1));
            const t = Date.now();
            if (!this._lastGuardToast || t - this._lastGuardToast > 3000) {
              this._lastGuardToast = t;
              this.hud?.toast('🛡️ Town guards cut down a raider', 2000);
            }
            continue;
          }
        }
      }

      // Pillage: a raider at the town center wrecks the economy.
      if (dxHome < 3.2 && Math.abs(m.y - home.y) < 4) {
        m._pillageCd = (m._pillageCd || 0) - dt;
        if (m._pillageCd <= 0) {
          m._pillageCd = 1.4;
          this._pillageTown(m);
        }
      }
    }
  }

  /** A raider loots the town stockpile and batters the nearest town building. */
  _pillageTown(m) {
    const st = this.settlers?.stock;
    let looted = false;
    if (st) {
      for (const k of ['food', 'wheat', 'ore', 'wood']) {
        if ((st[k] || 0) > 0) { st[k] = Math.max(0, st[k] - 2); looted = true; break; }
      }
    }
    const wrecked = this._damageTownStructure(m);
    if (this.civ) this.civ.cp = Math.max(0, this.civ.cp - 1); // civic unrest
    this.particles.burst(m.x, m.y - m.h / 2, '#c8502f', 8, { gravity: 8 });
    this.audio?.play('hurt');
    if (wrecked || looted) {
      const t = Date.now();
      if (!this._lastPillageToast || t - this._lastPillageToast > 3000) {
        this._lastPillageToast = t;
        if (!this.reduceMotion) this.hud?.shake?.();
        this.hud?.toast(wrecked ? `🔥 Raiders wrecked your ${wrecked}!` : '🔥 Raiders are looting the town!', 2400);
      }
    }
  }

  /** Chip the nearest town building near a raider; collapse it when spent. */
  _damageTownStructure(m) {
    const cx = Math.round(m.x);
    const cy = Math.round(m.y);
    for (let y = cy - 2; y <= cy + 2; y++) {
      for (let x = cx - 2; x <= cx + 2; x++) {
        const b = getBlock(this.world.get(x, y));
        if (!b.solid || !TOWN_BUILDINGS.has(b.name)) continue;
        if (!this._wallDamage) this._wallDamage = new Map();
        const key = `${x},${y}`;
        const integrity = Math.max(8, (b.hardness || 1) * 8);
        const dmg = (this._wallDamage.get(key) || 0) + (m.def.damage || 10);
        this.particles.burst(x + 0.5, y + 0.5, b.colors?.base || '#999', 5, { gravity: 8 });
        if (dmg >= integrity) {
          this._wallDamage.delete(key);
          this.world.set(x, y, AIR);
          this.civ?.onStructureLost(b.name);
          this._settleFalling(x, y - 1);
          return b.label || b.name;
        }
        this._wallDamage.set(key, dmg);
        return null;
      }
    }
    return null;
  }

  _hasTownDefense() {
    const blockDefense = (this.civ?.defense || 0) + (this.civ?.light || 0) * 0.4;
    const guards = (this.townGuards || 0) * 1.5;
    let grazer = 0;
    for (const m of this.mobs || []) {
      if (!m.tamed) continue;
      if (m.command === 'guard' && this.settlers?.home) {
        if (Math.hypot(m.x - this.settlers.home.x, m.y - this.settlers.home.y) < 10) {
          grazer = Math.max(grazer, 4);
          continue;
        }
      }
      if (Math.hypot(m.x - this.player.x, m.y - this.player.y) < 10) grazer = Math.max(grazer, 3);
    }
    return blockDefense + guards + grazer >= 4;
  }

  _updateTownEconomy(dt) {
    if (!this.settlers?.home || this.mode !== MODE.SURVIVAL) return;
    const st = this.settlers.stock || {};
    const storageCap = 20 + (this.civ.storage || 0);
    for (const key of ['food', 'wheat', 'wood', 'ore']) {
      if ((st[key] || 0) > storageCap) st[key] = storageCap;
    }
    // Branch identity: the Trade Republic trades far more often, and richer.
    const mods = this.eraMods || {};
    const interval = 12 / (mods.tradeRate || 1);
    const yieldMult = mods.tradeYield || 1;
    this._tradeTimer = (this._tradeTimer || 0) + dt;
    if (this._tradeTimer < interval) return;
    this._tradeTimer = 0;
    if ((this.civ.trade || 0) <= 0) return;
    if ((st.wheat || 0) >= 4 || (st.ore || 0) >= 3) {
      if ((st.wheat || 0) >= 4) st.wheat -= 4;
      else st.ore -= 3;
      this.civ.onTrade((5 + (this.civ.trade || 0)) * yieldMult);
      this.hud?.toast('🏺 Market traded town surplus for CP', 1800);
    }
    if ((this.civ.placed?.caravan_post || 0) > 0 && ((st.food || 0) >= 5 || (st.wheat || 0) >= 6)) {
      if ((st.wheat || 0) >= 6) st.wheat -= 6;
      else st.food -= 5;
      this.inventory.add('trade_bead', 1);
      this.civ.onTrade((10 + (this.civ.trade || 0)) * yieldMult);
      this.hud?.toast('🐪 Caravan returned with a trade bead', 2200);
    }
  }

  /**
   * Industrial automation as a real supply chain:
   *   auto miner → ore → smelter → steel → factory → machine parts.
   * Each stage consumes the previous good from the town stock, emits pollution,
   * and pays CP that scales up the chain — so the late game is an automation
   * power-fantasy where stacking machines compounds your output. Windmills scrub
   * the pollution all of this produces.
   */
  _updateAutomation(dt) {
    const miners = this.civ?.placed?.auto_miner || 0;
    const windmills = this.civ?.placed?.windmill || 0;
    const smelters = this.civ?.placed?.smelter || 0;
    const factories = this.civ?.placed?.factory || 0;
    if (this.mode !== MODE.SURVIVAL || (!miners && !windmills && !smelters && !factories)) {
      this.industryStatus = null;
      return;
    }
    if (this.settlers && !this.settlers.stock) this.settlers.stock = {};
    const stock = this.settlers?.stock || {};

    // Re-evaluate the supply + power networks periodically (read-only world scan).
    this._industryTimer = (this._industryTimer || 0) + dt;
    if (!this.industryNet || !this.powerNet || this._industryTimer >= 1.2) {
      this._industryTimer = 0;
      const cx = this.settlers?.home?.x ?? this.player.x;
      const cy = this.settlers?.home?.y ?? this.player.y;
      this.industryNet = this.industry.evaluate(this.world, cx, cy);
      this.powerNet = this.power.evaluate(this.world, cx, cy);
    }
    // Two stacking efficiency axes: conveyor supply lines feed factories, the
    // power grid energizes machines. A fully wired AND powered line is a beast.
    const convEff = this.industryNet?.efficiency || 1;
    const powerEff = 1 + 0.5 * (this.powerNet?.poweredFraction || 0);
    const eff = convEff * powerEff;
    const fed = this.industryNet?.fedFraction || 0;
    const generators = this.powerNet?.generators || 0;

    // Generators burn fuel — a steady smog source; windmills scrub pollution.
    if (generators) this.civ.pollution = (this.civ.pollution || 0) + dt * 0.05 * generators;
    if (windmills) this.civ.pollution = Math.max(0, (this.civ.pollution || 0) - dt * 0.025 * windmills);

    // Stage 1 — auto miners dig ore every 10s.
    if (miners) {
      this._autoMineTimer = (this._autoMineTimer || 0) + dt;
      if (this._autoMineTimer >= 10) {
        this._autoMineTimer = 0;
        const produced = Math.max(1, miners);
        stock.ore = (stock.ore || 0) + produced;
        this.civ.pollution = Math.max(0, (this.civ.pollution || 0) + 0.15 * miners - 0.12 * windmills);
        this.civ.addCP(1.5 * miners);
        this.hud?.toast(`⚙️ Auto miner produced ${produced} ore`, 1500);
      }
    }

    // Stage 2 — smelters refine 2 ore → 1 steel every 8s.
    if (smelters) {
      this._smeltTimer = (this._smeltTimer || 0) + dt;
      if (this._smeltTimer >= 8) {
        this._smeltTimer = 0;
        let made = 0;
        for (let i = 0; i < smelters; i++) {
          if ((stock.ore || 0) >= 2) { stock.ore -= 2; stock.steel = (stock.steel || 0) + 1; made++; }
        }
        if (made) {
          this.civ.pollution = Math.max(0, (this.civ.pollution || 0) + 0.2 * made - 0.12 * windmills);
          this.civ.addCP(3 * made);
          this.hud?.toast(`🔥 Smelter forged ${made} steel`, 1500);
        }
      }
    }

    // Stage 3 — factories assemble 2 steel → 1 machine part every 9s (the payoff).
    if (factories) {
      this._factoryTimer = (this._factoryTimer || 0) + dt;
      if (this._factoryTimer >= 9) {
        this._factoryTimer = 0;
        let made = 0;
        for (let i = 0; i < factories; i++) {
          if ((stock.steel || 0) >= 2) { stock.steel -= 2; stock.machine_part = (stock.machine_part || 0) + 1; made++; }
        }
        if (made) {
          // Connected supply lines boost throughput and cut smog per unit.
          const bonus = Math.round(made * (eff - 1));
          if (bonus > 0) stock.machine_part = (stock.machine_part || 0) + bonus;
          const total = made + bonus;
          const pollutionFactor = 1 - 0.45 * fed;
          this.civ.pollution = Math.max(0, (this.civ.pollution || 0) + 0.25 * made * pollutionFactor - 0.12 * windmills);
          this.civ.addCP(8 * total);
          this.hud?.toast(
            `🏭 Factory built ${total} machine part${total > 1 ? 's' : ''}${bonus > 0 ? ' 🔗' : ''} (+${8 * total} CP)`,
            1800,
          );
        }
      }
    }

    const net = this.industryNet || {};
    const pw = this.powerNet || {};
    this.industryStatus = {
      miners, smelters, factories, windmills, generators,
      ore: Math.round(stock.ore || 0),
      steel: Math.round(stock.steel || 0),
      parts: Math.round(stock.machine_part || 0),
      pollution: Math.round((this.civ.pollution || 0) * 10) / 10,
      conveyors: net.conveyors || 0,
      linkedFactories: net.linkedFactories || 0,
      linkedSmelters: net.linkedSmelters || 0,
      // Combined boost from supply lines × power, shown to the player as one %.
      efficiencyPct: Math.round((eff - 1) * 100),
      powerCapacity: pw.capacity || 0,
      powerLoad: pw.load || 0,
      poweredCount: pw.poweredCount || 0,
      powerOverloaded: !!pw.overloaded,
    };
  }

  /**
   * A phage nibble in the First Cell era: drains stability (and a little
   * hunger) rather than dealing hard HP damage, so the origin era has stakes
   * without being lethal. Repeated hits with no nutrients can still starve you.
   */
  _sapCell(amount, mob) {
    this.cellStability = Math.max(0, (this.cellStability ?? 50) - amount);
    this.player.hunger = Math.max(0, this.player.hunger - amount * 0.4);
    this.audio?.play('hurt');
    this.particles.burst(this.player.x, this.player.y - this.player.h / 2, '#c86bff', 6, { gravity: 2, life: 0.4 });
    if (!this.reduceMotion) this.hud?.shake?.();
    this.hud?.toast('🦠 A phage drains your membrane!', 1400);
    void mob;
  }

  _damagePlayer(amount, cause = 'the wilds') {
    if (/raptor|rex|boar|wolf/.test(cause)) amount *= this.powerups.multiplier('predatorDamage');
    this.player.health = Math.max(0, this.player.health - amount);
    this.player.vy = -7; // knockback pop
    this.lastDamageCause = cause;
    this.audio?.play('hurt');
    this.particles.burst(this.player.x, this.player.y - this.player.h / 2, '#ff5b5b', 8);
    this._floatText(this.player.x, this.player.y - this.player.h, `-${Math.round(amount)}`, { color: '#ff6b6b', size: 0.6 });
    this.haptics?.buzz('hurt');
    const lost = this.combo?.breakStreak?.() || 0; // a hit snaps your flow
    if (lost >= 12) this._floatText(this.player.x, this.player.y - this.player.h - 0.5, `Combo broken! ×${lost}`, { color: '#ff8a6b', size: 0.6, life: 1.2 });
    if (!this.reduceMotion) this.hud?.shake?.();
    if (this.player.health <= 0) this.player.alive = false;
  }

  /** 1 at noon, 0 at midnight. */
  dayFactor() {
    const t = this.clock / C.DAY_LENGTH;
    return (Math.sin((t - 0.25) * Math.PI * 2) + 1) / 2;
  }

  draw(dt) {
    this.renderer.render({
      world: this.world,
      camera: this.camera,
      player: this.player,
      mobs: this.mobs,
      settlers: this.settlers?.settlers || [],
      particles: this.particles,
      floaters: this.floaters,
      goal: (this.invOpen || this.craftOpen || this.journalOpen || this.marketOpen || this.mapOpen || this.paused) ? null : this.goalTarget,
      reduceMotion: this.reduceMotion,
      alternate: isAlternate(this.realityPath, this.eraId), // alt-timeline scene tint

      powerups: this.powerups,
      dayFactor: this.dayFactor(),
      tint: getEraTheme(this.eraId, this.world?.variant).tint,
      meteors: this.meteors,
      hover: this.hover,
      ghost: this.ghost,
      selectionStart: this.selectionStart,
      selectionEnd: this.selectionEnd,
      dt,
    });
  }
}
