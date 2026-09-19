/**
 * Tetris Web Game Engine & Canvas Renderer.
 * Adheres strictly to the official Tetris Guideline and secure web frontend standards:
 * - Pure DOM operations (textContent, createElement, replaceChildren; ZERO innerHTML)
 * - Canvas graphics with particle animations, floating text, and screen shake
 * - Full 7-bag randomizer, SRS wall kicks, lock delay, hold, and guideline scoring
 */

(function () {
  'use strict';

  // Constants
  const COLS = 10;
  const VISIBLE_ROWS = 20;
  const BUFFER_ROWS = 4;
  const TOTAL_ROWS = VISIBLE_ROWS + BUFFER_ROWS;
  const BLOCK_SIZE = 30; // 300x600 board

  // Official Tetris Colors
  const COLORS = {
    I: '#00f0f0',
    O: '#f0f000',
    T: '#a000f0',
    S: '#00f000',
    Z: '#f00000',
    J: '#0000f0',
    L: '#f0a000',
    GHOST: 'rgba(255, 255, 255, 0.25)',
  };

  // Tetromino shapes in 4 rotation states
  const TETROMINO_SHAPES = {
    I: {
      0: [[1, 0], [1, 1], [1, 2], [1, 3]],
      1: [[0, 2], [1, 2], [2, 2], [3, 2]],
      2: [[2, 0], [2, 1], [2, 2], [2, 3]],
      3: [[0, 1], [1, 1], [2, 1], [3, 1]],
    },
    J: {
      0: [[0, 0], [1, 0], [1, 1], [1, 2]],
      1: [[0, 1], [0, 2], [1, 1], [2, 1]],
      2: [[1, 0], [1, 1], [1, 2], [2, 2]],
      3: [[0, 1], [1, 1], [2, 0], [2, 1]],
    },
    L: {
      0: [[0, 2], [1, 0], [1, 1], [1, 2]],
      1: [[0, 1], [1, 1], [2, 1], [2, 2]],
      2: [[1, 0], [1, 1], [1, 2], [2, 0]],
      3: [[0, 0], [0, 1], [1, 1], [2, 1]],
    },
    O: {
      0: [[0, 1], [0, 2], [1, 1], [1, 2]],
      1: [[0, 1], [0, 2], [1, 1], [1, 2]],
      2: [[0, 1], [0, 2], [1, 1], [1, 2]],
      3: [[0, 1], [0, 2], [1, 1], [1, 2]],
    },
    S: {
      0: [[0, 1], [0, 2], [1, 0], [1, 1]],
      1: [[0, 1], [1, 1], [1, 2], [2, 2]],
      2: [[1, 1], [1, 2], [2, 0], [2, 1]],
      3: [[0, 0], [1, 0], [1, 1], [2, 1]],
    },
    T: {
      0: [[0, 1], [1, 0], [1, 1], [1, 2]],
      1: [[0, 1], [1, 1], [1, 2], [2, 1]],
      2: [[1, 0], [1, 1], [1, 2], [2, 1]],
      3: [[0, 1], [1, 0], [1, 1], [2, 1]],
    },
    Z: {
      0: [[0, 0], [0, 1], [1, 1], [1, 2]],
      1: [[0, 2], [1, 1], [1, 2], [2, 1]],
      2: [[1, 0], [1, 1], [2, 1], [2, 2]],
      3: [[0, 1], [1, 0], [1, 1], [2, 0]],
    },
  };

  // Standard SRS Wall Kick tables [col_offset, row_offset] (positive row is downwards)
  const WALL_KICKS_JLSTZ = {
    '0->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '1->0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '1->2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '2->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '2->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '3->2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '3->0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '0->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  };

  const WALL_KICKS_I = {
    '0->1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '1->0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '1->2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
    '2->1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    '2->3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '3->2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '3->0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    '0->3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  };

  // 7-Bag Randomizer
  class BagRandomizer {
    constructor() {
      this.bag = [];
    }
    next() {
      if (this.bag.length === 0) {
        this.bag = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
        for (let i = this.bag.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
        }
      }
      return this.bag.pop();
    }
  }

  // Particle System for line clears
  class ParticleSystem {
    constructor() {
      this.particles = [];
    }
    emit(x, y, color) {
      for (let i = 0; i < 16; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1;
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          size: Math.random() * 4 + 2,
          color,
        });
      }
    }
    update(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= dt * 2.5;
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }
    draw(ctx) {
      ctx.save();
      for (const p of this.particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Floating notifications ("TETRIS", "+800", etc.)
  class TextPopupManager {
    constructor() {
      this.popups = [];
    }
    add(text, x, y, color = '#ffe600') {
      this.popups.push({ text, x, y, alpha: 1, vy: -1.2, color });
    }
    update(dt) {
      for (let i = this.popups.length - 1; i >= 0; i--) {
        const p = this.popups[i];
        p.y += p.vy;
        p.alpha -= dt * 1.2;
        if (p.alpha <= 0) {
          this.popups.splice(i, 1);
        }
      }
    }
    draw(ctx) {
      ctx.save();
      ctx.font = 'bold 20px "Courier New", monospace';
      ctx.textAlign = 'center';
      for (const p of this.popups) {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillText(p.text, p.x, p.y);
      }
      ctx.restore();
    }
  }

  // Main Game Application
  class TetrisApp {
    constructor() {
      // Elements
      this.mainCanvas = document.getElementById('tetris-canvas');
      this.mainCtx = this.mainCanvas.getContext('2d');

      this.holdCanvas = document.getElementById('hold-canvas');
      this.holdCtx = this.holdCanvas.getContext('2d');

      this.nextCanvas = document.getElementById('next-canvas');
      this.nextCtx = this.nextCanvas.getContext('2d');

      this.statScore = document.getElementById('stat-score');
      this.statHighScore = document.getElementById('stat-high-score');
      this.statLines = document.getElementById('stat-lines');
      this.statLevel = document.getElementById('stat-level');

      this.overlayScreen = document.getElementById('overlay-screen');
      this.overlayTitle = document.getElementById('overlay-title');
      this.overlayMsg = document.getElementById('overlay-message');
      this.overlayBtn = document.getElementById('overlay-btn-action');

      this.btnSound = document.getElementById('btn-sound');
      this.btnPause = document.getElementById('btn-pause');
      this.btnRestart = document.getElementById('btn-restart');

      // Visual effects
      this.particles = new ParticleSystem();
      this.popups = new TextPopupManager();
      this.shakeDuration = 0;
      this.shakeIntensity = 0;

      // High score
      this.highScore = 0;
      try {
        const saved = localStorage.getItem('tetris_high_score');
        if (saved) this.highScore = parseInt(saved, 10) || 0;
      } catch (e) {}
      this._updateStatsDisplay();

      // State
      this.randomizer = new BagRandomizer();
      this.grid = [];
      this.nextQueue = [];
      this.heldPiece = null;
      this.canHold = true;
      this.currentPiece = null;

      this.score = 0;
      this.linesCleared = 0;
      this.level = 1;
      this.combo = -1;
      this.backToBack = false;
      this.gameOver = false;
      this.paused = false;

      this.dropTimer = 0;
      this.lockDelayTimer = 0;
      this.lockDelayLimit = 0.5;
      this.lockMoveCount = 0;
      this.maxLockMoves = 15;
      this.lastMoveWasRotate = false;

      this.lastTimestamp = 0;

      // Controls State
      this.keys = {};
      this.dasDelay = 150; // ms
      this.arrRate = 35; // ms
      this.dasTimers = { left: 0, right: 0, down: 0 };
      this.arrTimers = { left: 0, right: 0, down: 0 };

      this._initGrid();
      this._setupEvents();
      this.reset();
      this._animate(0);
    }

    _initGrid() {
      this.grid = Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(null));
    }

    reset() {
      this._initGrid();
      this.randomizer = new BagRandomizer();
      this.nextQueue = [
        this.randomizer.next(),
        this.randomizer.next(),
        this.randomizer.next(),
        this.randomizer.next(),
        this.randomizer.next(),
      ];
      this.heldPiece = null;
      this.canHold = true;
      this.score = 0;
      this.linesCleared = 0;
      this.level = 1;
      this.combo = -1;
      this.backToBack = false;
      this.gameOver = false;
      this.paused = false;
      this.dropTimer = 0;
      this.lockDelayTimer = 0;
      this.lockMoveCount = 0;

      this._hideOverlay();
      this._spawnNextPiece();
      this._updateStatsDisplay();
    }

    _spawnNextPiece() {
      const type = this.nextQueue.shift();
      this.nextQueue.push(this.randomizer.next());

      this.currentPiece = {
        type,
        row: type === 'I' ? BUFFER_ROWS - 1 : BUFFER_ROWS,
        col: 3,
        rotation: 0,
      };

      this.canHold = true;
      this.dropTimer = 0;
      this.lockDelayTimer = 0;
      this.lockMoveCount = 0;
      this.lastMoveWasRotate = false;

      if (this._collides(this.currentPiece)) {
        this.gameOver = true;
        if (window.soundManager) window.soundManager.playGameOver();
        this._showGameOverOverlay();
      }
    }

    _getBlocks(piece, offsetR = 0, offsetC = 0, rot = null) {
      const r = piece.row + offsetR;
      const c = piece.col + offsetC;
      const rotation = rot !== null ? rot : piece.rotation;
      const shapes = TETROMINO_SHAPES[piece.type][rotation % 4];
      return shapes.map(([dr, dc]) => [r + dr, c + dc]);
    }

    _collides(piece, offsetR = 0, offsetC = 0, rot = null) {
      const blocks = this._getBlocks(piece, offsetR, offsetC, rot);
      for (const [r, c] of blocks) {
        if (c < 0 || c >= COLS) return true;
        if (r >= TOTAL_ROWS) return true;
        if (r >= 0 && this.grid[r][c] !== null) return true;
      }
      return false;
    }

    _isOnGround() {
      if (!this.currentPiece) return false;
      return this._collides(this.currentPiece, 1, 0);
    }

    moveLeft() {
      if (this.gameOver || this.paused || !this.currentPiece) return false;
      if (!this._collides(this.currentPiece, 0, -1)) {
        this.currentPiece.col--;
        this._handleMoveLock();
        this.lastMoveWasRotate = false;
        if (window.soundManager) window.soundManager.playMove();
        return true;
      }
      return false;
    }

    moveRight() {
      if (this.gameOver || this.paused || !this.currentPiece) return false;
      if (!this._collides(this.currentPiece, 0, 1)) {
        this.currentPiece.col++;
        this._handleMoveLock();
        this.lastMoveWasRotate = false;
        if (window.soundManager) window.soundManager.playMove();
        return true;
      }
      return false;
    }

    moveDown() {
      if (this.gameOver || this.paused || !this.currentPiece) return false;
      if (!this._collides(this.currentPiece, 1, 0)) {
        this.currentPiece.row++;
        this.lockDelayTimer = 0;
        return true;
      }
      return false;
    }

    softDrop() {
      if (this.gameOver || this.paused || !this.currentPiece) return false;
      const moved = this.moveDown();
      if (moved) {
        this.lastMoveWasRotate = false;
        return true;
      }
      return false;
    }

    hardDrop() {
      if (this.gameOver || this.paused || !this.currentPiece) return;
      let dist = 0;
      while (!this._collides(this.currentPiece, 1, 0)) {
        this.currentPiece.row++;
        dist++;
      }
      this.score += dist * 2;
      this._updateStatsDisplay();
      this._shake(0.15, 4);
      if (window.soundManager) window.soundManager.playDrop();
      this._lockPiece();
    }

    rotate(clockwise = true) {
      if (this.gameOver || this.paused || !this.currentPiece) return false;
      const curRot = this.currentPiece.rotation;
      const targetRot = (curRot + (clockwise ? 1 : 3)) % 4;
      const type = this.currentPiece.type;

      if (type === 'O') {
        this.currentPiece.rotation = targetRot;
        this.lastMoveWasRotate = true;
        if (window.soundManager) window.soundManager.playRotate();
        return true;
      }

      const tableKey = `${curRot}->${targetRot}`;
      const kickTable = type === 'I' ? WALL_KICKS_I : WALL_KICKS_JLSTZ;
      const kicks = kickTable[tableKey] || [[0, 0]];

      for (const [dc, dr] of kicks) {
        if (!this._collides(this.currentPiece, dr, dc, targetRot)) {
          this.currentPiece.col += dc;
          this.currentPiece.row += dr;
          this.currentPiece.rotation = targetRot;
          this._handleMoveLock();
          this.lastMoveWasRotate = true;
          if (window.soundManager) window.soundManager.playRotate();
          return true;
        }
      }
      return false;
    }

    rotate180() {
      if (this.gameOver || this.paused || !this.currentPiece) return false;
      const type = this.currentPiece.type;
      if (type === 'O') {
        this.lastMoveWasRotate = true;
        if (window.soundManager) window.soundManager.playRotate();
        return true;
      }
      if (this.rotate(true)) {
        this.rotate(true);
        return true;
      }
      return false;
    }

    hold() {
      if (this.gameOver || this.paused || !this.canHold || !this.currentPiece) return;
      const currentType = this.currentPiece.type;

      if (this.heldPiece === null) {
        this.heldPiece = currentType;
        this._spawnNextPiece();
      } else {
        const swap = this.heldPiece;
        this.heldPiece = currentType;
        this.currentPiece = {
          type: swap,
          row: swap === 'I' ? BUFFER_ROWS - 1 : BUFFER_ROWS,
          col: 3,
          rotation: 0,
        };
        this.dropTimer = 0;
        this.lockDelayTimer = 0;
        this.lockMoveCount = 0;
        this.lastMoveWasRotate = false;
        if (this._collides(this.currentPiece)) {
          this.gameOver = true;
          this._showGameOverOverlay();
          return;
        }
      }

      this.canHold = false;
      if (window.soundManager) window.soundManager.playRotate();
    }

    _handleMoveLock() {
      if (this._isOnGround()) {
        if (this.lockMoveCount < this.maxLockMoves) {
          this.lockDelayTimer = 0;
          this.lockMoveCount++;
        }
      }
    }

    _getGhostRow() {
      if (!this.currentPiece) return null;
      let offset = 0;
      while (!this._collides(this.currentPiece, offset + 1, 0)) {
        offset++;
      }
      return this.currentPiece.row + offset;
    }

    _checkTSpin() {
      if (!this.currentPiece || this.currentPiece.type !== 'T' || !this.lastMoveWasRotate) {
        return false;
      }
      const r = this.currentPiece.row;
      const c = this.currentPiece.col;
      const corners = [[r, c], [r, c + 2], [r + 2, c], [r + 2, c + 2]];
      let occupied = 0;
      for (const [cr, cc] of corners) {
        if (cc < 0 || cc >= COLS || cr >= TOTAL_ROWS || (cr >= 0 && this.grid[cr][cc] !== null)) {
          occupied++;
        }
      }
      return occupied >= 3;
    }

    _lockPiece() {
      if (!this.currentPiece) return;

      const isTSpin = this._checkTSpin();
      const blocks = this._getBlocks(this.currentPiece);
      let lockedInBuffer = true;

      for (const [r, c] of blocks) {
        if (r >= 0 && r < TOTAL_ROWS && c >= 0 && c < COLS) {
          this.grid[r][c] = this.currentPiece.type;
          if (r >= BUFFER_ROWS) lockedInBuffer = false;
        }
      }

      if (lockedInBuffer) {
        this.gameOver = true;
        if (window.soundManager) window.soundManager.playGameOver();
        this._showGameOverOverlay();
        return;
      }

      // Check and clear lines
      const clearedLines = this._clearLines();
      this._calcScore(clearedLines, isTSpin);

      if (clearedLines > 0) {
        const oldLevel = this.level;
        this.linesCleared += clearedLines;
        this.level = Math.floor(this.linesCleared / 10) + 1;
        if (this.level > oldLevel && window.soundManager) {
          window.soundManager.playLevelUp();
          this.popups.add(`LEVEL ${this.level}!`, 150, 250, '#00ff66');
        }
      }

      this._updateStatsDisplay();
      this._spawnNextPiece();
    }

    _clearLines() {
      const fullRows = [];
      for (let r = 0; r < TOTAL_ROWS; r++) {
        if (this.grid[r].every((cell) => cell !== null)) {
          fullRows.push(r);
        }
      }

      const count = fullRows.length;
      if (count === 0) return 0;

      // Particle explosion for cleared rows
      for (const r of fullRows) {
        const canvasY = (r - BUFFER_ROWS) * BLOCK_SIZE + BLOCK_SIZE / 2;
        for (let c = 0; c < COLS; c++) {
          const canvasX = c * BLOCK_SIZE + BLOCK_SIZE / 2;
          const color = COLORS[this.grid[r][c]] || '#ffffff';
          this.particles.emit(canvasX, canvasY, color);
        }
      }

      // Remove lines
      const newGrid = this.grid.filter((_, idx) => !fullRows.includes(idx));
      for (let i = 0; i < count; i++) {
        newGrid.unshift(Array(COLS).fill(null));
      }
      this.grid = newGrid;

      return count;
    }

    _calcScore(lines, isTSpin) {
      if (lines === 0) {
        if (isTSpin) {
          this.score += 400 * this.level;
          this.popups.add('T-SPIN! +400', 150, 300, '#a000f0');
        }
        this.combo = -1;
        return;
      }

      this.combo++;
      const comboBonus = this.combo > 0 ? 50 * this.combo * this.level : 0;
      const isDifficult = lines === 4 || isTSpin;
      let base = 0;

      if (isTSpin) {
        const tSpinTable = { 1: 800, 2: 1200, 3: 1600 };
        base = (tSpinTable[lines] || 400) * this.level;
        this.popups.add(`T-SPIN ${lines > 1 ? lines : ''}!`, 150, 280, '#a000f0');
      } else {
        const baseScores = { 1: 100, 2: 300, 3: 500, 4: 800 };
        base = (baseScores[lines] || 0) * this.level;
      }

      if (isDifficult) {
        if (this.backToBack) {
          base = Math.floor(base * 1.5);
          this.popups.add('BACK-TO-BACK!', 150, 250, '#ffe600');
        }
        this.backToBack = true;
      } else {
        this.backToBack = false;
      }

      const total = base + comboBonus;
      this.score += total;

      if (lines === 4) {
        this._shake(0.25, 6);
        this.popups.add(`TETRIS! +${total}`, 150, 320, '#00f3ff');
        if (window.soundManager) window.soundManager.playTetris();
      } else {
        const label = lines === 1 ? 'SINGLE' : lines === 2 ? 'DOUBLE' : 'TRIPLE';
        this.popups.add(`${label} +${total}`, 150, 320, '#ffffff');
        if (window.soundManager) window.soundManager.playClear();
      }

      if (this.combo > 0) {
        this.popups.add(`COMBO x${this.combo}!`, 150, 360, '#ff007f');
      }
    }

    _shake(duration, intensity) {
      this.shakeDuration = duration;
      this.shakeIntensity = intensity;
    }

    _getDropInterval() {
      const effLevel = Math.min(this.level, 15);
      return Math.max(0.05, Math.pow(0.8 - (effLevel - 1) * 0.007, effLevel - 1));
    }

    _updateStatsDisplay() {
      if (this.score > this.highScore) {
        this.highScore = this.score;
        try {
          localStorage.setItem('tetris_high_score', String(this.highScore));
        } catch (e) {}
      }

      this.statScore.textContent = String(this.score);
      this.statHighScore.textContent = String(this.highScore);
      this.statLines.textContent = String(this.linesCleared);
      this.statLevel.textContent = String(this.level);
    }

    _showGameOverOverlay() {
      this.overlayTitle.textContent = 'GAME OVER';
      this.overlayMsg.textContent = `Score: ${this.score} | Lines: ${this.linesCleared}`;
      this.overlayBtn.textContent = 'PLAY AGAIN';
      this.overlayScreen.classList.remove('hidden');
    }

    _showPauseOverlay() {
      this.overlayTitle.textContent = 'PAUSED';
      this.overlayMsg.textContent = 'Game is suspended';
      this.overlayBtn.textContent = 'RESUME';
      this.overlayScreen.classList.remove('hidden');
    }

    _hideOverlay() {
      this.overlayScreen.classList.add('hidden');
    }

    togglePause() {
      if (this.gameOver) return;
      this.paused = !this.paused;
      if (this.paused) {
        this._showPauseOverlay();
      } else {
        this._hideOverlay();
      }
      this._updatePauseButtons();
    }

    _updatePauseButtons() {
      const icon = this.paused ? '▶' : '⏸';
      const label = this.paused ? 'RESUME' : 'PAUSE';
      if (this.btnPause) this.btnPause.textContent = icon;
      const pauseIcon = document.getElementById('touch-pause-icon');
      const pauseLabel = document.getElementById('touch-pause-label');
      if (pauseIcon) pauseIcon.textContent = icon;
      if (pauseLabel) pauseLabel.textContent = label;
    }

    _updateSoundButtons(enabled) {
      const icon = enabled ? '🔊' : '🔇';
      const label = enabled ? 'SOUND' : 'MUTED';
      if (this.btnSound) this.btnSound.textContent = icon;
      const soundIcon = document.getElementById('touch-sound-icon');
      const soundLabel = document.getElementById('touch-sound-label');
      if (soundIcon) soundIcon.textContent = icon;
      if (soundLabel) soundLabel.textContent = label;
    }

    // Input Handling
    _setupEvents() {
      window.addEventListener('keydown', (e) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
          e.preventDefault();
        }

        if (this.gameOver && (e.key === 'r' || e.key === 'R' || e.key === 'Enter')) {
          this.reset();
          return;
        }

        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
          this.togglePause();
          return;
        }

        if (this.paused || this.gameOver) return;

        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          if (!this.keys.left) {
            this.moveLeft();
            this.keys.left = true;
            this.dasTimers.left = 0;
            this.arrTimers.left = 0;
          }
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          if (!this.keys.right) {
            this.moveRight();
            this.keys.right = true;
            this.dasTimers.right = 0;
            this.arrTimers.right = 0;
          }
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          if (!this.keys.down) {
            this.softDrop();
            this.keys.down = true;
            this.dasTimers.down = 0;
            this.arrTimers.down = 0;
          }
        } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === 'x' || e.key === 'X') {
          this.rotate(true);
        } else if (e.key === 'z' || e.key === 'Z' || e.key === 'Control') {
          this.rotate(false);
        } else if (e.key === ' ') {
          this.hardDrop();
        } else if (e.key === 'c' || e.key === 'C' || e.key === 'Shift') {
          this.hold();
        } else if (e.key === 'r' || e.key === 'R') {
          this.reset();
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = false;
      });

      // Clear pressed keys if window loses focus
      window.addEventListener('blur', () => {
        this.keys = {};
      });

      // Header Buttons
      this.btnSound.addEventListener('click', (e) => {
        e.currentTarget.blur();
        if (window.soundManager) {
          const enabled = window.soundManager.toggle();
          this._updateSoundButtons(enabled);
        }
      });

      this.btnPause.addEventListener('click', (e) => {
        e.currentTarget.blur();
        this.togglePause();
      });
      this.btnRestart.addEventListener('click', (e) => {
        e.currentTarget.blur();
        this.reset();
      });

      this.overlayBtn.addEventListener('click', () => {
        if (this.gameOver) {
          this.reset();
        } else if (this.paused) {
          this.togglePause();
        }
      });

      // Touch Repeat Buttons (Left, Right, Down) with continuous DAS auto-repeat
      const bindRepeatBtn = (id, dir, action) => {
        const el = document.getElementById(id);
        if (!el) return;
        const press = (e) => {
          e.preventDefault();
          if (this.paused || this.gameOver) return;
          if (!this.keys[dir]) {
            action();
            this.keys[dir] = true;
            this.dasTimers[dir] = 0;
            this.arrTimers[dir] = 0;
            if (navigator.vibrate) {
              try { navigator.vibrate(10); } catch (_) {}
            }
          }
        };
        const release = (e) => {
          e.preventDefault();
          this.keys[dir] = false;
        };
        el.addEventListener('touchstart', press, { passive: false });
        el.addEventListener('touchend', release, { passive: false });
        el.addEventListener('touchcancel', release, { passive: false });
        el.addEventListener('mousedown', press);
        el.addEventListener('mouseup', release);
        el.addEventListener('mouseleave', release);
      };

      // Touch Action Buttons (One-shot actions with tactile haptic pulse)
      const bindActionBtn = (id, action, vibrateMs = 15) => {
        const el = document.getElementById(id);
        if (!el) return;
        const trigger = (e) => {
          e.preventDefault();
          if (this.paused || this.gameOver) return;
          action();
          if (navigator.vibrate) {
            try { navigator.vibrate(vibrateMs); } catch (_) {}
          }
        };
        el.addEventListener('touchstart', trigger, { passive: false });
        el.addEventListener('mousedown', trigger);
      };

      // Touch Utility Buttons (Pause, Restart, Sound)
      const bindUtilBtn = (id, action) => {
        const el = document.getElementById(id);
        if (!el) return;
        const trigger = (e) => {
          e.preventDefault();
          action();
          if (navigator.vibrate) {
            try { navigator.vibrate(10); } catch (_) {}
          }
        };
        el.addEventListener('touchstart', trigger, { passive: false });
        el.addEventListener('click', trigger);
      };

      bindRepeatBtn('touch-left', 'left', () => this.moveLeft());
      bindRepeatBtn('touch-right', 'right', () => this.moveRight());
      bindRepeatBtn('touch-down', 'down', () => this.softDrop());

      bindActionBtn('touch-rot-cw', () => this.rotate(true), 12);
      bindActionBtn('touch-rot-ccw', () => this.rotate(false), 12);
      bindActionBtn('touch-rot-180', () => this.rotate180(), 18);
      bindActionBtn('touch-hard-drop', () => this.hardDrop(), 25);
      bindActionBtn('touch-hold', () => this.hold(), 15);

      bindUtilBtn('touch-pause', () => this.togglePause());
      bindUtilBtn('touch-restart', () => this.reset());
      bindUtilBtn('touch-sound', () => {
        if (window.soundManager) {
          const enabled = window.soundManager.toggle();
          this._updateSoundButtons(enabled);
        }
      });
    }

    _handleDAS(dt) {
      const dtMs = dt * 1000;
      for (const dir of ['left', 'right', 'down']) {
        if (this.keys[dir]) {
          this.dasTimers[dir] += dtMs;
          if (this.dasTimers[dir] > this.dasDelay) {
            this.arrTimers[dir] += dtMs;
            while (this.arrTimers[dir] >= this.arrRate) {
              this.arrTimers[dir] -= this.arrRate;
              if (dir === 'left') this.moveLeft();
              if (dir === 'right') this.moveRight();
              if (dir === 'down') this.softDrop();
            }
          }
        }
      }
    }

    // Main Update & Render Loop
    _animate(timestamp) {
      const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
      this.lastTimestamp = timestamp;

      this._update(dt);
      this._render();

      requestAnimationFrame((t) => this._animate(t));
    }

    _update(dt) {
      if (this.paused || this.gameOver) return;

      this._handleDAS(dt);
      this.particles.update(dt);
      this.popups.update(dt);

      if (this.shakeDuration > 0) {
        this.shakeDuration -= dt;
      }

      // Gravity drop (does not award score)
      const interval = this._getDropInterval();
      this.dropTimer += dt;
      if (this.dropTimer >= interval) {
        this.dropTimer = 0;
        if (!this._isOnGround()) {
          this.moveDown();
        }
      }

      // Lock delay
      if (this._isOnGround()) {
        this.lockDelayTimer += dt;
        if (this.lockDelayTimer >= this.lockDelayLimit || this.lockMoveCount >= this.maxLockMoves) {
          this._lockPiece();
        }
      } else {
        this.lockDelayTimer = 0;
      }
    }

    _render() {
      this._renderMainBoard();
      this._renderHoldPiece();
      this._renderNextQueue();
    }

    _renderMainBoard() {
      const ctx = this.mainCtx;
      ctx.save();

      // Screen shake
      if (this.shakeDuration > 0) {
        const offsetX = (Math.random() - 0.5) * this.shakeIntensity;
        const offsetY = (Math.random() - 0.5) * this.shakeIntensity;
        ctx.translate(offsetX, offsetY);
      }

      // Clear
      ctx.fillStyle = '#07070b';
      ctx.fillRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);

      // Subtle Grid Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * BLOCK_SIZE, 0);
        ctx.lineTo(c * BLOCK_SIZE, VISIBLE_ROWS * BLOCK_SIZE);
        ctx.stroke();
      }
      for (let r = 0; r <= VISIBLE_ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * BLOCK_SIZE);
        ctx.lineTo(COLS * BLOCK_SIZE, r * BLOCK_SIZE);
        ctx.stroke();
      }

      // Draw locked board blocks
      for (let r = 0; r < VISIBLE_ROWS; r++) {
        const gridRow = r + BUFFER_ROWS;
        for (let c = 0; c < COLS; c++) {
          const type = this.grid[gridRow][c];
          if (type) {
            this._drawBeveledBlock(ctx, c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, COLORS[type]);
          }
        }
      }

      // Draw Ghost Piece
      if (this.currentPiece && !this.gameOver) {
        const ghostRow = this._getGhostRow();
        if (ghostRow !== null) {
          const ghostBlocks = this._getBlocks(this.currentPiece, ghostRow - this.currentPiece.row, 0);
          for (const [r, c] of ghostBlocks) {
            const visR = r - BUFFER_ROWS;
            if (visR >= 0 && visR < VISIBLE_ROWS && c >= 0 && c < COLS) {
              this._drawGhostBlock(ctx, c * BLOCK_SIZE, visR * BLOCK_SIZE, BLOCK_SIZE, COLORS[this.currentPiece.type]);
            }
          }
        }
      }

      // Draw Active Piece
      if (this.currentPiece && !this.gameOver) {
        const blocks = this._getBlocks(this.currentPiece);
        for (const [r, c] of blocks) {
          const visR = r - BUFFER_ROWS;
          if (visR >= 0 && visR < VISIBLE_ROWS && c >= 0 && c < COLS) {
            this._drawBeveledBlock(ctx, c * BLOCK_SIZE, visR * BLOCK_SIZE, BLOCK_SIZE, COLORS[this.currentPiece.type]);
          }
        }
      }

      // Particles & Popups
      this.particles.draw(ctx);
      this.popups.draw(ctx);

      ctx.restore();
    }

    _drawBeveledBlock(ctx, x, y, size, color) {
      ctx.save();
      // Base
      ctx.fillStyle = color;
      ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

      // Highlight (top & left)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.moveTo(x + 1, y + 1);
      ctx.lineTo(x + size - 1, y + 1);
      ctx.lineTo(x + size - 4, y + 4);
      ctx.lineTo(x + 4, y + 4);
      ctx.lineTo(x + 4, y + size - 4);
      ctx.lineTo(x + 1, y + size - 1);
      ctx.closePath();
      ctx.fill();

      // Shadow (bottom & right)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.moveTo(x + size - 1, y + 1);
      ctx.lineTo(x + size - 1, y + size - 1);
      ctx.lineTo(x + 1, y + size - 1);
      ctx.lineTo(x + 4, y + size - 4);
      ctx.lineTo(x + size - 4, y + size - 4);
      ctx.lineTo(x + size - 4, y + 4);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    _drawGhostBlock(ctx, x, y, size, color) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
      ctx.restore();
    }

    _renderHoldPiece() {
      const ctx = this.holdCtx;
      ctx.clearRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);

      const holdBtn = document.getElementById('touch-hold');
      if (holdBtn) {
        if (!this.canHold) {
          holdBtn.classList.add('btn-locked');
        } else {
          holdBtn.classList.remove('btn-locked');
        }
      }

      if (!this.heldPiece) return;

      ctx.save();
      if (!this.canHold) {
        ctx.globalAlpha = 0.4;
      }
      this._drawCenteredPiece(ctx, this.heldPiece, this.holdCanvas.width, this.holdCanvas.height, 20);
      ctx.restore();
    }

    _renderNextQueue() {
      const ctx = this.nextCtx;
      ctx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

      const previewCount = Math.min(3, this.nextQueue.length);
      const sectionHeight = this.nextCanvas.height / 3;

      for (let i = 0; i < previewCount; i++) {
        const type = this.nextQueue[i];
        ctx.save();
        ctx.translate(0, i * sectionHeight);
        this._drawCenteredPiece(ctx, type, this.nextCanvas.width, sectionHeight, 18);
        ctx.restore();
      }
    }

    _drawCenteredPiece(ctx, type, boxWidth, boxHeight, blockSize) {
      const shapes = TETROMINO_SHAPES[type][0];
      const minR = Math.min(...shapes.map(([r]) => r));
      const maxR = Math.max(...shapes.map(([r]) => r));
      const minC = Math.min(...shapes.map(([, c]) => c));
      const maxC = Math.max(...shapes.map(([, c]) => c));

      const pieceW = (maxC - minC + 1) * blockSize;
      const pieceH = (maxR - minR + 1) * blockSize;

      const startX = (boxWidth - pieceW) / 2;
      const startY = (boxHeight - pieceH) / 2;

      for (const [dr, dc] of shapes) {
        const x = startX + (dc - minC) * blockSize;
        const y = startY + (dr - minR) * blockSize;
        this._drawBeveledBlock(ctx, x, y, blockSize, COLORS[type]);
      }
    }
  }

  // Initialize once DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new TetrisApp());
  } else {
    new TetrisApp();
  }
})();
