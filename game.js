// ===== Constants for Scaling =====
const BLOCK_SIZE = 20;
const PLAYER_WIDTH = BLOCK_SIZE;
const PLAYER_HEIGHT = BLOCK_SIZE * 2;
const ANIMAL_SIZE = Math.round(BLOCK_SIZE * 1.2);
// ===== Global Variables =====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;
const totalRows = 100;
const gravity = 0.3;
const moveSpeed = 2;
const jumpStrength = 8;
let gameMode;
let biome; // "forest", "desert", "tundra", or random
let world = {};
let selectedBlock = null;
let cutTrees = [];
const dayDuration = 300000;
let gameStartTime = Date.now();
const textureCache = {};
let gameOverFlag = false;
let keys = {};
let paused = false;
let lastAnimalSpawnTime = Date.now();
let lastRegenTime = Date.now();
let wasOnGround = true;
let minYInAir;
let animals = [];
let mobs = [];
// ===== Load Images =====
const animalImages = {
  cow: new Image(),
  pig: new Image(),
  chicken: new Image(),
  polarbear: new Image(),
  noah: new Image(),
};
// Set image sources from repo root (no assets/ prefix)
animalImages.cow.src = "cow.png";
animalImages.pig.src = "pig.png";
animalImages.chicken.src = "chicken.png";
animalImages.polarbear.src = "polarbear.png";
animalImages.noah.src = "noah.png";

// ... rest of the original code remains unchanged below ...

// Ensure DOM elements exist before using
function safeGet(id) {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

// Example: where you previously did document.getElementById("gameOverScreen").style.display = "none";
// Now guard it:
const _gameOverScreen = safeGet("gameOverScreen");
if (_gameOverScreen) _gameOverScreen.style.display = "none";

// Event Listeners
const _exitBtn = safeGet("exitButton");
if (_exitBtn) _exitBtn.addEventListener("click", exitToMenu);

// Global key listeners remain safe on document
if (typeof document !== 'undefined') {
  document.addEventListener("keydown", (e) => {
    if (!paused) keys[e.key.toLowerCase()] = true;
    if (e.key === "Escape" && !gameOverFlag) exitToMenu();
    if (e.key.toLowerCase() === "s" && !paused && !gameOverFlag) saveGame();
  });

  document.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "e" && !paused && inventory.meat > 0) {
      inventory.meat--;
      player.health = Math.min(player.health + 20, player.maxHealth);
      showMessage("Ate meat, restored 20 health.");
      updateInventoryUI();
    }
  });
}
