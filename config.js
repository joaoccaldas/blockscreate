/**
 * Game Configuration
 * Central configuration for BlocksCreate game
 */

class GameConfig {
  static CANVAS = {
    WIDTH: 800,
    HEIGHT: 600
  };

  static GRID = {
    ROWS: 20,
    COLS: 10,
    CELL_SIZE: 30
  };

  static COLORS = {
    GRID: '#222',
    BACKGROUND: '#000',
    TEXT: '#fff',
    PREVIEW: '#333',
    GHOST: 'rgba(255,255,255,0.3)',
    // Tetromino colors
    I: '#00f0f0',
    O: '#f0f000',
    T: '#a000f0',
    S: '#00f000',
    Z: '#f00000',
    J: '#0000f0',
    L: '#f0a000'
  };

  static THEMES = {
    classic: {
      name: 'Classic',
      background: '#000',
      grid: '#222',
      text: '#fff'
    },
    neon: {
      name: 'Neon',
      background: '#0a0a0a',
      grid: '#ff00ff',
      text: '#00ffff'
    },
    retro: {
      name: 'Retro',
      background: '#2e1503',
      grid: '#8b4513',
      text: '#ffb366'
    },
    ocean: {
      name: 'Ocean',
      background: '#001122',
      grid: '#004466',
      text: '#66ccff'
    }
  };

  static GAME = {
    INITIAL_FALL_SPEED: 500,
    MIN_FALL_SPEED: 50,
    SPEED_INCREASE: 0.95,
    LINES_PER_LEVEL: 10,
    MAX_LEVEL: 15,
    PREVIEW_PIECES: 3
  };

  static SCORING = {
    SINGLE: 100,
    DOUBLE: 300,
    TRIPLE: 500,
    TETRIS: 800,
    SOFT_DROP: 1,
    HARD_DROP: 2,
    T_SPIN: 400,
    COMBO_MULTIPLIER: 1.5,
    PERFECT_CLEAR: 2000
  };

  static POWER_UPS = {
    BOMB: { duration: 0, effect: 'clear_3x3' },
    FREEZE: { duration: 5000, effect: 'slow_time' },
    GHOST: { duration: 10000, effect: 'show_ghost' },
    MULTI: { duration: 15000, effect: 'double_score' },
    CLEAR: { duration: 0, effect: 'clear_line' }
  };

  static AUDIO = {
    MUSIC_VOLUME: 0.3,
    SFX_VOLUME: 0.5,
    TRACKS: {
      MAIN: 'sounds/tetris_theme.mp3',
      MENU: 'sounds/menu_music.mp3'
    },
    SOUNDS: {
      LINE_CLEAR: 'sounds/line_clear.wav',
      TETRIS: 'sounds/tetris.wav',
      MOVE: 'sounds/move.wav',
      ROTATE: 'sounds/rotate.wav',
      DROP: 'sounds/drop.wav',
      LEVEL_UP: 'sounds/level_up.wav',
      GAME_OVER: 'sounds/game_over.wav',
      POWER_UP: 'sounds/power_up.wav'
    }
  };

  static CONTROLS = {
    LEFT: ['ArrowLeft', 'a', 'A'],
    RIGHT: ['ArrowRight', 'd', 'D'],
    DOWN: ['ArrowDown', 's', 'S'],
    ROTATE_CW: ['ArrowUp', 'w', 'W', ' '],
    ROTATE_CCW: ['z', 'Z'],
    HARD_DROP: ['Space'],
    HOLD: ['c', 'C', 'Shift'],
    PAUSE: ['p', 'P', 'Escape']
  };

  static MOBILE = {
    SWIPE_THRESHOLD: 50,
    TAP_THRESHOLD: 200,
    DOUBLE_TAP_THRESHOLD: 300
  };

  static PARTICLES = {
    COUNT: 50,
    LIFE: 1000,
    COLORS: ['#ff0', '#0ff', '#f0f', '#0f0', '#f00', '#00f']
  };

  static ACHIEVEMENTS = {
    FIRST_LINE: { name: 'First Line', desc: 'Clear your first line', points: 10 },
    TETRIS_MASTER: { name: 'Tetris Master', desc: 'Clear 4 lines at once', points: 50 },
    SPEED_DEMON: { name: 'Speed Demon', desc: 'Reach level 10', points: 100 },
    PERFECTIONIST: { name: 'Perfectionist', desc: 'Clear the entire board', points: 200 },
    COMBO_KING: { name: 'Combo King', desc: '10 consecutive line clears', points: 150 },
    MARATHON_RUNNER: { name: 'Marathon Runner', desc: 'Survive 30 minutes', points: 300 },
    SECRET_MASTER: { name: 'Secret Master', desc: 'Find all easter eggs', points: 500 }
  };

  // Easter egg codes (secret!)
  static EASTER_EGGS = {
    KONAMI: ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'],
    TETRIS: ['t', 'e', 't', 'r', 'i', 's'],
    RAINBOW: ['r', 'a', 'i', 'n', 'b', 'o', 'w'],
    MATRIX: ['m', 'a', 't', 'r', 'i', 'x'],
    GODMODE: ['g', 'o', 'd', 'm', 'o', 'd', 'e']
  };

  static UI = {
    ANIMATION_DURATION: 300,
    TOAST_DURATION: 3000,
    HELP_SLIDES: [
      {
        title: 'Welcome to BlocksCreate!',
        text: 'Drop and arrange falling blocks to clear lines and score points.'
      },
      {
        title: 'Controls',
        text: 'Use arrow keys to move, up arrow to rotate, space to hard drop.'
      },
      {
        title: 'Power-ups',
        text: 'Collect special blocks for amazing effects! Watch for glowing pieces.'
      },
      {
        title: 'Easter Eggs',
        text: 'Try typing "tetris", "rainbow", or the classic Konami code!'
      }
    ]
  };

  // Get current theme
  static getCurrentTheme() {
    const saved = localStorage.getItem('blockscreate_theme');
    return this.THEMES[saved] || this.THEMES.classic;
  }

  // Set theme
  static setTheme(themeName) {
    if (this.THEMES[themeName]) {
      localStorage.setItem('blockscreate_theme', themeName);
    }
  }

  // Get difficulty multiplier for current level
  static getDifficultyMultiplier(level) {
    return Math.pow(this.GAME.SPEED_INCREASE, level - 1);
  }

  // Calculate fall speed for level
  static getFallSpeed(level) {
    const speed = this.GAME.INITIAL_FALL_SPEED * this.getDifficultyMultiplier(level);
    return Math.max(speed, this.GAME.MIN_FALL_SPEED);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameConfig;
}
