import { candleLayout, paintCandle } from "./candleArt.js";

/** The study for CIPHER WHEEL, painted as a real room: a dark wall above a
 *  desk, lit by nothing but the candle. On the wall hangs a brass cipher
 *  wheel on a walnut plaque; on the desk lies the sealed envelope.
 *
 *  Painted once per screen size and lit pixel by pixel from the candle's
 *  flame, in layers the candle can dim and make flicker:
 *    room  — the room with no candle at all (almost black)
 *    light — everything the candle adds, shadows included (drawn with ADD;
 *            Candle.js drives its alpha, as it drove the old wall light)
 *  and, for the wheel's turning disk: the disk itself, evenly lit, plus the
 *  light that must NOT turn with it — `shade` (the candle's fall-off across
 *  the disk and the ring's shadow on it) and `sheen` (the brass's shine) —
 *  both of which fade with the candle. */

const ROOM = "cx_room";
const LIGHT = "cx_light";
const DISK = "cx_disk";
const SHADE = "cx_disk_shade";
const SHEEN = "cx_disk_sheen";
const LUME = "cx_lume";
const LETTER = "cx_letter";

const ZW = 100; // the wall, in cm in front of the eye
const EYE_H = 40; // the eye, in cm above the desk
const AMB = [0.105, 0.12, 0.145]; // the room with the candle out
const CL = [1, 0.7, 0.42]; // candlelight
const POWER = 3.1;
const D0 = 27;
const T = .8; // the plaque's thickness, in cm

const WALL = 0;
const WOOD = 1;
const BRASS = 2;
const GROOVE = 3;
const DISKM = 4;
const POLISH = 5;
const WHITE = [1, 1, 1];
const BRASS_SPEC = [1, 0.86, 0.58];

const tone = (L) => (1.8 * L) / (1 + L);

/** Materials are baked once per viewport; only the light and flame animate. */
export function paintStudy(scene, W, H, deskY) {
  const cam = camera(W, H, deskY);
  const candle = candleLayout(cam, W, H, deskY);
  const { flame } = candle;
  // the wheel hangs on the wall above the desk: on a short canvas (a phone)
  // it shrinks with the height so the desk never cuts into its plaque
  const R = Math.min(185, W * .235, Math.max(60, H * .26));
  const wheel = { cx: W * .41, cy: Math.min(H * .36, deskY - R * 1.22), R, diskR: R * .745 };
  const env = envelopeGeom(cam, W, H, deskY);

  const room = makeCanvas(W, H);
  const light = makeCanvas(W, H);
  const rc = room.getContext("2d");
  const lc = light.getContext("2d");
  paintSurfaces(rc, lc, cam, flame);
  paintDeskGrain(rc, lc, cam);
  paintArchitecture(rc, lc, cam, flame);
  const disk = paintWheel(rc, lc, cam, flame, wheel);
  paintStudyDetails(rc, lc, cam, flame);
  paintEnvelope(rc, lc, cam, flame, env);
  paintCandle(rc, lc, cam, candle, shadePixel);
  finish(rc, lc, cam);

  addCanvas(scene.textures, ROOM, room);
  addCanvas(scene.textures, LIGHT, light);
  addCanvas(scene.textures, DISK, paintDisk(wheel, disk.bake));
  addCanvas(scene.textures, SHADE, disk.shade);
  addCanvas(scene.textures, SHEEN, disk.sheen);
  addCanvas(scene.textures, LUME, paintLume(wheel));
  return {
    room: ROOM,
    light: LIGHT,
    candle,
    wheel: {
      ...wheel,
      disk: DISK,
      shade: SHADE,
      sheen: SHEEN,
      lume: LUME,
      veil: disk.veil,
    },
    envelope: { quad: env.quad },
  };
}

/** The unfolded letter: aged paper, fold creases, the unmarked seal. The
 *  canvas carries a margin for the paper's shadow; the image goes centred. */
