// Turbo Royale — race simulation, bots, items, HUD
'use strict';
const ORD = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');

class Racer {
  constructor(o, race) {
    Object.assign(this, { id: o.id, name: o.name, type: o.type, cos: Object.assign({}, DEFAULT_EQUIP, o.cos || {}), human: o.type !== 'bot' });
    this.local = o.type === 'local'; this.bot = o.type === 'bot'; this.remote = o.type === 'remote';
    const body = CAT[this.cos.body] || CAT.b_classic; this.stats = body.stats || [1, 1, 1];
    this.x = 0; this.y = 0; this.z = 0; this.yaw = 0; this.vx = 0; this.vz = 0; this.f = 0; this.steer = 0; this.lat = 0;
    this.idx = 0; this.lap = 0; this.cp = false; this.prog = 0; this.finished = false; this.ftime = 0; this.place = 0;
    this.item = null; this.itemN = 0; this.rolling = 0; this.boost = 0; this.spin = 0; this.shield = 0; this.slow = 0;
    this.drift = false; this.driftDir = 0; this.charge = 0; this.hop = 0; this.visYaw = 0; this.out = false; this.elim = false;
    this.padCd = 0; this.trailT = 0; this.pitch = 0; this.roll = 0;
    // bots
    this.skill = o.skill || 1; this.lane = (Math.random() - 0.5) * 10; this.phase = Math.random() * 10; this.itemT = 0;
    // remote interpolation
    this.net = null;
  }
}

