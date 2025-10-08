/**
 * Game State Management
 * Handles all game state, including grid, pieces, score, level, etc.
 */
class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    // Core game state
    this.grid = this.createEmptyGrid();
    this.currentPiece = null;
    this.nextPieces = [];
    this.heldPiece = null;
    this.canHold = true;
    this.ghostPiece = null;
    
    // Game metrics
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.combo = 0;
    this.gameOver = false;
    this.paused = false;
    this.gameStarted = false;
    
    // Character selection
    this.selectedCharacter = localStorage.getItem('selectedCharacter') || 'steve';
    this.characterAttributes = this.getCharacterAttributes(this.selectedCharacter);
    
    // Timing
    this.fallTime = 0;
    this.fallSpeed = GameConfig.getFallSpeed(1);
    this.lastUpdate = 0;
    this.gameTime = 0;
    
    // Power-ups and effects
    this.activePowerUps = new Map();
    this.powerUpQueue = [];
    this.particles = [];
    this.screenShake = 0;
    
    // Statistics
    this.stats = {
      totalPieces: 0,
      linesCleared: {
        single: 0,
        double: 0,
        triple: 0,
        tetris: 0
      },
      maxCombo: 0,
      timeAlive: 0,
      piecesPerSecond: 0
    };
    
    // Settings
    this.settings = {
      ghostPieceEnabled: true,
      particlesEnabled: true,
      screenShakeEnabled: true,
      soundEnabled: true,
      musicEnabled: true,
      volume: 0.7,
      difficulty: 'normal'
    };
    
    // Easter egg tracking
    this.easterEggState = {
      konamiProgress: 0,
      secretKeysPressed: [],
      activeEggs: new Set()
    };
  }

  // Character management
  setCharacter(characterName) {
    this.selectedCharacter = characterName;
    this.characterAttributes = this.getCharacterAttributes(characterName);
    localStorage.setItem('selectedCharacter', characterName);
  }

  getCharacterAttributes(characterName) {
    const characters = {
      steve: {
        name: 'Steve',
        speed: 1.0,
        scoreMultiplier: 1.0,
        specialAbility: 'balanced',
        color: '#4A90E2'
      },
      alex: {
        name: 'Alex',
        speed: 1.15,
        scoreMultiplier: 0.95,
        specialAbility: 'fast_movement',
        color: '#E94F37'
      },
      miner: {
        name: 'Miner',
        speed: 0.9,
        scoreMultiplier: 1.2,
        specialAbility: 'bonus_points',
        color: '#F6C667'
      },
      builder: {
        name: 'Builder',
        speed: 0.85,
        scoreMultiplier: 1.0,
        specialAbility: 'clear_bonus',
        color: '#52B788'
      }
    };
    return characters[characterName] || characters.steve;
  }

  createEmptyGrid() {
    return Array(GameConfig.GRID_HEIGHT).fill(null).map(() => 
      Array(GameConfig.GRID_WIDTH).fill(0)
    );
  }

  // Grid operations
  isValidPosition(piece, offsetX = 0, offsetY = 0) {
    if (!piece) return false;
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.x + x + offsetX;
          const newY = piece.y + y + offsetY;
          
          if (newX < 0 || newX >= GameConfig.GRID_WIDTH ||
              newY >= GameConfig.GRID_HEIGHT) {
            return false;
          }
          
          if (newY >= 0 && this.grid[newY][newX]) {
            return false;
          }
        }
      }
    }
    return true;
  }

  lockPiece(piece) {
    if (!piece) return;
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const gridY = piece.y + y;
          const gridX = piece.x + x;
          if (gridY >= 0) {
            this.grid[gridY][gridX] = piece.type;
          }
        }
      }
    }
    
    this.stats.totalPieces++;
  }

  clearLines() {
    let linesCleared = 0;
    const clearedRows = [];
    
    for (let y = this.grid.length - 1; y >= 0; y--) {
      if (this.grid[y].every(cell => cell !== 0)) {
        clearedRows.push(y);
        this.grid.splice(y, 1);
        this.grid.unshift(Array(GameConfig.GRID_WIDTH).fill(0));
        linesCleared++;
        y++;
      }
    }
    
    if (linesCleared > 0) {
      this.updateScore(linesCleared);
      this.updateStats(linesCleared);
      this.createClearEffect(clearedRows);
    } else {
      this.combo = 0;
    }
    
    return linesCleared;
  }

  updateScore(linesCleared) {
    const basePoints = [0, 100, 300, 500, 800];
    let points = basePoints[linesCleared] * this.level;
    
    // Apply character score multiplier
    points *= this.characterAttributes.scoreMultiplier;
    
    if (this.combo > 0) {
      points *= (1 + this.combo * 0.1);
    }
    
    this.score += Math.floor(points);
    this.lines += linesCleared;
    this.combo++;
    
    if (this.combo > this.stats.maxCombo) {
      this.stats.maxCombo = this.combo;
    }
    
    const newLevel = Math.floor(this.lines / 10) + 1;
    if (newLevel !== this.level) {
      this.level = newLevel;
      this.fallSpeed = GameConfig.getFallSpeed(this.level);
    }
  }

  updateStats(linesCleared) {
    const types = ['', 'single', 'double', 'triple', 'tetris'];
    if (linesCleared > 0 && linesCleared <= 4) {
      this.stats.linesCleared[types[linesCleared]]++;
    }
  }

  createClearEffect(rows) {
    rows.forEach(row => {
      for (let x = 0; x < GameConfig.GRID_WIDTH; x++) {
        this.particles.push({
          x: x * GameConfig.BLOCK_SIZE,
          y: row * GameConfig.BLOCK_SIZE,
          vx: (Math.random() - 0.5) * 5,
          vy: (Math.random() - 0.5) * 5,
          life: 1.0,
          color: this.characterAttributes.color
        });
      }
    });
    
    this.screenShake = 10;
  }

  updateParticles(deltaTime) {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.life -= deltaTime / 1000;
      return p.life > 0;
    });
    
    if (this.screenShake > 0) {
      this.screenShake--;
    }
  }

  calculateGhostPiece(piece) {
    if (!piece || !this.settings.ghostPieceEnabled) {
      return null;
    }
    
    const ghost = { ...piece, y: piece.y };
    while (this.isValidPosition(ghost, 0, 1)) {
      ghost.y++;
    }
    return ghost;
  }

  // Power-up system
  addPowerUp(type, duration) {
    this.activePowerUps.set(type, {
      timeLeft: duration,
      active: true
    });
  }

  updatePowerUps(deltaTime) {
    for (const [type, powerUp] of this.activePowerUps) {
      powerUp.timeLeft -= deltaTime;
      if (powerUp.timeLeft <= 0) {
        this.activePowerUps.delete(type);
      }
    }
  }

  hasPowerUp(type) {
    return this.activePowerUps.has(type);
  }

  // Easter egg handling
  checkKonamiCode(key) {
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 
                        'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    
    if (key === konamiCode[this.easterEggState.konamiProgress]) {
      this.easterEggState.konamiProgress++;
      if (this.easterEggState.konamiProgress === konamiCode.length) {
        this.activateEasterEgg('KONAMI');
        this.easterEggState.konamiProgress = 0;
      }
    } else {
      this.easterEggState.konamiProgress = 0;
    }
  }

  activateEasterEgg(eggType) {
    this.easterEggState.activeEggs.add(eggType);
    
    switch(eggType) {
      case 'KONAMI':
        this.addPowerUp('RAINBOW_MODE', 30000);
        break;
      case 'SPEED_DEMON':
        this.addPowerUp('SUPER_SPEED', 15000);
        break;
      case 'GOD_MODE':
        this.addPowerUp('GODMODE', 10000);
        break;
    }
  }

  // Game state queries
  isGameOver() {
    return this.gameOver;
  }

  isPaused() {
    return this.paused;
  }

  togglePause() {
    this.paused = !this.paused;
  }

  // Statistics and progress
  updateGameTime(deltaTime) {
    this.gameTime += deltaTime;
    this.stats.timeAlive = this.gameTime;
    this.stats.piecesPerSecond = this.stats.totalPieces / (this.gameTime / 1000);
  }

  // Serialization for save/load
  serialize() {
    return {
      score: this.score,
      lines: this.lines,
      level: this.level,
      stats: this.stats,
      settings: this.settings,
      selectedCharacter: this.selectedCharacter,
      easterEggs: Array.from(this.easterEggState.activeEggs)
    };
  }

  deserialize(data) {
    this.score = data.score || 0;
    this.lines = data.lines || 0;
    this.level = data.level || 1;
    this.stats = { ...this.stats, ...data.stats };
    this.settings = { ...this.settings, ...data.settings };
    if (data.selectedCharacter) {
      this.setCharacter(data.selectedCharacter);
    }
    if (data.easterEggs) {
      this.easterEggState.activeEggs = new Set(data.easterEggs);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameState;
}
