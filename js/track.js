// Turbo Royale — track generation (spline, road, terrain, scenery)
'use strict';
const Textures = (() => {
  const by = new WeakMap();
  function get(R) {
    let t = by.get(R); if (t) return t;
    t = {}; by.set(R, t);
    t.road = R.texture(mkCanvas(128, 256, (c, w, h) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
      const r = rng(7); for (let i = 0; i < 1600; i++) { const v = 200 + r() * 55 | 0; c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(r() * w, r() * h, 2, 2); }
      c.fillStyle = '#fff'; c.fillRect(4, 0, 5, h); c.fillRect(w - 9, 0, 5, h);
      c.globalAlpha = 0.5; c.fillRect(w / 2 - 2, 0, 4, h / 2); c.globalAlpha = 1;
    }), true);
    t.curb = R.texture(mkCanvas(32, 64, (c, w, h) => { c.fillStyle = '#e9302c'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.fillRect(0, 0, w, h / 2); }), true);
    t.wall = R.texture(mkCanvas(64, 64, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#bbb'; c.fillRect(0, h - 10, w, 10); c.fillStyle = '#999'; c.fillRect(0, 0, w, 6); }), true);
    t.checker = R.texture(mkCanvas(64, 64, (c, w, h) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? '#111' : '#fff'; c.fillRect(i * 8, j * 8, 8, 8); } }), true);
    t.box = R.texture(mkCanvas(128, 128, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#ddd'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#fff'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10);
      c.fillStyle = '#ffffff'; c.font = 'bold 92px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 8; c.strokeStyle = '#555'; c.strokeText('?', w / 2, h / 2 + 4); c.fillText('?', w / 2, h / 2 + 4);
    }));
    t.pad = R.texture(mkCanvas(64, 128, (c, w, h) => {
      c.fillStyle = '#ff9a1a'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffe14a'; for (let k = 0; k < 3; k++) { const y = 20 + k * 40; c.beginPath(); c.moveTo(8, y + 26); c.lineTo(w / 2, y); c.lineTo(w - 8, y + 26); c.lineTo(w - 20, y + 30); c.lineTo(w / 2, y + 14); c.lineTo(20, y + 30); c.fill(); }
    }));
    t.banner = R.texture(mkCanvas(512, 128, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#1b5cff'); gr.addColorStop(1, '#8a2cff'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.font = '900 64px Arial Black, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffe14a'; c.strokeStyle = '#1a1033'; c.lineWidth = 8;
      c.strokeText('TURBO ROYALE', w / 2, h / 2 + 4); c.fillText('TURBO ROYALE', w / 2, h / 2 + 4);
    }));
    return t;
  }
  return { get };
})();

