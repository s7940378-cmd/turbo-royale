// Turbo Royale — tiny WebGL engine (no dependencies)
'use strict';
const M4 = {
  ident(o) { o = o || new Float32Array(16); o.fill(0); o[0] = o[5] = o[10] = o[15] = 1; return o; },
  mul(a, b, o) {
    o = o || new Float32Array(16);
    const r = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) {
      r[c * 4 + rr] = a[rr] * b[c * 4] + a[4 + rr] * b[c * 4 + 1] + a[8 + rr] * b[c * 4 + 2] + a[12 + rr] * b[c * 4 + 3];
    }
    o.set(r); return o;
  },
  persp(fovy, asp, n, f, o) {
    o = o || new Float32Array(16); o.fill(0);
    const t = 1 / Math.tan(fovy / 2);
    o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f);
    return o;
  },
  lookAt(ex, ey, ez, tx, ty, tz, o) {
    o = o || new Float32Array(16);
    let zx = ex - tx, zy = ey - ty, zz = ez - tz; let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
    let xx = zz, xy = 0, xz = -zx; // up(0,1,0) x z
    l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0;
    o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0;
    o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * ex + xy * ey + xz * ez); o[13] = -(yx * ex + yy * ey + yz * ez); o[14] = -(zx * ex + zy * ey + zz * ez); o[15] = 1;
    return o;
  },
  // translation * Ry(yaw) * Rx(pitch) * Rz(roll) * scale
  trs(x, y, z, yaw, pitch, roll, s, o) {
    o = o || new Float32Array(16);
    s = s === undefined ? 1 : s;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch || 0), sp = Math.sin(pitch || 0), cr = Math.cos(roll || 0), sr = Math.sin(roll || 0);
    // R = Ry*Rx*Rz
    const m00 = cy * cr + sy * sp * sr, m01 = -cy * sr + sy * sp * cr, m02 = sy * cp;
    const m10 = cp * sr, m11 = cp * cr, m12 = -sp;
    const m20 = -sy * cr + cy * sp * sr, m21 = sy * sr + cy * sp * cr, m22 = cy * cp;
    o[0] = m00 * s; o[1] = m10 * s; o[2] = m20 * s; o[3] = 0;
    o[4] = m01 * s; o[5] = m11 * s; o[6] = m21 * s; o[7] = 0;
    o[8] = m02 * s; o[9] = m12 * s; o[10] = m22 * s; o[11] = 0;
    o[12] = x; o[13] = y; o[14] = z; o[15] = 1;
    return o;
  },
  pt(m, x, y, z) { return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]; },
  dir(m, x, y, z) { return [m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z]; },
};

function hexc(h, e) { return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255, e || 0]; }
function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, (a[3] || 0) + ((b[3] || 0) - (a[3] || 0)) * t]; }
function shade(c, k) { return [c[0] * k, c[1] * k, c[2] * k, c[3] || 0]; }

