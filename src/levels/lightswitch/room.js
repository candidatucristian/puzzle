import { seededRandom } from '../../shared/sketch.js';
import { archGeo, paintSkyOn, paintWindowOn, openingPath } from '../telescope/window.js';

const KEYS = ['lightswitch-room-dark', 'lightswitch-room-lit'];

// Two identical paintings under different illumination. Switching textures by
// opacity preserves the sharp Morse pulses; all expensive work happens on resize.
export function paintRoom(scene, W, H, geo) {
  releaseRoom(scene.textures);
  for (const [index, key] of KEYS.entries()) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(W); canvas.height = Math.ceil(H);
    canvas.getContext('2d', { willReadFrequently: true });
    const ctx = canvas.getContext('2d');
    ctx.scale(W / 1000, H / 800);
    drawRoom(ctx, index === 1, {
      x: geo.door.x / W * 1000, y: geo.door.y / H * 800,
      w: geo.door.w / W * 1000, h: geo.door.h / H * 800,
    }, W, H);
    scene.textures.addCanvas(key, canvas);
  }
  return { dark: KEYS[0], lit: KEYS[1] };
}

export function releaseRoom(textures) {
  for (const key of KEYS) if (textures.exists(key)) textures.remove(key);
}

// The room is drawn in units of 1000 × 800, seen by one camera: the eye 145
// above the floor, looking at the far wall 325 away, every point of the room
// (x across, y up, z away) brought to the picture by P. The far wall, its
// door onto the lit hallway, the window, the table and the chair all share it.
const EYE = 145;
const VPX = 520;
const VPY = 335;
const F = 540;
const P = (x, y, z) => [VPX + (x * F) / z, VPY + ((EYE - y) * F) / z];
const WALL_Z = 325;
const toX = (sx) => ((sx - VPX) * WALL_Z) / F; // a point on the far wall, across
const toY = (sy) => EYE - ((sy - VPY) * WALL_Z) / F; // ... and up