class Track {
  constructor(def) {
    this.def = def; this.theme = THEMES[def.theme]; this.w = def.width; this.half = def.width / 2;
    this.wallD = this.half + 7;
    this._spline();
    const memo = Track._fmemo || (Track._fmemo = {});
    const key = this.def.id + ':' + this.N;
    if (memo[key]) Object.assign(this, memo[key]);
    else { this.genFeatures(); memo[key] = { branches: this.branches, gates: this.gates, ramps: this.ramps, extraPads: this.extraPads, extraBoxes: this.extraBoxes, patrols: this.patrols, barrels: this.barrels }; }
  }
  _spline() {
    const S = this.def.scale || 1;
    const P = this.def.pts.map(p => [p[0] * S, (p[2] || 0), p[1] * S]);
    const n = P.length, dense = [];
    const cr = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); };
    for (let i = 0; i < n; i++) {
      const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
      for (let k = 0; k < 60; k++) { const t = k / 60; dense.push([cr(p0[0], p1[0], p2[0], p3[0], t), cr(p0[1], p1[1], p2[1], p3[1], t), cr(p0[2], p1[2], p2[2], p3[2], t)]); }
    }
    // arc-length resample
    const cum = [0]; for (let i = 1; i <= dense.length; i++) { const a = dense[i - 1], b = dense[i % dense.length]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[2] - a[2])); }
    const L = cum[cum.length - 1]; const step = 1.5; const N = Math.round(L / step);
    this.N = N; this.len = L; this.step = L / N;
    const px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N), tx = new Float32Array(N), tz = new Float32Array(N), ty = new Float32Array(N);
    let j = 0;
    for (let i = 0; i < N; i++) {
      const d = i * this.step; while (cum[j + 1] < d) j++;
      const a = dense[j], b = dense[(j + 1) % dense.length]; const f = (d - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
      px[i] = lerp(a[0], b[0], f); py[i] = lerp(a[1], b[1], f); pz[i] = lerp(a[2], b[2], f);
    }
    for (let i = 0; i < N; i++) { const a = (i + 1) % N, b = (i - 1 + N) % N; let dx = px[a] - px[b], dz = pz[a] - pz[b]; const l = Math.hypot(dx, dz) || 1; tx[i] = dx / l; tz[i] = dz / l; ty[i] = (py[a] - py[b]) / (2 * this.step); }
    // smooth heights a bit
    const sy = new Float32Array(N); for (let i = 0; i < N; i++) { let s = 0; for (let k = -6; k <= 6; k++) s += py[(i + k + N) % N]; sy[i] = s / 13; }
    Object.assign(this, { px, py: sy, pz, tx, tz, ty });
    // curvature (for bots): heading change ahead
    this.curv = new Float32Array(N);
    for (let i = 0; i < N; i++) { const a = Math.atan2(tx[i], tz[i]), b = Math.atan2(tx[(i + 12) % N], tz[(i + 12) % N]); this.curv[i] = angDiff(a, b); }
    // bounds
    let minx = 1e9, maxx = -1e9, minz = 1e9, maxz = -1e9; for (let i = 0; i < N; i++) { minx = Math.min(minx, px[i]); maxx = Math.max(maxx, px[i]); minz = Math.min(minz, pz[i]); maxz = Math.max(maxz, pz[i]); }
    this.bounds = { minx, maxx, minz, maxz };
  }
  wrap(i) { const N = this.N; return ((i % N) + N) % N; }
  // nearest sample index searching around hint
  nearest(x, z, hint, win) {
    const N = this.N; let best = -1, bd = 1e18;
    if (hint === undefined || hint < 0) { for (let i = 0; i < N; i += 2) { const d = (this.px[i] - x) ** 2 + (this.pz[i] - z) ** 2; if (d < bd) { bd = d; best = i; } } hint = best; win = 4; }
    win = win || 30; best = hint; bd = 1e18;
    for (let k = -win; k <= win; k++) { const i = this.wrap(hint + k); const d = (this.px[i] - x) ** 2 + (this.pz[i] - z) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
  }
  lateral(i, x, z) { return (x - this.px[i]) * -this.tz[i] + (z - this.pz[i]) * this.tx[i]; } // right = (-tz, tx)
  along(i, x, z) { return (x - this.px[i]) * this.tx[i] + (z - this.pz[i]) * this.tz[i]; }
  heightAt(i, x, z) { const a = clamp(this.along(i, x, z) / this.step, -1, 1); const j = this.wrap(i + (a >= 0 ? 1 : -1)); return lerp(this.py[i], this.py[j], Math.abs(a)); }
  point(i, lat) { i = this.wrap(Math.round(i)); return [this.px[i] - this.tz[i] * lat, this.py[i], this.pz[i] + this.tx[i] * lat]; }
  heading(i) { i = this.wrap(Math.round(i)); return Math.atan2(this.tx[i], this.tz[i]); }

  build(R, quality) {
    const T = this.theme, tex = Textures.get(R), meshes = [];
    const N = this.N, h = this.half;
    // road ribbon
    const ribbon = (offA, offB, yOff, col, vScale, tex2, opts) => {
      const g = new Geo(); let d = 0;
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N; const d1 = d + this.step;
        const A = (k, o) => [this.px[k] - this.tz[k] * o, this.py[k] + yOff, this.pz[k] + this.tx[k] * o];
        const a = A(i, offA), b = A(i, offB), c = A(j, offB), e = A(j, offA);
        // winding: viewed from above, left→right: offA < offB means a is left... right vector is (-tz,tx)
        g.quad(a, b, c, e, col, [[0, d / vScale], [1, d / vScale], [1, d1 / vScale], [0, d1 / vScale]]);
        d = d1;
      }
      // ensure faces point up: test first tri normal
      if (g.n[1] < 0) { for (let i = 0; i < g.p.length; i += 9) { for (let k = 0; k < 3; k++) { const t = g.p[i + 3 + k]; g.p[i + 3 + k] = g.p[i + 6 + k]; g.p[i + 6 + k] = t; } } for (let i = 0; i < g.n.length; i++) g.n[i] = -g.n[i]; for (let i = 0; i < g.u.length; i += 6) { for (let k = 0; k < 2; k++) { const t = g.u[i + 2 + k]; g.u[i + 2 + k] = g.u[i + 4 + k]; g.u[i + 4 + k] = t; } } for (let i = 0; i < g.c.length; i += 12) { /* colors uniform per quad */ } }
      return R.mesh(R.upload(g), Object.assign({ tex: tex2 }, opts || {}));
    };
    const roadCol = hexc(T.road);
    meshes.push(ribbon(-h, h, 0.03, roadCol, 32, tex.road));
    const curbCol = T.neon ? hexc(0xffffff, 0.8) : hexc(0xffffff);
    meshes.push(ribbon(h, h + 1.6, 0.05, curbCol, 5, tex.curb, T.neon ? { tint: [0.17, 0.94, 1] } : {}));
    meshes.push(ribbon(-h - 1.6, -h, 0.05, curbCol, 5, tex.curb, T.neon ? { tint: [1, 0.17, 0.84] } : {}));
    // walls (vertical ribbons, two sided)
    const wallG = new Geo(); const wc = [hexc(T.wall[0], T.neon ? 0.85 : 0), hexc(T.wall[1], T.neon ? 0.85 : 0)];
    for (const side of [-1, 1]) {
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N, o = side * this.wallD;
        const a = [this.px[i] - this.tz[i] * o, this.py[i] - 0.3, this.pz[i] + this.tx[i] * o], b = [this.px[j] - this.tz[j] * o, this.py[j] - 0.3, this.pz[j] + this.tx[j] * o];
        const c = [b[0], b[1] + 1.6, b[2]], d = [a[0], a[1] + 1.6, a[2]];
        if (this.branches.length && this.inBranchCorridor((a[0] + b[0]) / 2, (a[2] + b[2]) / 2, null, 0.5)) continue;
        const col = wc[Math.floor(i / 3) % 2];
        if (side > 0) wallG.quad(a, b, c, d, col); else wallG.quad(b, a, d, c, col);
      }
    }
    meshes.push(R.mesh(R.upload(wallG), { twoSided: true }));
    // start line + gantry
    {
      const g = new Geo(); const i = 0; const A = (o, dz) => [this.px[i] - this.tz[i] * o + this.tx[i] * dz, this.py[i] + 0.07, this.pz[i] + this.tx[i] * o + this.tz[i] * dz];
      g.quad(A(-h, -1.5), A(h, -1.5), A(h, 1.5), A(-h, 1.5), hexc(0xffffff), [[0, 0], [6, 0], [6, 0.75], [0, 0.75]]);
      if (g.n[1] < 0) { g.p = []; g.n = []; g.c = []; g.u = []; g.quad(A(h, -1.5), A(-h, -1.5), A(-h, 1.5), A(h, 1.5), hexc(0xffffff), [[0, 0], [6, 0], [6, 0.75], [0, 0.75]]); }
      meshes.push(R.mesh(R.upload(g), { tex: tex.checker }));
      const yaw = this.heading(0); const gg = new Geo();
      gg.push(M4.trs(this.px[0], this.py[0], this.pz[0], yaw, 0, 0));
      gg.box(1, 9, 1, hexc(0x2b3a6b), -(h + 2.5), 4.5, 0); gg.box(1, 9, 1, hexc(0x2b3a6b), h + 2.5, 4.5, 0);
      gg.box(this.w + 6, 0.6, 1.2, hexc(0x2b3a6b), 0, 9, 0);
      for (let k = 0; k < 5; k++) gg.box(1.1, 0.8, 0.4, hexc(0x222222), -4 + k * 2, 7.8, 0.6);
      gg.pop();
      meshes.push(R.mesh(R.upload(gg)));
      const bg = new Geo(); bg.push(M4.trs(this.px[0], this.py[0] + 8.1, this.pz[0], yaw, 0, 0));
      const BW = this.w * 0.75; bg.quad([BW / 2, -1.4, -0.65], [-BW / 2, -1.4, -0.65], [-BW / 2, 1.4, -0.65], [BW / 2, 1.4, -0.65], hexc(0xffffff, 0.6), [[0, 1], [1, 1], [1, 0], [0, 0]]);
      bg.quad([-BW / 2, -1.4, 0.65], [BW / 2, -1.4, 0.65], [BW / 2, 1.4, 0.65], [-BW / 2, 1.4, 0.65], hexc(0xffffff, 0.6), [[0, 1], [1, 1], [1, 0], [0, 0]]);
      bg.pop(); meshes.push(R.mesh(R.upload(bg), { tex: tex.banner }));
      this.lightsMesh = null;
    }
    // terrain heightfield
    const B = this.bounds, pad = 260; const x0 = B.minx - pad, x1 = B.maxx + pad, z0 = B.minz - pad, z1 = B.maxz + pad;
    const RES = quality === 'low' ? 90 : 130; const cw = (x1 - x0) / RES, ch = (z1 - z0) / RES;
    const H = new Float32Array((RES + 1) * (RES + 1)), D = new Float32Array((RES + 1) * (RES + 1));
    const seed = hashStr(this.def.id);
    for (let zi = 0; zi <= RES; zi++) for (let xi = 0; xi <= RES; xi++) {
      const x = x0 + xi * cw, z = z0 + zi * ch;
      const sn = this.surfaceNear(x, z, 3); const d = sn[0]; const base = sn[1] - 0.12;
      const t = clamp((d - this.wallD - 4) / 70, 0, 1); const s = t * t * (3 - 2 * t);
      const n = vnoise(x / 60, z / 60, seed) * 0.65 + vnoise(x / 22, z / 22, seed + 3) * 0.35;
      const hill = (this.def.theme === 'neon' ? 4 : 34) * n * s + s * (this.def.theme === 'neon' ? 0 : 6);
      H[zi * (RES + 1) + xi] = base + hill - (this.def.theme === 'neon' ? 0 : 0) ; D[zi * (RES + 1) + xi] = d;
    }
    this.terrain = { x0, z0, cw, ch, RES, H, D };
    const c1 = hexc(T.ground), c2 = hexc(T.ground2), c3 = hexc(T.hill);
    const snowCap = this.def.theme !== 'neon';
    const data = new Float32Array(RES * RES * 6 * 12); let o = 0;
    const vh = (xi, zi) => H[zi * (RES + 1) + xi];
    const put = (xi, zi) => {
      const x = x0 + xi * cw, z = z0 + zi * ch, y = vh(xi, zi);
      const hl = vh(Math.max(0, xi - 1), zi), hr = vh(Math.min(RES, xi + 1), zi), hd = vh(xi, Math.max(0, zi - 1)), hu = vh(xi, Math.min(RES, zi + 1));
      let nx = (hl - hr) / (2 * cw), ny = 1, nz = (hd - hu) / (2 * ch); const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const d = D[zi * (RES + 1) + xi]; const nn = vnoise(x / 9, z / 9, seed + 9);
      let col = mixc(c1, c2, nn);
      const hRel = y - (this.py[0] || 0);
      if (d > this.wallD + 10) col = mixc(col, c3, clamp((hRel - 6) / 20, 0, 1) * 0.8);
      if (snowCap && hRel > 26) col = mixc(col, hexc(0xffffff), clamp((hRel - 26) / 8, 0, 1));
      if (this.def.theme === 'neon') { const gx = Math.abs(((x / 12) % 1 + 1) % 1 - 0.5) < 0.04 || Math.abs(((z / 12) % 1 + 1) % 1 - 0.5) < 0.04; if (gx && d > this.wallD + 3) col = hexc(0x6a2cff, 0.7); }
      data.set([x, y, z, nx, ny, nz, col[0], col[1], col[2], col[3] || 0, 0, 0], o); o += 12;
    };
    for (let zi = 0; zi < RES; zi++) for (let xi = 0; xi < RES; xi++) { put(xi, zi); put(xi, zi + 1); put(xi + 1, zi + 1); put(xi, zi); put(xi + 1, zi + 1); put(xi + 1, zi); }
    meshes.push(R.mesh(R.uploadRaw(data)));
    // scenery
    meshes.push(R.mesh(R.upload(this._scenery(quality))));
    meshes.push(...this.buildFeatures(R, quality));
    // sky dome
    const sky = new Geo(); const top = T.neon ? hexc(0x05020f, 1) : hexc(0x2f7de0, 1); const hor = [...T.fog, 1];
    for (let j = 0; j < 6; j++) for (let i = 0; i < 16; i++) {
      const t0 = j / 6 * Math.PI / 2, t1 = (j + 1) / 6 * Math.PI / 2, p0 = i / 16 * Math.PI * 2, p1 = (i + 1) / 16 * Math.PI * 2, r = 900;
      const P = (t, p) => [Math.cos(t) * Math.cos(p) * r, Math.sin(t) * r * 0.6 - 60, Math.cos(t) * Math.sin(p) * r];
      const cA = mixc(hor, top, Math.pow(j / 6, 0.7)), cB = mixc(hor, top, Math.pow((j + 1) / 6, 0.7));
      // inward-facing
      const a = P(t0, p0), b = P(t0, p1), c = P(t1, p1), d = P(t1, p0);
      sky.vert(...a, 0, 1, 0, cA); sky.vert(...c, 0, 1, 0, cB); sky.vert(...b, 0, 1, 0, cA);
      sky.vert(...a, 0, 1, 0, cA); sky.vert(...d, 0, 1, 0, cB); sky.vert(...c, 0, 1, 0, cB);
    }
    // sun / moon + clouds
    if (T.neon) { sky.sphere(40, 10, 6, hexc(0xff4fe0, 1), 300, 260, 500); }
    else {
      sky.sphere(30, 10, 6, hexc(0xfff6c0, 1), 350, 400, 420);
      const r = rng(seed + 5);
      for (let k = 0; k < 14; k++) { const a = r() * Math.PI * 2, dd = 500 + r() * 250, y = 140 + r() * 120; const cc = [1, 1, 1, 0.85]; for (let q = 0; q < 4; q++) sky.sphere(18 + r() * 14, 7, 5, cc, Math.cos(a) * dd + (r() - 0.5) * 50, y + r() * 10, Math.sin(a) * dd + (r() - 0.5) * 50, 0.55); }
    }
    this.skyMesh = R.mesh(R.upload(sky), { fog: false, twoSided: true });
    meshes.push(this.skyMesh);
    this.meshes = meshes;
    this.minimap = this._minimap();
    return meshes;
  }
  groundHeight(x, z) { // terrain bilinear
    const t = this.terrain; if (!t) return 0;
    const fx = clamp((x - t.x0) / t.cw, 0, t.RES - 0.001), fz = clamp((z - t.z0) / t.ch, 0, t.RES - 0.001);
    const xi = Math.floor(fx), zi = Math.floor(fz), u = fx - xi, v = fz - zi, W = t.RES + 1;
    return lerp(lerp(t.H[zi * W + xi], t.H[zi * W + xi + 1], u), lerp(t.H[(zi + 1) * W + xi], t.H[(zi + 1) * W + xi + 1], u), v);
  }
  distAt(x, z) { const t = this.terrain; const xi = clamp(Math.round((x - t.x0) / t.cw), 0, t.RES), zi = clamp(Math.round((z - t.z0) / t.ch), 0, t.RES); return t.D[zi * (t.RES + 1) + xi]; }
  _scenery(quality) {
    const g = new Geo(); const r = rng(hashStr(this.def.id) + 11); const T = this.theme; const B = this.bounds;
    const count = quality === 'low' ? 160 : 320;
    let placed = 0, tries = 0;
    while (placed < count && tries < count * 8) {
      tries++;
      const x = lerp(B.minx - 180, B.maxx + 180, r()), z = lerp(B.minz - 180, B.maxz + 180, r());
      const d = this.distAt(x, z); if (d < this.wallD + 5) continue;
      if (T.props === 'city' && d > this.wallD + 90) continue;
      const y = this.groundHeight(x, z) - 0.2; const s = 0.8 + r() * 0.9;
      g.push(M4.trs(x, y, z, r() * 6.28, 0, 0, s));
      if (T.props === 'trees') {
        if (r() < 0.75) { g.cyl(0.45, 3, 6, hexc(0x7a4f2a), 'y', 0, 1.5, 0); const leaf = mixc(hexc(0x2f9e3a), hexc(0x6ccf3a), r()); g.sphere(2.4, 7, 5, leaf, 0, 4.4, 0); g.sphere(1.7, 6, 4, shade(leaf, 1.1), 0.9, 5.6, 0.4); }
        else { const fl = [0xff5a7a, 0xffe14a, 0xffffff, 0xb57bff][r() * 4 | 0]; for (let k = 0; k < 5; k++) { const a = r() * 6.28, rr = r() * 2; g.cyl(0.05, 0.6, 3, hexc(0x2f8a2a), 'y', Math.cos(a) * rr, 0.3, Math.sin(a) * rr); g.sphere(0.25, 5, 3, hexc(fl), Math.cos(a) * rr, 0.7, Math.sin(a) * rr); } }
      } else if (T.props === 'cactus') {
        if (r() < 0.6) { const cc = hexc(0x3f9a4a); g.cyl(0.5, 4.5, 7, cc, 'y', 0, 2.25, 0); g.sphere(0.5, 7, 4, cc, 0, 4.5, 0); g.cyl(0.32, 1.6, 6, cc, 'y', 1.0, 2.6, 0); g.box(0.8, 0.5, 0.5, cc, 0.5, 1.8, 0); g.cyl(0.32, 1.3, 6, cc, 'y', -0.95, 3.0, 0); g.box(0.8, 0.5, 0.5, cc, -0.5, 2.4, 0); }
        else { const rc = mixc(hexc(0xb86a3a), hexc(0xd99a5a), r()); g.sphere(2 + r() * 2, 6, 4, rc, 0, 0.5, 0, 0.7); g.sphere(1.2, 5, 3, shade(rc, 0.9), 1.8, 0.3, 0.5, 0.7); }
      } else if (T.props === 'pines') {
        if (r() < 0.85) { g.cyl(0.35, 2, 5, hexc(0x6b4a2a), 'y', 0, 1, 0); const pc = hexc(0x1f6b45); for (let k = 0; k < 3; k++) { g.cone(2.6 - k * 0.7, 2.6, 7, pc, 0, 1.6 + k * 1.6, 0); g.cone(2.2 - k * 0.6, 0.6, 7, hexc(0xffffff), 0, 3.4 + k * 1.6, 0); } }
        else { g.sphere(1.0, 6, 4, hexc(0xffffff), 0, 0.9, 0); g.sphere(0.75, 6, 4, hexc(0xffffff), 0, 2.2, 0); g.sphere(0.5, 6, 4, hexc(0xffffff), 0, 3.2, 0); g.cone(0.1, 0.5, 4, hexc(0xff8a1c), 0, 3.15, 0.45); }
      } else if (T.props === 'city') {
        const hgt = 8 + r() * 40, wd = 6 + r() * 8; const bc = mixc(hexc(0x1b1530), hexc(0x2a2350), r());
        g.box(wd, hgt, wd, bc, 0, hgt / 2, 0);
        const wc = hexc([0x2bf0ff, 0xff2bd6, 0xffe14a, 0x8a5cff][r() * 4 | 0], 1);
        for (let yy = 3; yy < hgt - 2; yy += 3.2) { for (const sx of [-1, 1]) { g.box(wd * 0.7, 0.6, 0.05, wc, 0, yy, sx * (wd / 2 + 0.03)); g.box(0.05, 0.6, wd * 0.7, wc, sx * (wd / 2 + 0.03), yy, 0); } }
        g.box(wd + 0.4, 0.4, wd + 0.4, wc, 0, hgt, 0);
      }
      g.pop(); placed++;
    }
    // trackside decorations: tire stacks / light posts
    for (let i = 0; i < this.N; i += 18) {
      for (const side of [-1, 1]) {
        const o = side * (this.wallD + 2.5); const x = this.px[i] - this.tz[i] * o, z = this.pz[i] + this.tx[i] * o, y = this.py[i];
        if (T.neon) { if ((i / 18) % 2 === 0) { g.cyl(0.15, 7, 5, hexc(0x333344), 'y', x, y + 3.5, z); g.sphere(0.5, 6, 4, hexc(side > 0 ? 0x2bf0ff : 0xff2bd6, 1), x, y + 7.2, z); } }
        else if ((i / 18) % 3 === 0) { for (let k = 0; k < 3; k++) g.cyl(0.7, 0.45, 8, hexc(k % 2 ? 0x222222 : 0x2a2a2a), 'y', x, y + 0.25 + k * 0.45, z); }
        else if ((i / 18) % 3 === 1 && this.def.theme === 'meadow') { g.box(0.2, 1.4, 0.2, hexc(0xffffff), x, y + 0.7, z); g.box(2.8, 1.1, 0.12, hexc([0xff3b3b, 0x2a7fff, 0xffd23a][i % 3]), x, y + 1.6, z); }
      }
    }
    // distant mountains ring (not in city)
    if (T.props !== 'city') {
      const cx = (B.minx + B.maxx) / 2, cz = (B.minz + B.maxz) / 2, rad = Math.max(B.maxx - B.minx, B.maxz - B.minz) / 2 + 420;
      for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2 + r() * 0.2; const hh = 90 + r() * 120; const mc = T.props === 'cactus' ? hexc(0xc77a45) : T.props === 'pines' ? hexc(0x8ea4c0) : hexc(0x5a8a5a); g.cone(120 + r() * 60, hh, 6, mc, cx + Math.cos(a) * rad, -20, cz + Math.sin(a) * rad); g.cone(40, hh * 0.25, 6, hexc(0xffffff), cx + Math.cos(a) * rad, hh * 0.75 - 20, cz + Math.sin(a) * rad); }
    }
    return g;
  }
  _minimap() {
    const B = this.bounds, S = 150, pad = 10; const sc = (S - pad * 2) / Math.max(B.maxx - B.minx, B.maxz - B.minz);
    const ox = pad + ((S - pad * 2) - (B.maxx - B.minx) * sc) / 2, oz = pad + ((S - pad * 2) - (B.maxz - B.minz) * sc) / 2;
    const map = (x, z) => [ox + (x - B.minx) * sc, S - (oz + (z - B.minz) * sc)];
    const img = mkCanvas(S, S, (c) => {
      c.lineJoin = 'round'; c.lineCap = 'round';
      c.beginPath(); for (let i = 0; i <= this.N; i += 4) { const p = map(this.px[i % this.N], this.pz[i % this.N]); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.closePath();
      c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 9; c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 5; c.stroke();
      for (const b of this.branches || []) {
        c.beginPath(); for (let i = 0; i < b.N; i += 3) { const p = map(b.px[i], b.pz[i]); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } const e = map(b.px[b.N - 1], b.pz[b.N - 1]); c.lineTo(e[0], e[1]);
        c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 6; c.setLineDash([]); c.stroke(); c.strokeStyle = b.kind === 'short' ? '#ff7a3a' : '#7fd0ff'; c.lineWidth = 3; c.setLineDash([4, 3]); c.stroke(); c.setLineDash([]);
      }
      const s = map(this.px[0], this.pz[0]); c.fillStyle = '#ffe14a'; c.fillRect(s[0] - 4, s[1] - 4, 8, 8);
    });
    return { img, map, S };
  }
}
