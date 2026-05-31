/**
 * HUD: the DOM overlay over the canvas. Pure view layer — it reads game state
 * and routes user actions back through handler callbacks so the Game keeps the
 * logic.
 *
 * Includes: stat bars + era badge, a civilization panel, a guided objectives
 * list, the hotbar, inventory/crafting modals, a pause/settings menu, and (on
 * touch devices) on-screen movement / action controls.
 */
import { getItem } from '../core/items.js';
import { HOTBAR_SIZE } from '../systems/Inventory.js';
import { availableRecipes, canCraft } from '../systems/Crafting.js';
import { getEra, nextEra } from '../core/eras.js';
import { MODE } from '../core/constants.js';

export class HUD {
  constructor(root, { handlers = {}, settings, isTouch = false, mode = MODE.SURVIVAL } = {}) {
    this.root = root;
    this.h = handlers;
    this.settings = settings;
    this.isTouch = isTouch;
    this.mode = mode;
    this.cache = {};
    this._build();
    if (isTouch) this._buildTouchControls();
  }

  el(id) { return this.cache[id] || (this.cache[id] = this.root.querySelector('#' + id)); }

  _build() {
    const s = this.settings;
    this.root.innerHTML = `
      <div id="topbar">
        <div class="stat"><span id="healthIcon" class="stat-label">❤️</span><div class="bar"><div id="healthBar" class="bar-fill health"></div></div></div>
        <div class="stat"><span id="hungerIcon" class="stat-label">🍖</span><div class="bar"><div id="hungerBar" class="bar-fill hunger"></div></div></div>
        <div id="eraBadge" class="era-badge"></div>
      </div>

      <div id="civPanel" class="civ-panel">
        <div id="eraStory" class="era-story"></div>
        <div class="civ-row"><span>🏛️ Population</span><b id="popVal">1</b></div>
        <div class="civ-row"><span>✨ Civ Points</span><b id="cpVal">0</b></div>
        <div class="civ-row"><span>🏘️ Settlement</span><b id="settleVal">0</b></div>
        <div class="civ-row"><span>🔎 Clues</span><b id="clueVal">0</b></div>
        <div class="civ-row"><span>⭐ Mastery</span><b id="masteryVal">0/0</b></div>
        <div id="cellPanel" class="cell-panel hidden">
          <div class="civ-row"><span>🧬 Stability</span><b id="cellStabilityVal">0%</b></div>
          <div class="civ-progress cell-progress"><div id="cellStabilityBar" class="cell-fill"></div></div>
          <div id="cellGradient" class="cell-gradient"></div>
        </div>
        <div class="civ-progress"><div id="advanceBar" class="advance-fill"></div></div>
        <div id="advanceLabel" class="advance-label"></div>
        <button id="advanceBtn" class="advance-btn hidden">Enter Portal</button>
      </div>

      <div id="objPanel" class="obj-panel">
        <div class="obj-title">🎯 Objectives</div>
        <div id="objList"></div>
      </div>

      <div id="discoveryPanel" class="discovery-panel hidden">
        <div class="obj-title">✨ Discoveries</div>
        <div id="discoveryList"></div>
      </div>

      <button id="pauseBtn" class="icon-btn" title="Menu (Esc)">☰</button>
      <div id="buildIndicator" class="build-indicator"></div>
      <div id="powerupBar" class="powerup-bar hidden"></div>
      <div id="eventBar" class="event-bar hidden"></div>
      <div id="toast" class="toast hidden"></div>
      <div id="bigToast" class="big-toast hidden"></div>

      <div id="hotbar" class="hotbar"></div>

      <div id="inventoryPanel" class="panel hidden">
        <h2>🎒 Inventory</h2>
        <p class="muted small">Tap an item to move it to your selected hotbar slot.</p>
        <div id="invGrid" class="grid"></div>
        <button class="close-btn" id="invClose">Close (E)</button>
      </div>

      <div id="craftPanel" class="panel hidden">
        <h2>🔨 Crafting</h2>
        <div id="craftList" class="craft-list"></div>
        <button class="close-btn" id="craftClose">Close (C)</button>
      </div>

      <div id="pauseMenu" class="overlay hidden">
        <div class="overlay-card">
          <h2>⏸ Paused</h2>
          <div class="pause-actions">
            <button id="resumeBtn" class="btn primary">▶ Resume</button>
            <button id="pInv" class="btn">🎒 Inventory</button>
            <button id="pCraft" class="btn">🔨 Crafting</button>
          </div>
          <div class="settings-block">
            <label class="toggle"><span>🔊 Sound effects</span>
              <input type="checkbox" id="setSound" ${s?.get('sound') ? 'checked' : ''}></label>
            <label class="toggle"><span>🎵 Ambient music</span>
              <input type="checkbox" id="setMusic" ${s?.get('music') ? 'checked' : ''}></label>
            <label class="slider"><span>🔍 Zoom</span>
              <input type="range" id="setZoom" min="0.7" max="1.6" step="0.05" value="${s?.get('zoomPref') ?? 1}"></label>
            <label class="toggle"><span>♿ Reduce motion</span>
              <input type="checkbox" id="setReduceMotion" ${s?.get('reduceMotion') ? 'checked' : ''}></label>
          </div>
          <div class="pause-actions">
            <button id="pSave" class="btn">💾 Save</button>
            <button id="pExport" class="btn">⬇ Export</button>
            <button id="pImport" class="btn">⬆ Import</button>
          </div>
          <button id="pMenu" class="btn danger">🏠 Main Menu</button>
          <input id="importInput" type="file" accept="application/json" hidden />
        </div>
      </div>

      <div id="deathScreen" class="overlay hidden">
        <div class="overlay-card death-card">
          <div class="death-emoji">💀</div>
          <h2 id="deathTitle">You Died</h2>
          <p id="deathCause" class="muted"></p>
          <div id="deathStats" class="death-stats"></div>
          <div class="pause-actions">
            <button id="deathRespawn" class="btn primary">⟳ Respawn</button>
            <button id="deathLoad" class="btn">📂 Load Save</button>
          </div>
          <button id="deathMenu" class="btn danger">🏠 Main Menu</button>
        </div>
      </div>

      <div id="confirmDialog" class="overlay hidden">
        <div class="overlay-card confirm-card">
          <h2 id="confirmTitle"></h2>
          <p id="confirmBody" class="muted"></p>
          <div class="pause-actions">
            <button id="confirmYes" class="btn primary">Confirm</button>
            <button id="confirmNo" class="btn">Cancel</button>
          </div>
        </div>
      </div>

      <div id="onboarding" class="overlay hidden">
        <div class="overlay-card onboard-card">
          <div id="onboardIcon" class="onboard-icon">👋</div>
          <h2 id="onboardTitle"></h2>
          <p id="onboardBody"></p>
          <div class="onboard-dots" id="onboardDots"></div>
          <div class="pause-actions">
            <button id="onboardSkip" class="btn">Skip</button>
            <button id="onboardNext" class="btn primary">Next →</button>
          </div>
        </div>
      </div>
    `;

    this.el('invClose').onclick = () => this.h.onToggleInventory?.();
    this.el('craftClose').onclick = () => this.h.onToggleCrafting?.();
    this.el('pauseBtn').onclick = () => this.h.onPause?.();
    this.el('resumeBtn').onclick = () => this.h.onResume?.();
    this.el('pInv').onclick = () => this.h.onToggleInventory?.();
    this.el('pCraft').onclick = () => this.h.onToggleCrafting?.();

    this.el('setSound').onchange = (e) => this.h.onSetSound?.(e.target.checked);
    this.el('setMusic').onchange = (e) => this.h.onSetMusic?.(e.target.checked);
    this.el('setZoom').oninput = (e) => this.h.onSetZoom?.(parseFloat(e.target.value));
    this.el('setReduceMotion').onchange = (e) => this.h.onSetReduceMotion?.(e.target.checked);

    this.el('pSave').onclick = () => { this.h.onSave?.(); this.toast('Game saved'); };
    this.el('pExport').onclick = () => this.h.onExport?.();
    this.el('pImport').onclick = () => this.el('importInput').click();
    this.el('importInput').onchange = (e) => {
      const f = e.target.files[0];
      if (f) this.h.onImport?.(f);
      e.target.value = '';
    };
    this.el('pMenu').onclick = () => this.h.onMainMenu?.();
    this.el('advanceBtn').onclick = () => this.h.onAdvanceEra?.();

    this.el('deathRespawn').onclick = () => this.h.onRespawn?.();
    this.el('deathLoad').onclick = () => this.h.onDeathLoad?.();
    this.el('deathMenu').onclick = () => this.h.onDeathMenu?.();
  }

