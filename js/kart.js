// Turbo Royale — kart & prop model builders
'use strict';
const KartFactory = (() => {
  const caches = new WeakMap(); const propsBy = new WeakMap();
  const cacheFor = R => { let c = caches.get(R); if (!c) { c = new Map(); caches.set(R, c); } return c; };
  const BLACK = hexc(0x1d1d22), DARK = hexc(0x33363d), GREY = hexc(0x8a9099), SEAT = hexc(0x26262c);

  function paintCols(paintId) {
    const p = CAT[paintId] || CAT.p_cherry; const [a, b, pat, em] = p.col;
    return { a: hexc(a, em ? em * 0.25 : 0), b: hexc(b, em || 0), pat };
  }
  function driver(g, drvId, z) {
    const d = CAT[drvId] || CAT.d_rookie; const c = hexc(d.col);
    // torso + arms
    g.box(0.62, 0.55, 0.42, hexc(0x2b3a55), 0, 0.92, z);
    g.box(0.16, 0.14, 0.5, hexc(0x2b3a55), -0.36, 0.95, z + 0.25); g.box(0.16, 0.14, 0.5, hexc(0x2b3a55), 0.36, 0.95, z + 0.25);
    // helmet
    g.sphere(0.34, 10, 7, c, 0, 1.45, z);
    g.box(0.5, 0.16, 0.12, hexc(0x111a26, 0.15), 0, 1.47, z + 0.28); // visor
    const t = d.top;
    if (t === 'horns') { g.push(M4.trs(-0.22, 1.72, z, 0, 0, 0.5)); g.cone(0.07, 0.3, 6, hexc(0xfff3d6)); g.pop(); g.push(M4.trs(0.22, 1.72, z, 0, 0, -0.5)); g.cone(0.07, 0.3, 6, hexc(0xfff3d6)); g.pop(); }
    if (t === 'crown') { const gc = hexc(0xffd23a, 0.25); g.cyl(0.2, 0.14, 8, gc, 'y', 0, 1.8, z); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.cone(0.05, 0.14, 4, gc, Math.cos(a) * 0.17, 1.86, z + Math.sin(a) * 0.17); } }
    if (t === 'ears') { g.box(0.1, 0.45, 0.06, c, -0.13, 1.92, z); g.box(0.1, 0.45, 0.06, c, 0.13, 1.92, z); g.box(0.05, 0.32, 0.07, hexc(0xff6fae), -0.13, 1.92, z + 0.01); g.box(0.05, 0.32, 0.07, hexc(0xff6fae), 0.13, 1.92, z + 0.01); }
    if (t === 'cat') { g.push(M4.trs(-0.18, 1.74, z, 0, 0, 0.2)); g.cone(0.1, 0.2, 4, c); g.pop(); g.push(M4.trs(0.18, 1.74, z, 0, 0, -0.2)); g.cone(0.1, 0.2, 4, c); g.pop(); }
    if (t === 'antenna') { g.cyl(0.02, 0.35, 4, GREY, 'y', 0, 1.9, z); g.sphere(0.07, 6, 4, hexc(0xff3030, 0.9), 0, 2.08, z); }
    if (t === 'antenna2') { for (const s of [-1, 1]) { g.push(M4.trs(s * 0.12, 1.85, z, 0, 0, -s * 0.35)); g.cyl(0.02, 0.35, 4, c, 'y', 0, 0, 0); g.sphere(0.07, 6, 4, hexc(0xfff04a, 0.8), 0, 0.2, 0); g.pop(); } }
    if (t === 'stem') { g.cyl(0.05, 0.18, 5, hexc(0x3f7d20), 'y', 0, 1.84, z); g.box(0.2, 0.03, 0.1, hexc(0x5fbf3f), 0.1, 1.86, z); }
    if (t === 'mohawk') { for (let i = 0; i < 4; i++) g.box(0.07, 0.24 - i * 0.03, 0.12, hexc(0xff2bd6, 0.3), 0, 1.82 - i * 0.03, z + 0.18 - i * 0.14); }
  }
  function build(R, cos) {
    const key = [cos.body, cos.paint, cos.wheels, cos.driver].join('|');
    const cache = cacheFor(R);
    if (cache.has(key)) return cache.get(key);
    const body = (CAT[cos.body] || CAT.b_classic).kind;
    const P = paintCols(cos.paint);
    const g = new Geo();
    let wheelPos = [[-0.85, 0.38, 0.9], [0.85, 0.38, 0.9], [-0.85, 0.38, -0.85], [0.85, 0.38, -0.85]];
    let drvZ = -0.25;
    const stripe = (w, h, d, x, y, z) => { if (P.pat === 'stripe') g.box(w, h, d, P.b, x, y, z); };
    if (body === 'classic') {
      g.box(1.5, 0.22, 2.5, DARK, 0, 0.3, 0);
      g.wedge(1.3, 0.45, 1.0, P.a, 0, 0.4, 0.75, 0.15);
      g.box(0.35, 0.3, 1.4, P.pat === 'two' ? P.b : P.a, -0.72, 0.5, -0.1); g.box(0.35, 0.3, 1.4, P.pat === 'two' ? P.b : P.a, 0.72, 0.5, -0.1);
      g.box(1.6, 0.18, 0.25, P.a, 0, 0.42, 1.28);
      stripe(0.25, 0.05, 1.0, 0, 0.66, 0.6);
      g.box(0.9, 0.55, 0.5, SEAT, 0, 0.75, -0.62);
      g.box(1.0, 0.45, 0.55, GREY, 0, 0.62, -1.05);
      g.cyl(0.08, 0.4, 6, hexc(0xc0c4c8), 'z', -0.3, 0.7, -1.35); g.cyl(0.08, 0.4, 6, hexc(0xc0c4c8), 'z', 0.3, 0.7, -1.35);
      g.cyl(0.16, 0.04, 8, BLACK, 'z', 0, 0.95, 0.35);
    } else if (body === 'racer') {
      g.box(1.4, 0.2, 2.8, DARK, 0, 0.28, 0);
      g.wedge(0.9, 0.42, 1.5, P.a, 0, 0.36, 0.85, 0.08);
      g.box(0.4, 0.28, 1.6, P.a, -0.7, 0.46, -0.15); g.box(0.4, 0.28, 1.6, P.a, 0.7, 0.46, -0.15);
      stripe(0.22, 0.05, 1.4, 0, 0.6, 0.75);
      g.box(1.9, 0.12, 0.35, P.a, 0, 0.36, 1.55); // front wing
      g.box(0.8, 0.5, 0.5, SEAT, 0, 0.7, -0.62);
      g.box(0.1, 0.55, 0.3, DARK, -0.6, 0.95, -1.25); g.box(0.1, 0.55, 0.3, DARK, 0.6, 0.95, -1.25);
      g.box(1.8, 0.1, 0.5, P.pat === 'two' ? P.b : P.a, 0, 1.25, -1.3); // spoiler
      g.cyl(0.15, 0.04, 8, BLACK, 'z', 0, 0.9, 0.3);
      wheelPos = [[-0.82, 0.36, 1.05], [0.82, 0.36, 1.05], [-0.85, 0.4, -0.95], [0.85, 0.4, -0.95]];
    } else if (body === 'buggy') {
      g.box(1.4, 0.3, 2.3, DARK, 0, 0.45, 0);
      g.wedge(1.3, 0.5, 0.9, P.a, 0, 0.6, 0.8, 0.2);
      g.box(1.5, 0.35, 0.9, P.a, 0, 0.75, -0.9);
      stripe(1.52, 0.08, 0.2, 0, 0.94, -0.9);
      const cage = P.pat === 'two' ? P.b : hexc(0x2d2d33);
      for (const s of [-1, 1]) { g.cyl(0.05, 1.3, 5, cage, 'y', s * 0.6, 1.3, -0.45); g.push(M4.trs(s * 0.6, 1.25, 0.05, 0, -0.75, 0)); g.cyl(0.05, 1.3, 5, cage, 'y', 0, 0, 0); g.pop(); }
      g.cyl(0.05, 1.25, 5, cage, 'x', 0, 1.95, -0.45);
      g.box(0.9, 0.5, 0.4, SEAT, 0, 0.95, -0.4);
      g.box(1.2, 0.18, 0.2, hexc(0xffd23a, 0.6), 0, 1.98, -0.45); // light bar
      wheelPos = [[-0.92, 0.45, 0.85], [0.92, 0.45, 0.85], [-0.92, 0.45, -0.85], [0.92, 0.45, -0.85]];
      drvZ = -0.1;
    } else if (body === 'muscle') {
      g.box(1.75, 0.5, 2.7, P.a, 0, 0.5, 0.05);
      g.box(1.4, 0.2, 1.0, P.pat === 'two' ? P.b : P.a, 0, 0.82, 0.75);
      g.box(0.5, 0.25, 0.6, BLACK, 0, 0.98, 0.75); // scoop
      stripe(0.3, 0.04, 2.6, -0.25, 0.76, 0.05); stripe(0.3, 0.04, 2.6, 0.25, 0.76, 0.05);
      g.box(1.85, 0.2, 0.2, GREY, 0, 0.35, 1.42); g.box(1.85, 0.2, 0.2, GREY, 0, 0.35, -1.32);
      g.box(0.9, 0.5, 0.45, SEAT, 0, 0.95, -0.6);
      g.box(0.3, 0.12, 0.05, hexc(0xfff6c0, 0.9), -0.6, 0.6, 1.41); g.box(0.3, 0.12, 0.05, hexc(0xfff6c0, 0.9), 0.6, 0.6, 1.41);
      wheelPos = [[-0.92, 0.42, 0.95], [0.92, 0.42, 0.95], [-0.92, 0.45, -0.9], [0.92, 0.45, -0.9]];
      drvZ = -0.15;
    } else if (body === 'hover') {
      g.wedge(1.5, 0.5, 2.8, P.a, 0, 0.45, 0, 0.12);
      g.box(0.5, 0.25, 2.2, P.pat === 'two' ? P.b : P.a, -0.85, 0.55, -0.1); g.box(0.5, 0.25, 2.2, P.pat === 'two' ? P.b : P.a, 0.85, 0.55, -0.1);
      stripe(0.2, 0.05, 2.4, 0, 0.98, 0.0);
      for (const s of [-1, 1]) for (const zz of [0.9, -0.9]) g.cyl(0.32, 0.08, 10, hexc(0x2bf0ff, 1), 'y', s * 0.85, 0.36, zz);
      g.box(0.8, 0.45, 0.45, SEAT, 0, 0.9, -0.6);
      g.box(1.6, 0.08, 0.35, P.a, 0, 1.2, -1.25); g.box(0.08, 0.35, 0.3, DARK, 0, 1.0, -1.25);
      wheelPos = [];
    } else if (body === 'tub') {
      const W = hexc(0xf4f6fa);
      g.box(1.5, 0.6, 2.4, P.a, 0, 0.6, 0);
      g.box(1.6, 0.12, 2.5, W, 0, 0.95, 0);
      g.box(1.2, 0.05, 2.0, hexc(0x8fd8ff, 0.3), 0, 0.88, 0); // water
      for (const s of [-1, 1]) for (const zz of [1.0, -1.0]) g.cone(0.08, 0.3, 5, hexc(0xffd23a, 0.3), s * 0.7, 0.15, zz); // claw feet
      g.cyl(0.05, 0.6, 5, hexc(0xc0c4c8), 'y', 0, 1.2, -1.15); g.box(0.3, 0.06, 0.12, hexc(0xc0c4c8), 0, 1.5, -1.1);
      g.sphere(0.2, 8, 6, hexc(0xffd23a), 0.45, 1.05, 0.75); g.box(0.12, 0.06, 0.12, hexc(0xff8a1c), 0.45, 1.06, 0.95);
      drvZ = -0.2;
    }
    driver(g, cos.driver, drvZ);
    // wheels
    const wk = (CAT[cos.wheels] || CAT.w_stock).kind;
    const wg = new Geo(); let wr = 0.38, ww = 0.32;
    if (wk === 'monster') { wr = 0.52; ww = 0.42; wheelPos = wheelPos.map(p => [p[0] * 1.08, 0.52, p[2]]); }
    if (wheelPos.length) {
      wg.cyl(wr, ww, 12, BLACK, 'x', 0, 0, 0, BLACK);
      const rim = wk === 'chrome' ? hexc(0xe8eef4, 0.35) : wk === 'neon' ? hexc(0x2bf0ff, 1) : wk === 'gold' ? hexc(0xffc928, 0.3) : wk === 'candy' ? hexc(0xff4fa3, 0.2) : wk === 'monster' ? hexc(0xff3b3b) : hexc(0xb8bec6);
      wg.cyl(wr * 0.6, ww + 0.04, 8, rim, 'x', 0, 0, 0, rim);
      if (wk === 'candy') wg.box(ww + 0.06, wr * 1.1, 0.1, hexc(0xffffff, 0.3), 0, 0, 0);
      else wg.box(ww + 0.06, wr * 1.1, 0.08, wk === 'neon' ? hexc(0xff2bd6, 1) : shade(rim, 0.6), 0, 0, 0);
    }
    const out = { body: R.upload(g), wheel: wheelPos.length ? R.upload(wg) : null, wheelPos, wr, hover: body === 'hover', drvH: 1.9 };
    cache.set(key, out);
    return out;
  }
  // shared prop geometry
  function propGeo(R) {
    let props = propsBy.get(R); if (props) return props;
    props = {}; propsBy.set(R, props);
    let g = new Geo(); // rocket along +z
    g.cyl(0.22, 1.2, 8, hexc(0xe53935), 'z', 0, 0, 0); g.push(M4.trs(0, 0, 0.6, 0, Math.PI / 2, 0)); g.cone(0.22, 0.45, 8, hexc(0xffffff)); g.pop();
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; g.box(0.05 + Math.abs(Math.cos(a)) * 0.4, 0.05 + Math.abs(Math.sin(a)) * 0.4, 0.3, hexc(0xffd23a), 0, 0, -0.5); }
    g.cyl(0.12, 0.1, 8, hexc(0xffa020, 1), 'z', 0, 0, -0.62);
    props.rocket = R.upload(g);
    g = new Geo(); // oil slick: flat blob
    for (let i = 0; i < 12; i++) { const a0 = i / 12 * Math.PI * 2, a1 = (i + 1) / 12 * Math.PI * 2; const r0 = 2 + Math.sin(i * 2.3) * 0.4, r1 = 2 + Math.sin((i + 1) * 2.3) * 0.4; g.tri([0, 0, 0], [Math.cos(a1) * r1, 0, Math.sin(a1) * r1], [Math.cos(a0) * r0, 0, Math.sin(a0) * r0], hexc(0x141018, 0.1)); }
    g.box(0.6, 0.02, 0.3, hexc(0x6a5cff, 0.6), 0.5, 0.02, 0.3); g.box(0.3, 0.02, 0.5, hexc(0x2bf0ff, 0.6), -0.4, 0.02, -0.5);
    props.oil = R.upload(g);
    g = new Geo(); g.sphere(1.9, 14, 9, hexc(0x5fd8ff, 0.6)); props.shield = R.upload(g);
    g = new Geo(); g.tbox(1.6, 1.6, 1.6, hexc(0xffffff, 0.35)); props.box = R.upload(g);
    g = new Geo(); for (let i = 0; i < 16; i++) { const a0 = i / 16 * Math.PI * 2, a1 = (i + 1) / 16 * Math.PI * 2; g.tri([0, 0, 0], [Math.cos(a1) * 1.1, 0, Math.sin(a1) * 1.1], [Math.cos(a0) * 1.1, 0, Math.sin(a0) * 1.1], [0, 0, 0, 0]); }
    props.blob = R.upload(g);
    g = new Geo(); g.cyl(2.6, 0.25, 24, hexc(0x2b3a6b), 'y', 0, -0.12, 0); g.cyl(2.75, 0.12, 24, hexc(0x2bf0ff, 0.9), 'y', 0, -0.28, 0); props.pedestal = R.upload(g);
    return props;
  }
  return { build, propGeo };
})();

// Kart visual instance: meshes + per-frame transform update
class KartView {
  constructor(R, cos) {
    this.R = R; this.setCos(cos);
  }
  setCos(cos) {
    this.cos = Object.assign({}, DEFAULT_EQUIP, cos || {});
    const k = KartFactory.build(this.R, this.cos);
    this.k = k;
    const props = KartFactory.propGeo(this.R);
    this.bodyM = this.R.mesh(k.body);
    this.wheels = k.wheelPos.map(() => this.R.mesh(k.wheel));
    this.shadow = this.R.mesh(props.blob, { alpha: 0.35, tint: [0, 0, 0] });
    this.shieldM = this.R.mesh(props.shield, { alpha: 0.28, visible: false, twoSided: true, blend: 'add' });
    this.meshes = [this.shadow, this.bodyM, ...this.wheels, this.shieldM];
    this.spin = 0;
  }
  update(x, y, z, yaw, pitch, roll, steer, speed, dt, opts) {
    opts = opts || {};
    const bob = this.k.hover ? 0.35 + Math.sin(performance.now() / 180) * 0.06 : 0;
    const hop = opts.hop || 0;
    M4.trs(x, y + bob + hop, z, yaw, pitch, roll, 1, this.bodyM.m);
    this.spin += speed * dt / this.k.wr;
    const tmp = new Float32Array(16);
    this.k.wheelPos.forEach((wp, i) => {
      const st = i < 2 ? steer * 0.45 : 0;
      M4.trs(wp[0], wp[1], wp[2], st, this.spin, 0, 1, tmp);
      M4.mul(this.bodyM.m, tmp, this.wheels[i].m);
    });
    M4.trs(x, y + 0.06, z, yaw, pitch, 0, 1.3, this.shadow.m);
    this.shieldM.visible = !!opts.shield;
    if (opts.shield) M4.trs(x, y + 0.9, z, performance.now() / 400, 0, 0, 1, this.shieldM.m);
    const a = opts.alpha === undefined ? 1 : opts.alpha;
    for (const m of [this.bodyM, ...this.wheels]) { m.alpha = a; m.visible = a > 0.01; m.emis = opts.flash ? 0.6 : 0; }
    this.shadow.visible = a > 0.01;
  }
}
