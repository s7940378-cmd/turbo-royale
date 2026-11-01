// Turbo Royale — parties & multiplayer over WebRTC (PeerJS). The party leader's browser
// is the hub: everyone sends their state to the leader, who relays it to the rest.
'use strict';
const r2 = v => Math.round(v * 100) / 100;
const packCos = c => SLOTS.map(s => c[s.id]);
const unpackCos = a => { const o = {}; if (Array.isArray(a)) SLOTS.forEach((s, i) => { if (CAT[a[i]] && CAT[a[i]].slot === s.id) o[s.id] = a[i]; }); return Object.assign({}, DEFAULT_EQUIP, o); };
const safeTag = s => String(s || 'Racer').replace(/[\u0000-\u001f​-‏‪-‮<>]/g, '').slice(0, 16) || 'Racer';
const ID_PREFIX = 'turboroyale-v1-';
const PEER_OPTS = { debug: 0, config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] } };

function loadPeerJS() {
  if (window.Peer) return Promise.resolve(true);
  const srcs = ['https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js', 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'];
  return new Promise(res => {
    const tryNext = i => {
      if (i >= srcs.length) return res(false);
      const s = document.createElement('script'); s.src = srcs[i]; s.async = true;
      s.onload = () => res(!!window.Peer); s.onerror = () => { s.remove(); tryNext(i + 1); };
      document.head.appendChild(s);
    };
    tryNext(0);
  });
}

const Net = {
  peer: null, isHost: false, code: null, myPeer: null, jt: 0, ready: false,
  conns: new Map(), hostConn: null, pres: new Map(), mine: {}, partyPeers: [], fxOut: [], listeners: [],
  dirty: new Set(), _sendT: 0, available: false,
  on(fn) { this.listeners.push(fn); }, emit(ev, d) { this.listeners.forEach(f => { try { f(ev, d); } catch (e) { console.error(e); } }); },
  async init() { this.available = await loadPeerJS(); return this.available; },
  get online() { return this.available; },
  get party() { return !!this.code && !!this.myPeer && (this.isHost || !!this.hostConn); },
  newCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.random() * A.length | 0]; return s; },
  inviteLink() { return location.origin + location.pathname + '#party=' + this.code; },
  setLobby() { },
  _newPeer(id) {
    return new Promise((res, rej) => {
      const p = id ? new Peer(id, PEER_OPTS) : new Peer(PEER_OPTS);
      const to = setTimeout(() => { rej(new Error('timeout')); try { p.destroy(); } catch (e) { } }, 12000);
      p.on('open', pid => { clearTimeout(to); res(p); });
      p.on('error', e => { clearTimeout(to); rej(e); });
    });
  },
  async createParty() {
    if (!this.available) throw new Error('offline');
    await this.leaveParty(true);
    for (let tries = 0; tries < 4; tries++) {
      const code = this.newCode();
      try {
        const p = await this._newPeer(ID_PREFIX + code.toLowerCase());
        this._setupPeer(p); this.isHost = true; this.code = code; this.myPeer = p.id; this.jt = Date.now();
        p.on('connection', c => this._hostAccept(c));
        this.setParty({ ready: false, race: null, sel: null, k: null, b: null, fx: null });
        this.emit('party'); return code;
      } catch (e) { if (!e || e.type !== 'unavailable-id') throw e; }
    }
    throw new Error('busy');
  },
  async joinParty(code) {
    if (!this.available) throw new Error('offline');
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (code.length < 4) throw new Error('bad code');
    if (code === this.code) return code;
    await this.leaveParty(true);
    const p = await this._newPeer();
    this._setupPeer(p);
    const conn = p.connect(ID_PREFIX + code.toLowerCase(), { serialization: 'json', reliable: true });
    await new Promise((res, rej) => {
      const to = setTimeout(() => rej(new Error('notfound')), 12000);
      p.on('error', e => { if (e && e.type === 'peer-unavailable') { clearTimeout(to); rej(new Error('notfound')); } });
      conn.on('open', () => { clearTimeout(to); res(); });
    }).catch(e => { try { p.destroy(); } catch (x) { } this.peer = null; throw e; });
    this.isHost = false; this.hostConn = conn; this.code = code; this.myPeer = p.id; this.jt = Date.now();
    conn.on('data', m => this._clientMsg(m));
    conn.on('close', () => { if (this.hostConn === conn) this._lost('The party leader left.'); });
    conn.on('error', () => { });
    this.setParty({ ready: false, race: null, sel: null, k: null, b: null, fx: null });
    this.emit('party'); return code;
  },
  _setupPeer(p) {
    this.peer = p;
    p.on('disconnected', () => { try { if (!p.destroyed) p.reconnect(); } catch (e) { } });
  },
  _lost(msg) {
    const was = this.code; this._reset();
    if (was) this.emit('lost', msg);
    this.emit('party');
  },
  _reset() {
    try { this.peer && this.peer.destroy(); } catch (e) { }
    this.peer = null; this.hostConn = null; this.conns.clear(); this.pres.clear(); this.mine = {}; this.code = null; this.isHost = false; this.myPeer = null; this.partyPeers = []; this.ready = false; this._lastRid = null; this.fxOut = [];
  },
  async leaveParty(quiet) {
    if (!this.code && !this.peer) return;
    this._reset(); if (!quiet) this.emit('party');
  },
  // ----- host side -----
  _hostAccept(c) {
    c.on('open', () => {
      if (this.conns.size >= 7) { try { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); } catch (e) { } return; }
      this.conns.set(c.peer, c);
      c.send({ t: 'all', ps: Object.fromEntries([[this.myPeer, this.mine], ...this.pres]) });
    });
    c.on('data', m => {
      if (!m || typeof m !== 'object') return;
      if (m.t === 'p' && m.p && typeof m.p === 'object') {
        if (JSON.stringify(m.p).length > 8000) return;
        this.pres.set(c.peer, m.p); this.dirty.add(c.peer); this._rebuild(); this._flushSoon();
      }
    });
    const gone = () => { if (!this.conns.has(c.peer)) return; this.conns.delete(c.peer); this.pres.delete(c.peer); this._bcast({ t: 'bye', id: c.peer }); this._rebuild(); };
    c.on('close', gone); c.on('error', gone);
  },
  _bcast(m) { for (const c of this.conns.values()) { try { if (c.open) c.send(m); } catch (e) { } } },
  _flushSoon() {
    if (this._ft) return;
    this._ft = setTimeout(() => {
      this._ft = 0; if (!this.isHost || !this.dirty.size) return;
      const ps = {}; for (const id of this.dirty) ps[id] = id === this.myPeer ? this.mine : this.pres.get(id); this.dirty.clear();
      this._bcast({ t: 'u', ps });
    }, 45);
  },
  // ----- client side -----
  _clientMsg(m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'full') { this._lost('That party is full (8 racers max).'); return; }
    if ((m.t === 'all' || m.t === 'u') && m.ps && typeof m.ps === 'object') {
      if (m.t === 'all') this.pres.clear();
      for (const id in m.ps) { if (id === this.myPeer) continue; const v = m.ps[id]; if (v && typeof v === 'object') this.pres.set(id, v); else this.pres.delete(id); }
      this._rebuild();
    }
    if (m.t === 'bye') { this.pres.delete(m.id); this._rebuild(); }
  },
  // ----- shared -----
  setParty(extra) {
    if (!this.peer) return;
    const p = Account.profile;
    Object.assign(this.mine, { tag: p.tag, lvl: Account.level, cos: packCos(p.equip), jt: this.jt, pts: App.sessionPts || 0, wins: App.sessionWins || 0 }, extra || {});
    for (const k in this.mine) if (this.mine[k] === null) delete this.mine[k];
    if (this.isHost) { this.dirty.add(this.myPeer); this._flushSoon(); this._rebuild(); }
    else if (this.hostConn && this.hostConn.open) {
      const now = performance.now();
      // throttle client sends to ~20/s, always deliver the latest state
      if (now - this._sendT > 45) { this._sendT = now; try { this.hostConn.send({ t: 'p', p: this.mine }); } catch (e) { } }
      else if (!this._pend) { this._pend = setTimeout(() => { this._pend = 0; this._sendT = performance.now(); try { this.hostConn && this.hostConn.send({ t: 'p', p: this.mine }); } catch (e) { } }, 50); }
      this._rebuild();
    }
  },
  _rebuild() {
    const arr = [];
    if (this.myPeer) arr.push({ peer: this.myPeer, sameTab: true, isMe: true, kind: 'viewer', presence: this.mine });
    for (const [id, pr] of this.pres) arr.push({ peer: id, sameTab: false, isMe: false, kind: 'viewer', presence: pr });
    this.partyPeers = arr;
    clearTimeout(this._evT); this._evT = setTimeout(() => this.emit('party'), 60);
    this._raceCheck();
  },
  members() { return this.partyPeers.filter(p => p.presence && p.presence.jt).slice().sort((a, b) => (a.presence.jt - b.presence.jt) || (a.peer < b.peer ? -1 : 1)); },
  leader() { if (!this.party) return null; const id = this.isHost ? this.myPeer : ID_PREFIX + this.code.toLowerCase(); return this.partyPeers.find(p => p.peer === id) || null; },
  isLeader() { return !this.party || this.isHost; },
  // ----- race sync -----
  startRace(cfg) { this.raceCfg = cfg; this.fxOut = []; this.setParty({ race: cfg, k: null, b: null, fx: null }); },
  endRace() { this.raceCfg = null; this.fxOut = []; this.setParty({ race: null, k: null, b: null, fx: null, ready: false }); },
  _raceCheck() {
    const L = this.leader(); if (!L || L.sameTab) { if (window.App && App.race && App.race.net === this) this._apply(App.race); return; }
    const cfg = L.presence.race;
    if (cfg && cfg.rid && cfg.rid !== this._lastRid && Array.isArray(cfg.roster) && cfg.roster.some(r => r.id === this.myPeer)) { this._lastRid = cfg.rid; this.emit('race', cfg); }
    if (window.App && App.race && App.race.net === this) this._apply(App.race);
  },
  sendRace(race) {
    if (!this.party) return;
    const r = race.me; const out = {};
    if (r) out.k = { x: r2(r.x), z: r2(r.z), vx: r2(r.vx), vz: r2(r.vz), yaw: r2(r.yaw), f: r2(r.f), lap: r.lap, prog: +r.prog.toFixed(4), dr: r.drift ? 1 : 0, dd: r.driftDir, sp: r.spin > 0 ? 1 : 0, sh: r.shield > 0 ? 1 : 0, b: r.boost > 0 ? 1 : 0, ch: r2(r.charge), st: r2(r.steer), fin: r.finished ? r2(r.ftime) : 0, el: r.elim ? 1 : 0, rid: race.opts.rid };
    if (race.host) out.b = race.racers.filter(o => o.bot).map(o => [o.id, r2(o.x), r2(o.z), r2(o.vx), r2(o.vz), r2(o.yaw), r2(o.f), o.lap, +o.prog.toFixed(4), (o.drift ? 1 : 0) | (o.spin > 0 ? 2 : 0) | (o.shield > 0 ? 4 : 0) | (o.boost > 0 ? 8 : 0) | (o.driftDir < 0 ? 16 : 0), o.finished ? r2(o.ftime) : 0]);
    out.fx = this.fxOut.slice(-8);
    this.setParty(out);
  },
  sendFx(fx) { this.fxOut.push(fx); if (this.fxOut.length > 16) this.fxOut.splice(0, this.fxOut.length - 16); },
  _apply(race) {
    const now = performance.now();
    const hostId = race.opts.hostPeer;
    for (const p of this.partyPeers) {
      if (p.sameTab || !p.presence) continue;
      const k = p.presence.k; const rr = race.byId[p.peer];
      if (rr && k && k.rid === race.opts.rid && typeof k.x === 'number' && (!rr.net || rr.net._raw !== k)) rr.net = Object.assign({}, k, { at: now, _raw: k });
      const b = p.presence.b;
      if (!race.host && Array.isArray(b) && p.peer === hostId) {
        for (const a of b) { const bot = race.byId[a[0]]; if (!bot || !bot.bot || !Array.isArray(a)) continue; bot.net = { x: a[1], z: a[2], vx: a[3], vz: a[4], yaw: a[5], f: a[6], lap: a[7], prog: a[8], dr: a[9] & 1, sp: a[9] & 2, sh: a[9] & 4, b: a[9] & 8, dd: a[9] & 16 ? -1 : 1, fin: a[10], at: now }; }
      }
      const fx = p.presence.fx;
      if (Array.isArray(fx)) for (const f of fx) if (f && typeof f.id === 'string') race.onFx(sanitizeFx(f));
    }
    // humans who left the party mid-race
    for (const r of race.racers) if (r.remote && !r.elim && !r.finished && !this.partyPeers.some(p => p.peer === r.id) && race.state === 'race') { r.elim = true; r.elimAt = race.raceTime; race.feed(r.name + ' left the race'); }
  },
};
function sanitizeFx(f) {
  const o = { t: String(f.t || '').slice(0, 2), id: String(f.id).slice(0, 64) };
  for (const k of ['owner', 'tgt', 'sid', 'by', 'who', 'k']) if (f[k] != null) o[k] = String(f[k]).slice(0, 64);
  for (const k of ['idx', 'lat', 'x', 'y', 'z', 'prog']) if (typeof f[k] === 'number' && isFinite(f[k])) o[k] = f[k];
  return o;
}
