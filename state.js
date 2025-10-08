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
    
    // Easter egg state
    this.easterEggState = {
      konamiProgress: 0,
      tetrisProgress: 0,
      rainbowProgress: 0,
      matrixProgress: 0,
      godmodeProgress: 0,
      activeEggs: new Set(),
      keySequence: []
    };
    
    // Theme and settings
    this.currentTheme = GameConfig.getCurrentTheme();
    this.settings = {
      music: true,
      sfx: true,
      showGhost: true,
      showGrid: true,
      particles: true,
      screenShake: true
    };
  }

  createEmptyGrid() {
    return Array(GameConfig.GRID.ROWS).fill().map(() => 
      Array(GameConfig.GRID.COLS).fill(0)
    );
  }

  // Piece management
  setPiece(piece) {
    this.currentPiece = piece;
    this.updateGhostPiece();
    this.canHold = true;
  }

  getNextPiece() {
    if (this.nextPieces.length === 0) {
      this.generateNextPieces();
    }
    return this.nextPieces.shift();
  }

  generateNextPieces() {
    const pieces = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    // Shuffle using 7-bag system for fair distribution
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    this.nextPieces.push(...pieces);
  }

  holdPiece() {
    if (!this.canHold) return false;
    
    const temp = this.currentPiece?.type || null;
    if (this.heldPiece) {
      this.setPiece(this.createPieceFromType(this.heldPiece));
    } else {
      this.setPiece(this.createPieceFromType(this.getNextPiece()));
    }
    this.heldPiece = temp;
    this.canHold = false;
    return true;
  }

  createPieceFromType(type) {
    // This would integrate with the Piece class from the original game
    // For now, return a basic structure
    return {
      type,
      x: Math.floor(GameConfig.GRID.COLS / 2) - 1,
      y: 0,
      rotation: 0,
      shape: this.getPieceShape(type)
    };
  }

  getPieceShape(type) {
    const shapes = {
      I: [[1,1,1,1]],
      O: [[1,1],[1,1]],
      T: [[0,1,0],[1,1,1]],
      S: [[0,1,1],[1,1,0]],
      Z: [[1,1,0],[0,1,1]],
      J: [[1,0,0],[1,1,1]],
      L: [[0,0,1],[1,1,1]]
    };
    return shapes[type] || shapes.T;
  }

  // Ghost piece calculation
  updateGhostPiece() {
    if (!this.currentPiece) {
      this.ghostPiece = null;
      return;
    }
    
    this.ghostPiece = { ...this.currentPiece };
    while (this.isValidPosition(this.ghostPiece.x, this.ghostPiece.y + 1, this.ghostPiece.shape)) {
      this.ghostPiece.y++;
    }
  }

  // Position validation
  isValidPosition(x, y, shape) {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newX = x + col;
          const newY = y + row;
          
          if (newX < 0 || newX >= GameConfig.GRID.COLS || 
              newY >= GameConfig.GRID.ROWS || 
              (newY >= 0 && this.grid[newY][newX])) {
            return false;
          }
        }
      }
    }
    return true;
  }

  // Line clearing
  checkAndClearLines() {
    const fullLines = [];
    
    for (let y = GameConfig.GRID.ROWS - 1; y >= 0; y--) {
      if (this.grid[y].every(cell => cell !== 0)) {
        fullLines.push(y);
      }
    }
    
    if (fullLines.length > 0) {
      this.clearLines(fullLines);
      this.updateScore(fullLines.length);
      this.updateCombo();
      return fullLines.length;
    } else {
      this.combo = 0;
    }
    
    return 0;
  }

  clearLines(lineNumbers) {
    // Remove cleared lines
    lineNumbers.sort((a, b) => a - b);
    lineNumbers.forEach(lineNum => {
      this.grid.splice(lineNum, 1);
      this.grid.unshift(Array(GameConfig.GRID.COLS).fill(0));
    });
    
    // Update statistics
    const count = lineNumbers.length;
    this.lines += count;
    this.stats.linesCleared[
      count === 1 ? 'single' :
      count === 2 ? 'double' :
      count === 3 ? 'triple' : 'tetris'
    ]++;
    
    // Check for level up
    const newLevel = Math.floor(this.lines / GameConfig.GAME.LINES_PER_LEVEL) + 1;
    if (newLevel > this.level && newLevel <= GameConfig.GAME.MAX_LEVEL) {
      this.level = newLevel;
      this.fallSpeed = GameConfig.getFallSpeed(this.level);
    }
  }

  updateScore(linesCleared) {
    const baseScore = {
      1: GameConfig.SCORING.SINGLE,
      2: GameConfig.SCORING.DOUBLE,
      3: GameConfig.SCORING.TRIPLE,
      4: GameConfig.SCORING.TETRIS
    }[linesCleared] || 0;
    
    let score = baseScore * this.level;
    
    // Apply combo multiplier
    if (this.combo > 0) {
      score *= Math.pow(GameConfig.SCORING.COMBO_MULTIPLIER, this.combo);
    }
    
    // Apply power-up multipliers
    if (this.activePowerUps.has('MULTI')) {
      score *= 2;
    }
    
    this.score += Math.floor(score);
  }

  updateCombo() {
    this.combo++;
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo);
  }

  // Power-up management
  addPowerUp(type, duration = 0) {
    if (duration > 0) {
      this.activePowerUps.set(type, Date.now() + duration);
    }
    this.powerUpQueue.push({ type, timestamp: Date.now() });
  }

  updatePowerUps(deltaTime) {
    const now = Date.now();
    
    // Remove expired power-ups
    for (const [type, expiry] of this.activePowerUps) {
      if (now > expiry) {
        this.activePowerUps.delete(type);
      }
    }
  }

  // Easter egg management
  processKeyForEasterEggs(key) {
    this.easterEggState.keySequence.push(key);
    
    // Keep only last 10 keys
    if (this.easterEggState.keySequence.length > 10) {
      this.easterEggState.keySequence.shift();
    }
    
    // Check each easter egg
    this.checkKonamiCode();
    this.checkWordCode('tetris', 'TETRIS');
    this.checkWordCode('rainbow', 'RAINBOW');
    this.checkWordCode('matrix', 'MATRIX');
    this.checkWordCode('godmode', 'GODMODE');
  }

  checkKonamiCode() {
    const konami = GameConfig.EASTER_EGGS.KONAMI;
    const sequence = this.easterEggState.keySequence;
    
    if (sequence.length >= konami.length) {
      const lastKeys = sequence.slice(-konami.length);
      if (JSON.stringify(lastKeys) === JSON.stringify(konami)) {
        this.activateEasterEgg('KONAMI');
      }
    }
  }

  checkWordCode(word, eggName) {
    const wordKeys = word.split('');
    const sequence = this.easterEggState.keySequence;
    
    if (sequence.length >= wordKeys.length) {
      const lastKeys = sequence.slice(-wordKeys.length);
      if (JSON.stringify(lastKeys) === JSON.stringify(wordKeys)) {
        this.activateEasterEgg(eggName);
      }
    }
  }

  activateEasterEgg(eggName) {
    if (this.easterEggState.activeEggs.has(eggName)) return;
    
    this.easterEggState.activeEggs.add(eggName);
    
    // Apply easter egg effects
    switch (eggName) {
      case 'KONAMI':
        this.score += 30000; // 30 lives worth of points
        this.addPowerUp('MULTI', 30000);
        break;
      case 'TETRIS':
        // Rain of I-pieces for 10 seconds
        this.addPowerUp('TETRIS_RAIN', 10000);
        break;
      case 'RAINBOW':
        // Rainbow theme and sparkles
        this.addPowerUp('RAINBOW', 20000);
        break;
      case 'MATRIX':
        // Matrix digital rain effect
        this.addPowerUp('MATRIX', 15000);
        break;
      case 'GODMODE':
        // Temporary invincibility
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
  updateStats(deltaTime) {
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
      easterEggs: Array.from(this.easterEggState.activeEggs)
    };
  }

  deserialize(data) {
    this.score = data.score || 0;
    this.lines = data.lines || 0;
    this.level = data.level || 1;
    this.stats = { ...this.stats, ...data.stats };
    this.settings = { ...this.settings, ...data.settings };
    if (data.easterEggs) {
      this.easterEggState.activeEggs = new Set(data.easterEggs);
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameState;
}
