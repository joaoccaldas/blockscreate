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
import { SettlerManager } from './systems/Settlers.js';
import { Camera } from './render/Camera.js';
import { Renderer } from './render/Renderer.js';
import { Particles } from './render/Particles.js';
import { Input, isTouch } from './input/Input.js';
import { HUD } from './ui/HUD.js';
import { SaveManager } from './persistence/SaveManager.js';
import { getBlock, dropsOf, isSolid, AIR, blockId, minTierOf, fallsOf } from './core/blocks.js';
import { getItem, isPlaceable } from './core/items.js';
import { getEra, nextEra } from './core/eras.js';
import { getEraTheme, weightedPick } from './core/eraTheme.js';

export class Game {
  constructor({ canvas, hudRoot, sprites, progress, settings, audio, onExit }) {
    this.canvas = canvas;
    this.sprites = sprites;
    this.unlocked = progress;
    this.settings = settings;
    this.audio = audio;
    this.onExit = onExit;
    this.renderer = new Renderer(canvas);
    this.renderer.setSprites(sprites);
    this.hudRoot = hudRoot;
    this.running = false;
    this.paused = false;
    this.buildMode = false;
    this.particles = new Particles();
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
  }

  // ---- lifecycle ----

  newWorld(eraId, mode) {
    this.dead = false;
    this.showIntro = true; // fresh era entry → show the era-reveal on start
    this.mode = mode;
    this.eraId = eraId;
    this.clock = C.DAY_LENGTH * 0.3;
    this.world = new World({ seed: (Math.random() * 1e9) | 0, eraId });
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
    this.settlers = new SettlerManager();
    this.mobs = [];
    this._grantStarter();
    this._setup();
  }

  loadSave(save) {
    this.dead = false;
    this.mode = save.mode;
    this.eraId = save.eraId;
    this.clock = save.clock ?? 0;
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
    this.settlers = new SettlerManager(save.settlers || null);
    this.mobs = (save.mobs || []).map((m) => Mob.load(m));
    this.animalPeaceTime = save.animalPeaceTime || 0;
    this.grazerBondTime = save.grazerBondTime || 0;
    this._setup();
  }

