/**
 * Game engine: owns the world + entities and runs the fixed-step update/render
 * loop. Wires input -> simulation -> renderer -> HUD. Designed so each system
 * (world, civ, inventory, save) is replaceable and the loop stays small.
 */
import { C, MODE } from './core/constants.js';
import { World } from './world/World.js';
import { Player } from './entities/Player.js';
import { Mob, MOB_TYPES } from './entities/Mob.js';
import { Inventory, HOTBAR_SIZE } from './systems/Inventory.js';
import { Civilization } from './systems/Civilization.js';
import { craft } from './systems/Crafting.js';
import { Camera } from './render/Camera.js';
import { Renderer } from './render/Renderer.js';
import { Input } from './input/Input.js';
import { HUD } from './ui/HUD.js';
import { SaveManager } from './persistence/SaveManager.js';
import { getBlock, dropOf, isSolid, AIR } from './core/blocks.js';
import { getItem, isPlaceable } from './core/items.js';
import { getEra, nextEra } from './core/eras.js';

export class Game {
  constructor({ canvas, hudRoot, sprites, progress, onExit }) {
    this.canvas = canvas;
    this.sprites = sprites;
    this.unlocked = progress; // Progress instance
    this.onExit = onExit;
    this.renderer = new Renderer(canvas);
    this.renderer.setSprites(sprites);
    this.hudRoot = hudRoot;
    this.running = false;
    this.mineTarget = null;
    this.mineProgress = 0;
    this.autosaveTimer = 0;
    this.mobTimer = 0;
  }

  // ---- lifecycle ----

  newWorld(eraId, mode) {
    this.mode = mode;
    this.eraId = eraId;
    this.clock = C.DAY_LENGTH * 0.3; // start mid-morning
    this.world = new World({ seed: (Math.random() * 1e9) | 0, eraId });
    this.world.generate();
    this.player = new Player(this.world.spawn.x + 0.5, this.world.spawn.y);
    this.inventory = new Inventory();
    this.civ = new Civilization(eraId);
    this.mobs = [];
    this._grantStarter();
    this._setup();
  }

  loadSave(save) {
    this.mode = save.mode;
    this.eraId = save.eraId;
    this.clock = save.clock ?? 0;
    this.world = World.deserialize(save.world);
    this.world.clock = this.clock;
    this.player = new Player(0, 0);
    this.player.load(save.player);
    this.inventory = new Inventory();
    this.inventory.load(save.inventory);
    this.civ = new Civilization(this.eraId);
    this.civ.load(save.civ);
    this.mobs = (save.mobs || []).map((m) => Mob.load(m));
    this._setup();
  }

  _grantStarter() {
    const era = getEra(this.eraId);
    for (const id of era.starter || []) this.inventory.add(id, 1);
    // A few starting placeables so building is immediate.
    this.inventory.add('planks', 16);
    this.inventory.add('torch', 8);
    if (this.mode === MODE.CREATIVE) {
      // Stock creative with a generous palette of placeable blocks.
      ['grass','dirt','stone','cobblestone','sand','log','planks','leaves','thatch','brick','torch','campfire']
        .forEach((id) => this.inventory.add(id, 99));
    }
  }

  _setup() {
    this.world.clock = this.clock;
    this.camera = new Camera(this.world);
    this.camera.snap(this.player);
    this.hud = new HUD(this.hudRoot, this._hudHandlers());
    this.input = new Input(this.canvas, this._inputHandlers());
    this.menuOpen = false;
  }

