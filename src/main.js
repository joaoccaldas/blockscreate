/**
 * Entry point: loads assets, manages the menu screens (landing, time portals,
 * how-to), and launches the Game. Also owns meta-progression (unlocked eras)
 * and save import/export wiring.
 */
import { MODE } from './core/constants.js';
import { ERAS } from './core/eras.js';
import { Progress } from './persistence/Progress.js';
import { SaveManager } from './persistence/SaveManager.js';
import { Game } from './Game.js';

const screens = {};
let game = null;
let chosenMode = MODE.SURVIVAL;
const progress = new Progress();

const sprites = {};

function loadSprites() {
  const names = ['cow', 'pig', 'chicken', 'noah'];
  for (const n of names) {
    const img = new Image();
    img.src = `${n}.png`;
    sprites[n] = img;
  }
}

function show(id) {
  for (const key in screens) screens[key].classList.toggle('active', key === id);
}

function startGame({ eraId, mode, save }) {
  if (game) game.stop();
  game = new Game({
    canvas: document.getElementById('gameCanvas'),
    hudRoot: document.getElementById('hud'),
    sprites,
    progress,
    onExit: () => { game = null; refreshLanding(); show('landing'); },
  });
  if (save) game.loadSave(save);
  else game.newWorld(eraId, mode);
  show('game');
  game.start();
}

function refreshLanding() {
  const cont = document.getElementById('continueBtn');
  if (SaveManager.hasSave()) {
    cont.classList.remove('disabled');
    cont.disabled = false;
  } else {
    cont.classList.add('disabled');
    cont.disabled = true;
  }
}

function buildPortals() {
  const grid = document.getElementById('eraGrid');
  grid.innerHTML = '';
  for (const era of ERAS) {
    const unlocked = progress.isUnlocked(era.id);
    const card = document.createElement('div');
    card.className = 'era-card' + (unlocked ? '' : ' locked');
    card.innerHTML = `
      <div class="era-icon">${era.icon}</div>
      <h3>${era.name}</h3>
      <p>${era.blurb}</p>
      <div class="era-foot">${unlocked ? (era.fullyPlayable ? 'Enter' : 'Preview') : '🔒 Locked'}</div>
    `;
    if (unlocked) {
      card.onclick = () => startGame({ eraId: era.id, mode: chosenMode });
    }
    grid.appendChild(card);
  }
}

function setMode(mode) {
  chosenMode = mode;
  document.getElementById('modeSurvival').classList.toggle('on', mode === MODE.SURVIVAL);
  document.getElementById('modeCreative').classList.toggle('on', mode === MODE.CREATIVE);
  const hint = document.getElementById('modeHint');
  hint.textContent = mode === MODE.SURVIVAL
    ? 'Survival: gather, craft, survive, and earn Civ Points to open the next era.'
    : 'Creative: free building in any era you have unlocked.';
}

function wire() {
  screens.landing = document.getElementById('landing');
  screens.portal = document.getElementById('portal');
  screens.howto = document.getElementById('howto');
  screens.game = document.getElementById('game');

  document.getElementById('playBtn').onclick = () => { buildPortals(); show('portal'); };
  document.getElementById('continueBtn').onclick = () => {
    const save = SaveManager.load();
    if (save) startGame({ save });
  };
  document.getElementById('howtoBtn').onclick = () => show('howto');
  document.getElementById('howtoBack').onclick = () => show('landing');
  document.getElementById('portalBack').onclick = () => show('landing');

  document.getElementById('modeSurvival').onclick = () => setMode(MODE.SURVIVAL);
  document.getElementById('modeCreative').onclick = () => setMode(MODE.CREATIVE);

  // In-game top controls.
  document.getElementById('btnSave').onclick = () => {
    if (game) { SaveManager.save(game); flash('Saved'); }
  };
  document.getElementById('btnExport').onclick = () => { if (game) SaveManager.exportFile(game); };
  document.getElementById('btnMenu').onclick = () => { if (game) game.exit(); };
  document.getElementById('importInput').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const save = await SaveManager.importFile(file);
      startGame({ save });
      flash('World imported');
    } catch (err) {
      flash('Import failed');
    }
    e.target.value = '';
  };

  setMode(MODE.SURVIVAL);
  refreshLanding();
}

function flash(msg) {
  const f = document.getElementById('flash');
  f.textContent = msg;
  f.classList.add('show');
  setTimeout(() => f.classList.remove('show'), 1500);
}

window.addEventListener('DOMContentLoaded', () => {
  loadSprites();
  wire();
  show('landing');
});