  _grantStarter() {
    const era = getEra(this.eraId);
    for (const id of era.starter || []) this.inventory.add(id, 1);
    if (this.mode === MODE.CREATIVE) {
      ['primordial_mud', 'nutrient_blob', 'mineral_vent', 'lipid_membrane',
        'grass', 'dirt', 'stone', 'cobblestone', 'sand', 'water', 'log', 'planks', 'leaves',
        'thatch', 'brick', 'torch', 'campfire', 'clay', 'gravel',
        'farm_plot', 'wheat_seeds', 'wheat_seedling', 'wheat_green', 'wheat_ripe',
        'granary', 'market', 'gate', 'road', 'auto_miner',
        'coal_ore', 'copper_ore', 'tin_ore', 'iron_ore', 'gold_ore']
        .forEach((id) => this.inventory.add(id, 99));
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
    this.invOpen = false;
    this.craftOpen = false;
    this.resize();
    this.camera.snap(this.player);
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);

    // Auto-pause when the tab is hidden or loses focus, so the player never
    // returns to a dead character or a huge time-skip; also flushes a save.
    this._onHide = () => {
      if (document.hidden && !this.paused && this.running) {
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
    this.last = performance.now();
    requestAnimationFrame(this._frame);
    this._introThenOnboard();
  }

  /** On a fresh era, reveal the era first, then run any first-time coach-marks. */
  _introThenOnboard() {
    if (this.showIntro && this.mode === MODE.SURVIVAL) {
      this.showIntro = false;
      this.paused = true;
      this.hud.showEraIntro(getEra(this.eraId), () => {
        this.paused = false;
        this._maybeOnboard();
      });
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
      onToggleJournal: () => this._toggleJournal(),
      onToggleBuild: () => { this.buildMode = !this.buildMode; },
      onPause: () => this._onPause(),
    };
  }

  _hudHandlers() {
    return {
      onHotbar: (i) => { this.inventory.selected = i; },
      onToggleInventory: () => this._toggleInventory(),
      onToggleCrafting: () => this._toggleCrafting(),
      onToggleJournal: () => this._toggleJournal(),
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
      onSave: () => SaveManager.save(this),
      onExport: () => SaveManager.exportFile(this),
      onImport: (f) => this._import(f),
      onMainMenu: () => this.hud.confirm('Return to the main menu?', 'Your game is saved automatically.', () => this.exit()),
      onAdvanceEra: () => this._advanceEra(),
      // Death screen
      onRespawn: () => this._respawn(),
      onDeathLoad: () => this.hud.confirm('Load your last save?', 'This reloads the world from the autosave.', () => { const s = SaveManager.load(); if (s) { this.stop(); this.loadSave(s); this.start(); } }),
      onDeathMenu: () => this.exit(),
      // touch controls
      onMove: (dir, pressed) => { this.input.state[dir] = pressed; },
      onJump: (pressed) => { this.input.state.up = pressed; if (pressed) this.audio?.play('jump'); },
      onFly: () => { this.input.state.fly = !this.input.state.fly; },
      onToggleBuild: () => { this.buildMode = !this.buildMode; this.audio?.play('ui'); },
    };
  }

  async _import(file) {
    try {
      const save = await SaveManager.importFile(file);
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
    if (this.invOpen || this.craftOpen) { this._closeMenus(); return; }
    this.paused ? this._resume() : this._pause();
  }

  _pause() { this.paused = true; this.hud.showPause(true); this.audio?.play('ui'); }
  _resume() { this.paused = false; this.hud.showPause(false); }

  _toggleInventory() {
    this.invOpen = !this.invOpen;
    this.craftOpen = false;
    if (this.invOpen) this.hud.renderInventory(this);
    this.hud.showInventory(this.invOpen);
    this.hud.showCrafting(false);
    this.hud.showPause(false);
    this.paused = false;
    this.audio?.play('ui');
  }

  _toggleCrafting() {
    this.craftOpen = !this.craftOpen;
    this.invOpen = false;
    if (this.craftOpen) this.hud.renderCrafting(this);
    this.hud.showCrafting(this.craftOpen);
    this.hud.showInventory(false);
    this.hud.showPause(false);
    this.paused = false;
    this.audio?.play('ui');
  }

  _toggleJournal() {
    this.journalOpen = !this.journalOpen;
    this.invOpen = false;
    this.craftOpen = false;
    if (this.journalOpen) this.hud.renderJournal(this);
    this.hud.showJournal(this.journalOpen);
    this.hud.showInventory(false);
    this.hud.showCrafting(false);
    this.hud.showPause(false);
    this.paused = this.journalOpen; // pause behind the journal, like other menus
    this.audio?.play('ui');
  }

  _closeMenus() {
    this.invOpen = this.craftOpen = this.journalOpen = false;
    this.hud.showInventory(false);
    this.hud.showCrafting(false);
    this.hud.showJournal(false);
  }

  _craft(recipe) {
    if (craft(recipe, this.inventory, this)) {
      this.civ.onCraft();
      if (recipe.id === 'cook_food') this.civ.onCook();
      this.crafted.add(recipe.out.id);
      this.audio?.play('craft');
      this.hud.toast(`Crafted ${getItem(recipe.out.id)?.label || recipe.out.id}`);
      this.hud.renderCrafting(this);
    } else {
      this.hud.toast('Missing materials');
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
        cp: Math.floor(this.civ.cp),
        population: this.civ.population,
        mined: this.civ.totalMined,
        built: this.civ.totalBuilt,
        deepest: this.civ.deepestMine,
        clues: this.clues?.count?.() || 0,
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
        hungerDrain: this.powerups.multiplier('hungerDrain'),
        cellStability: this.eraId === 'cell',
        moveSpeed: this._onRoad() ? 1.22 : 1,
      };
      this.player.update(dt, this.world, this.input.state, this.mode);
      this._expandWorldIfNeeded();
      this._absorbCellResources(dt);
      this._updateCellStatus(dt);
      this._footsteps(dt, wasGround);
      this._handleInteraction(dt);
    }

    const target = this.mode === MODE.SURVIVAL ? this._mobTargetContext() : null;
    for (const m of this.mobs) {
      const hit = m.update(dt, this.world, target);
      if (hit && this.player.alive) this._damagePlayer(hit.damage, `a ${m.type}`);
    }
    this._updateDinosaurPressure(dt);
    this._spawnMobs(dt);
    this._updateSettlers(dt);
    this._updateTownEconomy(dt);
    this._updateAutomation(dt);
    this.powerups.update(dt);
    this._trackAnimalFriendship(dt);
    this._ambientWeather(dt);
    this._updateMeteors(dt);
    this._updateCrops(dt);
    this.particles.update(dt);

    this.clock = (this.clock + dt) % C.DAY_LENGTH;
    this.world.clock = this.clock;
    this.audio?.setDayFactor(this.dayFactor());
    this._updateWorldEvents(dt);

    this.camera.follow(this.player, dt);

    // Objectives.
    if (this.mode === MODE.SURVIVAL) {
      const done = this.objectives.evaluate(this);
      for (const o of done) {
        if (o.reward) this.civ.addCP(o.reward);
        this.audio?.play('objective');
        this.hud.toast(`${o.icon} Objective complete: ${o.label}${o.reward ? ` (+${o.reward} CP)` : ''}`, 2600);
      }
    }

    this._evaluateFunSystems(dt);

    // Era advancement.
    if (this.mode === MODE.SURVIVAL && this.canAdvance()) {
      const nxt = nextEra(this.eraId);
      if (nxt && this.unlocked.unlock(nxt.id)) {
        this.audio?.play('unlock');
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

  _advanceEra() {
    if (this.mode !== MODE.SURVIVAL || !this.canAdvance()) return false;
    const nxt = nextEra(this.eraId);
    if (!nxt) return false;
    this.unlocked.unlock(nxt.id);
    SaveManager.save(this);
    this._teardownView();
    this.newWorld(nxt.id, MODE.SURVIVAL); // sets showIntro + rebuilds HUD/input
    this.audio?.play('unlock');
    SaveManager.save(this);
    // Reveal the new era full-screen, then resume (mirrors start()).
    this._introThenOnboard();
    return true;
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
      this.hud?.toast(`${e.icon} ${e.label}: ${e.text}`, 3000);
    }
    this._applyHazards(dt);
  }

  _applyHazards(dt) {
    if (this.mode !== MODE.SURVIVAL) return;
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
    this.cellAbsorbCooldown = Math.max(0, (this.cellAbsorbCooldown || 0) - dt);
    if (this.cellAbsorbCooldown > 0) return;

    const targets = new Map([
      [blockId('nutrient_blob'), { item: 'nutrient_blob', cp: 1.5, color: '#b8ff85' }],
      [blockId('mineral_vent'), { item: 'mineral_vent', cp: 2.5, color: '#9bd6e0' }],
    ]);
    const px = Math.round(this.player.x);
    const py = Math.round(this.player.y - this.player.h / 2);
    for (let y = py - 2; y <= py + 2; y++) {
      for (let x = px - 2; x <= px + 2; x++) {
        const def = targets.get(this.world.get(x, y));
        if (!def || Math.hypot(x + 0.5 - this.player.x, y + 0.5 - this.player.y) > 2.1) continue;
        this.world.set(x, y, AIR);
        this.inventory.add(def.item, 1);
        this.civ.addCP(def.cp * this.powerups.multiplier('cpMultiplier'));
        this.player.eat(def.item === 'nutrient_blob' ? 8 : 3);
        this.cellStability = Math.min(100, (this.cellStability ?? this.player.hunger) + (def.item === 'nutrient_blob' ? 7 : 4));
        this.particles.fountain(x + 0.5, y + 0.5, [def.color, '#76f7dd', '#fff'], 12);
        this.audio?.play('mine');
        this.hud?.toast(def.item === 'nutrient_blob' ? 'Absorbed nutrients' : 'Absorbed vent minerals', 900);
        this.cellAbsorbCooldown = 0.35;
        return;
      }
    }
  }

  _updateCellStatus(dt) {
    if (this.eraId !== 'cell') {
      this.cellStatus = null;
      return;
    }
    const nearest = this._nearestCellResource(14);
    const membrane = Math.min(1, this.inventory.count('lipid_membrane') / 4);
    const proto = this.inventory.count('proto_cell') > 0 || this.crafted.has('proto_cell') ? 1 : 0;
    const resourceBonus = Math.min(18, this.inventory.count('nutrient_blob') * 2 + this.inventory.count('mineral_vent') * 3);
    const structureBonus = Math.min(16, (this.civ.placed.lipid_membrane || 0) * 4);
    const target = Math.min(100, 28 + resourceBonus + membrane * 18 + structureBonus + proto * 20);
    this.cellStability = this.cellStability == null ? target : this.cellStability + (target - this.cellStability) * Math.min(1, dt * 2);
    this.cellStatus = {
      stability: Math.round(this.cellStability),
      gradient: nearest ? nearest.label : 'quiet chemistry',
      distance: nearest ? nearest.distance : null,
      ready: this.objectives?.mandatoryDone?.() && this.civ.canAdvance(),
    };
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
    const theme = getEraTheme(this.eraId);
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
    const theme = getEraTheme(this.eraId);
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
    this.audio?.play('break');
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

  _handleInteraction(dt) {
    const m = this.input.mouse;
    const { tileX, tileY, tx, ty } = this.camera.screenToWorld(m.x, m.y);
    const dist = Math.hypot(tx - this.player.x, ty - (this.player.y - this.player.h / 2));
    const reach = C.REACH + this.powerups.value('reach', 0);
    const inReach = dist <= reach;
    const placeIntent = m.button === 2 || this.buildMode;

    this.hover = { x: tileX, y: tileY, valid: inReach, mode: placeIntent ? 'place' : 'mine', progress: 0 };

    // Ghost placement preview.
    this.ghost = null;
    const sel = this.inventory.selectedItem();
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
    if (item && item.kind === 'tool' && item.tool === block.tool) {
      return (1 + item.tier * 1.4) * this.powerups.multiplier('miningSpeed');
    }
    return this.powerups.multiplier('miningSpeed');
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
    this.audio?.play('break');
    this._discoverClue(block);
    const drops = dropsOf(block.id);
    if (this.mode === MODE.SURVIVAL) {
      for (const drop of drops) this.inventory.add(drop, 1);
    }
    this.civ.onMine(block.name, y);
    // Removing a block can drop falling blocks stacked above it.
    this._settleFalling(x, y - 1);
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
    this.audio?.play('place');
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
    this.audio?.play('place');
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
          const chance = (id === ids.seedling ? 0.45 : 0.32) * (nearWater ? 1.45 : 1) * (drought ? 0.35 : 1);
          if (Math.random() > chance) continue;
          this.world.set(x, y, id === ids.seedling ? ids.green : ids.ripe);
          if (!this.reduceMotion && Math.random() < 0.5) {
            this.particles.burst(x + 0.5, y + 0.5, '#d9b84a', 3, { gravity: 3, life: 0.4 });
          }
        }
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
    grazer.health = Math.max(grazer.health, grazer.def.hp || grazer.health);
    this.civ.addCP(18 * (this.powerups?.multiplier('cpMultiplier') || 1));
    this.powerups?.grant?.('grazer_bond');
    this.audio?.play('objective');
    this.particles.fountain(grazer.x, grazer.y - 1, ['#6fc04e', '#f4d24a', '#fff'], 24);
    this.hud?.bigToast(`🌿 <b>Grazer companion</b><br><small>Your bond turned a ${grazer.type} into a town guardian.</small>`, 3200);
  }

  _mobTargetContext() {
    if (this.eraId !== 'stone') return this.player;
    const packPressure = this.mobs.filter((m) => m.type === 'raptor' &&
      Math.hypot(m.x - this.player.x, m.y - this.player.y) < 10).length;
    const rexDistance = this._nearestMobDistance('rex');
    const defended = this._hasDinoDefense();
    return Object.assign(Object.create(this.player), this.player, {
      packPressure,
      fearExposed: rexDistance != null && rexDistance < 13 && !defended,
      defended,
    });
  }

  _updateDinosaurPressure(dt) {
    if (this.mode !== MODE.SURVIVAL || this.eraId !== 'stone') {
      this.dinoStatus = null;
      return;
    }
    const packPressure = this.mobs.filter((m) => m.type === 'raptor' &&
      Math.hypot(m.x - this.player.x, m.y - this.player.y) < 10).length;
    const rexDistance = this._nearestMobDistance('rex');
    const defended = this._hasDinoDefense();
    const fear = rexDistance != null && rexDistance < 13 && !defended;
    if (fear) {
      this.player.hunger = Math.max(0, this.player.hunger - dt * 0.16);
      if (!this.reduceMotion && Math.random() < dt * 0.6) this.hud?.shake?.();
    }
    this.dinoStatus = {
      packPressure,
      rexDistance,
      defended,
      grazerBond: Math.min(100, Math.round(((this.grazerBondTime || 0) / 10) * 100)),
      companion: this.mobs.some((m) => m.tamed),
      warning: fear ? 'T-Rex fear zone' : packPressure >= 2 ? 'raptor pack nearby' :
        this.mobs.some((m) => m.tamed) ? 'grazer companion nearby' : defended ? 'defenses steady' : '',
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

  _hitMob(mob) {
    const weapon = this.inventory.selectedItem();
    const weaponDef = weapon ? getItem(weapon.id) : null;
    const damage = weaponDef?.kind === 'weapon' ? weaponDef.damage : 4;
    const dead = mob.hurt(damage);
    this.audio?.play('hurt');
    this.particles.burst(mob.x, mob.y - mob.h / 2, mob.hostile ? '#ff7b6b' : '#cf5d6a', 8);
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
    this.mobTimer -= dt;
    if (this.mobTimer > 0 || this.mobs.length >= 9) return;
    this.mobTimer = 4 + Math.random() * 3;

    const theme = getEraTheme(this.eraId);
    const isDay = this.dayFactor() > 0.4;

    // Decide passive vs hostile. Hostiles come out at night (or any time in
    // eras flagged hostileDay), and only in Survival.
    const wantHostile = this.mode === MODE.SURVIVAL && theme.hostile.length &&
      (!isDay || theme.hostileDay) && Math.random() < 0.6;
    const table = wantHostile ? theme.hostile : theme.passive;
    if (!table || !table.length) return;
    const type = weightedPick(table);
    if (!type || !MOB_TYPES[type]) return;

    this.spawnMobNearPlayer(type);
  }

  spawnMobNearPlayer(type) {
    if (!type || !MOB_TYPES[type] || this.mobs.length >= 12) return false;
    if ((type === 'raider' || type === 'bandit') && this._hasTownDefense() && Math.random() < 0.7) {
      this.hud?.toast('🛡️ Town defenses turned away scouts', 1800);
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

  _hasTownDefense() {
    const blockDefense = (this.civ?.defense || 0) + (this.civ?.light || 0) * 0.4;
    const guards = (this.townGuards || 0) * 1.5;
    const grazer = this.mobs?.some((m) => m.tamed) ? 3 : 0;
    return blockDefense + guards + grazer >= 4;
  }

  _updateTownEconomy(dt) {
    if (!this.settlers?.home || this.mode !== MODE.SURVIVAL) return;
    const st = this.settlers.stock || {};
    const storageCap = 20 + (this.civ.storage || 0);
    for (const key of ['food', 'wheat', 'wood', 'ore']) {
      if ((st[key] || 0) > storageCap) st[key] = storageCap;
    }
    this._tradeTimer = (this._tradeTimer || 0) + dt;
    if (this._tradeTimer < 12) return;
    this._tradeTimer = 0;
    if ((this.civ.trade || 0) <= 0) return;
    if ((st.wheat || 0) >= 4 || (st.ore || 0) >= 3) {
      if ((st.wheat || 0) >= 4) st.wheat -= 4;
      else st.ore -= 3;
      this.civ.onTrade(5 + (this.civ.trade || 0));
      this.hud?.toast('🏺 Market traded town surplus for CP', 1800);
    }
  }

  _updateAutomation(dt) {
    const miners = this.civ?.placed?.auto_miner || 0;
    if (!miners || this.mode !== MODE.SURVIVAL) return;
    this._autoMineTimer = (this._autoMineTimer || 0) + dt;
    if (this._autoMineTimer < 10) return;
    this._autoMineTimer = 0;
    const produced = Math.max(1, miners);
    if (this.settlers?.stock) this.settlers.stock.ore = (this.settlers.stock.ore || 0) + produced;
    else this.inventory.add('coal', produced);
    this.civ.pollution = (this.civ.pollution || 0) + 0.15 * miners;
    this.civ.addCP(1.5 * miners);
    this.hud?.toast(`⚙️ Auto miner produced ${produced} ore`, 1500);
  }

  _damagePlayer(amount, cause = 'the wilds') {
    if (/raptor|rex|boar|wolf/.test(cause)) amount *= this.powerups.multiplier('predatorDamage');
    this.player.health = Math.max(0, this.player.health - amount);
    this.player.vy = -7; // knockback pop
    this.lastDamageCause = cause;
    this.audio?.play('hurt');
    this.particles.burst(this.player.x, this.player.y - this.player.h / 2, '#ff5b5b', 8);
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
      powerups: this.powerups,
      dayFactor: this.dayFactor(),
      tint: getEraTheme(this.eraId).tint,
      meteors: this.meteors,
      hover: this.hover,
      ghost: this.ghost,
      dt,
    });
  }
}
