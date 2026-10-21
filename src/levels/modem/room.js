/** The MODEM room is one photographic background. The router's lenses stay
 *  dark in that still — twelve of them: five counters, a space, seven for the
 *  letter (the photograph's sixth lens, which no letter ever lit, is covered
 *  over with the plastic above it); the scene adds the animated LED light and
 *  desk reflections above it, plus drifting dust in the lamp light. */

const ROOM_KEY = "md_room";
const GLOW_KEY = "md_glow";
const MOTE_KEY = "md_mote";
const ZW = 100; // the wall, in cm in front of the eye
const EYE_H = 30; // the eye, in cm above the desk
const AMB = [0.17, 0.18, 0.24]; // what light there is without the lamp
const LAMP = [1, 0.78, 0.52]; // the lamp's colour
const LAMP_POWER = 2.5;
const MOON = [0.6, 0.7, 1]; // the moonlight's colour
const _MOON_POWER = 0.55;
const MOON_DIR = unit(v3(0.25, 0.6, 0.76)); // from the desk toward the moon
const NZ = v3(0, 0, -1);
const UP = v3(0, 1, 0);

export function paintRoom(scene, W, H, roomPhoto) {
  if (roomPhoto) return paintPhotographicRoom(scene, W, H, roomPhoto);

  const cam = camera(W, H);
  const lay = layout(cam);
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext("2d");
  const rnd = lcg(909);
  paintSurfaces(ctx, cam, lay);
  paintDeskGrain(ctx, cam, rnd);
  paintProtocolDiagram(ctx, cam, lay);
  paintSocket(ctx, cam, lay);
  paintLamp(ctx, cam, lay);
  paintRouterProcedural(ctx, cam, lay);
  const ledScale = cam.k(lay.router.z0);
  const leds = lay.leds.map((p) => {
    const s = cam.Pv(p);
    const d = cam.Pv(v3(p.x, 0, lay.router.z0 - 1.6));
    return {
      x: s.x,
      y: s.y,
      r: ledScale * lay.ledR,
      spill: { x: d.x, y: d.y, rx: cam.k(lay.router.z0 - 1.6) * 2.4 },
    };
  });
  paintAtmosphere(ctx, cam);
  addCanvas(scene.textures, ROOM_KEY, cv);
  addCanvas(
    scene.textures,
    GLOW_KEY,
    radial(64, "255,255,255", [
      [0, 1],
      [0.18, 0.55],
      [0.5, 0.12],
      [1, 0],
    ]),
  );
  addCanvas(
    scene.textures,
    MOTE_KEY,
    radial(32, "255,226,180", [
      [0, 1],
      [0.25, 0.5],
      [1, 0],
    ]),
  );
  return {
    keys: { room: ROOM_KEY, glow: GLOW_KEY, mote: MOTE_KEY },
    // each LED: where it is on screen, its lens's radius, and the patch of
    // desk just in front of the router that its light falls on
    leds,
    // where the lamplight hangs in the air, for the dust
    lamp: (() => {
      const b = cam.Pv(lay.lamp.bulb);
      return { x: b.x, y: b.y, r: cam.k(lay.lamp.z) * 22 };
    })(),
    u: Math.min(W / 1000, H / 700),
  };
}

export function releaseRoomArt(textures) {
  for (const key of [ROOM_KEY, GLOW_KEY, MOTE_KEY]) if (textures.exists(key)) textures.remove(key);
}

// The photograph with its sixth lens taken out: the strip of the router's
// face just above it copied down over it, so there is only plastic between
// the counters and the letter's lights. (In the photograph's own pixels,
// 1672 × 941; kept once made.)
const PATCHED = new WeakMap();
function withoutSpareLens(photo) {
  if (PATCHED.has(photo)) return PATCHED.get(photo);
  const c = makeCanvas(photo.width, photo.height), g = c.getContext("2d");
  g.drawImage(photo, 0, 0);
  const kx = photo.width / 1672, ky = photo.height / 941;
  const x = 820 * kx, w = 21 * kx, h = 13 * ky;
  g.drawImage(c, x, 626 * ky, w, h, x, 640 * ky, w, h);
  PATCHED.set(photo, c);
  return c;
}

function paintPhotographicRoom(scene, W, H, photo) {
  const canvas = makeCanvas(W, H);
  canvas.getContext("2d").drawImage(withoutSpareLens(photo), 0, 0, W, H);
  addCanvas(scene.textures, ROOM_KEY, canvas);
  addCanvas(
    scene.textures,
    GLOW_KEY,
    radial(64, "255,255,255", [
      [0, 1],
      [0.18, 0.55],
      [0.5, 0.12],
      [1, 0],
    ]),
  );
  addCanvas(
    scene.textures,
    MOTE_KEY,
    radial(32, "255,226,180", [
      [0, 1],
      [0.25, 0.5],
      [1, 0],
    ]),
  );

  // These anchors follow the dark lenses in the photograph: the five
  // counters, then — past the space where the sixth was — the letter's seven.
  // The lenses stay in the still image; only their light and reflections animate.
  const ledXs = [
    0.4321, 0.4456, 0.4581, 0.4713, 0.4841,
    0.5108, 0.5239, 0.5374, 0.5505, 0.5634, 0.576, 0.5909,
  ];
  const radius = Math.max(1.6, Math.min(W * 0.002, H * 0.00355));
  const spillRadius = Math.min(W * 0.011, H * 0.02);
  return {
    keys: { room: ROOM_KEY, glow: GLOW_KEY, mote: MOTE_KEY },
    leds: ledXs.map((x) => ({
      x: W * x,
      y: H * 0.686,
      r: radius,
      spill: { x: W * x, y: H * 0.737, rx: spillRadius },
    })),
    lamp: {
      x: W * 0.205,
      y: H * 0.315,
      r: Math.min(W, H) * 0.15,
    },
    u: Math.min(W / 1000, H / 700),
  };
}

// ── the camera and the room's layout ────────────────────────────────────────

function camera(W, H) {
  const F = Math.min(H * 0.85, W * 1.15);
  const hy = H * 0.36;
  const cx = W / 2;
  return {
    W,
    H,
    F,
    hy,
    cx,
    eye: v3(0, EYE_H, 0),
    P: (x, y, z) => ({ x: cx + (F * x) / z, y: hy + (F * (EYE_H - y)) / z }),
    Pv: (p) => ({ x: cx + (F * p.x) / p.z, y: hy + (F * (EYE_H - p.y)) / p.z }),
    k: (z) => F / z,
    halfAt: (z) => ((W / 2) * z) / F,
  };
}

function layout(cam) {
  // on a narrow screen the lamp and the wall diagram close in toward the middle
  const spread = Math.min(1, cam.halfAt(ZW) / 80);
  const router = { x0: -17, x1: 17, y0: 0, y1: 7, z0: 55, z1: 73 };
  const ledY = 4.8;
  const leds = [];
  for (let i = 0; i < 5; i++) leds.push(v3(-12.8 + i * 1.3, ledY, router.z0));
  for (let i = 0; i < 7; i++) leds.push(v3(1.5 + i * 1.3, ledY, router.z0));
  const lampX = -41 * spread;
  const lamp = {
    x: lampX,
    z: 80,
    baseR: 6.5,
    shade: { y0: 21, y1: 36, r0: 12.5, r1: 9.5 },
    bulb: v3(lampX, 27.5, 80),
  };
  const wx = 23 * spread;
  const diagram = { x0: wx, x1: wx + 36, y0: 24, y1: 64 };
  return {
    router,
    leds,
    ledR: 0.42,
    lamp,
    diagram,
    socket: { x: 8.5, y: 8.5, s: 7 },
    antennas: [
      { a: v3(-14, 7.3, 71), b: v3(-16.8, 23.5, 72) },
      { a: v3(14, 7.3, 71), b: v3(16.8, 23.5, 72) },
    ],
  };
}

// ── light ───────────────────────────────────────────────────────────────────

// base colour × (ambient + the lamp): the shade lets the light out in a
// cone down onto the desk and a narrower one up the wall, and a little
// through the fabric all round; `gloss` adds the lamp mirrored in varnish
function shade(base, p, n, lay, gloss = 0) {
  const B = lay.lamp.bulb;
  let lx = B.x - p.x;
  let ly = B.y - p.y;
  let lz = B.z - p.z;
  const dist = Math.hypot(lx, ly, lz) || 1;
  lx /= dist;
  ly /= dist;
  lz /= dist;
  const ndl = Math.max(0, n.x * lx + n.y * ly + n.z * lz);
  const c = -ly; // the way the light leaves the bulb: + up, − down
  const cone = 0.18 + 0.82 * Math.max(smooth01((-c - 0.48) / 0.14), 0.75 * smooth01((c - 0.6) / 0.12));
  const fall = 1 / (1 + (dist / 42) ** 2);
  const I = ndl * cone * fall * LAMP_POWER;
  const out = [base[0] * (AMB[0] + I * LAMP[0]), base[1] * (AMB[1] + I * LAMP[1]), base[2] * (AMB[2] + I * LAMP[2])];
  if (gloss) {
    const vl = Math.hypot(p.x, EYE_H - p.y, p.z) || 1;
    const hx = lx - p.x / vl;
    const hy = ly + (EYE_H - p.y) / vl;
    const hz = lz - p.z / vl;
    const hl = Math.hypot(hx, hy, hz) || 1;
    const ndh = Math.max(0, (n.x * hx + n.y * hy + n.z * hz) / hl);
    const s = Math.pow(ndh, 50) * cone * fall * 120 * gloss;
    out[0] += s * LAMP[0];
    out[1] += s * LAMP[1];
    out[2] += s * LAMP[2];
  }
  return out;
}

// how much moonlight reaches a point on the desk: the ray toward the moon
// must pass out through the window's glass — not through its bars, and not
// through the router — with a soft edge to it
function _moonOn(p, lay) {
  const w = lay.win;
  const t = (ZW + w.depth - p.z) / MOON_DIR.z;
  const x = p.x + MOON_DIR.x * t;
  const y = p.y + MOON_DIR.y * t;
  const soft = 1.4;
  let m =
    smooth01((x - w.x0 - w.frame) / soft) *
    smooth01((w.x1 - w.frame - x) / soft) *
    smooth01((y - w.y0 - w.frame) / soft) *
    smooth01((w.y1 - w.frame - y) / soft);
  if (m <= 0) return 0;
  const mx = (w.x0 + w.x1) / 2;
  const my = w.y0 + (w.y1 - w.y0) * 0.55;
  m *= smooth01((Math.abs(x - mx) - 0.9) / 0.8) * smooth01((Math.abs(y - my) - 0.9) / 0.8);
  if (m > 0 && hitsBox(p, MOON_DIR, lay.router)) m *= 0.06;
  return m;
}

function hitsBox(o, d, b) {
  let t0 = 0;
  let t1 = Infinity;
  for (const [oa, da, lo, hi] of [
    [o.x, d.x, b.x0, b.x1],
    [o.y, d.y, b.y0, b.y1],
    [o.z, d.z, b.z0, b.z1],
  ]) {
    if (Math.abs(da) < 1e-9) {
      if (oa < lo || oa > hi) return false;
      continue;
    }
    let a = (lo - oa) / da;
    let c = (hi - oa) / da;
    if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, c);
    if (t0 > t1) return false;
  }
  return true;
}

function wallBase(x, y) {
  const f = 0.9 + 0.16 * (noise2(x / 40, y / 40) * 0.6 + noise2(x / 9, y / 9) * 0.4);
  return [50 * f, 66 * f, 72 * f];
}

function deskBase(x, z) {
  const plank = Math.floor((x + 1000) / 14);
  const tone = 0.84 + 0.3 * hash2(plank, 4111);
  const f = tone * (0.86 + 0.24 * noise2(x * 0.9 + plank * 17.3, z / 30));
  return [98 * f, 60 * f, 34 * f];
}

// ── the wall and the desk, lit pixel by pixel (at a third of the size) ──────

function paintSurfaces(ctx, cam, lay) {
  const { W, H, F, hy, cx } = cam;
  const R = Math.max(3, Math.round(Math.sqrt((W * H) / 160000)));
  const w = Math.ceil(W / R);
  const h = Math.ceil(H / R);
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const img = g.createImageData(w, h);
  const d = img.data;
  const yBack = hy + (F * EYE_H) / ZW;
  const p = { x: 0, y: 0, z: 0 };
  for (let j = 0; j < h; j++) {
    const Y = (j + 0.5) * R;
    for (let i = 0; i < w; i++) {
      const X = (i + 0.5) * R;
      const o = (j * w + i) * 4;
      let col;
      if (Y < yBack) {
        p.x = ((X - cx) * ZW) / F;
        p.y = EYE_H - ((Y - hy) * ZW) / F;
        p.z = ZW;
        const base = wallBase(p.x, p.y);
        col = shade(base, p, NZ, lay);
        // the wall falls darker toward the desk and the room's corners
        const ao = 0.62 + 0.38 * smooth01(p.y / 12);
        col = [col[0] * ao, col[1] * ao, col[2] * ao];
      } else {
        const z = (F * EYE_H) / (Y - hy);
        p.x = ((X - cx) * z) / F;
        p.y = 0;
        p.z = z;
        const base = deskBase(p.x, z);
        col = shade(base, p, UP, lay, 1);
        const ao = 0.6 + 0.4 * smooth01((ZW - z) / 10);
        col = [col[0] * ao, col[1] * ao, col[2] * ao];
      }
      d[o] = col[0];
      d[o + 1] = col[1];
      d[o + 2] = col[2];
      d[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(c, 0, 0, W, H);
  ctx.restore();
}

// the planks' seams and a little grain, running away toward the wall
function paintDeskGrain(ctx, cam, rnd) {
  const yBack = cam.P(0, 0, ZW).y;
  const zN = 38;
  const half = cam.halfAt(zN) + 4;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, yBack, cam.W, cam.H - yBack);
  ctx.clip();
  ctx.lineCap = "round";
  for (let x = -Math.ceil(half / 14) * 14; x <= half; x += 14) {
    const a = cam.P(x, 0, zN);
    const b = cam.P(x, 0, ZW);
    ctx.strokeStyle = "rgba(10,5,2,0.5)";
    ctx.lineWidth = Math.max(0.8, cam.k(zN) * 0.18);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const gx = x + 1.5 + rnd() * 11;
      const p0 = cam.P(gx, 0, zN);
      const p1 = cam.P(gx + (rnd() - 0.5) * 1.5, 0, ZW);
      ctx.strokeStyle = rnd() < 0.6 ? "rgba(20,10,4,0.16)" : "rgba(255,210,160,0.05)";
      ctx.lineWidth = Math.max(0.5, cam.k(zN) * 0.05);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }
  // where the desk meets the wall
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, yBack - 1, cam.W, 2.5);
  ctx.restore();
}

// The former window is now a small wall-mounted request/response schematic.
// Its symbols explain the exchange without putting any protocol name on the wall.
function paintProtocolDiagram(ctx, cam, lay) {
  const d = lay.diagram;
  const a = cam.P(d.x0, d.y1, ZW);
  const b = cam.P(d.x1, d.y0, ZW);
  const x = a.x, y = a.y, w = b.x - a.x, h = b.y - a.y;
  const scale = Math.min(w / 250, h / 220);
  ctx.save();
  softEllipse(ctx, x + w * 0.52, y + h * 0.55, w * 0.62, h * 0.62, "0,0,0", 0.52);
  const brass = ctx.createLinearGradient(x, y, x + w, y + h);
  brass.addColorStop(0, "#73572e"); brass.addColorStop(0.24, "#d4b875");
  brass.addColorStop(0.72, "#8b6b38"); brass.addColorStop(1, "#392b19");
  ctx.fillStyle = brass;
  roundRect(ctx, x - 4 * scale, y - 4 * scale, w + 8 * scale, h + 8 * scale, 4 * scale);
  ctx.fill();
  const board = ctx.createLinearGradient(0, y, 0, y + h);
  board.addColorStop(0, "#172126"); board.addColorStop(0.52, "#10181d"); board.addColorStop(1, "#0b1115");
  ctx.fillStyle = board;
  roundRect(ctx, x + 3 * scale, y + 3 * scale, w - 6 * scale, h - 6 * scale, 2 * scale);
  ctx.fill();
  ctx.strokeStyle = "rgba(202,222,219,0.075)";
  ctx.lineWidth = Math.max(0.6, scale * 0.65);
  for (let i = 1; i < 8; i++) {
    const gx = x + (w * i) / 8;
    ctx.beginPath(); ctx.moveTo(gx, y + h * 0.08); ctx.lineTo(gx, y + h * 0.92); ctx.stroke();
  }
  for (let i = 1; i < 6; i++) {
    const gy = y + (h * i) / 6;
    ctx.beginPath(); ctx.moveTo(x + w * 0.06, gy); ctx.lineTo(x + w * 0.94, gy); ctx.stroke();
  }

  const cy = y + h * 0.5;
  const clientX = x + w * 0.19;
  const routerX = x + w * 0.5;
  const serverX = x + w * 0.81;
  const icon = Math.min(w * 0.115, h * 0.17);
  diagramLaptop(ctx, clientX, cy, icon);
  diagramRouter(ctx, routerX, cy, icon * 0.92);
  diagramServer(ctx, serverX, cy, icon);

  const left = clientX + icon * 0.72;
  const right = serverX - icon * 0.72;
  const upper = y + h * 0.29;
  const lower = y + h * 0.72;
  diagramArrow(ctx, left, upper, right, upper, "#9bd4d4", scale);
  diagramArrow(ctx, right, lower, left, lower, "#d9b879", scale);
  packet(ctx, x + w * 0.39, upper, scale, "request");
  packet(ctx, x + w * 0.62, lower, scale, "response");
  for (let i = 0; i < 4; i++) {
    const t = 0.27 + i * 0.12;
    ctx.fillStyle = i % 2 ? "rgba(224,237,224,0.76)" : "rgba(147,208,210,0.7)";
    ctx.beginPath(); ctx.arc(left + (right - left) * t, upper, scale * 1.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(228,199,138,0.74)";
    ctx.beginPath(); ctx.arc(right - (right - left) * t, lower, scale * 1.25, 0, Math.PI * 2); ctx.fill();
  }
  // Small brass fasteners make the chart feel fixed to the plaster.
  for (const [px, py] of [[x + 8 * scale, y + 8 * scale], [x + w - 8 * scale, y + 8 * scale], [x + 8 * scale, y + h - 8 * scale], [x + w - 8 * scale, y + h - 8 * scale]]) {
    ctx.fillStyle = "#c6a260"; ctx.beginPath(); ctx.arc(px, py, 1.7 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(49,34,17,0.85)"; ctx.lineWidth = Math.max(0.6, 0.45 * scale);
    ctx.beginPath(); ctx.moveTo(px - scale, py); ctx.lineTo(px + scale, py); ctx.stroke();
  }
  ctx.restore();
}

function diagramLaptop(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#d5e0d9"; ctx.lineWidth = Math.max(1, s * 0.09); ctx.lineJoin = "round";
  roundRect(ctx, -s * 0.55, -s * 0.38, s * 1.1, s * 0.72, s * 0.06); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s * 0.72, s * 0.49); ctx.lineTo(-s * 0.55, s * 0.35); ctx.lineTo(s * 0.55, s * 0.35); ctx.lineTo(s * 0.72, s * 0.49); ctx.closePath(); ctx.stroke();
  ctx.strokeStyle = "rgba(155,212,212,0.7)"; ctx.lineWidth = Math.max(0.8, s * 0.045);
  ctx.beginPath(); ctx.moveTo(-s * 0.3, -s * 0.12); ctx.lineTo(s * 0.28, -s * 0.12); ctx.moveTo(-s * 0.3, s * 0.06); ctx.lineTo(s * 0.08, s * 0.06); ctx.stroke();
  ctx.restore();
}

function diagramRouter(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = "#d5e0d9"; ctx.lineWidth = Math.max(1, s * 0.08); ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-s * 0.25, -s * 0.1); ctx.lineTo(-s * 0.42, -s * 0.72); ctx.moveTo(s * 0.25, -s * 0.1); ctx.lineTo(s * 0.42, -s * 0.72); ctx.stroke();
  ctx.fillStyle = "#344b4b"; ctx.strokeStyle = "#d5e0d9";
  roundRect(ctx, -s * 0.6, -s * 0.1, s * 1.2, s * 0.52, s * 0.12); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 1 ? "#d8b36b" : "#85c8ad"; ctx.beginPath(); ctx.arc(-s * 0.3 + i * s * 0.3, s * 0.16, Math.max(0.8, s * 0.055), 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function diagramServer(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y);
  for (let i = 0; i < 3; i++) {
    const yy = (i - 1) * s * 0.48;
    ctx.fillStyle = "#26343a"; ctx.strokeStyle = "#d5e0d9"; ctx.lineWidth = Math.max(1, s * 0.06);
    roundRect(ctx, -s * 0.5, yy - s * 0.18, s, s * 0.36, s * 0.05); ctx.fill(); ctx.stroke();
    ctx.fillStyle = i === 1 ? "#d8b36b" : "#91d2b0"; ctx.beginPath(); ctx.arc(-s * 0.31, yy, Math.max(0.8, s * 0.055), 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(217,229,220,0.62)"; ctx.beginPath(); ctx.moveTo(-s * 0.12, yy); ctx.lineTo(s * 0.34, yy); ctx.stroke();
  }
  ctx.restore();
}

function diagramArrow(ctx, x0, y0, x1, y1, color, scale) {
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(1.4, scale * 1.35); ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  const dir = Math.sign(x1 - x0);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - dir * scale * 4.2, y1 - scale * 2.5); ctx.lineTo(x1 - dir * scale * 4.2, y1 + scale * 2.5); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function packet(ctx, x, y, scale, kind) {
  const w = scale * (kind === "request" ? 7 : 8), h = scale * 9;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = kind === "request" ? "#d9eee5" : "#eeddb7";
  ctx.strokeStyle = "rgba(10,16,18,0.85)"; ctx.lineWidth = Math.max(0.7, scale * 0.55);
  roundRect(ctx, -w / 2, -h / 2, w, h, scale * 0.7); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = kind === "request" ? "#57898a" : "#9e7941";
  ctx.lineWidth = Math.max(0.6, scale * 0.55);
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-w * 0.25, -h * 0.16 + i * h * 0.22); ctx.lineTo(w * 0.25, -h * 0.16 + i * h * 0.22); ctx.stroke(); }
  ctx.restore();
}

// ── router ──────────────────────────────────────────────────────────────────
function _paintRouter(ctx, cam, lay, image) {
  const r = lay.router;
  const w = (r.x1 - r.x0) * cam.k((r.z0 + r.z1) / 2);
  const h = w * (image.height / image.width);
  const cx = cam.cx;
  const ledY = cam.P(0, 4.8, r.z0).y;
  const top = ledY - h * 0.535;
  const left = cx - w / 2;
  softEllipse(ctx, cx + w * 0.02, top + h * 0.79, w * 0.48, h * 0.095, "0,0,0", 0.72);
  // The textured, photographed casing sits on the desk; the existing antenna
  // painter is drawn over its rear edge so it remains joined to the housing.
  ctx.drawImage(image, left, top, w, h);
  for (const an of lay.antennas) antenna(ctx, cam, lay, an);
  return lay.leds.map((_, i) => {
    const ratio = i / 12;
    const x = left + w * (0.145 + ratio * 0.595);
    const y = top + h * (0.474 + ratio * 0.105);
    return {
      x, y, r: Math.max(2.2, w * 0.009),
      spill: { x, y: top + h * 0.78, rx: w * 0.043 },
    };
  });
}

// Set into the wall a hand's depth: the far side of the opening and its top
// and bottom seen in perspective, the white-painted frame and its cross of
// glazing bars, and beyond the glass the night over the valley — the moon,
// the stars, the hills, the cypresses — as through the telescope's window.

function _paintWindow(ctx, cam, lay, moonImg, rnd) {
  const w = lay.win;
  const zg = ZW + w.depth; // the glass
  const P = (x, y, z) => cam.P(x, y, z);
  const near = [P(w.x0, w.y0, ZW), P(w.x1, w.y0, ZW), P(w.x1, w.y1, ZW), P(w.x0, w.y1, ZW)];
  const far = [P(w.x0, w.y0, zg), P(w.x1, w.y0, zg), P(w.x1, w.y1, zg), P(w.x0, w.y1, zg)];
  // everything set into the wall shows only through the near opening
  ctx.save();
  ctx.beginPath();
  near.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
  ctx.closePath();
  ctx.clip();
  // the view, within the far opening
  const gx0 = far[0].x;
  const gx1 = far[1].x;
  const gy0 = far[3].y;
  const gy1 = far[0].y;
  ctx.save();
  ctx.beginPath();
  ctx.rect(gx0, gy0, gx1 - gx0, gy1 - gy0);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, gy0, 0, gy1);
  sky.addColorStop(0, "#050a18");
  sky.addColorStop(0.55, "#0e1a36");
  sky.addColorStop(1, "#1d2d52");
  ctx.fillStyle = sky;
  ctx.fillRect(gx0, gy0, gx1 - gx0, gy1 - gy0);
  const gw = gx1 - gx0;
  const gh = gy1 - gy0;
  const moon = { x: gx0 + gw * 0.7, y: gy0 + gh * 0.26, r: gw * 0.075 };
  softEllipse(ctx, moon.x, moon.y, moon.r * 7, moon.r * 7, "150,172,232", 0.16);
  for (let i = 0; i < Math.round((gw * gh) / 900); i++) {
    const x = gx0 + rnd() * gw;
    const y = gy0 + rnd() * gh * 0.75;
    if (Math.hypot(x - moon.x, y - moon.y) < moon.r * 1.8) continue;
    ctx.fillStyle = `rgba(220,228,255,${(0.2 + rnd() * 0.5).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.4 + rnd() * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  const md = (moon.r * 2) / 0.72;
  ctx.drawImage(moonImg, moon.x - md / 2, moon.y - md / 2, md, md);
  // the valley: a far ridge touched by the moon, a nearer one almost black
  const far1 = (x) => gy0 + gh * (0.74 + 0.04 * Math.sin((x - gx0) / gw * 5.2 + 0.7));
  const near1 = (x) => gy0 + gh * (0.86 + 0.035 * Math.sin((x - gx0) / gw * 3.4 + 2.1));
  const hill = (f, style, rim) => {
    ctx.beginPath();
    ctx.moveTo(gx0 - 2, f(gx0 - 2));
    for (let x = gx0; x <= gx1 + 2; x += 2) ctx.lineTo(x, f(x));
    ctx.lineTo(gx1 + 2, gy1 + 2);
    ctx.lineTo(gx0 - 2, gy1 + 2);
    ctx.closePath();
    ctx.fillStyle = style;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(gx0 - 2, f(gx0 - 2) + 0.5);
    for (let x = gx0; x <= gx1 + 2; x += 2) ctx.lineTo(x, f(x) + 0.5);
    ctx.strokeStyle = rim;
    ctx.lineWidth = 1;
    ctx.stroke();
  };
  hill(far1, "#111c35", "rgba(160,180,232,0.32)");
  const mist = ctx.createLinearGradient(0, gy0 + gh * 0.74, 0, gy0 + gh * 0.9);
  mist.addColorStop(0, "rgba(96,118,172,0.16)");
  mist.addColorStop(1, "rgba(96,118,172,0)");
  ctx.fillStyle = mist;
  ctx.fillRect(gx0, gy0 + gh * 0.74, gw, gh * 0.16);
  for (const [fx, fh] of [
    [0.16, 0.2],
    [0.2, 0.14],
    [0.83, 0.17],
  ]) {
    const x = gx0 + gw * fx;
    cypress(ctx, x, far1(x) + 1, gh * fh, gh * fh * 0.2, "#0a1122");
  }
  hill(near1, "#070b16", "rgba(120,140,195,0.12)");
  ctx.restore();

  // the depth of the wall round the opening: its far side, its top and its
  // sill, the lamp's warmth on them on the left and the moon's on the right
  const face = (pts, style) => {
    ctx.beginPath();
    pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
    ctx.closePath();
    ctx.fillStyle = style;
    ctx.fill();
  };
  const wallAt = (x, y, z, n) => shade(wallBase(x, y), v3(x, y, z), n, lay);
  const side = wallAt(w.x1, (w.y0 + w.y1) / 2, ZW + 1, v3(-1, 0, 0));
  const head = wallAt((w.x0 + w.x1) / 2, w.y1, ZW + 1, v3(0, -1, 0));
  // the bottom of the opening takes the moonlight coming in through the glass
  const foot = wallAt((w.x0 + w.x1) / 2, w.y0, ZW + 1, UP);
  const lit = [foot[0] + 50 * MOON[0] * 0.5, foot[1] + 66 * MOON[1] * 0.5, foot[2] + 72 * MOON[2] * 0.5];
  face([near[1], far[1], far[2], near[2]], grad(ctx, near[1], far[1], [[0, css(side, 1.15)], [1, css(side, 0.6)]]));
  face([near[3], near[2], far[2], far[3]], grad(ctx, near[3], far[3], [[0, css(head, 0.7)], [1, css(head, 0.45)]]));
  face([near[0], near[1], far[1], far[0]], grad(ctx, far[0], near[0], [[0, css(lit)], [1, css(foot, 0.9)]]));
  // the frame, painted white long ago, and its cross of bars
  const fw = w.frame;
  const frame = new Path2D();
  const rect = (x0, y0, x1, y1) => {
    const a = P(x0, y0, zg);
    const b = P(x1, y1, zg);
    frame.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  };
  rect(w.x0, w.y0, w.x0 + fw, w.y1);
  rect(w.x1 - fw, w.y0, w.x1, w.y1);
  rect(w.x0, w.y1 - fw, w.x1, w.y1);
  rect(w.x0, w.y0, w.x1, w.y0 + fw * 1.4);
  const mx = (w.x0 + w.x1) / 2;
  const my = w.y0 + (w.y1 - w.y0) * 0.55;
  rect(mx - fw * 0.4, w.y0, mx + fw * 0.4, w.y1);
  rect(w.x0, my - fw * 0.4, w.x1, my + fw * 0.4);
  const paint = shade([196, 200, 204], v3(mx, my, zg), NZ, lay);
  const fg = ctx.createLinearGradient(gx0, 0, gx1, 0);
  fg.addColorStop(0, css(paint, 1.1));
  fg.addColorStop(1, css(paint, 0.75));
  ctx.fillStyle = fg;
  ctx.fill(frame);
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 0.8;
  ctx.stroke(frame);
  // the moon's light along the inner edges of the bars
  ctx.fillStyle = "rgba(170,190,235,0.35)";
  const pm = P(mx + fw * 0.4, my, zg);
  const pmt = P(mx + fw * 0.4, w.y1 - fw, zg);
  const pmb = P(mx + fw * 0.4, w.y0 + fw * 1.4, zg);
  ctx.fillRect(pm.x, pmt.y, 1, pmb.y - pmt.y);
  ctx.restore();
  // the sill, a board standing out into the room
  const s0 = P(w.x0 - 3, w.y0, ZW - 5);
  const s1 = P(w.x1 + 3, w.y0, ZW - 5);
  const s2 = P(w.x1 + 3, w.y0, ZW);
  const s3 = P(w.x0 - 3, w.y0, ZW);
  const sillTop = css(shade([150, 112, 76], v3(mx, w.y0, ZW - 2.5), UP, lay));
  face([s3, s2, s1, s0], sillTop);
  const e0 = P(w.x0 - 3, w.y0 - 2, ZW - 5);
  const e1 = P(w.x1 + 3, w.y0 - 2, ZW - 5);
  face([s0, s1, e1, e0], css(shade([120, 88, 58], v3(mx, w.y0 - 1, ZW - 5), NZ, lay)));
  softEllipse(ctx, (e0.x + e1.x) / 2, e0.y + 3, (e1.x - e0.x) * 0.55, 5, "0,0,0", 0.35);
}

// ── the socket and the cable ────────────────────────────────────────────────

function paintSocket(ctx, cam, lay) {
  const s = lay.socket;
  const a = cam.P(s.x - s.s / 2, s.y + s.s / 2, ZW);
  const b = cam.P(s.x + s.s / 2, s.y - s.s / 2, ZW);
  const pw = b.x - a.x;
  const ph = b.y - a.y;
  softEllipse(ctx, a.x + pw * 0.56, a.y + ph * 0.58, pw * 0.7, ph * 0.7, "0,0,0", 0.35);
  const plate = css(shade([206, 204, 196], v3(s.x, s.y, ZW - 0.5), NZ, lay));
  ctx.fillStyle = plate;
  roundRect(ctx, a.x, a.y, pw, ph, pw * 0.12);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // the plug in it, and the cable dropping to the desk and on to the router
  const c = cam.P(s.x, s.y, ZW - 1);
  ctx.fillStyle = "#1a1c20";
  roundRect(ctx, c.x - pw * 0.22, c.y - ph * 0.26, pw * 0.44, ph * 0.52, pw * 0.08);
  ctx.fill();
  const r = lay.router;
  const pts = [cam.P(s.x, s.y - 2.2, ZW - 1.2), cam.P(s.x - 0.6, 1.5, ZW - 0.6), cam.P(s.x - 2.5, 0.4, ZW - 4), cam.P(3, 0.4, r.z1 + 3), cam.P(1.5, 2.5, r.z1)];
  ctx.strokeStyle = "#16181c";
  ctx.lineWidth = Math.max(1.5, cam.k(ZW) * 0.6);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  ctx.bezierCurveTo(pts[1].x, pts[1].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
  ctx.quadraticCurveTo(pts[3].x, pts[3].y, pts[4].x, pts[4].y);
  ctx.stroke();
  ctx.strokeStyle = "rgba(170,190,230,0.18)";
  ctx.lineWidth = Math.max(0.6, cam.k(ZW) * 0.18);
  ctx.stroke();
}

// ── the lamp ────────────────────────────────────────────────────────────────
// A brass table lamp with a cream drum shade, lit: the shade glows through,
// brightest round the middle, the brass catching the light that falls
// from under it.

function paintLamp(ctx, cam, lay) {
  const L = lay.lamp;
  const brass = [178, 138, 72];
  // its light in the air round it
  const b = cam.Pv(L.bulb);
  softEllipse(ctx, b.x, b.y, cam.k(L.z) * 30, cam.k(L.z) * 26, "255,190,120", 0.16, "lighter");
  // the base: a low round foot, its top lit from the shade above
  const baseTop = ring(cam, L.x, L.z, L.baseR, 1.6);
  const baseBot = ring(cam, L.x, L.z, L.baseR, 0);
  softEllipse(ctx, cam.P(L.x, 0, L.z).x, cam.P(L.x, 0, L.z).y, cam.k(L.z) * L.baseR * 1.5, cam.k(L.z) * L.baseR * 0.35, "0,0,0", 0.5);
  const side = hull(baseTop.concat(baseBot));
  const bl = cam.P(L.x - L.baseR, 0.8, L.z);
  const br = cam.P(L.x + L.baseR, 0.8, L.z);
  ctx.fillStyle = grad(ctx, bl, br, [
    [0, css(brass, 0.35)],
    [0.35, css(brass, 0.9)],
    [0.55, css(brass, 0.6)],
    [1, css(brass, 0.25)],
  ]);
  poly(ctx, side);
  ctx.fill();
  // its top: polished brass, so mostly the dark of the room mirrored in it,
  // with the lamp's light caught in a bright band toward the back
  const tb = cam.P(L.x, 1.6, L.z + L.baseR);
  const tf = cam.P(L.x, 1.6, L.z - L.baseR);
  ctx.fillStyle = grad(ctx, tb, tf, [
    [0, css(brass, 0.95)],
    [0.3, css(brass, 0.7)],
    [1, css(brass, 0.3)],
  ]);
  poly(ctx, baseTop);
  ctx.fill();
  const hot = cam.P(L.x, 1.6, L.z + L.baseR * 0.35);
  softEllipse(ctx, hot.x, hot.y, cam.k(L.z) * L.baseR * 0.55, cam.k(L.z) * 0.9, "255,236,190", 0.55);
  // the stem
  const st0 = cam.P(L.x, 1.6, L.z);
  const st1 = cam.P(L.x, L.shade.y0 + 1, L.z);
  const sw = cam.k(L.z) * 0.7;
  ctx.fillStyle = grad(ctx, { x: st0.x - sw, y: 0 }, { x: st0.x + sw, y: 0 }, [
    [0, css(brass, 0.5)],
    [0.4, css(brass, 1.25)],
    [1, css(brass, 0.35)],
  ]);
  ctx.fillRect(st0.x - sw, st1.y, sw * 2, st0.y - st1.y);
  // the shade: a drum wider at the foot, glowing
  const sh = L.shade;
  const top = ring(cam, L.x, L.z, sh.r1, sh.y1);
  const bot = ring(cam, L.x, L.z, sh.r0, sh.y0);
  const body = hull(top.concat(bot));
  const l0 = cam.P(L.x - sh.r0, (sh.y0 + sh.y1) / 2, L.z);
  const r0 = cam.P(L.x + sh.r0, (sh.y0 + sh.y1) / 2, L.z);
  ctx.fillStyle = grad(ctx, l0, r0, [
    [0, "#b4804c"],
    [0.3, "#f6d6a2"],
    [0.5, "#ffe6bc"],
    [0.75, "#e8b27a"],
    [1, "#9a6a3e"],
  ]);
  poly(ctx, body);
  ctx.fill();
  // the fabric darker at its hems, a seam, and the rims
  const hemTop = cam.P(L.x, sh.y1, L.z);
  const hemBot = cam.P(L.x, sh.y0, L.z);
  ctx.save();
  poly(ctx, body);
  ctx.clip();
  const v = ctx.createLinearGradient(0, hemTop.y - 4, 0, hemBot.y + 4);
  v.addColorStop(0, "rgba(90,50,20,0.45)");
  v.addColorStop(0.2, "rgba(90,50,20,0)");
  v.addColorStop(0.82, "rgba(90,50,20,0)");
  v.addColorStop(1, "rgba(90,50,20,0.4)");
  ctx.fillStyle = v;
  ctx.fillRect(l0.x - 10, hemTop.y - 10, r0.x - l0.x + 20, hemBot.y - hemTop.y + 20);
  ctx.restore();
  // the near half of the lower rim
  ctx.strokeStyle = "rgba(120,70,30,0.55)";
  ctx.lineWidth = Math.max(1, cam.k(L.z) * 0.35);
  ctx.beginPath();
  bot.slice(0, bot.length / 2 + 1).forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
  ctx.stroke();
  // the light pouring out under the rim
  softEllipse(ctx, hemBot.x, hemBot.y + cam.k(L.z) * 1.5, cam.k(L.z) * sh.r0 * 1.1, cam.k(L.z) * 3, "255,214,150", 0.45, "lighter");
}

// ── the router ──────────────────────────────────────────────────────────────
// An old slab of a router in dark grey plastic, its top vented at the back
// and a Wi-Fi mark moulded in it, a smoked strip across its front where the
// thirteen lights sit — five on the left, eight on the right — and under
// them its maker's name. Two antennas stand up at the back.

function paintRouterProcedural(ctx, cam, lay) {
  const r = lay.router;
  const k = cam.k(r.z0);
  const body = [44, 47, 54];
  // its shadow on the desk: dark close under it, and a little thrown
  const foot = cam.P(0, 0, (r.z0 + r.z1) / 2);
  softEllipse(ctx, foot.x, foot.y, (r.x1 - r.x0) * cam.k((r.z0 + r.z1) / 2) * 0.62, cam.k(r.z0) * 2.4, "0,0,0", 0.7);
  // the top: a trapezium going back to the far edge
  const tl = cam.P(r.x0, r.y1, r.z0);
  const tr = cam.P(r.x1, r.y1, r.z0);
  const br = cam.P(r.x1, r.y1, r.z1);
  const bl = cam.P(r.x0, r.y1, r.z1);
  const topCol = shade(body, v3(0, r.y1, (r.z0 + r.z1) / 2), UP, lay);
  ctx.fillStyle = grad(ctx, tl, tr, [
    [0, css(topCol, 1.35)],
    [0.5, css(topCol, 1.05)],
    [1, css([topCol[0] * 0.9 + 6, topCol[1] * 0.9 + 9, topCol[2] * 0.9 + 16])],
  ]);
  poly(ctx, [tl, tr, br, bl]);
  ctx.fill();
  // vents: slots across the back right of the top
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  for (let i = 0; i < 9; i++) {
    const x = 3 + i * 1.3;
    const a = cam.P(x, r.y1, r.z1 - 2);
    const b = cam.P(x + 0.55, r.y1, r.z1 - 8);
    poly(ctx, [a, cam.P(x + 0.55, r.y1, r.z1 - 2), b, cam.P(x, r.y1, r.z1 - 8)]);
    ctx.fill();
  }
  // the Wi-Fi mark moulded into the top, left of middle
  const wc = cam.P(-8.5, r.y1, r.z0 + 7.5);
  const wk = cam.k(r.z0 + 7.5);
  ctx.save();
  ctx.translate(wc.x, wc.y);
  ctx.scale(1, 0.34);
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineCap = "round";
  for (let i = 1; i <= 3; i++) {
    ctx.lineWidth = wk * 0.35;
    ctx.beginPath();
    ctx.arc(0, wk * 1.2, wk * i * 0.95, Math.PI * 1.25, Math.PI * 1.75);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.arc(0, wk * 1.2, wk * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // the antennas at the back: rods of black rubber, ribbed, on their hinges
  for (const an of lay.antennas) antenna(ctx, cam, lay, an);
  // the rounded edge between top and front, catching the lamp and the moon
  const fl = cam.P(r.x0, r.y1, r.z0);
  const fr = cam.P(r.x1, r.y1, r.z0);
  const bot = cam.P(r.x0, r.y0, r.z0).y;
  const rad = k * 0.9;
  // the front
  const front = ctx.createLinearGradient(0, fl.y, 0, bot);
  const fc = shade(body, v3(0, 3.5, r.z0), NZ, lay);
  front.addColorStop(0, css([fc[0] + 14, fc[1] + 15, fc[2] + 18]));
  front.addColorStop(0.5, css([fc[0] + 7, fc[1] + 8, fc[2] + 10]));
  front.addColorStop(1, css(fc, 0.8));
  ctx.fillStyle = front;
  roundRect(ctx, fl.x, fl.y, fr.x - fl.x, bot - fl.y, rad);
  ctx.fill();
  ctx.fillStyle = "rgba(255,226,190,0.32)";
  ctx.fillRect(fl.x + rad, fl.y, (fr.x - fl.x) * 0.45, Math.max(1, k * 0.12));
  ctx.fillStyle = "rgba(170,190,235,0.28)";
  ctx.fillRect(fl.x + (fr.x - fl.x) * 0.55, fl.y, (fr.x - fl.x) * 0.45 - rad, Math.max(1, k * 0.12));
  // the smoked strip the lights sit behind
  const sy0 = cam.P(0, lay.leds[0].y + 1.15, r.z0).y;
  const sy1 = cam.P(0, lay.leds[0].y - 1.15, r.z0).y;
  const sx0 = cam.P(-14.4, 0, r.z0).x;
  const sx1 = cam.P(14.4, 0, r.z0).x;
  ctx.fillStyle = grad(ctx, { x: 0, y: sy0 }, { x: 0, y: sy1 }, [
    [0, "#07080a"],
    [0.5, "#101216"],
    [1, "#08090b"],
  ]);
  roundRect(ctx, sx0, sy0, sx1 - sx0, sy1 - sy0, (sy1 - sy0) * 0.3);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  roundRect(ctx, sx0 + 2, sy0 + 1, sx1 - sx0 - 4, (sy1 - sy0) * 0.3, (sy1 - sy0) * 0.15);
  ctx.fill();
  // the lights, dark: each a small lens with a point of light on its glass
  for (const p of lay.leds) {
    const s = cam.Pv(p);
    const lr = k * lay.ledR;
    ctx.fillStyle = "#1c2024";
    ctx.beginPath();
    ctx.arc(s.x, s.y, lr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.8)";
    ctx.lineWidth = Math.max(0.6, lr * 0.25);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.arc(s.x - lr * 0.3, s.y - lr * 0.35, lr * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  // the maker's name, printed in pale grey under the strip
  const ny = cam.P(0, 1.85, r.z0).y;
  const size = Math.max(9, k * 1.2);
  ctx.save();
  ctx.fillStyle = "rgba(196,200,208,0.78)";
  ctx.font = `600 ${size.toFixed(1)}px "Helvetica Neue", Arial, sans-serif`;
  ctx.textBaseline = "middle";
  const text = "W. LEIBNIZ";
  const gap = size * 0.34;
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (text.length - 1);
  let x = cam.cx - total / 2;
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, ny);
    x += widths[i] + gap;
  });
  ctx.restore();
  // rubber feet
  for (const fx of [r.x0 + 2.5, r.x1 - 2.5]) {
    const f = cam.P(fx, 0, r.z0 + 1);
    ctx.fillStyle = "#050607";
    ctx.fillRect(f.x - k * 1.2, f.y - k * 0.35, k * 2.4, k * 0.4);
  }
}

// one antenna: a hinge block at the router's back corner, then a tapering
// ribbed rod leaning out a little, lit on the side toward the lamp
function antenna(ctx, cam, lay, an) {
  const { a, b } = an;
  const hinge = cam.P(a.x, a.y + 0.8, a.z);
  const hk = cam.k(a.z);
  ctx.fillStyle = "#15171b";
  roundRect(ctx, hinge.x - hk * 1.1, hinge.y - hk * 1.1, hk * 2.2, hk * 1.9, hk * 0.4);
  ctx.fill();
  const pa = cam.Pv(v3(a.x, a.y + 1.6, a.z));
  const pb = cam.Pv(b);
  const len = Math.hypot(pb.x - pa.x, pb.y - pa.y) || 1;
  const nx = -(pb.y - pa.y) / len;
  const ny = (pb.x - pa.x) / len;
  const wa = hk * 0.62;
  const wb = cam.k(b.z) * 0.42;
  const rodPath = new Path2D();
  rodPath.moveTo(pa.x + nx * wa, pa.y + ny * wa);
  rodPath.lineTo(pb.x + nx * wb, pb.y + ny * wb);
  rodPath.lineTo(pb.x - nx * wb, pb.y - ny * wb);
  rodPath.lineTo(pa.x - nx * wa, pa.y - ny * wa);
  rodPath.closePath();
  const cap = new Path2D();
  cap.arc(pb.x, pb.y, wb, 0, Math.PI * 2);
  const lit = shade([40, 42, 46], v3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2), unit(v3(-0.7, 0.2, -0.7)), lay);
  ctx.fillStyle = grad(ctx, { x: pa.x - nx * wa * 2, y: pa.y - ny * wa * 2 }, { x: pa.x + nx * wa * 2, y: pa.y + ny * wa * 2 }, [
    [0, "#0b0c0e"],
    [0.5, css(lit, 1.2)],
    [1, "#0b0c0e"],
  ]);
  ctx.fill(rodPath);
  ctx.fill(cap);
  // the ribs of the rubber sleeve, low down
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = Math.max(0.6, hk * 0.12);
  for (let i = 1; i <= 6; i++) {
    const t = 0.06 + i * 0.045;
    const cx = pa.x + (pb.x - pa.x) * t;
    const cy = pa.y + (pb.y - pa.y) * t;
    const w = wa + (wb - wa) * t;
    ctx.beginPath();
    ctx.moveTo(cx + nx * w, cy + ny * w);
    ctx.lineTo(cx - nx * w, cy - ny * w);
    ctx.stroke();
  }
  // a thread of the lamp down its left side and of the moon down its right,
  // so it never sinks into the dark wall behind it
  const edge = (s, style) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = Math.max(0.7, hk * 0.1);
    ctx.beginPath();
    ctx.moveTo(pa.x + nx * wa * 0.8 * s, pa.y + ny * wa * 0.8 * s);
    ctx.lineTo(pb.x + nx * wb * 0.8 * s, pb.y + ny * wb * 0.8 * s);
    ctx.stroke();
  };
  const leftSide = nx < 0 ? 1 : -1; // which way along the normal is screen-left
  edge(leftSide, "rgba(255,214,170,0.28)");
  edge(-leftSide, "rgba(160,184,235,0.3)");
}

// ── the finish ──────────────────────────────────────────────────────────────

function paintAtmosphere(ctx, cam) {
  const { W, H } = cam;
  const R = Math.hypot(W, H) / 2;
  const v = ctx.createRadialGradient(W / 2, H * 0.55, R * 0.35, W / 2, H * 0.55, R * 1.05);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 0.03);
}

// ── helpers ─────────────────────────────────────────────────────────────────

function ring(cam, x, z, r, y, n = 40) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push(cam.P(x + Math.cos(a) * r, y, z - Math.sin(a) * r));
  }
  return out;
}

function hull(points) {
  const p = points.map((q) => ({ x: q.x, y: q.y })).sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const q of p) {
    while (lower.length >= 2 && cr(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cr(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function poly(ctx, pts) {
  ctx.beginPath();
  pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
  ctx.closePath();
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function grad(ctx, a, b, stops) {
  const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

function css(c, f = 1) {
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${ch(c[0])},${ch(c[1])},${ch(c[2])})`;
}

function cypress(ctx, x, base, h, w, color) {
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, base);
  ctx.bezierCurveTo(x - w * 0.62, base - h * 0.45, x - w * 0.28, base - h * 0.85, x, base - h);
  ctx.bezierCurveTo(x + w * 0.28, base - h * 0.85, x + w * 0.62, base - h * 0.45, x + w * 0.5, base);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
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

function radial(size, rgb, stops) {
  const c = makeCanvas(size, size);
  const g = c.getContext("2d");
  const r = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, a] of stops) r.addColorStop(o, `rgba(${rgb},${a})`);
  g.fillStyle = r;
  g.fillRect(0, 0, size, size);
  return c;
}

// painted on the CPU: drawn once and handed to WebGL as a plain copy
function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  c.getContext("2d", { willReadFrequently: true });
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

function v3(x, y, z) {
  return { x, y, z };
}

function unit(a) {
  const l = Math.hypot(a.x, a.y, a.z) || 1;
  return v3(a.x / l, a.y / l, a.z / l);
}

function smooth01(v) {
  const t = v < 0 ? 0 : v > 1 ? 1 : v;
  return t * t * (3 - 2 * t);
}

function hash2(i, j) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function noise2(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
