// Turbo Royale — race simulation, bots, items, HUD
'use strict';
const ORD = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');

class Racer {
  constructor(o, race) {
    Object.assign(this, { id: o.id, name: o.name, type: o.type, cos: Object.assign({}, DEFAULT_EQUIP, o.cos || {}), human: o.type !== 'bot' });
    this.local = o.type === 'local'; this.bot = o.type === 'bot'; this.remote = o.type === 'remote';
    const ks = kartStats(this.cos); this.stats = ks.s; this.offroadOK = ks.offroad; const eng = CAT[this.cos.engine]; this.flameCol = eng && eng.flame ? hexc(eng.flame) : null;
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
    this._boxes(); this._pads(); this._features();
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
  _features() {
    const t = this.track, R = this.R, T = t.theme, props = this.props;
    // shortcut barriers
    this.gates = (t.gates || []).map((g0, k) => {
      const b = g0.b, p = b.point(g0.si, 0), yaw = b.heading(g0.si); const g = new Geo(); g.push(M4.trs(p[0], p[1], p[2], yaw, 0, 0));
      const th = t.def.theme, n = Math.max(3, Math.round(b.half * 2 / 2.2));
      for (let q = 0; q < n; q++) { const x = -b.half + (q + 0.5) * (b.half * 2 / n);
        if (th === 'meadow') { g.cyl(1.0, 2.0, 10, hexc(0xe8c04a), 'x', x, 1.0, 0, hexc(0xd8a83a)); g.cyl(1.0, 0.1, 10, hexc(0xa0702a), 'x', x - 0.5, 1.0, 0); }
        else if (th === 'snow') { g.box(2.0, 2.4, 1.2, hexc(0xbfe8ff, 0.35), x, 1.2, 0); }
        else if (th === 'neon') { g.box(2.0, 3.0, 0.2, hexc(0xff2bd6, 1), x, 1.5, 0); }
        else { g.box(1.9, 1.9, 1.6, hexc(0xb07a40), x, 0.95, 0); g.box(1.95, 0.25, 1.65, hexc(0x7a4f2a), x, 1.5, 0); g.box(1.95, 0.25, 1.65, hexc(0x7a4f2a), x, 0.4, 0); }
      }
      g.box(b.half * 2, 0.5, 0.5, hexc(0xffd23a, 0.6), 0, (th === 'neon' ? 3.2 : 2.6), 0);
      g.pop();
      const m = R.mesh(R.upload(g), th === 'neon' ? { alpha: 0.75, blend: 'add', twoSided: true } : {}); this.scene.meshes.push(m);
      return { k, b, si: g0.si, open: 0, dmg: 0, m, x: p[0], y: p[1], z: p[2] };
    });
    // explosive barrels
    const bg = new Geo(); bg.cyl(0.8, 1.6, 10, hexc(0xd8322a), 'y', 0, 0.8, 0, hexc(0x9a1f18)); bg.cyl(0.82, 0.25, 10, hexc(0xffd23a, 0.3), 'y', 0, 1.1, 0); bg.cyl(0.82, 0.12, 10, hexc(0x1d1d22), 'y', 0, 0.45, 0);
    const bgeo = R.upload(bg);
    this.barrels = (t.barrels || []).map(b0 => { const m = R.mesh(bgeo); M4.trs(b0.x, b0.y, b0.z, 0, 0, 0, 1, m.m); this.scene.meshes.push(m); return Object.assign({}, b0, { on: true, t: 0, m }); });
    // rolling hazards
    const rg = new Geo(), th = t.def.theme;
    if (th === 'meadow') { rg.cyl(1.4, 2.4, 12, hexc(0xe8c04a), 'x', 0, 0, 0, hexc(0xc89a3a)); rg.cyl(1.42, 0.15, 12, hexc(0xa0702a), 'x', 0.6, 0, 0); rg.cyl(1.42, 0.15, 12, hexc(0xa0702a), 'x', -0.6, 0, 0); }
    else if (th === 'desert') { rg.sphere(1.6, 8, 6, hexc(0xa8744a), 0, 0, 0); rg.sphere(0.8, 6, 4, hexc(0x8a5f36), 0.9, 0.6, 0.4); }
    else if (th === 'snow') { rg.sphere(1.7, 10, 7, hexc(0xf4f8ff, 0.1), 0, 0, 0); }
    else { rg.box(2.4, 0.6, 2.4, hexc(0x2a2350), 0, 0, 0); rg.cyl(1.5, 0.15, 14, hexc(0xff2bd6, 1), 'y', 0, -0.2, 0); rg.sphere(0.4, 6, 4, hexc(0xff3030, 1), 0, 0.4, 1.0); }
    const rgeo = R.upload(rg);
    this.patrols = (t.patrols || []).map(p0 => { const m = R.mesh(rgeo); this.scene.meshes.push(m); return Object.assign({}, p0, { m, x: 0, y: 0, z: 0 }); });
    this.ramps = t.ramps || [];
    // extra boxes on jump routes
    for (const eb of t.extraBoxes || []) for (const lat of [-3, 3]) { const p = eb.b.point(eb.si, lat); const m = R.mesh(props.box, { tex: this.tex.box, alpha: 0.9, emis: 0.25 }); this.scene.meshes.push(m); if (this.items) this.boxes.push({ x: p[0], y: p[1] + 1.3, z: p[2], on: true, t: 0, m, ph: Math.random() * 6 }); else m.visible = false; }
    // decoy box mesh
    this.decoyGeo = props.box;
  }
  _pads() {
    this.pads = []; if (this.mode === 'tt' && false) return;
    const t = this.track; const g = new Geo();
    for (const ep of t.extraPads || []) { const P = ep.b, i = ep.i; const A = (o, dz) => [P.px[i] - P.tz[i] * o + P.tx[i] * dz, P.py[i] + 0.1, P.pz[i] + P.tx[i] * o + P.tz[i] * dz]; g.quad(A(-2.2, -3), A(2.2, -3), A(2.2, 3), A(-2.2, 3), hexc(0xffffff, 0.8), [[0, 1], [1, 1], [1, 0], [0, 0]]); this.pads.push({ seg: P, i, lat: 0 }); }
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
    this.h.itemN.textContent = r.item === 'nitro3' ? '×' + r.itemN : r.item === 'gold' && r.goldT > 0 ? Math.ceil(r.goldT) + 's' : '';
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
      this._hazards(dt);
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
    const S = r.seg || t, surf = r.seg ? r.seg.type : 'road';
    const offroad = Math.abs(r.lat) > S.half + 1.4 || surf === 'dirt';
    const air = r.airY > 0.05 || r.vy > 0;
    if (r.slow > 0) { r.slow -= dt; maxF *= 0.65; }
    if (offroad && r.boost <= 0 && !r.out && !air) maxF *= surf === 'dirt' && Math.abs(r.lat) <= S.half + 1.4 ? (r.offroadOK ? 1 : 0.8) : (r.offroadOK ? 0.78 : 0.5);
    if (surf === 'ice') maxF *= 1.03;
    if (r.goldT > 0) r.goldT -= dt;
    if (r.slipCd > 0) r.slipCd -= dt;
    if (r.padCd > 0) r.padCd -= dt;
    r.hop = Math.max(0, r.hop - dt * 2.5);
    if (!racing) { f *= 1 - 3 * dt; lat *= 1 - 5 * dt; }
    else if (r.torp > 0) {
      // Torpedo: auto-pilot down the middle of the track at huge speed
      r.torp -= dt; r.spin = 0; r.drift = false; r.charge = 0; r.spinAng = 0;
      r.torpLane = lerp(r.torpLane || 0, 0, 1 - Math.exp(-0.8 * dt)); const pt = this._ahead(r, 16, r.torpLane);
      r.yaw += angDiff(r.yaw, Math.atan2(pt[0] - r.x, pt[2] - r.z)) * (1 - Math.exp(-7 * dt));
      f = lerp(f, 72, 1 - Math.exp(-2.5 * dt)); lat *= 1 - 8 * dt; r.steer = 0;
      if (r.torp <= 0) { r.torp = 0; r.boost = Math.max(r.boost, 0.7); this._burst(r.x, r.y + 1, r.z, 24, [1, 0.8, 0.3]); if (r.local) Sfx.play('pop'); }
    }
    else if (r.spin > 0) {
      // the kart body spins as an animation, while its real heading is steered back to face down the track
      r.spin -= dt; f *= 1 - 2.2 * dt; lat *= 1 - 4 * dt; r.drift = false; r.charge = 0;
      const th = S.heading(r.seg ? r.sIdx : r.idx); r.yaw += angDiff(r.yaw, th) * (1 - Math.exp(-5 * dt));
      const dur = r.spinDur || 1; r.spinAng = (1 - Math.max(0, r.spin) / dur) * Math.PI * 2 * (r.spinTurns || 1);
      if (r.spin <= 0) { r.spin = 0; r.spinAng = 0; r.yaw = th + angDiff(th, r.yaw) * 0.3; }
    } else {
      if (r.boost > 0) { r.boost -= dt; const bm = maxF * 1.42; f = Math.min(f + 70 * dt, bm); }
      else if (c.gas > 0) { if (f < maxF) f += acc * c.gas * dt * (1 - 0.65 * f / maxF); else f -= (f - maxF) * 1.8 * dt; }
      else if (!c.brake) f *= 1 - 0.55 * dt;
      if (c.brake) { if (f > 0.5) f -= 38 * dt; else f = Math.max(f - 14 * dt, -11); }
      if (!c.gas && !c.brake && Math.abs(f) < 0.3) f = 0;
      // drift
      if (air && c.drift && !r._dPrev && !r.trick) { r.trick = true; r.trickT = 0.45; if (r.local) Sfx.play('tick'); }
      if (c.drift && !r.drift && Math.abs(c.steer) > 0.25 && f > 14 && (!offroad || surf === 'dirt') && !air) { r.drift = true; r.driftDir = Math.sign(c.steer); r.charge = 0; r.hop = 0.35; r.driftK = 0; }
      if (r.drift && (!c.drift || f < 9)) {
        if (f >= 9 && r.charge >= 0.7) {
          const lvl = r.charge >= 2.6 ? 3 : r.charge >= 1.6 ? 2 : 1; r.boost = Math.max(r.boost, [0, 0.55, 1.0, 1.6][lvl] * st[3]);
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
      if (air) turn *= 0.35; if (surf === 'ice') turn *= 0.85;
      r.yaw -= turn * sf * dt;
      r.steer = lerp(r.steer, c.steer, 0.3);
    }
    r._dPrev = c.drift;
    lat *= Math.exp(-(air ? 0.5 : surf === 'ice' ? (r.drift ? 1.6 : 2.6) : r.drift ? 3.6 : r.spin > 0 ? 3 : 9) * dt);
    const nfx = Math.sin(r.yaw), nfz = Math.cos(r.yaw);
    r.vx = nfx * f + -nfz * lat; r.vz = nfz * f + nfx * lat; r.f = f;
    r.x += r.vx * dt; r.z += r.vz * dt;
    // track constraints (main road + branches)
    const pi = r.idx, psi = r.sIdx, pseg = r.seg;
    this._locate(r);
    this._constrain(r);
    if (r.seg && r.seg === pseg) this._gateCheck(r, psi);
    const S2 = r.seg || t, si = r.seg ? r.sIdx : r.idx;
    let gy = S2.heightAt(si, r.x, r.z);
    // ramps
    r.rampY = 0;
    for (const rp of this.ramps) {
      if (r.seg !== rp.b) continue;
      const al = rp.b.along(rp.si, r.x, r.z), lt = rp.b.lateral(rp.si, r.x, r.z);
      if (Math.abs(lt) < rp.b.half && al > -2.25 && al < 2.25 && !(r.airY > 0.05)) r.rampY = (al + 2.25) / 4.5 * 1.3;
      if (Math.abs(lt) < rp.b.half && (r._rampAl !== undefined && r._rampAl < 2.25 && al >= 2.25) && r.f > 10 && !(r.airY > 0.05)) { r.airY = 1.3; r.vy = 6 + r.f * 0.11; if (r.local) Sfx.play('boost'); }
      r._rampAl = al;
    }
    if (r.airY > 0 || r.vy > 0) {
      r.vy -= 25 * dt; r.airY += r.vy * dt;
      if (r.airY <= 0) { r.airY = 0; r.vy = 0; if (r.trick) { r.boost = Math.max(r.boost, 0.85 * st[3]); if (r.local) { Sfx.play('mini', 2); this.msg('', 'TRICK BOOST!', 0.9); } } r.trick = false; this._burst(r.x, r.y, r.z, 8, [0.9, 0.9, 0.9]); }
    }
    if (r.trickT > 0) r.trickT -= dt;
    r.y = lerp(r.y, gy, 0.5);
    r.visAir = Math.max(r.airY || 0, r.rampY || 0);
    const hd = S2.heading(si);
    const slope = S2.ty[si] * Math.cos(r.yaw - hd);
    r.pitch = lerp(r.pitch, (r.airY > 0.05 ? clamp(-r.vy * 0.03, -0.3, 0.3) : r.rampY > 0 ? -0.28 : -Math.atan(slope)), 0.2);
    const sideSlope = S2.ty[si] * Math.sin(r.yaw - hd);
    r.roll = lerp(r.roll, Math.atan(sideSlope) * 0.5 + (r.drift ? -r.driftDir * 0.08 : 0), 0.2);
    this._lapLogic(r, pi);
  }
  _locate(r) {
    const t = this.track;
    r.mIdx = t.nearest(r.x, r.z, r.seg ? r.seg.mapIdx(r.sIdx) : (r.mIdx != null ? r.mIdx : r.idx), r.seg ? 45 : 20);
    const latM = t.lateral(r.mIdx, r.x, r.z);
    if (r.seg) {
      const b = r.seg; r.sIdx = b.nearest(r.x, r.z, r.sIdx, 14); const lb = b.lateral(r.sIdx, r.x, r.z);
      const past = (r.sIdx >= b.N - 1 && b.along(b.N - 1, r.x, r.z) > 0) || (r.sIdx <= 0 && b.along(0, r.x, r.z) < 0);
      if (past || (Math.abs(lb) > b.half + 1.5 && Math.abs(latM) < t.half + 1)) r.seg = null; else r.latB = lb;
    }
    if (!r.seg && t.branches) for (const b of t.branches) {
      if (!b.near(r.mIdx, 8)) continue;
      const si = b.nearest(r.x, r.z); if (si >= b.N - 3) continue;
      const lb = b.lateral(si, r.x, r.z), al = b.along(si, r.x, r.z);
      if (si === 0 && al < 0) continue;
      if (Math.abs(lb) < b.half + 0.5 && (latM * b.side > 1.5 || Math.abs(latM) > t.half - 1 || Math.abs(latM) > Math.abs(lb) + 2.5)) { r.seg = b; r.sIdx = si; r.latB = lb; break; }
    }
    r.latM = latM;
    if (r.seg) { r.idx = r.seg.mapIdx(r.sIdx); r.lat = r.latB; } else { r.idx = r.mIdx; r.lat = latM; }
  }
  _constrain(r) {
    const t = this.track;
    const cands = [[t, r.mIdx, r.latM]];
    if (t.branches) for (const b of t.branches) {
      if (!b.near(r.mIdx, 12) && b !== r.seg) continue;
      const si = b === r.seg ? r.sIdx : b.nearest(r.x, r.z); const al = b.along(si, r.x, r.z);
      if ((si === 0 && al < 0) || (si === b.N - 1 && al > 0)) continue;
      cands.push([b, si, b.lateral(si, r.x, r.z)]);
    }
    let best = null, bex = 1e9;
    for (const c of cands) { const ex = Math.abs(c[2]) - (c[0].wallD - 1.1); if (ex <= 0) return; if (ex < bex) { bex = ex; best = c; } }
    const [P, i, lt] = best; const lim = P.wallD - 1.1;
    const sgn = Math.sign(lt), ex = -P.tz[i], ez = P.tx[i];
    r.x -= ex * (Math.abs(lt) - lim) * sgn; r.z -= ez * (Math.abs(lt) - lim) * sgn;
    if (P === (r.seg || t)) r.lat = lim * sgn;
    const vn = r.vx * ex + r.vz * ez;
    if (vn * sgn > 0) { r.vx -= ex * vn * 1.4; r.vz -= ez * vn * 1.4; r.vx *= 0.88; r.vz *= 0.88; const th = P.heading(i); const fwdOk = Math.cos(r.yaw - th) > -0.3; r.yaw += angDiff(r.yaw, fwdOk ? th : th + Math.PI) * 0.12; if (r.local && Math.abs(vn) > 6) { Sfx.play('bump'); this.shake = 0.3; } }
  }
  _gateCheck(r, psi) {
    for (const g of this.gates) {
      if (g.b !== r.seg || g.open > 0) continue;
      const fwdCross = psi < g.si - 1 && r.sIdx >= g.si - 1, backCross = psi > g.si + 1 && r.sIdx <= g.si + 1;
      if (!fwdCross && !backCross) continue;
      if (r.boost > 0 || r.torp > 0 || r.goldT > 0 || Math.abs(r.f) > 44) { this.openGate(g, true); r.vx *= 0.85; r.vz *= 0.85; if (r.local) this.msg('', 'SMASHED IT!', 1); continue; }
      // bounce off
      const p = g.b.point(fwdCross ? g.si - 2.5 : g.si + 2.5, clamp(r.latB || 0, -g.b.half + 1, g.b.half - 1)); r.x = p[0]; r.z = p[2]; r.sIdx = g.b.nearest(r.x, r.z, r.sIdx, 6);
      const sp = Math.hypot(r.vx, r.vz); r.vx *= -0.3; r.vz *= -0.3;
      g.dmg += sp > 7 ? 1 : 0; this._burst(g.x, g.y + 1.5, g.z, 10, [0.9, 0.7, 0.4]);
      if (g.dmg >= 3) this.openGate(g, true);
      else if (r.local) { Sfx.play('bump'); this.shake = 0.4; this.msg('', 'BOOST INTO IT TO BREAK IT!', 1.6); }
    }
  }
  openGate(g, send) {
    if (g.open > 0) return;
    g.open = 28; g.dmg = 0; g.m.visible = false;
    this._burst(g.x, g.y + 1.5, g.z, 40, [1, 0.75, 0.35]); if (this._near({ x: g.x, z: g.z })) Sfx.play('boom');
    if (send) this.sendFx({ t: 'g', id: 'g' + g.k + ':' + Math.round(this.raceTime * 10), gi: g.k });
    if (this.me && Math.hypot(this.me.x - g.x, this.me.z - g.z) < 120) this.feed('The shortcut barrier is open!');
  }
  // a point `look` samples ahead along the kart's current path
  _ahead(r, look, lane) {
    const t = this.track;
    if (r.seg) { const b = r.seg, k = r.sIdx + look; if (k <= b.N - 1) return b.point(k, lane); const extra = k - (b.N - 1); return t.point(t.wrap(b.i1 + Math.round(extra * b.step / t.step)), lane * 0.5 + b.side * (t.half - b.half + 0.5) * Math.max(0, 1 - extra / 12)); }
    return t.point(t.wrap(r.idx + look), lane);
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
    this._locate(r); const S = r.seg || this.track, si = r.seg ? r.sIdx : r.idx;
    r.y = lerp(r.y, S.heightAt(si, r.x, r.z), 0.5); r.visAir = n.ay || 0; r.trickT = n.tk ? 0.2 : 0;
    r.pitch = lerp(r.pitch, -Math.atan(S.ty[si] * Math.cos(r.yaw - S.heading(si))), 0.2);
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
    // choose shortcuts / jump routes
    r.plan = r.plan || {}; let forceLane = null;
    if (!r.seg && t.branches) for (const b of t.branches) {
      const past = ((r.idx - b.i0) % t.N + t.N) % t.N; const rel = past <= 10 ? 0 : t.N - past; if (rel > 90) continue;
      let pl = r.plan[b.id]; if (!pl || pl.lap !== r.lap) {
        const g = this.gates.find(q => q.b === b); const boostItem = ['nitro', 'nitro3', 'gold', 'torpedo'].includes(r.item);
        const pr = b.kind === 'alt' ? 0.45 : (!g || g.open > 0) ? (r.skill > 0.95 ? 0.7 : 0.45) : boostItem ? 0.75 : 0.12;
        pl = r.plan[b.id] = { lap: r.lap, go: this.rand() < pr };
      }
      if (pl.go) { forceLane = b.side * (t.half - b.half + 0.5); r._aimShort = rel < 60; }
    }
    for (const s of this.slicks) { const si = t.nearest(s.x, s.z, ti, 15); if (Math.abs(si - ti) < 15) { const sl = t.lateral(si, s.x, s.z); if (Math.abs(sl - lane) < 4) lane = sl + (sl > 0 ? -6 : 6); } }
    // go for item boxes if no item
    if (!r.item && this.items) { for (const b of this.boxes) { if (!b.on) continue; const bi = t.nearest(b.x, b.z, ti, 18); if (Math.abs(bi - ti) <= 18 && Math.hypot(b.x - r.x, b.z - r.z) < 40) { lane = t.lateral(bi, b.x, b.z); break; } } }
    lane = clamp(lane, -t.half + 2, t.half - 2);
    if (forceLane !== null) lane = forceLane;
    // dodge rolling hazards ahead on the same path
    for (const h of this.patrols) { if ((h.b || null) !== (r.seg || null)) continue; const dx = h.x - r.x, dz = h.z - r.z, dist = Math.hypot(dx, dz); if (dist > 34 || dx * Math.sin(r.yaw) + dz * Math.cos(r.yaw) < 0) continue;
      const P = h.b || t; const hl = P.lateral(h.si, h.x, h.z); const half = P.half; if (Math.abs(lane - hl) < 4.5) lane = clamp(hl + (hl > 0 ? -6 : 6), -half + 1.5, half - 1.5); }
    if (r.seg) lane = clamp(Math.sin(this.t * 0.4 + r.phase) * (r.seg.half - 2.5), -r.seg.half + 1.5, r.seg.half - 1.5);
    // smash a closed shortcut barrier with a boost
    if (r.seg && !r.local) { const g = this.gates.find(q => q.b === r.seg && !(q.open > 0)); if (g && r.sIdx > g.si - 24 && r.sIdx < g.si - 3 && r.boost <= 0 && ['nitro', 'nitro3', 'gold'].includes(r.item)) this.useItem(r); }
    if (r.vy > 0 && r.skill > 0.93) c.drift = true; // bots do tricks off ramps
    // unstuck
    if (r.revT > 0) { r.revT -= dt; const pr = this._ahead(r, 6, 0); const dd = angDiff(r.yaw, Math.atan2(pr[0] - r.x, pr[2] - r.z)); c.gas = 0; c.brake = 1; c.steer = clamp(dd * 2, -1, 1); c.drift = false; return; }
    if (this.state === 'race' && Math.abs(r.f) < 4 && r.spin <= 0) { r.stuckT = (r.stuckT || 0) + dt; if (r.stuckT > 1.3) { r.revT = 1.1; r.stuckT = 0; } } else r.stuckT = Math.max(0, (r.stuckT || 0) - dt);
    const p = this._ahead(r, forceLane !== null && r._aimShort ? Math.round(6 + Math.max(0, r.f) * 0.12) : look, lane);
    if (forceLane === null) r._aimShort = false;
    const want = Math.atan2(p[0] - r.x, p[2] - r.z);
    const d = angDiff(r.yaw, want);
    c.steer = clamp(-d * 2.6, -1, 1); c.gas = 1; c.brake = (Math.abs(d) > 0.9 && r.f > 18) ? 1 : 0;
    // drifting on big bends
    const cv = t.curv[t.wrap(r.idx + 8)];
    if (r.vy > 0 || r.airY > 0) { /* in the air: trick handled above */ }
    else if (forceLane !== null && r._aimShort) { c.drift = false; } // line up for the chosen route instead of drifting
    else if (Math.abs(cv) > 0.3 && r.f > 20 && !r.seg) { c.drift = true; if (!r.drift) c.steer = -Math.sign(cv) || c.steer; }
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
        else if (r.item === 'nitro' || r.item === 'nitro3') use = Math.abs(cv) < 0.1 && !(r.seg && this.gates.some(g => g.b === r.seg && !(g.open > 0)) && r.sIdx < 6);
        else if (r.item === 'gold') use = Math.abs(cv) < 0.15;
        else if (r.item === 'decoy') use = (behind && r.prog - behind.prog < 0.03) || this.rand() < 0.01;
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
      const P = p.seg || t; if (p.seg && r.seg !== p.seg) continue;
      const al = P.along(p.i, r.x, r.z), lt = P.lateral(p.i, r.x, r.z);
      if (Math.abs(al) < 3.2 && Math.abs(lt - p.lat) < 2.4) { r.boost = Math.max(r.boost, 1.0 * r.stats[3]); r.padCd = 1; if (r.local) { Sfx.play('boost'); this.stats.pad++; } }
    }
    for (const s of this.slicks) {
      if (s.dead || r.torp > 0 || (s.owner === r.id && s.age < 0.6)) continue;
      if (Math.hypot(s.x - r.x, s.z - r.z) < 2.3) { s.dead = true; this.hit(r, s.decoy ? 'decoy' : 'oil', s.owner); if (s.decoy) this._burst(s.x, s.y + 1.3, s.z, 20, [1, 0.3, 0.3]); this.sendFx({ t: 'x', id: 'x' + s.id, sid: s.id }); }
    }
    if (r.shield > 0) r.shield -= dt;
    if (r.item === 'gold' && !(r.goldT > 0) && r.goldUsed) { r.item = null; r.goldUsed = false; if (r.local) this.setItemUI(); }
    // explosive barrels
    for (const b of this.barrels) if (b.on && Math.hypot(b.x - r.x, b.z - r.z) < 2.1 && !(r.airY > 1.5)) this.explodeBarrel(b, true);
    // rolling hazards
    if (!(r.spin > 0) && !(r.torp > 0))
      for (const h of this.patrols) { if (Math.hypot(h.x - r.x, h.z - r.z) < 2.3 && Math.abs(h.y - r.y) < 2.5 && !(r.airY > 1.2)) { if (this.hit(r, 'roller')) { const nx = (r.x - h.x), nz = (r.z - h.z), l = Math.hypot(nx, nz) || 1; r.vx += nx / l * 9; r.vz += nz / l * 9; } this._burst(r.x, r.y + 1, r.z, 10, [0.9, 0.8, 0.6]); break; } }
    // slipstream: tuck in behind another kart to charge a boost
    if (!(r.airY > 0) && r.f > 20 && !(r.slipCd > 0)) {
      const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw); let behind = false;
      for (const o of this.racers) { if (o === r || o.elim || o.f < 15) continue; const dx = o.x - r.x, dz = o.z - r.z, al = dx * fx + dz * fz, lt = Math.abs(-dx * fz + dz * fx); if (al > 2.5 && al < 15 && lt < 2.4) { behind = true; break; } }
      r.slipT = behind ? (r.slipT || 0) + dt : Math.max(0, (r.slipT || 0) - dt * 2);
      if (behind && r.slipT > 0.35 && Math.random() < 0.6) { const q = [r.x + fx * 2 + (Math.random() - 0.5) * 2.5, r.y + 0.6 + Math.random() * 1.2, r.z + fz * 2 + (Math.random() - 0.5) * 2.5]; this.fxN.emit(q[0], q[1], q[2], -fx * 18, 0, -fz * 18, [1, 1, 1, 0.5], 0.35, 0.25); }
      if (r.slipT > 1.4) { r.slipT = 0; r.slipCd = 2.5; r.boost = Math.max(r.boost, 0.9 * r.stats[3]); if (r.local) { Sfx.play('mini', 1); this.msg('', 'SLIPSTREAM!', 0.9); this.stats.slip = (this.stats.slip || 0) + 1; } }
    }
    // trail particles
    this._trails(r, dt);
  }
  _roll(r) {
    const n = this.racers.filter(o => !o.elim).length;
    const posFrac = n > 1 ? (r.place - 1) / (n - 1) : 0;
    const lead = this.order && this.order.find(o => !o.elim);
    const gap = lead ? Math.max(0, lead.prog - r.prog) : 0;
    const seekerOK = !this.proj.some(p => p.sk) && lead && lead !== r && r.place > 2;
    const it = rollItem(this.rand, posFrac, n >= 4 && r.place > n - 3, gap, seekerOK);
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
    if (it === 'gold') { // Golden Nitro: unlimited boosts for a few seconds
      if (!(r.goldT > 0)) { if (r.goldUsed) return; r.goldT = 6.5; r.goldUsed = true; if (r.local) { this.stats.itemuse++; this.msg('', 'GOLDEN NITRO!', 1); } }
      if (r._goldCd && this.raceTime - r._goldCd < 0.25) return; r._goldCd = this.raceTime;
      r.boost = Math.max(r.boost, 0.75 * r.stats[3]); if (r.local) { Sfx.play('boost'); this.setItemUI(); } return;
    }
    if (r.local) this.stats.itemuse++;
    if (it === 'torpedo') { r.torp = 6.5; r.torpLane = r.lat; r.spin = 0; r.boost = 0; if (r.local || this._near(r)) { Sfx.play('boost'); Sfx.play('rocket'); } if (r.local) this.msg('', 'TORPEDO!', 1.2); }
    else if (it === 'nitro' || it === 'nitro3') { r.boost = Math.max(r.boost, 1.3 * r.stats[3]); if (r.local) Sfx.play('boost'); }
    else if (it === 'shield') { r.shield = 8; if (r.local) Sfx.play('shield'); }
    else if (it === 'rocket') {
      const ahead = this.racers.filter(o => !o.elim && !o.finished && o.prog > r.prog).sort((a, b) => a.prog - b.prog)[0];
      const fx = { t: 'r', id: r.id + ':' + Math.round(this.raceTime * 100) + ':' + (Math.random() * 1e4 | 0), owner: r.id, tgt: ahead ? ahead.id : null, idx: r.idx, lat: r.lat, y: r.y };
      this._spawnRocket(fx); this.sendFx(fx);
      if (r.local || this._near(r)) Sfx.play('rocket');
    } else if (it === 'seeker') {
      const lead = this.order.find(o => !o.elim && !o.finished);
      const fx = { t: 'r', sk: 1, id: r.id + ':k' + Math.round(this.raceTime * 100), owner: r.id, tgt: lead && lead !== r ? lead.id : null, idx: r.idx, lat: r.lat, y: r.y };
      this._spawnRocket(fx); this.sendFx(fx); Sfx.play('surge'); this.feed((r.local ? 'You' : r.name) + ' launched a Crown Seeker at ' + (lead ? (lead.local ? 'YOU' : lead.name) : 'the leader') + '!');
    } else if (it === 'oil' || it === 'decoy') {
      const fx = { t: 'o', kd: it === 'decoy' ? 'd' : 'o', id: r.id + ':' + Math.round(this.raceTime * 100), owner: r.id, x: +(r.x - Math.sin(r.yaw) * 3.2).toFixed(2), z: +(r.z - Math.cos(r.yaw) * 3.2).toFixed(2), y: +r.y.toFixed(2) };
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
    else if (fx.t === 'g') { const g = this.gates[fx.gi | 0]; if (g) this.openGate(g, false); }
    else if (fx.t === 'e') { const b = this.barrels[fx.bi | 0]; if (b) this.explodeBarrel(b, false); }
  }
  _spawnRocket(fx) {
    this.fxSeen.add(fx.id);
    const sk = !!fx.sk; const m = this.R.mesh(this.props.rocket, sk ? { tint: [0.75, 0.35, 1], emis: 0.45 } : {}); this.scene.meshes.push(m);
    const p = this.track.point(fx.idx, fx.lat);
    this.proj.push({ id: fx.id, sk, owner: fx.owner, tgt: fx.tgt, fi: fx.idx + 3, lat: fx.lat, x: p[0], y: fx.y + (sk ? 4 : 0.9), z: p[2], yaw: this.track.heading(fx.idx), life: sk ? 30 : 9, m });
  }
  _spawnSlick(fx) {
    this.fxSeen.add(fx.id);
    const decoy = fx.kd === 'd';
    const m = decoy ? this.R.mesh(this.props.box, { tex: this.tex.box, alpha: 0.9, emis: 0.25, tint: [1, 0.72, 0.72] }) : this.R.mesh(this.props.oil);
    if (decoy) M4.trs(fx.x, fx.y + 1.3, fx.z, 0.4, 0.5, 0.3, 1, m.m); else M4.trs(fx.x, fx.y + 0.1, fx.z, Math.random() * 6, 0, 0, 1, m.m); this.scene.meshes.push(m);
    this.slicks.push({ id: fx.id, decoy, owner: fx.owner, x: fx.x, y: fx.y, z: fx.z, m, age: 0 });
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
    this.spinOut(r, kind === 'rocket' || kind === 'boom' ? 1.25 : 0.95, kind === 'rocket' || kind === 'boom' ? 2 : 1); r.boost = 0; r.drift = false; r.charge = 0;
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
      let tgt = p.tgt ? this.byId[p.tgt] : null;
      if (p.sk && (!tgt || tgt.finished || tgt.elim)) { tgt = this.order.find(o => !o.elim && !o.finished && o.id !== p.owner) || null; p.tgt = tgt && tgt.id; }
      const spd = p.sk ? 98 : 82;
      if (p.sk && tgt && Math.hypot(tgt.x - p.x, tgt.z - p.z) < 3.2) { // Crown Seeker blast
        p.dead = true; this._burst(p.x, p.y, p.z, 60, [0.8, 0.4, 1]); Sfx.play('boom'); this.flash = 0.35;
        for (const r of this.racers) { if (r.elim || r.id === p.owner || !(r.local || (r.bot && this.host))) continue; if (Math.hypot(r.x - p.x, r.z - p.z) < 7.5) { this.hit(r, 'rocket', p.owner); r.vx *= 0.2; r.vz *= 0.2; } }
        continue;
      }
      if (tgt && !tgt.elim && Math.hypot(tgt.x - p.x, tgt.z - p.z) < (p.sk ? 40 : tgt.seg ? 40 : 26)) {
        const a = Math.atan2(tgt.x - p.x, tgt.z - p.z); p.yaw = a; p.x += Math.sin(a) * spd * dt; p.z += Math.cos(a) * spd * dt; p.y = lerp(p.y, tgt.y + 0.9 + (tgt.visAir || 0), p.sk ? 0.08 : 0.2);
        p.fi = t.nearest(p.x, p.z, Math.round(p.fi), 20);
      } else {
        p.fi += spd * dt / t.step; if (tgt) p.lat = lerp(p.lat, tgt.lat, 0.04);
        const q = t.point(p.fi, p.lat); const ny = q[1] + (p.sk ? 4.5 : 0.9); p.yaw = Math.atan2(q[0] - p.x, q[2] - p.z) || p.yaw; p.x = q[0]; p.z = q[2]; p.y = lerp(p.y, ny, 0.3);
      }
      M4.trs(p.x, p.y, p.z, p.yaw, 0, this.t * 8, 1.2, p.m.m);
      this.fxN.emit(p.x - Math.sin(p.yaw) * 0.8, p.y, p.z - Math.cos(p.yaw) * 0.8, 0, 1, 0, [0.85, 0.85, 0.9, 0.6], 1.2, 0.6, 3);
      this.fxAdd.emit(p.x - Math.sin(p.yaw) * 0.8, p.y, p.z - Math.cos(p.yaw) * 0.8, 0, 0, 0, [1, 0.6, 0.15, 1], 1.2, 0.15);
      // collisions
      if (!p.sk) for (const b of this.barrels) if (b.on && Math.hypot(b.x - p.x, b.z - p.z) < 2.4) { p.dead = true; this.explodeBarrel(b, true); break; }
      if (p.dead || p.sk) continue;
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
  _hazards(dt) {
    const t = this.track, T = this.raceTime;
    for (const g of this.gates) if (g.open > 0) { g.open -= dt; if (g.open <= 0) { g.open = 0; g.m.visible = true; this._burst(g.x, g.y + 1.5, g.z, 14, [1, 0.9, 0.5]); } }
    for (const b of this.barrels) { if (!b.on) { b.t -= dt; if (b.t <= 0) b.on = true; } b.m.visible = b.on; }
    for (const h of this.patrols) {
      const P = h.b || t; const lat = Math.sin(T * h.w + h.ph) * h.amp; const p = P.point(h.si, lat);
      const vel = Math.cos(T * h.w + h.ph) * h.amp * h.w; h.x = p[0]; h.z = p[2]; const rad = t.def.theme === 'neon' ? 0 : t.def.theme === 'meadow' ? 1.4 : 1.6;
      h.y = p[1] + (t.def.theme === 'neon' ? 1.2 + Math.sin(T * 3) * 0.2 : rad);
      h.roll = (h.roll || 0) + vel * dt / Math.max(rad, 1);
      const yaw = P.heading(h.si);
      if (t.def.theme === 'neon') M4.trs(h.x, h.y, h.z, yaw + T * 2, 0, 0, 1, h.m.m); else if (t.def.theme === 'meadow') M4.trs(h.x, h.y, h.z, yaw + Math.PI / 2, h.roll, 0, 1, h.m.m); else M4.trs(h.x, h.y, h.z, yaw, 0, -h.roll, 1, h.m.m);
    }
  }
  explodeBarrel(b, send) {
    if (!b.on) return; b.on = false; b.t = 18; b.m.visible = false;
    this._burst(b.x, b.y + 1, b.z, 40, [1, 0.55, 0.15]); this.fxN.emit(b.x, b.y + 2, b.z, 0, 3, 0, [0.3, 0.3, 0.32, 0.7], 5, 1.5, 4);
    if (this._near(b)) { Sfx.play('boom'); if (this.me && Math.hypot(this.me.x - b.x, this.me.z - b.z) < 25) this.shake = 0.5; }
    for (const r of this.racers) { if (r.elim || !(r.local || (r.bot && this.host))) continue; if (Math.hypot(r.x - b.x, r.z - b.z) < 7) { if (this.hit(r, 'boom')) { const nx = r.x - b.x, nz = r.z - b.z, l = Math.hypot(nx, nz) || 1; r.vx += nx / l * 10; r.vz += nz / l * 10; } } }
    for (const o of this.barrels) if (o !== b && o.on && Math.hypot(o.x - b.x, o.z - b.z) < 6) setTimeout(() => this.explodeBarrel(o, false), 160); // chain reaction
    if (send) this.sendFx({ t: 'e', id: 'e' + this.barrels.indexOf(b) + ':' + Math.round(this.raceTime * 10), bi: this.barrels.indexOf(b) });
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
    if (r.boost > 0) { for (const s of [-0.3, 0.3]) { const p = back(s, 0.7); this.fxAdd.emit(p[0], p[1], p[2], -fx * 10 + (Math.random() - 0.5) * 2, Math.random(), -fz * 10 + (Math.random() - 0.5) * 2, r.flameCol ? [r.flameCol[0], r.flameCol[1] * (0.7 + Math.random() * 0.4), r.flameCol[2], 1] : [1, 0.5 + Math.random() * 0.4, 0.15, 1], 0.75, 0.16, -1.5); } }
    if ((Math.abs(r.lat) > (r.seg || this.track).half + 1.4 || (r.seg && r.seg.type === 'dirt')) && sp > 8 && !(r.visAir > 0.3) && Math.random() < 0.5) { const p = back((Math.random() - 0.5) * 1.6, 0.2); const gc = hexc(this.track.theme.ground2); this.fxN.emit(p[0], p[1], p[2], (Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3, [gc[0], gc[1], gc[2], 0.7], 0.9, 0.6, 1, 6); }
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
      const trickRoll = r.trickT > 0 ? (1 - r.trickT / 0.45) * Math.PI * 2 * (r.driftDir < 0 ? -1 : 1) : 0;
      r.view.update(r.x, r.y + (r.visAir || 0), r.z, vy, r.pitch, r.roll + trickRoll, r.steer, r.f, dt, { hop: r.hop * 0.6, shield: r.shield > 0, alpha: a, flash, torp: r.torp > 0 });
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
    if (r.item === 'gold' && r.goldT > 0) this.h.itemN.textContent = Math.ceil(r.goldT) + 's';
    h.boostBar.className = 'drift ' + (r.drift ? (r.charge >= 2.6 ? 'l3' : r.charge >= 1.6 ? 'l2' : r.charge >= 0.7 ? 'l1' : 'l0') : '');
    if (this.mode === 'ko') h.ko.innerHTML = `<b>${n}</b> LEFT · next knockout <b>${Math.max(0, Math.ceil(this.koNext))}s</b>`;
    // minimap
    const ctx = this.mapCtx, mm = this.track.minimap; ctx.clearRect(0, 0, 150, 150); ctx.drawImage(mm.img, 0, 0);
    for (const o of this.racers) { if (o.elim) continue; const p = mm.map(o.x, o.z); ctx.beginPath(); ctx.arc(p[0], p[1], o.local ? 5 : 3.5, 0, 7); ctx.fillStyle = o.local ? '#ffe14a' : o.human ? '#2bf0ff' : '#ff5a5a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#000'; ctx.stroke(); }
    for (const p of this.proj) { const q = mm.map(p.x, p.z); ctx.fillStyle = p.sk ? '#c25cff' : '#ff8a1c'; ctx.fillRect(q[0] - (p.sk ? 3 : 2), q[1] - (p.sk ? 3 : 2), p.sk ? 6 : 4, p.sk ? 6 : 4); }
    for (const g of this.gates) { const q = mm.map(g.x, g.z); ctx.fillStyle = g.open > 0 ? '#5fe06f' : '#ff4040'; ctx.fillRect(q[0] - 3, q[1] - 3, 6, 6); }
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
