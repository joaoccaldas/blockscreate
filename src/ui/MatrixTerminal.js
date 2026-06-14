export class MatrixTerminal {
  constructor(game) {
    this.game = game;
    this.el = document.getElementById('matrixTerminal');
    this.logEl = document.getElementById('matrixLog');
    this.puzzleEl = document.getElementById('matrixPuzzle');
    this.hackBtn = document.getElementById('matrixHackBtn');
    
    document.getElementById('matrixClose').onclick = () => this.close();
    this.hackBtn.onclick = () => this.tryHack();
  }

  open(x, y) {
    this.targetX = x;
    this.targetY = y;
    this.el.classList.remove('hidden');
    this.game.audio?.play('ui');
    this.generatePuzzle();
  }

  close() {
    this.el.classList.add('hidden');
    this.game.audio?.play('ui');
  }

  generatePuzzle() {
    this.puzzleEl.innerHTML = '';
    this.logEl.innerHTML = '// NODE ESTABLISHED.<br>// BYPASS ENCRYPTION REQUIRED.';
    
    // Lights Out puzzle
    this.nodes = [];
    for (let i = 0; i < 16; i++) {
      const btn = document.createElement('div');
      btn.className = 'matrix-node';
      btn.textContent = '⬡';
      btn.onclick = () => this.toggleNode(i);
      this.puzzleEl.appendChild(btn);
      this.nodes.push(btn);
    }
    
    // Randomize initial state (simulate clicks to ensure it's solvable)
    for(let i=0; i<5; i++) {
      this.toggleNode(Math.floor(Math.random() * 16), false);
    }
    this.checkWin(false);
  }

  toggleNode(i, playSound = true) {
    if (playSound) this.game.audio?.play('ui');
    
    const toggle = (idx) => {
      if (idx >= 0 && idx < 16) {
        this.nodes[idx].classList.toggle('active');
      }
    };
    
    toggle(i);
    // Cross pattern: watch boundaries!
    if (i % 4 !== 0) toggle(i - 1); // left
    if (i % 4 !== 3) toggle(i + 1); // right
    toggle(i - 4); // top
    toggle(i + 4); // bottom
    
    if (playSound) this.checkWin(true);
  }

  checkWin(log = true) {
    const active = this.nodes.filter(n => n.classList.contains('active')).length;
    if (log) {
      this.logEl.innerHTML = `// SCANNING...<br>// ${active} NODES SYNCHRONIZED.`;
    }
    
    if (active === 16 || active === 0) { // Win if all on or all off
      this.logEl.innerHTML = `// SYSTEM OVERRIDDEN.<br>// ACCESS GRANTED.`;
      this.hackBtn.textContent = '▶ EXTRACT TRUTH SHARD';
      this.hackBtn.style.color = '#0f0';
    } else {
      this.hackBtn.textContent = '▶ INITIATE OVERRIDE';
      this.hackBtn.style.color = '#0ff';
    }
  }

  tryHack() {
    const active = this.nodes.filter(n => n.classList.contains('active')).length;
    if (active === 16 || active === 0) {
      // Reward the player with a matrix_shard!
      this.game.inventory.add('matrix_shard', 1);
      this.game.hud?.toast('Extracted Matrix Shard!');
      this.game.particles.fountain(this.targetX + 0.5, this.targetY + 0.5, ['#0ff', '#fff', '#00f'], 30);
      this.game.audio?.play('unlock');
      
      // Remove the anomaly block
      this.game.world.set(this.targetX, this.targetY, 0); 
      
      this.close();
    } else {
      this.logEl.innerHTML = `// ACCESS DENIED.<br>// SYNCHRONIZE ALL NODES.`;
      this.game.audio?.play('ui');
    }
  }
}