export function paintLetter(textures, w, h) {
  const m = Math.round(Math.min(w, h) * 0.06);
  const cv = makeCanvas(w + 2 * m, h + 2 * m);
  const g = cv.getContext("2d");
  const rnd = lcg(909);
  const edge = [];
  const jag = () => (rnd() - 0.5) * 1.6;
  for (let x = 0; x <= w; x += 12) edge.push([m + x, m + jag()]);
  for (let y = 0; y <= h; y += 12) edge.push([m + w + jag(), m + y]);
  for (let x = w; x >= 0; x -= 12) edge.push([m + x, m + h + jag()]);
  for (let y = h; y >= 0; y -= 12) edge.push([m + jag(), m + y]);
  const sheet = () => {
    g.beginPath();
    edge.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
  };
  g.save();
  g.shadowColor = "rgba(0,0,0,0.65)";
  g.shadowBlur = m * 0.8;
  g.shadowOffsetY = m * 0.25;
  sheet();
  g.fillStyle = "#000";
  g.fill();
  g.restore();

  g.save();
  sheet();
  g.clip();
  const base = g.createLinearGradient(m, 0, m + w, 0);
  base.addColorStop(0, "#cdb994");
  base.addColorStop(1, "#e6d4ad"); // the candle is off to the right
  g.fillStyle = base;
  g.fillRect(m, m, w, h);
  // fibres
  for (let i = 0; i < (w * h) / 60; i++) {
    const x = m + rnd() * w;
    const y = m + rnd() * h;
    const a = rnd() * Math.PI;
    const l = 2 + rnd() * 6;
    g.strokeStyle =
      rnd() < 0.5 ? "rgba(120,90,50,0.07)" : "rgba(255,248,230,0.1)";
    g.lineWidth = 0.7;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  // the four panels it was folded into lie at slightly different angles
  const fx = m + w * 0.5;
  const fy = m + h * 0.48;
  g.fillStyle = "rgba(60,40,15,0.07)";
  g.fillRect(m, m, fx - m, fy - m);
  g.fillStyle = "rgba(255,250,235,0.06)";
  g.fillRect(fx, fy, m + w - fx, m + h - fy);
  g.fillStyle = "rgba(60,40,15,0.035)";
  g.fillRect(m, fy, fx - m, m + h - fy);
  const crease = (x0, y0, x1, y1, ox, oy) => {
    g.lineWidth = 1.3;
    g.strokeStyle = "rgba(90,65,35,0.28)";
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
    g.lineWidth = 1;
    g.strokeStyle = "rgba(255,250,235,0.4)";
    g.beginPath();
    g.moveTo(x0 + ox, y0 + oy);
    g.lineTo(x1 + ox, y1 + oy);
    g.stroke();
  };
  crease(fx, m, fx, m + h, 1.3, 0);
  crease(m, fy, m + w, fy, 0, 1.3);
  // a coffee ring, long dried, and a tired edge
  g.strokeStyle = "rgba(120,80,30,0.09)";
  g.lineWidth = 3;
  g.beginPath();
  g.ellipse(
    m + w * 0.2,
    m + h * 0.22,
    w * 0.07,
    w * 0.065,
    0.3,
    0.4,
    Math.PI * 1.8,
  );
  g.stroke();
  const age = g.createRadialGradient(
    m + w / 2,
    m + h / 2,
    Math.min(w, h) * 0.3,
    m + w / 2,
    m + h / 2,
    Math.hypot(w, h) * 0.55,
  );
  age.addColorStop(0, "rgba(110,75,35,0)");
  age.addColorStop(1, "rgba(110,75,35,0.32)");
  g.fillStyle = age;
  g.fillRect(m, m, w, h);
  g.restore();

  seal(g, m + w - 64, m + h - 60, 21);
  addCanvas(textures, LETTER, cv);
  return LETTER;
}

export function releaseStudyArt(textures) {
  for (const key of [ROOM, LIGHT, DISK, SHADE, SHEEN, LUME, LETTER]) {
    if (textures.exists(key)) textures.remove(key);
  }
}

// ── the camera ──────────────────────────────────────────────────────────────

function camera(W, H, deskY) {
  const hy = H * 0.39;
  const F = ((deskY - hy) * ZW) / EYE_H; // puts the desk's back edge on deskY
  const cx = W / 2;
  const k = F / ZW;
  return {
    W,
    H,
    F,
    hy,
    cx,
    k,
    deskY,
    P: (x, y, z) => ({ x: cx + (F * x) / z, y: hy + (F * (EYE_H - y)) / z }),
    kAt: (z) => F / z,
    wallToWorld: (sx, sy, h = 0) => ({
      x: (sx - cx) / k,
      y: EYE_H - (sy - hy) / k,
      z: ZW - h,
    }),
    deskToWorld: (sx, sy) => {
      const z = (F * EYE_H) / Math.max(1, sy - hy);
      return { x: ((sx - cx) * z) / F, y: 0, z };
    },
  };
}

// ── lighting ────────────────────────────────────────────────────────────────

// writes one pixel of both layers: the room without the candle, and what the
// candle adds to it (diffuse, and a specular shine for polished things)
function shadePixel(alb, p, n, ks, e, vis, flame, bd, ld, o, ao, tint) {
  const lx = flame.x - p.x;
  const ly = flame.y - p.y;
  const lz = flame.z - p.z;
  const d = Math.hypot(lx, ly, lz) || 1;
  const ndl = Math.max(0, (n.x * lx + n.y * ly + n.z * lz) / d);
  const att = POWER / (1 + (d / D0) * (d / D0));
  const I = ndl * att * vis;
  let s = 0;
  if (ks > 0 && ndl > 0 && vis > 0) {
    const vx = -p.x;
    const vy = EYE_H - p.y;
    const vz = -p.z;
    const vl = Math.hypot(vx, vy, vz);
    const hx = lx / d + vx / vl;
    const hy = ly / d + vy / vl;
    const hz = lz / d + vz / vl;
    const hl = Math.hypot(hx, hy, hz);
    const ndh = Math.max(0, (n.x * hx + n.y * hy + n.z * hz) / hl);
    s = ks * att * vis * Math.pow(ndh, e) * 90;
  }
  for (let c = 0; c < 3; c++) {
    const b = alb[c] * tone(AMB[c]) * ao;
    bd[o + c] = b;
    ld[o + c] =
      alb[c] * tone(AMB[c] + I * CL[c]) * ao - b + s * tint[c] * CL[c];
  }
  bd[o + 3] = 255;
  ld[o + 3] = 255;
}

function plaster(x, y) {
  const f = .95 + .07 * noise2(x / 18, y / 18) + .055 * noise2(x * 4, y * 4) +
    .04 * noise2(x * 17, y * 17);
  return [66 * f, 73 * f, 70 * f];
}

// Same longitudinal plank material as OVERTIME; geometry and grain share
// world coordinates, so the wood recedes toward the wall.
function oak(x, z) {
  const plank = Math.floor((x + 1000) / 13.5);
  const variation = .93 + .11 * hash2(plank, 7919);
  const bend = .18 * Math.sin(z * .045 + plank * 2) + .07 * Math.sin(z * .14);
  const growth = Math.sin((x + bend) * 18 + noise2(x * 2, z / 11) * 2);
  const pore = Math.pow(Math.max(0, growth), 14);
  const fibres = noise2((x + bend) * 12, z * .24);
  const f = variation * (.94 + .09 * fibres - .065 * pore);
  return [101 * f, 69 * f, 44 * f];
}

function paintArchitecture(rc, lc, cam, flame) {
  const { W, H, deskY } = cam;
  // Crisp mouldings at actual wall depths; colour is sampled from the same
  // candle light as the plaster and the cipher's brass.
  const layers = (x, y, w, h, albedo, normal) => {
    const p = cam.wallToWorld(x + w / 2, y + h / 2);
    const b = [], l = [];
    shadePixel(albedo, p, normal, .06, 28, 1, flame, b, l, 0, 1, WHITE);
    for (const [ctx, col] of [[rc, b], [lc, l]]) { ctx.fillStyle = css(col); ctx.fillRect(x, y, w, h); }
  };
  const n = { x: 0, y: 0, z: -1 };
  const up = { x: 0, y: .8, z: -.6 };
  const side = W * .955;
  for (const ctx of [rc, lc]) {
    const g = ctx.createLinearGradient(side - 5, 0, W, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.12, 'rgba(0,0,0,.22)');
    g.addColorStop(1, 'rgba(0,0,0,.12)'); ctx.fillStyle = g; ctx.fillRect(side - 5, 0, W - side + 5, deskY);
  }
  const rail = deskY - Math.max(14, H * .026);
  layers(0, rail, W, 2, [80, 71, 53], up);
  layers(0, rail + 2, W, 10, [47, 43, 35], n);
  layers(0, rail + 12, W, 2, [16, 17, 15], n);
  // A narrow picture rail and a recessed panel give the empty wall scale.
  const top = H * .12;
  layers(side - 2, top, 2, rail - top, [52, 59, 53], { x: -.5, y: 0, z: -.86 });
  layers(0, top, side, 1, [78, 79, 65], up);
  layers(0, top + 1, side, 4, [28, 34, 31], n);
}

function paintStudyDetails(rc, lc, cam, flame) {
  const { W, H, deskY } = cam;
  const path = (ctx, points) => {
    ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
  };
  const face = (points, albedo, normal, shine = 0) => {
    const p = points.reduce((a, b) => ({ x: a.x + b.x / points.length, y: a.y + b.y / points.length, z: a.z + b.z / points.length }), { x: 0, y: 0, z: 0 });
    const b = [], l = [];
    shadePixel(albedo, p, normal, shine, 50, 1, flame, b, l, 0, 1, WHITE);
    for (const [ctx, color] of [[rc, b], [lc, l]]) {
      path(ctx, points.map(v => cam.P(v.x, v.y, v.z))); ctx.fillStyle = css(color); ctx.fill();
    }
  };
  const x = W * .755, y = H * .19, ww = W * .17, hh = H * .285;
  // A narrow recessed window, quiet night glass, and a timber sill. No
  // enlarged texture or bloom: every bevel is resolved in the final canvas.
  for (const [ctx, lit] of [[rc, false], [lc, true]]) {
    ctx.fillStyle = lit ? '#000' : '#080e14'; ctx.fillRect(x, y, ww, hh);
    if (!lit) {
      const sky = ctx.createLinearGradient(0, y, 0, y + hh);
      sky.addColorStop(0, '#101923'); sky.addColorStop(1, '#202e36');
      ctx.fillStyle = sky; ctx.fillRect(x + 10, y + 10, ww - 20, hh - 20);
      ctx.save(); ctx.beginPath(); ctx.rect(x + 10, y + 10, ww - 20, hh - 20); ctx.clip();
      const rnd = lcg(49);
      ctx.strokeStyle = '#0b141c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + ww * .88, y + hh); ctx.lineTo(x + ww * .7, y + hh * .5);
      ctx.lineTo(x + ww * .36, y + hh * .18); ctx.stroke();
      for (let i = 0; i < 7; i++) {
        const yy = y + hh * (.3 + i * .09), xx = x + ww * (.44 + i * .053);
        ctx.lineWidth = .7 + i * .13; ctx.beginPath(); ctx.moveTo(xx, yy);
        ctx.lineTo(xx + (i % 2 ? 1 : -1) * ww * (.16 + rnd() * .2), yy - hh * (.1 + rnd() * .16)); ctx.stroke();
      }
      for (let i = 0; i < 24; i++) {
        const xx = x + rnd() * ww, yy = y + rnd() * hh;
        ctx.strokeStyle = 'rgba(149,162,164,.09)'; ctx.lineWidth = .6;
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - 1, yy + 7 + rnd() * 21); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.strokeStyle = lit ? '#080907' : '#080c0d'; ctx.lineWidth = 9; ctx.strokeRect(x, y, ww, hh);
    ctx.strokeStyle = lit ? '#10120e' : '#252923'; ctx.lineWidth = 2; ctx.strokeRect(x - 3, y - 3, ww + 6, hh + 6);
    ctx.fillStyle = lit ? '#11110c' : '#242821';
    ctx.fillRect(x + ww * .5 - 3, y, 6, hh);
    ctx.fillRect(x, y + hh * .5 - 3, ww, 6);
    ctx.fillStyle = lit ? '#18170f' : '#353830';
    ctx.fillRect(x + ww * .5 - 3, y, 1, hh);
    ctx.fillRect(x, y + hh * .5 - 3, ww, 1);
  }
  const a = cam.wallToWorld(x - 11, y + hh + 4), b = cam.wallToWorld(x + ww + 11, y + hh + 4);
  face([a, b, { ...b, z: 95.5 }, { ...a, z: 95.5 }], [72, 63, 44], { x: 0, y: 1, z: 0 });
  face([{ ...a, z: 95.5 }, { ...b, z: 95.5 }, { ...b, y: b.y - 1, z: 95.5 }, { ...a, y: a.y - 1, z: 95.5 }], [65, 58, 42], { x: 0, y: 0, z: -1 });

  // Two closed, unlettered cloth books establish scale beside the envelope.
  // Their page blocks and covers are actual faces in the desk's camera.
  const c = cam.deskToWorld(W * .5, deskY + (H - deskY) * .22);
  const book = (cx, cz, base, w, d, thickness, angle, color) => {
    const P = (dx, yy, dz) => ({ x: cx + dx * Math.cos(angle) - dz * Math.sin(angle), y: yy, z: cz + dx * Math.sin(angle) + dz * Math.cos(angle) });
    const part = (yy, height, ww, dd, col) => {
      const a = P(-ww / 2, yy, -dd / 2), b = P(ww / 2, yy, -dd / 2), cc = P(ww / 2, yy, dd / 2), e = P(-ww / 2, yy, dd / 2);
      face([a, b, { ...b, y: yy + height }, { ...a, y: yy + height }], col, { x: Math.sin(angle), y: 0, z: -Math.cos(angle) });
      face([b, cc, { ...cc, y: yy + height }, { ...b, y: yy + height }], col.map(v => v * .8), { x: Math.cos(angle), y: 0, z: Math.sin(angle) });
      face([a, b, cc, e].map(p => ({ ...p, y: yy + height })), col, { x: 0, y: 1, z: 0 });
    };
    part(base, .16, w, d, color);
    part(base + .16, thickness - .32, w - .35, d - .35, [131, 121, 98]);
    part(base + thickness - .16, .16, w, d, color);
    for (const ctx of [rc, lc]) {
      ctx.strokeStyle = 'rgba(9,8,5,.3)'; ctx.lineWidth = .5;
      for (let yy = base + .32; yy < base + thickness - .2; yy += .13) {
        const pa = P(-w / 2 + .2, yy, -d / 2 + .15), pb = P(w / 2 - .2, yy, -d / 2 + .15);
        const a = cam.P(pa.x, pa.y, pa.z), b = cam.P(pb.x, pb.y, pb.z);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
  };
  for (const ctx of [rc, lc]) {
    const at = cam.P(c.x, 0, c.z);
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath();
    ctx.ellipse(at.x, at.y + 6, cam.kAt(c.z) * 10.5, cam.kAt(c.z) * 3.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  book(c.x, c.z, .1, 19, 13, 1.5, -.06, [48, 55, 46]);
  book(c.x - .7, c.z + .6, 1.6, 17, 11.5, 1.1, .09, [76, 43, 31]);
}

// OVERTIME's projected seams and individual fibres, applied to both light
// passes so their contrast survives flickering and extinguishing the candle.
function paintDeskGrain(rc, lc, cam) {
  const zNear = cam.deskToWorld(0, cam.H).z;
  const half = cam.W * zNear / (2 * cam.F) + 4;
  for (const ctx of [rc, lc]) {
    const rnd = lcg(1811);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, cam.deskY, cam.W, cam.H - cam.deskY); ctx.clip();
    const first = Math.ceil((-half + 1000) / 13.5) * 13.5 - 1000;
    for (let x = first; x < half; x += 13.5) {
      const a = cam.P(x, 0, zNear), b = cam.P(x, 0, ZW);
      const wa = cam.kAt(zNear) * .065, wb = cam.kAt(ZW) * .065;
      ctx.beginPath();
      ctx.moveTo(a.x - wa, a.y); ctx.lineTo(b.x - wb, b.y);
      ctx.lineTo(b.x + wb, b.y); ctx.lineTo(a.x + wa, a.y); ctx.closePath();
      ctx.fillStyle = 'rgba(5,3,1,.46)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(a.x + wa, a.y); ctx.lineTo(b.x + wb, b.y);
      ctx.strokeStyle = 'rgba(177,131,72,.07)'; ctx.lineWidth = .65; ctx.stroke();
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < 1200; i++) {
      const x = -half + rnd() * half * 2, phase = rnd() * Math.PI * 2;
      const amplitude = .03 + rnd() * .16;
      const z0 = zNear + rnd() * (ZW - zNear);
      const z1 = Math.min(ZW, z0 + 15 + rnd() * 60);
      ctx.beginPath();
      for (let z = z0; z <= z1; z += 1.5) {
        const p = cam.P(x + Math.sin(z * .06 + phase) * amplitude, 0, z);
        if (z === z0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = `rgba(10,5,2,${.04 + rnd() * .095})`;
      ctx.lineWidth = Math.max(.4, cam.kAt((z0 + z1) / 2) * .024); ctx.stroke();
    }
    ctx.restore();
  }
}

function walnut(x, y) {
  const f =
    0.76 + 0.4 * noise2(x / 16, y * 1.3) * (0.75 + 0.25 * noise2(x / 5, y / 5));
  return [104 * f, 62 * f, 38 * f];
}

function brass(x, y) {
  const f = 0.94 + 0.1 * noise2(x * 1.5, y * 1.5);
  return [210 * f, 170 * f, 96 * f];
}

// Native-resolution material detail: fine grain must not be enlarged with
// the lighting, otherwise the entire tabletop looks out of focus.
function paintSurfaces(rc, lc, cam, flame) {
  const { W, H, deskY } = cam;
  const w = Math.ceil(W);
  const h = Math.ceil(H);
  const bi = rc.createImageData(w, h);
  const li = lc.createImageData(w, h);
  const NW = { x: 0, y: 0, z: -1 };
  const UP = { x: 0, y: 1, z: 0 };

  for (let j = 0; j < h; j++) {
    const sy = j + 0.5;
    for (let i = 0; i < w; i++) {
      const sx = i + 0.5;
      const o = (j * w + i) * 4;
      if (sy < deskY) {
        const p = cam.wallToWorld(sx, sy);
        shadePixel(
          plaster(p.x, p.y),
          p,
          NW,
          0,
          1,
          1,
          flame,
          bi.data,
          li.data,
          o,
          0.55 + 0.45 * smooth01(p.y / 10),
          WHITE,
        );
      } else {
        const p = cam.deskToWorld(sx, sy);
        const albedo = oak(p.x, p.z);
        shadePixel(
          albedo,
          p,
          UP,
          0.09,
          90,
          1,
          flame,
          bi.data,
          li.data,
          o,
          0.55 + 0.45 * smooth01((ZW - p.z) / 8),
          WHITE,
        );
      }
    }
  }
  rc.putImageData(bi, 0, 0);
  lc.putImageData(li, 0, 0);
}

// the plaque, the ring and the pointer, at full size: a height field, lit
// with its own shadows (the candle's light grazes the wall)
function paintWheel(rc, lc, cam, flame, wheel) {
  const { W, deskY, k } = cam;
  const { cx, cy, R, diskR } = wheel;
  const Rp = R * 1.15;
  // the flame, seen straight on the wall, and how far it stands out from it
  const fx = cam.cx + flame.x * k;
  const fy = cam.hy + (EYE_H - flame.y) * k;
  const Hf = ZW - flame.z;
  const HMAX = T + 2.1;
  // painted at full size as far as the wheel's shadow can reach, away from
  // the flame (the light grazes the wall, so the shadow runs long)
  const toC = Math.hypot(cx - fx, cy - fy) || 1;
  const ax = (cx - fx) / toC;
  const ay = (cy - fy) / toC;
  const Ls = Math.min(360, ((T + 2) * (toC + Rp)) / Math.max(1, Hf - T - 2));
  const x0 = Math.max(0, Math.floor(Math.min(cx, cx + ax * Ls) - Rp - 40));
  const x1 = Math.min(W, Math.ceil(Math.max(cx, cx + ax * Ls) + Rp + 40));
  const y0 = Math.max(0, Math.floor(Math.min(cy, cy + ay * Ls) - Rp - 40));
  const y1 = Math.min(
    Math.floor(deskY),
    Math.ceil(Math.max(cy, cy + ay * Ls) + Rp + 40),
  );
  const w = x1 - x0;
  const h = y1 - y0;
  const Hg = new Float32Array(w * h);
  const Mg = new Uint8Array(w * h);
  const Gg = new Float32Array(w * h);
  const smp = [0, 0, 0];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      sampleWheel(x0 + i + 0.5 - cx, y0 + j + 0.5 - cy, R, smp);
      const idx = j * w + i;
      Hg[idx] = smp[0];
      Mg[idx] = smp[1];
      Gg[idx] = smp[2];
    }
  }
  // how much of the flame a point can see, marching toward it over the
  // height field; a ray that misses the plaque, or clears it, sees it all
  const march = (sx, sy, h0) => {
    const dx = fx - sx;
    const dy = fy - sy;
    const L = Math.hypot(dx, dy) || 1;
    const ux = dx / L;
    const uy = dy / L;
    const rise = (Hf - h0) / L;
    let s = 1.5;
    const rx0 = sx - cx;
    const ry0 = sy - cy;
    const c0 = rx0 * rx0 + ry0 * ry0 - Rp * Rp;
    if (c0 > 0) {
      const b = rx0 * ux + ry0 * uy;
      const disc = b * b - c0;
      if (b >= 0 || disc <= 0) return 1;
      const sIn = -b - Math.sqrt(disc);
      if (h0 + rise * sIn > HMAX) return 1;
      s = Math.max(s, sIn);
    }
    let vis = 1;
    for (; s < L; s += 2) {
      const rayH = h0 + rise * s;
      if (rayH > HMAX) break;
      const qx = sx + ux * s;
      const qy = sy + uy * s;
      const rx = qx - cx;
      const ry = qy - cy;
      if (rx * rx + ry * ry > Rp * Rp && rx * ux + ry * uy > 0) break; // past the plaque, going away
      const gx = Math.floor(qx - x0);
      const gy = Math.floor(qy - y0);
      if (gx < 0 || gy < 0 || gx >= w || gy >= h) break;
      const occ = (Hg[gy * w + gx] - rayH) / 0.3;
      if (occ > 0) {
        vis = Math.min(vis, 1 - Math.min(1, occ));
        if (vis <= 0) break;
      }
    }
    return vis;
  };

  const rimg = rc.getImageData(x0, y0, w, h);
  const limg = lc.getImageData(x0, y0, w, h);
  const bd = rimg.data;
  const ld = limg.data;
  const S2 = Math.ceil(diskR * 2) + 2;
  const ox = Math.round(cx - S2 / 2);
  const oy = Math.round(cy - S2 / 2);
  const onDisk = [];
  let Dref = 0;
  const lightAng = Math.atan2(fy - cy, fx - cx);
  const n = { x: 0, y: 0, z: -1 };
  const NWALL = { x: 0, y: 0, z: -1 };
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const idx = j * w + i;
      const o = idx * 4;
      const sx = x0 + i + 0.5;
      const sy = y0 + j + 0.5;
      const m = Mg[idx];
      const h0 = Hg[idx];
      if (m === WALL) {
        // bare wall: only where the wheel darkens it does it need repainting
        const aoP =
          0.55 +
          0.45 * smooth01((Math.hypot(sx - cx, sy - cy) - Rp) / (R * 0.1));
        const vis = march(sx, sy, 0);
        if (vis >= 0.999 && aoP >= 0.999) continue;
        const p = cam.wallToWorld(sx, sy, 0);
        shadePixel(
          plaster(p.x, p.y),
          p,
          NWALL,
          0,
          1,
          vis,
          flame,
          bd,
          ld,
          o,
          (0.55 + 0.45 * smooth01(p.y / 10)) * aoP,
          WHITE,
        );
        continue;
      }
      const hx =
        (Hg[i < w - 1 ? idx + 1 : idx] - Hg[i > 0 ? idx - 1 : idx]) / 2;
      const hyv =
        (Hg[j < h - 1 ? idx + w : idx] - Hg[j > 0 ? idx - w : idx]) / 2;
      const nl = Math.hypot(k * hx, k * hyv, 1);
      n.x = (-k * hx) / nl;
      n.y = (k * hyv) / nl;
      n.z = -1 / nl;
      const p = cam.wallToWorld(sx, sy, h0);
      const vis = march(sx, sy, h0);
      if (m === DISKM) {
        // the disk turns: here only what stays put — its light and shine
        const lx = flame.x - p.x;
        const ly = flame.y - p.y;
        const lz = flame.z - p.z;
        const d = Math.hypot(lx, ly, lz);
        const D = (-lz / d) * (POWER / (1 + (d / D0) * (d / D0)));
        Dref = Math.max(Dref, D);
        const dxc = sx - cx;
        const dyc = sy - cy;
        let da = Math.atan2(dyc, dxc) - lightAng;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        const streak =
          Math.exp(-(da * da) / 0.05) +
          0.4 * Math.exp(-((Math.abs(da) - Math.PI) ** 2) / 0.05);
        const r = Math.hypot(dxc, dyc) / diskR;
        onDisk.push(
          sx - ox,
          sy - oy,
          D,
          vis,
          vis * D * (0.07 + 0.22 * streak * r),
        );
        for (let c = 0; c < 3; c++) {
          bd[o + c] = 8;
          ld[o + c] = 0;
        }
        continue;
      }
      let alb;
      let ks = 0;
      let e = 1;
      let tint = WHITE;
      const ao = 1;
      if (m === WOOD) {
        alb = walnut(p.x, p.y);
        ks = 0.18;
        e = 24;
      } else if (m === GROOVE) {
        alb = [24, 18, 12];
      } else {
        const b = brass(p.x, p.y);
        const g = Gg[idx];
        alb = [
          b[0] * (1 - 0.6 * g),
          b[1] * (1 - 0.6 * g),
          b[2] * (1 - 0.6 * g),
        ];
        ks = m === POLISH ? 1.1 : 0.95;
        e = m === POLISH ? 80 : 56;
        tint = BRASS_SPEC;
      }
      shadePixel(alb, p, n, ks, e, vis, flame, bd, ld, o, ao, tint);
    }
  }
  rc.putImageData(rimg, x0, y0);
  lc.putImageData(limg, x0, y0);

  // the overlays for the disk
  const shade = makeCanvas(S2, S2);
  const sheen = makeCanvas(S2, S2);
  const si = shade.getContext("2d").createImageData(S2, S2);
  const hi = sheen.getContext("2d").createImageData(S2, S2);
  const full = tone(AMB[1] + Dref * CL[1]);
  for (let q = 0; q < onDisk.length; q += 5) {
    const px = Math.floor(onDisk[q]);
    const py = Math.floor(onDisk[q + 1]);
    if (px < 0 || py < 0 || px >= S2 || py >= S2) continue;
    const o = (py * S2 + px) * 4;
    const lit = tone(AMB[1] + onDisk[q + 3] * onDisk[q + 2] * CL[1]);
    si.data[o + 3] = 255 * Math.max(0, Math.min(0.92, 1 - lit / full));
    const sh = onDisk[q + 4];
    hi.data[o] = Math.min(255, sh * 255 * BRASS_SPEC[0]);
    hi.data[o + 1] = Math.min(255, sh * 255 * BRASS_SPEC[1] * CL[1]);
    hi.data[o + 2] = Math.min(255, sh * 255 * BRASS_SPEC[2] * CL[2]);
    hi.data[o + 3] = 255;
  }
  shade.getContext("2d").putImageData(si, 0, 0);
  sheen.getContext("2d").putImageData(hi, 0, 0);
  const bake = [210, 170, 96].map((a, c) => a * tone(AMB[c] + Dref * CL[c]));
  return { shade, sheen, bake, veil: 1 - tone(AMB[1]) / full };
}

// the wheel's relief: height above the wall (cm), material, engraving
function sampleWheel(dx, dy, R, out) {
  const r = Math.hypot(dx, dy);
  const Rp = R * 1.15;
  let h = 0;
  let m = WALL;
  let g = 0;
  if (r <= Rp) {
    if (r > R * 1.05) {
      // walnut, its edge rounded over
      const bw = R * 0.05;
      const u = clamp01((r - (Rp - bw)) / bw);
      h = T * Math.sqrt(1 - u * u);
      m = WOOD;
    } else if (r >= R * 0.77) {
      // the brass ring: bevelled edges, two engraved circles, a cell for
      // every letter and a tick under each
      const e = Math.max(1.5, R * 0.012);
      h =
        T +
        0.9 -
        0.35 * (1 - smooth01((R * 1.05 - r) / e)) -
        0.35 * (1 - smooth01((r - R * 0.77) / e));
      const line = (d, wpx) => Math.max(0, 1 - Math.abs(d) / wpx);
      g = Math.max(line(r - R * 0.8, 1.1), line(r - R * 0.97, 1.1));
      const a = Math.atan2(dy, dx) + Math.PI / 2;
      const step = (2 * Math.PI) / 26;
      if (r > R * 0.8 && r < R * 0.97) {
        const f = a / step - 0.5;
        g = Math.max(g, line(r * (f - Math.round(f)) * step, 1.0));
      } else if (r > R * 0.775 && r < R * 0.8) {
        const f = a / step;
        g = Math.max(g, line(r * (f - Math.round(f)) * step, 0.9));
      }
      h -= 0.12 * g;
      m = BRASS;
    } else if (r >= R * 0.745) {
      h = T - 0.4;
      m = GROOVE;
    } else {
      h = T + 0.45;
      m = DISKM;
    }
  }
  // four brass screws in the plaque's rim, their slots every which way
  for (let q = 0; r > R * 1.07 && r < R * 1.13 && q < 4; q++) {
    const ang = Math.PI / 4 + (q * Math.PI) / 2;
    const qx = dx - Math.cos(ang) * R * 1.1;
    const qy = dy - Math.sin(ang) * R * 1.1;
    const rs = R * 0.024;
    const dd = Math.hypot(qx, qy);
    if (dd < rs) {
      const sa = ang * 1.7 + q;
      h = T + 0.4 * Math.sqrt(1 - (dd / rs) ** 2);
      g = 0;
      if (Math.abs(qx * Math.sin(sa) - qy * Math.cos(sa)) < rs * 0.16) {
        h -= 0.3;
        g = 0.6;
      }
      m = POLISH;
    }
  }
  // the index at twelve o'clock: a polished wedge on a small block
  const tipY = -R * 0.925;
  const baseY = -R * 1.075;
  if (dy >= baseY && dy <= tipY) {
    const half = R * 0.05 * (1 - (dy - baseY) / (tipY - baseY));
    if (Math.abs(dx) < half) {
      h = T + 2;
      m = POLISH;
      g = 0;
    }
  } else if (dy < baseY && dy > -R * 1.14 && Math.abs(dx) < R * 0.07) {
    h = T + 2;
    m = POLISH;
    g = 0;
  }
  out[0] = h;
  out[1] = m;
  out[2] = g;
}

// the turning disk: lathe-turned brass, the inner letters' cells, a blued
// steel needle at its own A, a domed hub
function paintDisk(wheel, bake) {
  const { R, diskR } = wheel;
  const S = Math.ceil(diskR * 2) + 2;
  const cv = makeCanvas(S, S);
  const g = cv.getContext("2d");
  const rnd = lcg(5225);
  g.translate(S / 2, S / 2);
  g.fillStyle = css(bake);
  g.beginPath();
  g.arc(0, 0, diskR, 0, Math.PI * 2);
  g.fill();
  for (let r = 3; r < diskR - 1; r += 1.3) {
    g.strokeStyle =
      rnd() < 0.5
        ? `rgba(255,240,205,${(0.02 + rnd() * 0.05).toFixed(3)})`
        : `rgba(40,25,5,${(0.03 + rnd() * 0.06).toFixed(3)})`;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.stroke();
  }
  const rim = g.createRadialGradient(0, 0, diskR * 0.88, 0, 0, diskR);
  rim.addColorStop(0, "rgba(0,0,0,0)");
  rim.addColorStop(1, "rgba(0,0,0,0.45)");
  g.fillStyle = rim;
  g.beginPath();
  g.arc(0, 0, diskR, 0, Math.PI * 2);
  g.fill();
  const engrave = (path) => {
    g.strokeStyle = css(bake, 0.32);
    g.lineWidth = 1.3;
    path();
    g.stroke();
    g.strokeStyle = "rgba(255,238,200,0.14)";
    g.lineWidth = 0.6;
    path();
    g.stroke();
  };
  for (const r of [R * 0.565, R * 0.695, diskR - 4]) {
    engrave(() => {
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
    });
  }
  for (let i = 0; i < 26; i++) {
    const a = ((i + 0.5) * 2 * Math.PI) / 26 - Math.PI / 2;
    engrave(() => {
      g.beginPath();
      g.moveTo(Math.cos(a) * R * 0.565, Math.sin(a) * R * 0.565);
      g.lineTo(Math.cos(a) * R * 0.695, Math.sin(a) * R * 0.695);
    });
  }
  // the needle
  g.fillStyle = "#1b2233";
  g.beginPath();
  g.moveTo(0, -R * 0.52);
  g.lineTo(R * 0.02, -R * 0.3);
  g.lineTo(R * 0.013, -R * 0.15);
  g.lineTo(-R * 0.013, -R * 0.15);
  g.lineTo(-R * 0.02, -R * 0.3);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(150,170,225,0.5)";
  g.lineWidth = 0.8;
  g.beginPath();
  g.moveTo(0, -R * 0.5);
  g.lineTo(0, -R * 0.16);
  g.stroke();
  // the hub
  const dome = g.createRadialGradient(
    -R * 0.03,
    -R * 0.03,
    R * 0.01,
    0,
    0,
    R * 0.16,
  );
  dome.addColorStop(0, css(bake, 1.45));
  dome.addColorStop(0.6, css(bake, 1));
  dome.addColorStop(1, css(bake, 0.55));
  g.fillStyle = dome;
  g.beginPath();
  g.arc(0, 0, R * 0.16, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = css(bake, 0.35);
  g.lineWidth = 1.2;
  g.stroke();
  g.fillStyle = css(bake, 0.7);
  g.beginPath();
  g.arc(0, 0, R * 0.045, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = css(bake, 0.25);
  g.lineWidth = Math.max(1.5, R * 0.012);
  g.beginPath();
  g.moveTo(-R * 0.04, -R * 0.01);
  g.lineTo(R * 0.04, R * 0.01);
  g.stroke();
  return cv;
}

// the pale green glow of the luminous letters, once they are lit
function paintLume(wheel) {
  const { R } = wheel;
  const S = Math.ceil(R * 2.2);
  const cv = makeCanvas(S, S);
  const g = cv.getContext("2d");
  g.translate(S / 2, S / 2);
  g.shadowColor = "rgba(120,255,165,1)";
  g.shadowBlur = R * 0.09;
  g.strokeStyle = "rgba(120,255,165,0.22)";
  for (const [r, wdt] of [
    [R * 0.885, R * 0.09],
    [R * 0.63, R * 0.08],
  ]) {
    g.lineWidth = wdt;
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.stroke();
  }
  return cv;
}

function envelopeGeom(cam, W, H, deskY) {
  const c = cam.deskToWorld(W * 0.16, deskY + (H - deskY) * 0.46);
  const w = 17;
  const d = 11;
  const rot = (-6 * Math.PI) / 180;
  const cs = Math.cos(rot);
  const sn = Math.sin(rot);
  // a across it, b from its near edge (−) to its far edge (+)
  const world = (a, b, y = 0.15) => ({
    x: c.x + a * cs - b * sn,
    y,
    z: c.z + a * sn + b * cs,
  });
  const at = (a, b, y) => {
    const p = world(a, b, y);
    return cam.P(p.x, p.y, p.z);
  };
  return {
    c,
    w,
    d,
    world,
    at,
    quad: [
      at(-w / 2, -d / 2),
      at(w / 2, -d / 2),
      at(w / 2, d / 2),
      at(-w / 2, d / 2),
    ],
  };
}

// a cream envelope, back up, its flap sealed with red wax
function paintEnvelope(rc, lc, cam, flame, env) {
  const { w, d, at, world, quad } = env;
  const UP = { x: 0, y: 1, z: 0 };
  const litAt = (a, b) => {
    const p = world(a, b);
    const out = [0, 0, 0, 0];
    const lo = [0, 0, 0, 0];
    shadePixel([224, 208, 178], p, UP, 0, 1, 1, flame, out, lo, 0, 1, WHITE);
    return { base: out, add: lo };
  };
  const L = litAt(-w / 2, 0);
  const Rr = litAt(w / 2, 0);
  const poly = (ctx, pts) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  };
  const k = cam.kAt(env.c.z);
  // it rests on the desk: a soft contact shadow round it
  rc.save();
  rc.shadowColor = "rgba(0,0,0,0.7)";
  rc.shadowBlur = k * 0.6;
  rc.shadowOffsetY = k * 0.12;
  poly(rc, quad);
  rc.fillStyle = "#000";
  rc.fill();
  rc.restore();
  for (const [ctx, key] of [
    [rc, "base"],
    [lc, "add"],
  ]) {
    const gr = ctx.createLinearGradient(quad[0].x, 0, quad[1].x, 0);
    gr.addColorStop(0, css(L[key]));
    gr.addColorStop(1, css(Rr[key]));
    poly(ctx, quad);
    ctx.fillStyle = gr;
    ctx.fill();
  }
  // the folds: side and bottom flaps meeting under the top flap's tip
  const tip = at(0, d * 0.14);
  const folds = [
    [at(-w / 2, -d / 2), tip],
    [at(w / 2, -d / 2), tip],
  ];
  const flap = [
    [at(-w / 2, d / 2), tip],
    [at(w / 2, d / 2), tip],
  ];
  for (const ctx of [rc, lc]) {
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = Math.max(0.8, k * 0.05);
    for (const [a, b] of folds) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    // the top flap sits a paper's thickness proud: a crisper edge
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = k * 0.25;
    ctx.shadowOffsetY = k * 0.06;
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = Math.max(1, k * 0.07);
    for (const [a, b] of flap) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }
  // the seal: a blob of wax, raised and glossy
  const sp = world(0, d * 0.14, 0.5);
  const c = cam.P(sp.x, sp.y, sp.z);
  const rx = cam.kAt(sp.z) * 1.7;
  const ry =
    Math.abs(
      cam.P(sp.x, sp.y, sp.z - 1.7).y - cam.P(sp.x, sp.y, sp.z + 1.7).y,
    ) / 2;
  const wax = (() => {
    const out = [0, 0, 0, 0];
    const lo = [0, 0, 0, 0];
    shadePixel([150, 30, 22], sp, UP, 0, 1, 1, flame, out, lo, 0, 1, WHITE);
    return { base: out, add: lo };
  })();
  for (const [ctx, key] of [
    [rc, "base"],
    [lc, "add"],
  ]) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(1, ry / rx);
    ctx.fillStyle = css(wax[key]);
    for (const [ox, oy, rr] of [
      [0, 0, 1],
      [-0.7, 0.35, 0.36],
      [0.76, -0.2, 0.3],
      [0.42, 0.62, 0.32],
    ]) {
      ctx.beginPath();
      ctx.arc(ox * rx, oy * rx, rr * rx, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = Math.max(1, rx * 0.08);
    ctx.beginPath();
    ctx.arc(0, 0, rx * 0.66, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  softDot(
    lc,
    c.x + rx * 0.35,
    c.y - ry * 0.3,
    rx * 0.35,
    ry * 0.25,
    "255,210,170",
    0.55,
  );
}

// ── finishing ───────────────────────────────────────────────────────────────

function finish(rc, lc, cam) {
  const { W, H } = cam;
  const R = Math.hypot(W, H) / 2;
  for (const ctx of [rc, lc]) {
    const v = ctx.createRadialGradient(
      W / 2,
      H * 0.5,
      R * 0.4,
      W / 2,
      H * 0.5,
      R * 1.05,
    );
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }
  const noise = makeCanvas(128, 128);
  const g = noise.getContext("2d");
  const img = g.createImageData(128, 128);
  const rnd = lcg(90210);
  for (let i = 0; i < 128 * 128; i++) {
    const v = (rnd() * 255) | 0;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  rc.save();
  rc.globalAlpha = 0.009;
  rc.fillStyle = rc.createPattern(noise, "repeat");
  rc.fillRect(0, 0, W, H);
  rc.restore();
}

function seal(g, x, y, r) {
  g.fillStyle = "#6e150c";
  for (const [ox, oy, rr] of [
    [0, 0, 1],
    [-0.72, 0.38, 0.38],
    [0.76, -0.28, 0.31],
    [0.42, 0.66, 0.33],
  ]) {
    g.beginPath();
    g.arc(x + ox * r, y + oy * r, rr * r, 0, Math.PI * 2);
    g.fill();
  }
  const body = g.createRadialGradient(
    x - r * 0.3,
    y - r * 0.35,
    r * 0.1,
    x,
    y,
    r * 0.85,
  );
  body.addColorStop(0, "#b3402c");
  body.addColorStop(1, "#7a1a0f");
  g.fillStyle = body;
  g.beginPath();
  g.arc(x - 1, y - 2, r * 0.82, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 1.5;
  g.strokeStyle = "rgba(60,8,4,0.8)";
  g.beginPath();
  g.arc(x, y, r * 0.64, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 1;
  g.strokeStyle = "rgba(220,120,95,0.35)";
  g.beginPath();
  g.arc(x, y + 1, r * 0.64, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = "rgba(255,255,255,0.2)";
  g.beginPath();
  g.ellipse(
    x - r * 0.32,
    y - r * 0.45,
    r * 0.26,
    r * 0.1,
    -0.3,
    0,
    Math.PI * 2,
  );
  g.fill();
}

function softDot(ctx, x, y, rx, ry, rgb, a) {
  if (rx <= 0 || ry <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

// ── small helpers ───────────────────────────────────────────────────────────

function css(c, f = 1) {
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${ch(c[0])},${ch(c[1])},${ch(c[2])})`;
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth01 = (v) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

function hash2(i, j) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function noise2(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

function addCanvas(textures, key, canvas) {
  if (textures.exists(key)) textures.remove(key);
  textures.addCanvas(key, canvas);
}

function lcg(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
