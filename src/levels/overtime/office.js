import { OVERTIME_CLOCKS, SEGMENTS } from "./puzzle.js";

/** The office for OVERTIME, painted as a real room rather than a sketch: a
 *  desk against a wall late at night, seen from the chair, in true one-point
 *  perspective and lit by a single warm desk lamp. Everything is laid out in
 *  centimetres in front of the eye and projected, so the sizes hold together
 *  — the calculator lies flat on the desk, the clocks are the size clocks
 *  are — and it is all painted once per screen size onto one canvas.
 *
 *  What moves stays out of the painting: the scene draws the calculator's
 *  digits (through `calc.lcd.map`), the key presses (over `calc.keys[k].quad`),
 *  the blinking colons (the small `colons` images) and the steam (`steam`). */

const ROOM_KEY = "ot_room";
const PUFF_KEY = "ot_puff";
const COLON_KEY = "ot_colon_";
const ZW = 120; // the wall, in cm in front of the eye
const EYE_H = 42; // the eye, in cm above the desk
const AMB = [0.2, 0.21, 0.27]; // what light there is without the lamp
const LAMP = [1, 0.8, 0.56]; // the lamp's colour
const LAMP_POWER = 2.3;
const NZ = { x: 0, y: 0, z: -1 };
const UP = { x: 0, y: 1, z: 0 };

const RED_LED = {
  on: "rgb(255,72,46)",
  core: "rgba(255,205,185,0.35)",
  ghost: "rgba(255,50,30,0.05)",
  glow: "255,45,25",
};
const AMBER_LED = {
  on: "rgb(255,170,66)",
  core: "rgba(255,235,190,0.35)",
  ghost: "rgba(255,150,50,0.05)",
  glow: "255,140,40",
};
const LCD_DARK = {
  on: "rgba(24,32,26,0.9)",
  ghost: "rgba(24,32,26,0.07)",
  lcd: true,
};

export function paintOffice(scene, W, H, keypad) {
  const cam = camera(W, H);
  const lay = layout(cam);
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext("2d");
  const rnd = lcg(1811);

  paintSurfaces(ctx, cam, lay);
  paintGrain(ctx, cam, rnd);
  if (lay.win) paintWindow(ctx, cam, lay, rnd);
  paintWallClock(ctx, cam, lay);
  paintShelf(ctx, cam, lay, rnd);
  paintPaper(ctx, cam, lay);
  paintShadows(ctx, cam, lay);
  paintAlarm(ctx, cam, lay);
  paintLampBase(ctx, cam, lay);
  paintTravel(ctx, cam, lay);
  paintMug(ctx, cam, lay);
  paintLampArm(ctx, cam, lay);
  const calc = paintCalculator(ctx, cam, lay, keypad, rnd);
  paintPencil(ctx, cam, lay);
  paintAtmosphere(ctx, cam, lay);

  addCanvas(scene.textures, ROOM_KEY, cv);
  const colons = lay.colons.map((c, i) => {
    addCanvas(scene.textures, COLON_KEY + i, c.canvas);
    return { key: COLON_KEY + i, x: c.x, y: c.y };
  });
  addCanvas(scene.textures, PUFF_KEY, puffCanvas());
  const m = lay.mug;
  const s = cam.P(m.x, m.h - 1.1, m.z);
  return {
    room: ROOM_KEY,
    colons,
    calc,
    puff: PUFF_KEY,
    steam: { x: s.x, y: s.y, k: cam.k(m.z) },
  };
}

/** Frees the painted canvases — call once their images are destroyed. */
export function releaseOfficeArt(textures) {
  const keys = [ROOM_KEY, PUFF_KEY];
  for (let i = 0; i < 8; i++) keys.push(COLON_KEY + i);
  for (const key of keys) if (textures.exists(key)) textures.remove(key);
}

/** One seven-segment glyph as polygons, in a face's own centimetres (v up,
 *  (x, y) its bottom-left corner). `slant` leans it like a real display. */
export function glyph(ch, x, y, w, h, t, slant = 0) {
  const shapes = segmentShapes(w, h, t);
  const lit = SEGMENTS[ch] ?? "";
  const on = [];
  const off = [];
  for (const key of "abcdefg") {
    const poly = shapes[key].map(([px, py]) => [
      x + px + slant * (h - py),
      y + (h - py),
    ]);
    (lit.includes(key) ? on : off).push(poly);
  }
  return { on, off };
}

// ── the camera and the room's layout ────────────────────────────────────────

function camera(W, H) {
  const F = Math.min(H * 0.8, W * 1.25);
  const hy = H * 0.34;
  const cx = W / 2;
  return {
    W,
    H,
    F,
    hy,
    cx,
    eye: { x: 0, y: EYE_H, z: 0 },
    P: (x, y, z) => ({ x: cx + (F * x) / z, y: hy + (F * (EYE_H - y)) / z }),
    Pv: (p) => ({ x: cx + (F * p.x) / p.z, y: hy + (F * (EYE_H - p.y)) / p.z }),
    k: (z) => F / z,
    halfAt: (z) => ((W / 2) * z) / F,
  };
}

function layout(cam) {
  // on a narrow screen the things round the room close in toward the middle
  const spread = Math.min(1, cam.halfAt(ZW) / 85);
  const fit = (x, z, half) => {
    const m = Math.max(0, cam.halfAt(z) - half - 1.5);
    return Math.max(-m, Math.min(m, x));
  };
  const calc = {
    cx: 0,
    cz: 64.5,
    w: 14.6,
    L: 19,
    hf: 1.3,
    tilt: (16 * Math.PI) / 180,
    yaw: (7 * Math.PI) / 180,
  };

  const clock = {
    x: fit(-52 * spread, 116.5, 16),
    y0: 60,
    y1: 71,
    w: 32,
    z0: 116.5,
  };
  const shelfW = Math.max(34, 48 * spread);
  const shelfX = fit(54 * spread, 101, shelfW / 2);
  const shelf = {
    x0: shelfX - shelfW / 2,
    x1: shelfX + shelfW / 2,
    y0: 49.5,
    y1: 52,
    z0: 101,
  };
  const radio = { x0: shelf.x0 + 2.5, w: 24, y0: 52, h: 8.5, z0: 104, d: 11 };
  // the window fills the wall between the clock and the shelf
  const onWall = (x, z) => (x * ZW) / z;
  const left = onWall(clock.x + clock.w / 2, clock.z0) + 7;
  const right = onWall(shelf.x0, shelf.z0) - 7;
  const ww = Math.min(34, right - left);
  const mid = (left + right) / 2;
  const win =
    ww >= 12
      ? { x0: mid - ww / 2, x1: mid + ww / 2, y0: 48, y1: 100, depth: 11 }
      : null;

  const alarm = { x: fit(-40 * spread, 96, 8), z0: 96, w: 14, h: 8.5, d: 7.5 };
  const calcEdge = ((calc.w / 2 + 0.7) * 80) / (calc.cz + calc.L / 2);
  const travel = {
    x: Math.min(fit(-21 * spread, 80, 5.4), -(calcEdge + 5.4 + 1.5)),
    w: 10.8,
  };
  // (on a narrow screen the mug comes forward, so it never hides the travel clock)
  const mz = spread < 0.8 ? 60 : 70;
  const mug = { x: fit(-47 * spread, mz, 7.5), z: mz, r: 4.2, h: 9.5 };
  const base = { x: fit(41 * spread, 94, 8.5), z: 94 };
  const joint = v3(Math.max(9, base.x - 26), 37, 80);
  const target = v3(0, 4, calc.cz - 1);
  const beam = unit(sub(target, joint));
  const lamp = {
    base,
    joint,
    target,
    beam,
    elbow: v3(base.x + 3, 29, base.z + 4),
    mouth: add3(joint, mul(beam, 10.5)),
    bulb: add3(joint, mul(beam, 7.5)),
  };
  const paper = { x: 6 + 10 * spread, z: 67, w: 14.8, l: 21, rot: -0.2 };
  const pencil = {
    a: v3(9 + 3 * spread, 0.38, 57.5),
    b: v3(9 + 17 * spread, 0.38, 63),
  };
  return {
    calc,
    clock,
    shelf,
    radio,
    win,
    alarm,
    travel,
    mug,
    lamp,
    paper,
    pencil,
    bulb: lamp.bulb,
    beam,
    colons: [],
  };
}

// ── light ───────────────────────────────────────────────────────────────────

