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
import { Camera } from './render/Camera.js';
import { Renderer } from './render/Renderer.js';
import { Particles } from './render/Particles.js';
import { Input, isTouch } from './input/Input.js';
import { HUD } from './ui/HUD.js';
import { SaveManager } from './persistence/SaveManager.js';
import { getBlock, dropsOf, isSolid, AIR } from './core/blocks.js';
import { getItem, isPlaceable } from './core/items.js';
import { getEra, nextEra } from './core/eras.js';

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
  }

  // ---- lifecycle ----

  newWorld(eraId, mode) {
    this.mode = mode;
    this.eraId = eraId;
    this.clock = C.DAY_LENGTH * 0.3;
    this.world = new World({ seed: (Math.random() * 1e9) | 0, eraId });
    this.world.generate();
    this.player = new Player(this.world.spawn.x + 0.5, this.world.spawn.y);
    this.inventory = new Inventory();
    this.civ = new Civilization(eraId);
    this.objectives = new ObjectiveTracker(eraId);
    this.mobs = [];
    this._grantStarter();
    this._setup();
  }

  loadSave(save) {
    this.mode = save.mode;
    this.eraId = save.eraId;
    this.clock = save.clock ?? 0;
    this.world = World.deserialize(save.world);
    this.player = new Player(0, 0);
    this.player.load(save.player);
    this.inventory = new Inventory();
    this.inventory.load(save.inventory);
    this.civ = new Civilization(this.eraId);
    this.civ.load(save.civ);
    this.crafted = new Set(save.crafted || []);
    this.objectives = new ObjectiveTracker(this.eraId, save.objectives || []);
    this.mobs = (save.mobs || []).map((m) => Mob.load(m));
    this._setup();
  }

  _grantStarter() {
    const era = getEra(this.eraId);
    for (const id of era.starter || []) this.inventory.add(id, 1);
    if (this.mode === MODE.CREATIVE) {
      ['grass', 'dirt', 'stone', 'cobblestone', 'sand', 'log', 'planks', 'leaves',
        'thatch', 'brick', 'torch', 'campfire']
        .forEach((id) => this.inventory.add(id, 99));
    } else {
      // Survival: a couple of torches to start; everything else is earned.
      this.inventory.add('torch', 4);
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
    });
    this.invOpen = false;
    this.craftOpen = false;
    this.resize();
    this.camera.snap(this.player);
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);
  }

  _teardownView() {
    if (this._onResize) {
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('orientationchange', this._onResize);
      this._onResize = null;
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
      onToggleBuild: () => { this.buildMode = !this.buildMode; },
      onPause: () => this._onPause(),
    };
  }

  _hudHandlers() {
    return {
      onHotbar: (i) => { this.inventory.selected = i; },
      onToggleInventory: () => this._toggleInventory(),
      onToggleCrafting: () => this._toggleCrafting(),
      onCraft: (r) => this._craft(r),
      onPickSlot: (i) => {
        const s = this.inventory.slots[i];
        if (!s) return;
        const sel = this.inventory.selected;
        this.inventory.slots[i] = this.inventory.slots[sel];
        this.inventory.slots[sel] = s;
        this.hud.renderInventory(this);
      },
      onPause: () => this._onPause(),
      onResume: () => this._resume(),
      onSetSound: (v) => { this.audio?.setSound(v); this.settings?.set('sound', v); },
      onSetMusic: (v) => { this.audio?.setMusic(v); this.settings?.set('music', v); },
      onSetZoom: (v) => { this.settings?.set('zoomPref', v); this.resize(); },
      onSave: () => SaveManager.save(this),
      onExport: () => SaveManager.exportFile(this),
      onImport: (f) => this._import(f),
      onMainMenu: () => this.exit(),
      onAdvanceEra: () => this._advanceEra(),
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
      this.stop();
      this.loadSave(save);
      this.start();
      this.hud.toast('World imported');
    } catch (e) {
      this.hud.toast('Import failed');
    }
  }

  _onPause() {
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

  _closeMenus() {
    this.invOpen = this.craftOpen = false;
    this.hud.showInventory(false);
    this.hud.showCrafting(false);
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

  exit() {
    SaveManager.save(this);
    this.stop();
    this.onExit?.();
  }

  // ---- main loop ----

  _frame = (now) => {
    if (!this.running) return;
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05;
    if (!this.paused) this.update(dt);
    this.draw(dt);
    requestAnimationFrame(this._frame);
  };

  update(dt) {
    const menus = this.invOpen || this.craftOpen;
    this.placeCooldown = Math.max(0, this.placeCooldown - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    if (!menus) {
      const wasGround = this.player.onGround;
      this.player.update(dt, this.world, this.input.state, this.mode);
      this._footsteps(dt, wasGround);
      this._handleInteraction(dt);
    }

    for (const m of this.mobs) m.update(dt, this.world);
    this._spawnMobs(dt);
    this.particles.update(dt);

    this.clock = (this.clock + dt) % C.DAY_LENGTH;
    this.world.clock = this.clock;
    this.audio?.setDayFactor(this.dayFactor());

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

    // Era advancement.
    if (this.mode === MODE.SURVIVAL && this.civ.canAdvance()) {
      const nxt = nextEra(this.eraId);
      if (nxt && this.unlocked.unlock(nxt.id)) {
        this.audio?.play('unlock');
        this.particles.fountain(this.player.x, this.player.y - 1,
          ['#f4d24a', '#6fc04e', '#4f86ee', '#ff7b29', '#fff'], 40);
        this.hud.bigToast(`🌀 <b>${nxt.name}</b> portal unlocked!<br><small>Now playable in Creative too.</small>`);
      }
    }

    // Survival death -> respawn.
    if (this.mode === MODE.SURVIVAL && !this.player.alive) {
      this.audio?.play('hurt');
      this.hud.toast('You collapsed. Respawning…', 2500);
      this.player.x = this.world.spawn.x + 0.5;
      this.player.y = this.world.spawn.y;
      this.player.health = 100;
      this.player.hunger = 60;
      this.player.alive = true;
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
    if (this.mode !== MODE.SURVIVAL || !this.civ.canAdvance()) return false;
    const nxt = nextEra(this.eraId);
    if (!nxt) return false;
    this.unlocked.unlock(nxt.id);
    SaveManager.save(this);
    this._teardownView();
    this.newWorld(nxt.id, MODE.SURVIVAL);
    this.audio?.play('unlock');
    this.hud.bigToast(`🌀 <b>${nxt.name}</b><br><small>A new world opens.</small>`);
    SaveManager.save(this);
    return true;
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

  _handleInteraction(dt) {
    const m = this.input.mouse;
    const { tileX, tileY, tx, ty } = this.camera.screenToWorld(m.x, m.y);
    const dist = Math.hypot(tx - this.player.x, ty - (this.player.y - this.player.h / 2));
    const inReach = dist <= C.REACH;
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
      return 1 + item.tier * 1.4;
    }
    return 1;
  }

  _breakBlock(x, y, block) {
    this.world.set(x, y, AIR);
    if (block.colors) this.particles.burst(x + 0.5, y + 0.5, block.colors.base, 10);
    this.audio?.play('break');
    const drops = dropsOf(block.id);
    if (this.mode === MODE.SURVIVAL) {
      for (const drop of drops) this.inventory.add(drop, 1);
    }
    this.civ.onMine();
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
    if (!isPlaceable(sel.id)) return false;
    if (this.world.get(x, y) !== AIR) return false;
    if (this._overlapsPlayer(x, y)) return false;
    const id = getItem(sel.id).place;
    this.world.set(x, y, id);
    const b = getBlock(id);
    if (b.colors) this.particles.burst(x + 0.5, y + 0.5, b.colors.base, 5, { gravity: 8, life: 0.3 });
    this.audio?.play('place');
    this.civ.onBuild(sel.id);
    if (this.mode === MODE.SURVIVAL) this.inventory.consumeSelected(1);
    return true;
  }

  _hitMob(mob) {
    mob.health -= 3;
    mob.vy = -6;
    this.audio?.play('hurt');
    this.particles.burst(mob.x, mob.y - mob.h / 2, '#cf5d6a', 8);
    if (mob.health <= 0) {
      this.mobs.splice(this.mobs.indexOf(mob), 1);
      if (this.mode === MODE.SURVIVAL) this.inventory.add('raw_food', mob.def.food);
      this.civ.addCP(2);
      this.hud.toast(`Caught a ${mob.type}`);
    }
  }

  _overlapsPlayer(x, y) {
    const p = this.player;
    return x >= Math.floor(p.x - p.w / 2) && x <= Math.floor(p.x + p.w / 2) &&
           y >= Math.floor(p.y - p.h) && y <= Math.floor(p.y);
  }

  _spawnMobs(dt) {
    this.mobTimer -= dt;
    const day = this.dayFactor() > 0.4;
    if (this.mobTimer > 0 || this.mobs.length >= 8 || !day) return;
    this.mobTimer = 5;
    const dir = Math.random() < 0.5 ? -1 : 1;
    const sx = Math.floor(this.player.x + dir * (10 + Math.random() * 6));
    if (sx < 1 || sx >= this.world.width - 1) return;
    const surf = this.world.heightMap[sx];
    if (!isSolid(this.world.get(sx, surf))) return;
    const types = Object.keys(MOB_TYPES);
    const type = types[(Math.random() * types.length) | 0];
    this.mobs.push(new Mob(type, sx + 0.5, surf));
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
      particles: this.particles,
      dayFactor: this.dayFactor(),
      hover: this.hover,
      ghost: this.ghost,
      dt,
    });
  }
}
