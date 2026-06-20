const SAFE_ID = /^[a-zA-Z0-9_-]{1,80}$/;

class Multiplayer {
  constructor({ onRoster, onStart, onRemoteState, onFinish, onError, onEvent } = {}) {
    this.peer = null;
    this.connections = new Map();
    this.isHost = false;
    this.hostConnection = null;
    this.local = { id: '', name: 'Mochi', cat: 'ginger' };
    this.players = new Map();
    this.onRoster = onRoster || (() => {});
    this.onStart = onStart || (() => {});
    this.onRemoteState = onRemoteState || (() => {});
    this.onFinish = onFinish || (() => {});
    this.onError = onError || (() => {});
    this.onEvent = onEvent || (() => {});
  }

  available() { return typeof window.Peer === 'function'; }

  host(profile) {
    this.destroy();
    if (!this.available()) throw new Error('Peer networking did not load. Check your internet connection.');
    this.isHost = true;
    this.local = { ...profile };
    this.peer = new window.Peer();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Room creation timed out.')), 12000);
      this.peer.on('open', id => {
        clearTimeout(timer);
        this.local.id = id;
        this.players.set(id, { ...this.local, host: true });
        this.emitRoster();
        resolve(id);
      });
      this.peer.on('connection', conn => this.acceptConnection(conn));
      this.peer.on('error', err => { this.onError(err); reject(err); });
    });
  }

  join(hostId, profile) {
    this.destroy();
    if (!this.available()) throw new Error('Peer networking did not load. Check your internet connection.');
    const clean = this.extractRoomId(hostId);
    if (!SAFE_ID.test(clean)) throw new Error('That room code is not valid.');
    this.isHost = false;
    this.local = { ...profile };
    this.peer = new window.Peer();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Could not reach that room.')), 14000);
      this.peer.on('open', id => {
        this.local.id = id;
        const conn = this.peer.connect(clean, { reliable: true, serialization: 'json' });
        this.hostConnection = conn;
        conn.on('open', () => {
          clearTimeout(timer);
          this.connections.set(clean, conn);
          this.players.set(id, { ...this.local, host: false });
          conn.send({ type: 'hello', profile: this.local });
          resolve(clean);
        });
        conn.on('data', data => this.handleData(data, conn));
        conn.on('close', () => this.onError(new Error('The host left the room.')));
        conn.on('error', err => this.onError(err));
      });
      this.peer.on('error', err => { clearTimeout(timer); this.onError(err); reject(err); });
    });
  }

  extractRoomId(value) {
    const raw = String(value || '').trim();
    try {
      const url = new URL(raw);
      return (url.searchParams.get('room') || '').trim();
    } catch { return raw.replace(/^#?room=/, '').trim(); }
  }

  acceptConnection(conn) {
    conn.on('open', () => this.connections.set(conn.peer, conn));
    conn.on('data', data => this.handleData(data, conn));
    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.players.delete(conn.peer);
      this.emitRoster();
      this.broadcast({ type: 'roster', players: [...this.players.values()] });
    });
    conn.on('error', err => this.onError(err));
  }

  handleData(data, conn) {
    if (!data || typeof data !== 'object' || typeof data.type !== 'string') return;
    switch (data.type) {
      case 'hello': {
        if (!this.isHost || !data.profile) return;
        const profile = {
          id: conn.peer,
          name: String(data.profile.name || 'Cat').slice(0, 16),
          cat: String(data.profile.cat || 'ginger').slice(0, 16),
          host: false
        };
        this.players.set(conn.peer, profile);
        this.emitRoster();
        this.broadcast({ type: 'roster', players: [...this.players.values()] });
        this.onEvent(`${profile.name} joined the room`);
        break;
      }
      case 'roster': {
        if (!Array.isArray(data.players)) return;
        this.players = new Map(data.players.filter(p => p && p.id).map(p => [p.id, p]));
        this.emitRoster();
        break;
      }
      case 'start':
        this.onStart(data.payload);
        break;
      case 'state': {
        const state = data.state;
        if (!state || !state.id || state.id === this.local.id) return;
        this.onRemoteState(state);
        if (this.isHost) this.broadcast(data, conn.peer);
        break;
      }
      case 'finish':
        this.onFinish(data.payload);
        if (this.isHost) this.broadcast(data, conn.peer);
        break;
      case 'event':
        this.onEvent(String(data.message || '').slice(0, 80));
        if (this.isHost) this.broadcast(data, conn.peer);
        break;
      default: break;
    }
  }

  emitRoster() { this.onRoster([...this.players.values()]); }

  broadcast(message, exceptPeer = null) {
    for (const [id, conn] of this.connections) {
      if (id !== exceptPeer && conn.open) conn.send(message);
    }
  }

  startRace(payload) {
    if (!this.isHost) return;
    const msg = { type: 'start', payload };
    this.broadcast(msg);
    this.onStart(payload);
  }

  sendState(state) {
    const msg = { type: 'state', state: { ...state, id: this.local.id, name: this.local.name, cat: this.local.cat } };
    if (this.isHost) this.broadcast(msg); else if (this.hostConnection?.open) this.hostConnection.send(msg);
  }

  sendFinish(payload) {
    const msg = { type: 'finish', payload: { ...payload, id: this.local.id, name: this.local.name } };
    if (this.isHost) this.broadcast(msg); else if (this.hostConnection?.open) this.hostConnection.send(msg);
    this.onFinish(msg.payload);
  }

  sendEvent(message) {
    const msg = { type: 'event', message: String(message).slice(0, 80) };
    if (this.isHost) this.broadcast(msg); else if (this.hostConnection?.open) this.hostConnection.send(msg);
    this.onEvent(msg.message);
  }

  destroy() {
    for (const conn of this.connections.values()) { try { conn.close(); } catch {} }
    this.connections.clear();
    this.players.clear();
    try { this.peer?.destroy(); } catch {}
    this.peer = null;
    this.hostConnection = null;
    this.isHost = false;
  }
}
