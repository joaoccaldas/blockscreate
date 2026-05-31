/**
 * HUD: bridges game state to the DOM overlay (hotbar, stat bars, civ panel,
 * inventory grid and crafting list). Pure view layer — it reads game state and
 * wires button clicks back through callbacks.
 */
import { getItem } from '../core/items.js';
import { HOTBAR_SIZE } from '../systems/Inventory.js';
import { availableRecipes, canCraft } from '../systems/Crafting.js';
import { getEra, nextEra } from '../core/eras.js';
import { MODE } from '../core/constants.js';

export class HUD {
  constructor(root, handlers = {}) {
    this.root = root;
    this.h = handlers;
    this.cache = {};
    this._build();
  }

  el(id) { return this.cache[id] || (this.cache[id] = this.root.querySelector('#' + id)); }

  _build() {
    this.root.innerHTML = `
      <div id="topbar">
        <div class="stat"><span class="stat-label">❤️</span><div class="bar"><div id="healthBar" class="bar-fill health"></div></div></div>
        <div class="stat"><span class="stat-label">🍖</span><div class="bar"><div id="hungerBar" class="bar-fill hunger"></div></div></div>
        <div id="eraBadge" class="era-badge"></div>
      </div>

      <div id="civPanel" class="civ-panel">
        <div class="civ-row"><span>🏛️ Population</span><b id="popVal">1</b></div>
        <div class="civ-row"><span>✨ Civ Points</span><b id="cpVal">0</b></div>
        <div class="civ-progress"><div id="advanceBar" class="advance-fill"></div></div>
        <div id="advanceLabel" class="advance-label"></div>
      </div>

      <div id="toast" class="toast hidden"></div>

      <div id="hotbar" class="hotbar"></div>

      <div id="inventoryPanel" class="panel hidden">
        <h2>Inventory</h2>
        <div id="invGrid" class="grid"></div>
        <button class="close-btn" id="invClose">Close (E)</button>
      </div>

      <div id="craftPanel" class="panel hidden">
        <h2>Crafting</h2>
        <div id="craftList" class="craft-list"></div>
        <button class="close-btn" id="craftClose">Close (C)</button>
      </div>
    `;

    this.el('invClose').onclick = () => this.h.onToggleInventory?.();
    this.el('craftClose').onclick = () => this.h.onToggleCrafting?.();
  }

  toast(msg, ms = 1800) {
    const t = this.el('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.add('hidden'), ms);
  }

  /** Per-frame light update (bars, counters). */
  update(game) {
    const p = game.player;
    this.el('healthBar').style.width = `${p.health}%`;
    this.el('hungerBar').style.width = `${p.hunger}%`;

    const survival = game.mode === MODE.SURVIVAL;
    this.el('topbar').classList.toggle('creative', !survival);

    const era = getEra(game.eraId);
    this.el('eraBadge').textContent = `${era.icon} ${era.name}${survival ? '' : ' · Creative'}`;

    this.el('popVal').textContent = game.civ.population;
    this.el('cpVal').textContent = Math.floor(game.civ.cp);
    const prog = game.civ.advanceProgress();
    this.el('advanceBar').style.width = `${prog * 100}%`;
    const nxt = nextEra(game.eraId);
    this.el('advanceLabel').textContent = nxt
      ? (game.civ.canAdvance() ? `Portal to ${nxt.name} is open!` : `Advancing to ${nxt.name}…`)
      : 'Final era reached';

    this.renderHotbar(game);
  }

  renderHotbar(game) {
    const bar = this.el('hotbar');
    const inv = game.inventory;
    if (bar.children.length !== HOTBAR_SIZE) {
      bar.innerHTML = '';
      for (let i = 0; i < HOTBAR_SIZE; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        slot.onclick = () => this.h.onHotbar?.(i);
        bar.appendChild(slot);
      }
    }
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const slot = bar.children[i];
      const s = inv.slots[i];
      slot.classList.toggle('selected', i === inv.selected);
      slot.innerHTML = this.slotInner(s);
    }
  }

  slotInner(s) {
    if (!s) return '';
    const item = getItem(s.id);
    const color = item?.colors?.base || '#888';
    const label = item?.label || s.id;
    return `<span class="swatch" style="background:${color}" title="${label}"></span>` +
           (s.n > 1 ? `<span class="count">${s.n}</span>` : '');
  }

  renderInventory(game) {
    const grid = this.el('invGrid');
    grid.innerHTML = '';
    game.inventory.slots.forEach((s, i) => {
      const cell = document.createElement('div');
      cell.className = 'slot';
      cell.innerHTML = this.slotInner(s);
      if (s) {
        const item = getItem(s.id);
        cell.title = `${item?.label || s.id} ×${s.n}`;
        cell.onclick = () => this.h.onPickSlot?.(i);
      }
      grid.appendChild(cell);
    });
  }

  renderCrafting(game) {
    const list = this.el('craftList');
    list.innerHTML = '';
    const recipes = availableRecipes(game.unlocked.set());
    for (const r of recipes) {
      const ok = canCraft(r, game.inventory);
      const out = getItem(r.out.id);
      const ins = Object.entries(r.in)
        .map(([id, n]) => `${getItem(id)?.label || id} ×${n}`)
        .join(', ');
      const row = document.createElement('div');
      row.className = 'craft-row' + (ok ? '' : ' disabled');
      row.innerHTML = `
        <span class="swatch" style="background:${out?.colors?.base || '#888'}"></span>
        <div class="craft-info">
          <b>${out?.label || r.out.id} ×${r.out.n}</b>
          <small>${ins}</small>
        </div>
        <button ${ok ? '' : 'disabled'}>Craft</button>`;
      row.querySelector('button').onclick = () => this.h.onCraft?.(r);
      list.appendChild(row);
    }
    if (!recipes.length) list.innerHTML = '<p class="muted">No recipes yet.</p>';
  }

  showInventory(show) { this.el('inventoryPanel').classList.toggle('hidden', !show); }
  showCrafting(show) { this.el('craftPanel').classList.toggle('hidden', !show); }
}