class Race {
  constructor(app, opts) {
    this.app = app; this.R = app.R; this.opts = opts;
    this.mode = opts.mode; this.laps = opts.mode === 'ko' ? 99 : (opts.laps || 3);
    this.items = opts.mode !== 'tt';
    this.def = TRACKS.find(t => t.id === opts.track) || TRACKS[0];
    this.rand = rng(opts.seed || 1234);
    this.track = new Track(this.def);
    this.host = opts.host !== false; this.net = opts.net || null;
    this.quality = app.settings.quality;
    this.scene = { meshes: [], particles: [], fog: { color: this.track.theme.fog, near: this.track.theme.fogN, far: this.track.theme.fogF }, light: this.track.theme.light, sky: this.track.theme.fog };
    const L = this.scene.light; const l = Math.hypot(...L.dir); L.dir = L.dir.map(v => v / l);
    this.scene.meshes.push(...this.track.build(this.R, this.quality));
    this.fxAdd = new Particles(1800, true); this.fxN = new Particles(1400, false);
    this.scene.particles.push(this.fxN, this.fxAdd);
    this.props = KartFactory.propGeo(this.R);
    this.tex = Textures.get(this.R);
    this.racers = opts.racers.map(o => new Racer(o, this));
    this.me = this.racers.find(r => r.local);
    this.byId = Object.fromEntries(this.racers.map(r => [r.id, r]));
    this.racers.forEach(r => { r.view = new KartView(this.R, r.cos); this.scene.meshes.push(...r.view.meshes); });
    this._grid();
    this._boxes(); this._pads();
    this.proj = []; this.slicks = []; this.fxSeen = new Set();
    this.state = 'intro'; this.t = 0; this.raceTime = 0; this.introT = 2.2; this.count = 3.6; this.lastCount = 4;
    this.cam = { x: 0, y: 20, z: 0, tx: 0, ty: 0, tz: 0, fov: 1.2, near: 0.3, far: 1400 };
    this.camYaw = this.me ? this.me.yaw : 0; this.spectate = null;
    this.koNext = 25; this.koOrder = [];
    this.stats = { finish: 0, win: 0, podium: 0, rockethit: 0, driftboost: 0, itemuse: 0, box: 0, kotop3: 0, pad: 0, purple: 0 };
    this.done = false; this.resultsShown = false; this.finishWait = 0;
    this.netT = 0; this.messages = [];
    this._hud();
  }
  _grid() {
    const t = this.track, order = this.racers.slice();
    order.forEach((r, k) => {
      const row = Math.floor(k / 2), side = k % 2 ? 1 : -1;
      const i = t.wrap(-6 - row * 5);
      const p = t.point(i, side * 5 + (row % 2 ? 1.5 : -1.5));
      r.x = p[0]; r.z = p[2]; r.y = p[1]; r.yaw = t.heading(i); r.idx = i; r.lap = 0; r.prog = (i - t.N) / t.N;
      r.visYaw = r.yaw;
    });
  }
  _boxes() {
    this.boxes = []; if (!this.items) return;
    const t = this.track;
    for (const fr of [0.14, 0.38, 0.62, 0.84]) {
      const i = Math.floor(fr * t.N);
      for (const lat of [-7.5, -2.5, 2.5, 7.5]) {
        const p = t.point(i, lat); const m = this.R.mesh(this.props.box, { tex: this.tex.box, alpha: 0.9, emis: 0.25 });
        this.scene.meshes.push(m); this.boxes.push({ x: p[0], y: p[1] + 1.3, z: p[2], on: true, t: 0, m, ph: Math.random() * 6 });
      }
    }
  }
  _pads() {
    this.pads = []; if (this.mode === 'tt' && false) return;
    const t = this.track; const g = new Geo();
    for (let i = 30; i < t.N - 30; i += 4) {
      // find straight sections
      if (Math.abs(t.curv[i]) < 0.04 && Math.abs(t.curv[t.wrap(i + 20)]) < 0.05 && this.pads.every(p => Math.abs(p.i - i) > t.N / 5) && (i / t.N) % 0.25 > 0.04) {
        const lat = [-5, 0, 5][this.pads.length % 3];
        this.pads.push({ i, lat });
        const A = (o, dz) => [t.px[i] - t.tz[i] * o + t.tx[i] * dz, t.py[i] + 0.09, t.pz[i] + t.tx[i] * o + t.tz[i] * dz];
        g.quad(A(lat - 2, -3), A(lat + 2, -3), A(lat + 2, 3), A(lat - 2, 3), hexc(0xffffff, 0.8), [[0, 1], [1, 1], [1, 0], [0, 0]]);
        if (this.pads.length >= 4) break;
      }
    }
    if (this.pads.length) this.scene.meshes.push(this.R.mesh(this.R.upload(g), { tex: this.tex.pad }));
  }
  // ---------- HUD ----------
  _hud() {
    const $ = s => document.getElementById(s);
    this.h = { root: $('hud'), pos: $('hPos'), lap: $('hLap'), time: $('hTime'), item: $('hItem'), itemN: $('hItemN'), spd: $('hSpd'), map: $('hMap'), msg: $('hMsg'), sub: $('hSub'), ko: $('hKo'), tags: $('hTags'), list: $('hList'), boostBar: $('hDrift') };
    this.h.root.classList.remove('hidden');
    this.h.map.width = this.h.map.height = 150; this.mapCtx = this.h.map.getContext('2d');
    this.h.tags.innerHTML = '';
    this.racers.forEach(r => { if (r.local) return; const d = document.createElement('div'); d.className = 'tag' + (r.human ? ' human' : ''); d.textContent = r.name; this.h.tags.appendChild(d); r.tag = d; });
    this.h.ko.classList.toggle('hidden', this.mode !== 'ko');
    this.h.lap.parentElement.classList.toggle('hidden', this.mode === 'ko');
    this.setItemUI();
    this.msg('', '');
  }
  msg(big, sub, dur) {
    this.h.msg.textContent = big || ''; this.h.sub.textContent = sub || '';
    this.h.msg.classList.remove('pop'); void this.h.msg.offsetWidth; if (big) this.h.msg.classList.add('pop');
    clearTimeout(this._mt); if (dur) this._mt = setTimeout(() => { this.h.msg.textContent = ''; this.h.sub.textContent = ''; }, dur * 1000);
  }
  setItemUI() {
    const r = this.me; if (!r) return;
    if (r.rolling > 0) return;
    this.h.item.textContent = r.item ? ITEMS[r.item].icon : '';
    this.h.item.parentElement.classList.toggle('has', !!r.item);
    this.h.itemN.textContent = r.item === 'nitro3' ? '×' + r.itemN : '';
  }
  // ---------- main update ----------
  update(dt) {
    dt = Math.min(dt, 0.05);
    this.t += dt;
    const ctl = Input.read();
    if (this.state === 'intro') { this.introT -= dt; if (this.introT <= 0 || ctl.gas && this.t > 0.6) { this.state = 'count'; } }
    else if (this.state === 'count') {
      this.count -= dt; const c = Math.ceil(this.count - 0.6);
      if (c !== this.lastCount && c >= 1 && c <= 3) { this.lastCount = c; this.msg(String(c), ''); Sfx.play('beep'); }
      if (ctl.gas && this.count < 1.3 && this.count > 0.6 && this.me) this.me._rs = true;
      if (ctl.gas && this.count > 1.5 && this.me) this.me._rs = false;
      if (this.count <= 0.6) {
        this.state = 'race'; this.msg('GO!', '', 1); Sfx.play('go');
        if (this.me && this.me._rs) { this.me.boost = 1.1; Sfx.play('boost'); this.msg('GO!', 'ROCKET START!', 1.2); }
        this.racers.forEach(r => { if (r.bot && this.rand() < r.skill - 0.5) r.boost = 0.8; });
      }
    }
    const racing = this.state === 'race' || this.state === 'end';
    if (racing) this.raceTime += dt;
    const sub = 2; const sdt = dt / sub;
    for (let s = 0; s < sub; s++) {
      for (const r of this.racers) {
        if (r.elim) continue;
        if (r.local) { const c = (racing && !r.finished) ? ctl : { steer: 0, gas: r.finished ? 0.5 : 0, brake: 0, drift: false }; if (r.finished) this._botCtl(r, c, sdt); this._phys(r, c, sdt, racing); }
        else if (r.bot && this.host) { const c = { steer: 0, gas: 0, brake: 0, drift: false }; if (racing) this._botCtl(r, c, sdt); this._phys(r, c, sdt, racing); }
        else this._remote(r, sdt);
      }
      this._collide();
    }
    if (racing) {
      if (ctl.item && this.me && !this.me.finished && !this.me.elim) this.useItem(this.me);
      if (ctl.horn && this.me) Sfx.play('horn', (CAT[this.me.cos.horn] || CAT.h_beep).kind);
      for (const r of this.racers) if (!r.elim && (r.local || (r.bot && this.host)) && !r.finished) this._interact(r, dt);
      this._projectiles(dt);
      if (this.mode === 'ko' && this.host && this.state === 'race') this._knockout(dt);
    }
    this._rank();
    this._boxesUpdate(dt);
    this._fxUpdate(dt);
    this._camera(dt, ctl);
    this._hudUpdate(dt);
    if (this.net) { this.netT -= dt; if (this.netT <= 0) { this.netT = 1 / 15; this.net.sendRace(this); } }
    this._checkEnd(dt);
    if (this.me) Sfx.engine(this.state !== 'end' || !this.me.finished, this.me.f, this.me.boost > 0);
  }
  // ---------- physics ----------
  _phys(r, c, dt, racing) {
    const t = this.track;
    const st = r.stats; const handling = st[2];
    let maxF = 35 * st[0] * ((r.bot || r.finished) ? (r.skillNow || r.skill) : 1); const acc = 19 * st[1];
    const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw), rx = -fz, rz = fx;
    let f = r.vx * fx + r.vz * fz, lat = r.vx * rx + r.vz * rz;
    const offroad = Math.abs(r.lat) > t.half + 1.4;
    if (r.slow > 0) { r.slow -= dt; maxF *= 0.65; }
    if (offroad && r.boost <= 0 && !r.out) maxF *= 0.5;
    if (r.padCd > 0) r.padCd -= dt;
    r.hop = Math.max(0, r.hop - dt * 2.5);
    if (!racing) { f *= 1 - 3 * dt; lat *= 1 - 5 * dt; }
    else if (r.torp > 0) {
      // Torpedo: auto-pilot down the middle of the track at huge speed
      r.torp -= dt; r.spin = 0; r.drift = false; r.charge = 0; r.spinAng = 0;
      const ti = t.wrap(r.idx + 16); r.torpLane = lerp(r.torpLane || 0, 0, 1 - Math.exp(-0.8 * dt)); const pt = t.point(ti, r.torpLane);
      r.yaw += angDiff(r.yaw, Math.atan2(pt[0] - r.x, pt[2] - r.z)) * (1 - Math.exp(-7 * dt));
      f = lerp(f, 72, 1 - Math.exp(-2.5 * dt)); lat *= 1 - 8 * dt; r.steer = 0;
      if (r.torp <= 0) { r.torp = 0; r.boost = Math.max(r.boost, 0.7); this._burst(r.x, r.y + 1, r.z, 24, [1, 0.8, 0.3]); if (r.local) Sfx.play('pop'); }
    }
    else if (r.spin > 0) {
      // the kart body spins as an animation, while its real heading is steered back to face down the track
      r.spin -= dt; f *= 1 - 2.2 * dt; lat *= 1 - 4 * dt; r.drift = false; r.charge = 0;
      const th = t.heading(r.idx); r.yaw += angDiff(r.yaw, th) * (1 - Math.exp(-5 * dt));
      const dur = r.spinDur || 1; r.spinAng = (1 - Math.max(0, r.spin) / dur) * Math.PI * 2 * (r.spinTurns || 1);
      if (r.spin <= 0) { r.spin = 0; r.spinAng = 0; r.yaw = th + angDiff(th, r.yaw) * 0.3; }
    } else {
      if (r.boost > 0) { r.boost -= dt; const bm = maxF * 1.42; f = Math.min(f + 70 * dt, bm); }
      else if (c.gas > 0) { if (f < maxF) f += acc * c.gas * dt * (1 - 0.65 * f / maxF); else f -= (f - maxF) * 1.8 * dt; }
      else if (!c.brake) f *= 1 - 0.55 * dt;
      if (c.brake) { if (f > 0.5) f -= 38 * dt; else f = Math.max(f - 14 * dt, -11); }
      if (!c.gas && !c.brake && Math.abs(f) < 0.3) f = 0;
      // drift
      if (c.drift && !r.drift && Math.abs(c.steer) > 0.25 && f > 14 && !offroad) { r.drift = true; r.driftDir = Math.sign(c.steer); r.charge = 0; r.hop = 0.35; r.driftK = 0; }
      if (r.drift && (!c.drift || f < 9)) {
        if (f >= 9 && r.charge >= 0.7) {
          const lvl = r.charge >= 2.6 ? 3 : r.charge >= 1.6 ? 2 : 1; r.boost = Math.max(r.boost, [0, 0.55, 1.0, 1.6][lvl]);
          if (r.local) { Sfx.play('mini', lvl); this.stats.driftboost++; if (lvl === 3) this.stats.purple++; }
        }
        r.drift = false; r.charge = 0;
      }
      const sf = clamp(Math.abs(f) / 11, 0, 1) * (f < 0 ? -1 : 1);
      let turn;
      if (r.drift) {
        // drift arc: no input = wide sweeping arc; steer in = tighter; steer out = hold a wide line
        const k = clamp(c.steer * r.driftDir, -1, 1);
        r.driftK = lerp(r.driftK || 0, k, 1 - Math.exp(-8 * dt));
        turn = r.driftDir * (1.0 + 0.62 * r.driftK) * handling;
        r.charge += dt * (1.15 + 0.45 * Math.max(0, r.driftK));
      }
      else turn = c.steer * 2.05 * handling * (1 - 0.25 * clamp(f / maxF, 0, 1));
      r.yaw -= turn * sf * dt;
      r.steer = lerp(r.steer, c.steer, 0.3);
    }
    lat *= Math.exp(-(r.drift ? 3.6 : r.spin > 0 ? 3 : 9) * dt);
    const nfx = Math.sin(r.yaw), nfz = Math.cos(r.yaw);
    r.vx = nfx * f + -nfz * lat; r.vz = nfz * f + nfx * lat; r.f = f;
    r.x += r.vx * dt; r.z += r.vz * dt;
    // track constraints
    const pi = r.idx; r.idx = t.nearest(r.x, r.z, r.idx, 20);
    r.lat = t.lateral(r.idx, r.x, r.z);
    const lim = t.wallD - 1.1;
    if (Math.abs(r.lat) > lim) {
      const s = Math.sign(r.lat), ex = -t.tz[r.idx], ez = t.tx[r.idx];
      r.x -= ex * (Math.abs(r.lat) - lim) * s; r.z -= ez * (Math.abs(r.lat) - lim) * s; r.lat = lim * s;
      const vn = r.vx * ex + r.vz * ez;
      if (vn * s > 0) { r.vx -= ex * vn * 1.4; r.vz -= ez * vn * 1.4; r.vx *= 0.88; r.vz *= 0.88; const th = t.heading(r.idx); const fwdOk = Math.cos(r.yaw - th) > -0.3; r.yaw += angDiff(r.yaw, fwdOk ? th : th + Math.PI) * 0.12; if (r.local && Math.abs(vn) > 6) { Sfx.play('bump'); this.shake = 0.3; } }
    }
    const ty = t.heightAt(r.idx, r.x, r.z); r.y = lerp(r.y, ty, 0.5);
    const slope = t.ty[r.idx] * Math.cos(r.yaw - t.heading(r.idx));
    r.pitch = lerp(r.pitch, -Math.atan(slope), 0.2);
    const sideSlope = t.ty[r.idx] * Math.sin(r.yaw - t.heading(r.idx));
    r.roll = lerp(r.roll, Math.atan(sideSlope) * 0.5 + (r.drift ? -r.driftDir * 0.08 : 0), 0.2);
    this._lapLogic(r, pi);
  }
  _lapLogic(r, pi) {
    const N = this.track.N, i = r.idx;
    if (i > N * 0.4 && i < N * 0.6) r.cp = true;
    if (pi > N * 0.75 && i < N * 0.25) {
      if (r.cp || r.lap === 0) {
        r.lap++; r.cp = false;
        if (r.lap > this.laps && !r.finished) this._finish(r);
        else if (r.local && r.lap > 1) { if (r.lap === this.laps) { this.msg('FINAL LAP', '', 1.6); Sfx.play('final'); } else { this.msg('LAP ' + r.lap + '/' + this.laps, '', 1.2); Sfx.play('lap'); } }
      }
    } else if (pi < N * 0.25 && i > N * 0.75) { r.lap--; r.cp = true; }
    r.prog = r.lap - 1 + i / N;
  }
  _finish(r) {
    r.finished = true; r.ftime = this.raceTime;
    if (r.local) {
      this.state = 'end'; this.finishWait = 0;
      const place = this.racers.filter(o => o.finished).length;
      r.fplace = place;
      this.msg(place === 1 ? 'VICTORY!' : ORD(place).toUpperCase(), 'FINISH · ' + fmtTime(r.ftime), 0);
      Sfx.play('finish'); this._confetti(r);
      this.stats.finish = 1; if (place === 1) this.stats.win = 1; if (place <= 3) this.stats.podium = 1;
    }
  }
  _remote(r, dt) {
    const n = r.net; if (!n) return;
    // extrapolate briefly then blend
    const age = (performance.now() - n.at) / 1000;
    if (age > 15 && this.state === 'race' && !r.finished && !r.elim) { r.elim = true; r.elimAt = this.raceTime; this.feed(r.name + ' disconnected'); return; }
    const ex = Math.min(age, 0.25);
    const tx = n.x + n.vx * ex, tz = n.z + n.vz * ex;
    const k = 1 - Math.exp(-14 * dt);
    if (Math.hypot(tx - r.x, tz - r.z) > 25) { r.x = tx; r.z = tz; } else { r.x = lerp(r.x, tx, k); r.z = lerp(r.z, tz, k); }
    r.yaw = r.yaw + angDiff(r.yaw, n.yaw) * k; r.f = n.f; r.vx = n.vx; r.vz = n.vz;
    r.idx = this.track.nearest(r.x, r.z, r.idx, 20); r.lat = this.track.lateral(r.idx, r.x, r.z);
    r.y = lerp(r.y, this.track.heightAt(r.idx, r.x, r.z), 0.5);
    r.pitch = lerp(r.pitch, -Math.atan(this.track.ty[r.idx] * Math.cos(r.yaw - this.track.heading(r.idx))), 0.2);
    r.drift = !!n.dr; r.driftDir = n.dd || 0; r.spin = n.sp ? 0.1 : 0; r.torp = n.tp ? 0.1 : 0; if (n.sp) { r.spinAng = (r.spinAng || 0) + dt * 10; } else if (r.spinAng) { r.spinAng = 0; } r.shield = n.sh ? 1 : 0; r.boost = n.b ? 0.1 : 0; r.charge = n.ch || 0;
    r.lap = n.lap; r.prog = n.prog; r.steer = n.st || 0;
    if (n.fin && !r.finished) { r.finished = true; r.ftime = n.fin; }
  }
  _collide() {
    const rs = this.racers;
    for (let a = 0; a < rs.length; a++) for (let b = a + 1; b < rs.length; b++) {
      const A = rs[a], B = rs[b]; if (A.elim || B.elim) continue;
      const dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz); const rad = (A.torp > 0 || B.torp > 0) ? 3.3 : 2.3; if (d > rad || d < 0.001) continue;
      const nx = dx / d, nz = dz / d, push = (rad - d);
      const simA = A.local || (A.bot && this.host), simB = B.local || (B.bot && this.host);
      let wa = simA ? (simB ? 0.5 : 1) : 0, wb = simB ? (simA ? 0.5 : 1) : 0;
      const tA = A.torp > 0, tB = B.torp > 0;
      if (tA !== tB) {
        const victim = tA ? B : A, simV = tA ? simB : simA;
        if (tA) { wa = 0; wb = simB ? 1 : 0; } else { wb = 0; wa = simA ? 1 : 0; }
        if (simV && !(victim.spin > 0)) { if (this.hit(victim, 'torp', (tA ? A : B).id)) { victim.vx += (tA ? nx : -nx) * 14; victim.vz += (tA ? nz : -nz) * 14; } this._burst(victim.x, victim.y + 1, victim.z, 16, [1, 0.7, 0.2]); if (this._near(victim)) Sfx.play('boom'); }
      }
      A.x -= nx * push * wa; A.z -= nz * push * wa; B.x += nx * push * wb; B.z += nz * push * wb;
      const rv = (B.vx - A.vx) * nx + (B.vz - A.vz) * nz;
      if (rv < 0) { const j = -rv * 0.7; if (simA) { A.vx -= nx * j * wa * 2 * 0.5; A.vz -= nz * j * wa; } if (simB) { B.vx += nx * j * wb; B.vz += nz * j * wb; } if ((A.local || B.local) && j > 4) Sfx.play('bump'); }
    }
  }
  // ---------- bots ----------
  _botCtl(r, c, dt) {
    const t = this.track;
    // rubber band vs best human
    const humans = this.racers.filter(o => o.human && !o.elim);
    let ref = humans.length ? Math.max(...humans.map(h => h.prog)) : r.prog;
    const diff = r.prog - ref;
    const diffK = { easy: 0.86, normal: 0.95, hard: 1.02 }[this.app.settings.difficulty || 'normal'];
    r.skillNow = r.skill * diffK * (diff < -0.12 ? 1.1 : diff < -0.04 ? 1.04 : diff > 0.12 ? 0.9 : diff > 0.04 ? 0.96 : 1);
    if (r.local) r.skillNow = 0.8;
    const look = Math.round(9 + Math.max(0, r.f) * 0.33);
    const ti = t.wrap(r.idx + look);
    let lane = r.lane + Math.sin(this.t * 0.35 + r.phase) * 3.5;
    for (const s of this.slicks) { const si = t.nearest(s.x, s.z, ti, 15); if (Math.abs(si - ti) < 15) { const sl = t.lateral(si, s.x, s.z); if (Math.abs(sl - lane) < 4) lane = sl + (sl > 0 ? -6 : 6); } }
    // go for item boxes if no item
    if (!r.item && this.items) { for (const b of this.boxes) { if (!b.on) continue; const bi = t.nearest(b.x, b.z, ti, 18); if (Math.abs(bi - ti) <= 18 && Math.hypot(b.x - r.x, b.z - r.z) < 40) { lane = t.lateral(bi, b.x, b.z); break; } } }
    lane = clamp(lane, -t.half + 2, t.half - 2);
    // unstuck
    if (r.revT > 0) { r.revT -= dt; const pr = t.point(t.wrap(r.idx + 6), 0); const dd = angDiff(r.yaw, Math.atan2(pr[0] - r.x, pr[2] - r.z)); c.gas = 0; c.brake = 1; c.steer = clamp(dd * 2, -1, 1); c.drift = false; return; }
    if (this.state === 'race' && Math.abs(r.f) < 4 && r.spin <= 0) { r.stuckT = (r.stuckT || 0) + dt; if (r.stuckT > 1.3) { r.revT = 1.1; r.stuckT = 0; } } else r.stuckT = Math.max(0, (r.stuckT || 0) - dt);
    const p = t.point(ti, lane);
    const want = Math.atan2(p[0] - r.x, p[2] - r.z);
    const d = angDiff(r.yaw, want);
    c.steer = clamp(-d * 2.6, -1, 1); c.gas = 1; c.brake = (Math.abs(d) > 0.9 && r.f > 18) ? 1 : 0;
    // drifting on big bends
    const cv = t.curv[t.wrap(r.idx + 8)];
    if (Math.abs(cv) > 0.3 && r.f > 20) { c.drift = true; if (!r.drift) c.steer = -Math.sign(cv) || c.steer; }
    else if (r.drift && r.charge > (r.skill > 0.97 ? 1.7 : 0.9)) c.drift = false;
    else c.drift = r.drift;
    if (r.drift && Math.sign(-cv) !== r.driftDir && Math.abs(cv) > 0.15) c.drift = false;
    // items
    if (r.item && !r.local) {
      r.itemT -= dt;
      if (r.itemT <= 0) {
        const ahead = this.racers.find(o => o.place === r.place - 1 && !o.elim);
        const behind = this.racers.find(o => o.place === r.place + 1 && !o.elim);
        let use = false;
        if (r.item === 'rocket') use = !!ahead || this.rand() < 0.02;
        else if (r.item === 'oil') use = (behind && r.prog - behind.prog < 0.03) || this.rand() < 0.01;
        else if (r.item === 'nitro' || r.item === 'nitro3') use = Math.abs(cv) < 0.1;
        else use = true;
        if (use) this.useItem(r); r.itemT = 0.4 + this.rand() * 1.2;
      }
    }
  }
  // ---------- items ----------
  _interact(r, dt) {
    const t = this.track;
    for (const b of this.boxes) {
      if (!b.on) continue;
      if (Math.abs(b.x - r.x) < 2.4 && Math.abs(b.z - r.z) < 2.4 && Math.abs(b.y - r.y - 1) < 3) {
        b.on = false; b.t = 3;
        this._burst(b.x, b.y, b.z, 18);
        if (r.local) { Sfx.play('box'); this.stats.box++; }
        if (!r.item && r.rolling <= 0) this._roll(r);
      }
    }
    for (const p of this.pads) {
      if (r.padCd > 0) continue;
      const al = t.along(p.i, r.x, r.z), lt = t.lateral(p.i, r.x, r.z);
      if (Math.abs(al) < 3.2 && Math.abs(lt - p.lat) < 2.4) { r.boost = Math.max(r.boost, 1.0); r.padCd = 1; if (r.local) { Sfx.play('boost'); this.stats.pad++; } }
    }
    for (const s of this.slicks) {
      if (s.dead || r.torp > 0 || (s.owner === r.id && s.age < 0.6)) continue;
      if (Math.hypot(s.x - r.x, s.z - r.z) < 2.3) { s.dead = true; this.hit(r, 'oil', s.owner); this.sendFx({ t: 'x', sid: s.id }); }
    }
    if (r.shield > 0) r.shield -= dt;
    // trail particles
    this._trails(r, dt);
  }
  _roll(r) {
    const n = this.racers.filter(o => !o.elim).length;
    const posFrac = n > 1 ? (r.place - 1) / (n - 1) : 0;
    const it = rollItem(this.rand, posFrac, n >= 4 && r.place > n - 3);
    if (r.local) {
      r.rolling = 1.3; r.item = null; r._rollTo = it;
      const box = this.h.item.parentElement; box.classList.add('rolling'); const icons = Object.values(ITEMS).map(i => i.icon); let k = 0;
      const tick = setInterval(() => { this.h.item.textContent = icons[k++ % icons.length]; Sfx.play('tick'); }, 80);
      setTimeout(() => { clearInterval(tick); box.classList.remove('rolling'); r.rolling = 0; r.item = r._rollTo; r.itemN = r.item === 'nitro3' ? 3 : 1; this.setItemUI(); Sfx.play('got'); }, 1300);
    } else { r.item = it; r.itemN = it === 'nitro3' ? 3 : 1; r.itemT = 0.8 + this.rand() * 2.5; }
  }
  useItem(r) {
    if (!r.item || r.rolling > 0 || r.spin > 0) return;
    const it = r.item;
    if (r.local) this.stats.itemuse++;
    if (it === 'torpedo') { r.torp = 6.5; r.torpLane = r.lat; r.spin = 0; r.boost = 0; if (r.local || this._near(r)) { Sfx.play('boost'); Sfx.play('rocket'); } if (r.local) this.msg('', 'TORPEDO!', 1.2); }
    else if (it === 'nitro' || it === 'nitro3') { r.boost = Math.max(r.boost, 1.3); if (r.local) Sfx.play('boost'); }
    else if (it === 'shield') { r.shield = 8; if (r.local) Sfx.play('shield'); }
    else if (it === 'rocket') {
      const ahead = this.racers.filter(o => !o.elim && !o.finished && o.prog > r.prog).sort((a, b) => a.prog - b.prog)[0];
      const fx = { t: 'r', id: r.id + ':' + Math.round(this.raceTime * 100) + ':' + (Math.random() * 1e4 | 0), owner: r.id, tgt: ahead ? ahead.id : null, idx: r.idx, lat: r.lat, y: r.y };
      this._spawnRocket(fx); this.sendFx(fx);
      if (r.local || this._near(r)) Sfx.play('rocket');
    } else if (it === 'oil') {
      const fx = { t: 'o', id: r.id + ':' + Math.round(this.raceTime * 100), owner: r.id, x: +(r.x - Math.sin(r.yaw) * 3.2).toFixed(2), z: +(r.z - Math.cos(r.yaw) * 3.2).toFixed(2), y: +r.y.toFixed(2) };
      this._spawnSlick(fx); this.sendFx(fx);
    } else if (it === 'surge') {
      const fx = { t: 's', owner: r.id, id: r.id + ':s' + Math.round(this.raceTime * 100), prog: r.prog };
      this._surge(fx); this.sendFx(fx);
    }
    if (it === 'nitro3' && --r.itemN > 0) { } else { r.item = null; r.itemN = 0; }
    if (r.local) this.setItemUI();
  }
  _near(r) { return this.me && Math.hypot(this.me.x - r.x, this.me.z - r.z) < 60; }
  sendFx(fx) { if (this.net) this.net.sendFx(fx); }
  onFx(fx) { // from network
    if (!fx || this.fxSeen.has(fx.id)) return; this.fxSeen.add(fx.id);
    if (fx.t === 'r') this._spawnRocket(fx);
    else if (fx.t === 'o') this._spawnSlick(fx);
    else if (fx.t === 'x') { const s = this.slicks.find(s => s.id === fx.sid); if (s) s.dead = true; }
    else if (fx.t === 's') this._surge(fx);
    else if (fx.t === 'h') { if (this.me && fx.by === this.me.id && fx.k === 'r') this.stats.rockethit++; }
    else if (fx.t === 'k') { this._eliminate(this.byId[fx.who]); }
  }
  _spawnRocket(fx) {
    this.fxSeen.add(fx.id);
    const m = this.R.mesh(this.props.rocket); this.scene.meshes.push(m);
    const p = this.track.point(fx.idx, fx.lat);
    this.proj.push({ id: fx.id, owner: fx.owner, tgt: fx.tgt, fi: fx.idx + 3, lat: fx.lat, x: p[0], y: fx.y + 0.9, z: p[2], yaw: this.track.heading(fx.idx), life: 9, m });
  }
  _spawnSlick(fx) {
    this.fxSeen.add(fx.id);
    const m = this.R.mesh(this.props.oil); M4.trs(fx.x, fx.y + 0.1, fx.z, Math.random() * 6, 0, 0, 1, m.m); this.scene.meshes.push(m);
    this.slicks.push({ id: fx.id, owner: fx.owner, x: fx.x, y: fx.y, z: fx.z, m, age: 0 });
    if (this.slicks.length > 14) this.slicks[0].dead = true;
  }
  _surge(fx) {
    this.fxSeen.add(fx.id); Sfx.play('surge'); this.flash = 0.6;
    for (const r of this.racers) {
      if (r.id === fx.owner || r.elim || r.finished || r.prog <= fx.prog) continue;
      if (r.local || (r.bot && this.host)) { if (r.shield > 0) { r.shield = 0; Sfx.play('pop'); } else if (!(r.torp > 0)) { this.spinOut(r, 0.7, 1); r.slow = 2.2; r.boost = 0; } }
      this._burst(r.x, r.y + 2, r.z, 12, [0.6, 0.8, 1]);
    }
  }
  spinOut(r, dur, turns) { r.spin = dur; r.spinDur = dur; r.spinTurns = turns || 1; r.spinAng = 0; }
  hit(r, kind, by) {
    if (r.torp > 0) return false;
    if (r.shield > 0) { r.shield = 0; if (r.local || this._near(r)) Sfx.play('pop'); this._burst(r.x, r.y + 1, r.z, 14, [0.4, 0.9, 1]); return false; }
    this.spinOut(r, kind === 'rocket' ? 1.25 : 0.95, kind === 'rocket' ? 2 : 1); r.boost = 0; r.drift = false; r.charge = 0;
    if (kind === 'rocket') { r.vx *= 0.3; r.vz *= 0.3; }
    if (r.local) { Sfx.play('hit'); this.shake = 0.5; }
    if (by && by !== r.id) { if (this.me && by === this.me.id && kind === 'rocket') this.stats.rockethit++; else this.sendFx({ t: 'h', id: 'h' + Math.random(), by, k: kind[0] }); }
    return true;
  }
  _projectiles(dt) {
    const t = this.track;
    for (const p of this.proj) {
      if (p.dead) continue;
      p.life -= dt; if (p.life <= 0) { p.dead = true; continue; }
      const tgt = p.tgt ? this.byId[p.tgt] : null;
      const spd = 82;
      if (tgt && !tgt.elim && Math.hypot(tgt.x - p.x, tgt.z - p.z) < 26) {
        const a = Math.atan2(tgt.x - p.x, tgt.z - p.z); p.yaw = a; p.x += Math.sin(a) * spd * dt; p.z += Math.cos(a) * spd * dt; p.y = lerp(p.y, tgt.y + 0.9, 0.2);
        p.fi = t.nearest(p.x, p.z, Math.round(p.fi), 20);
      } else {
        p.fi += spd * dt / t.step; if (tgt) p.lat = lerp(p.lat, tgt.lat, 0.04);
        const q = t.point(p.fi, p.lat); const ny = q[1] + 0.9; p.yaw = Math.atan2(q[0] - p.x, q[2] - p.z) || p.yaw; p.x = q[0]; p.z = q[2]; p.y = lerp(p.y, ny, 0.3);
      }
      M4.trs(p.x, p.y, p.z, p.yaw, 0, this.t * 8, 1.2, p.m.m);
      this.fxN.emit(p.x - Math.sin(p.yaw) * 0.8, p.y, p.z - Math.cos(p.yaw) * 0.8, 0, 1, 0, [0.85, 0.85, 0.9, 0.6], 1.2, 0.6, 3);
      this.fxAdd.emit(p.x - Math.sin(p.yaw) * 0.8, p.y, p.z - Math.cos(p.yaw) * 0.8, 0, 0, 0, [1, 0.6, 0.15, 1], 1.2, 0.15);
      // collisions
      for (const r of this.racers) {
        if (r.elim || r.id === p.owner || r.finished) continue;
        if (p.tgt && r.id !== p.tgt && p.life > 8.6) continue;
        if (Math.hypot(r.x - p.x, r.z - p.z) < 2.3) {
          p.dead = true; this._burst(p.x, p.y, p.z, 26, [1, 0.6, 0.2]); if (this._near(r)) Sfx.play('boom');
          if (r.local || (r.bot && this.host)) this.hit(r, 'rocket', p.owner);
          break;
        }
      }
    }
    for (const p of this.proj) if (p.dead && p.m) { p.m.visible = false; this.scene.meshes.splice(this.scene.meshes.indexOf(p.m), 1); p.m = null; }
    this.proj = this.proj.filter(p => !p.dead);
    for (const s of this.slicks) { s.age += dt; if (s.dead && s.m) { this.scene.meshes.splice(this.scene.meshes.indexOf(s.m), 1); s.m = null; this._burst(s.x, s.y + 0.5, s.z, 8, [0.2, 0.15, 0.3]); } }
    this.slicks = this.slicks.filter(s => !s.dead);
  }
  // ---------- knockout ----------
  _knockout(dt) {
    this.koNext -= dt;
    const alive = this.racers.filter(r => !r.elim);
    if (this.koNext <= 0 && alive.length > 1) {
      this.koNext = alive.length > 4 ? 20 : 25;
      const last = alive.sort((a, b) => a.prog - b.prog)[0];
      this.sendFx({ t: 'k', id: 'k' + this.raceTime.toFixed(1), who: last.id });
      this._eliminate(last);
    }
  }
  _eliminate(r) {
    if (!r || r.elim) return;
    r.elim = true; r.elimAt = this.raceTime; this.koOrder.push(r.id);
    this._burst(r.x, r.y + 1, r.z, 40, [0.7, 0.3, 1]); Sfx.play('ko');
    const alive = this.racers.filter(o => !o.elim);
    if (r.local) { this.msg('ELIMINATED', ORD(alive.length + 1) + ' place — spectating', 3); this.myKoPlace = alive.length + 1; }
    else this.feed(r.name + ' was knocked out!');
    if (this.me && !this.me.elim && alive.length <= 3) this.stats.kotop3 = 1;
    if (alive.length === 1) { const w = alive[0]; w.finished = true; w.ftime = this.raceTime; if (w.local) { this.msg('VICTORY ROYALE!', 'Last kart standing', 0); Sfx.play('finish'); this._confetti(w); this.stats.win = 1; this.stats.podium = 1; } this.state = 'end'; this.finishWait = 0; this.stats.finish = 1; }
  }
  feed(text) {
    const el = document.createElement('div'); el.className = 'feed'; el.textContent = text; document.getElementById('hFeed').appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }
  // ---------- ranking & end ----------
  _rank() {
    const rs = this.racers.slice().sort((a, b) => {
      if (a.elim !== b.elim) return a.elim ? 1 : -1;
      if (a.elim && b.elim) return b.elimAt - a.elimAt;
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      if (a.finished) return a.ftime - b.ftime;
      return b.prog - a.prog;
    });
    rs.forEach((r, i) => r.place = i + 1);
    this.order = rs;
  }
  _checkEnd(dt) {
    if (this.resultsShown) return;
    if (this.mode === 'ko') { if (this.state === 'end' || (this.me && this.me.elim)) { this.finishWait += dt; if (this.finishWait > 4) this._results(); } return; }
    if (this.state !== 'end') return;
    this.finishWait += dt;
    const humansDone = this.racers.every(r => !r.human || r.finished || r.elim);
    if ((humansDone && this.finishWait > 5) || this.finishWait > 25) this._results();
  }
  _results() {
    this.resultsShown = true;
    // estimate unfinished
    const rows = this.order.map(r => ({ id: r.id, name: r.name, human: r.human, local: r.local, place: r.place, time: r.finished ? r.ftime : null, elim: r.elim, cos: r.cos }));
    const me = rows.find(r => r.local);
    this.app.onRaceEnd({ mode: this.mode, track: this.def.id, rows, place: me ? me.place : 8, time: this.me && this.me.finished ? this.me.ftime : null, stats: this.stats, party: this.racers.filter(r => r.human).length > 1 });
  }
  // ---------- visuals ----------
  _boxesUpdate(dt) {
    const hue = this.t * 0.6;
    for (const b of this.boxes) {
      if (!b.on) { b.t -= dt; if (b.t <= 0) b.on = true; }
      b.m.visible = b.on;
      if (b.on) { M4.trs(b.x, b.y + Math.sin(this.t * 2 + b.ph) * 0.25, b.z, this.t * 1.2 + b.ph, 0.5, 0.3, 1, b.m.m); b.m.tint = [0.75 + 0.25 * Math.sin(hue + b.ph), 0.75 + 0.25 * Math.sin(hue + 2 + b.ph), 0.75 + 0.25 * Math.sin(hue + 4 + b.ph)]; }
    }
  }
  _burst(x, y, z, n, col) {
    for (let i = 0; i < n; i++) {
      const c = col ? [col[0], col[1], col[2], 1] : [Math.random(), Math.random() * 0.5 + 0.5, Math.random(), 1];
      this.fxAdd.emit(x, y, z, (Math.random() - 0.5) * 14, Math.random() * 10, (Math.random() - 0.5) * 14, c, 0.7 + Math.random() * 0.6, 0.6 + Math.random() * 0.4, -0.4, 14);
    }
  }
  _confetti(r) { for (let i = 0; i < 120; i++) this.fxN.emit(r.x + (Math.random() - 0.5) * 6, r.y + 6 + Math.random() * 4, r.z + (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8, [Math.random(), Math.random(), Math.random(), 1], 0.6, 3, 0, 5); }
  _trails(r, dt) {
    if (r.elim) return;
    const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw), rx = -fz, rz = fx;
    const back = (s, h) => [r.x - fx * 1.3 + rx * s, r.y + (h || 0.3), r.z - fz * 1.3 + rz * s];
    const sp = Math.abs(r.f);
    // drift sparks
    if (r.drift) {
      const col = r.charge >= 2.6 ? [0.8, 0.3, 1, 1] : r.charge >= 1.6 ? [1, 0.55, 0.1, 1] : r.charge >= 0.7 ? [0.25, 0.7, 1, 1] : [1, 1, 0.8, 0.6];
      for (const s of [-0.85, 0.85]) { const p = back(s, 0.15); this.fxAdd.emit(p[0], p[1], p[2], -fx * 4 + (Math.random() - 0.5) * 6, Math.random() * 4, -fz * 4 + (Math.random() - 0.5) * 6, col, r.charge >= 0.7 ? 0.7 : 0.35, 0.25, 0, 12); }
      if (Math.random() < 0.3) { const p = back(r.driftDir * 0.85, 0.1); this.fxN.emit(p[0], p[1], p[2], 0, 1, 0, [0.8, 0.8, 0.8, 0.35], 1.2, 0.8, 2); }
    }
    if (r.torp > 0) { for (let q = 0; q < 3; q++) { const p = back((Math.random() - 0.5) * 0.8, 1.0); this.fxAdd.emit(p[0] - fx * 1.6, p[1], p[2] - fz * 1.6, -fx * 14 + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2, -fz * 14 + (Math.random() - 0.5) * 3, [1, 0.45 + Math.random() * 0.4, 0.1, 1], 1.4, 0.22, -2); } this.fxN.emit(r.x - fx * 4, r.y + 1, r.z - fz * 4, 0, 1.5, 0, [0.75, 0.75, 0.8, 0.45], 1.6, 1.0, 3); }
    if (r.boost > 0) { for (const s of [-0.3, 0.3]) { const p = back(s, 0.7); this.fxAdd.emit(p[0], p[1], p[2], -fx * 10 + (Math.random() - 0.5) * 2, Math.random(), -fz * 10 + (Math.random() - 0.5) * 2, [1, 0.5 + Math.random() * 0.4, 0.15, 1], 0.75, 0.16, -1.5); } }
    if (Math.abs(r.lat) > this.track.half + 1.4 && sp > 8 && Math.random() < 0.5) { const p = back((Math.random() - 0.5) * 1.6, 0.2); const gc = hexc(this.track.theme.ground2); this.fxN.emit(p[0], p[1], p[2], (Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3, [gc[0], gc[1], gc[2], 0.7], 0.9, 0.6, 1, 6); }
    // cosmetic trail
    const k = (CAT[r.cos.trail] || CAT.t_none).kind; if (k === 'none' || sp < 6) return;
    r.trailT -= dt; if (r.trailT > 0) return; r.trailT = this.quality === 'low' ? 0.05 : 0.025;
    const p = back((Math.random() - 0.5) * 1.2, 0.5);
    if (k === 'smoke') this.fxN.emit(p[0], p[1], p[2], 0, 1.2, 0, [0.6, 0.6, 0.62, 0.5], 1.2, 1.1, 2.5);
    else if (k === 'fire') this.fxAdd.emit(p[0], p[1], p[2], 0, 2, 0, [1, 0.35 + Math.random() * 0.4, 0.1, 1], 1.1, 0.5, -1.5);
    else if (k === 'rainbow') { const h = (this.t * 2) % 1; const c = hsl(h); for (const s of [-0.6, 0, 0.6]) { const q = back(s, 0.4); this.fxAdd.emit(q[0], q[1], q[2], 0, 0, 0, [c[0], c[1], c[2], 0.9], 1.0, 1.2); } }
    else if (k === 'sparkle') this.fxAdd.emit(p[0] + (Math.random() - 0.5), p[1] + Math.random(), p[2], (Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2, [1, 0.9, 0.4 + Math.random() * 0.6, 1], 0.5, 0.9, -0.3);
    else if (k === 'bubbles') this.fxN.emit(p[0], p[1], p[2], (Math.random() - 0.5), 2, (Math.random() - 0.5), [0.6, 0.9, 1, 0.55], 0.6 + Math.random() * 0.5, 1.4, 0.3);
    else if (k === 'ice') { this.fxAdd.emit(p[0], p[1], p[2], (Math.random() - 0.5) * 2, 0.5, (Math.random() - 0.5) * 2, [0.6, 0.9, 1, 1], 0.6, 1.0, 0, 2); }
  }
  _fxUpdate(dt) {
    this.fxAdd.update(dt); this.fxN.update(dt);
    for (const r of this.racers) {
      const a = r.elim ? 0 : 1;
      r.visYaw = r.yaw + (r.drift ? r.driftDir * -(0.3 + 0.1 * (r.driftK || 0)) : 0) + (r.spin > 0 ? (r.spinAng || 0) : 0);
      const vy = r.visYaw;
      const flash = r.spin > 0 && Math.floor(this.t * 12) % 2 === 0;
      r.view.update(r.x, r.y, r.z, vy, r.pitch, r.roll, r.steer, r.f, dt, { hop: r.hop * 0.6, shield: r.shield > 0, alpha: a, flash, torp: r.torp > 0 });
      if (r.remote || r.bot) this._trailsRemoteOnly(r, dt);
    }
  }
  _trailsRemoteOnly(r, dt) { if (r.remote || (r.bot && !this.host)) this._trails(r, dt); }
  _camera(dt, ctl) {
    const c = this.cam;
    let r = this.me;
    if (!r || r.elim) { const alive = this.order.filter(o => !o.elim); r = alive[0] || this.me; this.spectate = r; } else this.spectate = null;
    if (!r) return;
    if (this.state === 'intro') {
      const a = this.t * 0.6 + r.yaw + 2.2, d = 18 - this.t * 3;
      c.x = r.x + Math.sin(a) * d; c.z = r.z + Math.cos(a) * d; c.y = r.y + 5 + this.introT * 2; c.tx = r.x; c.ty = r.y + 1; c.tz = r.z; c.fov = 1.1;
      this.camYaw = r.yaw;
    } else {
      this.camYaw += angDiff(this.camYaw, r.yaw + (r.drift ? -r.driftDir * 0.18 : 0)) * (1 - Math.exp(-6 * dt));
      const back = ctl.look && this.me === r ? -7.5 : 7.5;
      const fx = Math.sin(this.camYaw), fz = Math.cos(this.camYaw);
      const tx = r.x - fx * back, tz = r.z - fz * back; const ty = Math.max(r.y + 3.1, this.track.groundHeight(tx, tz) + 1.5);
      const k = 1 - Math.exp(-10 * dt);
      c.x = lerp(c.x, tx, k); c.z = lerp(c.z, tz, k); c.y = lerp(c.y, ty, k);
      if (Math.hypot(c.x - tx, c.z - tz) > 30) { c.x = tx; c.z = tz; c.y = ty; }
      c.tx = r.x + fx * (back > 0 ? 4 : -4); c.ty = r.y + 1.3; c.tz = r.z + fz * (back > 0 ? 4 : -4);
      const tf = 1.15 + (r.boost > 0 ? 0.18 : 0) + clamp(r.f / 50, 0, 1) * 0.1;
      c.fov = lerp(c.fov, tf, 1 - Math.exp(-4 * dt));
    }
    if (this.shake > 0) { this.shake -= dt; const s = this.shake * 0.6; c.x += (Math.random() - 0.5) * s; c.y += (Math.random() - 0.5) * s; }
    M4.trs(c.x, 0, c.z, 0, 0, 0, 1, this.track.skyMesh.m);
  }
  _hudUpdate(dt) {
    const r = this.me, h = this.h; if (!r) return;
    const n = this.racers.filter(o => !o.elim).length;
    const pl = r.elim ? (this.myKoPlace || r.place) : r.place;
    h.pos.innerHTML = `${pl}<sup>${ORD(pl).slice(-2)}</sup>`;
    h.pos.className = 'pos p' + Math.min(pl, 4);
    h.lap.textContent = `${clamp(r.lap, 1, this.laps)}/${this.laps}`;
    h.time.textContent = fmtTime(r.finished ? r.ftime : this.raceTime);
    h.spd.textContent = Math.round(Math.abs(r.f) * 2);
    h.boostBar.className = 'drift ' + (r.drift ? (r.charge >= 2.6 ? 'l3' : r.charge >= 1.6 ? 'l2' : r.charge >= 0.7 ? 'l1' : 'l0') : '');
    if (this.mode === 'ko') h.ko.innerHTML = `<b>${n}</b> LEFT · next knockout <b>${Math.max(0, Math.ceil(this.koNext))}s</b>`;
    // minimap
    const ctx = this.mapCtx, mm = this.track.minimap; ctx.clearRect(0, 0, 150, 150); ctx.drawImage(mm.img, 0, 0);
    for (const o of this.racers) { if (o.elim) continue; const p = mm.map(o.x, o.z); ctx.beginPath(); ctx.arc(p[0], p[1], o.local ? 5 : 3.5, 0, 7); ctx.fillStyle = o.local ? '#ffe14a' : o.human ? '#2bf0ff' : '#ff5a5a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#000'; ctx.stroke(); }
    for (const p of this.proj) { const q = mm.map(p.x, p.z); ctx.fillStyle = '#ff8a1c'; ctx.fillRect(q[0] - 2, q[1] - 2, 4, 4); }
    // name tags
    for (const o of this.racers) {
      if (!o.tag) continue;
      const p = o.elim ? null : this.R.project(o.x, o.y + 2.6, o.z);
      if (!p || p.d > 90) { o.tag.style.display = 'none'; continue; }
      o.tag.style.display = ''; o.tag.style.transform = `translate(${p.x | 0}px,${p.y | 0}px) translate(-50%,-100%) scale(${clamp(30 / p.d, 0.55, 1).toFixed(2)})`;
    }
    // standings list (top-left mini)
    if (!this._lt || this.t - this._lt > 0.25) {
      this._lt = this.t;
      h.list.innerHTML = this.order.slice(0, 8).map(o => `<div class="${o.local ? 'me' : ''} ${o.elim ? 'out' : ''}"><span>${o.place}</span>${esc(o.name)}</div>`).join('');
    }
    if (this.spectate) h.sub.textContent = h.sub.textContent || '';
    if (this.flash > 0) { this.flash -= dt; document.getElementById('flash').style.opacity = this.flash; }
  }
  render() { this.R.render(this.scene, this.cam); }
  dispose() {
    for (const m of this.scene.meshes) { /* geometry for karts is cached/shared; free track meshes */ }
    for (const m of this.track.meshes) this.R.free(m.g);
    Sfx.engine(false);
    this.h.root.classList.add('hidden');
  }
}
function fmtTime(t) { if (t == null) return '--:--.--'; const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`; }
function hsl(h) { const f = n => { const k = (n + h * 12) % 12; return 0.5 - 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0), f(8), f(4)]; }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
