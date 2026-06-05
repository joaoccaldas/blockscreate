/**
 * Procedural audio — all sound is synthesized with the Web Audio API, so the
 * game ships zero audio files and stays tiny. One-shot SFX for actions plus an
 * optional ambient pad that shifts with day/night.
 *
 * Browsers block audio until a user gesture, so the context is created lazily
 * and resume() should be called from the first click/tap.
 */
export class Audio {
  constructor({ sound = true, music = false } = {}) {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.soundOn = sound;
    this.musicOn = music;
    this._musicNodes = null;
  }

  _ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0;
    this.musicGain.connect(this.master);
  }

  /** Call on first user gesture to unlock audio. */
  resume() {
    this._ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (this.musicOn) this.startMusic();
  }

  setSound(on) { this.soundOn = on; }

  setMusic(on) {
    this.musicOn = on;
    if (on) this.startMusic();
    else this.stopMusic();
  }

  // ---- low-level helpers ----

  _tone(freq, dur, { type = 'square', vol = 0.5, slideTo = null, attack = 0.005 } = {}) {
    if (!this.soundOn) return;
    this._ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _noise(dur, { vol = 0.4, cutoff = 1800, type = 'lowpass' } = {}) {
    if (!this.soundOn) return;
    this._ensure();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const frames = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  // ---- named one-shots ----

  play(name) {
    switch (name) {
      case 'mine':   this._noise(0.06, { vol: 0.18, cutoff: 1400 }); break;
      case 'break':  this._noise(0.14, { vol: 0.35, cutoff: 1000 });
                     this._tone(160, 0.12, { type: 'triangle', vol: 0.2, slideTo: 90 }); break;
      case 'place':  this._tone(420, 0.08, { type: 'square', vol: 0.25, slideTo: 300 });
                     this._noise(0.05, { vol: 0.12, cutoff: 2200 }); break;
      case 'step':   this._noise(0.03, { vol: 0.06, cutoff: 700 }); break;
      case 'craft':  this._tone(523, 0.1, { type: 'triangle', vol: 0.3 });
                     setTimeout(() => this._tone(784, 0.14, { type: 'triangle', vol: 0.3 }), 80); break;
      case 'eat':    this._tone(300, 0.12, { type: 'sine', vol: 0.25, slideTo: 180 }); break;
      case 'hurt':   this._tone(200, 0.2, { type: 'sawtooth', vol: 0.3, slideTo: 80 }); break;
      case 'jump':   this._tone(330, 0.1, { type: 'square', vol: 0.15, slideTo: 520 }); break;
      case 'objective': this._arp([523, 659, 784], 0.09, 0.28); break;
      case 'unlock': this._arp([523, 659, 784, 1047, 1319], 0.1, 0.32); break;
      case 'horn':   this._tone(150, 0.5, { type: 'sawtooth', vol: 0.32, slideTo: 120 });
                     setTimeout(() => this._tone(120, 0.6, { type: 'sawtooth', vol: 0.3, slideTo: 95 }), 260); break;
      case 'ui':     this._tone(660, 0.05, { type: 'square', vol: 0.18 }); break;
      default: break;
    }
  }

  _arp(freqs, step, vol) {
    freqs.forEach((f, i) => setTimeout(() => this._tone(f, step * 1.6, { type: 'triangle', vol }), i * step * 1000));
  }

  // ---- ambient music ----

  startMusic() {
    this._ensure();
    if (!this.ctx || this._musicNodes) return;
    const t = this.ctx.currentTime;
    const freqs = [110, 164.81, 220]; // A2 / E3 / A3 drone
    const nodes = freqs.map((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = i === 2 ? 'triangle' : 'sine';
      osc.frequency.value = f;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.03;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = f * 0.004;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(this.musicGain);
      osc.start(t);
      lfo.start(t);
      return { osc, lfo };
    });
    this._musicNodes = nodes;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
    this.musicGain.gain.linearRampToValueAtTime(0.12, t + 2);
  }

  stopMusic() {
    if (!this.ctx || !this._musicNodes) return;
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
    this.musicGain.gain.linearRampToValueAtTime(0, t + 1);
    const nodes = this._musicNodes;
    this._musicNodes = null;
    setTimeout(() => nodes.forEach((n) => { try { n.osc.stop(); n.lfo.stop(); } catch (e) {} }), 1100);
  }

  /** Tie ambient brightness to time of day (1 = noon, 0 = midnight). */
  setDayFactor(f) {
    if (this.ctx && this._musicNodes) {
      this.musicGain.gain.setTargetAtTime(0.06 + f * 0.08, this.ctx.currentTime, 0.5);
    }
  }
}