// Geometry builder: flat-shaded low-poly primitives with a transform stack
class Geo {
  constructor() { this.p = []; this.n = []; this.c = []; this.u = []; this.m = M4.ident(); this.stack = []; }
  push(m) { this.stack.push(this.m); this.m = M4.mul(this.m, m); return this; }
  pop() { this.m = this.stack.pop(); return this; }
  vert(x, y, z, nx, ny, nz, col, u, v) {
    const p = M4.pt(this.m, x, y, z), n = M4.dir(this.m, nx, ny, nz); const l = Math.hypot(n[0], n[1], n[2]) || 1;
    this.p.push(p[0], p[1], p[2]); this.n.push(n[0] / l, n[1] / l, n[2] / l); this.c.push(col[0], col[1], col[2], col[3] || 0); this.u.push(u || 0, v || 0);
  }
  tri(a, b, c, col, uva, uvb, uvc) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    uva = uva || [0, 0]; uvb = uvb || [0, 0]; uvc = uvc || [0, 0];
    this.vert(a[0], a[1], a[2], nx, ny, nz, col, uva[0], uva[1]);
    this.vert(b[0], b[1], b[2], nx, ny, nz, col, uvb[0], uvb[1]);
    this.vert(c[0], c[1], c[2], nx, ny, nz, col, uvc[0], uvc[1]);
  }
  quad(a, b, c, d, col, uv) { // a b c d counter-clockwise seen from front
    uv = uv || [[0, 0], [1, 0], [1, 1], [0, 1]];
    this.tri(a, b, c, col, uv[0], uv[1], uv[2]); this.tri(a, c, d, col, uv[0], uv[2], uv[3]);
  }
  box(w, h, d, col, x, y, z, topCol) {
    x = x || 0; y = y || 0; z = z || 0; const X = w / 2, Y = h / 2, Z = d / 2;
    const P = (i, j, k) => [x + i * X, y + j * Y, z + k * Z];
    const side = col, top = topCol || col, bot = shade(col, 0.7);
    this.quad(P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1), side); // +z
    this.quad(P(1, -1, -1), P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1), side); // -z
    this.quad(P(1, -1, 1), P(1, -1, -1), P(1, 1, -1), P(1, 1, 1), side); // +x
    this.quad(P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1), side); // -x
    this.quad(P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1), P(-1, 1, -1), top); // +y
    this.quad(P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1), bot); // -y
    return this;
  }
  // textured box: each face full uv
  tbox(w, h, d, col) {
    const X = w / 2, Y = h / 2, Z = d / 2; const P = (i, j, k) => [i * X, j * Y, k * Z];
    this.quad(P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1), col);
    this.quad(P(1, -1, -1), P(-1, -1, -1), P(-1, 1, -1), P(1, 1, -1), col);
    this.quad(P(1, -1, 1), P(1, -1, -1), P(1, 1, -1), P(1, 1, 1), col);
    this.quad(P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1), col);
    this.quad(P(-1, 1, 1), P(1, 1, 1), P(1, 1, -1), P(-1, 1, -1), col);
    this.quad(P(-1, -1, -1), P(1, -1, -1), P(1, -1, 1), P(-1, -1, 1), col);
    return this;
  }
  // wedge: box whose top front edge is lowered (ramp shape), front = +z
  wedge(w, h, d, col, x, y, z, frontH) {
    x = x || 0; y = y || 0; z = z || 0; const X = w / 2, Z = d / 2; const fh = frontH === undefined ? 0 : frontH;
    const b0 = y, tB = y + h, tF = y + fh;
    const A = [x - X, b0, z + Z], B = [x + X, b0, z + Z], C = [x + X, tF, z + Z], D = [x - X, tF, z + Z];
    const E2 = [x - X, b0, z - Z], F = [x + X, b0, z - Z], G2 = [x + X, tB, z - Z], H = [x - X, tB, z - Z];
    if (fh > 0.001) this.quad(A, B, C, D, col);
    this.quad(F, E2, H, G2, col);
    this.quad(D, C, G2, H, col); // slope top
    this.quad(B, F, G2, C, col);
    this.quad(E2, A, D, H, col);
    this.quad(E2, F, B, A, shade(col, .7));
    return this;
  }
  // cylinder along axis ('x','y','z'), centered
  cyl(r, h, seg, col, axis, x, y, z, capCol, r2) {
    x = x || 0; y = y || 0; z = z || 0; r2 = r2 === undefined ? r : r2; axis = axis || 'y';
    const map = (a, b, c) => axis === 'y' ? [x + a, y + b, z + c] : axis === 'x' ? [x + b, y + a, z + c] : [x + a, y + c, z + b];
    const H = h / 2; capCol = capCol || col;
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      const p0 = map(c0 * r, -H, s0 * r), p1 = map(c1 * r, -H, s1 * r), p2 = map(c1 * r2, H, s1 * r2), p3 = map(c0 * r2, H, s0 * r2);
      // axis swap is a reflection → flip winding for x/z
      const ct = map(0, H, 0), cb = map(0, -H, 0);
      if (axis === 'y') {
        this.quad(p0, p3, p2, p1, col); if (r2 > 0) this.tri(ct, p2, p3, capCol); this.tri(cb, p0, p1, capCol);
      } else {
        this.quad(p1, p2, p3, p0, col); if (r2 > 0) this.tri(ct, p3, p2, capCol); this.tri(cb, p1, p0, capCol);
      }
    }
    return this;
  }
  sphere(r, ws, hs, col, x, y, z, sy) {
    x = x || 0; y = y || 0; z = z || 0; sy = sy || 1;
    for (let j = 0; j < hs; j++) {
      const t0 = j / hs * Math.PI, t1 = (j + 1) / hs * Math.PI;
      for (let i = 0; i < ws; i++) {
        const p0 = i / ws * Math.PI * 2, p1 = (i + 1) / ws * Math.PI * 2;
        const P = (t, p) => [x + r * Math.sin(t) * Math.cos(p), y + r * Math.cos(t) * sy, z + r * Math.sin(t) * Math.sin(p)];
        const a = P(t0, p0), b = P(t0, p1), c = P(t1, p1), d = P(t1, p0);
        if (j === 0) this.tri(a, c, d, col); else if (j === hs - 1) this.tri(a, b, d, col); else this.quad(a, b, c, d, col);
      }
    }
    // fix winding: sphere tri order above is outward? ensure by normal check done in tri via cross; we rely on doubleSided=false; verify via flip
    return this;
  }
  cone(r, h, seg, col, x, y, z) { return this.cyl(r, h, seg, col, 'y', x, y + h / 2, z, col, 0); }
}