function drawRoom(c, lit, d, W, H) {
  const rnd = seededRandom(718);
  const floor = 576;
  const poly = (points, fill, stroke, width = 0.7) => {
    c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
    c.closePath(); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
  };
  const line = (x, y, xx, yy, color, width = 1) => {
    c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy);
    c.strokeStyle = color; c.lineWidth = width; c.stroke();
  };
  const gradient = (x, y, xx, yy, stops) => {
    const g = c.createLinearGradient(x, y, xx, yy);
    stops.forEach(([p, color]) => g.addColorStop(p, color)); return g;
  };
  const glow = (x, y, rx, ry, color) => {
    c.save(); c.translate(x, y); c.scale(rx, ry);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, color); g.addColorStop(1, 'transparent');
    c.fillStyle = g; c.fillRect(-1, -1, 2, 2); c.restore();
  };

  // Plaster back wall, ceiling and receding side wall.
  c.fillStyle = gradient(0, 0, 900, 620, [[0, lit ? '#393b36' : '#141919'],
    [.5, lit ? '#716c57' : '#20221f'], [1, lit ? '#39392f' : '#121717']]);
  c.fillRect(0, 0, 1000, 800);
  poly([[0, 0], [1000, 0], [902, 77], [0, 77]],
    gradient(0, 0, 0, 90, [[0, '#101516'], [1, lit ? '#49493d' : '#202421']]));
  poly([[902, 77], [1000, 0], [1000, 800], [902, floor]],
    gradient(900, 0, 1000, 0, [[0, lit ? '#494a3e' : '#181f1e'], [1, '#101716']]));
  line(902, 77, 902, floor, '#111816', 2);
  line(0, 77, 902, 77, lit ? '#9a9178' : '#393a30', 2);
  line(0, 82, 902, 82, '#080f0e', 3);
  glow(535, 275, 480, 400, lit ? 'rgba(247,206,132,.32)' : 'rgba(138,132,98,.025)');

  // Fine, repeatable mineral grain, hairline wear and lower wall panels.
  for (let i = 0; i < 23000; i++) {
    const x = rnd() * 1000, y = 85 + rnd() * 490;
    c.fillStyle = rnd() > .5 ? 'rgba(230,222,192,.035)' : 'rgba(0,0,0,.065)';
    c.fillRect(x, y, .5 + rnd() * 1.3, .5 + rnd());
  }
  c.fillStyle = gradient(0, 407, 0, floor, [[0, lit ? '#393b31' : '#181e1c'], [1, '#141b18']]);
  c.fillRect(0, 414, 902, floor - 414);
  for (let x = -10; x < 900; x += 98) {
    c.strokeStyle = lit ? '#65614d' : '#2b3028'; c.lineWidth = 1;
    c.strokeRect(x + 9, 433, 78, 120);
    c.strokeStyle = '#101612'; c.strokeRect(x + 11, 435, 75, 117);
  }
  c.fillStyle = gradient(0, 405, 0, 417, [[0, '#141a16'], [.35, lit ? '#8a8064' : '#3b3e30'], [1, '#20281e']]);
  c.fillRect(0, 405, 902, 12);

  // Perspective floorboards, with grain confined to each plank.
  const projectFloor = (x, z) => [520 + (x - 520) * z, 335 + (floor - 335) * z];
  c.fillStyle = '#191a15'; c.fillRect(0, floor, 1000, 800 - floor);
  for (let row = 0; row < 8; row++) {
    const z0 = 1 + row * .16, z1 = z0 + .16;
    for (let col = -8; col < 16; col++) {
      const x = col * 90 + (row % 2) * 45;
      const pts = [projectFloor(x, z0), projectFloor(x + 90, z0), projectFloor(x + 90, z1), projectFloor(x, z1)];
      const v = Math.floor(rnd() * 12);
      poly(pts, lit ? `rgb(${55 + v},${46 + v},${32 + v})` : `rgb(${24 + v},${25 + v},${21 + v})`, '#0c100c');
      c.save(); c.clip();
      for (let j = 0; j < 6; j++) {
        const a = projectFloor(x + rnd() * 90, z0), b = projectFloor(x + rnd() * 90, z1);
        line(...a, ...b, 'rgba(167,142,93,.08)', .6);
      }
      c.restore();
    }
  }
  c.fillStyle = gradient(0, 558, 0, 581, [[0, '#101712'], [.22, lit ? '#81755a' : '#41422f'], [.4, '#303426'], [1, '#090e0b']]);
  c.fillRect(0, 558, 902, 23);
  poly([[902, 558], [1000, 766], [1000, 800], [902, 581]], '#182017');

  paintHallway(c, d, floor, { poly, line, gradient, glow });

  // The hallway's light lying out across the floor, soft at its edges.
  c.save();
  c.filter = 'blur(6px)';
  poly([[d.x + 3, floor], [d.x + d.w - 3, floor], [d.x + d.w * 2.8, 800], [d.x - d.w * .6, 800]], '#0000');
  c.clip();
  c.fillStyle = gradient(0, floor, 0, 800, [[0, 'rgba(238,204,129,.32)'], [1, 'rgba(208,164,90,.03)']]);
  c.fillRect(0, floor, 1000, 224);
  c.restore();
  c.filter = 'none';
  // Layered timber casing and a recessed threshold.
  for (let i = 9; i >= 0; i--) {
    c.strokeStyle = i > 6 ? '#111a14' : i > 3 ? (lit ? '#74664b' : '#4e4d38') : '#272c20';
    c.lineWidth = 2; c.strokeRect(d.x - i, d.y - i, d.w + i * 2, d.h + i);
  }
  line(d.x, floor, d.x + d.w, floor, '#b0a07a', 2);

  // The window, where the portrait used to hang: the Telescope room's own
  // arched window with its curtains and moonlit valley, painted in pixels.
  const win = paintMoonWindow(c, W, H, lit);
  // its moonlight, laid on the floor below and before it
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.filter = 'blur(10px)';
  const wx0 = win.x0, wx1 = win.x1;
  poly([[wx0 + 10, floor + 4], [wx1 - 10, floor + 4], [wx1 - 160, 700], [wx0 - 230, 700]], 'rgba(120,150,210,.07)');
  c.restore();
  c.filter = 'none';

  paintFurniture(c, lit, { poly, line, gradient, glow }, rnd);

  // Broad falloff and contact darkness replace hard, stacked light rings.
  if (!lit) {
    c.fillStyle = 'rgba(2,6,7,.23)'; c.fillRect(0, 0, 1000, 800);
  } else glow(540, 340, 360, 350, 'rgba(245,209,144,.055)');
  const vignette = c.createRadialGradient(490, 370, 160, 490, 370, 670);
  vignette.addColorStop(0, 'transparent'); vignette.addColorStop(1, 'rgba(0,5,7,.8)');
  c.fillStyle = vignette; c.fillRect(0, 0, 1000, 800);
}

