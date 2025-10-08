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
  noah: new Image(),
};

// Set image sources from repo root (removed polarbear.png - file doesn't exist)
animalImages.cow.src = "cow.png";
animalImages.pig.src = "pig.png";
animalImages.chicken.src = "chicken.png";
animalImages.noah.src = "noah.png";

// ===== Navigation & Landing Page Logic =====

// Get landing page elements
const landingPage = document.getElementById("landingPage");
const characterSelection = document.getElementById("characterSelection");
const achievementsScreen = document.getElementById("achievementsScreen");
const gameContainer = document.getElementById("gameContainer");

// Get menu buttons
const startGameBtn = document.getElementById("startGameBtn");
const selectCharacterBtn = document.getElementById("selectCharacterBtn");
const achievementsBtn = document.getElementById("achievementsBtn");
const backFromCharacterBtn = document.getElementById("backFromCharacter");
const backFromAchievementsBtn = document.getElementById("backFromAchievements");
const mainMenuBtn = document.getElementById("mainMenuBtn");

// Character selection cards
const characterCards = document.querySelectorAll(".character-card");

// Show/Hide screens
function showScreen(screen) {
  // Hide all screens
  if (landingPage) landingPage.classList.add("hidden");
  if (characterSelection) characterSelection.classList.add("hidden");
  if (achievementsScreen) achievementsScreen.classList.add("hidden");
  if (gameContainer) gameContainer.classList.add("hidden");
  
  // Show requested screen
  if (screen) screen.classList.remove("hidden");
}

// Navigation button event listeners
if (startGameBtn) {
  startGameBtn.addEventListener("click", () => {
    showScreen(gameContainer);
    if (!gameStarted) {
      initGame();
    }
  });
}

if (selectCharacterBtn) {
  selectCharacterBtn.addEventListener("click", () => {
    showScreen(characterSelection);
  });
}

if (achievementsBtn) {
  achievementsBtn.addEventListener("click", () => {
    showScreen(achievementsScreen);
  });
}

if (backFromCharacterBtn) {
  backFromCharacterBtn.addEventListener("click", () => {
    showScreen(landingPage);
  });
}

if (backFromAchievementsBtn) {
  backFromAchievementsBtn.addEventListener("click", () => {
    showScreen(landingPage);
  });
}

if (mainMenuBtn) {
  mainMenuBtn.addEventListener("click", () => {
    showScreen(landingPage);
    gameStarted = false;
    paused = true;
  });
}

// Character selection logic
characterCards.forEach(card => {
  card.addEventListener("click", () => {
    // Remove selected class from all cards
    characterCards.forEach(c => c.classList.remove("selected"));
    // Add selected class to clicked card
    card.classList.add("selected");
    // Store selected character
    const character = card.getAttribute("data-character");
    localStorage.setItem("selectedCharacter", character);
  });
});

// ===== Game Initialization & Core Logic =====

let gameStarted = false;

function initGame() {
  gameStarted = true;
  paused = false;
  // Initialize game state here
  // This is a placeholder - full game logic would go here
  console.log("Game initialized!");
  
  // Start game loop if canvas exists
  if (canvas && ctx) {
    requestAnimationFrame(gameLoop);
  }
}

function gameLoop() {
  if (!paused && gameStarted) {
    // Game update logic would go here
    // For now, just clear canvas
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#87CEEB";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#000";
      ctx.font = "20px Arial";
      ctx.fillText("Game Running! Press Main Menu to return.", 50, 300);
    }
    requestAnimationFrame(gameLoop);
  }
}

// Global key listeners
if (typeof document !== 'undefined') {
  document.addEventListener("keydown", (e) => {
    if (!paused) keys[e.key.toLowerCase()] = true;
    if (e.key === "Escape" && gameStarted) {
      showScreen(landingPage);
      gameStarted = false;
      paused = true;
    }
  });
  
  document.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });
}

// Placeholder functions for compatibility
function saveGame() {
  console.log("Save game");
}

function showMessage(msg) {
  console.log(msg);
}

function updateInventoryUI() {
  console.log("Update inventory UI");
}

console.log("BlocksCreate game.js loaded successfully!");
