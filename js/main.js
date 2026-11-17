// Turbo Royale — app shell: lobby, locker, shop, pass, challenges, parties, races
'use strict';
const $ = s => document.getElementById(s);
const LOCKER_SORTS = [{ id: 'rarity', name: 'Rarity ↓' }, { id: 'rarityLow', name: 'Rarity ↑' }, { id: 'az', name: 'A–Z' }, { id: 'za', name: 'Z–A' }, { id: 'newest', name: 'Newest' }, { id: 'oldest', name: 'Oldest' }, { id: 'stats', name: 'Best stats', stats: true }];
const App = window.App = {
  settings: Object.assign({ quality: 'high', difficulty: 'normal', muted: false, autoGas: false, assist: false }, (() => { try { return JSON.parse(localStorage.getItem('tr_settings') || '{}'); } catch (e) { return {}; } })()),
  sel: { mode: 'gp', track: 'sunny' }, tab: 'play', race: null, paused: false, slot: 'body',
  saveSettings() { try { localStorage.setItem('tr_settings', JSON.stringify(this.settings)); } catch (e) { } },

  async init() {
    try { this.R = new Renderer($('gl')); }
    catch (e) { $('bootMsg').textContent = 'Your browser could not start WebGL graphics. Try enabling hardware acceleration in your browser settings.'; document.querySelector('#boot .spinner').remove(); return; }
    if (this.settings.quality === 'low') this.R.pixelRatio = 1;
    const tc = document.createElement('canvas'); tc.width = tc.height = 220;
    try { this.TR = new Renderer(tc, { fixed: true, preserve: true, alpha: true }); } catch (e) { this.TR = null; }
    Sfx.setMuted(this.settings.muted);
    await Account.init(m => $('bootMsg').textContent = m);
    this.netReady = Net.init().then(ok => { this.netOk = ok; this.renderParty(); this.checkInvite(); });
    addEventListener('hashchange', () => this.checkInvite());
    Net.on((ev, d) => this.onNet(ev, d));
    this.buildLobby();
    this.bindUI();
    $('boot').classList.add('hidden'); $('ui').classList.remove('hidden');
    this.refreshTop(); this.renderPlay(); this.renderParty();
    if (Account.isNew || !Account.profile.tag) this.tagModal(true);
    this.last = performance.now();
    requestAnimationFrame(t => this.loop(t));
    addEventListener('pointerdown', () => Sfx.init(), { once: true });
    addEventListener('keydown', () => Sfx.init(), { once: true });
    setInterval(() => this.tickTimers(), 1000); this.tickTimers();
  },
  // ---------------- main loop ----------------
  loop(t) {
    const raw = (t - this.last) / 1000; const dt = Math.min(0.05, raw); this.last = t;
    this.adaptRes(raw);
    try {
      if (this.race) { if (!this.paused) this.race.update(dt); else Sfx.engine(false); this.race.render(); }
      else this.updateLobby(dt);
    } catch (e) { console.error(e); }
    Input.endFrame();
    this.pumpThumbs();
    requestAnimationFrame(tt => this.loop(tt));
  },
  // dynamic resolution: keeps the frame rate smooth on slower laptops/Chromebooks
  adaptRes(raw) {
    if (raw > 0.25 || document.hidden) return;
    this._ft = this._ft === undefined ? raw : this._ft * 0.95 + raw * 0.05;
    this._rt = (this._rt || 0) + raw; if (this._rt < 1.5) return; this._rt = 0;
    const max = this.settings.quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.5), min = 0.7;
    const R = this.R; if (R.pixelRatio > max) R.pixelRatio = max;
    R.lowQ = this.settings.quality === 'low' || !!this._autoLow;
    if (this._ft > 1 / 30 && R.pixelRatio <= min + 0.01) this._autoLow = true; // still slow at the lowest resolution: use the cheaper shader
    if (this._ft > 1 / 45 && R.pixelRatio > min) R.pixelRatio = Math.max(min, R.pixelRatio - 0.1);
    else if (this._ft < 1 / 58 && R.pixelRatio < max) R.pixelRatio = Math.min(max, R.pixelRatio + 0.05);
  },
  // ---------------- lobby 3D ----------------
  buildLobby() {
    const R = this.R, g = new Geo(), E = (h, e) => hexc(h, e === undefined ? 0 : e);
    const ring = (r0, r1, y, colf, seg) => { seg = seg || 64; for (let i = 0; i < seg; i++) { const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2, c = colf(i); const P = (r, a) => [Math.cos(a) * r, y, Math.sin(a) * r];
      g.vert(...P(r0, a0), 0, 1, 0, c); g.vert(...P(r1, a1), 0, 1, 0, c); g.vert(...P(r1, a0), 0, 1, 0, c); g.vert(...P(r0, a0), 0, 1, 0, c); g.vert(...P(r0, a1), 0, 1, 0, c); g.vert(...P(r1, a1), 0, 1, 0, c); } };
    // show floor: asphalt plaza, painted rings, chequered band, grass beyond
    ring(0, 9, 0, () => E(0x343a48)); ring(9, 9.35, 0.01, () => E(0xffd23a, 0.5)); ring(9.35, 17, 0, () => E(0x2c313d));
    ring(17, 18.2, 0.01, i => E(i % 2 ? 0x15171c : 0xe9edf2), 72); ring(18.2, 19.4, 0.01, i => E(i % 2 ? 0xe9edf2 : 0x15171c), 72);
    ring(19.4, 30, 0, () => E(0x2c313d)); ring(30, 31, 0.02, i => E(i % 2 ? 0xe8333a : 0xffffff), 96);
    // backdrop gantry
    // sign gantry: two posts, a crossbar right on top of the banner and a framed backing board so the sign sits in a solid frame
    for (const sx of [-1, 1]) { g.rbox(1.3, 12.8, 1.3, E(0x2b3a6b), sx * 16.1, 6.4, -26.6); g.rbox(2.4, 0.5, 2.4, E(0x1d274d), sx * 16.1, 0.25, -26.6); g.rbox(1.6, 0.35, 1.6, E(0xffd23a, 0.5), sx * 16.1, 12.9, -26.6); }
    g.rbox(33.6, 1.0, 1.4, E(0x2b3a6b), 0, 12.55, -26.6); g.rbox(31.2, 4.6, 0.5, E(0x16204a), 0, 10.05, -26.45);
    g.rbox(31.2, 0.22, 0.6, E(0xffd23a, 0.7), 0, 7.86, -26.3); g.rbox(31.2, 0.22, 0.6, E(0xffd23a, 0.7), 0, 12.12, -26.3);
    for (let k = -3; k <= 3; k++) g.rbox(1.6, 0.5, 0.4, E(k % 2 ? 0xffe14a : 0x2bf0ff, 1), k * 4.6, 12.55, -25.85);
    // scenery: trees, tyre stacks, cones, distant hills
    const r = rng(77);
    for (const sx of [-1, 1]) { for (let k = 0; k < 3; k++) g.cyl(0.8, 0.5, 12, E(k % 2 ? 0x222226 : 0x2c2c32), 'y', sx * 21, 0.25 + k * 0.5, -6); for (let k = 0; k < 4; k++) { g.cone(0.4, 1.0, 8, E(0xff7a1c), sx * (12 + k * 2.2), 0, 7 - k * 1.5); } }
    const tex = Textures.get(R), bn = new Geo(); bn.quad([-15, 8.2, -26.1], [15, 8.2, -26.1], [15, 11.9, -26.1], [-15, 11.9, -26.1], E(0xffffff, 0.75), [[0, 1], [1, 1], [1, 0], [0, 0]]);
    // searchlights (swaying beams) and a pulsing floor ring replace the old floating dots
    const beam = new Geo(); beam.cyl(0.35, 70, 10, [1, 0.95, 0.75, 1], 'y', 0, 35, 0, [1, 0.95, 0.75, 1], 4.5);
    const beamG = R.upload(beam), beams = [[-26, -30], [26, -30], [-40, -12], [40, -12]].map(q => ({ x: q[0], z: q[1], m: R.mesh(beamG, { alpha: 0.13, blend: 'add', twoSided: true, fog: false }) }));
    const pr = new Geo(); { const gg = g; const save = [gg.p, gg.n, gg.c, gg.u]; } for (let i = 0; i < 64; i++) { const a0 = i / 64 * Math.PI * 2, a1 = (i + 1) / 64 * Math.PI * 2, P = (rr, a) => [Math.cos(a) * rr, 0.03, Math.sin(a) * rr], c = [0.17, 0.94, 1, 1];
      pr.vert(...P(16.4, a0), 0, 1, 0, c); pr.vert(...P(16.8, a1), 0, 1, 0, c); pr.vert(...P(16.8, a0), 0, 1, 0, c); pr.vert(...P(16.4, a0), 0, 1, 0, c); pr.vert(...P(16.4, a1), 0, 1, 0, c); pr.vert(...P(16.8, a1), 0, 1, 0, c); }
    const pulse = R.mesh(R.upload(pr), { alpha: 0.9, blend: 'add' });
    const tall = new Geo(); tall.cyl(2.5, 1.4, 24, E(0x2b3a6b), 'y', 0, 0.7, 0); tall.cyl(2.62, 0.14, 24, E(0xffd23a, 0.9), 'y', 0, 1.28, 0);
    this.lobby = {
      scene: { meshes: [R.mesh(R.upload(g)), null, R.mesh(R.upload(bn), { tex: tex.banner }), pulse, ...beams.map(b => b.m)], particles: [new Particles(200, true)], fog: { color: [0.86, 0.6, 0.6], near: 70, far: 300 }, light: { dir: [0.35, 0.72, 0.6].map(v => v / Math.hypot(0.35, 0.72, 0.6)), sky: [0.72, 0.64, 0.82], ground: [0.42, 0.32, 0.42], sun: [0.9, 0.7, 0.55] }, sky: [0.86, 0.6, 0.6] },
      cam: { x: 0, y: 3.4, z: 11.5, tx: 0, ty: 1.2, tz: 0, fov: 0.9, near: 0.3, far: 600 }, karts: [], t: 0, beams, pulse, tallG: R.upload(tall), camD: 11.5, rows: 1,
    };
    this.lobbyTheme((this.sel && this.sel.track) || TRACKS[0].id);
    this.lobbyKarts();
  },
  // the lobby's surroundings (sky, ground, scenery, far hills, fog and light) match the selected map
  lobbyTheme(trackId) {
    const L = this.lobby, R = this.R; if (!L || L.themeId === trackId) return;
    const def = TRACKS.find(t => t.id === trackId) || TRACKS[0], T = THEMES[def.theme]; L.themeId = def.id;
    const E = (h, e) => hexc(h, e === undefined ? 0 : e), g = new Geo(), r = rng(hashStr('lobby-' + def.id)), helper = Object.create(Track.prototype);
    // ground beyond the plaza: theme ground, blotched with its second colour
    for (let j = 0; j < 6; j++) for (let i = 0; i < 64; i++) {
      const r0 = 31 + j * 23, r1 = r0 + 23, a0 = i / 64 * Math.PI * 2, a1 = (i + 1) / 64 * Math.PI * 2, P = (rr, a) => [Math.cos(a) * rr, -0.02, Math.sin(a) * rr];
      const c = mixc(E(T.ground), E(T.ground2 || T.ground), (Math.sin(i * 1.7 + j * 2.3) * 0.5 + 0.5) * 0.7);
      g.vert(...P(r0, a0), 0, 1, 0, c); g.vert(...P(r1, a1), 0, 1, 0, c); g.vert(...P(r1, a0), 0, 1, 0, c); g.vert(...P(r0, a0), 0, 1, 0, c); g.vert(...P(r0, a1), 0, 1, 0, c); g.vert(...P(r1, a1), 0, 1, 0, c);
    }
    // scenery props of the map
    const city = T.props === 'city';
    for (let k = 0, placed = 0; k < 400 && placed < (city ? 22 : 46); k++) { const a = r() * Math.PI * 2, rr = (city ? 46 : 36) + r() * 70, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if ((z > 6 && Math.abs(x) < 30) || (z < 0 && z > -60 && Math.abs(x) < 20)) continue;
      g.push(M4.trs(x, 0, z, r() * 6.28, 0, 0, 0.9 + r() * 0.8)); helper._prop(g, T, r); g.pop(); placed++; }
    // meme maps: their giant landmarks stand behind the sign
    if (def.meme) [[-55, -95], [60, -100]].forEach((q, k) => { g.push(M4.trs(q[0], 0, q[1], Math.atan2(-q[0], -q[1]), 0, 0, 0.8)); helper._landmark(g, T, k); g.pop(); });
    // far hills
    for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2 + r() * 0.2, hh = (city ? 20 : 28) + r() * 40, rad = 160, mc = T.mtn ? E(T.mtn) : T.props === 'cactus' ? E(0xc77a45) : T.props === 'pines' ? E(0x8ea4c0) : city ? E(0x1b1530) : E(0x5a8a5a);
      g.cone(46 + r() * 30, hh, 7, mixc(mc, shade(mc, 1.25), r()), Math.cos(a) * rad, -4, Math.sin(a) * rad); if (!T.noCap && !T.neon && hh > 52) g.cone(16, hh * 0.25, 7, E(0xffffff), Math.cos(a) * rad, hh * 0.75 - 4, Math.sin(a) * rad); }
    // sky dome: horizon (fog colour) → sky → top
    const dome = new Geo(), HZ = [...T.fog, 1], MID = [...T.sky, 1], TOP = T.skyTop ? E(T.skyTop, 1) : T.neon ? E(0x05020f, 1) : E(0x2f7de0, 1);
    for (let j = 0; j < 10; j++) for (let i = 0; i < 28; i++) {
      const t0 = j / 10 * Math.PI / 2, t1 = (j + 1) / 10 * Math.PI / 2, p0 = i / 28 * Math.PI * 2, p1 = (i + 1) / 28 * Math.PI * 2, rr = 320;
      const P = (t, p) => [Math.cos(t) * Math.cos(p) * rr, Math.sin(t) * rr * 0.7 - 12, Math.cos(t) * Math.sin(p) * rr];
      const C = f => f < 0.3 ? mixc(HZ, MID, f / 0.3) : mixc(MID, TOP, (f - 0.3) / 0.7), cA = C(j / 10), cB = C((j + 1) / 10);
      const A = P(t0, p0), B = P(t0, p1), Cc = P(t1, p1), D = P(t1, p0);
      dome.vert(...A, 0, 1, 0, cA); dome.vert(...Cc, 0, 1, 0, cB); dome.vert(...B, 0, 1, 0, cA); dome.vert(...A, 0, 1, 0, cA); dome.vert(...D, 0, 1, 0, cB); dome.vert(...Cc, 0, 1, 0, cB);
    }
    if (T.neon) dome.sphere(22, 16, 10, E(0xff4fe0, 1), -70, 40, -290); else { dome.sphere(24, 16, 10, E(0xfff0c0, 1), -70, 60, -290); dome.sphere(38, 14, 8, [1, 0.92, 0.7, 0.5], -70, 60, -300); }
    if (!T.neon) for (let k = 0; k < 9; k++) { const a = -Math.PI * (0.1 + 0.8 * r()), dd = 230 + r() * 40, y = 50 + r() * 60; for (let q = 0; q < 4; q++) dome.sphere(12 + r() * 10, 9, 6, [1, 1, 1, 0.8], Math.cos(a) * dd + (r() - 0.5) * 44, y + r() * 6, Math.sin(a) * dd + (r() - 0.5) * 30, 0.5); }
    const ms = L.scene.meshes; if (L.envMesh) { const i = ms.indexOf(L.envMesh); if (i >= 0) ms.splice(i, 1); }
    L.envMesh = R.mesh(R.upload(g)); ms.splice(1, 0, L.envMesh);
    const di = ms.indexOf(L.domeMesh); L.domeMesh = R.mesh(R.upload(dome), { fog: false, twoSided: true }); if (di >= 0) ms[di] = L.domeMesh; else { const ni = ms.indexOf(null); if (ni >= 0) ms[ni] = L.domeMesh; else ms.push(L.domeMesh); }
    const Ld = T.light, dn = Math.hypot(...Ld.dir);
    L.scene.fog = { color: T.fog.slice(), near: 70, far: 300 }; L.scene.light = { dir: Ld.dir.map(v => v / dn), sky: Ld.sky, ground: Ld.ground, sun: Ld.sun };
  },
  lobbyKarts() {
    const L = this.lobby; const R = this.R; const props = KartFactory.propGeo(R);
    L.karts.forEach(k => k.meshes.forEach(m => { const i = L.scene.meshes.indexOf(m); if (i >= 0) L.scene.meshes.splice(i, 1); }));
    L.karts = [];
    const list = [{ name: Account.profile.tag || 'You', cos: Account.profile.equip, me: true, lvl: Account.level }];
    if (Net.party) for (const m of Net.members()) if (!m.sameTab) list.push({ name: safeTag(m.presence.tag), cos: unpackCos(m.presence.cos), lvl: m.presence.lvl | 0, ready: !!m.presence.ready });
    const n = Math.min(8, list.length), SP = 5.8;
    // up to 3 in one row; 4+ use a raised second row behind so everyone is visible
    const nf = n <= 3 ? n : Math.ceil(n / 2), nb = n - nf;
    const rowX = k => Array.from({ length: k }, (_, i) => (i - (k - 1) / 2) * SP).sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);
    const slots = [...rowX(nf).map(x => [x, 0, Math.abs(x) * 0.18]), ...rowX(nb).map(x => [x + (nb % 2 === nf % 2 ? SP / 2 : 0), 1.4, -6.2])];
    L.frontHalf = (nf - 1) / 2 * SP; L.rows = nb ? 2 : 1;
    list.slice(0, n).forEach((o, i) => {
      const v = new KartView(R, o.cos); const s = slots[i]; const ped = R.mesh(props.pedestal); const extra = [];
      M4.trs(s[0], s[1], s[2], 0, 0, 0, 1, ped.m);
      if (s[1] > 0) { const t = R.mesh(L.tallG); M4.trs(s[0], 0, s[2], 0, 0, 0, 1, t.m); extra.push(t); }
      const k = { view: v, pos: s, meshes: [ped, ...extra, ...v.meshes], o, yaw: i ? clamp(-s[0] * 0.07, -0.55, 0.55) : 0.6 };
      L.scene.meshes.push(...k.meshes); L.karts.push(k);
    });
    const tags = $('lobbyTags'); tags.innerHTML = '';
    L.karts.forEach(k => { const d = document.createElement('div'); d.textContent = k.o.name; const i = document.createElement('i'); i.textContent = k.o.me ? 'LVL ' + k.o.lvl : (k.o.ready ? '✔ READY' : 'LVL ' + k.o.lvl); d.appendChild(i); tags.appendChild(d); k.tag = d; });
  },
  updateLobby(dt) {
    const L = this.lobby; if (!L) return; L.t += dt;
    const locker = this.tab === 'locker';
    // zoom out just enough to fit the whole front row for this window shape
    const cv = this.R.canvas, asp = Math.max(0.5, cv.clientWidth / Math.max(1, cv.clientHeight));
    const need = Math.max(11.5, ((L.frontHalf || 0) + 3.4) / (Math.tan(0.45) * asp * 0.62)); // leave room for the party panel and Play button
    const c = L.cam, mx = L.karts[0] ? L.karts[0].pos[0] : 0, tgt = locker ? { x: mx + 3.4, y: 2.6, z: 8.2, tx: mx + 3.4, ty: 1.0 } : { x: Math.sin(L.t * 0.15) * 0.8, y: 3.0 + (L.rows > 1 ? 1.6 : 0) + (need - 11.5) * 0.2, z: need + (L.rows > 1 ? 1.5 : 0), tx: 0, ty: 1.9 + (L.rows > 1 ? 0.4 : 0) };
    const k = 1 - Math.exp(-4 * dt);
    c.x = lerp(c.x, tgt.x, k); c.y = lerp(c.y, tgt.y, k); c.z = lerp(c.z, tgt.z, k); c.tx = lerp(c.tx, tgt.tx, k); c.ty = lerp(c.ty, tgt.ty, k);
    L.karts.forEach((kk, i) => { const yaw = i === 0 ? (this.dragYaw !== undefined ? this.dragYaw : L.t * 0.45 + 0.6) : kk.yaw + Math.sin(L.t + i) * 0.1; kk.view.update(kk.pos[0], kk.pos[1] + 0.06, kk.pos[2], yaw, 0, 0, Math.sin(L.t * 0.7) * 0.3, 0, dt, {}); });
    // in the Locker you only see your own kart (party members' karts are hidden until you go back)
    L.karts.forEach((kk, i) => { if (i && locker) for (const m of kk.meshes) m.visible = false; else if (i) for (const m of kk.meshes) if (!kk.view.meshes.includes(m)) m.visible = true; if (kk.tag) kk.tag.style.visibility = locker && i ? 'hidden' : ''; });
    L.beams.forEach((b, i) => M4.trs(b.x, 0, b.z, i, Math.sin(L.t * 0.45 + i * 1.7) * 0.32, Math.cos(L.t * 0.37 + i * 2.3) * 0.32 + (b.x > 0 ? 0.25 : -0.25), 1, b.m.m));
    L.pulse.alpha = 0.45 + 0.4 * Math.sin(L.t * 2.2); { const s = 1 + 0.012 * Math.sin(L.t * 2.2); M4.trs(0, 0, 0, L.t * 0.1, 0, 0, s, L.pulse.m); }
    const ps = L.scene.particles[0];
    const me = L.karts[0]; const tr = me && (CAT[me.o.cos.trail] || {}).kind;
    if (tr && tr !== 'none' && Math.random() < 0.7) { const a = (this.dragYaw !== undefined ? this.dragYaw : L.t * 0.45 + 0.6); const col = tr === 'fire' || tr === 'ember' ? [1, 0.5, 0.1, 1] : tr === 'rainbow' || tr === 'prime' ? [...hsl(L.t % 1), 1] : tr === 'ice' ? [0.6, 0.9, 1, 1] : tr === 'bubbles' ? [0.6, 0.9, 1, 0.6] : tr === 'smoke' ? [0.7, 0.7, 0.75, 0.5] : tr === 'hearts' ? [1, 0.3, 0.55, 1] : tr === 'leaf' ? [0.4, 0.9, 0.3, 1] : tr === 'shadow' ? [0.6, 0.2, 1, 1] : [1, 0.9, 0.5, 1]; const kp = me.pos; ps.emit(kp[0] - Math.sin(a) * 1.5, kp[1] + 0.55, kp[2] - Math.cos(a) * 1.5, -Math.sin(a) * 1.2 + (Math.random() - 0.5) * 0.4, 0.6, -Math.cos(a) * 1.2 + (Math.random() - 0.5) * 0.4, col, 0.55, 0.8); }
    ps.update(dt);
    this.R.render(L.scene, c);
    if (this.tab === 'play') L.karts.forEach(kk => { const p = this.R.project(kk.pos[0], kk.pos[1] + 2.6, kk.pos[2]); if (p) { kk.tag.style.left = p.x + 'px'; kk.tag.style.top = (p.y - 64) + 'px'; } });
  },
  // ---------------- UI binding ----------------
  bindUI() {
    document.querySelectorAll('.tab').forEach(b => b.onclick = () => { Sfx.play('click'); this.showTab(b.dataset.tab); });
    $('setBtn').onclick = () => this.settingsModal();
    $('modeCard').onclick = () => this.modeModal();
    $('myCard').onclick = () => { this.slot = 'banner'; this.showTab('locker'); };
    $('playBtn').onclick = () => this.play();
    $('botTog').onclick = () => { if (Net.party && !Net.isLeader()) return; Sfx.play('click'); this.sel.bots = this.sel.bots === false; if (Net.party) Net.setParty({ sel: this.sel }); this.renderPlay(); };
    $('daily').onclick = () => { const p = Account.profile; p.lastReward = todayKey(); p.coins += 150; Account.save(); Sfx.play('buy'); this.toast('🎁 +150 Kart Coins! Come back tomorrow for more.'); this.refreshTop(); };
    $('resOk').onclick = () => this.exitRace();
    $('resNext').onclick = () => { const c = this.lastCfg; const k = TRACKS.findIndex(t => t.id === this.sel.track); this.sel.track = TRACKS[(k + 1) % TRACKS.length].id; if (Net.party) Net.setParty({ sel: this.sel }); this.exitRace(true); if (c && (!c.multi || Net.isLeader())) this.play(); };
    $('resAgain').onclick = () => { const c = this.lastCfg; this.exitRace(true); if (c && (!c.multi || Net.isLeader())) this.play(); };
    $('hPause').onclick = () => this.pauseMenu();
    { const lb = $('hLook'); const on = e => { e.preventDefault(); Input.touch.look = 1; lb.classList.add('on'); }; const off = () => { Input.touch.look = 0; lb.classList.remove('on'); };
      lb.addEventListener('pointerdown', on); ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => lb.addEventListener(ev, off)); lb.addEventListener('contextmenu', e => e.preventDefault()); }
    addEventListener('keydown', e => { if (Input.capturing) return; if (this.race && !this.race.resultsShown && Input.binds.pause.includes(e.code) && $('modal').classList.contains('hidden')) { this.pauseMenu(); return; } if (e.code === 'Escape') { if (!$('modal').classList.contains('hidden')) { if (this.race) { this.closeModal(); this.paused = false; } else this.closeModal(); } else if (this.race && !this.race.resultsShown) this.pauseMenu(); } });
    $('modal').addEventListener('pointerdown', e => { if (e.target === $('modal') && !this._modalLocked) { this.closeModal(); this.paused = false; } });
    // drag-to-rotate lobby kart
    let drag = null; const cv = $('gl');
    $('pane-play').addEventListener('pointerdown', e => { if (e.target.id === 'pane-play' || e.target.id === 'lobbyTags') drag = { x: e.clientX, y0: this.dragYaw !== undefined ? this.dragYaw : (this.lobby.t * 0.45 + 0.6) }; });
    $('pane-locker').addEventListener('pointerdown', e => { if (e.target.id === 'pane-locker') drag = { x: e.clientX, y0: this.dragYaw !== undefined ? this.dragYaw : (this.lobby.t * 0.45 + 0.6) }; });
    addEventListener('pointermove', e => { if (drag) this.dragYaw = drag.y0 + (e.clientX - drag.x) * 0.012; });
    addEventListener('pointerup', () => { if (drag) { drag = null; setTimeout(() => { if (!drag) { this.dragYaw = undefined; } }, 2500); } });
    addEventListener('keydown', e => { if (this.race && !e.repeat && /^(Key|Arrow|Space)/.test(e.code)) $('touch').classList.add('hidden'); });
    // touch controls
    const touchOn = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
    this.touch = touchOn;
    document.querySelectorAll('#touch button').forEach(b => {
      const k = b.dataset.k;
      const on = e => { e.preventDefault(); Input.touch[k] = 1; b.classList.add('on'); Sfx.init(); };
      const off = e => { e.preventDefault(); Input.touch[k] = 0; b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
    });
  },
  showTab(t) {
    this.tab = t;
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    document.querySelectorAll('.pane').forEach(p => p.classList.toggle('hidden', p.id !== 'pane-' + t));
    if (t === 'locker') this.renderLocker(); if (t === 'shop') this.renderShop(); if (t === 'pass') this.renderPass();
    if (t === 'challenges') this.renderChallenges(); if (t === 'leaderboard') this.renderLeaderboard(); if (t === 'play') this.renderPlay();
  },
  refreshTop() {
    const p = Account.profile; $('coins').textContent = p.coins.toLocaleString();
    $('lvlN').textContent = Account.level; $('lvl').style.setProperty('--p', ((p.xp % PASS_XP) / PASS_XP * 100) + '%');
    $('daily').classList.toggle('hidden', p.lastReward === todayKey() || this.tab !== 'play');
  },
  toast(html, ms, actions) {
    const d = document.createElement('div'); d.className = 'toast'; d.innerHTML = html;
    if (actions) { const r = document.createElement('div'); r.className = 'row'; r.style.marginTop = '8px'; actions.forEach(a => { const b = document.createElement('button'); b.className = 'btn sm ' + (a.cls || ''); b.textContent = a.label; b.onclick = () => { a.fn(); d.remove(); }; r.appendChild(b); }); d.appendChild(r); }
    $('toasts').appendChild(d); setTimeout(() => d.remove(), ms || 4000);
  },
  modal(html, wide, locked) { $('mbox').className = 'mbox' + (wide ? ' wide' : ''); $('mbox').innerHTML = html; $('modal').classList.remove('hidden'); this._modalLocked = !!locked; return $('mbox'); },
  closeModal() { $('modal').classList.add('hidden'); this._modalLocked = false; },
  tickTimers() {
    const SH = 4 * 3600e3, slot = Math.floor(Date.now() / SH), s = Math.max(0, ((slot + 1) * SH - Date.now()) / 1000);
    const txt = `${Math.floor(s / 3600)}h ${Math.floor(s % 3600 / 60)}m ${Math.floor(s % 60)}s`;
    $('shopTimer').textContent = txt; if (this._shopSlot !== undefined && this._shopSlot !== slot && this.tab === 'shop') this.renderShop(); this._shopSlot = slot; if (this.tab === 'challenges') this.tickChTimers();
    if (this._day && this._day !== todayKey()) { Account.ensurePeriods(); if (this.tab === 'shop') this.renderShop(); if (this.tab === 'challenges') this.renderChallenges(); this.refreshTop(); }
    this._day = todayKey();
  },
  // ---------------- gamertag / settings ----------------
  tagModal(first) {
    const b = this.modal(`<h3>${first ? 'Welcome, racer!' : 'Change gamertag'}</h3><p class="muted" style="margin-bottom:12px">${first ? 'Pick the name everyone sees on the track.' : 'Up to 16 characters.'}</p>
      <div class="row"><input class="inp" id="tagIn" maxlength="16" style="text-transform:none;letter-spacing:0" placeholder="Gamertag"><button class="btn y" id="tagOk">Let's go</button></div>
      <p class="muted" style="margin-top:12px">Your progress is saved on this device. Use <b>Settings → Transfer progress</b> to move it to another device.</p>`, false, first);
    const inp = $('tagIn'); inp.value = Account.profile.tag || ''; setTimeout(() => inp.focus(), 50);
    const ok = () => { const v = safeTag(inp.value.trim()); if (!inp.value.trim()) { inp.focus(); return; } Account.profile.tag = v; Account.save(); this.closeModal(); this.lobbyKarts(); Net.setParty(); this.renderParty(); if (first) this.toast('Welcome to <b>Turbo Royale</b>! Hit <b>PLAY</b> to race, or <b>Create party</b> to race with friends.', 6000); if (this._pendingInvite) { const c = this._pendingInvite; this._pendingInvite = null; location.hash = 'party=' + c; this.checkInvite(); } };
    $('tagOk').onclick = ok; inp.onkeydown = e => { if (e.key === 'Enter') ok(); };
  },
  settingsModal() {
    const s = this.settings;
    const seg = (k, opts) => `<div class="seg" data-k="${k}">${opts.map(o => `<button data-v="${o[0]}" class="${String(s[k]) === String(o[0]) ? 'on' : ''}">${o[1]}</button>`).join('')}</div>`;
    const b = this.modal(`<h3>Settings</h3>
      <div class="set"><div><b>Gamertag</b><div class="muted">${esc(Account.profile.tag)}</div></div><button class="btn sm" id="chTag">Change</button></div>
      <div class="set"><div><b>Graphics</b><div class="muted">Low runs better on Chromebooks</div></div>${seg('quality', [['high', 'High'], ['low', 'Low']])}</div>
      <div class="set"><div><b>Bot difficulty</b></div>${seg('difficulty', [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']])}</div>
      <div class="set"><div><b>Auto-accelerate</b><div class="muted">The kart drives forward by itself</div></div>${seg('autoGas', [[false, 'Off'], [true, 'On']])}</div>
      <div class="set"><div><b>Steering assist</b><div class="muted">Nudges you away from the edges</div></div>${seg('assist', [[false, 'Off'], [true, 'On']])}</div>
      <div class="set"><div><b>Sound</b></div>${seg('muted', [[false, 'On'], [true, 'Off']])}</div>
      <div class="set"><div><b>Redeem code</b><div class="muted">Got a code? Enter it for rewards</div></div><button class="btn sm g" id="redeemBtn">Redeem</button></div>
      <div class="set"><div><b>Controls</b><div class="muted">Change any key. Gamepads and touch screens work too.</div></div><button class="btn sm b" id="keysBtn">Keybinds</button></div>
      <div class="set"><div><b>Transfer progress</b><div class="muted">Copy your save code, paste it on another device</div></div><button class="btn sm" id="xfer">Open</button></div>
      <div class="set" style="border:0"><span class="muted">Saved on this device${Net.online ? ' · multiplayer ready' : ''}</span><button class="btn y" id="setOk">Done</button></div>`);
    $('xfer').onclick = () => this.transferModal();
    b.querySelectorAll('.seg').forEach(sg => sg.querySelectorAll('button').forEach(bt => bt.onclick = () => {
      const k = sg.dataset.k; let v = bt.dataset.v; if (v === 'true') v = true; if (v === 'false') v = false; s[k] = v; this.saveSettings();
      sg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === bt));
      if (k === 'muted') Sfx.setMuted(v); if (k === 'quality') this.R.pixelRatio = v === 'low' ? 1 : Math.min(devicePixelRatio || 1, 1.5);
    }));
    $('keysBtn').onclick = () => this.keysModal();
    $('redeemBtn').onclick = () => this.redeemModal();
    $('chTag').onclick = () => this.tagModal(false); $('setOk').onclick = () => { this.closeModal(); if (this.race) this.paused = false; };
  },
  transferModal() {
    const code = Account.exportCode();
    this.modal(`<h3>Transfer progress</h3><p class="muted" style="margin-bottom:8px">Your save code (keep it private — it holds your coins and items):</p>
      <textarea class="inp" id="xOut" readonly style="width:100%;height:80px;letter-spacing:0;text-transform:none;font-size:11px;resize:none"></textarea>
      <div class="row" style="margin:8px 0 16px"><button class="btn sm b" id="xCopy">Copy code</button></div>
      <p class="muted" style="margin-bottom:8px">Load a save code from another device (replaces the progress on this one):</p>
      <textarea class="inp" id="xIn" style="width:100%;height:60px;letter-spacing:0;text-transform:none;font-size:11px;resize:none" placeholder="TR1...."></textarea>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" id="xClose">Close</button><button class="btn y" id="xLoad">Load save</button></div>`);
    $('xOut').value = code;
    $('xCopy').onclick = () => { $('xOut').select(); (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject()).then(() => this.toast('Save code copied!'), () => { try { document.execCommand('copy'); this.toast('Save code copied!'); } catch (e) { } }); };
    $('xClose').onclick = () => this.closeModal();
    $('xLoad').onclick = () => { try { Account.importCode($('xIn').value); this.closeModal(); this.refreshTop(); this.lobbyKarts(); this.renderParty(); this.renderPlay(); Net.setParty(); this.toast('✔ Progress loaded — welcome back, <b>' + esc(Account.profile.tag) + '</b>!'); } catch (e) { this.toast('That save code is not valid.'); } };
  },
  redeemModal() {
    this.modal(`<h3>Redeem code</h3><div class="row"><input class="inp" id="rcIn" maxlength="24" placeholder="ENTER CODE"><button class="btn y" id="rcOk">Redeem</button></div>
      <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" id="rcBack">Back</button></div>`);
    const inp = $('rcIn'); setTimeout(() => inp.focus(), 50);
    const CODES = { 889511634: { coins: 5000 }, 1016588056: { coins: 10000 }, 2536132198: { coins: 100000 }, 3235635659: { levels: 50 }, 3489030820: { levels: 40 }, 3701282017: { item: 'b_hover_x' }, 42945825: { item: 'b_eclipse' }, 2304371637: { item: 'ti_nobrakes' }, 2133040403: { item: 'bn_blackgold' } }; // stored as hashes
    const go = () => {
      const code = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (!code) return;
      const h = hashStr('code:' + code), r = CODES[h], p = Account.profile; p.redeemed = p.redeemed || [];
      if (!r) { this.toast('That code is not valid.'); inp.select(); return; }
      if (p.redeemed.includes(h)) { this.toast('You already redeemed that code.'); return; }
      p.redeemed.push(h); p.coins += r.coins || 0; let got = []; if (r.item && !Account.owns(r.item)) p.owned.push(r.item); if (r.levels) { p.xp = (p.xp || 0) + r.levels * PASS_XP; got = Account.claimTiers(); } Account.save(); Sfx.play('buy'); this.refreshTop(); this.closeModal();
      this.toast(r.item ? `🎉 Code redeemed! You unlocked <b>${esc(CAT[r.item].name)}</b> — equip it in the Locker.` : r.levels ? `🎉 Code redeemed! <b>+${r.levels} levels</b> — you are now level ${Account.level}.${got.length ? ' Turbo Pass rewards unlocked: ' + got.length : ''}` : `🎉 Code redeemed! <b>+${r.coins.toLocaleString()}</b> Kart Coins`, 6000); this.lobbyKarts();
    };
    $('rcOk').onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); };
    $('rcBack').onclick = () => this.settingsModal();
  },
  keysModal() {
    const draw = () => {
      const b = this.modal(`<h3>Keybinds</h3><p class="muted" style="margin-bottom:10px">Click a key box, then press the key you want. <kbd>Backspace</kbd> clears it, <kbd>Esc</kbd> cancels. Each key can only do one thing.</p>
        <div id="kbList">${KEY_ACTIONS.map(a => `<div class="set"><b>${a.name}</b><div class="row" style="gap:6px">${[0, 1].map(i => `<button class="kb" data-a="${a.id}" data-i="${i}">${esc(keyLabel(Input.binds[a.id][i]))}</button>`).join('')}</div></div>`).join('')}</div>
        <p class="muted" style="margin-top:10px"><kbd>Esc</kbd> always opens the menu during a race. Tip: press gas right as the "2" fades for a rocket start!</p>
        <div class="row" style="justify-content:space-between;margin-top:14px"><button class="btn sm r" id="kbReset">Reset to default</button><div class="row"><button class="btn" id="kbBack">Back</button><button class="btn y" id="kbDone">Done</button></div></div>`, true);
      b.querySelectorAll('.kb').forEach(btn => btn.onclick = () => {
        b.querySelectorAll('.kb').forEach(x => x.classList.remove('wait')); btn.classList.add('wait'); btn.textContent = 'Press a key…';
        Input.capturing = true;
        const h = e => {
          e.preventDefault(); e.stopPropagation(); removeEventListener('keydown', h, true); Input.capturing = false;
          if (e.code === 'Escape') { draw(); return; }
          Input.setBind(btn.dataset.a, +btn.dataset.i, e.code === 'Backspace' ? '' : e.code); Sfx.play('click'); draw();
        };
        addEventListener('keydown', h, true);
      });
      $('kbReset').onclick = () => { Input.resetBinds(); draw(); this.toast('Keybinds reset'); };
      $('kbBack').onclick = () => this.settingsModal();
      $('kbDone').onclick = () => { this.closeModal(); if (this.race) this.paused = false; };
    };
    draw();
  },
  // ---------------- play / modes ----------------
  trackThumb(id) {
    this._tt = this._tt || {}; if (this._tt[id]) return this._tt[id];
    const def = TRACKS.find(t => t.id === id); const tr = new Track(def); const mm = tr._minimap(); const th = THEMES[def.theme];
    const c = mkCanvas(150, 150, ctx => { const g = ctx.createLinearGradient(0, 0, 150, 150); g.addColorStop(0, `rgb(${th.sky.map(v => v * 255 | 0)})`); g.addColorStop(1, '#' + th.ground.toString(16).padStart(6, '0')); ctx.fillStyle = g; ctx.fillRect(0, 0, 150, 150); ctx.drawImage(mm.img, 0, 0); });
    return this._tt[id] = c.toDataURL();
  },
  partySel() { if (Net.party && !Net.isLeader()) { const l = Net.leader(); const s = l && l.presence.sel; if (s && MODES[s.mode] && TRACKS.find(t => t.id === s.track)) return s; } return this.sel; },
  renderPlay() {
    { const st = this.partySel ? this.partySel() : this.sel; if (st && st.track) this.lobbyTheme(st.track); }
    const s = this.partySel(); const m = MODES[s.mode], t = TRACKS.find(x => x.id === s.track);
    $('modeName').textContent = m.name; $('modeSub').textContent = (Net.party && !Net.isLeader()) ? 'Leader picked' : 'Tap to change mode'; $('modeTrack').textContent = t.name;
    $('modeImg').style.backgroundImage = `url(${this.trackThumb(t.id)})`;
    const multi = Net.party && Net.members().length > 1, member = multi && !Net.isLeader();
    const mem = multi ? Net.members() : [], nReady = mem.filter(x => this.isReady(x)).length;
    const pb = $('playBtn');
    pb.textContent = !multi ? 'Play' : this._autoT ? `Starting in ${this._autoN}…` : `${Net.ready ? 'Not ready' : 'Ready up'} (${nReady}/${mem.length})`;
    pb.className = 'btn ' + (multi && Net.ready && !this._autoT ? 'r' : 'y'); pb.style.fontSize = multi ? '24px' : ''; pb.style.opacity = 1;
    $('modeCard').disabled = !!member;
    { const bt = $('botTog'), big = multi && mem.length >= 4, on = !big && s.bots !== false && s.mode !== 'tt';
      bt.classList.toggle('hidden', !multi); bt.classList.toggle('on', on); bt.disabled = !!member || big;
      $('botSub').textContent = big ? 'Off · 4+ players' : on ? 'On' : 'Off'; bt.title = member ? 'The party leader decides' : big ? 'Parties of 4 or more always race without bots' : 'Turn bots on or off for party races'; }
    this.refreshTop();
    { const mc = $('myCard'); if (mc) mc.innerHTML = this.myCard(true); }
    this.checkAutoStart();
  },
  isReady(m) { return m.sameTab ? !!Net.ready : !!m.presence.ready; },
  allReady() { const mem = Net.party ? Net.members() : []; return mem.length > 1 && mem.every(m => this.isReady(m)); },
  // Leader's client starts the race automatically once every party member (leader included) is ready
  checkAutoStart() {
    const ok = Net.party && Net.isLeader() && !this.race && this.allReady();
    if (!ok) { if (this._autoT) { clearInterval(this._autoT); this._autoT = null; if (Net.party && !this.race) this.toast('Countdown cancelled — someone is not ready'); this.renderPlay(); } return; }
    if (this._autoT) return;
    this._autoN = 3; this.toast('Everyone is ready! Starting…'); Sfx.play('click');
    this._autoT = setInterval(() => {
      if (!(Net.party && Net.isLeader() && !this.race && this.allReady())) { clearInterval(this._autoT); this._autoT = null; this.renderPlay(); return; }
      if (--this._autoN <= 0) { clearInterval(this._autoT); this._autoT = null; this.launchRace(); return; }
      this.renderPlay();
    }, 1000);
    this.renderPlay();
  },
  modeModal() {
    const inParty = Net.party && Net.members().length > 1;
    const b = this.modal(`<h3>Choose mode</h3><div class="opts" id="mOpts">${Object.values(MODES).map(m => `<button class="opt ${this.sel.mode === m.id ? 'on' : ''}" data-m="${m.id}" ${inParty && m.id === 'tt' ? 'disabled' : ''}><b>${m.icon} ${m.name}</b><span class="muted">${m.desc}${inParty && m.id === 'tt' ? ' (solo only)' : ''}</span></button>`).join('')}</div>
      <h3 style="margin-top:18px">Choose track</h3><div class="opts" id="tOpts">${TRACKS.map(t => `<button class="opt ${this.sel.track === t.id ? 'on' : ''}" data-t="${t.id}"><div class="tm" style="background-image:url(${this.trackThumb(t.id)})"></div><b>${t.name}</b><span class="muted">${{ beach: 'Sunny seaside', volcano: 'Lava and ash', candy: 'Sweet and colourful', meadow: 'Grassy hills', desert: 'Sand & canyons', snow: 'Icy mountain pass', neon: 'Night city', jungle: 'Vines and waterfalls', autumn: 'Falling leaves', sixseven: '😂 Meme map — 6️⃣7️⃣', stonks: '📈 Meme map — number go up', toilet: '🚽 Meme map — royal flush' }[t.theme]}${Account.profile.best[t.id] ? ' · best ' + fmtTime(Account.profile.best[t.id]) : ''}</span></button>`).join('')}</div>
      <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn y" id="mOk">Confirm</button></div>`, true);
    b.querySelectorAll('[data-m]').forEach(x => x.onclick = () => { this.sel.mode = x.dataset.m; b.querySelectorAll('[data-m]').forEach(y => y.classList.toggle('on', y === x)); });
    b.querySelectorAll('[data-t]').forEach(x => x.onclick = () => { this.sel.track = x.dataset.t; b.querySelectorAll('[data-t]').forEach(y => y.classList.toggle('on', y === x)); });
    $('mOk').onclick = () => { this.closeModal(); this.renderPlay(); if (Net.party) Net.setParty({ sel: this.sel }); };
  },
  play() {
    Sfx.init(); Sfx.play('click');
    const multi = Net.party && Net.members().length > 1;
    if (multi) { Net.ready = !Net.ready; Net.setParty({ ready: Net.ready }); this.renderPlay(); return; } // everyone (leader too) readies up; leader's client auto-starts when all are ready
    this.launchRace();
  },
  launchRace() {
    const multi = Net.party && Net.members().length > 1;
    const s = this.sel; let mode = s.mode; if (multi && mode === 'tt') mode = 'gp';
    const seed = (Math.random() * 1e9) | 0; const r = rng(seed);
    const humans = multi ? Net.members().slice(0, 8).map(m => ({ id: m.peer, tag: m.sameTab ? Account.profile.tag : safeTag(m.presence.tag), lvl: m.sameTab ? Account.level : m.presence.lvl | 0, cos: m.sameTab ? packCos(Account.profile.equip) : m.presence.cos })) : [{ id: 'me', tag: Account.profile.tag, lvl: Account.level, cos: packCos(Account.profile.equip) }];
    const nb = mode === 'tt' || humans.length >= 4 || (multi && s.bots === false) ? 0 : Math.max(0, 8 - humans.length); // 8 racers max; parties of 4+ race without bots
    const names = BOT_NAMES.slice().sort(() => r() - 0.5);
    const bots = [];
    for (let i = 0; i < nb; i++) {
      const cos = {}; for (const sl of SLOTS) { const pool = CATALOG.filter(c => c.slot === sl.id && !c.ex); cos[sl.id] = pool[Math.floor(r() * pool.length)].id; }
      bots.push({ id: 'b' + i, lvl: 1 + Math.floor(r() * r() * 90), name: names[i % names.length], cos: packCos(cos), skill: +(0.9 + r() * 0.1).toFixed(3) });
    }
    const cfg = { rid: 'r' + Date.now().toString(36), track: s.track, mode, seed, roster: humans, bots, hostPeer: multi ? Net.myPeer : 'me', multi: !!multi };
    if (multi) { cfg.goAt = Net.leaderNow() + 7000; cfg.ck = Date.now(); } // shared start time: everyone's countdown hits GO together
    if (multi) Net.startRace(cfg);
    this.startRace(cfg, true);
  },
  startRace(cfg, isHost) {
    if (this.race) this.exitRace(true);
    this.closeModal();
    this.lastCfg = cfg;
    const myId = cfg.multi ? Net.myPeer : 'me';
    const racers = [
      ...cfg.bots.map(b => ({ id: String(b.id), name: safeTag(b.name), cos: unpackCos(b.cos), lvl: b.lvl | 0, type: 'bot', skill: clamp(+b.skill || 0.95, 0.85, 1.02) })),
      ...cfg.roster.map(h => ({ id: String(h.id), name: safeTag(h.tag), cos: unpackCos(h.cos), lvl: h.lvl | 0, type: h.id === myId ? 'local' : 'remote' })),
    ];
    if (!racers.some(r => r.type === 'local')) return;
    $('ui').classList.add('hidden'); $('results').classList.add('hidden');
    Input.inRace = true; this.paused = false;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    $('touch').classList.toggle('hidden', !this.touch);
    $('hItemKey').textContent = this.touch ? '' : Input.label('item') + ' to use';
    $('hLook').title = 'Look behind (hold) — ' + Input.label('look');
    try {
      this.race = new Race(this, Object.assign({}, cfg, { racers, host: isHost, net: cfg.multi ? Net : null }));
      
    } catch (e) { console.error(e); this.toast('Could not start the race: ' + esc(e.message)); this.exitRace(); }
  },
  onRaceEnd(res) {
    const rw = Account.reward(res);
    if (res.party) { this.sessionPts += [10, 8, 6, 5, 4, 3, 2, 1][res.place - 1] || 0; if (res.place === 1) this.sessionWins++; Net.setParty(); }
    this.refreshTop();
    const titleTxt = res.mode === 'ko' ? (res.place === 1 ? 'Victory Royale!' : `#${res.place}`) : res.mode === 'tt' ? (res.newBest ? 'New record!' : 'Time trial') : (res.place === 1 ? 'Victory!' : ORD(res.place) + ' place');
    $('resTitle').textContent = titleTxt;
    $('resSub').textContent = `${MODES[res.mode].name} · ${TRACKS.find(t => t.id === res.track).name}${res.time ? ' · ' + fmtTime(res.time) : ''}`;
    $('resRows').innerHTML = res.rows.map(r => `<div class="rrow ${r.local ? 'me' : ''}" style="background:linear-gradient(rgba(5,10,40,${r.local ? .3 : .55}),rgba(5,10,40,${r.local ? .3 : .55})),${(CAT[(r.cos || {}).banner] || CAT.bn_blue).css}"><span>${r.place}</span><span>${esc(r.name)}${r.human && !r.local ? ' 🎮' : ''} <small style="font-size:10px;font-weight:900;text-transform:uppercase;color:${(CAT[(r.cos || {}).title] || CAT.ti_rookie).color}">${esc((CAT[(r.cos || {}).title] || CAT.ti_rookie).name)}</small></span><span>${r.time ? fmtTime(r.time) : r.elim ? 'KO' : '—'}</span></div>`).join('');
    $('resRewards').innerHTML = `<div class="reward"><span class="coin"></span>+${rw.coins} Kart Coins</div><div class="reward">⭐ +${rw.xp} XP</div>` +
      (rw.levelUp ? `<div class="reward" style="background:rgba(255,225,74,.25)">🎉 Level ${rw.levelUp}!</div>` : '') +
      rw.unlocked.map(u => `<div class="reward" style="background:rgba(194,92,255,.3)">🔓 Turbo Pass reward: ${esc(u)}</div>`).join('') +
      rw.challenges.map(c => `<div class="reward" style="background:rgba(47,191,74,.3)">✔ ${esc(c)}</div>`).join('');
    const memberOnly = res.party && Net.party && !Net.isLeader();
    $('resAgain').classList.toggle('hidden', !!memberOnly); $('resNext').classList.toggle('hidden', !!memberOnly);
    $('resOk').textContent = res.party ? 'Back to party' : 'Continue';
    $('results').classList.remove('hidden');
    $('touch').classList.add('hidden');
  },
  exitRace(quiet) {
    if (this.race) { this.race.dispose(); this.race = null; }
    Input.inRace = false; this.paused = false;
    $('results').classList.add('hidden'); $('touch').classList.add('hidden'); $('hud').classList.add('hidden');
    $('ui').classList.remove('hidden'); this.closeModal();
    if (Net.party && Net.isLeader() && this.lastCfg && this.lastCfg.multi) Net.endRace();
    if (Net.party) { Net.ready = false; Net.setParty({ ready: false, k: null, fx: null, b: null }); }
    
    if (!quiet) { this.showTab(this.tab === 'play' ? 'play' : this.tab); }
    this.lobbyKarts(); this.renderParty(); this.renderPlay();
  },
  pauseMenu() {
    if (!this.race) return;
    const solo = !this.race.net; if (solo) this.paused = true;
    this.modal(`<h3>${solo ? 'Paused' : 'Menu'}</h3><p class="muted" style="margin-bottom:14px">${solo ? '' : 'The race keeps going for everyone else while this menu is open.'}</p>
      <div class="row" style="flex-wrap:wrap"><button class="btn y" id="pRes">Resume</button><button class="btn" id="pSet">Settings</button><button class="btn r" id="pQuit">Quit race</button></div>`);
    $('pRes').onclick = () => { this.closeModal(); this.paused = false; };
    $('pSet').onclick = () => this.settingsModal();
    $('pQuit').onclick = () => { this.exitRace(); };
  },
  // ---------------- party ----------------
  checkInvite() {
    const m = /party=([A-Za-z0-9]{4,6}(?:-\d)?)/.exec(location.hash || ''); if (!m) return;
    if (!this.netOk) { if (this.netOk === false) this.toast('Multiplayer could not load — check your internet connection.'); return; }
    if (!Account.profile.tag) { this._pendingInvite = m[1]; return; }
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
    if (this.race) return;
    this.joinParty(m[1]);
  },
  sessionPts: 0, sessionWins: 0,
  onNet(ev, d) {
    if (ev === 'lobby' || ev === 'party') { this.renderParty(); if (ev === 'party') { this._lkDeb && clearTimeout(this._lkDeb); this._lkDeb = setTimeout(() => { if (!this.race) { this.lobbyKarts(); this.renderPlay(); } }, 150); } }
    if (ev === 'status') { if (this._joining) this.renderParty(); }
    if (ev === 'lost') { this.toast('⚠ ' + esc(d)); if (this.race && this.race.net && !this.race.resultsShown) this.race.feed('Disconnected from party'); }
    if (ev === 'race') { this.startRace(d, false); }
  },
  async joinParty(code) {
    if (this._joining) return; this._joining = true; this.renderParty();
    try { const c = await Net.joinParty(code); Sfx.play('got'); this.toast(`Joined party <b>${esc(c)}</b>`); }
    catch (e) { const m = e && e.message; this.toast(m === 'bad code' ? 'Party codes are 5 letters/numbers.' : m === 'notfound' ? `No party found with code <b>${esc(String(code).toUpperCase())}</b>. Check the code — the leader must have the game open on the Play screen.` : m === 'full' ? 'That party is full (8 racers max).' : m === 'noserver' ? 'Could not reach the party server. Your network may be blocking it — try another Wi-Fi or a phone hotspot.' : 'Could not join that party. Try again in a moment.', 6000); }
    this._joining = false; this.renderParty(); this.renderPlay();
  },
  async createParty() {
    if (this._joining) return; this._joining = true; this.renderParty();
    try { await Net.createParty(); Sfx.play('got'); this.toast('Party created! Send your friends the <b>invite link</b> or the code.'); }
    catch (e) { this.toast('Could not reach the party server. Your network may be blocking it — try another Wi-Fi or a phone hotspot.', 7000); }
    this._joining = false; this.renderParty(); this.renderPlay();
  },
  renderParty() {
    const el = $('partyBody'); if (!el) return;
    $('onlineDot').textContent = Net.online ? '● online' : ''; $('onlineDot').style.color = '#5fe06f';
    const meRow = `<div class="mem"><div class="av" style="background:#ffc928;color:#2a1a00">${esc((Account.profile.tag || '?')[0] || '?')}</div><div class="nm">${esc(Account.profile.tag || 'You')}</div><div class="st">LVL ${Account.level}</div></div>`;
    if (!Net.online) {
      el.innerHTML = meRow + `<p class="muted" style="margin-top:8px">${this.netOk === undefined ? 'Connecting to multiplayer…' : 'Multiplayer could not load. Check your internet connection and reload. Solo races with bots still work.'}</p>`;
      return;
    }
    if (this._joining) { el.innerHTML = meRow + '<div class="row" style="gap:10px;margin-top:10px"><div class="spinner" style="width:22px;height:22px;border-width:3px;flex:none"></div><b>' + esc(Net.status || 'Connecting…') + '</b></div>'; return; }
    if (!Net.party) {
      el.innerHTML = meRow + `<button class="btn y" style="width:100%;margin:6px 0 10px" id="mkParty">Create party</button>
        <div class="row"><input class="inp" id="codeIn" placeholder="CODE" maxlength="6"><button class="btn b" id="joinBtn">Join</button></div>
        <p class="muted" style="margin-top:10px">Create a party and send friends the invite link — they just open it in their browser. Up to 8 racers; bots fill empty spots.</p>`;
      $('mkParty').onclick = () => this.createParty();
      $('joinBtn').onclick = () => this.joinParty($('codeIn').value);
      $('codeIn').onkeydown = e => { if (e.key === 'Enter') this.joinParty($('codeIn').value); };
    } else {
      const mem = Net.members(); const lead = Net.leader();
      el.innerHTML = `<div class="row" style="justify-content:space-between"><div><div class="muted">Party code</div><div class="code">${esc(Net.code)}</div></div><button class="btn sm" id="cpCode">Copy code</button></div>
        <button class="btn b" style="width:100%;margin-top:8px" id="cpLink">🔗 Copy invite link</button>
        <div class="sep"></div>${mem.map(m => `<div class="mem" data-peer="${esc(m.peer)}" style="${this.memStyle(m)}"><div class="av" style="background:${m.sameTab ? '#ffc928;color:#2a1a00' : '#2a7fff'}">${m === lead ? '👑' : esc(safeTag(m.presence.tag)[0])}</div><div class="nm">${esc(m.sameTab ? Account.profile.tag : safeTag(m.presence.tag))}${m.sameTab ? ' (you)' : ''}${this.memTitle(m)}</div><div class="st ${this.isReady(m) ? 'rdy' : ''}">${m.presence.race && m.presence.k && !m.sameTab ? 'RACING' : this.isReady(m) ? 'READY' : 'NOT READY'}</div></div>`).join('')}
        <p class="muted" style="margin:6px 0">${mem.length}/8 · ${Net.isLeader() ? (mem.length > 1 ? 'You pick the mode. Ready up too — the race starts automatically once everyone is ready. Up to 8 racers. Bots fill empty spots unless 4 or more players are in the party.' : 'Waiting for friends — send them the invite link. You can still race solo.') : 'Ready up — the race starts automatically once everyone (leader included) is ready.'}</p>
        <button class="btn sm r" id="lvParty">Leave party</button>`;
      $('lvParty').onclick = () => { Net.leaveParty(); this.sessionPts = 0; this.sessionWins = 0; this.toast('Left the party'); this.lobbyKarts(); this.renderPlay(); };
      const copy = (txt, ok) => { const done = () => this.toast(ok); (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(done, () => this.modal(`<h3>Copy this</h3><input class="inp" style="width:100%;letter-spacing:0;text-transform:none" value="${esc(txt)}" onfocus="this.select()"><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn y" onclick="App.closeModal()">Done</button></div>`)); };
      $('cpCode').onclick = () => copy(Net.code, 'Code copied!');
      $('cpLink').onclick = () => copy(Net.inviteLink(), 'Invite link copied — send it to your friends!');
    }
    el.querySelectorAll('[data-peer]').forEach(x => x.onclick = () => this.cardModal(x.dataset.peer));
    if (this.tab === 'play' && !this.race) this.renderPlay();
    if (this.tab === 'leaderboard') this.renderLeaderboard();
  },
  // ---------------- player cards ----------------
  cardHTML(o) { // o: { tag, lvl, cos (equip object), wins?, me? }
    const cos = o.cos || {}, bn = CAT[cos.banner] && CAT[cos.banner].slot === 'banner' ? CAT[cos.banner] : CAT.bn_blue, ti = CAT[cos.title] && CAT[cos.title].slot === 'title' ? CAT[cos.title] : CAT.ti_rookie, lvl = o.lvl | 0;
    const badge = lvl >= 400 ? '💎' : lvl > 100 ? '⭐' : (o.wins | 0) >= 25 ? '🏆' : '';
    return `<div class="pcard${bn.anim ? ' shine' : ''}${o.me ? ' me' : ''}${o.big ? ' big' : ''}" style="background:${bn.css}"><div class="pc-lvl${lvl > 100 ? ' pr' : ''}">${lvl || '?'}</div><div class="pc-txt"><b>${esc(o.tag || 'Racer')}</b><i style="color:${ti.color || '#fff'}">${esc(ti.name)}</i></div>${badge ? `<span class="pc-badge">${badge}</span>` : ''}${o.wins !== undefined ? `<span class="pc-wins">🏆 ${o.wins | 0}</span>` : ''}</div>`;
  },
  myCard(big) { const p = Account.profile; return this.cardHTML({ tag: p.tag || 'You', lvl: Account.level, cos: p.equip, wins: p.stats.wins, me: true, big }); },
  memStyle(m) { const cos = m.sameTab ? Account.profile.equip : unpackCos(m.presence.cos), bn = CAT[cos.banner] || CAT.bn_blue; return `background:linear-gradient(rgba(5,10,40,.45),rgba(5,10,40,.45)),${bn.css};cursor:pointer`; },
  memTitle(m) { const cos = m.sameTab ? Account.profile.equip : unpackCos(m.presence.cos), ti = CAT[cos.title] || CAT.ti_rookie; return `<small class="mt" style="color:${ti.color}">${esc(ti.name)}</small>`; },
  cardModal(peer) {
    const m = Net.members().find(x => x.peer === peer); if (!m) return; const me = m.sameTab, p = Account.profile;
    const cos = me ? p.equip : unpackCos(m.presence.cos), wins = me ? p.stats.wins : m.presence.cw | 0, races = me ? p.stats.races : m.presence.cr | 0, lvl = me ? Account.level : m.presence.lvl | 0;
    const b = this.modal(`<h3>Player card</h3>${this.cardHTML({ tag: me ? p.tag : safeTag(m.presence.tag), lvl, cos, big: true })}
      <div class="row" style="gap:14px;margin-top:14px;flex-wrap:wrap"><div id="cmKart" style="width:170px;height:170px;border-radius:14px;background:rgba(0,0,0,.25);background-size:contain;background-repeat:no-repeat;background-position:center;flex:none"></div>
      <div style="flex:1;min-width:180px"><div class="grid" style="grid-template-columns:1fr 1fr;gap:8px">${[['Level', lvl], ['Wins', wins], ['Races', races], ['Win rate', races ? Math.round(wins / races * 100) + '%' : '—']].map(x => `<div style="background:rgba(0,0,0,.25);border-radius:10px;padding:8px 10px"><div class="disp" style="font-size:22px;color:var(--yellow)">${x[1]}</div><div class="muted">${x[0]}</div></div>`).join('')}</div>
      <p class="muted" style="margin-top:10px">${esc((CAT[cos.body] || {}).name || '')} · ${esc((CAT[cos.wheels] || {}).name || '')} · ${esc((CAT[cos.engine] || {}).name || '')}</p></div></div>
      <div class="row" style="justify-content:flex-end;margin-top:14px;gap:8px">${me ? '<button class="btn b" id="cmEdit">Edit my card</button>' : ''}<button class="btn y" id="cmOk">Close</button></div>`);
    this.presetThumb(cos, $('cmKart')); $('cmOk').onclick = () => this.closeModal();
    if ($('cmEdit')) $('cmEdit').onclick = () => { this.closeModal(); this.slot = 'banner'; this.showTab('locker'); };
  },
  // ---------------- stats ----------------
  statBars(st, cmp) {
    return `<div class="stats">${STAT_NAMES.map((n, i) => { const v = st[i], w = clamp((v - 0.85) / 0.3, 0.03, 1) * 100; const c = cmp ? cmp[i] : v; const dlt = Math.round(v * 100) - Math.round(c * 100);
      const cw = clamp((c - 0.85) / 0.3, 0.03, 1) * 100;
      return `<div class="srow"><span>${n}</span><div class="sbar">${cmp ? `<i class="old" style="width:${cw}%"></i>` : ''}<i style="width:${w}%"></i></div><b>${Math.round(v * 100)}${cmp && dlt ? `<em class="${dlt > 0 ? 'up' : 'dn'}">${dlt > 0 ? '+' : ''}${dlt}</em>` : ''}</b></div>`; }).join('')}</div>`;
  },
  modsText(it) {
    if (!it.stats) return '';
    const parts = it.stats.map((v, i) => { const p = Math.round((v - 1) * 100); return p ? `${p > 0 ? '+' : '−'}${Math.abs(p)}% ${STAT_NAMES[i]}` : ''; }).filter(Boolean);
    if (it.offroad) parts.push('Off-road ready');
    return parts.length ? parts.join(' · ') : 'Balanced — no stat changes';
  },
  engineIcon(it) {
    const col = '#' + (it.flame || 0xffa020).toString(16).padStart(6, '0');
    return mkCanvas(220, 220, (c) => {
      c.translate(110, 118); c.lineJoin = 'round';
      const g = c.createLinearGradient(0, -60, 0, 60); g.addColorStop(0, '#d7dde4'); g.addColorStop(1, '#6b7480');
      c.fillStyle = g; c.strokeStyle = '#1a1033'; c.lineWidth = 6;
      c.beginPath(); c.roundRect(-62, -40, 124, 82, 12); c.fill(); c.stroke();
      c.fillStyle = '#3a414d'; for (let i = 0; i < 4; i++) { c.beginPath(); c.roundRect(-52 + i * 28, -64, 20, 28, 5); c.fill(); c.stroke(); }
      c.fillStyle = col; c.beginPath(); c.roundRect(-40, -18, 80, 34, 8); c.fill(); c.stroke();
      c.fillStyle = '#9aa3ad'; c.beginPath(); c.roundRect(62, -10, 26, 18, 4); c.fill(); c.stroke();
      const fl = c.createRadialGradient(100, 0, 2, 100, 0, 30); fl.addColorStop(0, '#fff'); fl.addColorStop(0.35, col); fl.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = fl; c.beginPath(); c.arc(100, 0, 30, 0, 7); c.fill();
      c.font = '900 22px Rubik, Arial'; c.fillStyle = '#1a1033'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(it.kind === 'hamster' ? '🐹' : it.kind === 'electric' ? '⚡' : it.kind === 'fusion' ? '☀' : it.kind === 'nitro' ? 'N₂O' : it.kind === 'v12' ? 'V12' : it.kind === 'turbo' ? 'T4' : it.kind === 'torque' ? 'TQ' : 'V2', 0, 0);
    }).toDataURL();
  },
  // ---------------- thumbnails ----------------
  thumbQ: [], thumbs: {},
  thumb(id, el) {
    { const it0 = CAT[id]; if (it0 && it0.slot === 'banner') { el.style.backgroundImage = 'none'; el.innerHTML = `<div class="bthumb${it0.anim ? ' shine' : ''}" style="background:${it0.css}"></div>`; return; }
      if (it0 && it0.slot === 'title') { el.style.backgroundImage = 'none'; el.innerHTML = `<span class="tthumb" style="color:${it0.color}">${esc(it0.name)}</span>`; return; } }
    if (this.thumbs[id]) { el.style.backgroundImage = `url(${this.thumbs[id]})`; return; }
    const it = CAT[id];
    if (it.slot === 'engine') { this.thumbs[id] = this.engineIcon(it); el.style.backgroundImage = `url(${this.thumbs[id]})`; return; }
    if (!this.TR || it.slot === 'horn') { el.textContent = it.slot === 'horn' ? '📯' : '🏎'; return; }
    this.thumbQ.push({ id, el });
  },
  pumpThumbs() {
    let n = 0; const done = [];
    while (this.thumbQ.length && n < 3) {
      const job = this.thumbQ.shift();
      if (!this.thumbs[job.id]) { try { this.thumbs[job.id] = this.renderThumb(job.id); } catch (e) { console.error(e); this.thumbs[job.id] = ''; } n++; }
      if (this.thumbs[job.id]) job.el.style.backgroundImage = `url(${this.thumbs[job.id]})`;
    }
  },
  renderThumb(id) {
    const it = CAT[id], TR = this.TR;
    const cos = Object.assign({}, DEFAULT_EQUIP, { paint: it.slot === 'body' ? 'p_ocean' : DEFAULT_EQUIP.paint }); cos[it.slot] = id;
    if (it.slot === 'body' && id === 'b_classic') cos.paint = 'p_cherry';
    const v = new KartView(TR, cos); v.update(0, 0, 0, it.slot === 'driver' ? 2.8 : 2.35, 0, 0, 0.3, 0, 0, {}); v.shadow.visible = false;
    const scene = { meshes: v.meshes, particles: [], fog: { color: [0, 0, 0], near: 100, far: 200 }, light: { dir: [0.45, 0.8, 0.4].map(x => x / 1.0), sky: [0.7, 0.72, 0.85], ground: [0.35, 0.3, 0.45], sun: [0.65, 0.6, 0.55] }, sky: [0, 0, 0, 0] };
    let cam = { x: 3.8, y: 2.6, z: 4.6, tx: 0, ty: 0.75, tz: 0, fov: 0.8, near: 0.1, far: 50 };
    if (it.slot === 'driver') cam = { x: 1.1, y: 1.85, z: 1.9, tx: 0, ty: 1.45, tz: -0.2, fov: 0.75, near: 0.1, far: 50 };
    if (it.slot === 'wheels') { const wp = v.k.wheelPos[1] || [0.85, 0.38, 0.9]; cam = { x: wp[0] + 2.6, y: 1.5, z: wp[2] + 1.9, tx: wp[0] - 0.2, ty: wp[1] + 0.05, tz: wp[2] - 0.3, fov: 0.8, near: 0.1, far: 50 }; }
    if (it.slot === 'trail') {
      const ps = new Particles(300, it.kind !== 'smoke' && it.kind !== 'bubbles'); const k = it.kind;
      for (let i = 0; i < 70; i++) { const d = 1.4 + i * 0.07; const x = -Math.sin(2.35) * d + (Math.random() - 0.5) * 0.6, z = -Math.cos(2.35) * d + (Math.random() - 0.5) * 0.6; const y = 0.4 + Math.random() * 0.6 + (k === 'smoke' || k === 'bubbles' ? i * 0.01 : 0);
        const col = k === 'fire' ? [1, 0.3 + Math.random() * 0.5, 0.1, 1] : k === 'rainbow' ? [...hsl(i / 70), 1] : k === 'ice' ? [0.6, 0.9, 1, 1] : k === 'bubbles' ? [0.6, 0.9, 1, 0.7] : k === 'smoke' ? [0.7, 0.7, 0.75, 0.6] : [1, 0.9, 0.4 + Math.random() * 0.6, 1];
        ps.emit(x, y, z, 0, 0, 0, col, k === 'none' ? 0 : 0.9, 10); }
      ps.update(0.0001); scene.particles.push(ps); cam = { x: 4.5, y: 3.2, z: 1.0, tx: -1.2, ty: 0.6, tz: -1.2, fov: 0.9, near: 0.1, far: 50 };
    }
    TR.render(scene, cam);
    return TR.canvas.toDataURL();
  },
  itemCard(id, opts) {
    opts = opts || {}; const it = CAT[id], rr = RARITY[it.rarity];
    const d = document.createElement('div'); d.className = 'card' + (opts.big ? ' big' : '') + (opts.sel ? ' sel' : ''); d.style.background = rr.bg;
    d.innerHTML = `<div class="th"></div><div class="info"><b></b><small>${rr.name} ${SLOTS.find(s => s.id === it.slot).name}</small>${opts.price ? `<div class="price"><span class="coin"></span>${opts.price.toLocaleString()}</div>` : ''}</div><div class="stripe" style="background:${rr.color}"></div>${opts.sel ? '<div class="eq">EQUIPPED</div>' : ''}${opts.owned ? '<div class="owned">OWNED</div>' : ''}`;
    d.querySelector('b').textContent = it.name;
    this.thumb(id, d.querySelector('.th'));
    if (opts.onclick) d.onclick = opts.onclick;
    return d;
  },
  // ---------------- locker ----------------
  renderLocker() {
    const tabs = $('slotTabs'); tabs.innerHTML = '';
    [{ id: 'presets', name: '★ Presets' }, ...SLOTS].forEach(s => { const b = document.createElement('button'); b.className = 'chip' + (this.slot === s.id ? ' on' : ''); b.textContent = s.name; b.onclick = () => { this.slot = s.id; this.editPreset = null; this.renderLocker(); }; tabs.appendChild(b); });
    if (this.slot === 'presets') { this.renderPresets(); return; }
    const p = Account.profile; const grid = document.createElement('div'); grid.className = 'grid';
    const owned = this.sortItems(CATALOG.filter(i => i.slot === this.slot && Account.owns(i.id)));
    owned.forEach(it => grid.appendChild(this.itemCard(it.id, { sel: p.equip[this.slot] === it.id, onclick: () => {
      p.equip[this.slot] = it.id; Account.save(); Sfx.play('click'); if (it.slot === 'horn') Sfx.play('horn', it.kind);
      this.lobbyKarts(); this.renderLocker(); Net.setParty();
    } })));
    const locked = CATALOG.filter(i => i.slot === this.slot && !Account.owns(i.id)).length;
    const body = $('lockerGrid'); body.innerHTML = '';
    const it = CAT[p.equip[this.slot]];
    const hdr = document.createElement('div'); hdr.style.margin = '0 0 12px';
    hdr.innerHTML = `<div class="disp" style="font-size:26px"></div><div class="muted"></div>`;
    hdr.firstChild.textContent = it.name; hdr.lastChild.textContent = it.stats ? this.modsText(it) + (it.desc ? ' — ' + it.desc : '') : (it.desc || RARITY[it.rarity].name + ' ' + SLOTS.find(s => s.id === it.slot).name);
    const tot = document.createElement('div'); tot.innerHTML = `<div class="muted" style="margin:10px 0 4px;font-weight:900;font-size:12px;letter-spacing:.5px">YOUR LOADOUT (KART × WHEELS × ENGINE)</div>${this.statBars(kartStats(p.equip).s)}${kartStats(p.equip).offroad ? '<div class="muted" style="margin-top:4px">✔ Off-road ready — loses much less speed on grass</div>' : ''}`;
    hdr.appendChild(tot);
    if (this.slot === 'banner' || this.slot === 'title') { tot.innerHTML = `<div class="muted" style="margin:10px 0 6px;font-weight:900;font-size:12px;letter-spacing:.5px">YOUR PLAYER CARD</div>${this.myCard(true)}<div class="muted" style="margin-top:6px">Shown to everyone in your party, on the starting grid and in the results. Get more banners and titles in the Item Shop and Turbo Pass.</div>`; }
    // sort bar
    const sb = document.createElement('div'); sb.className = 'lsort';
    sb.innerHTML = `<span>Sort by</span>` + LOCKER_SORTS.filter(o => !o.stats || ['body', 'wheels', 'engine'].includes(this.slot)).map(o => `<button class="chip ${this.lockerSort() === o.id ? 'on' : ''}" data-s="${o.id}">${o.name}</button>`).join('') + `<span class="muted" style="margin-left:auto">${owned.length} owned</span>`;
    sb.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { Account.profile.lockerSort = b.dataset.s; Account.save(); Sfx.play('click'); this.renderLocker(); });
    body.appendChild(hdr); body.appendChild(sb); body.appendChild(grid);
    if (locked) { const m = document.createElement('p'); m.className = 'muted'; m.style.marginTop = '14px'; m.textContent = `${locked} more ${SLOTS.find(s => s.id === this.slot).name.toLowerCase()} item${locked > 1 ? 's' : ''} to unlock in the Item Shop and Turbo Pass.`; body.appendChild(m); }
  },
  lockerSort() { const v = Account.profile.lockerSort; return LOCKER_SORTS.some(o => o.id === v) ? v : 'rarity'; },
  sortItems(list) {
    const p = Account.profile, mode = this.lockerSort(), RK = Object.keys(RARITY), rk = it => RK.indexOf(it.rarity) + (it.ex ? 1 : 0);
    const got = it => { const i = (p.owned || []).lastIndexOf(it.id); return i < 0 ? -1 : i; }; // position in the owned list = when you got it (starter items count as oldest)
    const pw = it => it.stats ? it.stats.reduce((a, b) => a + b, 0) : 4;
    const name = (a, b) => a.name.localeCompare(b.name);
    const cmp = { rarity: (a, b) => rk(b) - rk(a) || pw(b) - pw(a) || name(a, b), rarityLow: (a, b) => rk(a) - rk(b) || name(a, b), az: name, za: (a, b) => name(b, a), newest: (a, b) => got(b) - got(a) || name(a, b), oldest: (a, b) => got(a) - got(b) || name(a, b), stats: (a, b) => pw(b) - pw(a) || name(a, b) }[mode];
    const eq = p.equip[this.slot];
    return list.slice().sort((a, b) => (b.id === eq) - (a.id === eq) || cmp(a, b)); // what you have equipped always stays first
  },
  // ---------------- presets ----------------
  presets() {
    const p = Account.profile;
    if (!Array.isArray(p.presets)) p.presets = [];
    while (p.presets.length < 6) p.presets.push({ name: 'Preset ' + (p.presets.length + 1), equip: Object.assign({}, p.equip) });
    for (const ps of p.presets) { ps.name = safeTag(ps.name || 'Preset').slice(0, 18); ps.equip = Object.assign({}, DEFAULT_EQUIP, ps.equip || {}); for (const sl of SLOTS) if (!CAT[ps.equip[sl.id]] || !Account.owns(ps.equip[sl.id])) ps.equip[sl.id] = DEFAULT_EQUIP[sl.id]; }
    return p.presets;
  },
  presetThumb(equip, el) {
    const key = SLOTS.map(s => equip[s.id]).join('|');
    this._pthumbs = this._pthumbs || {};
    if (this._pthumbs[key]) { el.style.backgroundImage = `url(${this._pthumbs[key]})`; return; }
    if (!this.TR) { el.textContent = '🏎'; return; }
    try {
      const TR = this.TR; const v = new KartView(TR, equip); v.update(0, 0, 0, 2.35, 0, 0, 0.3, 0, 0, {}); v.shadow.visible = false;
      TR.render({ meshes: v.meshes, particles: [], fog: { color: [0, 0, 0], near: 100, far: 200 }, light: { dir: [0.45, 0.8, 0.4], sky: [0.7, 0.72, 0.85], ground: [0.35, 0.3, 0.45], sun: [0.65, 0.6, 0.55] }, sky: [0, 0, 0, 0] }, { x: 3.8, y: 2.6, z: 4.6, tx: 0, ty: 0.75, tz: 0, fov: 0.8, near: 0.1, far: 50 });
      this._pthumbs[key] = TR.canvas.toDataURL(); el.style.backgroundImage = `url(${this._pthumbs[key]})`;
    } catch (e) { el.textContent = '🏎'; }
  },
  renderPresets() {
    const body = $('lockerGrid'); body.innerHTML = ''; const p = Account.profile; const list = this.presets();
    const same = (a, b) => SLOTS.every(s => a[s.id] === b[s.id]);
    if (this.editPreset !== null && this.editPreset !== undefined && list[this.editPreset]) {
      // ----- editor -----
      const k = this.editPreset, ps = list[k];
      const hdr = document.createElement('div');
      hdr.innerHTML = `<div class="row" style="gap:8px;margin-bottom:10px"><button class="btn sm" id="pBack">← Back</button><input class="inp" id="pName" maxlength="18" style="text-transform:none;letter-spacing:0"></div>
        <div class="row" style="gap:12px;align-items:flex-start;flex-wrap:wrap;margin-bottom:6px"><div id="pThumb" style="width:150px;height:150px;border-radius:12px;background:rgba(0,0,0,.25);background-size:contain;background-repeat:no-repeat;background-position:center;flex:none"></div>
        <div style="flex:1;min-width:200px">${this.statBars(kartStats(ps.equip).s)}${kartStats(ps.equip).offroad ? '<div class="muted" style="margin-top:4px">✔ Off-road ready</div>' : ''}
        <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn sm y" id="pEquip">${same(ps.equip, p.equip) ? '✔ Equipped' : 'Equip this preset'}</button><button class="btn sm" id="pCopy">Copy my current loadout</button></div></div></div>
        <p class="muted" style="margin-bottom:6px">Pick each part for this preset. It won't change what you're using until you press Equip.</p>`;
      body.appendChild(hdr);
      const nm = $('pName'); nm.value = ps.name; nm.oninput = () => { ps.name = safeTag(nm.value).slice(0, 18) || 'Preset'; Account.save(); };
      $('pBack').onclick = () => { this.editPreset = null; this.renderLocker(); };
      $('pEquip').onclick = () => { p.equip = Object.assign({}, ps.equip); Account.save(); Sfx.play('buy'); this.lobbyKarts(); Net.setParty(); this.toast(`Equipped preset <b>${esc(ps.name)}</b>`); this.renderPresets(); };
      $('pCopy').onclick = () => { ps.equip = Object.assign({}, p.equip); Account.save(); Sfx.play('click'); this.renderPresets(); };
      this.presetThumb(ps.equip, $('pThumb'));
      for (const sl of SLOTS) {
        const sec = document.createElement('div'); sec.innerHTML = `<div class="sec" style="font-size:18px;margin:14px 0 6px">${sl.name}</div>`;
        const row = document.createElement('div'); row.className = 'grid'; row.style.gridTemplateColumns = 'repeat(auto-fill,minmax(96px,1fr))';
        CATALOG.filter(i => i.slot === sl.id && Account.owns(i.id)).forEach(it => row.appendChild(this.itemCard(it.id, { sel: ps.equip[sl.id] === it.id, onclick: () => {
          ps.equip[sl.id] = it.id; Account.save(); Sfx.play('click'); if (sl.id === 'horn') Sfx.play('horn', it.kind);
          const y = body.scrollTop; this.renderPresets(); body.scrollTop = y;
        } })));
        sec.appendChild(row); body.appendChild(sec);
      }
      body.querySelectorAll('.card .eq').forEach(e => e.textContent = 'IN PRESET');
      return;
    }
    // ----- list -----
    const intro = document.createElement('div');
    intro.innerHTML = `<div class="disp" style="font-size:26px">Presets</div><div class="muted" style="margin-bottom:12px">Save whole loadouts and switch between them in one click. Press Edit to customize any preset.</div>`;
    body.appendChild(intro);
    const grid = document.createElement('div'); grid.className = 'grid'; grid.style.gridTemplateColumns = 'repeat(auto-fill,minmax(150px,1fr))';
    list.forEach((ps, k) => {
      const on = same(ps.equip, p.equip); const st = kartStats(ps.equip).s;
      const d = document.createElement('div'); d.className = 'card' + (on ? ' sel' : ''); d.style.background = 'linear-gradient(160deg,#3a5bd9,#2a1a7a)'; d.style.aspectRatio = 'auto'; d.style.cursor = 'default';
      d.innerHTML = `<div class="th" style="height:120px;flex:none"></div><div class="info"><b></b><small>${st.map((v, i) => STAT_NAMES[i][0] + Math.round(v * 100)).join(' · ')}</small>
        <div class="row" style="gap:5px;margin-top:7px;flex-wrap:wrap"><button class="btn sm y" data-a="eq">${on ? '✔' : 'Equip'}</button><button class="btn sm" data-a="ed">Edit</button><button class="btn sm" data-a="sv" title="Save your current loadout into this preset">Save</button></div></div>${on ? '<div class="eq">EQUIPPED</div>' : ''}`;
      d.querySelector('b').textContent = ps.name;
      this.presetThumb(ps.equip, d.querySelector('.th'));
      d.querySelector('[data-a=eq]').onclick = () => { p.equip = Object.assign({}, ps.equip); Account.save(); Sfx.play('buy'); this.lobbyKarts(); Net.setParty(); this.toast(`Equipped preset <b>${esc(ps.name)}</b>`); this.renderPresets(); };
      d.querySelector('[data-a=ed]').onclick = () => { this.editPreset = k; Sfx.play('click'); this.renderPresets(); $('lockerGrid').scrollTop = 0; };
      d.querySelector('[data-a=sv]').onclick = () => { ps.equip = Object.assign({}, p.equip); Account.save(); Sfx.play('click'); this.toast(`Saved your loadout to <b>${esc(ps.name)}</b>`); this.renderPresets(); };
      grid.appendChild(d);
    });
    body.appendChild(grid);
  },
  // ---------------- shop ----------------
  shopToday() {
    const r = rng(hashStr('shop-4h-r2-' + Math.floor(Date.now() / (4 * 3600e3)))); // the shop refreshes every 4 hours
    const pool = CATALOG.filter(i => !i.def && !i.pass).map(i => ({ i, k: r() })).sort((a, b) => a.k - b.k).map(o => o.i);
    const feat = pool.filter(i => i.rarity === 'legendary' || i.rarity === 'epic').slice(0, 3);
    const daily = pool.filter(i => !feat.includes(i)).slice(0, 12);
    return { feat, daily };
  },
  renderShop() {
    const { feat, daily } = this.shopToday();
    const fill = (el, list, big) => { el.innerHTML = ''; list.forEach(it => el.appendChild(this.itemCard(it.id, { big, price: RARITY[it.rarity].price, owned: Account.owns(it.id), onclick: () => this.buyModal(it.id) }))); };
    fill($('shopFeat'), feat, true); fill($('shopDaily'), daily, false);
  },
  buyModal(id) {
    const it = CAT[id], rr = RARITY[it.rarity], price = rr.price, owned = Account.owns(id), can = Account.profile.coins >= price;
    const b = this.modal(`<div class="row" style="gap:16px;align-items:stretch;flex-wrap:wrap"><div id="bTh" style="width:200px;height:200px;border-radius:14px;background:${rr.bg};background-size:contain;background-repeat:no-repeat;background-position:center;display:grid;place-items:center;font-size:70px;flex:none"></div>
      <div style="flex:1;min-width:180px"><div class="muted" style="color:${rr.color};font-weight:900">${rr.name.toUpperCase()} ${SLOTS.find(s => s.id === it.slot).name.toUpperCase()}</div><h3 id="bName"></h3>
      ${it.desc ? `<p class="muted" style="margin-bottom:6px">${esc(it.desc)}</p>` : ''}${it.stats ? `<p style="font-weight:900;font-size:13px;margin-bottom:6px">${esc(this.modsText(it))}</p>${this.statBars(kartStats(Object.assign({}, Account.profile.equip, { [it.slot]: id })).s, kartStats(Account.profile.equip).s)}<div class="muted" style="font-size:11px;margin-top:2px">Your loadout with this equipped (grey = now)</div>` : ''}
      <div class="row" style="margin:14px 0"><span class="coin"></span><b style="font-size:24px">${price.toLocaleString()}</b></div>
      ${owned ? '<div class="btn g" style="display:inline-block">Owned</div>' : `<button class="btn y" id="bBuy" ${can ? '' : 'disabled'}>${can ? 'Purchase' : 'Not enough coins'}</button>`}
      ${!owned && !can ? `<p class="muted" style="margin-top:8px">You need ${(price - Account.profile.coins).toLocaleString()} more. Win races and finish challenges to earn coins.</p>` : ''}
      ${it.slot === 'horn' ? '<button class="btn sm" id="bHear" style="margin-top:10px">▶ Hear it</button>' : ''}</div></div>
      <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" id="bClose">Close</button></div>`);
    $('bName').textContent = it.name; this.thumb(id, $('bTh'));
    $('bClose').onclick = () => this.closeModal();
    if ($('bHear')) $('bHear').onclick = () => { Sfx.init(); Sfx.play('horn', it.kind); };
    if ($('bBuy')) $('bBuy').onclick = () => {
      const p = Account.profile; if (p.coins < price || Account.owns(id)) return;
      p.coins -= price; p.owned.push(id); Account.save(); Sfx.play('buy');
      this.closeModal(); this.refreshTop(); this.renderShop(); this.lobbyKarts(); Net.setParty();
      this.toast(`🛒 <b>${esc(it.name)}</b> purchased! Equip it from the Locker.`, 5000, [{ label: 'Equip now', cls: 'y', fn: () => { Account.profile.equip[it.slot] = id; Account.save(); this.lobbyKarts(); Net.setParty(); this.toast('Equipped <b>' + esc(it.name) + '</b>'); } }]);
    };
  },
  // ---------------- pass ----------------
  renderPass() {
    const p = Account.profile, lvl = Account.level, inT = lvl >= PASS_MAX ? PASS_XP : p.xp % PASS_XP;
    $('passLbl').textContent = lvl >= PASS_MAX ? 'Level 400 — max level! 💎' : `Level ${lvl} → ${lvl + 1}${lvl >= 100 ? ' · Prestige' : ''}`; $('passXp').textContent = `${lvl >= PASS_MAX ? PASS_XP : inT} / ${PASS_XP} XP · ${p.xp.toLocaleString()} total`;
    $('passFill').style.width = (inT / PASS_XP * 100) + '%';
    const tr = $('passTrack'); tr.innerHTML = '';
    const tierCard = (t, extra) => { const r = PASS[t - 1], got = t <= lvl; const d = document.createElement('div'); d.className = 'tier' + (got ? ' got' : '') + (t === lvl + 1 ? ' cur' : '') + (extra ? ' prest' : '');
      const item = r.item ? CAT[r.item] : null;
      d.innerHTML = `<div class="n">${t}</div><div class="rw" ${item ? `style="background-color:${RARITY[item.rarity].color}33"` : ''}>${item ? '' : '<span class="coin" style="width:46px;height:46px"></span>'}</div><div class="lb"></div>`;
      d.querySelector('.lb').textContent = item ? item.name + (item.slot === 'banner' ? ' banner' : item.slot === 'title' ? ' title' : '') : r.coins + ' coins';
      if (item) this.thumb(item.id, d.querySelector('.rw')); return d; };
    for (let t = 1; t <= 100; t++) tr.appendChild(tierCard(t));
    const cur = tr.children[Math.min(lvl, 99)]; if (cur) setTimeout(() => tr.scrollLeft = Math.max(0, cur.offsetLeft - 200), 50);
    let pz = $('passPrest'); if (!pz) { pz = document.createElement('div'); pz.id = 'passPrest'; tr.parentElement.appendChild(pz); }
    pz.innerHTML = `<div class="sec">Prestige · levels 101–400</div><p class="muted" style="margin-bottom:10px">After level 100 every level gives 100 coins, and every 50 levels unlocks an exclusive <b>Prime</b> version of a Turbo Pass reward. The level cap is 400.</p><div id="prestRow" style="display:flex;gap:10px;flex-wrap:wrap"></div>`;
    for (const t of PASS_PRESTIGE) $('prestRow').appendChild(tierCard(t, true));
  },
  // ---------------- challenges ----------------
  renderChallenges() {
    Account.ensurePeriods();
    const p = Account.profile;
    const icon = { finish: '🏁', win: '🏆', podium: '🥉', rockethit: '🚀', driftboost: '💨', itemuse: '🎁', box: '❓', kotop3: '🌀', pad: '⚡', purple: '💜', partyrace: '🎮', shortcut: '🔀', trick: '🤸', slip: '🌬', hardwin: '😤', nohitwin: '🛡', trackwin: '🗺', kowin: '👑' };
    const tierCol = { daily: '#ffe14a', tri: '#5fd0ff', week: '#c25cff' };
    $('chList').innerHTML = CH_TIERS.map(tier => {
      const set = tier.key === 'daily' ? p.daily : p['ch_' + tier.key]; const per = chPeriod(tier.key);
      const rows = set.list.map(c => { const dd = tier.pool().find(x => x.id === c.id); if (!dd) return '';
        return `<div class="ch ${c.done ? 'done' : ''}" style="${c.done ? '' : 'border-left:4px solid ' + tierCol[tier.key]}"><div class="ic">${c.done ? '✅' : icon[dd.stat] || '⭐'}</div><div style="flex:1"><b>${esc(dd.text)}</b>${dd.stat === 'trackwin' && c.tracks && c.tracks.length ? `<div class="muted" style="font-size:12px">Won on: ${c.tracks.map(id => esc((TRACKS.find(t => t.id === id) || {}).name || id)).join(', ')}</div>` : ''}<div class="bar"><i style="width:${c.n / dd.goal * 100}%;background:${tierCol[tier.key]}"></i></div></div><div class="rw">${c.n}/${dd.goal}<br><span class="muted">+${tier.xp.toLocaleString()} XP · +${tier.coins.toLocaleString()} 🪙</span></div></div>`; }).join('');
      return `<div class="row" style="justify-content:space-between;flex-wrap:wrap;margin:${tier.key === 'daily' ? 0 : 26}px 0 10px"><div><h2 class="disp" style="color:${tierCol[tier.key]}">${tier.name} challenges</h2><div class="subt" style="margin:0">${tier.key === 'daily' ? 'Quick goals' : tier.key === 'tri' ? 'Tougher goals, bigger rewards' : 'Very hard — huge rewards'} · each worth ${tier.xp.toLocaleString()} XP + ${tier.coins.toLocaleString()} coins</div></div><div class="timer">⏱ New in <span data-end="${per.end}"></span></div></div>${rows}`;
    }).join('');
    this.tickChTimers();
  },
  tickChTimers() {
    document.querySelectorAll('#chList [data-end]').forEach(el => { const s = Math.max(0, (+el.dataset.end - Date.now()) / 1000); const dd = Math.floor(s / 86400); el.textContent = (dd ? dd + 'd ' : '') + `${Math.floor(s % 86400 / 3600)}h ${Math.floor(s % 3600 / 60)}m ${Math.floor(s % 60)}s`; });
  },
  // ---------------- leaderboard ----------------
  renderLeaderboard() {
    const body = $('lbBody'); const p = Account.profile;
    let party = '';
    if (Net.party) {
      const rows = Net.members().map(m => ({ me: m.sameTab, tag: m.sameTab ? p.tag : safeTag(m.presence.tag), pts: m.sameTab ? this.sessionPts : (m.presence.pts | 0), wins: m.sameTab ? this.sessionWins : (m.presence.wins | 0), lvl: m.sameTab ? Account.level : (m.presence.lvl | 0) })).sort((a, b) => b.pts - a.pts || b.wins - a.wins);
      party = `<div class="sec">Party standings</div><p class="muted" style="margin-bottom:8px">Points from races in this party: 1st = 10, 2nd = 8, 3rd = 6, 4th = 5 … 8th = 1.</p><table class="lb"><tr><th>#</th><th>Racer</th><th>Points</th><th>Wins</th><th>Level</th></tr>${rows.map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td class="r">${i + 1}</td><td>${esc(r.tag)}</td><td>${r.pts}</td><td>${r.wins}</td><td>${r.lvl}</td></tr>`).join('')}</table>`;
    } else party = `<div class="sec">Party standings</div><p class="muted">Join or create a party to see a live scoreboard with your friends.</p>`;
    body.innerHTML = party + `<div class="sec">Your career</div><div class="grid">
      <div style="background:rgba(0,0,0,.25);border-radius:12px;padding:12px"><div class="disp" style="font-size:30px;color:var(--yellow)">${p.stats.wins}</div><div class="muted">wins</div></div>
      <div style="background:rgba(0,0,0,.25);border-radius:12px;padding:12px"><div class="disp" style="font-size:30px;color:var(--yellow)">${p.stats.podiums}</div><div class="muted">podiums</div></div>
      <div style="background:rgba(0,0,0,.25);border-radius:12px;padding:12px"><div class="disp" style="font-size:30px;color:var(--yellow)">${p.stats.races}</div><div class="muted">races</div></div>
      <div style="background:rgba(0,0,0,.25);border-radius:12px;padding:12px"><div class="disp" style="font-size:30px;color:var(--yellow)">${Account.level}</div><div class="muted">level</div></div></div>
      <div class="sec">Time trial records</div><div class="grid">${TRACKS.map(t => `<div style="background:rgba(0,0,0,.25);border-radius:12px;padding:12px"><b>${t.name}</b><div class="disp" style="font-size:24px;color:var(--yellow)">${p.best[t.id] ? fmtTime(p.best[t.id]) : '—'}</div><div class="muted">best 3 laps</div></div>`).join('')}</div>`;
  },
};
addEventListener('load', () => App.init());