class Renderer {
  constructor(canvas, opts) {
    this.canvas = canvas; opts = opts || {}; this.fixed = !!opts.fixed;
    const gl = canvas.getContext('webgl', { antialias: true, alpha: !!opts.alpha, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve })
      || canvas.getContext('experimental-webgl');
    if (!gl) throw new Error('WebGL not available');
    this.gl = gl;
    this.prog = this._prog(`attribute vec3 aP;attribute vec3 aN;attribute vec4 aC;attribute vec2 aU;
uniform mat4 uP,uV,uM;varying vec3 vN;varying vec4 vC;varying vec2 vU;varying float vD;
void main(){vec4 w=uM*vec4(aP,1.);vec4 v=uV*w;gl_Position=uP*v;vN=(uM*vec4(aN,0.)).xyz;vC=aC;vU=aU;vD=-v.z;}`,
      `precision mediump float;varying vec3 vN;varying vec4 vC;varying vec2 vU;varying float vD;
uniform vec3 uL,uSky,uGnd,uSun,uFog,uTint;uniform vec2 uFR;uniform float uFogOn,uUseT,uA,uE;uniform sampler2D uT;
void main(){vec3 n=normalize(vN);vec4 b=vC;b.rgb*=uTint;float al=uA;if(uUseT>.5){vec4 t=texture2D(uT,vU);b.rgb*=t.rgb;al*=t.a;}
if(al<.02)discard;float h=n.y*.5+.5;vec3 amb=mix(uGnd,uSky,h);float d=max(dot(n,uL),0.);vec3 lit=b.rgb*(amb+uSun*d);
float e=clamp(b.a+uE,0.,1.);vec3 col=mix(lit,b.rgb*1.15,e);float f=clamp((vD-uFR.x)/(uFR.y-uFR.x),0.,1.)*uFogOn;col=mix(col,uFog,f);
gl_FragColor=vec4(col,al);}`);
    this.pprog = this._prog(`attribute vec3 aP;attribute vec4 aC;attribute float aS;uniform mat4 uP,uV;uniform float uK;varying vec4 vC;
void main(){vec4 v=uV*vec4(aP,1.);gl_Position=uP*v;gl_PointSize=min(aS*uK/max(-v.z,.5),128.);vC=aC;}`,
      `precision mediump float;varying vec4 vC;void main(){vec2 p=gl_PointCoord-.5;float d=length(p);if(d>.5)discard;gl_FragColor=vec4(vC.rgb,vC.a*(1.-d*2.));}`);
    const g = gl, P = this.prog;
    this.loc = {}; ['aP', 'aN', 'aC', 'aU'].forEach(a => this.loc[a] = g.getAttribLocation(P, a));
    ['uP', 'uV', 'uM', 'uL', 'uSky', 'uGnd', 'uSun', 'uFog', 'uTint', 'uFR', 'uFogOn', 'uUseT', 'uA', 'uE', 'uT'].forEach(u => this.loc[u] = g.getUniformLocation(P, u));
    this.ploc = {}; ['aP', 'aC', 'aS'].forEach(a => this.ploc[a] = g.getAttribLocation(this.pprog, a));
    ['uP', 'uV', 'uK'].forEach(u => this.ploc[u] = g.getUniformLocation(this.pprog, u));
    this.white = this.texture(null);
    this.proj = M4.ident(); this.view = M4.ident();
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
  }
  _prog(vs, fs) {
    const gl = this.gl; const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  texture(canvas, repeat) {
    const gl = this.gl; const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    if (!canvas) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255])); }
    else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      const w = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, w); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, w);
      const ext = gl.getExtension('EXT_texture_filter_anisotropic'); if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 4);
    }
    return t;
  }
  // upload a Geo → GPU geometry
  upload(geo) {
    const gl = this.gl; const n = geo.p.length / 3;
    const data = new Float32Array(n * 12);
    for (let i = 0; i < n; i++) {
      data.set([geo.p[i * 3], geo.p[i * 3 + 1], geo.p[i * 3 + 2], geo.n[i * 3], geo.n[i * 3 + 1], geo.n[i * 3 + 2], geo.c[i * 4], geo.c[i * 4 + 1], geo.c[i * 4 + 2], geo.c[i * 4 + 3], geo.u[i * 2], geo.u[i * 2 + 1]], i * 12);
    }
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return { buf: b, count: n };
  }
  // upload raw interleaved arrays (for terrain)
  uploadRaw(data) { const gl = this.gl; const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return { buf: b, count: data.length / 12 }; }
  free(g) { if (g && g.buf) this.gl.deleteBuffer(g.buf); }
  mesh(gpu, opts) { return Object.assign({ g: gpu, m: M4.ident(), visible: true, alpha: 1, tint: [1, 1, 1], emis: 0, tex: null, fog: true, twoSided: false, depthWrite: true }, opts || {}); }
  resize() {
    if (this.fixed) return;
    const c = this.canvas; const w = Math.floor(c.clientWidth * this.pixelRatio), h = Math.floor(c.clientHeight * this.pixelRatio);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  }
  render(scene, cam) {
    const gl = this.gl; this.resize();
    const W = this.canvas.width, H = this.canvas.height; gl.viewport(0, 0, W, H);
    const s = scene.sky || [0.5, 0.7, 1];
    gl.clearColor(s[0], s[1], s[2], s[3] === undefined ? 1 : s[3]); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    M4.persp(cam.fov, W / Math.max(1, H), cam.near || 0.3, cam.far || 1200, this.proj);
    M4.lookAt(cam.x, cam.y, cam.z, cam.tx, cam.ty, cam.tz, this.view);
    const L = this.loc; gl.useProgram(this.prog);
    gl.uniformMatrix4fv(L.uP, false, this.proj); gl.uniformMatrix4fv(L.uV, false, this.view);
    const l = scene.light; gl.uniform3fv(L.uL, l.dir); gl.uniform3fv(L.uSky, l.sky); gl.uniform3fv(L.uGnd, l.ground); gl.uniform3fv(L.uSun, l.sun);
    gl.uniform3fv(L.uFog, scene.fog.color); gl.uniform2f(L.uFR, scene.fog.near, scene.fog.far);
    gl.uniform1i(L.uT, 0); gl.activeTexture(gl.TEXTURE0);
    gl.enableVertexAttribArray(L.aP); gl.enableVertexAttribArray(L.aN); gl.enableVertexAttribArray(L.aC); gl.enableVertexAttribArray(L.aU);
    const opaque = [], trans = [];
    for (const m of scene.meshes) { if (!m.visible || !m.g) continue; (m.alpha < 1 || m.blend ? trans : opaque).push(m); }
    gl.disable(gl.BLEND); gl.depthMask(true);
    for (const m of opaque) this._draw(m);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    for (const m of trans) this._draw(m);
    gl.depthMask(true);
    gl.disableVertexAttribArray(L.aN); gl.disableVertexAttribArray(L.aU);
    if (scene.particles) for (const ps of scene.particles) this._particles(ps, H);
    gl.disable(gl.BLEND);
  }
  _draw(m) {
    const gl = this.gl, L = this.loc;
    gl.uniformMatrix4fv(L.uM, false, m.m);
    gl.uniform3fv(L.uTint, m.tint); gl.uniform1f(L.uA, m.alpha); gl.uniform1f(L.uE, m.emis); gl.uniform1f(L.uFogOn, m.fog ? 1 : 0);
    gl.uniform1f(L.uUseT, m.tex ? 1 : 0); gl.bindTexture(gl.TEXTURE_2D, m.tex || this.white);
    if (m.twoSided) gl.disable(gl.CULL_FACE); else gl.enable(gl.CULL_FACE);
    if (m.blend === 'add') gl.blendFunc(gl.SRC_ALPHA, gl.ONE); else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.g.buf);
    gl.vertexAttribPointer(L.aP, 3, gl.FLOAT, false, 48, 0); gl.vertexAttribPointer(L.aN, 3, gl.FLOAT, false, 48, 12);
    gl.vertexAttribPointer(L.aC, 4, gl.FLOAT, false, 48, 24); gl.vertexAttribPointer(L.aU, 2, gl.FLOAT, false, 48, 40);
    gl.drawArrays(gl.TRIANGLES, 0, m.g.count);
  }
  _particles(ps, H) {
    if (!ps.n) return;
    const gl = this.gl, L = this.ploc; gl.useProgram(this.pprog);
    gl.uniformMatrix4fv(L.uP, false, this.proj); gl.uniformMatrix4fv(L.uV, false, this.view); gl.uniform1f(L.uK, H * 0.9);
    if (!ps.buf) ps.buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ps.buf); gl.bufferData(gl.ARRAY_BUFFER, ps.out.subarray(0, ps.n * 8), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(L.aP); gl.enableVertexAttribArray(L.aC); gl.enableVertexAttribArray(L.aS);
    gl.vertexAttribPointer(L.aP, 3, gl.FLOAT, false, 32, 0); gl.vertexAttribPointer(L.aC, 4, gl.FLOAT, false, 32, 12); gl.vertexAttribPointer(L.aS, 1, gl.FLOAT, false, 32, 28);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, ps.additive ? gl.ONE : gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    gl.drawArrays(gl.POINTS, 0, ps.n);
    gl.depthMask(true); gl.disableVertexAttribArray(L.aS);
    gl.useProgram(this.prog);
  }
  // project world point to CSS pixels; returns null if behind camera
  project(x, y, z) {
    const v = M4.pt(this.view, x, y, z); if (v[2] > -0.5) return null;
    const p = this.proj; const cx = p[0] * v[0] / -v[2], cy = p[5] * v[1] / -v[2];
    return { x: (cx * 0.5 + 0.5) * this.canvas.clientWidth, y: (0.5 - cy * 0.5) * this.canvas.clientHeight, d: -v[2] };
  }
}