// base colour × (ambient + the lamp): a spot with a soft edge, falling off
// with distance; `gloss` adds the lamp mirrored in a varnished surface
function shade(base, p, n, lay, gloss) {
  const L = lay.bulb;
  const D = lay.beam;
  let lx = L.x - p.x;
  let ly = L.y - p.y;
  let lz = L.z - p.z;
  const dist = Math.hypot(lx, ly, lz) || 1;
  lx /= dist;
  ly /= dist;
  lz /= dist;
  const ndl = Math.max(0, n.x * lx + n.y * ly + n.z * lz);
  const cosA = -(lx * D.x + ly * D.y + lz * D.z);
  const spot = 0.06 + 0.94 * smooth01((cosA - 0.6) / 0.32);
  const fall = 1 / (1 + (dist / 38) ** 2);
  const I = ndl * spot * fall * LAMP_POWER;
  const out = [
    base[0] * (AMB[0] + I * LAMP[0]),
    base[1] * (AMB[1] + I * LAMP[1]),
    base[2] * (AMB[2] + I * LAMP[2]),
  ];
  if (gloss) {
    const vx = -p.x;
    const vy = EYE_H - p.y;
    const vz = -p.z;
    const vl = Math.hypot(vx, vy, vz) || 1;
    const hx = lx + vx / vl;
    const hy = ly + vy / vl;
    const hz = lz + vz / vl;
    const hl = Math.hypot(hx, hy, hz) || 1;
    const ndh = Math.max(0, (n.x * hx + n.y * hy + n.z * hz) / hl);
    const s = Math.pow(ndh, 60) * spot * fall * 190 * gloss;
    out[0] += s * LAMP[0];
    out[1] += s * LAMP[1];
    out[2] += s * LAMP[2];
  }
  return out;
}

function wallBase(x, y) {
  const f =
    0.9 + 0.16 * (noise2(x / 38, y / 38) * 0.6 + noise2(x / 9, y / 9) * 0.4);
  return [58 * f, 62 * f, 70 * f];
}

function deskBase(x, z) {
  const plank = Math.floor((x + 1000) / 13.5);
  const tone = 0.84 + 0.3 * hash2(plank, 7919);
  const f = tone * (0.86 + 0.24 * noise2(x * 0.9 + plank * 17.3, z / 30));
  return [92 * f, 58 * f, 34 * f];
}

// ── the wall and the desk, lit pixel by pixel (at a third of the size) ──────

function paintSurfaces(ctx, cam, lay) {
  const { W, H, F, hy, cx } = cam;
  const R = Math.max(3, Math.round(Math.sqrt((W * H) / 160000))); // coarser on big screens
  const w = Math.ceil(W / R);
  const h = Math.ceil(H / R);
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const img = g.createImageData(w, h);
  const d = img.data;
  const yBack = hy + (F * EYE_H) / ZW;
  const win = lay.win;
  const wcx = win ? (win.x0 + win.x1) / 2 : 0;
  const halo = { x: lay.lamp.joint.x, y: lay.lamp.joint.y + 3 };
  const p = { x: 0, y: 0, z: 0 };
  for (let j = 0; j < h; j++) {
    const Y = (j + 0.5) * R;
    for (let i = 0; i < w; i++) {
      const X = (i + 0.5) * R;
      const o = (j * w + i) * 4;
      if (Y < yBack) {
        p.x = ((X - cx) * ZW) / F;
        p.y = EYE_H - ((Y - hy) * ZW) / F;
        p.z = ZW;
        const base = wallBase(p.x, p.y);
        const col = shade(base, p, NZ, lay, 0);
        // the shade leaks a little light onto the wall behind it, and the
        // night outside greys the wall round the window
        const hl =
          0.12 * Math.exp(-((p.x - halo.x) ** 2 + (p.y - halo.y) ** 2) / 1352);
        const ml = win
          ? 0.07 * Math.exp(-((p.x - wcx) ** 2 + (p.y - 72) ** 2) / 2312)
          : 0;
        const ao = 0.6 + 0.4 * smooth01(p.y / 14);
        d[o] = (col[0] + base[0] * (hl * LAMP[0] + ml * 0.5)) * ao;
        d[o + 1] = (col[1] + base[1] * (hl * LAMP[1] + ml * 0.6)) * ao;
        d[o + 2] = (col[2] + base[2] * (hl * LAMP[2] + ml * 0.85)) * ao;
      } else {
        const z = (F * EYE_H) / (Y - hy);
        p.x = ((X - cx) * z) / F;
        p.y = 0;
        p.z = z;
        const col = shade(deskBase(p.x, z), p, UP, lay, 1);
        const ao = 0.58 + 0.42 * smooth01((ZW - z) / 12);
        d[o] = col[0] * ao;
        d[o + 1] = col[1] * ao;
        d[o + 2] = col[2] * ao;
      }
      d[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(c, 0, 0, W, H);
  ctx.restore();
}

// the planks' seams and the grain, running away toward the wall
function paintGrain(ctx, cam, rnd) {
  const yBack = cam.P(0, 0, ZW).y;
  const zN = 48;
  const half = cam.halfAt(zN) + 3;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, yBack, cam.W, cam.H - yBack);
  ctx.clip();
  const first = Math.ceil((-half + 1000) / 13.5) * 13.5 - 1000;
  for (let x = first; x < half; x += 13.5) {
    const a = cam.P(x, 0, zN);
    const b = cam.P(x, 0, ZW);
    const wa = cam.k(zN) * 0.09;
    const wb = cam.k(ZW) * 0.09;
    polyPath(
      ctx,
      [
        { x: a.x - wa, y: a.y },
        { x: b.x - wb, y: b.y },
        { x: b.x + wb, y: b.y },
        { x: a.x + wa, y: a.y },
      ],
      "rgba(10,5,2,0.5)",
    );
  }
  ctx.lineCap = "round";
  for (let i = 0; i < 320; i++) {
    const x = -half + rnd() * half * 2;
    const ph = rnd() * 6.283;
    const amp = 0.1 + rnd() * 0.45;
    const z0 = zN + rnd() * 40;
    const z1 = Math.min(ZW, z0 + 15 + rnd() * 60);
    const pts = [];
    for (let z = z0; z <= z1; z += 2.5)
      pts.push(cam.P(x + Math.sin(z * 0.06 + ph) * amp, 0, z));
    strokePts(
      ctx,
      pts,
      `rgba(18,9,3,${(0.05 + rnd() * 0.1).toFixed(3)})`,
      Math.max(0.6, cam.k((z0 + z1) / 2) * 0.05),
    );
  }
  ctx.restore();
}

// ── the window: a night city through the glass ─────────────────────────────

function paintWindow(ctx, cam, lay, rnd) {
  const w = lay.win;
  const zg = ZW + w.depth;
  const { x0, x1, y0, y1 } = w;
  const a = cam.P(x0, y1, zg);
  const b = cam.P(x1, y0, zg);
  const gx = a.x;
  const gy = a.y;
  const gw = b.x - a.x;
  const gh = b.y - a.y;
  const k = cam.k(zg);

  ctx.save();
  ctx.beginPath();
  ctx.rect(gx, gy, gw, gh);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, gy, 0, gy + gh);
  sky.addColorStop(0, "#04060d");
  sky.addColorStop(0.6, "#0a1122");
  sky.addColorStop(1, "#1a2238");
  ctx.fillStyle = sky;
  ctx.fillRect(gx, gy, gw, gh);
  const stars = Math.round((gw * gh) / 700);
  for (let i = 0; i < stars; i++) {
    ctx.fillStyle = `rgba(230,236,255,${(0.2 + rnd() * 0.5).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(
      gx + rnd() * gw,
      gy + rnd() * gh * 0.62,
      0.4 + rnd() * 0.7,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  // a thin moon
  const mx = gx + gw * 0.72;
  const my = gy + gh * 0.2;
  const mr = k * 2.1;
  ctx.save();
  ctx.shadowColor = "rgba(210,220,255,0.6)";
  ctx.shadowBlur = mr * 3;
  ctx.fillStyle = "#ebe6d6";
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#060914";
  ctx.beginPath();
  ctx.arc(mx + mr * 0.42, my - mr * 0.18, mr * 0.92, 0, Math.PI * 2);
  ctx.fill();
  // the city, a few windows still lit
  const base = gy + gh;
  let x = gx - 4;
  let tallest = { x: 0, y: base };
  while (x < gx + gw) {
    const bw = k * (3 + rnd() * 6);
    const bh = gh * (0.12 + rnd() * 0.3);
    ctx.fillStyle = rnd() < 0.5 ? "#070a13" : "#0a0e19";
    ctx.fillRect(x, base - bh, bw + 1, bh);
    if (base - bh < tallest.y) tallest = { x: x + bw / 2, y: base - bh };
    const cols = Math.max(1, Math.floor(bw / (k * 0.9)));
    const rows = Math.max(1, Math.floor(bh / (k * 1.1)));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (rnd() > 0.13) continue;
        ctx.fillStyle =
          rnd() < 0.75
            ? `rgba(255,205,130,${(0.35 + rnd() * 0.4).toFixed(2)})`
            : `rgba(170,200,255,${(0.3 + rnd() * 0.3).toFixed(2)})`;
        ctx.fillRect(
          x + (c + 0.3) * k * 0.9,
          base - bh + (r + 0.35) * k * 1.1,
          k * 0.4,
          k * 0.5,
        );
      }
    }
    x += bw + k * rnd() * 1.2;
  }
  ctx.fillStyle = "rgba(255,60,50,0.9)";
  ctx.beginPath();
  ctx.arc(tallest.x, tallest.y - 2, Math.max(1, k * 0.2), 0, Math.PI * 2);
  ctx.fill();
  const haze = ctx.createLinearGradient(0, base - gh * 0.45, 0, base);
  haze.addColorStop(0, "rgba(90,100,140,0)");
  haze.addColorStop(1, "rgba(90,100,140,0.2)");
  ctx.fillStyle = haze;
  ctx.fillRect(gx, base - gh * 0.45, gw, gh * 0.45);
  // the lamp, reflected in the glass
  const rp = cam.Pv(v3(lay.bulb.x, lay.bulb.y, 2 * zg - lay.bulb.z));
  softEllipse(ctx, rp.x, rp.y, k * 5, k * 5, "255,200,140", 0.2, "lighter");
  softEllipse(
    ctx,
    rp.x,
    rp.y,
    k * 1.2,
    k * 1.2,
    "255,230,190",
    0.35,
    "lighter",
  );
  ctx.restore();

  // the wall's thickness round the opening
  const inside = v3((x0 + x1) / 2, (y0 + y1) / 2, ZW - 5);
  const reveals = [
    [v3(x0, y0, ZW), v3(x0, y0, zg), v3(x0, y1, zg), v3(x0, y1, ZW)],
    [v3(x1, y0, ZW), v3(x1, y0, zg), v3(x1, y1, zg), v3(x1, y1, ZW)],
    [v3(x0, y1, ZW), v3(x1, y1, ZW), v3(x1, y1, zg), v3(x0, y1, zg)],
    [v3(x0, y0, ZW), v3(x1, y0, ZW), v3(x1, y0, zg), v3(x0, y0, zg)],
  ];
  const mid = v3((x0 + x1) / 2, (y0 + y1) / 2, (ZW + zg) / 2);
  for (const f of reveals) {
    const n = mul(faceNormal(f, mid), -1); // they face into the opening
    if (dot(n, sub(cam.eye, centroid(f))) <= 0) continue;
    fill3(
      ctx,
      cam,
      f,
      css(shade(wallBase(0, 70), centroid(f), n, lay, 0), 0.8),
    );
  }
  void inside;

  // the frame: a white-painted sash, dim in the dark, with a cross bar
  const FRAME = [150, 146, 138];
  const col = css(
    shade(FRAME, v3((x0 + x1) / 2, (y0 + y1) / 2, zg - 1), NZ, lay, 0),
    1.25,
  );
  const zf = zg - 0.6;
  const bar = (u0, v0, u1, v1) =>
    fill3(
      ctx,
      cam,
      [v3(u0, v0, zf), v3(u1, v0, zf), v3(u1, v1, zf), v3(u0, v1, zf)],
      col,
    );
  const fw = 3.2;
  bar(x0, y0, x1, y0 + fw);
  bar(x0, y1 - fw, x1, y1);
  bar(x0, y0, x0 + fw, y1);
  bar(x1 - fw, y0, x1, y1);
  const mxw = (x0 + x1) / 2;
  bar(mxw - 1.1, y0, mxw + 1.1, y1);
  const ty = y0 + (y1 - y0) * 0.58;
  bar(x0, ty - 1.1, x1, ty + 1.1);
  // the sill, jutting into the room
  box(
    ctx,
    cam,
    lay,
    { x0: x0 - 3, x1: x1 + 3, y0: y0 - 2, y1: y0, z0: ZW - 4.5, z1: ZW },
    [132, 128, 120],
  );
}

// ── the clocks ──────────────────────────────────────────────────────────────

// an LED wall clock: an aluminium case, smoked red acrylic, red digits
function paintWallClock(ctx, cam, lay) {
  const c = lay.clock;
  const x0 = c.x - c.w / 2;
  const x1 = c.x + c.w / 2;
  const { y0, y1, z0 } = c;
  const h = y1 - y0;
  const k = cam.k(z0);
  // its lead, down the wall to behind the desk
  const cable = [];
  for (let i = 0; i <= 20; i++) {
    const f = i / 20;
    cable.push(
      cam.P(x1 - 5 + f * 9 + Math.sin(f * Math.PI) * 3, y0 * (1 - f), ZW - 0.6),
    );
  }
  strokePts(ctx, cable, "#050506", k * 0.6);
  strokePts(ctx, cable, "rgba(150,150,160,0.12)", k * 0.15);
  wallGlow(ctx, cam, c.x, (y0 + y1) / 2, 26, 14, "255,55,30", 0.12);
  // a soft shadow where it stands off the wall
  const s0 = cam.P(x0 + 0.5, y1 - 0.5, ZW);
  const s1 = cam.P(x1 - 0.5, y0 + 0.5, ZW);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = k * 1.6;
  ctx.shadowOffsetY = k * 0.7;
  ctx.fillStyle = "#000";
  ctx.fillRect(s0.x, s0.y, s1.x - s0.x, s1.y - s0.y);
  ctx.restore();

  const ALU = [150, 154, 162];
  box(ctx, cam, lay, { x0, x1, y0, y1, z0, z1: ZW }, ALU, ["front"]);
  const map = (u, v) => cam.P(x0 + u, y0 + v, z0);
  const lit = shade(ALU, v3(c.x, (y0 + y1) / 2, z0), NZ, lay, 0);
  fillLocal(
    ctx,
    rr(0, 0, c.w, h, 0.45),
    map,
    grad(ctx, map(0, h), map(0, 0), [
      [0, css(lit, 1.3)],
      [1, css(lit, 0.8)],
    ]),
  );
  fillLocal(
    ctx,
    rr(0.65, 0.65, c.w - 1.3, h - 1.3, 0.25),
    map,
    grad(ctx, map(0, h), map(0, 0), [
      [0, "#1e0907"],
      [1, "#0b0303"],
    ]),
  );
  drawTime(
    ctx,
    lay,
    OVERTIME_CLOCKS[0],
    { x: 2.2, y: 1.9, w: c.w - 4.4, h: 7.2 },
    RED_LED,
    map,
  );
  gloss(ctx, map, 0.65, 0.65, c.w - 1.3, h - 1.3, 0.05);
}

// the shelf on its brackets, a clock radio and a few books on it
function paintShelf(ctx, cam, lay, rnd) {
  const s = lay.shelf;
  const k = cam.k(s.z0);
  for (const bx of [s.x0 + 5, s.x1 - 5]) {
    const side = bx > 0 ? bx - 0.6 : bx + 0.6;
    const tri = [
      v3(side, s.y0, s.z0 + 1),
      v3(side, s.y0, ZW),
      v3(side, s.y0 - 12, ZW),
    ];
    fill3(
      ctx,
      cam,
      tri,
      css(
        shade([70, 72, 78], centroid(tri), v3(bx > 0 ? -1 : 1, 0, 0), lay, 0),
      ),
    );
    const e0 = cam.P(side, s.y0, s.z0 + 1);
    const e1 = cam.P(side, s.y0 - 12, ZW);
    strokePts(ctx, [e0, e1], "rgba(0,0,0,0.5)", k * 0.4);
  }
  // the shadow under the plank, on the wall
  const q = [
    cam.P(s.x0, s.y0, ZW),
    cam.P(s.x1, s.y0, ZW),
    cam.P(s.x1, s.y0 - 7, ZW),
    cam.P(s.x0, s.y0 - 7, ZW),
  ];
  polyPath(
    ctx,
    q,
    grad(ctx, q[0], q[3], [
      [0, "rgba(0,0,0,0.45)"],
      [1, "rgba(0,0,0,0)"],
    ]),
  );

  const TONES = [
    [70, 44, 40],
    [42, 56, 70],
    [76, 70, 48],
    [50, 50, 62],
    [82, 60, 40],
    [40, 56, 46],
  ];
  const r = lay.radio;
  const books = [];
  let bx = r.x0 + r.w + 2.5;
  while (bx < s.x1 - 2.5) {
    const bw = 1.8 + rnd() * 2.2;
    if (bx + bw > s.x1 - 1.5) break;
    books.push({
      x0: bx,
      x1: bx + bw,
      h: 15 + rnd() * 8,
      d: 13 + rnd() * 3,
      tone: TONES[(rnd() * TONES.length) | 0],
    });
    bx += bw + 0.05;
  }
  for (let i = books.length - 1; i >= 0; i--) {
    const b = books[i];
    const z1 = ZW - 1.5;
    const z0 = z1 - b.d;
    box(
      ctx,
      cam,
      lay,
      { x0: b.x0, x1: b.x1, y0: s.y1, y1: s.y1 + b.h, z0, z1 },
      b.tone,
    );
    for (const v of [s.y1 + 2, s.y1 + b.h - 2.4]) {
      strokePts(
        ctx,
        [cam.P(b.x0 + 0.2, v, z0), cam.P(b.x1 - 0.2, v, z0)],
        "rgba(220,190,120,0.3)",
        cam.k(z0) * 0.12,
      );
    }
  }
  // the radio stands in front of the books' covers, the plank in front of both
  paintRadio(ctx, cam, lay);
  box(
    ctx,
    cam,
    lay,
    { x0: s.x0, x1: s.x1, y0: s.y0, y1: s.y1, z0: s.z0, z1: ZW },
    [110, 76, 50],
  );
  strokePts(
    ctx,
    [cam.P(s.x0, s.y1, s.z0), cam.P(s.x1, s.y1, s.z0)],
    "rgba(255,220,170,0.12)",
    k * 0.12,
  );
}

// a clock radio: speaker grille on the left, amber digits on the right
function paintRadio(ctx, cam, lay) {
  const r = lay.radio;
  const x0 = r.x0;
  const x1 = r.x0 + r.w;
  const y0 = r.y0;
  const y1 = r.y0 + r.h;
  const z0 = r.z0;
  const k = cam.k(z0);
  wallGlow(ctx, cam, x0 + r.w * 0.65, y1 - 1, 20, 11, "255,150,50", 0.08);
  const BODY = [40, 38, 38];
  box(ctx, cam, lay, { x0, x1, y0, y1, z0, z1: z0 + r.d }, BODY, ["front"]);
  const map = (u, v) => cam.P(x0 + u, y0 + v, z0);
  const lit = shade(BODY, v3((x0 + x1) / 2, (y0 + y1) / 2, z0), NZ, lay, 0);
  fillLocal(ctx, rr(0, 0, r.w, r.h, 0.6), map, css(lit, 1.2));
  fillLocal(ctx, rr(0.3, 0.3, r.w - 0.6, r.h - 0.6, 0.45), map, css(lit, 0.95));
  fillLocal(ctx, rr(1.1, 1.1, 7.6, r.h - 2.2, 0.4), map, css(lit, 1.7));
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  const hole = Math.max(0.5, k * 0.11);
  for (let row = 0, v = 1.5; v < r.h - 1.35; v += 0.42, row++) {
    for (let u = 1.5 + (row % 2) * 0.21; u < 8.4; u += 0.42) {
      const p = map(u, v);
      ctx.beginPath();
      ctx.arc(p.x, p.y, hole, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  fillLocal(ctx, rr(9.5, 1.1, r.w - 10.6, r.h - 2.2, 0.35), map, "#050505");
  drawTime(
    ctx,
    lay,
    OVERTIME_CLOCKS[1],
    { x: 10.6, y: 1.9, w: r.w - 12.4, h: 4.4 },
    AMBER_LED,
    map,
  );
  const dot0 = map(10.15, r.h - 2.1);
  ctx.save();
  ctx.shadowColor = "rgba(255,60,40,0.9)";
  ctx.shadowBlur = k * 0.5;
  ctx.fillStyle = "rgb(255,70,50)";
  ctx.beginPath();
  ctx.arc(dot0.x, dot0.y, Math.max(0.8, k * 0.12), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  gloss(ctx, map, 9.5, 1.1, r.w - 10.6, r.h - 2.2, 0.05);
}

// a white bedside alarm clock on the desk, red digits, a snooze bar on top
function paintAlarm(ctx, cam, lay) {
  const a = lay.alarm;
  const x0 = a.x - a.w / 2;
  const x1 = a.x + a.w / 2;
  const y0 = 0.35;
  const y1 = y0 + a.h;
  const z0 = a.z0;
  deskGlow(ctx, cam, a.x, z0 - 3.5, 11, 5, "255,50,30", 0.16);
  const BODY = [214, 210, 202];
  for (const fx of [x0 + 1.5, x1 - 3])
    box(
      ctx,
      cam,
      lay,
      { x0: fx, x1: fx + 1.5, y0: 0, y1: y0, z0: z0 + 0.8, z1: z0 + 2.2 },
      [30, 30, 30],
    );
  box(ctx, cam, lay, { x0, x1, y0, y1, z0, z1: z0 + a.d }, BODY, ["front"]);
  box(
    ctx,
    cam,
    lay,
    {
      x0: a.x - 4.5,
      x1: a.x + 4.5,
      y0: y1,
      y1: y1 + 0.7,
      z0: z0 + 2,
      z1: z0 + 4.5,
    },
    [80, 80, 84],
  );
  const map = (u, v) => cam.P(x0 + u, y0 + v, z0);
  const lit = shade(BODY, v3(a.x, (y0 + y1) / 2, z0), NZ, lay, 0);
  fillLocal(
    ctx,
    rr(0, 0, a.w, a.h, 0.8),
    map,
    grad(ctx, map(0, a.h), map(0, 0), [
      [0, css(lit, 1.08)],
      [1, css(lit, 0.85)],
    ]),
  );
  fillLocal(ctx, rr(1.1, 1.5, a.w - 2.2, a.h - 2.8, 0.5), map, "#080707");
  drawTime(
    ctx,
    lay,
    OVERTIME_CLOCKS[2],
    { x: 1.9, y: 2.2, w: a.w - 3.8, h: 3.9 },
    RED_LED,
    map,
  );
  gloss(ctx, map, 1.1, 1.5, a.w - 2.2, a.h - 2.8, 0.06);
}

// a folding travel clock: a grey LCD, faintly backlit, leaning back
function paintTravel(ctx, cam, lay) {
  const t = lay.travel;
  const x0 = t.x - t.w / 2;
  const x1 = t.x + t.w / 2;
  const BODY = [42, 42, 46];
  box(ctx, cam, lay, { x0, x1, y0: 0, y1: 1.1, z0: 80, z1: 86.5 }, BODY);
  const lean = (18 * Math.PI) / 180;
  const O = v3(x0, 1.1, 80.8);
  const V = v3(0, Math.cos(lean), Math.sin(lean));
  const N = v3(0, Math.sin(lean), -Math.cos(lean));
  const hgt = 7;
  const at = (u, v, w = 0) =>
    add3(add3(add3(O, v3(u, 0, 0)), mul(V, v)), mul(N, w));
  const map = (u, v) => cam.Pv(at(u, v));
  const back = -0.9;
  fill3(
    ctx,
    cam,
    [at(0, hgt), at(t.w, hgt), at(t.w, hgt, back), at(0, hgt, back)],
    css(shade(BODY, at(t.w / 2, hgt), V, lay, 0), 1.2),
  );
  if (x1 < 0)
    fill3(
      ctx,
      cam,
      [at(t.w, 0), at(t.w, hgt), at(t.w, hgt, back), at(t.w, 0, back)],
      css(shade(BODY, at(t.w, hgt / 2), v3(1, 0, 0), lay, 0)),
    );
  if (x0 > 0)
    fill3(
      ctx,
      cam,
      [at(0, 0), at(0, hgt), at(0, hgt, back), at(0, 0, back)],
      css(shade(BODY, at(0, hgt / 2), v3(-1, 0, 0), lay, 0)),
    );
  const lit = shade(BODY, at(t.w / 2, hgt / 2), N, lay, 0);
  fillLocal(ctx, rr(0, 0, t.w, hgt, 0.7), map, css(lit, 1.1));
  fillLocal(ctx, rr(0.9, 1.45, t.w - 1.8, 4.4, 0.3), map, "#0c0d0e");
  const lcd = shade([170, 184, 160], at(t.w / 2, 3.6), N, lay, 0);
  const glow = [lcd[0] + 16, lcd[1] + 34, lcd[2] + 26];
  fillLocal(
    ctx,
    rr(1.15, 1.7, t.w - 2.3, 3.9, 0.2),
    map,
    grad(ctx, map(0, 5.6), map(0, 1.7), [
      [0, css(glow, 0.85)],
      [0.3, css(glow)],
      [1, css(glow, 1.05)],
    ]),
  );
  drawTime(
    ctx,
    lay,
    OVERTIME_CLOCKS[3],
    { x: 1.7, y: 2.1, w: t.w - 3.4, h: 3.1 },
    LCD_DARK,
    map,
  );
  for (const u of [3.2, 6.4])
    fillLocal(ctx, rr(u, 0.45, 1.3, 0.55, 0.2), map, css(lit, 1.8));
  gloss(ctx, map, 1.15, 1.7, t.w - 2.3, 3.9, 0.07);
}

function drawTime(ctx, lay, time, box, style, map) {
  const chars = time.replace(":", "");
  const dh = box.h;
  const dw = dh * 0.5;
  const gap = dw * 0.34;
  const colonW = dw * 0.34;
  const total = 4 * dw + 4 * gap + colonW;
  const t = dh * 0.13;
  const slant = 0.09;
  const x0 = box.x + (box.w - total) / 2;
  const on = [];
  const off = [];
  let x = x0;
  for (let i = 0; i < 4; i++) {
    const gl = glyph(chars[i], x, box.y, dw, dh, t, slant);
    on.push(...gl.on);
    off.push(...gl.off);
    x += dw + gap + (i === 1 ? colonW + gap : 0);
  }
  const colon = colonPolys(x0 + 2 * dw + 2 * gap, box.y, colonW, dh, t, slant);
  const toScreen = (polys) =>
    polys.map((poly) => poly.map(([u, v]) => map(u, v)));
  const sh = Math.hypot(
    map(box.x, box.y + dh).x - map(box.x, box.y).x,
    map(box.x, box.y + dh).y - map(box.x, box.y).y,
  );
  fillPolys(ctx, toScreen(off.concat(colon)), style.ghost);
  litSegments(ctx, toScreen(on), style, sh);
  lay.colons.push(makeColon(toScreen(colon), style, sh));
}

function litSegments(g, polys, style, sh) {
  const path = () => {
    g.beginPath();
    for (const poly of polys) {
      poly.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
      g.closePath();
    }
  };
  g.save();
  if (style.lcd) {
    // a real LCD's digits cast a faint shadow on the glass behind them
    g.save();
    g.translate(sh * 0.035, sh * 0.045);
    path();
    g.fillStyle = "rgba(24,32,26,0.2)";
    g.fill();
    g.restore();
    path();
    g.fillStyle = style.on;
    g.fill();
  } else {
    path();
    g.fillStyle = style.on;
    g.shadowColor = `rgba(${style.glow},0.55)`;
    g.shadowBlur = sh * 0.5;
    g.fill();
    g.shadowColor = `rgba(${style.glow},0.9)`;
    g.shadowBlur = sh * 0.12;
    g.fill();
    g.shadowBlur = 0;
    g.fillStyle = style.core;
    g.fill();
  }
  g.restore();
}

function makeColon(polys, style, sh) {
  const flat = polys.flat();
  const m = Math.ceil(sh * 0.9 + 3);
  const x0 = Math.floor(Math.min(...flat.map((p) => p.x))) - m;
  const y0 = Math.floor(Math.min(...flat.map((p) => p.y))) - m;
  const x1 = Math.ceil(Math.max(...flat.map((p) => p.x))) + m;
  const y1 = Math.ceil(Math.max(...flat.map((p) => p.y))) + m;
  const c = makeCanvas(x1 - x0, y1 - y0);
  const g = c.getContext("2d");
  g.translate(-x0, -y0);
  litSegments(g, polys, style, sh);
  return { canvas: c, x: x0, y: y0 };
}

function segmentShapes(w, h, t) {
  const gap = t * 0.14;
  const mid = h / 2;
  const hx0 = t * 0.45 + gap;
  const hx1 = w - t * 0.45 - gap;
  const horiz = (yy) => [
    [hx0, yy + t / 2],
    [hx0 + t / 2, yy],
    [hx1 - t / 2, yy],
    [hx1, yy + t / 2],
    [hx1 - t / 2, yy + t],
    [hx0 + t / 2, yy + t],
  ];
  const vert = (xx, ya, yb) => [
    [xx + t / 2, ya],
    [xx + t, ya + t / 2],
    [xx + t, yb - t / 2],
    [xx + t / 2, yb],
    [xx, yb - t / 2],
    [xx, ya + t / 2],
  ];
  const up = [t * 0.5 + gap, mid - gap];
  const low = [mid + gap, h - t * 0.5 - gap];
  return {
    a: horiz(0),
    g: horiz(mid - t / 2),
    d: horiz(h - t),
    f: vert(0, up[0], up[1]),
    b: vert(w - t, up[0], up[1]),
    e: vert(0, low[0], low[1]),
    c: vert(w - t, low[0], low[1]),
  };
}

function colonPolys(x, y, w, h, t, slant) {
  const s = t * 0.55;
  return [0.3, 0.7].map((f) => {
    const cu = x + w / 2;
    const cv = y + h * f;
    return [
      [cu - s, cv - s],
      [cu + s, cv - s],
      [cu + s, cv + s],
      [cu - s, cv + s],
    ].map(([u, v]) => [u + slant * (v - y), v]);
  });
}

// ── on the desk ─────────────────────────────────────────────────────────────

function paintPaper(ctx, cam, lay) {
  const p = lay.paper;
  const c = Math.cos(p.rot);
  const s = Math.sin(p.rot);
  const at = (a, b) => cam.P(p.x + a * c - b * s, 0.04, p.z + a * s + b * c);
  const hw = p.w / 2;
  const hl = p.l / 2;
  const corners = [at(-hw, -hl), at(hw, -hl), at(hw, hl), at(-hw, hl)];
  const k = cam.k(p.z);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = k * 0.5;
  ctx.shadowOffsetY = k * 0.15;
  polyPath(ctx, corners, "#000");
  ctx.restore();
  const PAPER = [236, 230, 216];
  const near = shade(PAPER, v3(p.x - 3, 0, p.z - 6), UP, lay, 0);
  const far = shade(PAPER, v3(p.x + 4, 0, p.z + 8), UP, lay, 0);
  polyPath(
    ctx,
    corners,
    grad(ctx, at(-hw, -hl), at(hw, hl), [
      [0, css(near)],
      [1, css(far)],
    ]),
  );
  const lw = Math.max(0.6, k * 0.035);
  for (let b = -hl + 1.4; b < hl - 3; b += 0.85)
    strokePts(
      ctx,
      [at(-hw + 0.3, b), at(hw - 0.3, b)],
      "rgba(80,110,160,0.22)",
      lw,
    );
  strokePts(
    ctx,
    [at(-hw + 2.8, -hl + 0.2), at(-hw + 2.8, hl - 0.2)],
    "rgba(190,70,70,0.3)",
    lw,
  );
}

// everything's shadow on the desk: soft, cast away from the lamp, and a
// darker contact line right under each thing so nothing floats
function paintShadows(ctx, cam, lay) {
  const L = lay.bulb;
  const toDesk = (V) => {
    if (V.y >= L.y - 0.5) return null;
    const t = L.y / (L.y - V.y);
    let S = v3(L.x + (V.x - L.x) * t, 0, L.z + (V.z - L.z) * t);
    if (S.z > ZW - 0.2) {
      const f = (ZW - 0.2 - L.z) / (S.z - L.z || 1);
      S = v3(L.x + (S.x - L.x) * f, 0, ZW - 0.2);
    }
    return cam.Pv(S);
  };
  const lampAt = (p) =>
    clamp01(
      (shade([255, 255, 255], p, UP, lay, 0)[1] / 255 - AMB[1]) / LAMP[1] / 1.1,
    );
  const cast = [];
  const contact = [];
  const solid = (base, tops, a = 0.6) => {
    const pts = base.map((p) => cam.Pv(p));
    for (const t of tops) pts.push(toDesk(t));
    cast.push({
      pts: hull(pts),
      a: a * (0.25 + 0.75 * lampAt(centroid(base))),
    });
    contact.push({ pts: hull(base.map((p) => cam.Pv(p))), a: 0.6 });
  };
  const ring = (x, z, r, y) => {
    const out = [];
    for (let i = 0; i < 20; i++) {
      const t = (i / 20) * Math.PI * 2;
      out.push(v3(x + Math.cos(t) * r, y, z + Math.sin(t) * r));
    }
    return out;
  };
  const rect = (x0, x1, z0, z1, y) => [
    v3(x0, y, z0),
    v3(x1, y, z0),
    v3(x1, y, z1),
    v3(x0, y, z1),
  ];

  const g = calcGeom(lay.calc);
  solid(g.foot, g.crown, 0.62);
  const m = lay.mug;
  solid(ring(m.x, m.z, m.r, 0), ring(m.x, m.z, m.r, m.h));
  const a = lay.alarm;
  solid(
    rect(a.x - a.w / 2, a.x + a.w / 2, a.z0, a.z0 + a.d, 0),
    rect(a.x - a.w / 2, a.x + a.w / 2, a.z0, a.z0 + a.d, a.h + 0.35),
  );
  const t = lay.travel;
  solid(
    rect(t.x - t.w / 2, t.x + t.w / 2, 80, 86.5, 0),
    rect(t.x - t.w / 2, t.x + t.w / 2, 80.8, 83, 7.7),
  );
  const b = lay.lamp.base;
  solid(ring(b.x, b.z, 8.5, 0), ring(b.x, b.z, 8.5, 2.2), 0.4);
  const pa = lay.pencil.a;
  const pb = lay.pencil.b;
  const across = unit(v3(-(pb.z - pa.z), 0, pb.x - pa.x));
  const pen = [
    add3(pa, mul(across, 0.4)),
    add3(pb, mul(across, 0.4)),
    add3(pb, mul(across, -0.4)),
    add3(pa, mul(across, -0.4)),
  ].map((p) => v3(p.x, 0, p.z));
  solid(
    pen,
    pen.map((p) => v3(p.x, 0.76, p.z)),
    0.5,
  );

  softLayer(ctx, cam, { scale: 0.12, radius: 2 }, (c) => {
    for (const s of cast) polyPath(c, s.pts, `rgba(0,0,0,${s.a.toFixed(3)})`);
  });
  softLayer(ctx, cam, { scale: 0.34, radius: 1 }, (c) => {
    for (const s of contact) polyPath(c, s.pts, `rgba(0,0,0,${s.a})`);
  });
}

function paintMug(ctx, cam, lay) {
  const m = lay.mug;
  const CER = [200, 190, 172];
  const k = cam.k(m.z);
  // the handle, on the side away from the lamp
  const hp = [];
  for (let i = 0; i <= 16; i++) {
    const a = -Math.PI / 2 + (i / 16) * Math.PI;
    hp.push(
      cam.P(
        m.x - m.r + 0.3 - Math.cos(a) * 2.5,
        m.h * 0.52 - Math.sin(a) * 2.6,
        m.z,
      ),
    );
  }
  const hc = shade(
    CER,
    v3(m.x - m.r - 2, m.h / 2, m.z),
    v3(-0.6, 0.3, -0.7),
    lay,
    0,
  );
  strokePts(ctx, hp, css(hc, 0.95), k * 0.95);
  strokePts(ctx, hp, "rgba(255,255,255,0.06)", k * 0.3);
  const top = cylinder(ctx, cam, lay, m.x, m.z, m.r, 0, m.h, CER, false);
  polyPath(ctx, top, css(shade(CER, v3(m.x, m.h, m.z), UP, lay, 0), 1.05));
  polyPath(
    ctx,
    ringS(cam, m.x, m.z, m.r - 0.4, m.h),
    css(shade(CER, v3(m.x, m.h, m.z), UP, lay, 0), 0.4),
  );
  polyPath(ctx, ringS(cam, m.x, m.z, m.r - 0.45, m.h - 1.1), "#22130a");
  const hl = cam.P(m.x + 1.2, m.h - 1.1, m.z - 1.3);
  softEllipse(
    ctx,
    hl.x,
    hl.y,
    k * 1.1,
    k * 0.35,
    "255,210,160",
    0.35,
    "lighter",
  );
}

function paintLampBase(ctx, cam, lay) {
  const b = lay.lamp.base;
  const METAL = [46, 48, 54];
  const top = cylinder(ctx, cam, lay, b.x, b.z, 8.5, 0, 2.2, METAL, true);
  strokePts(ctx, top.slice(0, 25), "rgba(200,200,210,0.12)", cam.k(b.z) * 0.15);
  box(
    ctx,
    cam,
    lay,
    {
      x0: b.x - 1.4,
      x1: b.x + 1.4,
      y0: 2.2,
      y1: 4.8,
      z0: b.z - 1.4,
      z1: b.z + 1.4,
    },
    METAL,
  );
}

// the lamp's two arms and its shade, the bulb glowing inside it
function paintLampArm(ctx, cam, lay) {
  const L = lay.lamp;
  const METAL = [50, 52, 58];
  rod(ctx, cam, lay, v3(L.base.x, 4.6, L.base.z), L.elbow, 0.55, METAL);
  rod(ctx, cam, lay, L.elbow, L.joint, 0.5, METAL);
  knob(ctx, cam, L.elbow, 1.15);
  const { Ua, Va } = basis(L.beam);
  const circle = (c, r) => {
    const out = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      out.push(
        cam.Pv(
          add3(c, add3(mul(Ua, Math.cos(a) * r), mul(Va, Math.sin(a) * r))),
        ),
      );
    }
    return out;
  };
  const backC = add3(L.joint, mul(L.beam, 1.2));
  const mouth = circle(L.mouth, 7.4);
  const shell = hull(circle(backC, 2.7).concat(mouth));
  const pb = cam.Pv(backC);
  const pm = cam.Pv(L.mouth);
  const al = Math.hypot(pm.x - pb.x, pm.y - pb.y) || 1;
  const nx = -(pm.y - pb.y) / al;
  const ny = (pm.x - pb.x) / al;
  const span = cam.k(L.mouth.z) * 7.4;
  polyPath(
    ctx,
    shell,
    grad(
      ctx,
      { x: pm.x - nx * span, y: pm.y - ny * span },
      { x: pm.x + nx * span, y: pm.y + ny * span },
      [
        [0, "#2a2d33"],
        [0.35, "#3d4149"],
        [0.6, "#1d1f23"],
        [1, "#0e0f11"],
      ],
    ),
  );
  knob(ctx, cam, L.joint, 1.0);
  if (dot(L.beam, sub(cam.eye, L.mouth)) > 0) {
    const bp = cam.Pv(L.bulb);
    const ig = ctx.createRadialGradient(bp.x, bp.y, 0, bp.x, bp.y, span * 1.1);
    ig.addColorStop(0, "rgba(255,248,226,1)");
    ig.addColorStop(0.35, "rgba(255,214,150,1)");
    ig.addColorStop(1, "rgba(170,110,55,1)");
    polyPath(ctx, mouth, ig);
    ctx.save();
    ctx.shadowColor = "rgba(255,225,170,1)";
    ctx.shadowBlur = span * 0.9;
    ctx.fillStyle = "#fffdf6";
    ctx.beginPath();
    ctx.arc(bp.x, bp.y, cam.k(L.bulb.z) * 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  strokePts(
    ctx,
    mouth.concat([mouth[0]]),
    "rgba(255,225,180,0.4)",
    cam.k(L.mouth.z) * 0.25,
  );
}

// the calculator: a desk calculator lying on the desk, its top sloping up
// toward the back, raised keys, an LCD under a brushed-metal plate
function paintCalculator(ctx, cam, lay, keypad, rnd) {
  const c = lay.calc;
  const G = calcGeom(c);
  const { W3, top, Lf, hb, hw } = G;
  const map = (u, v, w = 0) => cam.Pv(top(u, v, w));
  const BODY = [46, 48, 53];
  const k = cam.k(c.cz);

  const faces = [
    [W3(-hw, 0, 0), W3(hw, 0, 0), W3(hw, c.hf, 0), W3(-hw, c.hf, 0)],
    [W3(-hw, 0, c.L), W3(-hw, 0, 0), W3(-hw, c.hf, 0), W3(-hw, hb, c.L)],
    [W3(hw, 0, 0), W3(hw, 0, c.L), W3(hw, hb, c.L), W3(hw, c.hf, 0)],
  ];
  for (const f of faces) {
    if (!faceVisible(f, cam.eye, G.inside)) continue;
    fill3(
      ctx,
      cam,
      f,
      css(shade(BODY, centroid(f), faceNormal(f, G.inside), lay, 0), 0.85),
    );
  }
  const topLit = shade(BODY, top(c.w / 2, Lf / 2), G.N, lay, 0);
  fillLocal(
    ctx,
    rr(0, 0, c.w, Lf, 0.9),
    map,
    grad(ctx, map(0, Lf), map(0, 0), [
      [0, css(topLit, 1.12)],
      [1, css(topLit, 0.9)],
    ]),
  );
  strokePts(
    ctx,
    [map(0.9, 0.06), map(c.w - 0.9, 0.06)],
    "rgba(255,235,210,0.2)",
    k * 0.12,
  );
  fillLocal(ctx, rr(0.55, 0.55, c.w - 1.1, 11.6, 0.6), map, css(topLit, 0.72));

  // the brushed plate round the display
  const plate = shade([150, 154, 162], top(c.w / 2, 15.7), G.N, lay, 0);
  fillLocal(
    ctx,
    rr(0.55, 12.45, c.w - 1.1, Lf - 13, 0.6),
    map,
    grad(ctx, map(0, Lf), map(0, 12.45), [
      [0, css(plate, 1.12)],
      [1, css(plate, 0.85)],
    ]),
  );
  for (let v = 12.6; v < Lf - 0.7; v += 0.09) {
    strokePts(
      ctx,
      [map(0.7, v), map(c.w - 0.7, v)],
      `rgba(255,255,255,${(0.015 + rnd() * 0.035).toFixed(3)})`,
      0.6,
    );
  }
  fillLocal(ctx, rr(1.1, 12.95, c.w - 2.2, 4.25, 0.45), map, "#0d0e10");
  const lcd = shade([168, 176, 150], top(c.w / 2, 15), G.N, lay, 0);
  fillLocal(
    ctx,
    rr(1.45, 13.3, c.w - 2.9, 3.55, 0.25),
    map,
    grad(ctx, map(0, 16.85), map(0, 13.3), [
      [0, css(lcd, 0.75)],
      [0.25, css(lcd)],
      [1, css(lcd, 1.05)],
    ]),
  );
  gloss(ctx, (u, v) => map(u, v), 1.45, 13.3, c.w - 2.9, 3.55, 0.06);
  fillLocal(ctx, rr(8.9, 17.6, c.w - 10, 1.35, 0.15), map, "#2b1f1c");
  for (let i = 1; i < 4; i++) {
    const u = 8.9 + ((c.w - 10) * i) / 4;
    strokePts(
      ctx,
      [map(u, 17.65), map(u, 18.9)],
      "rgba(150,120,110,0.4)",
      Math.max(0.5, k * 0.03),
    );
  }
  text(
    ctx,
    map,
    1.25,
    18.28,
    "ELECTRONIC CALCULATOR",
    0.36,
    "rgba(28,30,34,0.85)",
    "left",
  );

  const keys = {};
  const u0 = 1.0;
  const u1 = c.w - 1.0;
  const v0 = 1.0;
  const v1 = 11.6;
  const gap = 0.42;
  const kw = (u1 - u0 - 3 * gap) / 4;
  const kh = (v1 - v0 - 3 * gap) / 4;
  const inset = 0.17;
  const hk = 0.5;
  for (const spec of keypad) {
    const cs = spec.cs ?? 1;
    const rs = spec.rs ?? 1;
    const uL = u0 + spec.c * (kw + gap);
    const uR = uL + kw * cs + gap * (cs - 1);
    const vT = v1 - spec.r * (kh + gap);
    const vB = vT - (kh * rs + gap * (rs - 1));
    const col =
      spec.key === "C"
        ? [182, 64, 44]
        : spec.key === "+" || spec.key === "="
          ? [96, 100, 108]
          : [60, 63, 69];
    const capLit = shade(
      col,
      top((uL + uR) / 2, (vB + vT) / 2, hk),
      G.N,
      lay,
      0,
    );
    fillLocal(
      ctx,
      rr(uL - 0.08, vB - 0.14, uR - uL + 0.16, vT - vB + 0.16, 0.45),
      map,
      "rgba(0,0,0,0.45)",
    );
    const inside = top((uL + uR) / 2, (vB + vT) / 2, hk * 0.4);
    const skirts = [
      [
        top(uL, vB),
        top(uR, vB),
        top(uR - inset, vB + inset, hk),
        top(uL + inset, vB + inset, hk),
      ],
      [
        top(uL, vB),
        top(uL + inset, vB + inset, hk),
        top(uL + inset, vT - inset, hk),
        top(uL, vT),
      ],
      [
        top(uR, vB),
        top(uR, vT),
        top(uR - inset, vT - inset, hk),
        top(uR - inset, vB + inset, hk),
      ],
    ];
    skirts.forEach((f, i) => {
      if (faceVisible(f, cam.eye, inside))
        fill3(ctx, cam, f, css(capLit, i ? 0.7 : 0.55));
    });
    const capMap = (u, v) => map(u, v, hk);
    fillLocal(
      ctx,
      rr(
        uL + inset,
        vB + inset,
        uR - uL - 2 * inset,
        vT - vB - 2 * inset,
        0.38,
      ),
      capMap,
      grad(ctx, capMap(0, vT), capMap(0, vB), [
        [0, css(capLit, 1.2)],
        [1, css(capLit, 0.92)],
      ]),
    );
    strokePts(
      ctx,
      [
        capMap(uL + inset + 0.35, vT - inset - 0.07),
        capMap(uR - inset - 0.35, vT - inset - 0.07),
      ],
      "rgba(255,240,220,0.22)",
      k * 0.07,
    );
    const size =
      spec.key === "00"
        ? 0.82
        : spec.key === "+"
          ? 1.35
          : spec.key === "="
            ? 1.3
            : spec.key === "C"
              ? 1.0
              : 1.05;
    text(
      ctx,
      capMap,
      (uL + uR) / 2,
      (vB + vT) / 2,
      spec.key,
      size,
      spec.key === "C" ? "#fff3ee" : "#f1f1ef",
      "center",
    );
    keys[spec.key] = {
      quad: [
        capMap(uL + inset, vB + inset),
        capMap(uR - inset, vB + inset),
        capMap(uR - inset, vT - inset),
        capMap(uL + inset, vT - inset),
      ],
      center: capMap((uL + uR) / 2, (vB + vT) / 2),
    };
  }
  return {
    keys,
    lcd: {
      map: (u, v) => map(u, v, -0.02),
      u0: 1.85,
      u1: c.w - 1.85,
      v0: 13.75,
      v1: 16.45,
    },
  };
}

function calcGeom(c) {
  const cyw = Math.cos(c.yaw);
  const syw = Math.sin(c.yaw);
  const ct = Math.cos(c.tilt);
  const st = Math.sin(c.tilt);
  const Lf = c.L / ct;
  const hb = c.hf + c.L * Math.tan(c.tilt);
  const hw = c.w / 2;
  const W3 = (a, h, b) => {
    const bb = b - c.L / 2;
    return v3(c.cx + a * cyw - bb * syw, h, c.cz + a * syw + bb * cyw);
  };
  const top = (u, v, w = 0) =>
    W3(u - hw, c.hf + v * st + w * ct, v * ct - w * st);
  return {
    W3,
    top,
    Lf,
    hb,
    hw,
    N: v3(st * syw, ct, -st * cyw), // (0, cos t, -sin t) turned by the yaw
    foot: [W3(-hw, 0, 0), W3(hw, 0, 0), W3(hw, 0, c.L), W3(-hw, 0, c.L)],
    crown: [
      W3(-hw, c.hf, 0),
      W3(hw, c.hf, 0),
      W3(hw, hb, c.L),
      W3(-hw, hb, c.L),
    ],
    inside: W3(0, c.hf * 0.6, c.L / 2),
  };
}

// a yellow pencil on the notepad, sharpened, its point toward the calculator
function paintPencil(ctx, cam, lay) {
  const A = lay.pencil.a;
  const B = lay.pencil.b;
  const len3 = Math.hypot(B.x - A.x, B.z - A.z);
  const a = cam.Pv(A);
  const b = cam.Pv(B);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = Math.hypot(dx, dy) || 1;
  let nx = -dy / l;
  let ny = dx / l;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const r = 0.38;
  const wa = cam.k(A.z) * r;
  const wb = cam.k(B.z) * r;
  const at = (f, s) => {
    const w = wa + (wb - wa) * f;
    return { x: a.x + dx * f + nx * w * s, y: a.y + dy * f + ny * w * s };
  };
  const fTip = 2.5 / len3;
  const fEnd = 1 - 2.2 / len3;
  const fRub = 1 - 0.95 / len3;
  const strip = (f0, f1, s0, s1, col) =>
    polyPath(ctx, [at(f0, s0), at(f1, s0), at(f1, s1), at(f0, s1)], col);
  const mid = mul(add3(A, B), 0.5);
  const Y = shade([226, 170, 52], mid, UP, lay, 0);
  strip(fTip, fEnd, 1, 0.33, css(Y, 1.2));
  strip(fTip, fEnd, 0.33, -0.33, css(Y, 0.95));
  strip(fTip, fEnd, -0.33, -1, css(Y, 0.6));
  const M = shade([170, 172, 178], B, UP, lay, 0);
  strip(fEnd, fRub, 1, -1, css(M, 1.05));
  strip(
    fEnd + (fRub - fEnd) * 0.45,
    fEnd + (fRub - fEnd) * 0.55,
    1,
    -1,
    css(M, 0.7),
  );
  strip(fRub, 1, 1, -1, css(shade([205, 122, 116], B, UP, lay, 0)));
  polyPath(
    ctx,
    [at(fTip, 1), at(fTip, -1), a],
    css(shade([214, 176, 130], A, UP, lay, 0)),
  );
  polyPath(ctx, [at(fTip * 0.38, 0.38), at(fTip * 0.38, -0.38), a], "#2a2a2c");
}

// a faint haze in the lamp's beam, a vignette, and film grain
function paintAtmosphere(ctx, cam, lay) {
  const L = lay.lamp;
  const { Ua, Va } = basis(L.beam);
  const pts = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    pts.push(
      cam.Pv(
        add3(L.mouth, add3(mul(Ua, Math.cos(a) * 7), mul(Va, Math.sin(a) * 7))),
      ),
    );
    pts.push(
      cam.P(L.target.x + Math.cos(a) * 17, 0, L.target.z + Math.sin(a) * 17),
    );
  }
  softLayer(
    ctx,
    cam,
    { scale: 0.08, radius: 3, color: "255,212,160", op: "lighter" },
    (g) => polyPath(g, hull(pts), "rgba(0,0,0,0.075)"),
  );
  const R = Math.hypot(cam.W, cam.H) / 2;
  const v = ctx.createRadialGradient(
    cam.W * 0.5,
    cam.H * 0.55,
    R * 0.35,
    cam.W * 0.5,
    cam.H * 0.55,
    R * 1.05,
  );
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, cam.W, cam.H);
  grain(ctx, cam.W, cam.H, 0.035);
}

// ── drawing helpers ─────────────────────────────────────────────────────────

function box(ctx, cam, lay, b, base, skip = []) {
  const { x0, x1, y0, y1, z0, z1 } = b;
  const inside = v3((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const faces = {
    front: [v3(x0, y0, z0), v3(x1, y0, z0), v3(x1, y1, z0), v3(x0, y1, z0)],
    left: [v3(x0, y0, z1), v3(x0, y0, z0), v3(x0, y1, z0), v3(x0, y1, z1)],
    right: [v3(x1, y0, z0), v3(x1, y0, z1), v3(x1, y1, z1), v3(x1, y1, z0)],
    top: [v3(x0, y1, z0), v3(x1, y1, z0), v3(x1, y1, z1), v3(x0, y1, z1)],
    bottom: [v3(x0, y0, z0), v3(x1, y0, z0), v3(x1, y0, z1), v3(x0, y0, z1)],
  };
  for (const [name, pts] of Object.entries(faces)) {
    if (skip.includes(name) || !faceVisible(pts, cam.eye, inside)) continue;
    fill3(
      ctx,
      cam,
      pts,
      css(shade(base, centroid(pts), faceNormal(pts, inside), lay, 0)),
    );
  }
}

function cylinder(ctx, cam, lay, x, z, r, y0, y1, base, capTop) {
  const top = ringS(cam, x, z, r, y1);
  const side = hull(top.concat(ringS(cam, x, z, r, y0)));
  const pl = cam.P(x - r, (y0 + y1) / 2, z);
  const pr = cam.P(x + r, (y0 + y1) / 2, z);
  const g = ctx.createLinearGradient(pl.x, 0, pr.x, 0);
  for (let i = 0; i <= 8; i++) {
    const f = i / 8;
    const a = Math.PI * (1 + f);
    const n = v3(Math.cos(a), 0, Math.sin(a));
    g.addColorStop(
      f,
      css(shade(base, v3(x + n.x * r, (y0 + y1) / 2, z + n.z * r), n, lay, 0)),
    );
  }
  polyPath(ctx, side, g);
  if (capTop) polyPath(ctx, top, css(shade(base, v3(x, y1, z), UP, lay, 0)));
  return top;
}

function ringS(cam, x, z, r, y, n = 48) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push(cam.P(x + Math.cos(a) * r, y, z + Math.sin(a) * r));
  }
  return out;
}

function rod(ctx, cam, lay, A, B, r, base) {
  const a = cam.Pv(A);
  const b = cam.Pv(B);
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  let nx = -(b.y - a.y) / l;
  let ny = (b.x - a.x) / l;
  if (ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const wa = cam.k(A.z) * r;
  const wb = cam.k(B.z) * r;
  const lit = shade(
    base,
    mul(add3(A, B), 0.5),
    unit(v3(0.2, 0.6, -0.8)),
    lay,
    0,
  );
  polyPath(
    ctx,
    [
      { x: a.x + nx * wa, y: a.y + ny * wa },
      { x: b.x + nx * wb, y: b.y + ny * wb },
      { x: b.x - nx * wb, y: b.y - ny * wb },
      { x: a.x - nx * wa, y: a.y - ny * wa },
    ],
    css(lit, 1.2),
  );
  strokePts(
    ctx,
    [
      { x: a.x + nx * wa * 0.45, y: a.y + ny * wa * 0.45 },
      { x: b.x + nx * wb * 0.45, y: b.y + ny * wb * 0.45 },
    ],
    "rgba(190,195,205,0.3)",
    (wa + wb) * 0.18,
  );
}

function knob(ctx, cam, p, r) {
  const s = cam.Pv(p);
  const R = cam.k(p.z) * r;
  const g = ctx.createRadialGradient(
    s.x - R * 0.35,
    s.y - R * 0.35,
    R * 0.1,
    s.x,
    s.y,
    R,
  );
  g.addColorStop(0, "#6a6e76");
  g.addColorStop(1, "#141518");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(s.x, s.y, R, 0, Math.PI * 2);
  ctx.fill();
}

function basis(d) {
  const up = Math.abs(d.y) > 0.9 ? v3(1, 0, 0) : v3(0, 1, 0);
  const Ua = unit(cross(d, up));
  return { Ua, Va: unit(cross(d, Ua)) };
}

// text laid on a face: the face's own mapping, straightened out at `u, v`
function text(ctx, map, u, v, str, size, color, align) {
  const O = map(u, v);
  const X = map(u + 1, v);
  const Y = map(u, v + 1);
  const s = size / 100;
  ctx.save();
  ctx.setTransform(
    (X.x - O.x) * s,
    (X.y - O.y) * s,
    -(Y.x - O.x) * s,
    -(Y.y - O.y) * s,
    O.x,
    O.y,
  );
  ctx.font = "600 100px Arial, Helvetica, sans-serif";
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(str, 0, 0);
  ctx.restore();
}

function gloss(ctx, map, x, y, w, h, a) {
  ctx.save();
  pathLocal(ctx, rr(x, y, w, h, 0.2), map);
  ctx.clip();
  pathLocal(
    ctx,
    [
      [x + w * 0.1, y + h],
      [x + w * 0.38, y + h],
      [x + w * 0.22, y],
      [x - w * 0.06, y],
    ],
    map,
  );
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ctx.fill();
  ctx.restore();
}

function wallGlow(ctx, cam, x, y, rx, ry, rgb, a) {
  const c = cam.P(x, y, ZW);
  const k = cam.k(ZW);
  softEllipse(ctx, c.x, c.y, rx * k, ry * k, rgb, a, "lighter");
}

function deskGlow(ctx, cam, x, z, rx, rz, rgb, a) {
  const c = cam.P(x, 0, z);
  const ry = (cam.P(x, 0, z - rz).y - cam.P(x, 0, z + rz).y) / 2;
  softEllipse(ctx, c.x, c.y, rx * cam.k(z), ry, rgb, a, "lighter");
}

function softEllipse(ctx, cx, cy, rx, ry, rgb, a, op = "source-over") {
  if (rx <= 0 || ry <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.translate(cx, cy);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(0.45, `rgba(${rgb},${a * 0.4})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

// shapes drawn small, blurred and scaled back up: soft shadows and light
function softLayer(
  ctx,
  cam,
  { scale, radius, color = "0,0,0", op = "source-over" },
  draw,
) {
  const sw = Math.max(2, Math.ceil(cam.W * scale));
  const sh = Math.max(2, Math.ceil(cam.H * scale));
  const c = makeCanvas(sw, sh);
  const g = c.getContext("2d");
  g.scale(sw / cam.W, sh / cam.H);
  draw(g);
  const img = g.getImageData(0, 0, sw, sh);
  blurAlpha(img.data, sw, sh, radius);
  const [r, gg, b] = color.split(",").map(Number);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = r;
    img.data[i + 1] = gg;
    img.data[i + 2] = b;
  }
  g.putImageData(img, 0, 0);
  const mid = makeCanvas(Math.min(cam.W, sw * 3), Math.min(cam.H, sh * 3));
  const m = mid.getContext("2d");
  m.imageSmoothingEnabled = true;
  m.drawImage(c, 0, 0, mid.width, mid.height);
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(mid, 0, 0, cam.W, cam.H);
  ctx.restore();
}

function blurAlpha(d, w, h, r) {
  if (r < 1) return;
  const a = new Float32Array(w * h);
  const tmp = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3];
  const n = 2 * r + 1;
  for (let it = 0; it < 2; it++) {
    for (let y = 0; y < h; y++) {
      let s = 0;
      for (let x = -r; x <= r; x++)
        s += a[y * w + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[y * w + x] = s / n;
        s +=
          a[y * w + Math.min(w - 1, x + r + 1)] - a[y * w + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let y = -r; y <= r; y++)
        s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = s / n;
        s +=
          tmp[Math.min(h - 1, y + r + 1) * w + x] -
          tmp[Math.max(0, y - r) * w + x];
      }
    }
  }
  for (let i = 0; i < w * h; i++) d[i * 4 + 3] = a[i];
}

let NOISE = null;
function grain(ctx, W, H, alpha) {
  if (!NOISE) {
    NOISE = makeCanvas(128, 128);
    const g = NOISE.getContext("2d");
    const img = g.createImageData(128, 128);
    const rnd = lcg(90210);
    for (let i = 0; i < 128 * 128; i++) {
      const v = (rnd() * 255) | 0;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ctx.createPattern(NOISE, "repeat");
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function puffCanvas() {
  const c = makeCanvas(64, 64);
  const g = c.getContext("2d");
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(225,220,210,0.55)");
  r.addColorStop(0.5, "rgba(225,220,210,0.2)");
  r.addColorStop(1, "rgba(225,220,210,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return c;
}

function fill3(ctx, cam, pts, style) {
  ctx.beginPath();
  pts.forEach((p, i) => {
    const s = cam.Pv(p);
    if (i) ctx.lineTo(s.x, s.y);
    else ctx.moveTo(s.x, s.y);
  });
  ctx.closePath();
  ctx.fillStyle = style;
  ctx.fill();
  ctx.strokeStyle = style; // closes the hairline seams between faces
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

function polyPath(ctx, pts, style) {
  if (!pts.length) return;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = style;
  ctx.fill();
}

function fillPolys(ctx, polys, style) {
  ctx.beginPath();
  for (const poly of polys) {
    poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  }
  ctx.fillStyle = style;
  ctx.fill();
}

function strokePts(ctx, pts, style, width) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function pathLocal(ctx, pts, map) {
  ctx.beginPath();
  pts.forEach(([u, v], i) => {
    const s = map(u, v);
    if (i) ctx.lineTo(s.x, s.y);
    else ctx.moveTo(s.x, s.y);
  });
  ctx.closePath();
}

function fillLocal(ctx, pts, map, style) {
  pathLocal(ctx, pts, map);
  ctx.fillStyle = style;
  ctx.fill();
}

// a rounded rectangle as points, in a face's centimetres
function rr(x, y, w, h, r, n = 5) {
  r = Math.min(r, w / 2, h / 2);
  const pts = [];
  const corner = (cx, cy, a0) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x + w - r, y + r, -Math.PI / 2);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2);
  corner(x + r, y + r, Math.PI);
  return pts;
}

function grad(ctx, a, b, stops) {
  const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function css(c, f = 1, a = 1) {
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return a >= 1
    ? `rgb(${ch(c[0])},${ch(c[1])},${ch(c[2])})`
    : `rgba(${ch(c[0])},${ch(c[1])},${ch(c[2])},${a})`;
}

function hull(points) {
  const p = points
    .filter(Boolean)
    .map((q) => ({ x: q.x, y: q.y }))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const q of p) {
    while (
      lower.length >= 2 &&
      cr(lower[lower.length - 2], lower[lower.length - 1], q) <= 0
    )
      lower.pop();
    lower.push(q);
  }
  const upper = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (
      upper.length >= 2 &&
      cr(upper[upper.length - 2], upper[upper.length - 1], q) <= 0
    )
      upper.pop();
    upper.push(q);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function faceNormal(pts, inside) {
  let n = unit(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
  if (dot(n, sub(centroid(pts), inside)) < 0) n = mul(n, -1);
  return n;
}

function faceVisible(pts, eye, inside) {
  return dot(faceNormal(pts, inside), sub(eye, centroid(pts))) > 0;
}

function centroid(pts) {
  const s = pts.reduce((a, p) => add3(a, p), v3(0, 0, 0));
  return mul(s, 1 / pts.length);
}

const v3 = (x, y, z) => ({ x, y, z });
const add3 = (a, b) => v3(a.x + b.x, a.y + b.y, a.z + b.z);
const sub = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
const mul = (a, s) => v3(a.x * s, a.y * s, a.z * s);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) =>
  v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
const unit = (a) => mul(a, 1 / (Math.hypot(a.x, a.y, a.z) || 1));
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
