/**
 * Service worker — offline support for the static game.
 *
 * Strategy: precache the app shell + assets on install; serve cache-first and
 * fall back to network. Bump CACHE on every release so clients pick up new
 * code (old caches are pruned on activate).
 *
 * The list is intentionally explicit (no build step) so what ships is what we
 * cache. Missing entries still work — they just fetch from network.
 */
const CACHE = 'blockscreate-v5.64.0';

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './favicon.png',
  // Core modules
  './src/main.js',
  './src/Game.js',
  './src/core/constants.js',
  './src/core/blocks.js',
  './src/core/items.js',
  './src/core/eras.js',
  './src/core/eraGraph.js',
  './src/core/RealityCode.js',
  './src/core/DailyChallenge.js',
  './src/core/eraManifests.js',
  './src/core/eraTheme.js',
  './src/core/eraModifiers.js',
  './src/core/recipes.js',
  './src/core/deepTime.js',
  './src/world/World.js',
  './src/world/noise.js',
  './src/entities/Player.js',
  './src/entities/Mob.js',
  './src/systems/Inventory.js',
  './src/systems/Crafting.js',
  './src/systems/Civilization.js',
  './src/systems/Objectives.js',
  './src/systems/Settlers.js',
  './src/systems/IndustryNetwork.js',
  './src/systems/PowerGrid.js',
  './src/systems/Timeline.js',
  './src/systems/EraMarket.js',
  './src/systems/Simulation.js',
  './src/systems/Achievements.js',
  './src/systems/SpaceTimeMap.js',
  './src/systems/Chronicle.js',
  './src/systems/Minimap.js',
  './src/systems/Combo.js',
  './src/systems/FloatingText.js',
  './src/systems/Haptics.js',
  './src/systems/Discoveries.js',
  './src/systems/HistoricalClues.js',
  './src/systems/Structures.js',
  './src/systems/Powerups.js',
  './src/systems/WorldEvents.js',
  './src/systems/SimulationAnomalies.js',
  './src/systems/GuidanceHints.js',
  './src/systems/Audio.js',
  './src/render/Camera.js',
  './src/render/Renderer.js',
  './src/render/Particles.js',
  './src/input/Input.js',
  './src/ui/HUD.js',
  './src/ui/ShareCard.js',
  './src/ui/LandingScene.js',
  './src/persistence/SaveManager.js',
  './src/persistence/Progress.js',
  './src/persistence/Settings.js',
  // Art
  './assets/generated/textures/blocks.png',
  './assets/generated/textures/blocks_extra.png',
  './assets/generated/effects/effects.png',
  './assets/generated/landing/origin-to-dinos.png',
  './assets/generated/sprites/player.png',
  './assets/generated/sprites/player_idle.png',
  './assets/generated/sprites/cell.png',
  './assets/generated/sprites/cow.png',
  './assets/generated/sprites/pig.png',
  './assets/generated/sprites/chicken.png',
  './assets/generated/sprites/goat.png',
  './assets/generated/sprites/stego.png',
  './assets/generated/sprites/trike.png',
  './assets/generated/sprites/raptor.png',
  './assets/generated/sprites/rex.png',
  './assets/generated/sprites/wolf.png',
  './assets/generated/sprites/boar.png',
  './assets/generated/sprites/raider.png',
  './assets/generated/sprites/bandit.png',
  './assets/generated/sprites/machine.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS).catch(() => { /* tolerate missing entries */ }))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  e.respondWith(
    caches.match(request).then((hit) => hit || fetch(request).then((res) => {
      // Runtime-cache same-origin successful responses.
      if (res.ok && new URL(request.url).origin === self.location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
      }
      return res;
    }).catch(() => hit)),
  );
});