// The hallway beyond the open door, seen by the room's own eye: its left wall
// (wainscot, wallpaper, two framed pictures), the ceiling with two warm
// lamps, a runner down the boards, and at the far end a tall window on the
// night. The door frame hides the rest. The hallway light is always on.
function paintHallway(c, d, floor, { poly, line, gradient, glow }) {
  const xl = toX(d.x) - 22; // its left wall, just outside the door's jamb
  const xr = toX(d.x + d.w) + 70;
  const yc = toY(d.y) + 26; // its ceiling, a little above the door head
  const zA = WALL_Z;
  const zB = WALL_Z + 640; // its far end
  const xm = (xl + xr) / 2;
  c.save();
  c.beginPath(); c.rect(d.x, d.y, d.w, floor - d.y); c.clip();
  // the far end wall, warm and dim
  const e0 = P(xl, yc, zB), e1 = P(xr, 0, zB);
  c.fillStyle = gradient(0, e0[1], 0, e1[1], [[0, '#8d7a58'], [1, '#6a5a40']]);
  c.fillRect(e0[0], e0[1], e1[0] - e0[0], e1[1] - e0[1]);
  // a tall window there, the night in it
  const wa = P(xm - 26, 175, zB), wb = P(xm + 26, 70, zB);
  c.fillStyle = gradient(0, wa[1], 0, wb[1], [[0, '#0a1430'], [1, '#22385e']]);
  c.fillRect(wa[0], wa[1], wb[0] - wa[0], wb[1] - wa[1]);
  for (let i = 0; i < 6; i++) {
    c.fillStyle = 'rgba(220,230,255,.7)';
    c.fillRect(wa[0] + (wb[0] - wa[0]) * ((i * 37) % 100) / 100, wa[1] + (wb[1] - wa[1]) * ((i * 53) % 60) / 100, .9, .9);
  }
  c.strokeStyle = '#4a3a24'; c.lineWidth = 2.2;
  c.strokeRect(wa[0], wa[1], wb[0] - wa[0], wb[1] - wa[1]);
  line((wa[0] + wb[0]) / 2, wa[1], (wa[0] + wb[0]) / 2, wb[1], '#4a3a24', 1.4);
  line(wa[0], (wa[1] + wb[1]) / 2, wb[0], (wa[1] + wb[1]) / 2, '#4a3a24', 1.4);
  // a skirting along the end wall
  const s0 = P(xl, 10, zB); c.fillStyle = '#4a3624'; c.fillRect(s0[0], s0[1], e1[0] - s0[0], e1[1] - s0[1]);

  // the ceiling
  poly([P(xl, yc, zA), P(xr, yc, zA), P(xr, yc, zB), P(xl, yc, zB)],
    gradient(0, P(0, yc, zA)[1], 0, P(0, yc, zB)[1], [[0, '#9a8866'], [1, '#c8b48a']]));
  // the floor: boards running away, a runner down the middle
  poly([P(xl, 0, zA), P(xr, 0, zA), P(xr, 0, zB), P(xl, 0, zB)],
    gradient(0, P(0, 0, zA)[1], 0, P(0, 0, zB)[1], [[0, '#8a6038'], [1, '#6a4a2c']]));
  for (let x = xl + 14; x < xr; x += 14) line(...P(x, 0, zA), ...P(x, 0, zB), 'rgba(40,24,10,.45)', .7);
  for (let z = zA + 40; z < zB; z += 60) {
    const o = (Math.floor(z / 60) % 2) * 7;
    for (let x = xl + 14 + o; x < xr; x += 28) line(...P(x, 0, z), ...P(x + 14, 0, z), 'rgba(40,24,10,.4)', .6);
  }
  poly([P(xm - 24, .2, zA), P(xm + 24, .2, zA), P(xm + 24, .2, zB - 30), P(xm - 24, .2, zB - 30)], '#7a2a22');
  poly([P(xm - 19, .3, zA), P(xm + 19, .3, zA), P(xm + 19, .3, zB - 36), P(xm - 19, .3, zB - 36)], '#8e3a2c');
  for (const x of [xm - 21, xm + 21]) line(...P(x, .4, zA), ...P(x, .4, zB - 33), 'rgba(222,178,96,.7)', .9);
  // the left wall: wallpaper above, wainscot below, a picture rail
  const wy = 92; // the dado
  poly([P(xl, wy, zA), P(xl, wy, zB), P(xl, yc, zB), P(xl, yc, zA)],
    gradient(P(xl, 0, zA)[0], 0, P(xl, 0, zB)[0], 0, [[0, '#9a7e52'], [.45, '#b49668'], [1, '#7e6644']]));
  for (let z = zA + 16; z < zB; z += 32) line(...P(xl, wy + 2, z), ...P(xl, yc - 2, z), 'rgba(90,60,30,.06)', 1.2);
  poly([P(xl, 0, zA), P(xl, 0, zB), P(xl, wy, zB), P(xl, wy, zA)],
    gradient(P(xl, 0, zA)[0], 0, P(xl, 0, zB)[0], 0, [[0, '#4e3420'], [1, '#6a4a2c']]));
  for (let z = zA + 20; z < zB - 40; z += 70) {
    poly([P(xl, 18, z), P(xl, 18, z + 52), P(xl, 76, z + 52), P(xl, 76, z)], 'rgba(30,18,8,.25)', 'rgba(220,180,120,.25)', .8);
  }
  line(...P(xl, wy, zA), ...P(xl, wy, zB), '#e0c890', 1.6);
  line(...P(xl, 12, zA), ...P(xl, 12, zB), '#2a1a0e', 2.4);
  // two framed pictures along it, warm landscapes in gilt
  for (const [z0, z1] of [[430, 500], [640, 700]]) {
    poly([P(xl, 118, z0), P(xl, 118, z1), P(xl, 168, z1), P(xl, 168, z0)], '#b88a3a', '#5a3a12', 1);
    poly([P(xl, 124, z0 + 6), P(xl, 124, z1 - 6), P(xl, 162, z1 - 6), P(xl, 162, z0 + 6)],
      gradient(0, P(xl, 162, z0)[1], 0, P(xl, 124, z0)[1], [[0, '#c89a5a'], [.55, '#8a6a3a'], [1, '#4a5a3a']]));
  }
  // the lamps: brass sconces on the left wall between the pictures, their
  // warm light thrown up and down the wallpaper and onto the boards
  for (const z of [380, 575, 800]) {
    const k = WALL_Z / z;
    const lp = P(xl + 6, 150, z);
    glow(lp[0], lp[1] - 4, 26 * k, 70 * k, 'rgba(255,224,160,.5)');
    glow(lp[0], lp[1], 60 * k, 46 * k, 'rgba(255,214,140,.22)');
    const fl = P(xl + 30, 0, z + 10);
    glow(fl[0], fl[1], 44 * k, 10 * k, 'rgba(255,214,140,.28)');
    const plate = P(xl, 140, z), arm = P(xl + 8, 146, z);
    c.fillStyle = '#7a5a24';
    c.beginPath(); c.ellipse(plate[0], plate[1], 2.2 * k, 5 * k, 0, 0, Math.PI * 2); c.fill();
    line(...plate, ...arm, '#8a6a2a', 1.6 * k);
    const sh0 = P(xl + 4, 146, z - 4), sh1 = P(xl + 12, 146, z + 4), sh2 = P(xl + 10, 160, z + 3), sh3 = P(xl + 6, 160, z - 3);
    poly([sh0, sh1, sh2, sh3], '#fff0c8');
    c.fillStyle = 'rgba(255,250,230,.9)';
    c.beginPath(); c.ellipse((sh0[0] + sh1[0]) / 2, (sh0[1] + sh1[1]) / 2, 4 * k, 1.4 * k, 0, 0, Math.PI * 2); c.fill();
  }
  // the near end of the hall is in the door's own shadow
  c.fillStyle = gradient(d.x, 0, d.x + d.w, 0, [[0, 'rgba(0,0,0,.22)'], [.25, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.18)']]);
  c.fillRect(d.x, d.y, d.w, floor - d.y);
  c.restore();
}

// The arched window from the Telescope's room, hung on this wall in pixels;
// returns where it stands, in room units.
function paintMoonWindow(c, W, H, lit) {
  const kx = W / 1000;
  const ky = H / 800;
  const archCX = 712 * kx;
  const archRX = 80 * kx;
  const archRY = Math.min(archRX * 0.6, 78 * ky);
  const top = 150 * ky;
  const archCY = top + archRY;
  const sillY = 382 * ky;
  const S = archRX * 1.25;
  const geo = archGeo({
    W, H, S, V: S, Wv: archRX / 0.455,
    archCX, archCY, archRX, archRY, sillY,
    eye: { x: VPX * kx, y: VPY * ky },
    moon: { x: archCX + archRX * 0.3, y: top + (sillY - top) * 0.22, r: archRX * 0.1 },
    horizonY: top + (sillY - top) * 0.88,
    K: 0.95,
  });
  // painted on its own, so the dark room can dim its frame and curtains
  // without touching the wall round it or the night in it
  const off = document.createElement('canvas');
  off.width = Math.ceil(W); off.height = Math.ceil(H);
  const o = off.getContext('2d', { willReadFrequently: true });
  o.save();
  openingPath(o, geo);
  o.clip();
  paintSkyOn(o, geo);
  const m = geo.moon;
  const halo = o.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 3.2);
  halo.addColorStop(0, 'rgba(190,205,245,.35)'); halo.addColorStop(1, 'rgba(190,205,245,0)');
  o.fillStyle = halo; o.fillRect(m.x - m.r * 4, m.y - m.r * 4, m.r * 8, m.r * 8);
  const body = o.createRadialGradient(m.x - m.r * .3, m.y - m.r * .3, m.r * .1, m.x, m.y, m.r);
  body.addColorStop(0, '#f6f2e6'); body.addColorStop(.75, '#ded8c6'); body.addColorStop(1, '#b4ad9a');
  o.fillStyle = body; o.beginPath(); o.arc(m.x, m.y, m.r, 0, Math.PI * 2); o.fill();
  o.restore();
  paintWindowOn(o, geo);
  o.save();
  openingPath(o, geo);
  o.rect(0, 0, W, H);
  o.clip('evenodd');
  o.globalCompositeOperation = 'source-atop';
  o.fillStyle = lit ? 'rgba(40,30,10,.12)' : 'rgba(4,8,10,.5)';
  o.fillRect(0, 0, W, H);
  o.restore();
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(off, 0, 0);
  c.restore();
  return { x0: (archCX - archRX) / kx, x1: (archCX + archRX) / kx, sill: sillY / ky };
}

// The table and the chair, solid in the room's camera: every block shows the
// faces the eye can see — the top of what is below the eye, the side that
// faces the middle of the room — lit warm from the hall on the left and cool
// from the window on the right.
function paintFurniture(c, lit, { poly, line, gradient, glow }, rnd) {
  const k = lit ? 1 : 0.5;
  const wood = (r, g, b) => (m) => `rgb(${Math.round(r * k * m)},${Math.round(g * k * m)},${Math.round(b * k * m)})`;
  const oak = wood(120, 84, 52);
  const dark = wood(92, 62, 38);
  const cloth = wood(96, 52, 44);
  const brass = wood(200, 160, 80);
  // a solid block: corner (x, y, z), size (w, h, dep), in a material
  const box = (x, y, z, w, h, dep, mat, edge = true) => {
    const a = P(x, y, z), b = P(x + w, y, z), cc = P(x + w, y + h, z), dd = P(x, y + h, z);
    const a2 = P(x, y, z + dep), b2 = P(x + w, y, z + dep), c2 = P(x + w, y + h, z + dep), d2 = P(x, y + h, z + dep);
    if (x > 0) poly([a, a2, d2, dd], mat(0.62)); // its left side
    if (x + w < 0) poly([b, b2, c2, cc], mat(0.62)); // its right side
    if (y + h < EYE) poly([dd, cc, c2, d2], mat(1.32)); // its top
    poly([a, b, cc, dd], gradient(a[0], 0, b[0], 0, [[0, mat(1.08)], [1, mat(0.86)]]));
    if (edge) line(...dd, ...cc, lit ? 'rgba(255,220,170,.35)' : 'rgba(200,190,160,.18)', .7);
  };
  // turned legs: a block that thins to a little foot
  const leg = (x, z, h, t, mat) => {
    box(x, 10, z, t, h - 10, t, mat, false);
    box(x + t * .15, 0, z + t * .15, t * .7, 10, t * .7, mat, false);
    box(x - .4, h - 16, z - .4, t + .8, 2.2, t + .8, mat, false);
  };

  // their shadows on the floor
  glow(...P(41, 0, 292), 150, 30, 'rgba(0,0,0,.7)');
  glow(...P(162, 0, 290), 62, 18, 'rgba(0,0,0,.65)');

  // the table: a writing table, far legs first, its apron and drawer, the
  // near legs, then its top with a moulded edge
  const TX = -30, TW = 142, TZ = 262, TD = 58, TH = 78;
  for (const x of [TX + 4, TX + TW - 10]) leg(x, TZ + TD - 10, TH - 4, 6, oak);
  box(TX + 3, TH - 18, TZ + 3, TW - 6, 14, TD - 6, dark);
  box(TX + 26, TH - 16, TZ + 2.4, TW - 52, 10, 1, oak);
  const knob = P(TX + TW / 2, TH - 11, TZ + 2);
  glow(...knob, 5, 4, 'rgba(0,0,0,.8)');
  c.fillStyle = lit ? '#d8b878' : '#8a7a50';
  c.beginPath(); c.ellipse(...knob, 2.6, 1.8, 0, 0, Math.PI * 2); c.fill();
  for (const x of [TX + 4, TX + TW - 10]) leg(x, TZ + 4, TH - 4, 6, oak);
  box(TX, TH - 4, TZ, TW, 4, TD, oak);
  // the grain along the top, and its lit front edge
  for (let i = 0; i < 14; i++) {
    const z = TZ + 3 + rnd() * (TD - 6);
    line(...P(TX + 2, TH, z), ...P(TX + TW - 2, TH, z), 'rgba(40,24,10,.18)', .5);
  }
  line(...P(TX, TH - 4, TZ), ...P(TX + TW, TH - 4, TZ), 'rgba(0,0,0,.5)', 1);

  // on it: a closed book, a folded paper, the framed photograph
  box(TX + 16, TH, TZ + 18, 27, 3.5, 21, wood(70, 72, 50));
  box(TX + 17, TH + 0.6, TZ + 18.6, 25, 2.2, 19.6, wood(200, 190, 160), false);
  box(TX + 16, TH + 3.5, TZ + 17, 27, .8, 22, wood(70, 72, 50));
  poly([P(TX + 66, TH + .2, TZ + 14), P(TX + 92, TH + .2, TZ + 16), P(TX + 90, TH + .2, TZ + 38), P(TX + 64, TH + .2, TZ + 36)],
    lit ? '#c8bb98' : '#5a5848');
  line(...P(TX + 78, TH + .3, TZ + 15), ...P(TX + 77, TH + .3, TZ + 37), 'rgba(80,70,50,.5)', .6);
  // a brass candlestick, its candle burnt half down, unlit
  const cx0 = TX + 112, cz0 = TZ + 30;
  glow(...P(cx0 + 6, TH, cz0 + 4), 12, 3, 'rgba(0,0,0,.6)');
  box(cx0, TH, cz0, 12, 1.6, 12, brass, false);
  box(cx0 + 4.5, TH + 1.6, cz0 + 4.5, 3, 14, 3, brass, false);
  box(cx0 + 2.5, TH + 15.6, cz0 + 2.5, 7, 1.4, 7, brass, false);
  box(cx0 + 3.7, TH + 17, cz0 + 3.7, 4.6, 12, 4.6, wood(225, 215, 190), false);
  line(...P(cx0 + 6, TH + 29, cz0 + 6), ...P(cx0 + 6, TH + 31, cz0 + 6), '#1a1208', 1);

  // the chair beside it, facing us: the back's posts and slats behind, its
  // seat and cushion, then the front legs
  const CX = 146, CW = 40, CZ = 268, CD = 38, SEAT = 44;
  for (const x of [CX, CX + CW - 4]) box(x, 0, CZ + CD - 4, 4, 98, 4, oak);
  for (const y of [86, 72, 58]) box(CX + 4, y, CZ + CD - 3.4, CW - 8, y === 86 ? 9 : 5, 2.6, dark);
  box(CX + 4, 10, CZ + CD - 3.6, CW - 8, 2.4, 2.4, dark, false);
  box(CX, SEAT - 4, CZ, CW, 4, CD, oak);
  box(CX + 2, SEAT, CZ + 2, CW - 4, 3.2, CD - 8, cloth);
  for (const x of [CX, CX + CW - 4]) leg(x, CZ, SEAT - 4, 4, oak);
  box(CX + 4, 12, CZ + 1, CW - 8, 2.2, 2.2, dark, false);

  // the window's cool light on the table top and the chair's seat
  glow(...P(TX + TW * .75, TH, TZ + 30), 70, 12, lit ? 'rgba(160,190,240,.06)' : 'rgba(140,170,230,.1)');
  glow(...P(CX + CW / 2, SEAT + 3, CZ + 16), 26, 7, lit ? 'rgba(160,190,240,.05)' : 'rgba(140,170,230,.1)');
}