class Particles {
  constructor(max, additive) {
    this.max = max; this.additive = additive; this.n = 0;
    this.d = new Float32Array(max * 14); // x y z vx vy vz r g b a size life maxlife grow
    this.out = new Float32Array(max * 8); this.count = 0; this.g = new Float32Array(max);
  }
  emit(x, y, z, vx, vy, vz, col, size, life, grow, grav) {
    if (this.count >= this.max) return;
    const i = this.count++, o = i * 14, d = this.d;
    d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = vx; d[o + 4] = vy; d[o + 5] = vz; d[o + 6] = col[0]; d[o + 7] = col[1]; d[o + 8] = col[2]; d[o + 9] = col[3] === undefined ? 1 : col[3];
    d[o + 10] = size; d[o + 11] = life; d[o + 12] = life; d[o + 13] = grow || 0; this.g[i] = grav || 0;
  }
  update(dt) {
    const d = this.d; let w = 0;
    for (let i = 0; i < this.count; i++) {
      const o = i * 14; d[o + 11] -= dt; if (d[o + 11] <= 0) continue;
      d[o + 4] -= this.g[i] * dt;
      d[o] += d[o + 3] * dt; d[o + 1] += d[o + 4] * dt; d[o + 2] += d[o + 5] * dt; d[o + 10] += d[o + 13] * dt;
      if (w !== i) { d.copyWithin(w * 14, o, o + 14); this.g[w] = this.g[i]; }
      w++;
    }
    this.count = w;
    const out = this.out;
    for (let i = 0; i < w; i++) {
      const o = i * 14, q = i * 8, t = d[o + 11] / d[o + 12];
      out[q] = d[o]; out[q + 1] = d[o + 1]; out[q + 2] = d[o + 2]; out[q + 3] = d[o + 6]; out[q + 4] = d[o + 7]; out[q + 5] = d[o + 8]; out[q + 6] = d[o + 9] * Math.min(1, t * 2); out[q + 7] = Math.max(0, d[o + 10]);
    }
    this.n = w;
  }
  clear() { this.count = 0; this.n = 0; }
}

// seeded RNG
function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function vnoise(x, z, seed) { // smooth value noise
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const h = (a, b) => { let n = (a * 374761393 + b * 668265263 + (seed || 0) * 1442695041) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  return (h(xi, zi) * (1 - u) + h(xi + 1, zi) * u) * (1 - v) + (h(xi, zi + 1) * (1 - u) + h(xi + 1, zi + 1) * u) * v;
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
function mkCanvas(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }
