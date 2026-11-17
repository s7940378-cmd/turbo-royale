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
    g.rbox(0.62, 0.55, 0.42, hexc(0x2b3a55), 0, 0.92, z);
    g.rbox(0.16, 0.14, 0.5, hexc(0x2b3a55), -0.36, 0.95, z + 0.25); g.rbox(0.16, 0.14, 0.5, hexc(0x2b3a55), 0.36, 0.95, z + 0.25);
    // helmet
    g.sphere(0.34, 16, 10, c, 0, 1.45, z);
    g.rbox(0.5, 0.16, 0.12, hexc(0x111a26, 0.15), 0, 1.47, z + 0.28); // visor
    const t = d.top;
    if (t === 'horns') { g.push(M4.trs(-0.22, 1.72, z, 0, 0, 0.5)); g.cone(0.07, 0.3, 6, hexc(0xfff3d6)); g.pop(); g.push(M4.trs(0.22, 1.72, z, 0, 0, -0.5)); g.cone(0.07, 0.3, 6, hexc(0xfff3d6)); g.pop(); }
    if (t === 'crown') { const gc = hexc(0xffd23a, 0.25); g.cyl(0.2, 0.14, 8, gc, 'y', 0, 1.8, z); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; g.cone(0.05, 0.14, 4, gc, Math.cos(a) * 0.17, 1.86, z + Math.sin(a) * 0.17); } }
    if (t === 'ears') { g.rbox(0.1, 0.45, 0.06, c, -0.13, 1.92, z); g.rbox(0.1, 0.45, 0.06, c, 0.13, 1.92, z); g.rbox(0.05, 0.32, 0.07, hexc(0xff6fae), -0.13, 1.92, z + 0.01); g.rbox(0.05, 0.32, 0.07, hexc(0xff6fae), 0.13, 1.92, z + 0.01); }
    if (t === 'cat') { g.push(M4.trs(-0.18, 1.74, z, 0, 0, 0.2)); g.cone(0.1, 0.2, 4, c); g.pop(); g.push(M4.trs(0.18, 1.74, z, 0, 0, -0.2)); g.cone(0.1, 0.2, 4, c); g.pop(); }
    if (t === 'antenna') { g.cyl(0.02, 0.35, 4, GREY, 'y', 0, 1.9, z); g.sphere(0.07, 6, 4, hexc(0xff3030, 0.9), 0, 2.08, z); }
    if (t === 'antenna2') { for (const s of [-1, 1]) { g.push(M4.trs(s * 0.12, 1.85, z, 0, 0, -s * 0.35)); g.cyl(0.02, 0.35, 4, c, 'y', 0, 0, 0); g.sphere(0.07, 6, 4, hexc(0xfff04a, 0.8), 0, 0.2, 0); g.pop(); } }
    if (t === 'stem') { g.cyl(0.05, 0.18, 5, hexc(0x3f7d20), 'y', 0, 1.84, z); g.rbox(0.2, 0.03, 0.1, hexc(0x5fbf3f), 0.1, 1.86, z); }
    if (t === 'halo') { for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.rbox(0.1, 0.05, 0.1, hexc(0xffe14a, 1), Math.cos(a) * 0.26, 1.98, z + Math.sin(a) * 0.26); } }
    if (t === 'cap') { g.rbox(0.6, 0.12, 0.6, hexc(0xe8333a), 0, 1.76, z); g.rbox(0.5, 0.05, 0.3, hexc(0xe8333a), 0, 1.72, z + 0.4); }
    if (t === 'band') { g.rbox(0.72, 0.1, 0.72, hexc(0xe8333a), 0, 1.58, z); g.rbox(0.08, 0.3, 0.05, hexc(0xe8333a), 0.2, 1.45, z - 0.38); }
    if (t === 'star') { g.push(M4.trs(0, 1.98, z, 0, 0, Math.PI / 4)); g.rbox(0.3, 0.3, 0.08, hexc(0xfff27a, 1)); g.pop(); g.rbox(0.3, 0.3, 0.08, hexc(0xfff27a, 1), 0, 1.98, z); }
    if (t === 'fin') { g.push(M4.trs(0, 1.72, z + 0.05, 0, 0, 0)); g.wedge(0.08, 0.4, 0.5, c, 0, 0, 0, 0); g.pop(); }
    if (t === 'mohawk') { for (let i = 0; i < 4; i++) g.rbox(0.07, 0.24 - i * 0.03, 0.12, hexc(0xff2bd6, 0.3), 0, 1.82 - i * 0.03, z + 0.18 - i * 0.14); }
  }
  function build(R, cos) {
    const key = [cos.body, cos.paint, cos.wheels, cos.driver].join('|');
    const cache = cacheFor(R);
    if (cache.has(key)) return cache.get(key);
    let body = (CAT[cos.body] || CAT.b_classic).kind; const primeBody = body === 'hoverx'; if (primeBody) body = 'hover';
    const P = paintCols(cos.paint);
    const g = new Geo();
    let wheelPos = [[-0.85, 0.38, 0.9], [0.85, 0.38, 0.9], [-0.85, 0.38, -0.85], [0.85, 0.38, -0.85]];
    let drvZ = -0.25;
    const stripe = (w, h, d, x, y, z) => { if (P.pat === 'stripe') g.rbox(w, h, d, P.b, x, y, z); };
    const GLASS = hexc(0x16222f, 0.06), CHROME = hexc(0xdfe6ee, 0.22), HL = hexc(0xfff6d8, 0.95), TL = hexc(0xff2a2a, 0.85), GUN = hexc(0x2a2e36);
    const P2 = P.pat === 'two' ? P.b : P.a;
    const S = (z, w, h, y, n) => ({ z, w, h, y, n });
    // paint for curved shells: a racing stripe along the top centre, or two-tone with the lower half in the second colour
    const paint = sw => (dx, dy, hh) => (P.pat === 'stripe' && Math.abs(dx) < sw && dy > hh * 0.3) ? P.b : (P.pat === 'two' && dy < -hh * 0.1) ? P.b : P.a;
    const wheelArm = (x0, y0, z0, x1, y1, z1) => g.tube([x0, y0, z0], [x1, y1, z1], 0.035, DARK, 6);
    const steer = (z, y) => { g.push(M4.trs(0, y || 0.95, z, 0, -0.5, 0)); g.cyl(0.17, 0.04, 16, BLACK, 'z', 0, 0, 0, GUN); g.pop(); g.tube([0, (y || 0.95) - 0.02, z - 0.02], [0, 0.6, z + 0.42], 0.03, DARK, 6); };
    if (body === 'classic') {
      g.rbox(1.3, 0.14, 2.6, DARK, 0, 0.26, 0);
      g.loft([S(1.62, 0.1, 0.12, 0.3, 2.4), S(1.5, 0.4, 0.22, 0.27, 2.6), S(1.15, 0.6, 0.32, 0.26, 3), S(0.7, 0.62, 0.4, 0.27, 3.2), S(0.38, 0.5, 0.44, 0.29, 3), S(0.26, 0.36, 0.36, 0.33, 2.8)], 18, paint(0.1));
      for (const sx of [-1, 1]) g.loft([S(0.5, 0.05, 0.12, 0.42, 2.5), S(0.36, 0.16, 0.28, 0.36, 3), S(0, 0.19, 0.32, 0.34, 3.4), S(-0.52, 0.19, 0.32, 0.34, 3.4), S(-0.74, 0.14, 0.26, 0.37, 3), S(-0.84, 0.04, 0.1, 0.45, 2.5)], 14, P2, sx * 0.74);
      g.tube([-0.72, 0.3, 1.7], [0.72, 0.3, 1.7], 0.055, GREY, 10); for (const sx of [-1, 1]) g.tube([sx * 0.72, 0.3, 1.7], [sx * 0.42, 0.3, 1.38], 0.045, GREY, 8);
      g.tube([-0.7, 0.32, -1.42], [0.7, 0.32, -1.42], 0.055, GREY, 10);
      g.sbox(0.84, 0.56, 0.46, SEAT, 0, 0.74, -0.62, 3.4, 0.16);
      g.rbox(0.78, 0.36, 0.5, GREY, 0, 0.58, -1.04); g.rbox(0.6, 0.12, 0.4, DARK, 0, 0.82, -1.04);
      for (const sx of [-1, 1]) g.cyl(0.075, 0.45, 12, CHROME, 'z', sx * 0.28, 0.68, -1.4, BLACK);
      steer(0.35);
    } else if (body === 'racer') {
      g.rbox(1.3, 0.14, 2.8, DARK, 0, 0.24, 0);
      g.loft([S(1.82, 0.06, 0.08, 0.3, 2.2), S(1.55, 0.28, 0.18, 0.28, 2.6), S(1.05, 0.44, 0.3, 0.27, 3), S(0.4, 0.5, 0.4, 0.28, 3.2), S(0.15, 0.4, 0.36, 0.32, 2.8)], 18, paint(0.09));
      g.sbox(1.95, 0.08, 0.42, P2, 0, 0.33, 1.62, 4, 0.12); for (const sx of [-1, 1]) g.rbox(0.05, 0.26, 0.46, DARK, sx * 0.98, 0.42, 1.62);
      for (const sx of [-1, 1]) g.loft([S(0.62, 0.05, 0.1, 0.38, 2.5), S(0.46, 0.18, 0.26, 0.33, 3), S(-0.55, 0.21, 0.3, 0.32, 3.4), S(-0.92, 0.14, 0.22, 0.36, 3), S(-1.05, 0.04, 0.08, 0.42, 2.5)], 14, P2, sx * 0.7);
      g.sbox(0.78, 0.5, 0.46, SEAT, 0, 0.7, -0.62, 3.4, 0.16);
      g.loft([S(-0.85, 0.16, 0.26, 0.7, 2.6), S(-1.05, 0.3, 0.48, 0.62, 3), S(-1.35, 0.28, 0.44, 0.62, 3), S(-1.46, 0.18, 0.28, 0.66, 2.6)], 12, DARK);
      for (const sx of [-1, 1]) g.rbox(0.06, 0.5, 0.3, DARK, sx * 0.55, 0.98, -1.3);
      g.sbox(1.85, 0.08, 0.52, P2, 0, 1.27, -1.32, 4, 0.14); for (const sx of [-1, 1]) g.rbox(0.05, 0.3, 0.56, P.a, sx * 0.93, 1.2, -1.32);
      for (const sx of [-1, 1]) g.cyl(0.07, 0.35, 12, CHROME, 'z', sx * 0.22, 0.55, -1.52, BLACK);
      steer(0.3, 0.9);
      wheelPos = [[-0.82, 0.36, 1.05], [0.82, 0.36, 1.05], [-0.85, 0.4, -0.95], [0.85, 0.4, -0.95]];
    } else if (body === 'buggy') {
      g.rbox(1.3, 0.22, 2.3, DARK, 0, 0.42, 0);
      g.loft([S(1.28, 0.3, 0.18, 0.52, 2.6), S(1.05, 0.6, 0.36, 0.48, 3.2), S(0.55, 0.64, 0.46, 0.46, 3.4), S(0.25, 0.55, 0.42, 0.5, 3)], 16, paint(0.12));
      g.sbox(1.5, 0.38, 0.95, P2, 0, 0.75, -0.9, 4.5, 0.2);
      const cage = P.pat === 'two' ? P.b : hexc(0x2d2d33);
      for (const s of [-1, 1]) { g.tube([s * 0.6, 0.62, -0.45], [s * 0.6, 1.95, -0.45], 0.045, cage, 8); g.tube([s * 0.6, 0.78, 0.5], [s * 0.6, 1.95, -0.42], 0.045, cage, 8); g.tube([s * 0.6, 1.3, -0.45], [s * 0.6, 1.0, -1.25], 0.04, cage, 8); }
      g.tube([-0.6, 1.95, -0.45], [0.6, 1.95, -0.45], 0.045, cage, 8); g.tube([-0.6, 1.95, -0.42], [0.6, 1.95, -0.42], 0.04, cage, 8);
      g.sbox(0.86, 0.5, 0.42, SEAT, 0, 0.95, -0.4, 3.4, 0.15);
      g.sbox(1.2, 0.16, 0.18, GUN, 0, 1.98, -0.45, 3, 0.07); for (let k = -1.5; k <= 1.5; k++) g.sphere(0.07, 10, 6, hexc(0xffd23a, 0.9), k * 0.3, 1.98, -0.36);
      for (const sx of [-1, 1]) g.sphere(0.1, 10, 6, HL, sx * 0.35, 0.68, 1.28);
      steer(0.25, 1.05);
      wheelPos = [[-0.92, 0.45, 0.85], [0.92, 0.45, 0.85], [-0.92, 0.45, -0.85], [0.92, 0.45, -0.85]];
      drvZ = -0.1;
    } else if (body === 'muscle') {
      g.rbox(1.6, 0.16, 2.6, DARK, 0, 0.3, 0);
      g.loft([S(1.5, 0.8, 0.32, 0.34, 4), S(1.4, 0.88, 0.42, 0.32, 4.6), S(1.0, 0.9, 0.5, 0.3, 5), S(-0.7, 0.9, 0.55, 0.3, 5), S(-1.22, 0.88, 0.52, 0.3, 4.6), S(-1.44, 0.8, 0.42, 0.32, 4)], 20, paint(0.28));
      g.loft([S(1.25, 0.24, 0.08, 0.78, 3), S(1.0, 0.3, 0.22, 0.76, 3.4), S(0.45, 0.3, 0.26, 0.76, 3.4), S(0.32, 0.2, 0.18, 0.78, 3)], 12, BLACK); // scoop
      g.sbox(1.85, 0.18, 0.18, CHROME, 0, 0.4, 1.5, 3, 0.09); g.sbox(1.85, 0.18, 0.18, CHROME, 0, 0.4, -1.47, 3, 0.09);
      for (const sx of [-1, 1]) { g.sphere(0.12, 12, 8, HL, sx * 0.6, 0.62, 1.42); g.rbox(0.32, 0.1, 0.04, TL, sx * 0.55, 0.66, -1.46); g.cyl(0.07, 1.1, 12, CHROME, 'z', sx * 0.93, 0.33, -0.1, BLACK); }
      g.sbox(0.9, 0.5, 0.45, SEAT, 0, 0.95, -0.6, 3.4, 0.15);
      g.push(M4.trs(0, 1.02, 0.42, 0, -0.5, 0)); g.sbox(1.1, 0.36, 0.04, GLASS, 0, 0, 0, 4, 0.03); g.pop();
      wheelPos = [[-0.92, 0.42, 0.95], [0.92, 0.42, 0.95], [-0.92, 0.45, -0.9], [0.92, 0.45, -0.9]];
      drvZ = -0.15;
    } else if (body === 'hover' && primeBody) {
      // Anti-Grav Prime: same anti-grav silhouette (pointed fuselage, twin side pods, four hover pads, rear wing) in a sleek sci-fi form
      const GOLD = hexc(0xffc928, 0.3), CY = hexc(0x2bf0ff, 1), CORE = hexc(0xeaffff, 1);
      const seam = (base, under) => (dx, dy, hh) => Math.abs(dy) < hh * 0.12 ? CY : dy < 0 ? under : base(dx, dy, hh);
      const top = (dx, dy, hh) => (P.pat === 'stripe' && Math.abs(dx) < 0.07 && dy > hh * 0.4) ? P.b : P.a;
      g.loft([S(1.95, 0.03, 0.04, 0.5, 2), S(1.75, 0.22, 0.12, 0.47, 2.2), S(1.35, 0.46, 0.26, 0.43, 2.4), S(0.75, 0.62, 0.4, 0.41, 2.7), S(0, 0.7, 0.5, 0.4, 2.9), S(-0.85, 0.66, 0.5, 0.42, 2.9), S(-1.3, 0.52, 0.4, 0.47, 2.6), S(-1.45, 0.36, 0.28, 0.53, 2.3)], 22, seam(top, GUN));
      for (const sx of [-1, 1]) {
        g.loft([S(1.45, 0.03, 0.05, 0.5, 2), S(1.15, 0.16, 0.18, 0.47, 2.4), S(0.2, 0.22, 0.26, 0.45, 2.8), S(-0.95, 0.2, 0.28, 0.46, 2.8), S(-1.4, 0.08, 0.2, 0.5, 2.2)], 14, seam(() => P2, GUN), sx * 0.92);
        g.tube([sx * 1.13, 0.58, 1.1], [sx * 1.14, 0.6, -1.2], 0.028, GOLD, 6);
        for (const zz of [0.95, -0.95]) { g.cyl(0.4, 0.12, 20, GUN, 'y', sx * 0.92, 0.4, zz, GUN); g.cyl(0.36, 0.05, 20, CY, 'y', sx * 0.92, 0.32, zz); g.cyl(0.2, 0.06, 14, CORE, 'y', sx * 0.92, 0.3, zz); g.cyl(0.405, 0.025, 20, GOLD, 'y', sx * 0.92, 0.465, zz); }
        g.cyl(0.2, 0.7, 18, GUN, 'z', sx * 0.36, 0.72, -1.42, GUN); g.cyl(0.215, 0.1, 18, GOLD, 'z', sx * 0.36, 0.72, -1.08); g.cyl(0.15, 0.06, 16, CY, 'z', sx * 0.36, 0.72, -1.79); g.cyl(0.08, 0.08, 10, CORE, 'z', sx * 0.36, 0.72, -1.81);
        g.push(M4.trs(sx * 0.42, 0.88, -1.08, 0, 0, sx * -0.35)); g.wedge(0.05, 0.44, 0.62, P.a, 0, 0, 0, 0.02); g.pop();
        g.sphere(0.05, 8, 5, CY, sx * 0.17, 0.6, 1.5);
      }
      g.sphere(0.42, 16, 8, hexc(0x0d1a2a, 0.25), 0, 0.84, 0.38, 0.55); // cockpit canopy
      g.sbox(0.76, 0.48, 0.46, GUN, 0, 0.92, -0.6, 3.4, 0.15);
      // floating rear wing: no struts, glowing underside
      g.sbox(1.95, 0.07, 0.42, P.a, 0, 1.34, -1.38, 4, 0.14); g.sbox(1.88, 0.02, 0.36, CY, 0, 1.29, -1.38, 4, 0.12); for (const sx of [-1, 1]) { g.push(M4.trs(sx * 0.98, 1.24, -1.4, 0, 0, 0)); g.wedge(0.04, 0.24, 0.5, GOLD, 0, 0, 0, 0.06); g.pop(); }
      wheelPos = [];
    } else if (body === 'hover') {
      g.loft([S(1.55, 0.1, 0.08, 0.5, 2.2), S(1.3, 0.38, 0.2, 0.46, 2.5), S(0.8, 0.6, 0.36, 0.43, 2.9), S(0, 0.68, 0.48, 0.42, 3.1), S(-0.9, 0.64, 0.48, 0.44, 3.1), S(-1.35, 0.48, 0.36, 0.5, 2.8), S(-1.45, 0.3, 0.22, 0.56, 2.5)], 20, paint(0.1));
      for (const sx of [-1, 1]) {
        g.loft([S(1.25, 0.06, 0.1, 0.52, 2.4), S(1.0, 0.2, 0.22, 0.48, 2.8), S(-0.9, 0.22, 0.26, 0.47, 3.2), S(-1.25, 0.14, 0.18, 0.52, 2.6), S(-1.32, 0.04, 0.06, 0.56, 2)], 14, P2, sx * 0.86);
        for (const zz of [0.9, -0.9]) { g.cyl(0.36, 0.14, 18, GUN, 'y', sx * 0.86, 0.42, zz, GUN); g.cyl(0.3, 0.06, 18, hexc(0x2bf0ff, 1), 'y', sx * 0.86, 0.33, zz); }
        g.sphere(0.07, 8, 5, hexc(0x2bf0ff, 1), sx * 0.22, 0.6, 1.32);
      }
      g.sbox(0.78, 0.46, 0.46, SEAT, 0, 0.92, -0.6, 3.4, 0.15);
      g.sbox(1.65, 0.07, 0.4, P.a, 0, 1.22, -1.25, 4, 0.12); for (const sx of [-1, 1]) g.rbox(0.06, 0.34, 0.3, DARK, sx * 0.5, 1.02, -1.25);
      wheelPos = [];
    } else if (body === 'tub') {
      const W = hexc(0xf4f6fa);
      g.loft([S(1.25, 0.55, 0.3, 0.38, 2.6), S(1.12, 0.74, 0.58, 0.32, 3.4), S(-1.08, 0.74, 0.6, 0.32, 3.4), S(-1.22, 0.55, 0.36, 0.38, 2.6)], 20, P.a);
      g.sbox(1.6, 0.1, 2.5, W, 0, 0.96, 0, 4, 0.4); g.sbox(1.25, 0.04, 2.0, hexc(0x8fd8ff, 0.3), 0, 0.9, 0, 4, 0.35);
      for (const s of [-1, 1]) for (const zz of [1.0, -1.0]) g.cone(0.09, 0.32, 10, hexc(0xffd23a, 0.3), s * 0.66, 0.12, zz);
      g.tube([0, 0.9, -1.15], [0, 1.45, -1.15], 0.05, CHROME, 10); g.tube([0, 1.45, -1.15], [0, 1.45, -0.95], 0.05, CHROME, 10);
      g.sphere(0.2, 14, 9, hexc(0xffd23a), 0.45, 1.05, 0.75); g.sphere(0.12, 10, 7, hexc(0xffd23a), 0.45, 1.3, 0.85); g.cone(0.05, 0.1, 6, hexc(0xff8a1c), 0.45, 1.27, 0.98);
      drvZ = -0.2;
    }
    if (body === 'bike' || body === 'chopper' || body === 'scooter') {
      const chop = body === 'chopper', sc = body === 'scooter', fz0 = chop ? 1.55 : sc ? 0.85 : 1.05, rz0 = sc ? -0.75 : -0.95, wy = sc ? 0.3 : 0.42;
      if (sc) {
        g.sbox(0.48, 0.12, 1.25, P.a, 0, 0.42, 0, 4, 0.12);
        g.loft([S(0.8, 0.16, 0.85, 0.46, 2.6), S(0.7, 0.23, 0.95, 0.44, 3), S(0.55, 0.2, 0.9, 0.46, 3)], 12, paint(0.05));
        g.loft([S(-0.18, 0.12, 0.2, 0.62, 2.5), S(-0.35, 0.25, 0.4, 0.55, 3), S(-0.8, 0.25, 0.42, 0.55, 3.2), S(-0.98, 0.12, 0.26, 0.6, 2.6)], 14, P2);
        g.sbox(0.44, 0.12, 0.62, SEAT, 0, 0.99, -0.5, 3, 0.14);
      } else {
        g.rbox(0.3, 0.34, 1.6, DARK, 0, 0.62, 0);
        g.loft([S(0.68, 0.06, 0.12, 0.86, 2.4), S(0.55, 0.24, 0.3, 0.82, 2.8), S(0.15, 0.27, 0.36, 0.8, 3), S(-0.18, 0.18, 0.28, 0.83, 2.6)], 16, paint(0.05));
        g.sbox(0.42, 0.14, 0.8, SEAT, 0, 0.97, -0.5, 3, 0.15);
        g.loft([S(-0.75, 0.2, 0.26, 0.8, 2.6), S(-1.1, 0.18, 0.3, 0.85, 2.6), S(-1.3, 0.06, 0.12, 0.95, 2)], 12, P2);
        g.rbox(0.18, 0.06, 0.05, TL, 0, 1.0, -1.3);
        if (!chop) {
          g.loft([S(1.32, 0.04, 0.12, 0.7, 2.2), S(1.15, 0.24, 0.5, 0.62, 2.6), S(0.85, 0.3, 0.72, 0.55, 2.8), S(0.6, 0.26, 0.6, 0.6, 2.6)], 16, paint(0.05));
          g.push(M4.trs(0, 1.36, 0.78, 0, -0.55, 0)); g.sbox(0.42, 0.34, 0.03, GLASS, 0, 0, 0, 3, 0.06); g.pop();
        } else {
          for (const sx of [-1, 1]) g.tube([sx * 0.16, 0.42, 1.55], [sx * 0.16, 1.5, 0.68], 0.06, CHROME, 10);
          g.push(M4.trs(0, 0.62, 0.15, 0, 0.45, 0)); g.cyl(0.13, 0.5, 14, CHROME, 'y'); g.pop(); g.push(M4.trs(0, 0.62, -0.15, 0, -0.45, 0)); g.cyl(0.13, 0.5, 14, CHROME, 'y'); g.pop();
        }
        for (const sx of [-1, 1]) g.cyl(0.075, 1.1, 14, CHROME, 'z', sx * 0.24, 0.5, -0.8, BLACK);
      }
      const hy = chop ? 1.75 : 1.35, hz = sc ? 0.62 : chop ? 0.55 : 0.62;
      g.tube([-0.55, hy, hz], [0.55, hy, hz], 0.035, BLACK, 8); for (const sx of [-1, 1]) g.cyl(0.05, 0.16, 8, GUN, 'x', sx * 0.5, hy, hz);
      g.sphere(0.13, 12, 8, HL, 0, sc ? 1.2 : 1.05, fz0 - (chop ? 0.5 : 0.1));
      wheelPos = [[0, wy, fz0], [0, wy, rz0]]; drvZ = sc ? -0.45 : -0.4;
    } else if (body === 'atv') {
      g.rbox(0.9, 0.3, 2.0, DARK, 0, 0.62, 0);
      g.loft([S(1.15, 0.4, 0.2, 0.72, 3), S(0.95, 0.5, 0.38, 0.68, 3.6), S(-0.95, 0.5, 0.42, 0.66, 3.8), S(-1.12, 0.4, 0.3, 0.72, 3)], 18, paint(0.12));
      for (const sx of [-1, 1]) for (const zz of [0.9, -0.9]) g.sbox(0.58, 0.12, 0.98, P2, sx * 0.86, 1.02, zz, 4, 0.22);
      g.sbox(0.6, 0.18, 0.8, SEAT, 0, 1.1, -0.45, 3, 0.18);
      g.tube([-0.55, 1.45, 0.6], [0.55, 1.45, 0.6], 0.035, BLACK, 8); g.tube([0, 1.12, 0.45], [0, 1.45, 0.6], 0.04, DARK, 6);
      for (const zz of [1.12, -1.05]) { g.tube([-0.4, 1.02, zz], [0.4, 1.02, zz], 0.03, GUN, 6); g.tube([-0.4, 1.02, zz - 0.25 * Math.sign(zz)], [0.4, 1.02, zz - 0.25 * Math.sign(zz)], 0.03, GUN, 6); }
      g.sbox(1.1, 0.2, 0.2, GUN, 0, 0.7, 1.15, 3, 0.08);
      for (const sx of [-1, 1]) g.sphere(0.13, 12, 8, HL, sx * 0.3, 0.95, 1.1);
      wheelPos = [[-0.92, 0.5, 0.9], [0.92, 0.5, 0.9], [-0.92, 0.5, -0.9], [0.92, 0.5, -0.9]]; drvZ = -0.35;
    } else if (body === 'ufo') {
      g.cyl(1.7, 0.3, 32, P.a, 'y', 0, 0.55, 0, P.a, 1.1); g.cyl(1.1, 0.25, 32, P2, 'y', 0, 0.3, 0, DARK, 1.7);
      g.cyl(1.72, 0.04, 32, CHROME, 'y', 0, 0.4, 0);
      for (let k = 0; k < 10; k++) { const an = k / 10 * Math.PI * 2; g.sphere(0.13, 10, 6, hexc(k % 2 ? 0x2bf0ff : 0xffe14a, 1), Math.cos(an) * 1.48, 0.48, Math.sin(an) * 1.48); }
      g.cyl(0.5, 0.1, 20, hexc(0x8cff00, 1), 'y', 0, 0.14, 0); g.sbox(0.7, 0.4, 0.4, SEAT, 0, 0.85, -0.55, 3.4, 0.14);
      wheelPos = []; drvZ = -0.1;
    }
    if (body === 'formula') {
      g.loft([S(2.42, 0.06, 0.08, 0.34, 2.2), S(2.05, 0.2, 0.18, 0.32, 2.6), S(1.3, 0.3, 0.26, 0.31, 2.9), S(0.4, 0.36, 0.34, 0.31, 3.1), S(-0.4, 0.4, 0.42, 0.32, 3.1), S(-1.2, 0.32, 0.55, 0.36, 3), S(-1.65, 0.2, 0.42, 0.45, 2.6), S(-1.82, 0.08, 0.2, 0.55, 2.2)], 20, paint(0.07));
      g.sbox(2.1, 0.07, 0.45, P2, 0, 0.3, 2.36, 4, 0.12); for (const sx of [-1, 1]) g.rbox(0.06, 0.3, 0.48, P.b, sx * 1.04, 0.42, 2.36);
      for (const sx of [-1, 1]) {
        g.loft([S(0.38, 0.06, 0.1, 0.45, 2.4), S(0.22, 0.22, 0.3, 0.36, 3), S(-0.8, 0.22, 0.34, 0.34, 3.2), S(-1.05, 0.12, 0.2, 0.4, 2.6)], 14, P2, sx * 0.55);
        wheelArm(sx * 0.28, 0.48, 1.35, sx * 0.85, 0.42, 1.3); wheelArm(sx * 0.28, 0.4, 1.15, sx * 0.85, 0.42, 1.3);
        wheelArm(sx * 0.3, 0.5, -1.15, sx * 0.85, 0.46, -1.2); wheelArm(sx * 0.3, 0.42, -1.35, sx * 0.85, 0.46, -1.2);
        g.tube([sx * 0.32, 0.98, -0.2], [0, 1.08, 0.22], 0.035, GUN, 8); // halo
      }
      g.tube([0, 1.08, 0.22], [0, 0.7, 0.55], 0.035, GUN, 8);
      g.sbox(0.6, 0.45, 0.45, SEAT, 0, 0.7, -0.45, 3.4, 0.15);
      g.sbox(1.6, 0.08, 0.5, P2, 0, 1.35, -1.68, 4, 0.14); for (const sx of [-1, 1]) g.rbox(0.06, 0.62, 0.52, DARK, sx * 0.8, 1.1, -1.68);
      g.cyl(0.07, 0.25, 12, CHROME, 'z', 0, 0.6, -1.9, BLACK);
      steer(0.22, 0.85);
      wheelPos = [[-0.95, 0.4, 1.3], [0.95, 0.4, 1.3], [-0.95, 0.45, -1.2], [0.95, 0.45, -1.2]]; drvZ = -0.3;
    } else if (body === 'truck') {
      g.rbox(1.6, 0.3, 2.8, DARK, 0, 0.68, 0);
      g.loft([S(1.48, 0.76, 0.42, 0.82, 4.2), S(1.38, 0.8, 0.55, 0.8, 5), S(0.4, 0.8, 0.58, 0.8, 5), S(0.32, 0.78, 0.5, 0.82, 5)], 18, paint(0.2));
      g.sbox(1.6, 0.9, 0.95, P.a, 0, 1.33, -0.1, 4.5, 0.16);
      g.push(M4.trs(0, 1.5, 0.38, 0, -0.35, 0)); g.sbox(1.42, 0.46, 0.04, GLASS, 0, 0, 0, 4, 0.04); g.pop();
      for (const sx of [-1, 1]) g.rbox(0.03, 0.36, 0.62, GLASS, sx * 0.81, 1.5, -0.12);
      g.sbox(1.7, 0.5, 1.05, P2, 0, 1.1, -1.1, 4.5, 0.12); g.rbox(1.46, 0.22, 0.9, DARK, 0, 1.33, -1.1);
      g.rbox(1.15, 0.3, 0.05, GUN, 0, 1.0, 1.49); for (let k = -2; k <= 2; k++) g.rbox(0.04, 0.26, 0.06, CHROME, k * 0.22, 1.0, 1.5);
      g.sbox(1.8, 0.24, 0.22, CHROME, 0, 0.8, 1.52, 3, 0.1); g.sbox(1.8, 0.2, 0.2, CHROME, 0, 0.82, -1.66, 3, 0.1);
      for (const sx of [-1, 1]) { g.sphere(0.12, 12, 8, HL, sx * 0.6, 1.08, 1.45); g.rbox(0.12, 0.26, 0.04, TL, sx * 0.75, 1.15, -1.64); g.sbox(0.08, 0.14, 0.18, GUN, sx * 0.88, 1.6, 0.25, 3, 0.05); }
      g.sbox(1.2, 0.12, 0.15, GUN, 0, 1.82, -0.1, 3, 0.06); for (let k = -1.5; k <= 1.5; k++) g.sphere(0.06, 8, 5, hexc(0xffd23a, 0.9), k * 0.28, 1.82, -0.02);
      wheelPos = [[-0.95, 0.5, 0.95], [0.95, 0.5, 0.95], [-0.95, 0.5, -0.95], [0.95, 0.5, -0.95]]; drvZ = -0.05;
    } else if (body === 'jet') {
      g.rbox(1.1, 0.2, 2.4, DARK, 0, 0.33, 0.1);
      g.loft([S(1.62, 0.08, 0.1, 0.45, 2.2), S(1.35, 0.36, 0.24, 0.42, 2.6), S(0.85, 0.5, 0.36, 0.42, 3), S(0.4, 0.48, 0.4, 0.44, 3)], 16, paint(0.1));
      g.cyl(0.5, 1.6, 24, P.a, 'z', 0, 0.85, -0.85, P.a, 0.56);
      g.cyl(0.59, 0.12, 24, CHROME, 'z', 0, 0.85, -0.02, GUN); g.cyl(0.47, 0.04, 22, BLACK, 'z', 0, 0.85, 0.05); g.sphere(0.15, 12, 8, CHROME, 0, 0.85, 0.02);
      g.cyl(0.52, 0.35, 24, GUN, 'z', 0, 0.85, -1.78, GUN, 0.4); g.cyl(0.36, 0.05, 20, hexc(0xffa020, 1), 'z', 0, 0.85, -1.97);
      for (const sx of [-1, 1]) g.sbox(0.95, 0.06, 0.6, P2, sx * 0.9, 0.7, -0.9, 4, 0.2);
      g.sbox(0.7, 0.4, 0.4, SEAT, 0, 0.6, 0.35, 3.4, 0.14);
      for (const sx of [-1, 1]) g.sphere(0.08, 10, 6, HL, sx * 0.3, 0.6, 1.4);
      drvZ = 0.3; wheelPos = [[-0.8, 0.36, 1.0], [0.8, 0.36, 1.0], [-0.85, 0.38, -0.8], [0.85, 0.38, -0.8]];
    } else if (body === 'bug') {
      g.rbox(1.3, 0.25, 2.0, DARK, 0, 0.35, 0);
      g.sphere(0.95, 22, 14, P.a, 0, 0.75, 0.15, 0.7);
      for (const sx of [-1, 1]) { g.sphere(0.45, 16, 10, P2, sx * 0.55, 0.55, 0.85, 0.8); g.sphere(0.42, 16, 10, P2, sx * 0.55, 0.55, -0.62, 0.8); g.sphere(0.13, 12, 8, HL, sx * 0.45, 0.66, 1.2); g.sphere(0.08, 10, 6, TL, sx * 0.5, 0.6, -0.95); }
      g.push(M4.trs(0, 1.12, 0.62, 0, -0.75, 0)); g.sbox(0.95, 0.42, 0.04, GLASS, 0, 0, 0, 4, 0.05); g.pop();
      g.sbox(1.4, 0.12, 0.12, CHROME, 0, 0.4, 1.18, 3, 0.06); g.sbox(1.3, 0.12, 0.12, CHROME, 0, 0.4, -0.95, 3, 0.06);
      g.sbox(0.8, 0.4, 0.4, SEAT, 0, 1.05, -0.4, 3.4, 0.14);
      wheelPos = [[-0.75, 0.32, 0.75], [0.75, 0.32, 0.75], [-0.75, 0.32, -0.7], [0.75, 0.32, -0.7]]; drvZ = -0.35;
    } else if (body === 'shark') {
      const belly = hexc(0xeef2f6);
      g.loft([S(1.62, 0.12, 0.14, 0.55, 2.2), S(1.45, 0.42, 0.38, 0.45, 2.4), S(1.0, 0.66, 0.56, 0.36, 2.6), S(0.2, 0.72, 0.62, 0.34, 2.7), S(-0.6, 0.68, 0.6, 0.36, 2.7), S(-1.15, 0.46, 0.46, 0.45, 2.5), S(-1.5, 0.16, 0.22, 0.6, 2.2)], 22, (dx, dy, hh) => dy < -hh * 0.25 ? belly : P.a);
      for (const sx of [-1, 1]) { for (let k = 0; k < 3; k++) g.rbox(0.03, 0.24, 0.05, BLACK, sx * 0.72, 0.66, 0.45 - k * 0.15); g.sphere(0.08, 10, 6, BLACK, sx * 0.5, 0.82, 1.15); g.sphere(0.025, 6, 4, hexc(0xffffff, 0.8), sx * 0.53, 0.85, 1.21); }
      for (let k = -4; k <= 4; k++) { g.push(M4.trs(k * 0.07, 0.62, 1.47, 0, 0, Math.PI)); g.cone(0.03, 0.09, 4, hexc(0xffffff), 0, 0, 0); g.pop(); }
      g.push(M4.trs(0, 0.9, -0.5, 0, 0, 0)); g.wedge(0.1, 0.85, 0.9, P.a, 0, 0, 0, 0); g.pop();
      g.push(M4.trs(0, 0.75, -1.45, 0, 0, 0)); g.wedge(0.08, 0.8, 0.5, P2, 0, -0.2, 0, 0.3); g.pop();
      for (const sx of [-1, 1]) { g.push(M4.trs(sx * 0.72, 0.5, 0.35, sx * 0.4, 0, sx * -0.6)); g.wedge(0.05, 0.4, 0.45, P.a, 0, 0, 0, 0); g.pop(); }
      g.sbox(0.8, 0.4, 0.4, SEAT, 0, 0.98, 0.05, 3.4, 0.14);
      drvZ = 0.05;
    } else if (body === 'roadster') {
      g.rbox(1.5, 0.16, 2.8, DARK, 0, 0.34, 0);
      g.loft([S(1.5, 0.7, 0.3, 0.36, 4), S(1.4, 0.8, 0.4, 0.34, 4.6), S(0.8, 0.82, 0.46, 0.34, 5), S(-0.6, 0.82, 0.5, 0.34, 5), S(-1.3, 0.8, 0.44, 0.36, 4.6), S(-1.5, 0.7, 0.32, 0.38, 4)], 20, paint(0.1));
      g.loft([S(1.36, 0.48, 0.06, 0.76, 3), S(1.12, 0.6, 0.12, 0.74, 3.4), S(0.42, 0.6, 0.12, 0.74, 3.4), S(0.32, 0.52, 0.08, 0.76, 3)], 14, P2);
      for (const sx of [-1, 1]) { g.push(M4.trs(sx * 0.7, 0.8, -1.15, 0, 0, 0)); g.wedge(0.1, 0.5, 0.75, P.a, 0, 0, 0, 0); g.pop(); g.sphere(0.07, 10, 6, TL, sx * 0.7, 0.85, -1.5); g.sphere(0.13, 12, 8, HL, sx * 0.55, 0.68, 1.46); g.cyl(0.15, 0.04, 14, CHROME, 'z', sx * 0.55, 0.68, 1.5); }
      g.push(M4.trs(0, 1.02, 0.25, 0, -0.35, 0)); g.sbox(1.3, 0.36, 0.04, GLASS, 0, 0, 0, 4, 0.04); g.pop(); g.tube([-0.66, 0.84, 0.32], [-0.62, 1.2, 0.2], 0.03, CHROME, 6); g.tube([0.66, 0.84, 0.32], [0.62, 1.2, 0.2], 0.03, CHROME, 6);
      g.sbox(1.0, 0.45, 0.45, hexc(0xfff3d6), 0, 0.9, -0.45, 3.4, 0.15);
      g.sbox(1.72, 0.16, 0.18, CHROME, 0, 0.44, 1.52, 3, 0.08); g.sbox(1.72, 0.16, 0.18, CHROME, 0, 0.44, -1.52, 3, 0.08);
      wheelPos = [[-0.85, 0.38, 1.0], [0.85, 0.38, 1.0], [-0.85, 0.38, -0.95], [0.85, 0.38, -0.95]]; drvZ = -0.4;
    }
    driver(g, cos.driver, drvZ);
    // wheels
    const wk = (CAT[cos.wheels] || CAT.w_stock).kind;
    const wg = new Geo(); let wr = 0.38, ww = 0.32;
    if (wk === 'monster') { wr = 0.52; ww = 0.42; wheelPos = wheelPos.map(p => [p[0] * 1.08, 0.52, p[2]]); }
    if (wk === 'mini') { wr = 0.28; ww = 0.26; wheelPos = wheelPos.map(p => [p[0], p[1] - 0.1, p[2]]); }
    if (wk === 'knobby') { wr = 0.44; ww = 0.36; wheelPos = wheelPos.map(p => [p[0] * 1.04, p[1] + 0.06, p[2]]); }
    if (wk === 'slick') { ww = 0.4; }
    if (wheelPos.length) {
      const rim = wk === 'prime' ? hexc(0xfff2a8, 1) : wk === 'turbine' ? hexc(0x9fb4c8, 0.4) : wk === 'cyber' ? hexc(0xc25cff, 1) : wk === 'wood' ? hexc(0x8a5f36) : wk === 'slick' ? hexc(0x2a2f3a) : wk === 'mini' ? hexc(0xffd23a) : wk === 'knobby' ? hexc(0x4a5560) : wk === 'chrome' ? hexc(0xe8eef4, 0.35) : wk === 'neon' ? hexc(0x2bf0ff, 1) : wk === 'gold' ? hexc(0xffc928, 0.3) : wk === 'candy' ? hexc(0xff4fa3, 0.2) : wk === 'monster' ? hexc(0xff3b3b) : hexc(0xb8bec6);
      const tyre = (r, w) => [[r * 0.6, -w / 2], [r * 0.86, -w / 2], [r * 0.97, -w * 0.36], [r, -w * 0.16], [r, w * 0.16], [r * 0.97, w * 0.36], [r * 0.86, w / 2], [r * 0.6, w / 2]];
      if (wk === 'cyber') wg.cyl(wr, ww, 24, hexc(0x1a1030, 0.2), 'x', 0, 0, 0, hexc(0xc25cff, 1));
      else if (wk === 'wood') wg.cyl(wr, ww * 0.5, 16, hexc(0x6b4a2a), 'x', 0, 0, 0, hexc(0x8a5f36));
      else wg.lathe(tyre(wr, ww), 22, BLACK);
      if (wk === 'knobby' || wk === 'monster') for (let k = 0; k < 12; k++) { const an = k / 12 * Math.PI * 2; wg.box(ww * 0.9, 0.08, 0.1, BLACK, 0, Math.cos(an) * wr, Math.sin(an) * wr); }
      if (wk === 'wood') for (let k = 0; k < 6; k++) { wg.push(M4.trs(0, 0, 0, 0, k / 6 * Math.PI, 0)); wg.box(ww * 0.4, wr * 1.8, 0.05, hexc(0x8a5f36), 0, 0, 0); wg.pop(); }
      if (wk === 'slick') wg.lathe([[wr * 1.004, -0.03], [wr * 1.004, 0.03]], 22, hexc(0xffd23a, 0.4));
      if (wk !== 'wood') {
        wg.cyl(wr * 0.6, ww * 0.84, 20, shade(rim, 0.8), 'x', 0, 0, 0, rim); // recessed rim
        wg.cyl(wr * 0.17, ww * 0.94, 12, wk === 'neon' ? hexc(0xff2bd6, 1) : shade(rim, 0.6), 'x', 0, 0, 0); // hub
        const nsp = wk === 'turbine' ? 10 : 5, sc = wk === 'neon' ? hexc(0xff2bd6, 1) : wk === 'candy' ? hexc(0xffffff, 0.3) : shade(rim, 0.85);
        for (let k = 0; k < nsp; k++) { wg.push(M4.trs(0, 0, 0, 0, k / nsp * Math.PI * 2, wk === 'turbine' ? 0.5 : 0)); wg.box(ww * 0.88, wr * 0.42, wk === 'turbine' ? 0.05 : 0.07, sc, 0, wr * 0.36, 0); wg.pop(); }
      }
    }
    const out = { body: R.upload(g), wheel: wheelPos.length ? R.upload(wg) : null, wheelPos, wr, hover: body === 'hover' || body === 'ufo', prime: primeBody, bike: wheelPos.length === 2, drvH: 1.9 };
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
    g = new Geo(); // Torpedo: big silver-and-red projectile the kart turns into (+z = front)
    g.cyl(0.95, 2.6, 14, hexc(0xc9d2dc, 0.12), 'z', 0, 1.0, -0.2);
    g.push(M4.trs(0, 1.0, 1.1, 0, Math.PI / 2, 0)); g.cone(0.95, 1.3, 14, hexc(0xe8333a, 0.1)); g.pop();
    g.cyl(0.97, 0.35, 14, hexc(0xe8333a, 0.1), 'z', 0, 1.0, 0.6); g.cyl(0.97, 0.25, 14, hexc(0x2a2f3a), 'z', 0, 1.0, -1.3);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; g.push(M4.trs(Math.cos(a) * 1.0, 1.0 + Math.sin(a) * 1.0, -1.25, 0, 0, a)); g.wedge(0.12, 0.7, 1.0, hexc(0xffd23a, 0.15), 0, -0.35, 0, 0.15); g.pop(); }
    g.box(1.3, 0.22, 0.05, hexc(0x2bf0ff, 0.9), 0, 1.25, 1.05); // glowing visor stripe
    g.cyl(0.6, 0.2, 12, hexc(0xffa020, 1), 'z', 0, 1.0, -1.55);
    props.torpedo = R.upload(g);
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
    this.torpM = this.R.mesh(props.torpedo, { visible: false });
    this.meshes = [this.shadow, this.bodyM, ...this.wheels, this.shieldM, this.torpM]; this.meshes.forEach(m => m.cull = 240); this._tmp = new Float32Array(16); this._bw = [this.bodyM, ...this.wheels];
    this.spin = 0;
  }
  update(x, y, z, yaw, pitch, roll, steer, speed, dt, opts) {
    opts = opts || {};
    const bob = this.k.hover ? 0.35 + Math.sin(performance.now() / 180) * 0.06 : 0;
    const hop = opts.hop || 0;
    M4.trs(x, y + bob + hop + (opts.jit || 0), z, yaw, pitch, roll + (opts.lean || 0) * (this.k.bike ? 3.2 : 1), 1, this.bodyM.m);
    if (opts.sq || opts.stz) { // squash & stretch about the ground
      const m = this.bodyM.m, sq = opts.sq || 0, stz = opts.stz || 0, sy = 1 + sq - stz * 0.25, sx = 1 - sq * 0.5, sz = 1 - sq * 0.5 + stz;
      m[0] *= sx; m[1] *= sx; m[2] *= sx; m[4] *= sy; m[5] *= sy; m[6] *= sy; m[8] *= sz; m[9] *= sz; m[10] *= sz;
    }
    this.spin += speed * dt / this.k.wr;
    const tmp = this._tmp;
    this.k.wheelPos.forEach((wp, i) => {
      const st = (this.k.bike ? i === 0 : i < 2) ? -steer * 0.5 : 0; // steering right lowers yaw, so wheels turn by -steer
      M4.trs(wp[0], wp[1], wp[2], st, this.spin, 0, 1, tmp);
      M4.mul(this.bodyM.m, tmp, this.wheels[i].m);
    });
    M4.trs(x, y + 0.06, z, yaw, pitch, 0, 1.3, this.shadow.m);
    this.shieldM.visible = !!opts.shield;
    if (opts.shield) M4.trs(x, y + 0.9, z, performance.now() / 400, 0, 0, 1, this.shieldM.m);
    const a = opts.alpha === undefined ? 1 : opts.alpha;
    for (const m of this._bw) { m.alpha = a; m.visible = a > 0.01 && !opts.torp; m.emis = opts.flash ? 0.6 : 0; }
    this.torpM.visible = !!opts.torp && a > 0.01; if (opts.torp) M4.trs(x, y + 0.2 + Math.sin(performance.now() / 90) * 0.08, z, yaw, pitch, performance.now() / 160, 1, this.torpM.m);
    this.shadow.visible = a > 0.01;
  }
}
