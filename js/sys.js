// Turbo Royale — input + audio
'use strict';
const Input = (() => {
  const keys = new Set(); const pressed = new Set();
  const touch = { left: 0, right: 0, gas: 0, brake: 0, drift: 0, item: 0 };
  const isTyping = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'); };
  addEventListener('keydown', e => {
    if (isTyping()) return;
    if (!keys.has(e.code)) pressed.add(e.code);
    keys.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && Input.inRace) e.preventDefault();
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  let gp = null;
  function pad() { const ps = navigator.getGamepads ? navigator.getGamepads() : []; for (const p of ps) if (p) return p; return null; }
  return {
    inRace: false, touch,
    down(...c) { return c.some(k => keys.has(k)); },
    hit(...c) { const r = c.some(k => pressed.has(k)); return r; },
    endFrame() { pressed.clear(); this._padPrev = this._padNow; },
    read() {
      const p = pad(); let ps = 0, pg = 0, pb = 0, pd = 0, pi = 0;
      if (p) { ps = Math.abs(p.axes[0]) > 0.15 ? p.axes[0] : 0; pg = (p.buttons[7] && p.buttons[7].value) || (p.buttons[0] && p.buttons[0].pressed ? 1 : 0); pb = (p.buttons[6] && p.buttons[6].value) || (p.buttons[1] && p.buttons[1].pressed ? 1 : 0); pd = (p.buttons[5] && p.buttons[5].pressed) || (p.buttons[4] && p.buttons[4].pressed) ? 1 : 0; pi = p.buttons[2] && p.buttons[2].pressed ? 1 : 0; }
      const L = this.down('KeyA', 'ArrowLeft') || touch.left, Rr = this.down('KeyD', 'ArrowRight') || touch.right;
      const steer = clamp((Rr ? 1 : 0) - (L ? 1 : 0) + ps, -1, 1);
      const gas = Math.max(this.down('KeyW', 'ArrowUp') || touch.gas ? 1 : 0, pg);
      const brake = Math.max(this.down('KeyS', 'ArrowDown') || touch.brake ? 1 : 0, pb);
      const drift = this.down('Space', 'ShiftLeft', 'ShiftRight') || touch.drift || pd;
      const itemNow = this.down('KeyE', 'Enter', 'KeyF') || touch.item || pi;
      const item = itemNow && !this._itemPrev; this._itemPrev = itemNow;
      return { steer, gas, brake, drift: !!drift, item: !!item, look: this.down('KeyC', 'KeyR'), horn: this.hit('KeyH') };
    },
  };
})();

const Sfx = (() => {
  let ctx = null, master = null, eng = null, muted = false, vol = 0.6;
  function init() {
    if (ctx) return; try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = muted ? 0 : vol; master.connect(ctx.destination); } catch (e) { ctx = null; }
  }
  function tone(freq, dur, type, gain, slide, delay) {
    if (!ctx) return; const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(gain || 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, gain, f0, f1) {
    if (!ctx) return; const t = ctx.currentTime; const len = Math.floor(ctx.sampleRate * dur); const b = ctx.createBuffer(1, len, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = b; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(f0 || 800, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(gain || 0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  return {
    init, get ctx() { return ctx; },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : vol; },
    get muted() { return muted; },
    play(n, arg) {
      if (!ctx || muted) return;
      switch (n) {
        case 'beep': tone(440, 0.25, 'square', 0.15); break;
        case 'go': tone(880, 0.6, 'square', 0.18); break;
        case 'box': tone(660, 0.08, 'triangle', 0.2); tone(990, 0.12, 'triangle', 0.2, 0, 0.06); break;
        case 'tick': tone(1200 + Math.random() * 400, 0.03, 'square', 0.05); break;
        case 'got': tone(784, 0.1, 'triangle', 0.2); tone(1046, 0.18, 'triangle', 0.2, 0, 0.08); break;
        case 'boost': noise(0.6, 0.35, 400, 2400); tone(200, 0.5, 'sawtooth', 0.08, 600); break;
        case 'mini': tone(300 + (arg || 0) * 150, 0.25, 'sawtooth', 0.1, 900); noise(0.3, 0.2, 800, 3000); break;
        case 'hit': tone(300, 0.4, 'square', 0.2, 60); noise(0.4, 0.4, 600, 200); break;
        case 'rocket': noise(0.8, 0.3, 300, 1500); break;
        case 'boom': noise(0.7, 0.6, 400, 80); tone(120, 0.5, 'sine', 0.4, 40); break;
        case 'shield': tone(523, 0.3, 'sine', 0.2, 1046); break;
        case 'pop': tone(900, 0.15, 'sine', 0.2, 200); break;
        case 'surge': tone(80, 0.9, 'sawtooth', 0.25, 1600); noise(0.9, 0.4, 2000, 200); break;
        case 'bump': noise(0.15, 0.3, 200, 100); break;
        case 'lap': [659, 784].forEach((f, i) => tone(f, 0.18, 'square', 0.12, 0, i * 0.12)); break;
        case 'final': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'square', 0.12, 0, i * 0.1)); break;
        case 'finish': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.22, 'square', 0.13, 0, i * 0.14)); break;
        case 'ko': tone(400, 0.8, 'sawtooth', 0.2, 80); break;
        case 'click': tone(1400, 0.04, 'square', 0.06); break;
        case 'buy': [784, 988, 1318].forEach((f, i) => tone(f, 0.15, 'triangle', 0.18, 0, i * 0.08)); break;
        case 'horn': { const seq = arg || [520, 520]; seq.forEach((f, i) => tone(f, 0.16, 'square', 0.14, 0, i * 0.17)); break; }
      }
    },
    engine(on, speed, boost) {
      if (!ctx) return;
      if (on && !eng) {
        const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 600; g.gain.value = 0;
        o.connect(f); o2.connect(f); f.connect(g); g.connect(master); o.start(); o2.start(); eng = { o, o2, f, g };
      }
      if (!eng) return;
      if (!on) { eng.g.gain.setTargetAtTime(0, ctx.currentTime, 0.05); return; }
      const s = Math.abs(speed); const fr = 55 + s * 3.2 + (boost ? 40 : 0);
      eng.o.frequency.setTargetAtTime(fr, ctx.currentTime, 0.05); eng.o2.frequency.setTargetAtTime(fr * 0.5, ctx.currentTime, 0.05);
      eng.f.frequency.setTargetAtTime(400 + s * 30, ctx.currentTime, 0.05);
      eng.g.gain.setTargetAtTime(muted ? 0 : 0.05 + Math.min(s, 50) * 0.0016, ctx.currentTime, 0.05);
    },
  };
})();
