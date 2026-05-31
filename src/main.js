/**
 * Entry point: loads assets, manages the menu screens (landing, time portals,
 * how-to, settings), and launches the Game. Owns meta-progression (unlocked
 * eras), user settings, and the shared Audio instance.
 */
import { MODE } from './core/constants.js';
import { ERAS } from './core/eras.js';
import { Progress } from './persistence/Progress.js';
import { Settings } from './persistence/Settings.js';
import { SaveManager } from './persistence/SaveManager.js';
import { Audio } from './systems/Audio.js';
import { Game } from './Game.js';

const screens = {};
let game = null;
let chosenMode = MODE.SURVIVAL;

const progress = new Progress();
const settings = new Settings();
const audio = new Audio({ sound: settings.get('sound'), music: settings.get('music') });

const sprites = {};

function loadSprites() {
  const manifest = {
    cow: 'assets/generated/sprites/cow.png',
    pig: 'assets/generated/sprites/pig.png',
    chicken: 'assets/generated/sprites/chicken.png',
    goat: 'assets/generated/sprites/goat.png',
    noah: 'assets/generated/sprites/player_idle.png',
    player: 'assets/generated/sprites/player.png',
    blockAtlas: 'assets/generated/textures/blocks.png',
    effects: 'assets/generated/effects/effects.png',
  };
  for (const n in manifest) {
    const img = new Image();
    img.src = manifest[n];
    sprites[n] = img;
  }
}

function show(id) {
  for (const key in screens) screens[key].classList.toggle('active', key === id);
}

function startGame({ eraId, mode, save }) {
  if (game) game.stop();
  audio.resume(); // unlock audio from the click that launched the game
  game = new Game({
    canvas: document.getElementById('gameCanvas'),
    hudRoot: document.getElementById('hud'),
    sprites,
    progress,
    settings,
    audio,
    onExit: () => { game = null; refreshLanding(); show('landing'); },
  });
  if (save) game.loadSave(save);
  else game.newWorld(eraId, mode);
  show('game');
  game.start();
}

function refreshLanding() {
  const cont = document.getElementById('continueBtn');
  const has = SaveManager.hasSave();
  cont.classList.toggle('disabled', !has);
  cont.disabled = !has;
}

function buildPortals() {
  const grid = document.getElementById('eraGrid');
  grid.innerHTML = '';
  for (const era of ERAS) {
    const unlocked = progress.isUnlocked(era.id);
    const playable = unlocked && (era.fullyPlayable || chosenMode === MODE.CREATIVE);
    const card = document.createElement('div');
    card.className = 'era-card' + (unlocked ? '' : ' locked') + (playable ? '' : ' soon');
    card.innerHTML = `
      <div class="era-icon">${era.icon}</div>
      <h3>${era.name}</h3>
      <p>${era.blurb}</p>
      <div class="era-foot">${
        !unlocked ? '🔒 Locked'
          : playable ? '▶ Enter'
            : '🚧 Coming soon'
      }</div>
    `;
    if (playable) {
      card.onclick = () => { audio.play('ui'); startGame({ eraId: era.id, mode: chosenMode }); };
    }
    grid.appendChild(card);
  }
}

function setMode(mode) {
  chosenMode = mode;
  document.getElementById('modeSurvival').classList.toggle('on', mode === MODE.SURVIVAL);
  document.getElementById('modeCreative').classList.toggle('on', mode === MODE.CREATIVE);
  document.getElementById('modeHint').textContent = mode === MODE.SURVIVAL
    ? '⚔️ Survival: gather, craft, survive, and earn Civ Points to open the next era.'
    : '🎨 Creative: free building with unlimited blocks, in any era you have unlocked.';
  const grid = document.getElementById('eraGrid');
  if (grid && grid.children.length) buildPortals();
}

function wire() {
  screens.landing = document.getElementById('landing');
  screens.portal = document.getElementById('portal');
  screens.howto = document.getElementById('howto');
  screens.game = document.getElementById('game');

  const click = (id, fn) => { const e = document.getElementById(id); if (e) e.onclick = () => { audio.resume(); audio.play('ui'); fn(); }; };

  click('playBtn', () => { buildPortals(); show('portal'); });
  click('continueBtn', () => {
    const save = SaveManager.load();
    if (save) startGame({ save });
  });
  click('howtoBtn', () => show('howto'));
  click('howtoBack', () => show('landing'));
  click('portalBack', () => show('landing'));

  document.getElementById('modeSurvival').onclick = () => { audio.play('ui'); setMode(MODE.SURVIVAL); };
  document.getElementById('modeCreative').onclick = () => { audio.play('ui'); setMode(MODE.CREATIVE); };

  setMode(MODE.SURVIVAL);
  refreshLanding();
}

window.addEventListener('DOMContentLoaded', () => {
  loadSprites();
  wire();
  show('landing');
});
