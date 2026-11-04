// Turbo Royale — branching paths (shortcuts / jump routes) and track hazards
'use strict';
class Branch {
  // A road that leaves the main track at main index i0 and rejoins at i1.
  constructor(track, o) {
    this.t = track; Object.assign(this, o);
    this.half = o.half || 6.5; this.wallD = this.half + 3.2;
    const t = track, h = t.half, s = o.side;
    const off = s * (h - this.half + 0.5);
    const P0 = t.point(o.i0, off), P3 = t.point(o.i1, off);
    const h0 = t.heading(o.i0), h1 = t.heading(o.i1);
    const T0 = [Math.sin(h0), Math.cos(h0)], T1 = [Math.sin(h1), Math.cos(h1)];
    const chord = Math.hypot(P3[0] - P0[0], P3[2] - P0[2]);
    const k = chord * (o.kind === 'alt' ? 0.38 : 0.32);
    let P1 = [P0[0] + T0[0] * k, 0, P0[2] + T0[1] * k], P2 = [P3[0] - T1[0] * k, 0, P3[2] - T1[1] * k];
    if (o.bulge) { // push the middle out to one side
      const mi = t.wrap(Math.round(o.i0 + o.span / 2)); const rx = -t.tz[mi] * s, rz = t.tx[mi] * s; const b = o.bulge * 1.33;
      P1[0] += rx * b; P1[2] += rz * b; P2[0] += rx * b; P2[2] += rz * b;
    }
    const dense = []; for (let q = 0; q <= 400; q++) { const u = q / 400, a = (1 - u) ** 3, bb = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3; dense.push([a * P0[0] + bb * P1[0] + c * P2[0] + d * P3[0], a * P0[2] + bb * P1[2] + c * P2[2] + d * P3[2]]); }
    const cum = [0]; for (let q = 1; q < dense.length; q++) cum.push(cum[q - 1] + Math.hypot(dense[q][0] - dense[q - 1][0], dense[q][1] - dense[q - 1][1]));
    const L = cum[cum.length - 1]; const N = Math.max(8, Math.round(L / 1.5)); this.N = N; this.len = L; this.step = L / (N - 1);
    this.px = new Float32Array(N); this.pz = new Float32Array(N); this.py = new Float32Array(N); this.tx = new Float32Array(N); this.tz = new Float32Array(N); this.ty = new Float32Array(N);
    let j = 0;
    for (let i = 0; i < N; i++) {
      const dd = i * this.step; while (j < cum.length - 2 && cum[j + 1] < dd) j++;
      const f = (dd - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
      this.px[i] = lerp(dense[j][0], dense[j + 1][0], f); this.pz[i] = lerp(dense[j][1], dense[j + 1][1], f);
      const u = i / (N - 1); let y = lerp(P0[1], P3[1], u);
      if (o.type === 'tunnel') y -= Math.sin(u * Math.PI) * 1.6;
      if (o.kind === 'alt') y += Math.sin(u * Math.PI) * 2.5;
      this.py[i] = y;
    }
    for (let i = 0; i < N; i++) { const a = Math.min(N - 1, i + 1), b = Math.max(0, i - 1); let dx = this.px[a] - this.px[b], dz = this.pz[a] - this.pz[b]; const l = Math.hypot(dx, dz) || 1; this.tx[i] = dx / l; this.tz[i] = dz / l; this.ty[i] = (this.py[a] - this.py[b]) / ((a - b) * this.step || 1); }
  }
  wrap(i) { return clamp(Math.round(i), 0, this.N - 1); }
  nearest(x, z, hint, win) {
    let best = 0, bd = 1e18; let a = 0, b = this.N - 1;
    if (hint !== undefined && hint >= 0) { a = Math.max(0, hint - (win || 20)); b = Math.min(this.N - 1, hint + (win || 20)); }
    for (let i = a; i <= b; i++) { const d = (this.px[i] - x) ** 2 + (this.pz[i] - z) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
  }
  lateral(i, x, z) { return (x - this.px[i]) * -this.tz[i] + (z - this.pz[i]) * this.tx[i]; }
  along(i, x, z) { return (x - this.px[i]) * this.tx[i] + (z - this.pz[i]) * this.tz[i]; }
  heightAt(i, x, z) { const a = clamp(this.along(i, x, z) / this.step, -1, 1); const j = this.wrap(i + (a >= 0 ? 1 : -1)); return lerp(this.py[i], this.py[j], Math.abs(a)); }
  point(i, lat) { i = this.wrap(i); return [this.px[i] - this.tz[i] * lat, this.py[i], this.pz[i] + this.tx[i] * lat]; }
  heading(i) { i = this.wrap(i); return Math.atan2(this.tx[i], this.tz[i]); }
  mapIdx(si) { return this.t.wrap(Math.round(this.i0 + this.span * clamp(si, 0, this.N - 1) / (this.N - 1))); }
  // main-track index window this branch lives in (with margin)
  near(mainIdx, m) { const t = this.t; const rel = ((mainIdx - this.i0) % t.N + t.N) % t.N; return rel <= this.span + (m || 0) || rel >= t.N - (m || 0); }
  valid() {
    const t = this.t, need = (t.wallD + this.wallD + 3) ** 2, near = (t.half + this.half + 3) ** 2;
    const k0 = Math.round(this.N * 0.1), k1 = Math.round(this.N * 0.9), m0 = this.N * 0.25, m1 = this.N * 0.75;
    for (let i = 0; i < t.N; i += 3) {
      const rel = ((i - this.i0) % t.N + t.N) % t.N, inWin = rel <= this.span + 25 || rel >= t.N - 25;
      if (inWin && (rel > this.span || rel >= t.N - 25)) continue; // margins around the ends: allowed to be close
      const px = t.px[i], pz = t.pz[i];
      for (let k = k0; k < k1; k += 3) {
        const d = (px - this.px[k]) ** 2 + (pz - this.pz[k]) ** 2;
        if (!inWin) { if (d < need) return false; }
        else if (k > m0 && k < m1 && d < near) return false;
      }
    }
    return true;
  }
}

// ---- feature generation (deterministic per track) ----
Track.prototype.genFeatures = function () {
  const t = this, N = t.N, r = rng(hashStr(t.def.id) + 77);
  t.branches = [];
  const theme = t.def.theme;
  const scType = { meadow: 'dirt', desert: 'tunnel', snow: 'ice', neon: 'tunnel' }[theme] || 'dirt';
  // 1) shortcut: chord across the inside of the biggest bend
  let best = null;
  for (let len = Math.round(N * 0.1); len <= Math.round(N * 0.26); len += Math.max(4, Math.round(N * 0.015))) {
    for (let i0 = Math.round(N * 0.07); i0 + len < N * 0.93; i0 += 5) {
      const i1 = i0 + len; const turn = angDiff(t.heading(i0), t.heading(i1));
      if (Math.abs(turn) < 0.9) continue;
      const side = turn > 0 ? -1 : 1; // inside of the bend
      const a = t.point(i0, 0), b = t.point(i1, 0); const ratio = Math.hypot(a[0] - b[0], a[2] - b[2]) / (len * t.step);
      if (ratio > 0.72) continue;
      if (best && ratio >= best.ratio) continue;
      const br = new Branch(t, { i0, i1, span: len, side, kind: 'short', type: scType, half: scType === 'tunnel' ? 5.5 : 6 });
      if (br.len > len * t.step * 0.8) continue;
      if (!br.valid()) continue;
      best = { ratio, br };
    }
  }
  if (best) t.branches.push(best.br);
  // 2) jump route: a bulging alternate road on a gentler section
  const sc = best && best.br; let alt = null;
  outer: for (const len of [0.12, 0.1, 0.14, 0.09].map(f => Math.round(N * f))) {
    const starts = []; for (let i0 = Math.round(N * 0.07); i0 + len < N * 0.93; i0 += 7) starts.push(i0);
    starts.sort((a, b) => Math.abs(angDiff(t.heading(a), t.heading(a + len))) - Math.abs(angDiff(t.heading(b), t.heading(b + len))));
    for (const i0 of starts) {
      const i1 = i0 + len;
      if (sc && !(i1 + 30 < sc.i0 || i0 > sc.i1 + 30)) continue;
      for (const side of [1, -1]) for (const bulge of [26, 20, 32]) {
        const br = new Branch(t, { i0, i1, span: len, side, kind: 'alt', type: 'ramp', bulge, half: 6.5 });
        if (br.valid()) { alt = br; break outer; }
      }
    }
  }
  if (alt) t.branches.push(alt);
  t.branches.forEach((b, k) => b.id = k);
  // 3) hazards & features
  const busy = i => t.branches.some(b => b.near(i, 30)) || i < N * 0.06 || i > N * 0.96;
  const free = []; for (let i = 0; i < N; i += 8) if (!busy(i)) free.push(i);
  const pick = () => { if (!free.length) return -1; const k = Math.floor(r() * free.length); const i = free[k]; free.splice(Math.max(0, k - 4), 9); return i; };
  t.gates = []; t.ramps = []; t.extraPads = []; t.extraBoxes = []; t.patrols = []; t.barrels = [];
  for (const b of t.branches) {
    if (b.kind === 'short') { t.gates.push({ b, si: Math.round(b.N * 0.3), open: 0 }); t.patrols.push({ b, si: Math.round(b.N * 0.62), amp: b.half - 1.6, w: 1.5, ph: r() * 6, kind: 'roller' }); }
    else { t.ramps.push({ b, si: Math.round(b.N * 0.5) }); t.extraPads.push({ b, i: Math.round(b.N * 0.22), lat: 0 }, { b, i: Math.round(b.N * 0.8), lat: 0 }); t.extraBoxes.push({ b, si: Math.round(b.N * 0.66) }); }
  }
  for (let k = 0; k < 2; k++) { const i = pick(); if (i >= 0) t.patrols.push({ b: null, si: i, amp: t.half - 2, w: 1.1 + r() * 0.5, ph: r() * 6, kind: 'roller' }); }
  for (let k = 0; k < 2; k++) { const i = pick(); if (i < 0) continue; const lats = [-8, -3, 3, 8].sort(() => r() - 0.5).slice(0, 3); for (const lat of lats) { const p = t.point(i, lat); t.barrels.push({ x: p[0], y: p[1], z: p[2], i, on: true, t: 0 }); } }
};
// Union-of-corridors helpers
Track.prototype.inBranchCorridor = function (x, z, except, margin) {
  for (const b of this.branches) { if (b === except) continue; const i = b.nearest(x, z); if (i <= 0 || i >= b.N - 1) { /* ends overlap main anyway */ }
    if (Math.abs(b.lateral(i, x, z)) < b.wallD - (margin || 0.3) && Math.abs(b.along(i, x, z)) < b.step * 1.5) return true; }
  return false;
};
Track.prototype.inMainCorridor = function (x, z, margin) { const i = this.nearest(x, z); return Math.abs(this.lateral(i, x, z)) < this.wallD - (margin || 0.3) && Math.abs(this.along(i, x, z)) < this.step * 2; };

// Build meshes for branches, gates, ramps, hazards, signs
Track.prototype.buildFeatures = function (R, quality) {
  const T = this.theme, tex = Textures.get(R), meshes = [];
  const rib = (P, a, b, yOff, col, vScale, tx2, opts, skip) => {
    const g = new Geo(); let d = 0;
    for (let i = 0; i < P.N - 1; i++) {
      const j = i + 1, d1 = d + P.step;
      const A = (k, o) => [P.px[k] - P.tz[k] * o, P.py[k] + yOff, P.pz[k] + P.tx[k] * o];
      if (skip) { const m = A(i, (a + b) / 2); if (skip(m[0], m[2])) { d = d1; continue; } }
      g.quad(A(i, a), A(i, b), A(j, b), A(j, a), col, [[0, d / vScale], [1, d / vScale], [1, d1 / vScale], [0, d1 / vScale]]); d = d1;
    }
    return R.mesh(R.upload(g), Object.assign({ tex: tx2 }, opts || {}));
  };
  this.featureTex = this.featureTex || {};
  const sign = (label, col) => R.texture(mkCanvas(256, 128, (c, w, h) => { c.fillStyle = col; c.fillRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8); c.fillStyle = '#fff'; c.font = '900 40px Arial Black, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, w / 2, h / 2 + 2); }));
  for (const b of this.branches) {
    const type = b.type, h = b.half;
    const col = type === 'dirt' ? hexc(0xb08050) : type === 'ice' ? hexc(0xbfe8ff, 0.25) : hexc(T.road);
    const onMainRoad = (x, z) => { const i = this.nearest(x, z); return Math.abs(this.lateral(i, x, z)) < this.half + 1.4; };
    meshes.push(rib(b, -h, h, 0.045, col, 32, type === 'dirt' || type === 'ice' ? null : tex.road));
    if (type !== 'dirt') { meshes.push(rib(b, h, h + 1.2, 0.06, hexc(0xffffff, T.neon ? 0.8 : 0), 5, tex.curb, T.neon ? { tint: [0.17, 0.94, 1] } : {}, onMainRoad)); meshes.push(rib(b, -h - 1.2, -h, 0.06, hexc(0xffffff, T.neon ? 0.8 : 0), 5, tex.curb, T.neon ? { tint: [1, 0.17, 0.84] } : {}, onMainRoad)); }
    // walls (skip where they'd block the main road)
    const wg = new Geo(); const wcol = type === 'tunnel' ? (T.neon ? [hexc(0x2a1f4a), hexc(0x2bf0ff, 0.9)] : [hexc(0x8a6a4a), hexc(0x6b5038)]) : type === 'ice' ? [hexc(0xd8f2ff, 0.2), hexc(0x9fd8ff, 0.2)] : [hexc(T.wall[0], T.neon ? 0.85 : 0), hexc(T.wall[1], T.neon ? 0.85 : 0)];
    const wh = type === 'tunnel' ? 5.2 : 1.5;
    for (const sd of [-1, 1]) for (let i = 0; i < b.N - 1; i++) {
      const o = sd * b.wallD; const a = b.point(i, o), c2 = b.point(i + 1, o); const mx = (a[0] + c2[0]) / 2, mz = (a[2] + c2[2]) / 2;
      if (this.inMainCorridor(mx, mz, 0.5) || this.inBranchCorridor(mx, mz, b, 0.5)) continue;
      const A = [a[0], a[1] - 0.3, a[2]], B = [c2[0], c2[1] - 0.3, c2[2]], C = [c2[0], c2[1] + wh, c2[2]], D = [a[0], a[1] + wh, a[2]];
      const cc = wcol[Math.floor(i / 3) % 2]; if (sd > 0) wg.quad(A, B, C, D, cc); else wg.quad(B, A, D, C, cc);
    }
    if (type === 'tunnel') { // roof + glowing ring lights
      for (let i = 0; i < b.N - 1; i++) {
        const mid = b.point(i, 0); if (this.inMainCorridor(mid[0], mid[2], -4)) continue;
        const A = b.point(i, -b.wallD), B2 = b.point(i, b.wallD), C = b.point(i + 1, b.wallD), D = b.point(i + 1, -b.wallD);
        [A, B2, C, D].forEach(p => p[1] += wh);
        wg.quad(D, C, B2, A, T.neon ? hexc(0x1a1030) : hexc(0x6b5038));
        if (i % 6 === 0) { const L = b.point(i, 0);
          wg.push(M4.trs(L[0], L[1] + wh - 0.3, L[2], b.heading(i) + Math.PI / 2, 0, 0)); wg.box(0.25, 0.25, b.wallD * 2, T.neon ? hexc(0xff2bd6, 1) : hexc(0xffe9a8, 1)); wg.pop(); }
      }
      // rock mound over the tunnel (not in neon)
      if (!T.neon) for (let i = 4; i < b.N - 4; i += 5) { const p = b.point(i, 0); if (this.inMainCorridor(p[0], p[2], -6)) continue; wg.sphere(b.wallD + 2.5, 7, 4, mixc(hexc(T.hill), hexc(0x8a6a4a), 0.4), p[0], p[1] + wh - 1, p[2], 0.55); }
    }
    meshes.push(R.mesh(R.upload(wg), { twoSided: true }));
    // entry sign
    const ei = this.wrap(b.i0 - 10), so = b.side * (this.wallD + 1.2), sp = this.point(ei, so);
    const sg = new Geo(); sg.push(M4.trs(sp[0], sp[1], sp[2], this.heading(ei), 0, 0)); sg.box(0.25, 3.2, 0.25, hexc(0x333344), -1.6, 1.6, 0); sg.box(0.25, 3.2, 0.25, hexc(0x333344), 1.6, 1.6, 0); sg.pop();
    meshes.push(R.mesh(R.upload(sg)));
    const bg = new Geo(); bg.push(M4.trs(sp[0], sp[1] + 3.5, sp[2], this.heading(ei), 0, 0));
    bg.quad([2, -0.75, -0.15], [-2, -0.75, -0.15], [-2, 0.75, -0.15], [2, 0.75, -0.15], hexc(0xffffff, 0.7), [[0, 1], [1, 1], [1, 0], [0, 0]]); bg.pop();
    meshes.push(R.mesh(R.upload(bg), { tex: sign(b.kind === 'short' ? (b.side < 0 ? '◀ SHORTCUT' : 'SHORTCUT ▶') : (b.side < 0 ? '◀ JUMP' : 'JUMP ▶'), b.kind === 'short' ? '#e8333a' : '#1b5cff'), twoSided: true }));
  }
  // ramps
  for (const rp of this.ramps) {
    const b = rp.b, p = b.point(rp.si, 0);
    // wedge's low edge is local +z; rotate 180° so karts approach the low edge and launch off the high one
    const g2 = new Geo(); g2.push(M4.trs(p[0], p[1] + 0.02, p[2], b.heading(rp.si) + Math.PI, 0, 0)); g2.wedge(b.half * 2 - 1, 1.3, 4.5, hexc(0xffd23a, 0.35), 0, 0, 0, 0); for (let k = -2; k <= 2; k++) g2.box(0.6, 0.06, 0.6, hexc(0xe8333a, 0.6), k * 2.2, 0.75, 0.2); g2.pop();
    meshes.push(R.mesh(R.upload(g2)));
  }
  return meshes;
};
// height/union terrain helper: nearest surface (main or branch) for a world point
Track.prototype.surfaceNear = function (x, z, mainStep) {
  let bd = 1e18, by = 0;
  for (let i = 0; i < this.N; i += mainStep || 3) { const d = (this.px[i] - x) ** 2 + (this.pz[i] - z) ** 2; if (d < bd) { bd = d; by = this.py[i]; } }
  for (const b of this.branches || []) for (let i = 0; i < b.N; i += 2) { const d = (b.px[i] - x) ** 2 + (b.pz[i] - z) ** 2; if (d < bd) { bd = d; by = b.py[i] - (b.type === 'tunnel' ? 0 : 0); } }
  return [Math.sqrt(bd), by];
};
