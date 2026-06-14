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
import { buildMapModel } from '../systems/SpaceTimeMap.js';
import { chronicleOf } from '../systems/Chronicle.js';
import { buildMinimap } from '../systems/Minimap.js';
import { MODE } from '../core/constants.js';
import { getEraUI } from '../core/eraTheme.js';
import { ERA_ROUTES } from '../core/eraGraph.js';

export class HUD {
  constructor(root, { handlers = {}, settings, isTouch = false, mode = MODE.SURVIVAL, eraId = 'cell' } = {}) {
    this.root = root;
    this.h = handlers;
    this.settings = settings;
    this.isTouch = isTouch;
    this.mode = mode;
    this.eraId = eraId;
    this.cache = {};
    this._build();
    if (isTouch) this._buildTouchControls();
    // On phones the stat panels crowd the play area; collapse them by default
    // (one tap on 📊 brings them back). Desktop keeps them open.
    if (isTouch) this.root.classList.add('info-collapsed');
  }

  el(id) { return this.cache[id] || (this.cache[id] = this.root.querySelector('#' + id)); }

  _build() {
    const s = this.settings;
    this.root.innerHTML = `
      <div id="topbar">
        <div class="stat"><span id="healthIcon" class="stat-label">❤️</span><div class="bar"><div id="healthBar" class="bar-fill health"></div></div></div>
        <div class="stat"><span id="hungerIcon" class="stat-label">🍖</span><div class="bar"><div id="hungerBar" class="bar-fill hunger"></div></div></div>
        <div id="eraBadge" class="era-badge"></div>
        <span id="timelineGlyph" class="timeline-glyph hidden" aria-hidden="true"></span>
      </div>

      <div id="civPanel" class="civ-panel">
        <div id="chronicle" class="chronicle"></div>
        <div id="eraStory" class="era-story"></div>
        <div class="civ-row"><span>🏛️ Population</span><b id="popVal">1</b></div>
        <div class="civ-row"><span>✨ Civ Points</span><b id="cpVal">0</b></div>
        <div class="civ-row"><span id="tokenLabel">🪙 Tokens</span><b id="tokenVal">0</b></div>
        <div class="civ-row"><span>🏘️ Settlement</span><b id="settleVal">0</b></div>
        <div class="civ-row"><span>🔎 Clues</span><b id="clueVal">0</b></div>
        <div class="civ-row"><span>🧭 Era Stage</span><b id="eraStageVal">0/3</b></div>
        <div class="civ-progress"><div id="eraStageBar" class="advance-fill"></div></div>
        <div class="civ-row"><span>⭐ Mastery</span><b id="masteryVal">0/0</b></div>
        <div id="cellPanel" class="cell-panel hidden">
          <div class="civ-row"><span>🧬 Evolution</span><b id="cellStageVal">—</b></div>
          <div class="cell-stages" id="cellStages"></div>
          <div class="civ-row"><span>🫧 Stability</span><b id="cellStabilityVal">0%</b></div>
          <div class="civ-progress cell-progress"><div id="cellStabilityBar" class="cell-fill"></div></div>
          <div id="cellGradient" class="cell-gradient"></div>
        </div>
        <div id="dinoPanel" class="dino-panel hidden">
          <div class="civ-row"><span>🌿 Grazer Bond</span><b id="grazerBondVal">0%</b></div>
          <div class="civ-progress dino-progress"><div id="grazerBondBar" class="dino-fill"></div></div>
          <div id="dinoWarning" class="dino-warning"></div>
        </div>
        <div id="industryPanel" class="industry-panel hidden">
          <div class="civ-row"><span>🏭 Machine Parts</span><b id="industryParts">0</b></div>
          <div id="industryChain" class="industry-chain"></div>
          <div id="industryPower" class="industry-poll"></div>
          <div id="industryPollution" class="industry-poll"></div>
        </div>
        <div class="civ-progress"><div id="advanceBar" class="advance-fill"></div></div>
        <div id="advanceLabel" class="advance-label"></div>
        <button id="advanceBtn" class="advance-btn hidden">Enter Portal</button>
      </div>

      <div id="objPanel" class="obj-panel">
        <div id="objectiveTitle" class="obj-title">🎯 Objectives</div>
        <div id="objList"></div>
      </div>



      <button id="pauseBtn" class="icon-btn" title="Menu (Esc)">☰</button>
      <button id="infoBtn" class="icon-btn info-btn" title="Toggle stats panels">📊</button>
      <button id="buildIndicator" class="build-indicator" title="Switch between Mine and Build (right-click the world, or press Q)"></button>
      ${this.isTouch ? '' : '<canvas id="minimap" class="minimap" aria-hidden="true"></canvas>'}
      ${this.isTouch ? '' : `
      <div id="desktopActions" class="desktop-actions">
        <button id="invBtn" class="action-btn" title="Inventory (E)">🎒 <span>Bag</span></button>
        <button id="craftBtn" class="action-btn" title="Crafting (C)">🔨 <span>Craft</span></button>
        <button id="marketBtn" class="action-btn" title="Era market — spend tokens on boosts & relics (B)">🛒 <span>Market</span></button>
        <button id="codexBtn" class="action-btn" title="Codex: Journal, Map & Discoveries (J)">📚 <span>Codex</span></button>
      </div>`}
      <div id="powerupBar" class="powerup-bar hidden"></div>
      <div id="eventBar" class="event-bar hidden"></div>
      <div id="raidWarning" class="raid-warning hidden"></div>
      <div id="comboMeter" class="combo-meter hidden"><span id="comboText"></span><div class="combo-bar"><i id="comboFill"></i></div></div>
      <div id="cellHint" class="cell-hint hidden"></div>
      <div id="toast" class="toast hidden"></div>
      <div id="bigToast" class="big-toast hidden"></div>

      <div id="hotbar" class="hotbar"></div>

      <div id="inventoryPanel" class="panel hidden">
        <div class="panel-head">
          <h2>🎒 Inventory</h2>
          <button id="invSort" class="chip-btn" title="Sort backpack">⇅ Sort</button>
        </div>
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
            <button id="pMarket" class="btn">🛒 Market</button>
            <button id="pMap" class="btn">🗺️ Map of Space &amp; Time</button>
            <button id="pJournal" class="btn">📖 Journal</button>
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
            <label class="toggle"><span>📳 Vibration</span>
              <input type="checkbox" id="setHaptics" ${s?.get('haptics') ? 'checked' : ''}></label>
          </div>
          <button id="pShare" class="btn">🔗 Share this reality</button>
          <div class="pause-actions">
            <button id="pSave" class="btn">💾 Save</button>
            <button id="pExport" class="btn">⬇ Export</button>
            <button id="pImport" class="btn">⬆ Import</button>
          </div>
          <button id="pMenu" class="btn danger">🏠 Main Menu</button>
          <input id="importInput" type="file" accept="application/json" hidden />
        </div>
      </div>

      <div id="codexPanel" class="overlay hidden">
        <div class="overlay-card codex-card">
          <div class="codex-header">
            <h2>📚 Codex</h2>
            <div class="codex-tabs">
              <button class="codex-tab active" data-tab="codex-journal">📖 Journal</button>
              <button class="codex-tab" data-tab="codex-map">🗺️ Map</button>
              <button class="codex-tab" data-tab="codex-discoveries">✨ Discoveries</button>
            </div>
            <button class="icon-btn close-codex" id="codexClose" title="Close (J or Esc)">✕</button>
          </div>
          <div class="codex-content">
            <div id="codex-journal" class="codex-page active">
              <div class="codex-page-head">
                <span id="journalBranch" class="muted small"></span>
              </div>
              <div id="journalBody"></div>
            </div>
            <div id="codex-map" class="codex-page hidden">
              <div class="codex-page-head">
                <span id="mapWalked" class="muted small"></span>
              </div>
              <div id="mapBody"></div>
            </div>
            <div id="codex-discoveries" class="codex-page hidden">
              <div id="discoveryList"></div>
            </div>
          </div>
        </div>
      </div>

      <div id="eraIntro" class="overlay hidden">
        <div class="overlay-card era-intro-card">
          <div id="eraIntroIcon" class="era-intro-icon"></div>
          <h2 id="eraIntroTitle"></h2>
          <p id="eraIntroSub" class="muted"></p>
          <div id="eraIntroBody" class="era-intro-body"></div>
          <button id="eraIntroGo" class="btn primary">Begin →</button>
        </div>
      </div>

      <div id="portalPreview" class="overlay hidden">
        <div class="overlay-card portal-preview-card">
          <h2>Temporal Rift Stabilized</h2>
          <p class="muted subtitle" style="margin-top: 0.25rem; font-size: 0.9rem;">Two timelines diverge from this point. Your actions have shaped the path ahead.</p>
          
          <div class="destinations-wrap">
            <div id="destPrime" class="dest-card">
              <div class="dest-header">
                <span class="dest-icon" id="destPrimeIcon">🪐</span>
                <h3 id="destPrimeLabel">Prime Spine</h3>
              </div>
              <h4 id="destPrimeTitle">Age of Dinosaurs</h4>
              <p class="dest-desc" id="destPrimeDesc">The default path of history. Unchanged by alternate reality anomalies.</p>
              <div id="destPrimeStatus" class="dest-status">Undominant</div>
            </div>
            
            <div id="destBranch" class="dest-card">
              <div class="dest-header">
                <span class="dest-icon" id="destBranchIcon">🌿</span>
                <h3 id="destBranchLabel">Alternate Reality</h3>
              </div>
              <h4 id="destBranchTitle">Age of Flora</h4>
              <p class="dest-desc" id="destBranchDesc">A diverged path of evolution. Requires deliberate intervention to unlock.</p>
              <div id="destBranchStatus" class="dest-status">Dominant</div>
            </div>
          </div>
          
          <div class="influence-details">
            <h4>Factors influencing your timeline:</h4>
            <ul id="influenceList" class="influence-list"></ul>
          </div>
          
          <div class="pause-actions">
            <button id="portalConfirmBtn" class="btn primary">Advance into history →</button>
            <button id="portalCancelBtn" class="btn">← Step back</button>
          </div>
        </div>
      </div>

      <div id="deathScreen" class="overlay hidden">
        <div class="overlay-card death-card">
          <div class="death-emoji">💀</div>
          <h2 id="deathTitle">You Died</h2>
          <p id="deathCause" class="muted"></p>
          <div id="deathStats" class="death-stats"></div>
          <div class="pause-actions">
            <button id="deathShare" class="btn">🔗 Share run</button>
            <button id="deathShareCard" class="btn">📸 Share image</button>
          </div>
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
    this.el('invSort').onclick = () => this.h.onSortInventory?.();
    this.el('craftClose').onclick = () => this.h.onToggleCrafting?.();
    this.el('pauseBtn').onclick = () => this.h.onPause?.();
    this.el('infoBtn').onclick = () => this.root.classList.toggle('info-collapsed');
    // Clickable Mine/Build toggle — the discoverable way to build for players
    // without an easy right-click (e.g. Mac trackpads).
    this.el('buildIndicator').onclick = () => this.h.onToggleBuild?.();
    // Desktop quick-action column (touch has its own 🎒🔨 cluster): make
    // Inventory / Crafting / Journal clickable, not keyboard-only.
    if (!this.isTouch) {
      this.el('invBtn').onclick = () => this.h.onToggleInventory?.();
      this.el('craftBtn').onclick = () => this.h.onToggleCrafting?.();
      this.el('marketBtn').onclick = () => this.h.onToggleMarket?.();
      this.el('codexBtn').onclick = () => this.h.onToggleCodex?.();
    }
    this.el('marketClose').onclick = () => this.h.onToggleMarket?.();
    this.el('codexClose').onclick = () => this.h.onToggleCodex?.();
    
    // Codex Tabs
    this.root.querySelectorAll('.codex-tab').forEach(tab => {
      tab.onclick = (e) => {
        this.root.querySelectorAll('.codex-tab').forEach(t => t.classList.remove('active'));
        this.root.querySelectorAll('.codex-page').forEach(p => p.classList.add('hidden'));
        e.target.classList.add('active');
        this.el(e.target.dataset.tab).classList.remove('hidden');
      };
    });
    this.el('resumeBtn').onclick = () => this.h.onResume?.();
    this.el('pInv').onclick = () => this.h.onToggleInventory?.();
    this.el('pCraft').onclick = () => this.h.onToggleCrafting?.();
    this.el('pMarket').onclick = () => this.h.onToggleMarket?.();
    this.el('pMap').onclick = () => this.h.onToggleCodex?.();
    this.el('pJournal').onclick = () => this.h.onToggleCodex?.();

    this.el('setSound').onchange = (e) => this.h.onSetSound?.(e.target.checked);
    this.el('setMusic').onchange = (e) => this.h.onSetMusic?.(e.target.checked);
    this.el('setZoom').oninput = (e) => this.h.onSetZoom?.(parseFloat(e.target.value));
    this.el('setReduceMotion').onchange = (e) => this.h.onSetReduceMotion?.(e.target.checked);
    this.el('setHaptics').onchange = (e) => this.h.onSetHaptics?.(e.target.checked);

    this.el('pSave').onclick = () => { this.h.onSave?.(); this.toast('Game saved'); };
    this.el('pShare').onclick = () => this.h.onShareReality?.();
    this.el('pExport').onclick = () => this.h.onExport?.();
    this.el('pImport').onclick = () => this.el('importInput').click();
    this.el('importInput').onchange = (e) => {
      const f = e.target.files[0];
      if (f) this.h.onImport?.(f);
      e.target.value = '';
    };
    this.el('pMenu').onclick = () => this.h.onMainMenu?.();
    this.el('advanceBtn').onclick = () => this.h.onAdvanceEra?.();

    this.el('deathShare').onclick = () => this.h.onShareRun?.();
    this.el('deathShareCard').onclick = () => this.h.onShareCard?.();
    this.el('deathRespawn').onclick = () => this.h.onRespawn?.();
    this.el('deathLoad').onclick = () => this.h.onDeathLoad?.();
    this.el('deathMenu').onclick = () => this.h.onDeathMenu?.();
  }

  _buildTouchControls() {
    const wrap = document.createElement('div');
    wrap.id = 'touchControls';
    // The First Cell era is a swimmer: it needs up/down, not a jump. Other eras
    // walk and jump. Creative adds a flight toggle. We build the right set so
    // the first era is actually playable on a phone.
    const swim = this.eraId === 'cell';
    const rightCol = swim
      ? `
        <button class="tbtn build" data-act="build" aria-label="Mine or build">⛏</button>
        <button class="tbtn up" data-act="up" aria-label="Swim up">▲</button>
        <button class="tbtn down" data-act="down" aria-label="Swim down">▼</button>`
      : `
        <button class="tbtn build" data-act="build" aria-label="Mine or build">⛏</button>
        ${this.mode === MODE.CREATIVE ? '<button class="tbtn fly" data-act="fly" aria-label="Toggle flight">🪂</button>' : ''}
        <button class="tbtn jump" data-act="jump" aria-label="Jump">⤴</button>`;
    wrap.innerHTML = `
      <div class="touch-quick">
        <button class="tbtn small" data-act="inv" aria-label="Inventory">🎒</button>
        <button class="tbtn small" data-act="craft" aria-label="Crafting">🔨</button>
        <button class="tbtn small" data-act="market" aria-label="Era market">🛒</button>
        <button class="tbtn small" data-act="codex" aria-label="Codex">📚</button>
        ${this.eraId === 'stone' ? '<button class="tbtn small" data-act="companion" aria-label="Companion command">🌿</button>' : ''}
        ${this.eraId === 'stone' ? '<button class="tbtn small" data-act="mount" aria-label="Mount companion">🐾</button>' : ''}
        ${this.eraId === 'stone' ? '<button class="tbtn small" data-act="cargo" aria-label="Companion cargo">📦</button>' : ''}
      </div>
      <div class="touch-left">
        <button class="tbtn" data-act="left" aria-label="Move left">◀</button>
        <button class="tbtn" data-act="right" aria-label="Move right">▶</button>
      </div>
      <div class="touch-right">${rightCol}</div>
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
      if (act === 'left' || act === 'right' || act === 'up' || act === 'down') {
        hold(btn, () => this.h.onMove?.(act, true), () => this.h.onMove?.(act, false));
      } else if (act === 'jump') {
        hold(btn, () => this.h.onJump?.(true), () => this.h.onJump?.(false));
      } else if (act === 'build') {
        btn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.h.onToggleBuild?.(); });
      } else if (act === 'fly') {
        btn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.h.onFly?.(); });
      } else if (act === 'inv') {
        btn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.h.onToggleInventory?.(); });
      } else if (act === 'craft') {
        btn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.h.onToggleCrafting?.(); });
      } else if (act === 'market') {
        btn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.h.onToggleMarket?.(); });
      } else if (act === 'codex') {
        btn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.h.onToggleCodex?.(); });
      } else if (act === 'companion') {
        btn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.h.onCompanionCommand?.(); });
      } else if (act === 'mount') {
        btn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.h.onToggleMount?.(); });
      } else if (act === 'cargo') {
        btn.addEventListener('pointerdown', (e) => { e.preventDefault(); this.h.onCompanionCargo?.(); });
      }
    });
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
    const originFocus = survival && game.eraId === 'cell';
    const prelife = !!game.prelife?.active;
    const reality = game.world?.variant || 'prime';
    const ui = getEraUI(game.eraId, game.world?.variant);
    this.root.dataset.era = game.eraId;
    this.root.dataset.reality = reality;
    const set = (k, v) => this.root.style?.setProperty?.(k, v);
    set('--ui-accent', ui.accent);
    set('--ui-accent2', ui.accent2);
    set('--ui-ink', ui.ink);
    set('--ui-panel', ui.panel);
    set('--ui-edge', ui.edge);
    set('--ui-radius', ui.radius);
    set('--ui-font', ui.font);
    set('--ui-texture', ui.texture);
    const originBuilding = originFocus && (
      game.crafted?.has?.('lipid_membrane') ||
      game.inventory?.count?.('lipid_membrane') > 0 ||
      game.objectives?.isDone?.('make_membrane')
    );
    const hasItems = game.inventory?.slots?.some?.(Boolean);
    this.root.classList.toggle('origin-focus', originFocus);
    this.root.classList.toggle('prelife-focus', prelife);
    this.root.classList.toggle('origin-building', !!originBuilding);
    this.root.classList.toggle('has-items', !!hasItems);
    this.el('topbar').classList.toggle('creative', !survival);
    this.el('objPanel').classList.toggle('hidden', !survival);
    this.el('healthIcon').textContent = prelife ? '✦' : game.eraId === 'cell' ? '🧬' : '❤️';
    this.el('hungerIcon').textContent = prelife ? '⚛' : game.eraId === 'cell' ? '⚗️' : '🍖';

    const era = getEra(game.eraId);
    this.el('eraBadge').textContent = `${era.icon} ${era.name}${survival ? '' : ' · Creative'}`;
    this.el('eraStory').textContent = era.manifest?.subtitle || era.blurb;
    // Civilization clock: where + when, flagged when this is an alternate story.
    const chron = chronicleOf(game);
    const chronEl = this.el('chronicle');
    chronEl.classList.toggle('alt', chron.alternate);
    chronEl.innerHTML =
      `<div class="chron-when">🕰️ ${chron.when}</div>` +
      `<div class="chron-where">${chron.icon} ${chron.where} · <span class="chron-phase">${chron.phase}</span></div>` +
      (chron.layer ? `<div class="chron-alt">∞ Simulation layer ${chron.layer}</div>` : '') +
      (chron.alternate ? `<div class="chron-alt">⟁ Alternate timeline</div>` : '');
    this.renderTimeline(game);

    const settlers = game.settlers?.count?.() || 0;
    const popEl = this.el('popVal');
    popEl.textContent = settlers > 0
      ? `${game.civ.population} (${settlers} 🧍)`
      : game.civ.population;
    if (settlers > 0 && game.settlers.roleCounts) {
      const r = game.settlers.roleCounts();
      const st = game.settlers.stock || {};
      popEl.title = `Workers — 🌾${r.farmer || 0} ⛏️${r.gatherer || 0} 🔨${r.builder || 0} 🛡️${r.guard || 0}\n` +
        `Town stock — food ${Math.floor(st.food || 0)}, wheat ${Math.floor(st.wheat || 0)}, wood ${Math.floor(st.wood || 0)}, ore ${Math.floor(st.ore || 0)}`;
    }
    this.el('cpVal').textContent = Math.floor(game.civ.cp);
    const cur = game.market?.currency?.(game.eraId) || { name: 'Tokens', icon: '🪙' };
    this.el('tokenLabel').textContent = `${cur.icon} ${cur.name}`;
    this.el('tokenVal').textContent = Math.floor(game.civ.tokens || 0);
    this.el('settleVal').textContent = game.civ.settlementScore();
    this.el('clueVal').textContent = game.clues?.count?.() || 0;
    const stage = game.objectives?.stageProgress?.() || { stage: 0, label: 'Dormant', percent: 0 };
    this.el('eraStageVal').textContent = `${stage.label} ${stage.stage}/3`;
    this.el('eraStageBar').style.width = `${Math.round((stage.percent || 0) * 100)}%`;
    this.renderCellStatus(game);
    this.renderDinoStatus(game);
    this.renderIndustryStatus(game);
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
      : (status.canDescend ? '∞ Descend a layer — begin again, deeper' : 'Finish this age to descend a layer');
    const btn = this.el('advanceBtn');
    btn.classList.toggle('hidden', !(survival && game.eraId !== 'cell' && ((nxt && status.ready) || status.canDescend)));
    btn.textContent = status.canDescend ? `∞ Descend a Layer${status.layer ? ` (Layer ${status.layer + 1})` : ''}` : 'Enter Portal';

    // Label doubles as the affordance: a tap-target that names the current mode
    // and the action the tap will switch to.
    this.el('buildIndicator').textContent = game.buildMode ? '🧱 Build ⇄ Mine' : '⛏ Mine ⇄ Build';
    this.el('buildIndicator').classList.toggle('build-on', game.buildMode);

    if (survival) this.renderObjectives(game);
    this.renderCombo(game);
    this.renderMinimap(game);
    this.renderDiscoveries(game);
    this.renderPowerups(game);
    this.renderEvents(game);
    this.renderRaidWarning(game);
    this.renderHotbar(game);
  }

  renderRaidWarning(game) {
    const bar = this.el('raidWarning');
    const s = game.raidStatus;
    bar.classList.toggle('hidden', !s);
    if (!s) return;
    bar.innerHTML =
      `📯 <b>Raid incoming — ${s.secondsLeft}s</b>` +
      `<span class="raid-sub"> · ${s.count} raider${s.count === 1 ? '' : 's'} · rally at your town</span>` +
      `<span class="raid-meter"><i style="width:${Math.round((s.fraction || 0) * 100)}%"></i></span>`;
  }

  /**
   * The next concrete thing to do in the First Cell era, phrased as an action +
   * the control that performs it. Driven by the actual objective list so the
   * banner always reflects real progress (and tells desktop players to use the
   * on-screen 🧱 Build toggle, not just "right-click").
   */
  _cellNextStep(game) {
    const obj = game.objectives;
    if (!obj?.list) return null;
    const craft = this.isTouch ? 'open <b>🔨 Crafting</b> (☰ menu)' : 'press <b>C</b> (or ☰ → Craft)';
    const steps = {
      absorb_nutrients: '🫧 Swim into glowing green <b>nutrients</b> to absorb them (3 needed)',
      collect_minerals: '♨️ Swim into a warm <b>mineral vent</b> to collect from it',
      make_membrane: `🟣 Now ${craft} to craft a <b>Lipid Membrane</b>`,
      synthesize_rna: `🧬 Now ${craft} to synthesize an <b>RNA String</b>`,
      craft_protocell: `🧫 Now ${craft} to craft a <b>Proto-Cell</b>`,
      build_membrane: this.isTouch
        ? '🧬 Select the <b>Lipid Membrane</b>, tap <b>🧱</b> to Build, then tap to place 4'
        : '🧬 Select the <b>Lipid Membrane</b> in the hotbar, click <b>🧱 Build</b> (top-right), then click to place 4',
      stabilize_cell: '🧬 Keep feeding. Reach <b>50% stability</b> and evolution will answer.',
    };
    for (const o of obj.list) {
      if (o.kind === 'mandatory' && !obj.isDone(o.id)) return steps[o.id] || null;
    }
    return null;
  }

  renderCellStatus(game) {
    const panel = this.el('cellPanel');
    const status = game.cellStatus;
    const isCell = game.eraId === 'cell' && status;
    panel.classList.toggle('hidden', !isCell);
    const hint = this.el('cellHint');
    hint.classList.toggle('hidden', !isCell);
    if (!isCell) return;
    if (game.prelife?.active) {
      const move = this.isTouch ? 'Use ◀ ▶ ▲ ▼' : 'Use WASD or arrow keys';
      hint.innerHTML = `<div class="cell-hint-evo"><span class="cell-hint-stage">✦ Before Life</span></div>` +
        `${move} to drift into glowing ingredients. No tools. No danger. Just chemistry.`;
      return;
    }
    const stage = status.stage || 0;
    this.el('cellStageVal').textContent = (status.stageName || '—').replace(/^a /, '');
    // Five-pip evolution track so progress toward a full cell is glanceable.
    this.el('cellStages').innerHTML = Array.from({ length: 5 }, (_, i) =>
      `<span class="cell-pip${i <= stage ? ' on' : ''}"></span>`).join('');
    this.el('cellStabilityVal').textContent = `${status.stability}%`;
    this.el('cellStabilityBar').style.width = `${status.stability}%`;
    const distance = status.distance == null ? '' : ` · ${Math.ceil(status.distance)} tiles`;
    this.el('cellGradient').textContent = status.ready
      ? 'ready to evolve'
      : `sense: ${status.gradient}${distance}`;

    // Persistent guidance that names the *exact next action* (and which control
    // performs it) so the first era teaches itself — this is what new players,
    // especially on a trackpad with no easy right-click, were missing.
    const move = this.isTouch ? 'Use ◀ ▶ ▲ ▼ to swim' : 'Swim with WASD / arrows';
    const step = this._cellNextStep(game);
    const guide = status.ready
      ? '🌀 A rift has opened in the ocean. Follow the portal marker and <b>swim into it</b> →'
      : step
        || (status.gradient && status.gradient !== 'quiet chemistry'
          ? `🫧 ${move} into the glowing <b>${status.gradient}</b>${distance} to absorb it`
          : `🫧 ${move} to find glowing <b>nutrients</b> &amp; warm <b>vents</b> — absorb them to grow`);
    // The cell panel (with its pip track) is hidden on mobile/collapsed, so carry
    // a compact evolution header in this always-visible banner.
    const pips = Array.from({ length: 5 }, (_, i) =>
      `<span class="cell-pip${i <= stage ? ' on' : ''}"></span>`).join('');
    hint.innerHTML =
      `<div class="cell-hint-evo"><span class="cell-hint-stage">🧬 ${(status.stageName || '').replace(/^a /, '')}</span>` +
      `<span class="cell-stages cell-hint-pips">${pips}</span></div>${guide}`;
  }

  renderDinoStatus(game) {
    const panel = this.el('dinoPanel');
    const status = game.dinoStatus;
    panel.classList.toggle('hidden', game.eraId !== 'stone' || !status);
    if (game.eraId !== 'stone' || !status) return;
    this.el('grazerBondVal').textContent = `${status.grazerBond || 0}%`;
    this.el('grazerBondBar').style.width = `${status.grazerBond || 0}%`;
    const pack = status.packPressure >= 2 ? ` · pack x${status.packPressure}` : '';
    const cmd = status.command ? ` · R/🌿: ${status.command}` : '';
    const mount = status.companion ? ` · X/🐾 ${status.mounted ? 'dismount' : 'mount'}` : '';
    const cargo = status.cargo ? ` · V/📦 ${status.cargo.used}/${status.cargo.capacity}` : '';
    this.el('dinoWarning').textContent = `${status.warning || 'listen for movement'}${pack}${cmd}${mount}${cargo}`;
  }

  // A deliberately cryptic indicator that only surfaces once reality has begun
  // to branch — subtle at first (✷), eerier as divergence climbs (⌁ → 🌀).
  renderTimeline(game) {
    const el = this.el('timelineGlyph');
    const tl = game.timeline;
    const stage = tl?.stage || 0;
    el.classList.toggle('hidden', !(game.mode === MODE.SURVIVAL && stage > 0));
    if (!(game.mode === MODE.SURVIVAL && stage > 0)) return;
    const glyph = ['', '✷', '⌁', '🌀'][stage];
    el.textContent = glyph;
    el.classList.toggle('tl-2', stage === 2);
    el.classList.toggle('tl-3', stage >= 3);
    const diverged = tl.divergedCount?.() || 0;
    el.title = `Reality divergence ${tl.divergence.toFixed(1)}`
      + (diverged ? ` · ${diverged} branch${diverged > 1 ? 'es' : ''} taken` : '')
      + (tl.crossovers ? ` · ${tl.crossovers} crossover${tl.crossovers > 1 ? 's' : ''}` : '');
  }

  renderIndustryStatus(game) {
    const panel = this.el('industryPanel');
    const s = game.industryStatus;
    const show = game.eraId === 'industrial' && s;
    panel.classList.toggle('hidden', !show);
    if (!show) return;
    this.el('industryParts').textContent = s.parts;
    // Show the live supply chain with machine counts feeding each stage.
    this.el('industryChain').innerHTML =
      `<span class="ic-node">⛏️${s.ore}<i>×${s.miners}</i></span><span class="ic-arrow">→</span>` +
      `<span class="ic-node">🔥${s.steel}<i>×${s.smelters}</i></span><span class="ic-arrow">→</span>` +
      `<span class="ic-node">🛠️${s.parts}<i>×${s.factories}</i></span>`;
    // Power grid: powered/load, capacity, and an overload warning.
    const power = this.el('industryPower');
    const anyPower = s.powerCapacity || s.powerLoad || s.generators;
    power.classList.toggle('hidden', !anyPower);
    if (anyPower) {
      power.innerHTML = s.powerOverloaded
        ? `⚡ <span class="poll-high">OVERLOAD ${s.poweredCount}/${s.powerLoad}</span> · add power (cap ${s.powerCapacity})`
        : `⚡ Powered ${s.poweredCount}/${s.powerLoad} · cap ${s.powerCapacity}`;
    }
    const poll = this.el('industryPollution');
    const link = s.factories
      ? ` · 🔗 ${s.linkedFactories}/${s.factories}${s.efficiencyPct > 0 ? ` ⚡+${s.efficiencyPct}%` : ''}`
      : '';
    poll.textContent = `🌫️ Smog ${s.pollution}${s.windmills ? ` · 🌬️×${s.windmills}` : ''}${link}`;
    poll.classList.toggle('poll-high', s.pollution >= 10);
  }

  renderObjectives(game) {
    const list = this.el('objList');
    if (game.prelife?.active) {
      const n = Math.min(2, game.prelife.nutrients || 0);
      const m = Math.min(1, game.prelife.minerals || 0);
      this.el('objectiveTitle').textContent = '✦ Create The First Life';
      list.innerHTML =
        `<div class="obj-item"><span class="obj-ic">🫧</span><span>Gather drifting molecules <b>${n}/2</b></span></div>` +
        `<div class="obj-item"><span class="obj-ic">♨️</span><span>Find vent energy <b>${m}/1</b></span></div>` +
        `<div class="obj-count">${n + m}/3 ingredients aligned</div>`;
      return;
    }
    // In collapsed (mobile) mode show just the next goal to keep it tiny.
    const collapsed = this.root.classList.contains('info-collapsed');
    const originFocus = game.eraId === 'cell';
    const active = game.objectives.active(originFocus || collapsed ? 1 : 3);
    const relevant = originFocus ? game.objectives.mandatory() : game.objectives.all;
    const done = relevant.filter((o) => game.objectives.isDone(o.id)).length;
    const total = relevant.length;
    this.el('objectiveTitle').textContent = originFocus ? '🧬 Next Evolution' : '🎯 Objectives';
    let html = '';
    for (const o of active) {
      const cls = o.kind === 'mastery' ? ' mastery' : o.kind === 'portal' ? ' portal' : '';
      html += `<div class="obj-item${cls}"><span class="obj-ic">${o.icon}</span><span>${o.label}</span></div>`;
    }
    if (!active.length) html = `<div class="obj-item done">✅ All objectives complete!</div>`;
    html += `<div class="obj-count">${done}/${total} ${originFocus ? 'evolution steps' : 'done'}</div>`;
    html += `<div class="branch-compass">🧭 ${game.getBranchCompass()}</div>`;
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
    const recipes = availableRecipes(game.unlocked.set(), game.eraId);
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
  /** The flow-state combo meter (bottom-centre, above the hotbar). */
  renderCombo(game) {
    const c = game.combo;
    const el = this.el('comboMeter');
    const active = c && c.count >= 3;
    el.classList.toggle('hidden', !active);
    if (!active) return;
    const tier = c.tier >= 0 ? c.tier : 0;
    const labels = ['Combo', 'Hot Streak', 'Blazing', 'UNSTOPPABLE'];
    const label = c.tier >= 0 ? labels[c.tier] : 'Combo';
    this.el('comboText').textContent = `🔥 ${label} ×${c.count}`;
    // Bar drains as the streak window runs out (4s).
    this.el('comboFill').style.width = `${Math.max(0, 100 - (c.idle / 4) * 100)}%`;
    el.classList.toggle('combo-hot', c.tier >= 2);
    el.classList.toggle('combo-max', c.tier >= 3);
  }

  /** Paint the corner minimap (desktop only, throttled). */
  renderMinimap(game) {
    if (this.isTouch) return;
    const now = Date.now();
    if (this._miniT && now - this._miniT < 160) return;
    this._miniT = now;
    const canvas = this.el('minimap');
    if (!canvas || !canvas.getContext) return;
    const m = buildMinimap(game.world, game.player.x, game.player.y - game.player.h / 2);
    if (canvas.width !== m.w || canvas.height !== m.h) { canvas.width = m.w; canvas.height = m.h; }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, m.w, m.h);
    // Faint deep-water/sky backdrop so caves read against it.
    ctx.fillStyle = 'rgba(10,16,34,0.55)';
    ctx.fillRect(0, 0, m.w, m.h);
    for (let row = 0; row < m.h; row++) {
      for (let col = 0; col < m.w; col++) {
        const c = m.colors[row * m.w + col];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(col, row, 1, 1);
      }
    }
    // Player marker.
    ctx.fillStyle = '#fff';
    ctx.fillRect(m.px - 1, m.py - 1, 3, 3);
    ctx.fillStyle = '#ffe14a';
    ctx.fillRect(m.px, m.py, 1, 1);
  }

  showCodex(show) { this.el('codexPanel').classList.toggle('hidden', !show); }
  showMarket(show) { this.el('marketPanel').classList.toggle('hidden', !show); }

  /**
   * The Map of Space & Time: the time axis runs top→down by age; each tier shows
   * its realities (current pulsing, visited solid, reachable dimmed, unbuilt
   * branches redacted ???). A "leakage" footer reveals the meta-layer only once
   * reality has begun to bend — kept partly redacted so the mystery survives.
   */
  renderMap(game) {
    const m = buildMapModel(game);
    const chron = chronicleOf(game);
    this.el('mapWalked').textContent = `${m.agesWalked} age${m.agesWalked === 1 ? '' : 's'} walked${m.rumoredCount ? ` · ${m.rumoredCount} path${m.rumoredCount === 1 ? '' : 's'} unexplored` : ''}`;
    const mapHead = `<div class="map-now${chron.alternate ? ' alt' : ''}">` +
      `🕰️ <b>${chron.when}</b><br>` +
      `${chron.icon} You are here: <b>${chron.where}</b> · ${chron.phase}<br>` +
      `<span class="map-reality">${chron.alternate ? '⟁ ' : '◆ '}${chron.realityLabel}</span>` +
      `</div>` +
      `<div class="paleo-map-container" style="text-align: center; margin: 10px 0;">` +
      `  <canvas id="paleoMapCanvas" width="300" height="150" style="background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;"></canvas>` +
      `</div>`;
    const tiers = m.tiers.map((t) => {
      const chips = t.nodes.map((n) =>
        `<span class="map-node map-${n.state}"><span class="map-ic">${n.icon}</span>${n.label}</span>`).join('');
      return `<div class="map-tier"><span class="map-age">Age ${t.tier}</span><div class="map-row">${chips}</div></div>`;
    }).join('<div class="map-link">┊</div>');
    let leak = '';
    if (m.leakage) {
      const lk = m.leakage;
      const layers = lk.layers.map((l) =>
        `<div class="map-layer${l.revealed ? '' : ' redacted'}">⊂ <b>${l.label}</b> <small>${l.note}</small></div>`).join('');
      leak = `<div class="map-leak">
        <div class="map-leak-head">∿ Signal beneath the map</div>
        <div class="map-leak-stats">✷ divergence ${lk.divergence} · ${lk.branches} branched · ${lk.crossovers} crossover${lk.crossovers === 1 ? '' : 's'}</div>
        ${layers}
      </div>`;
    }
    this.el('mapBody').innerHTML = `${mapHead}<div class="map-flow">${tiers}</div>${leak}`;
    this._drawPaleoMap(this.el('paleoMapCanvas'), game);
  }

  _drawPaleoMap(canvas, game) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    const eraId = game.eraId;
    const threadId = game.thread || 'salvador';
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let x = 30; x < w; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 30; y < h; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const toXY = (lat, lon) => {
      const cx = (lon + 180) * (w / 360);
      const cy = (90 - lat) * (h / 180);
      return { x: cx, y: cy };
    };

    ctx.fillStyle = eraId === 'cell' ? '#273b30' : '#3c5a43';
    ctx.strokeStyle = eraId === 'cell' ? '#3e5c4a' : '#558260';
    ctx.lineWidth = 1.5;

    const drawPolygon = (pts) => {
      if (pts.length < 3) return;
      ctx.beginPath();
      const first = toXY(pts[0].lat, pts[0].lon);
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < pts.length; i++) {
        const p = toXY(pts[i].lat, pts[i].lon);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    if (eraId === 'cell') {
      ctx.fillStyle = '#ff7b54';
      ctx.strokeStyle = '#ffb085';
      const islands = [
        { lat: 10, lon: 20 }, { lat: 11, lon: 22 }, { lat: -5, lon: -40 },
        { lat: 35, lon: 90 }, { lat: -25, lon: -120 }, { lat: 55, lon: -10 }
      ];
      for (const isl of islands) {
        const pt = toXY(isl.lat, isl.lon);
        ctx.beginPath(); ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    } else if (eraId === 'stone' || eraId === 'flora') {
      drawPolygon([
        { lat: 60, lon: -120 }, { lat: 55, lon: -60 }, { lat: 40, lon: -30 },
        { lat: 50, lon: 30 }, { lat: 65, lon: 90 }, { lat: 50, lon: 140 },
        { lat: 25, lon: 100 }, { lat: 30, lon: 0 }, { lat: 20, lon: -80 }
      ]);
      drawPolygon([
        { lat: -10, lon: -60 }, { lat: -5, lon: 10 }, { lat: -25, lon: 40 },
        { lat: -15, lon: 80 }, { lat: -45, lon: 120 }, { lat: -65, lon: 70 },
        { lat: -55, lon: -10 }, { lat: -50, lon: -80 }, { lat: -35, lon: -90 }
      ]);
    } else {
      drawPolygon([
        { lat: 70, lon: -160 }, { lat: 75, lon: -100 }, { lat: 55, lon: -60 },
        { lat: 25, lon: -80 }, { lat: 15, lon: -90 }, { lat: 10, lon: -80 },
        { lat: 20, lon: -100 }, { lat: 35, lon: -120 }, { lat: 60, lon: -140 }
      ]);
      drawPolygon([
        { lat: 10, lon: -75 }, { lat: -5, lon: -35 }, { lat: -20, lon: -40 },
        { lat: -50, lon: -70 }, { lat: -45, lon: -75 }, { lat: -15, lon: -80 }
      ]);
      drawPolygon([
        { lat: 70, lon: 10 }, { lat: 75, lon: 90 }, { lat: 70, lon: 160 },
        { lat: 35, lon: 120 }, { lat: 10, lon: 100 }, { lat: 15, lon: 80 },
        { lat: 30, lon: 35 }, { lat: 10, lon: 45 }, { lat: -30, lon: 20 },
        { lat: -15, lon: 10 }, { lat: 5, lon: -10 }, { lat: 35, lon: -10 },
        { lat: 50, lon: 0 }
      ]);
      drawPolygon([
        { lat: -15, lon: 115 }, { lat: -15, lon: 145 }, { lat: -35, lon: 145 },
        { lat: -30, lon: 115 }
      ]);
      drawPolygon([
        { lat: -80, lon: -150 }, { lat: -80, lon: -50 }, { lat: -80, lon: 50 },
        { lat: -80, lon: 150 }, { lat: -85, lon: 0 }
      ]);
    }

    let dotLat = 0;
    let dotLon = 0;
    let dotColor = '#ffab40';
    
    if (threadId === 'salvador') {
      dotColor = '#ffab40';
      if (eraId === 'cell') {
        dotLat = -12.97; dotLon = -38.51;
      } else if (eraId === 'stone' || eraId === 'flora') {
        dotLat = -23.9; dotLon = -11.0;
      } else {
        dotLat = -12.97; dotLon = -38.51;
      }
    } else {
      dotColor = '#40c4ff';
      if (eraId === 'cell') {
        dotLat = 59.33; dotLon = 18.07;
      } else if (eraId === 'stone' || eraId === 'flora') {
        dotLat = 38.3; dotLon = 19.3;
      } else {
        dotLat = 59.33; dotLon = 18.07;
      }
    }
    
    const pt = toXY(dotLat, dotLon);
    
    if (eraId === 'cell') {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.arc(pt.x, pt.y, 18, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '7px system-ui, sans-serif';
      ctx.fillText('beyond reconstruction', pt.x - 38, pt.y + 28);
    }
    
    const pulse = 1 + 0.3 * Math.sin(Date.now() * 0.008);
    ctx.shadowColor = dotColor;
    ctx.shadowBlur = 8;
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 4.5 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 9 * pulse, 0, Math.PI * 2);
    ctx.stroke();
  }

  /**
   * The era market: spend era-themed tokens on relevant accelerants and
   * one-time limited relics. Stock + currency are pulled from EraMarket so each
   * age reads of-its-place (Biomass in the sea, Credits in the factory).
   */
  renderMarket(game) {
    const m = game.market;
    if (!m) return;
    const cur = m.currency(game.eraId);
    const tokens = Math.floor(game.civ?.tokens || 0);
    this.el('marketTitle').textContent = `🛒 ${getEra(game.eraId)?.name || 'Era'} Market`;
    this.el('marketWallet').textContent = `${cur.icon} ${tokens} ${cur.name}`;
    const offers = m.offersFor(game.eraId);
    this.el('marketBody').innerHTML = offers.length ? offers.map((o) => {
      const claimed = m.isClaimed(o);
      const afford = m.canBuy(o, tokens);
      const badge = o.limited ? '<span class="mk-limited">LIMITED</span>' : '';
      const btn = claimed
        ? '<button class="mk-buy owned" disabled>Owned ✓</button>'
        : `<button class="mk-buy${afford ? '' : ' poor'}" data-offer="${o.id}"${afford ? '' : ' disabled'}>${cur.icon} ${o.cost}</button>`;
      return `<div class="mk-row${o.limited ? ' limited' : ''}${claimed ? ' claimed' : ''}">
        <span class="mk-ic">${o.icon}</span>
        <div class="mk-info"><b>${o.name}${badge}</b><small>${o.desc}</small></div>
        ${btn}</div>`;
    }).join('') : '<p class="muted small">No market in this era yet.</p>';
    // Wire the buy buttons (re-rendered each open / after a purchase).
    for (const b of this.el('marketBody').querySelectorAll('.mk-buy[data-offer]')) {
      b.onclick = () => this.h.onBuyOffer?.(b.dataset.offer);
    }
  }

  /**
   * The Journal gives the clue/discovery/structure data a browsable home and
   * surfaces which alternate-history branch the player is leaning toward — the
   * "uncover history" promise the landing page makes.
   */
  renderJournal(game) {
    const clues = game.clues?.all?.() || [];
    const discos = game.discoveries?.all?.() || [];
    const structs = game.structures?.all?.() || [];

    const branchName = {
      saurian_echo: 'Saurian Echo', firekeepers: 'Firekeepers',
      accurate_line: 'Survivors', merchant_city: 'Merchant City',
      fortress_city: 'Fortress City', road_empire: 'Road Empire', city_state: 'City-State',
    };
    const compass = game.getBranchCompass();
    this.el('journalBranch').innerHTML = `🧭 <b>Branch Compass:</b> ${compass}`;

    const section = (title, total, found, rows) =>
      `<div class="jr-section"><div class="jr-head">${title} <span class="muted">${found}/${total}</span></div>${rows}</div>`;

    const clueRows = clues.length ? clues.map((c) => {
      const got = game.clues.has(c.id);
      return `<div class="jr-row ${got ? '' : 'locked'}"><span class="jr-ic">${got ? c.icon : '❔'}</span>
        <div><b>${got ? c.label : '???'}</b><small>${got ? c.text : 'Undiscovered — explore and mine to reveal.'}</small></div></div>`;
    }).join('') : '<p class="muted small">No clues defined for this era.</p>';

    const discoRows = discos.map((d) => {
      const got = game.discoveries.has(d.id);
      return `<div class="jr-row ${got ? '' : 'locked'}"><span class="jr-ic">${got ? d.icon : '🔒'}</span>
        <div><b>${got ? d.label : 'Hidden discovery'}</b><small>${got ? 'Unlocked' : 'Keep experimenting to find this.'}</small></div></div>`;
    }).join('');

    const structRows = structs.map((s) => {
      const got = game.structures.has(s.id);
      return `<div class="jr-row ${got ? '' : 'locked'}"><span class="jr-ic">${got ? s.icon : '⬚'}</span>
        <div><b>${got ? s.label : '???'}</b><small>${got ? 'Recognized' : 'Build this structure to recognize it.'}</small></div></div>`;
    }).join('');

    // The hidden "matrix" layer: anomalies are real but easy to miss as a
    // fleeting toast, so the Journal gives them a permanent (redacted) home.
    const anomalies = game.anomalies?.all?.() || [];
    const anomalyRows = anomalies.map((a) => {
      const got = game.anomalies.has(a.id);
      return `<div class="jr-row anomaly ${got ? '' : 'locked'}"><span class="jr-ic">${got ? a.icon : '▓'}</span>
        <div><b>${got ? a.label : '█████████'}</b><small>${got ? a.text : 'An unexplained reading. Not yet observed.'}</small></div></div>`;
    }).join('');

    // Limited market relics earned, as a small trophy case.
    const badges = game.market?.badges?.() || [];
    const badgeRows = badges.map((b) =>
      `<div class="jr-row"><span class="jr-ic">${b.icon}</span>
        <div><b>${b.name}</b><small>${b.desc}</small></div></div>`).join('');

    // The nested-reality map: revealed layers + the next one as a redacted lure.
    const simLayers = game.simulation?.layers?.() || [];
    const shownLayers = simLayers.filter((l) => l.revealed || l.edge);
    const layerRows = shownLayers.map((l, i) => {
      const indent = `style="margin-left:${i * 14}px"`;
      return l.revealed
        ? `<div class="jr-row sim" ${indent}><span class="jr-ic">⊂</span><div><b>${l.label}</b><small>${l.note}</small></div></div>`
        : `<div class="jr-row sim locked" ${indent}><span class="jr-ic">▓</span><div><b>███████</b><small>Something contains this. Not yet understood.</small></div></div>`;
    }).join('');
    const revealedCount = simLayers.filter((l) => l.revealed).length;

    // Achievements: unlocked shown bright, locked dimmed, secret ones redacted.
    const achs = game.achievements?.all?.() || [];
    const achRows = achs.map((a) => {
      const got = game.achievements.has(a.id);
      const hidden = a.secret && !got;
      return `<div class="jr-row ${got ? 'ach-got' : 'locked'}"><span class="jr-ic">${got ? a.icon : (hidden ? '❔' : '🔒')}</span>
        <div><b>${got ? a.name : (hidden ? '???' : a.name)}</b><small>${got ? a.desc : (hidden ? 'A secret achievement.' : a.desc)}</small></div></div>`;
    }).join('');

    this.el('journalBody').innerHTML =
      section('🔎 Clues', clues.length, game.clues?.count?.() || 0, clueRows) +
      (achs.length ? section('🏆 Achievements', game.achievements.total(), game.achievements.count(), achRows) : '') +
      (revealedCount > 1 ? section('∞ Nested Reality', simLayers.length, revealedCount, layerRows) : '') +
      (badges.length ? section('🏅 Relics', badges.length, badges.length, badgeRows) : '') +
      section('🏛️ Structures', structs.length, structs.filter((s) => game.structures.has(s.id)).length, structRows) +
      section('✨ Discoveries', discos.length, discos.filter((d) => game.discoveries.has(d.id)).length, discoRows) +
      (anomalies.length ? section('⩗ Anomalies', anomalies.length, anomalies.filter((a) => game.anomalies.has(a.id)).length, anomalyRows) : '');
  }

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
    const rows = [
      ['🌍 Era', s.era], ['🧭 Ages traveled', s.ages], ['✨ Civ Points', s.cp],
      ['🏛️ Population', s.population], ['⛏️ Blocks mined', s.mined], ['🧱 Blocks built', s.built],
      ['🕳️ Deepest dig', s.deepest], ['🔎 Clues found', s.clues],
      ['🏆 Achievements', s.achievements], ['✷ Realities branched', s.branches],
    ];
    if (s.daily) rows.push(['🗓️ Daily', s.daily]);
    this.el('deathStats').innerHTML = rows
      .filter(([, v]) => v != null)
      .map(([k, v]) => `<div class="death-stat"><span>${k}</span><b>${v ?? 0}</b></div>`).join('');
    screen.classList.remove('hidden');
  }

  /**
   * First-run coach-marks. `done` is called once when the player finishes or
   * skips. `touch` swaps in touch-specific wording.
   */
  /**
   * Full-screen era reveal shown on entering an era (and on advancement). Makes
   * the core progression beat land instead of a tiny toast: name, story, and
   * what this age is about. `done` resumes play.
   */
  showEraIntro(era, done, route = null, variant = null) {
    this.el('eraIntroGo').textContent = 'Begin →';
    const m = era.manifest || {};
    this.el('eraIntroIcon').textContent = era.icon || '🌀';
    this.el('eraIntroTitle').textContent = m.title || era.name;
    // The reality variant names this run's flavor of the age (e.g. "Sunlit
    // Shallows") so each start feels distinct and shareable.
    this.el('eraIntroSub').textContent = variant
      ? `${variant.name} — ${variant.blurb || m.subtitle || era.blurb || ''}`
      : (m.subtitle || era.blurb || '');
    const loop = (m.coreLoop || []).slice(0, 4).join(' · ');
    const hazards = (m.hazards || []).slice(0, 3).join(', ');
    // The reality the player arrived through — each route colors the age.
    const branchName = {
      saurian_echo: 'Saurian Echo', firekeepers: 'Firekeepers', accurate_line: 'Survivors',
      merchant_city: 'Merchant', road_empire: 'Road Empire', fortress_city: 'Fortress',
      city_state: 'City-State',
    };
    const reality = route?.branch
      ? `<div class="ei-line"><span>🌌 Reality</span><b>arrived via the ${branchName[route.branch] || route.branch} branch</b></div>`
      : '';
    this.el('eraIntroBody').innerHTML = reality +
      (loop ? `<div class="ei-line"><span>🎯 Focus</span><b>${loop}</b></div>` : '') +
      (hazards ? `<div class="ei-line"><span>⚠️ Watch for</span><b>${hazards}</b></div>` : '');
    const screen = this.el('eraIntro');
    screen.classList.remove('hidden');
    this.el('eraIntroGo').onclick = () => { screen.classList.add('hidden'); done?.(); };
  }

  showPortalPreview(game, onConfirm) {
    const preview = this.el('portalPreview');
    if (!preview) { onConfirm?.(); return; }
    
    // Halt the game clock/movement
    game.paused = true;
    
    // Retrieve the routes for the current era
    const routes = ERA_ROUTES[game.eraId] || [];
    const primeRoute = routes.find(r => r.prime);
    const branchRoute = routes.find(r => r.branch);
    
    const primeEra = primeRoute ? getEra(primeRoute.to) : null;
    const branchEra = branchRoute ? getEra(branchRoute.to) : null;
    
    // Populate Prime Destination Card
    if (primeEra) {
      this.el('destPrimeIcon').textContent = primeEra.icon || '🪐';
      this.el('destPrimeTitle').textContent = primeEra.name;
      this.el('destPrimeDesc').textContent = primeEra.manifest?.subtitle || primeEra.blurb || 'The prime chronological spine.';
    } else {
      this.el('destPrimeIcon').textContent = '♾️';
      this.el('destPrimeTitle').textContent = 'Descend Layer';
      this.el('destPrimeDesc').textContent = 'Fold inward into a nested simulation layer.';
    }
    
    // Populate Branch Destination Card
    if (branchEra) {
      this.el('destBranch').classList.remove('hidden');
      this.el('destBranchIcon').textContent = branchEra.icon || '🌀';
      this.el('destBranchTitle').textContent = branchEra.name;
      this.el('destBranchDesc').textContent = branchEra.manifest?.subtitle || branchEra.blurb || 'An alternate historical divergence.';
    } else {
      this.el('destBranch').classList.add('hidden');
    }
    
    const activeBranch = game._dominantBranch();
    const isBranchDominant = branchRoute && activeBranch === branchRoute.branch;
    
    // Highlight dominant vs undominant cards
    const destPrimeCard = this.el('destPrime');
    const destBranchCard = this.el('destBranch');
    const destPrimeStatus = this.el('destPrimeStatus');
    const destBranchStatus = this.el('destBranchStatus');
    
    if (isBranchDominant) {
      destPrimeCard.classList.remove('dominant');
      destPrimeCard.classList.add('undominant');
      destPrimeStatus.textContent = 'Undominant';
      
      destBranchCard.classList.add('dominant');
      destBranchCard.classList.remove('undominant');
      destBranchStatus.textContent = 'Dominant';
    } else {
      destPrimeCard.classList.add('dominant');
      destPrimeCard.classList.remove('undominant');
      destPrimeStatus.textContent = 'Dominant';
      
      destBranchCard.classList.remove('dominant');
      destBranchCard.classList.add('undominant');
      destBranchStatus.textContent = 'Undominant';
    }
    
    // Compile influence list factors
    const list = this.el('influenceList');
    list.innerHTML = '';
    
    if (game.eraId === 'cell') {
      const isSunlit = game.world?.variant === 'sunlit';
      const nutrients = game.inventory?.count('nutrient_blob') || 0;
      const minerals = game.inventory?.count('mineral_vent') || 0;
      const rnaClue = game.clues?.has('chemical_gradient');
      const ventClue = game.clues?.has('warm_vent');
      
      list.innerHTML += `<li>☀️ <b>Starting variant:</b> ${isSunlit ? 'Sunlit Shallows (+5 to Photic)' : 'Deep Vents (+5 to Ventborn)'}</li>`;
      if (nutrients > 0) list.innerHTML += `<li>Drifting molecules: ${nutrients} absorbed (+${(nutrients * 0.5).toFixed(1)} to Photic)</li>`;
      if (minerals > 0) list.innerHTML += `<li>Vent energy: ${minerals} collected (+${(minerals * 1.5).toFixed(1)} to Ventborn)</li>`;
      if (rnaClue) list.innerHTML += `<li>🧬 <b>Chemical Gradient Clue:</b> discovered (+2 to Photic)</li>`;
      if (ventClue) list.innerHTML += `<li>🌋 <b>Warm Vent Clue:</b> discovered (+2 to Ventborn)</li>`;
    } else if (game.eraId === 'iron') {
      const trade = game.civ?.trade || 0;
      const road = (game.civ?.placed?.road || 0);
      const defense = (game.civ?.defense || 0);
      const gates = (game.civ?.placed?.gate || 0);
      
      if (trade > 0) list.innerHTML += `<li>🪙 <b>Trade transactions:</b> ${trade} (+${trade} to Merchant City)</li>`;
      if (road > 0) list.innerHTML += `<li>🛣️ <b>Road infrastructure:</b> ${road} (+${(road * 0.5).toFixed(1)} to Road Empire)</li>`;
      if (defense > 0 || gates > 0) list.innerHTML += `<li>🏰 <b>Defense & gates:</b> (+${(defense * 0.4 + gates).toFixed(1)} to Fortress City)</li>`;
    } else {
      const counts = game.clues?.branchCounts?.() || {};
      if (Object.keys(counts).length === 0) {
        list.innerHTML = '<li>◆ No specific alignment factors recorded. Timeline defaults to the Prime Spine.</li>';
      } else {
        for (const [b, n] of Object.entries(counts)) {
          if (n > 0) {
            const name = b.split('_')[0].charAt(0).toUpperCase() + b.split('_')[0].slice(1);
            list.innerHTML += `<li>📂 <b>${name} clues discovered:</b> ${n} (+${n} weight)</li>`;
          }
        }
      }
    }
    
    // Wire button clicks
    this.el('portalConfirmBtn').onclick = () => {
      this.audio?.play?.('unlock');
      preview.classList.add('hidden');
      game.paused = false;
      onConfirm?.();
    };
    
    this.el('portalCancelBtn').onclick = () => {
      this.audio?.play?.('ui');
      preview.classList.add('hidden');
      game.paused = false;
      
      // Push the player back slightly to avoid immediately re-triggering portal entry
      if (game.eraPortal) {
        game.player.x -= (game.player.x < game.eraPortal.x ? 1.55 : -1.55);
      }
    };
    
    preview.classList.remove('hidden');
  }

  showPrologueIntro(done, touch = false) {
    this.el('eraIntroIcon').textContent = '✦';
    this.el('eraIntroTitle').textContent = 'The Primordial Ocean';
    this.el('eraIntroSub').textContent = 'Before the First Cell · your first playable moment';
    this.el('eraIntroBody').innerHTML =
      `<div class="ei-line"><span>🌍 Your journey</span><b>create life, guide evolution, build civilizations, and branch reality</b></div>` +
      `<div class="ei-line"><span>✦ For now</span><b>${touch ? 'use the movement buttons' : 'use WASD or arrow keys'} to bring three ingredients together</b></div>`;
    const screen = this.el('eraIntro');
    screen.classList.remove('hidden');
    this.el('eraIntroGo').textContent = 'Begin the impossible →';
    this.el('eraIntroGo').onclick = () => {
      screen.classList.add('hidden');
      this.el('eraIntroGo').textContent = 'Begin →';
      done?.();
    };
  }

  showOnboarding(done, touch = false) {
    // The First Cell era plays differently (swim + absorb, no tools yet), so it
    // gets its own intro; later eras get the mine/build/craft tutorial.
    const steps = this.eraId === 'cell'
      ? [
        { icon: '🫧', title: 'Life begins with movement', body: touch ? 'Use ◀ ▶ ▲ ▼ and swim into the nearest glowing nutrient. Absorb it. Become more.' : 'Use WASD or the arrow keys and swim into the nearest glowing nutrient. Absorb it. Become more.' },
        { icon: '✷', title: 'Your choices create realities', body: 'Grow from one cell into civilizations, then bend history into worlds that should never have existed.' },
      ]
      : [
        { icon: '🌎', title: 'The world has changed', body: 'Mine, build, survive, and shape this age. What you prioritize can change which reality comes next.' },
        { icon: '⛏️', title: 'Make your first mark', body: touch ? 'Tap nearby blocks to mine. Switch ⛏/🧱 mode to build. Follow the next objective and improvise.' : 'Hold left-click to mine. Press Q or use the ⛏ Mine ⇄ Build button to build. Follow the next objective and improvise.' },
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
