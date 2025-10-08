/**
 * Input Handler
 * Manages keyboard, mouse, and touch input with mobile support
 */

class InputHandler {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.keys = new Set();
    this.lastKeyTime = 0;
    this.keyRepeatDelay = 150;
    this.keyRepeatInterval = 50;
    
    // Touch/mobile support
    this.touchStartPos = null;
    this.touchStartTime = 0;
    this.lastTapTime = 0;
    this.touchMoveThreshold = GameConfig.MOBILE.SWIPE_THRESHOLD;
    
    // Input state
    this.moveLeft = false;
    this.moveRight = false;
    this.moveDown = false;
    this.rotateRequested = false;
    this.hardDropRequested = false;
    this.holdRequested = false;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Keyboard events
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    
    // Mouse events
    document.addEventListener('click', (e) => this.handleClick(e));
    document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    
    // Touch events for mobile
    document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    
    // Prevent default touch behaviors on canvas
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      canvas.addEventListener('touchstart', (e) => e.preventDefault());
      canvas.addEventListener('touchmove', (e) => e.preventDefault());
    }
  }

  handleKeyDown(e) {
    const key = e.key;
    
    // Prevent default for game keys
    if (this.isGameKey(key)) {
      e.preventDefault();
    }
    
    // Add to active keys
    this.keys.add(key);
    
    // Process easter egg codes
    this.gameEngine.state.processKeyForEasterEggs(key);
    
    // Handle immediate actions
    if (this.isKey(key, GameConfig.CONTROLS.PAUSE)) {
      this.gameEngine.togglePause();
      return;
    }
    
    if (this.gameEngine.state.paused) return;
    
    // Rotation
    if (this.isKey(key, GameConfig.CONTROLS.ROTATE_CW)) {
      this.rotateRequested = true;
      this.gameEngine.rotatePiece(1);
    } else if (this.isKey(key, GameConfig.CONTROLS.ROTATE_CCW)) {
      this.rotateRequested = true;
      this.gameEngine.rotatePiece(-1);
    }
    
    // Hard drop
    if (this.isKey(key, GameConfig.CONTROLS.HARD_DROP)) {
      this.hardDropRequested = true;
      this.gameEngine.hardDrop();
    }
    
    // Hold piece
    if (this.isKey(key, GameConfig.CONTROLS.HOLD)) {
      this.holdRequested = true;
      this.gameEngine.holdPiece();
    }
  }

  handleKeyUp(e) {
    this.keys.delete(e.key);
  }

  isKey(key, keyArray) {
    return keyArray.includes(key);
  }

  isGameKey(key) {
    return Object.values(GameConfig.CONTROLS).some(keys => keys.includes(key));
  }

  // Process continuous key presses (called in game loop)
  update(deltaTime) {
    if (this.gameEngine.state.paused) return;
    
    const now = Date.now();
    
    // Movement
    let moveLeft = false;
    let moveRight = false;
    let moveDown = false;
    
    for (const key of this.keys) {
      if (this.isKey(key, GameConfig.CONTROLS.LEFT)) {
        moveLeft = true;
      } else if (this.isKey(key, GameConfig.CONTROLS.RIGHT)) {
        moveRight = true;
      } else if (this.isKey(key, GameConfig.CONTROLS.DOWN)) {
        moveDown = true;
      }
    }
    
    // Apply movements with repeat delay
    if (moveLeft && !this.moveLeft) {
      this.gameEngine.movePiece(-1, 0);
      this.lastKeyTime = now;
      this.moveLeft = true;
    } else if (moveLeft && now - this.lastKeyTime > this.keyRepeatInterval) {
      this.gameEngine.movePiece(-1, 0);
      this.lastKeyTime = now;
    } else if (!moveLeft) {
      this.moveLeft = false;
    }
    
    if (moveRight && !this.moveRight) {
      this.gameEngine.movePiece(1, 0);
      this.lastKeyTime = now;
      this.moveRight = true;
    } else if (moveRight && now - this.lastKeyTime > this.keyRepeatInterval) {
      this.gameEngine.movePiece(1, 0);
      this.lastKeyTime = now;
    } else if (!moveRight) {
      this.moveRight = false;
    }
    
    if (moveDown && !this.moveDown) {
      this.gameEngine.movePiece(0, 1);
      this.lastKeyTime = now;
      this.moveDown = true;
    } else if (moveDown && now - this.lastKeyTime > this.keyRepeatInterval) {
      this.gameEngine.movePiece(0, 1);
      this.lastKeyTime = now;
    } else if (!moveDown) {
      this.moveDown = false;
    }
  }

  // Mouse handling
  handleClick(e) {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if clicking on UI elements
    this.gameEngine.ui.handleClick(x, y);
  }

  handleMouseDown(e) {
    // Future: drag and drop pieces?
  }

  handleMouseUp(e) {
    // Future: drag and drop pieces?
  }

  // Touch handling for mobile
  handleTouchStart(e) {
    if (e.touches.length === 0) return;
    
    const touch = e.touches[0];
    const now = Date.now();
    
    this.touchStartPos = { x: touch.clientX, y: touch.clientY };
    this.touchStartTime = now;
    
    // Detect double tap
    if (now - this.lastTapTime < GameConfig.MOBILE.DOUBLE_TAP_THRESHOLD) {
      this.handleDoubleTap(touch);
      this.lastTapTime = 0;
    } else {
      this.lastTapTime = now;
    }
    
    e.preventDefault();
  }

  handleTouchMove(e) {
    if (e.touches.length === 0 || !this.touchStartPos) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - this.touchStartPos.x;
    const deltaY = touch.clientY - this.touchStartPos.y;
    
    // Only process significant movements
    if (Math.abs(deltaX) > this.touchMoveThreshold || 
        Math.abs(deltaY) > this.touchMoveThreshold) {
      this.handleSwipe(deltaX, deltaY);
      this.touchStartPos = { x: touch.clientX, y: touch.clientY };
    }
    
    e.preventDefault();
  }

  handleTouchEnd(e) {
    const now = Date.now();
    const touchDuration = now - this.touchStartTime;
    
    // Short tap (not a swipe)
    if (touchDuration < GameConfig.MOBILE.TAP_THRESHOLD && this.touchStartPos) {
      const touch = e.changedTouches[0];
      this.handleTap(touch);
    }
    
    this.touchStartPos = null;
    e.preventDefault();
  }

  handleSwipe(deltaX, deltaY) {
    if (this.gameEngine.state.paused) return;
    
    // Determine primary direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX > 0) {
        this.gameEngine.movePiece(1, 0); // Right
      } else {
        this.gameEngine.movePiece(-1, 0); // Left
      }
    } else {
      // Vertical swipe
      if (deltaY > 0) {
        this.gameEngine.movePiece(0, 1); // Down
      } else {
        this.gameEngine.rotatePiece(1); // Up = Rotate
      }
    }
  }

  handleTap(touch) {
    if (this.gameEngine.state.paused) return;
    
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    // Divide screen into zones
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    if (y < centerY) {
      // Top half: rotate
      this.gameEngine.rotatePiece(1);
    } else {
      // Bottom half: check left/right
      if (x < centerX) {
        this.gameEngine.movePiece(-1, 0);
      } else {
        this.gameEngine.movePiece(1, 0);
      }
    }
  }

  handleDoubleTap(touch) {
    if (this.gameEngine.state.paused) return;
    
    // Double tap = hard drop
    this.gameEngine.hardDrop();
  }

  // Virtual button support for mobile UI
  createMobileControls() {
    const container = document.getElementById('mobileControls');
    if (!container) return;
    
    // Create virtual buttons
    const buttons = [
      { id: 'btn-left', label: '←', action: () => this.gameEngine.movePiece(-1, 0) },
      { id: 'btn-right', label: '→', action: () => this.gameEngine.movePiece(1, 0) },
      { id: 'btn-down', label: '↓', action: () => this.gameEngine.movePiece(0, 1) },
      { id: 'btn-rotate', label: '↻', action: () => this.gameEngine.rotatePiece(1) },
      { id: 'btn-drop', label: '⇩', action: () => this.gameEngine.hardDrop() },
      { id: 'btn-hold', label: 'HOLD', action: () => this.gameEngine.holdPiece() }
    ];
    
    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.id = btn.id;
      button.className = 'mobile-btn';
      button.textContent = btn.label;
      button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btn.action();
      });
      container.appendChild(button);
    });
  }

  // Cleanup
  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('touchstart', this.handleTouchStart);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InputHandler;
}