  start() {
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this._frame);
  }

  stop() { this.running = false; }

  // ---- handlers ----

  _inputHandlers() {
    return {
      onHotbar: (i) => { this.inventory.selected = i; },
      onScroll: (d) => {
        this.inventory.selected = (this.inventory.selected + d + HOTBAR_SIZE) % HOTBAR_SIZE;
      },
      onToggleInventory: () => this._toggleInventory(),
      onToggleCrafting: () => this._toggleCrafting(),
      onEscape: () => {
        if (this.invOpen || this.craftOpen) { this._closeMenus(); }
        else { this.exit(); }
      },
    };
  }

  _hudHandlers() {
    return {
      onHotbar: (i) => { this.inventory.selected = i; },
      onToggleInventory: () => this._toggleInventory(),
      onToggleCrafting: () => this._toggleCrafting(),
      onCraft: (r) => this._craft(r),
      onPickSlot: (i) => {
        // Move an inventory item to the active hotbar slot for quick use.
        const s = this.inventory.slots[i];
        if (!s) return;
        const sel = this.inventory.selected;
        this.inventory.slots[i] = this.inventory.slots[sel];
        this.inventory.slots[sel] = s;
        this.hud.renderInventory(this);
      },
    };
  }

  _toggleInventory() {
    this.invOpen = !this.invOpen;
    this.craftOpen = false;
    if (this.invOpen) this.hud.renderInventory(this);
    this.hud.showInventory(this.invOpen);
    this.hud.showCrafting(false);
  }

  _toggleCrafting() {
    this.craftOpen = !this.craftOpen;
    this.invOpen = false;
    if (this.craftOpen) this.hud.renderCrafting(this);
    this.hud.showCrafting(this.craftOpen);
    this.hud.showInventory(false);
  }

  _closeMenus() {
    this.invOpen = this.craftOpen = false;
    this.hud.showInventory(false);
    this.hud.showCrafting(false);
  }

  _craft(recipe) {
    if (craft(recipe, this.inventory)) {
      this.civ.onCraft();
      this.hud.toast(`Crafted ${getItem(recipe.out.id)?.label || recipe.out.id}`);
      this.hud.renderCrafting(this);
    } else {
      this.hud.toast('Missing materials');
    }
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
    if (dt > 0.05) dt = 0.05; // clamp big stalls
    this.update(dt);
    this.draw();
    requestAnimationFrame(this._frame);
  };

  update(dt) {
    const menus = this.invOpen || this.craftOpen;
    if (!menus) {
      this.player.update(dt, this.world, this.input.state, this.mode);
      this._handleInteraction(dt);
    }

    for (const m of this.mobs) m.update(dt, this.world);
    this._spawnMobs(dt);

    // Day/night clock.
    this.clock = (this.clock + dt) % C.DAY_LENGTH;
    this.world.clock = this.clock;

    this.camera.follow(this.player, dt);

    // Era advancement.
    if (this.mode === MODE.SURVIVAL && this.civ.canAdvance()) {
      const nxt = nextEra(this.eraId);
      if (nxt && this.unlocked.unlock(nxt.id)) {
        this.hud.toast(`🌀 Portal to ${nxt.name} unlocked! (also in Creative)`, 3500);
      }
    }

    // Survival death -> respawn.
    if (this.mode === MODE.SURVIVAL && !this.player.alive) {
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

  _handleInteraction(dt) {
    const m = this.input.mouse;
    const { tileX, tileY, tx, ty } = this.camera.screenToWorld(m.x, m.y);
    const dist = Math.hypot(tx - this.player.x, ty - (this.player.y - this.player.h / 2));
    this.hover = { x: tileX, y: tileY, valid: dist <= C.REACH, mode: 'mine', progress: 0 };

    if (!m.down || dist > C.REACH) { this.mineTarget = null; this.mineProgress = 0; return; }

    if (m.button === 2) { // place
      this._tryPlace(tileX, tileY);
      this.input.mouse.down = false; // single placement per click
      return;
    }

    // Hit a mob standing on this tile before falling through to mining.
    const hitMob = this.mobs.find((mb) =>
      Math.abs(mb.x - (tileX + 0.5)) < 0.7 && Math.abs((mb.y - mb.h / 2) - (tileY + 0.5)) < 1);
    if (hitMob) {
      this._hitMob(hitMob);
      this.input.mouse.down = false; // one hit per click
      return;
    }

    // Mining (left button hold).
    const id = this.world.get(tileX, tileY);
    if (id === AIR) { this.mineTarget = null; return; }
    const block = getBlock(id);
    if (block.hardness === Infinity) { this.hover.mode = 'mine'; return; }

    if (!this.mineTarget || this.mineTarget.x !== tileX || this.mineTarget.y !== tileY) {
      this.mineTarget = { x: tileX, y: tileY };
      this.mineProgress = 0;
    }

    const speed = this._miningSpeed(block);
    this.mineProgress += dt * speed;
    this.hover.progress = Math.min(1, this.mineProgress / block.hardness);
    if (this.mode === MODE.CREATIVE) this.hover.progress = 1;

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
    return 1; // bare hands
  }

  _breakBlock(x, y, block) {
    this.world.set(x, y, AIR);
    const drop = dropOf(block.id);
    if (drop && this.mode === MODE.SURVIVAL) this.inventory.add(drop, 1);
    this.civ.onMine();
  }

  _tryPlace(x, y) {
    const sel = this.inventory.selectedItem();
    if (!sel) return;
    // Consumables: eat instead of place.
    if (sel.id === 'food' || sel.id === 'raw_food') {
      if (this.mode === MODE.SURVIVAL && this.player.hunger < 100) {
        this.player.eat(sel.id === 'food' ? 30 : 12);
        this.inventory.consumeSelected(1);
        this.hud.toast('Ate food');
      }
      return;
    }
    if (!isPlaceable(sel.id)) return;
    if (this.world.get(x, y) !== AIR) return;
    // Don't place inside the player.
    if (this._overlapsPlayer(x, y)) return;
    const id = getItem(sel.id).place;
    this.world.set(x, y, id);
    this.civ.onBuild(sel.id);
    if (this.mode === MODE.SURVIVAL) this.inventory.consumeSelected(1);
  }

  _hitMob(mob) {
    mob.health -= 3;
    mob.vy = -6; // knock up
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
    const t = this.clock / C.DAY_LENGTH; // 0..1
    return (Math.sin((t - 0.25) * Math.PI * 2) + 1) / 2;
  }

  draw() {
    this.renderer.render(
      this.world, this.camera, this.player, this.mobs, this.dayFactor(), this.hover,
    );
  }
}
