// Turbo Royale — parties & multiplayer through a public relay (MQTT over secure WebSocket).
// Everyone in a party subscribes to the party's channel and publishes their own state;
// the relay fans messages out. No direct browser-to-browser connection is needed,
// so it works behind home routers, school/work Wi-Fi and phone networks.
'use strict';
const r2 = v => Math.round(v * 100) / 100;
const packCos = c => SLOTS.map(s => c[s.id]);
const unpackCos = a => { const o = {}; if (Array.isArray(a)) SLOTS.forEach((s, i) => { if (CAT[a[i]] && CAT[a[i]].slot === s.id) o[s.id] = a[i]; }); return Object.assign({}, DEFAULT_EQUIP, o); };
const safeTag = s => String(s || 'Racer').replace(/[\u0000-\u001f​-‏‪-‮<>]/g, '').slice(0, 16) || 'Racer';
const TOPIC = 'turboroyale/v2/';
const BROKERS = (() => {
  const q = new URLSearchParams(location.search).get('relay'); if (q) return [q];
  return ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
})();

// ---- minimal MQTT 3.1.1 client (QoS 0) ----
class MqttLite {
  constructor(url, clientId, willTopic, willMsg) { Object.assign(this, { url, clientId, willTopic, willMsg }); this.onmsg = null; this.onclose = null; this.buf = new Uint8Array(0); this.te = new TextEncoder(); this.td = new TextDecoder(); }
  _str(s) { const b = this.te.encode(s); const o = new Uint8Array(b.length + 2); o[0] = b.length >> 8; o[1] = b.length & 255; o.set(b, 2); return o; }
  _pkt(type, parts) {
    let len = parts.reduce((a, p) => a + p.length, 0); const rl = []; do { let d = len % 128; len = Math.floor(len / 128); if (len > 0) d |= 128; rl.push(d); } while (len > 0);
    const total = parts.reduce((a, p) => a + p.length, 0); const o = new Uint8Array(1 + rl.length + total); o[0] = type; o.set(rl, 1); let k = 1 + rl.length; for (const p of parts) { o.set(p, k); k += p.length; } return o;
  }
  connect(timeoutMs) {
    return new Promise((res, rej) => {
      let done = false; const fail = e => { if (done) return; done = true; clearTimeout(to); try { this.ws.close(); } catch (x) { } rej(e || new Error('connect failed')); };
      const to = setTimeout(() => fail(new Error('timeout')), timeoutMs || 6000);
      try { this.ws = new WebSocket(this.url, ['mqtt']); } catch (e) { return fail(e); }
      this.ws.binaryType = 'arraybuffer';
      this.ws.onopen = () => {
        const flags = 0x02 | (this.willTopic ? 0x04 : 0);
        const vh = new Uint8Array([0, 4, 77, 81, 84, 84, 4, flags, 0, 30]); // "MQTT", level 4, keepalive 30s
        const parts = [vh, this._str(this.clientId)]; if (this.willTopic) parts.push(this._str(this.willTopic), this._str(this.willMsg));
        this.ws.send(this._pkt(0x10, parts));
      };
      this.ws.onmessage = ev => {
        const d = new Uint8Array(ev.data); const nb = new Uint8Array(this.buf.length + d.length); nb.set(this.buf); nb.set(d, this.buf.length); this.buf = nb;
        for (;;) {
          if (this.buf.length < 2) break;
          let mul = 1, len = 0, i = 1, b; do { if (i >= this.buf.length) return; b = this.buf[i++]; len += (b & 127) * mul; mul *= 128; } while (b & 128);
          if (this.buf.length < i + len) break;
          const hdr = this.buf[0], type = hdr >> 4, body = this.buf.subarray(i, i + len); this.buf = this.buf.slice(i + len);
          if (type === 2) { if (body[1] === 0) { if (!done) { done = true; clearTimeout(to); this._ping = setInterval(() => this._send(new Uint8Array([0xC0, 0])), 20000); res(this); } } else fail(new Error('refused ' + body[1])); }
          else if (type === 3) {
            const tl = (body[0] << 8) | body[1]; const topic = this.td.decode(body.subarray(2, 2 + tl)); const qos = (hdr >> 1) & 3; const payload = this.td.decode(body.subarray(2 + tl + (qos ? 2 : 0)));
            if (this.onmsg) try { this.onmsg(topic, payload); } catch (e) { console.error(e); }
          }
        }
      };
      this.ws.onerror = () => { if (!done) fail(new Error('socket error')); };
      this.ws.onclose = () => { clearInterval(this._ping); if (!done) fail(new Error('closed')); else if (this.onclose && !this._closing) this.onclose(); };
    });
  }
  _send(b) { try { if (this.ws && this.ws.readyState === 1) { this.ws.send(b); return true; } } catch (e) { } return false; }
  sub(filter) { const id = new Uint8Array([0, 1]); return this._send(this._pkt(0x82, [id, this._str(filter), new Uint8Array([0])])); }
  pub(topic, msg) { return this._send(this._pkt(0x30, [this._str(topic), this.te.encode(msg)])); }
  get open() { return !!this.ws && this.ws.readyState === 1; }
  get backlog() { return this.ws ? this.ws.bufferedAmount : 0; }
  close() { this._closing = true; clearInterval(this._ping); this._send(new Uint8Array([0xE0, 0])); try { this.ws.close(); } catch (e) { } }
}