  _buildTouchControls() {
    const wrap = document.createElement('div');
    wrap.id = 'touchControls';
    wrap.innerHTML = `
      <div class="touch-left">
        <button class="tbtn" data-act="left">◀</button>
        <button class="tbtn" data-act="right">▶</button>
      </div>
      <div class="touch-right">
        <button class="tbtn build" data-act="build">⛏</button>
        <button class="tbtn fly" data-act="fly">🪂</button>
        <button class="tbtn jump" data-act="jump">⤴</button>
      </div>
    `;
    this.root.appendChild(wrap);

    const hold = (btn, onDown, onUp) => {
      const down = (e) => { e.preventDefault(); btn.classList.add('pressed'); onDown(); };
      const up = (e) => { e.preventDefault(); btn.classList.remove('pressed'); onUp?.(); };
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointerleave', up);
      btn.addEventListener('pointercancel', up);
    };

    wrap.querySelectorAll('.tbtn').forEach((btn) => {
      const act = btn.dataset.act;
      if (act === 'left' || act === 'right') {
        hold(btn, () => this.h.onMove?.(act, true), () => this.h.onMove?.(act, false));
      } else if (act === 'jump') {
        hold(btn, () => this.h.onJump?.(true), () => this.h.onJump?.(false));
      } else if (act === 'build') {
        btn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.h.onToggleBuild?.(); });
      } else if (act === 'fly') {
        btn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.h.onFly?.(); });
      }
    });

    // Hide fly button outside creative mode.
    if (this.mode !== MODE.CREATIVE) wrap.querySelector('.fly').style.display = 'none';
  }

  // ---- transient messages ----

  toast(msg, ms = 1800) {
    const t = this.el('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.add('hidden'), ms);
  }

  bigToast(msg, ms = 3000) {
    const t = this.el('bigToast');
    t.innerHTML = msg;
    t.classList.remove('hidden');
    t.classList.add('pop');
    clearTimeout(this._bigT);
    this._bigT = setTimeout(() => { t.classList.add('hidden'); t.classList.remove('pop'); }, ms);
  }

  // ---- per-frame update ----

  update(game) {
    const p = game.player;
    this.el('healthBar').style.width = `${p.health}%`;
    this.el('hungerBar').style.width = `${p.hunger}%`;

    const survival = game.mode === MODE.SURVIVAL;
    this.el('topbar').classList.toggle('creative', !survival);
    this.el('objPanel').classList.toggle('hidden', !survival);
    this.el('healthIcon').textContent = game.eraId === 'cell' ? '🧬' : '❤️';
    this.el('hungerIcon').textContent = game.eraId === 'cell' ? '⚗️' : '🍖';

    const era = getEra(game.eraId);
    this.el('eraBadge').textContent = `${era.icon} ${era.name}${survival ? '' : ' · Creative'}`;
    this.el('eraStory').textContent = era.manifest?.subtitle || era.blurb;

    this.el('popVal').textContent = game.civ.population;
    this.el('cpVal').textContent = Math.floor(game.civ.cp);
    this.el('settleVal').textContent = game.civ.settlementScore();
    this.el('clueVal').textContent = game.clues?.count?.() || 0;
    this.renderCellStatus(game);
    const status = game.advancementStatus?.() || {};
    this.el('masteryVal').textContent = `${status.masteryDone || 0}/${status.masteryTotal || 0}`;
    const prog = game.civ.advanceProgress();
    this.el('advanceBar').style.width = `${prog * 100}%`;
    const nxt = nextEra(game.eraId);
    const gate = !status.mandatoryReady ? 'Finish mandatory goals'
      : !status.cpReady ? `Need ${Math.max(0, Math.ceil((status.needed || 0) - (status.cp || 0)))} CP`
        : null;
    this.el('advanceLabel').textContent = nxt
      ? (status.ready ? `🌀 Portal to ${nxt.name} is open!` : `${gate || `Next: ${nxt.name}`}`)
      : 'Final era reached';
    this.el('advanceBtn').classList.toggle('hidden', !(survival && nxt && status.ready));

    this.el('buildIndicator').textContent = game.buildMode ? '🧱 Build' : '⛏ Mine';
    this.el('buildIndicator').classList.toggle('build-on', game.buildMode);

    if (survival) this.renderObjectives(game);
    this.renderDiscoveries(game);
    this.renderPowerups(game);
    this.renderEvents(game);
    this.renderHotbar(game);
  }

  renderCellStatus(game) {
    const panel = this.el('cellPanel');
    const status = game.cellStatus;
    panel.classList.toggle('hidden', game.eraId !== 'cell' || !status);
    if (game.eraId !== 'cell' || !status) return;
    this.el('cellStabilityVal').textContent = `${status.stability}%`;
    this.el('cellStabilityBar').style.width = `${status.stability}%`;
    const distance = status.distance == null ? '' : ` · ${Math.ceil(status.distance)} tiles`;
    this.el('cellGradient').textContent = status.ready
      ? 'ready to evolve'
      : `sense: ${status.gradient}${distance}`;
  }

  renderObjectives(game) {
    const list = this.el('objList');
    const active = game.objectives.active(3);
    const done = game.objectives.completed.size;
    const total = game.objectives.all.length;
    let html = '';
    for (const o of active) {
      const cls = o.kind === 'mastery' ? ' mastery' : o.kind === 'portal' ? ' portal' : '';
      html += `<div class="obj-item${cls}"><span class="obj-ic">${o.icon}</span><span>${o.label}</span></div>`;
    }
    if (!active.length) html = `<div class="obj-item done">✅ All objectives complete!</div>`;
    html += `<div class="obj-count">${done}/${total} done</div>`;
    list.innerHTML = html;
  }

  renderDiscoveries(game) {
    const panel = this.el('discoveryPanel');
    const list = this.el('discoveryList');
    const structures = game.structures?.list?.() || [];
    const discoveries = game.discoveries?.list?.() || [];
    const clues = game.clues?.list?.() || [];
    const visible = structures.length || discoveries.length || clues.length;
    panel.classList.toggle('hidden', !visible);
    if (!visible) return;
    const rows = [
      ...structures.slice(-3).map((s) => `<div class="obj-item"><span class="obj-ic">${s.icon}</span>${s.label}</div>`),
      ...clues.slice(-3).map((c) => `<div class="obj-item clue"><span class="obj-ic">${c.icon}</span>${c.label}</div>`),
      ...discoveries.slice(-3).map((d) => `<div class="obj-item done"><span class="obj-ic">${d.icon}</span>${d.label}</div>`),
    ].slice(-5);
    list.innerHTML = rows.join('') + `<div class="obj-count">${structures.length} structures · ${clues.length} clues · ${discoveries.length} secrets</div>`;
  }

  renderPowerups(game) {
    const bar = this.el('powerupBar');
    const active = game.powerups?.list?.() || [];
    bar.classList.toggle('hidden', !active.length);
    if (!active.length) return;
    bar.innerHTML = active.map((p) =>
      `<span class="powerup" title="${p.label}">${p.icon} ${Math.ceil(p.remaining)}s</span>`
    ).join('');
  }

  renderEvents(game) {
    const bar = this.el('eventBar');
    const active = game.events?.listActive?.() || [];
    bar.classList.toggle('hidden', !active.length);
    if (!active.length) return;
    bar.innerHTML = active.map((e) => `<span class="event-chip" title="${e.text}">${e.icon} ${e.label}</span>`).join('');
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
      const sItem = inv.slots[i];
      slot.classList.toggle('selected', i === inv.selected);
      slot.innerHTML = this.slotInner(sItem, i + 1);
    }
  }

  slotInner(s, num) {
    const key = num ? `<span class="key">${num}</span>` : '';
    if (!s) return key;
    const item = getItem(s.id);
    const color = item?.colors?.base || '#888';
    const label = item?.label || s.id;
    const tool = item?.kind === 'tool' ? ' tool' : '';
    return key +
      `<span class="swatch${tool}" style="background:${color}" title="${label}"></span>` +
      (s.n > 1 ? `<span class="count">${s.n}</span>` : '');
  }

  renderInventory(game) {
    const grid = this.el('invGrid');
    grid.innerHTML = '';
    game.inventory.slots.forEach((s, i) => {
      const cell = document.createElement('div');
      cell.className = 'inv-cell' + (s ? '' : ' empty');
      const item = s ? getItem(s.id) : null;
      const color = item?.colors?.base || 'transparent';
      const tool = item?.kind === 'tool' ? ' tool' : '';
      cell.innerHTML = s
        ? `<span class="swatch${tool}" style="background:${color}"></span>` +
          `<span class="inv-name">${item?.label || s.id}</span>` +
          (s.n > 1 ? `<span class="count">${s.n}</span>` : '')
        : '';
      if (s) {
        cell.title = `${item?.label || s.id} ×${s.n} — tap to send to hotbar`;
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
      const ok = canCraft(r, game.inventory, game);
      const out = getItem(r.out.id);
      // Per-ingredient have/need, so disabled recipes explain themselves.
      const ins = Object.entries(r.in)
        .map(([id, n]) => {
          const have = game.inventory.count(id);
          const cls = have >= n ? 'ing ok' : 'ing miss';
          return `<span class="${cls}">${getItem(id)?.label || id} ${have}/${n}</span>`;
        })
        .join('');
      const needStation = r.station && !game.hasStation?.(r.station);
      const station = needStation
        ? `<span class="ing miss">Needs ${getItem(r.station)?.label || r.station}</span>`
        : '';
      const row = document.createElement('div');
      row.className = 'craft-row' + (ok ? '' : ' disabled');
      row.innerHTML = `
        <span class="swatch" style="background:${out?.colors?.base || '#888'}"></span>
        <div class="craft-info">
          <b>${out?.label || r.out.id} ×${r.out.n}</b>
          <div class="ing-list">${ins}${station}</div>
        </div>
        <button ${ok ? '' : 'disabled'}>Craft</button>`;
      row.querySelector('button').onclick = () => this.h.onCraft?.(r);
      list.appendChild(row);
    }
    if (!recipes.length) list.innerHTML = '<p class="muted">No recipes yet.</p>';
  }

  showInventory(show) { this.el('inventoryPanel').classList.toggle('hidden', !show); }
  showCrafting(show) { this.el('craftPanel').classList.toggle('hidden', !show); }
  showPause(show) { this.el('pauseMenu').classList.toggle('hidden', !show); }

  /** Reusable confirm dialog for destructive actions. onYes runs on Confirm. */
  confirm(title, body, onYes) {
    this.el('confirmTitle').textContent = title;
    this.el('confirmBody').textContent = body || '';
    const dlg = this.el('confirmDialog');
    dlg.classList.remove('hidden');
    const close = () => dlg.classList.add('hidden');
    this.el('confirmYes').onclick = () => { close(); onYes?.(); };
    this.el('confirmNo').onclick = () => close();
  }

  /** Death screen. Pass false to hide, or { cause, stats } to show. */
  showDeath(info) {
    const screen = this.el('deathScreen');
    if (!info) { screen.classList.add('hidden'); return; }
    this.el('deathCause').textContent = `Felled by ${info.cause}.`;
    const s = info.stats || {};
    this.el('deathStats').innerHTML = [
      ['🌍 Era', s.era], ['✨ Civ Points', s.cp], ['🏛️ Population', s.population],
      ['⛏️ Blocks mined', s.mined], ['🧱 Blocks built', s.built],
      ['🕳️ Deepest dig', s.deepest], ['🔎 Clues found', s.clues],
    ].map(([k, v]) => `<div class="death-stat"><span>${k}</span><b>${v ?? 0}</b></div>`).join('');
    screen.classList.remove('hidden');
  }

  /**
   * First-run coach-marks. `done` is called once when the player finishes or
   * skips. `touch` swaps in touch-specific wording.
   */
  showOnboarding(done, touch = false) {
    const steps = [
      { icon: '🫧', title: 'Welcome to BlocksCreate', body: 'Begin at the origin of life. Gather nutrients, form a membrane, and evolve through time.' },
      { icon: '⛏️', title: 'Mine the world', body: touch ? 'Tap a nearby block to mine it. Hold to keep mining.' : 'Hold left-click on a nearby block to mine it.' },
      { icon: '🧱', title: 'Build & place', body: touch ? 'Tap the ⛏/🧱 button to switch to Build, then tap to place the selected block.' : 'Right-click to place the selected block (or press Q to toggle Build/Mine).' },
      { icon: '🎒', title: 'Inventory & crafting', body: touch ? 'Use the ☰ menu for Inventory and Crafting.' : 'Press E for Inventory and C for Crafting. Numbers 1–9 pick a hotbar slot.' },
      { icon: '🎯', title: 'Complete objectives', body: 'Finish the objectives (top-right) to earn ✨ Civ Points and open the portal to the next era. Each era unlocks richer tools and systems.' },
    ];
    let i = 0;
    const screen = this.el('onboarding');
    const dots = this.el('onboardDots');
    dots.innerHTML = steps.map((_, k) => `<span class="dot${k === 0 ? ' on' : ''}"></span>`).join('');
    const render = () => {
      const st = steps[i];
      this.el('onboardIcon').textContent = st.icon;
      this.el('onboardTitle').textContent = st.title;
      this.el('onboardBody').textContent = st.body;
      [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
      this.el('onboardNext').textContent = i === steps.length - 1 ? 'Got it!' : 'Next →';
    };
    const finish = () => { screen.classList.add('hidden'); done?.(); };
    this.el('onboardNext').onclick = () => { if (i >= steps.length - 1) finish(); else { i++; render(); } };
    this.el('onboardSkip').onclick = finish;
    render();
    screen.classList.remove('hidden');
  }

  /** Brief red damage flash + shake when the player is hurt. */
  shake() {
    const stage = this.root.parentElement || this.root;
    stage.classList.add('hurt-shake');
    clearTimeout(this._shakeT);
    this._shakeT = setTimeout(() => stage.classList.remove('hurt-shake'), 320);
  }

  destroy() {
    const tc = this.root.querySelector('#touchControls');
    if (tc) tc.remove();
  }
}
