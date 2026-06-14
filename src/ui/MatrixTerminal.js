export class MatrixTerminal {
  constructor(container, handlers) {
    this.container = container;
    this.handlers = handlers;
    
    this.el = document.createElement('div');
    this.el.className = 'matrix-terminal hidden';
    this.el.innerHTML = `
      <div class="mt-header">
        <span>MATRIX NODE UPLINK</span>
        <button class="mt-close">X</button>
      </div>
      <div class="mt-body">
        <p class="mt-log">Connecting to hidden reality layer...</p>
        <p class="mt-log">Encrypted data fragment found.</p>
        <p class="mt-log">Decrypt by aligning the signal matrix (all nodes must be active):</p>
        <div class="mt-grid"></div>
        <div class="mt-status">STATUS: LOCKED</div>
      </div>
    `;
    
    this.container.appendChild(this.el);
    this.gridEl = this.el.querySelector('.mt-grid');
    this.statusEl = this.el.querySelector('.mt-status');
    
    this.el.querySelector('.mt-close').onclick = () => this.hide();
    
    this.grid = [];
    this.size = 3;
    this.targetPos = null; // {x, y} of the block to destroy on win
  }
  
  show(targetX, targetY) {
    this.targetPos = { x: targetX, y: targetY };
    this.el.classList.remove('hidden');
    this.initGrid();
    this.renderGrid();
  }
  
  hide() {
    this.el.classList.add('hidden');
    this.targetPos = null;
    this.handlers.onClose?.();
  }
  
  initGrid() {
    this.grid = [];
    for (let i = 0; i < this.size * this.size; i++) {
      this.grid.push(false);
    }
    // Randomize but ensure solvable by simulating random clicks
    const clicks = 5 + Math.floor(Math.random() * 5);
    for (let i = 0; i < clicks; i++) {
      this.flip(Math.floor(Math.random() * this.size), Math.floor(Math.random() * this.size));
    }
    // ensure it's not solved initially
    if (this.checkWin()) this.flip(0, 0); 
    this.updateStatus();
  }
  
  flip(c, r) {
    if (c < 0 || c >= this.size || r < 0 || r >= this.size) return;
    const idx = r * this.size + c;
    this.grid[idx] = !this.grid[idx];
  }
  
  toggle(c, r) {
    this.flip(c, r);
    this.flip(c - 1, r);
    this.flip(c + 1, r);
    this.flip(c, r - 1);
    this.flip(c, r + 1);
    
    this.renderGrid();
    if (this.checkWin()) {
      this.statusEl.textContent = 'STATUS: DECRYPTED';
      this.statusEl.style.color = '#00ff00';
      setTimeout(() => this.win(), 800);
    } else {
      this.updateStatus();
    }
  }
  
  checkWin() {
    return this.grid.every(v => v);
  }
  
  updateStatus() {
    const active = this.grid.filter(v => v).length;
    this.statusEl.textContent = `STATUS: ${active} / ${this.size * this.size} ALIGNED`;
    this.statusEl.style.color = '#ffaa00';
  }
  
  renderGrid() {
    this.gridEl.innerHTML = '';
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const btn = document.createElement('button');
        btn.className = 'mt-cell' + (this.grid[r * this.size + c] ? ' active' : '');
        btn.onclick = () => this.toggle(c, r);
        this.gridEl.appendChild(btn);
      }
    }
  }
  
  win() {
    if (this.handlers.onWin && this.targetPos) {
      this.handlers.onWin(this.targetPos.x, this.targetPos.y);
    }
    this.hide();
  }
}