const Net = {
  cli: null, isHost: false, code: null, myPeer: null, jt: 0, ready: false, brokerIdx: -1,
  pres: new Map(), seen: new Map(), mine: {}, partyPeers: [], fxOut: [], listeners: [], available: true, status: '',
  on(fn) { this.listeners.push(fn); }, emit(ev, d) { this.listeners.forEach(f => { try { f(ev, d); } catch (e) { console.error(e); } }); },
  async init() { this.available = typeof WebSocket !== 'undefined' && typeof TextEncoder !== 'undefined'; return this.available; },
  get online() { return this.available; },
  get party() { return !!this.code && !!this.cli && this.cli.open; },
  newCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.random() * A.length | 0]; return s; },
  inviteLink() { return location.origin + location.pathname + location.search + '#party=' + this.code + (this.brokerIdx > 0 ? '-' + this.brokerIdx : ''); },
  setLobby() { },
  _status(s) { this.status = s; this.emit('status', s); },
  async _open(code, idx) {
    const me = 'p' + Math.random().toString(36).slice(2, 10);
    const cli = new MqttLite(BROKERS[idx], 'tr_' + me, TOPIC + code + '/' + me, '{"bye":1}');
    await cli.connect(7000);
    cli.sub(TOPIC + code + '/+');
    return { cli, me };
  },
  _attach(cli, me, code, idx, host) {
    this.cli = cli; this.myPeer = me; this.code = code; this.brokerIdx = idx; this.isHost = host; this.jt = Date.now();
    cli.onmsg = (t, m) => this._msg(t, m);
    cli.onclose = () => { if (this.cli === cli) this._lost('Lost connection to the party server.'); };
    clearInterval(this._hb); this._hb = setInterval(() => this._beat(), 1000);
  },
  async createParty() {
    await this.leaveParty(true);
    const code = this.newCode(); let err;
    for (let i = 0; i < BROKERS.length; i++) {
      this._status(`Connecting to party server${i ? ' (backup ' + i + ')' : ''}…`);
      try { const { cli, me } = await this._open(code, i); this._attach(cli, me, code, i, true); this.setParty({ ready: false, race: null, sel: null, k: null, b: null, fx: null }); this._status(''); this.emit('party'); return code; }
      catch (e) { err = e; }
    }
    this._status(''); throw new Error('noserver');
  },
  async joinParty(input) {
    let raw = String(input || '').toUpperCase().trim(); const m = /^([A-Z0-9]{4,6})(?:-(\d))?$/.exec(raw.replace(/[^A-Z0-9-]/g, ''));
    if (!m) throw new Error('bad code');
    const code = m[1], hint = m[2] !== undefined ? +m[2] : -1;
    if (code === this.code && this.party) return code;
    await this.leaveParty(true);
    const order = [...BROKERS.keys()]; if (hint >= 0 && hint < BROKERS.length) { order.splice(order.indexOf(hint), 1); order.unshift(hint); }
    let reached = 0;
    for (const i of order) {
      this._status(`Connecting to party server${i ? ' (backup ' + i + ')' : ''}…`);
      let c; try { c = await this._open(code, i); } catch (e) { continue; }
      reached++;
      this._status(`Looking for party ${code}…`);
      // listen for the leader's heartbeat
      const found = await new Promise(res => {
        const seen = new Map(); const to = setTimeout(() => res(null), 5000);
        c.cli.onmsg = (t, msg) => { const id = t.slice(t.lastIndexOf('/') + 1); if (id === c.me) return; let o; try { o = JSON.parse(msg); } catch (e) { return; } if (o && o.p) { seen.set(id, o.p); if (o.p.host) { clearTimeout(to); res(seen); } } };
        // nudge: announce ourselves so an idle leader replies quickly
        c.cli.pub(TOPIC + code + '/' + c.me, JSON.stringify({ hello: 1 }));
      });
      if (!found) { c.cli.close(); continue; }
      const others = [...found.values()].filter(p => p && p.jt).length;
      if (others >= 8) { c.cli.close(); this._status(''); throw new Error('full'); }
      this._attach(c.cli, c.me, code, i, false);
      for (const [id, p] of found) { this.pres.set(id, p); this.seen.set(id, Date.now()); }
      this.setParty({ ready: false, race: null, sel: null, k: null, b: null, fx: null });
      this._rebuild(); this._status(''); this.emit('party'); return code;
    }
    this._status('');
    throw new Error(reached ? 'notfound' : 'noserver');
  },
  _msg(topic, msg) {
    const id = topic.slice(topic.lastIndexOf('/') + 1); if (!id || id === this.myPeer) return;
    let o; try { o = JSON.parse(msg); } catch (e) { return; }
    if (!o || typeof o !== 'object') return;
    if (o.bye) { if (this.pres.delete(id)) { this.seen.delete(id); this._rebuild(); this._checkLeader(); } return; }
    if (o.hello) { this._beat(true); return; }
    if (o.p && typeof o.p === 'object' && msg.length < 12000) { this.pres.set(id, o.p); this.seen.set(id, Date.now()); this._rebuild(); }
  },
  _beat(force) {
    if (!this.cli) return;
    const now = Date.now();
    let changed = false;
    for (const [id, t] of this.seen) if (now - t > 8000) { this.pres.delete(id); this.seen.delete(id); changed = true; }
    if (changed) { this._rebuild(); this._checkLeader(); }
    if (force || now - (this._lastPub || 0) > 900) this._publish();
  },
  _checkLeader() { if (!this.isHost && this.code && !this.partyPeers.some(p => !p.sameTab && p.presence.host)) this._lost('The party leader left.'); },
  _publish() {
    if (!this.cli || !this.cli.open) return;
    if (this.cli.backlog > 64000) return; // slow connection: skip a frame rather than pile up
    this._lastPub = Date.now();
    this.cli.pub(TOPIC + this.code + '/' + this.myPeer, JSON.stringify({ p: this.mine }));
  },
  _lost(msg) { const was = this.code; this._reset(); if (was) this.emit('lost', msg); this.emit('party'); },
  _reset() {
    clearInterval(this._hb); clearTimeout(this._pend); this._pend = 0;
    if (this.cli) { const c = this.cli; this.cli = null; try { if (this.code && this.myPeer) c.pub(TOPIC + this.code + '/' + this.myPeer, '{"bye":1}'); } catch (e) { } setTimeout(() => c.close(), 100); }
    this.pres.clear(); this.seen.clear(); this.mine = {}; this.code = null; this.isHost = false; this.myPeer = null; this.partyPeers = []; this.ready = false; this._lastRid = null; this.fxOut = [];
  },
  async leaveParty(quiet) { if (!this.code && !this.cli) return; this._reset(); if (!quiet) this.emit('party'); },
  setParty(extra) {
    if (!this.cli) return;
    const p = Account.profile;
    Object.assign(this.mine, { tag: p.tag, lvl: Account.level, cos: packCos(p.equip), jt: this.jt, host: this.isHost ? 1 : 0, pts: App.sessionPts || 0, wins: App.sessionWins || 0 }, extra || {});
    for (const k in this.mine) if (this.mine[k] === null) delete this.mine[k];
    const now = performance.now();
    if (now - (this._sendT || 0) >= 66) { this._sendT = now; this._publish(); }
    else if (!this._pend) this._pend = setTimeout(() => { this._pend = 0; this._sendT = performance.now(); this._publish(); }, 70);
    this._rebuild();
  },
  _rebuild() {
    const arr = [];
    if (this.myPeer) arr.push({ peer: this.myPeer, sameTab: true, isMe: true, kind: 'viewer', presence: this.mine });
    for (const [id, pr] of this.pres) if (pr && pr.jt) arr.push({ peer: id, sameTab: false, isMe: false, kind: 'viewer', presence: pr });
    this.partyPeers = arr;
    clearTimeout(this._evT); this._evT = setTimeout(() => this.emit('party'), 80);
    this._raceCheck();
  },
  members() { return this.partyPeers.slice().sort((a, b) => ((b.presence.host | 0) - (a.presence.host | 0)) || (a.presence.jt - b.presence.jt) || (a.peer < b.peer ? -1 : 1)).slice(0, 8); },
  leader() { if (!this.code) return null; return this.members().find(p => p.presence.host) || null; },
  isLeader() { return !this.party || this.isHost; },
  // ----- race sync -----
  startRace(cfg) { this.raceCfg = cfg; this.fxOut = []; this.setParty({ race: cfg, k: null, b: null, fx: null }); },
  endRace() { this.raceCfg = null; this.fxOut = []; this.setParty({ race: null, k: null, b: null, fx: null, ready: false }); },
  _raceCheck() {
    const L = this.leader();
    if (L && !L.sameTab) {
      const cfg = L.presence.race;
      if (cfg && cfg.rid && cfg.rid !== this._lastRid && Array.isArray(cfg.roster) && cfg.roster.some(r => r.id === this.myPeer) && (!window.App || !App.race || App.race.opts.rid !== cfg.rid)) { this._lastRid = cfg.rid; this.emit('race', cfg); }
    }
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
      if (!race.host && Array.isArray(b) && p.peer === hostId && b !== this._lastB) {
        this._lastB = b;
        for (const a of b) { if (!Array.isArray(a)) continue; const bot = race.byId[a[0]]; if (!bot || !bot.bot) continue; bot.net = { x: a[1], z: a[2], vx: a[3], vz: a[4], yaw: a[5], f: a[6], lap: a[7], prog: a[8], dr: a[9] & 1, sp: a[9] & 2, sh: a[9] & 4, b: a[9] & 8, dd: a[9] & 16 ? -1 : 1, fin: a[10], at: now }; }
      }
      const fx = p.presence.fx;
      if (Array.isArray(fx)) for (const f of fx) if (f && typeof f.id === 'string') race.onFx(sanitizeFx(f));
    }
    for (const r of race.racers) if (r.remote && !r.elim && !r.finished && !this.partyPeers.some(p => p.peer === r.id) && race.state === 'race') { r.elim = true; r.elimAt = race.raceTime; race.feed(r.name + ' left the race'); }
  },
};
function sanitizeFx(f) {
  const o = { t: String(f.t || '').slice(0, 2), id: String(f.id).slice(0, 64) };
  for (const k of ['owner', 'tgt', 'sid', 'by', 'who', 'k']) if (f[k] != null) o[k] = String(f[k]).slice(0, 64);
  for (const k of ['idx', 'lat', 'x', 'y', 'z', 'prog']) if (typeof f[k] === 'number' && isFinite(f[k])) o[k] = f[k];
  return o;
}
