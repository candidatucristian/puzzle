/** The parlour for CHESSBOARD, painted like a storybook still life in dark
 *  wood: a walnut table standing in a dark room, and on it a chessboard of
 *  maple and walnut in a mahogany frame, a line of brass round its field and
 *  the coordinates cut into the frame. Light falls across the table from a
 *  window off to the left through sheer curtains: a shaft of warm gold
 *  carrying the soft stripes of the curtain's folds and the shadow of the
 *  window's cross. A few captured pieces lie on their sides by the board.
 *
 *  Seen from in front of the table and above it, in true perspective. The
 *  pieces are solids — turned boxwood and ebony, the knight carved, the
 *  rook's parapet cut, the queen's crown pointed and pearled — ray-marched
 *  from the same height the board is seen from, so their heads and feet sit
 *  on the board as they would; each casts its own shadow, worked out from
 *  its shape. The room is painted once per screen size (`room`); the pieces
 *  are painted once and kept. */

const ROOM = "ch_room";
const MOTE = "ch_mote";
const FILES = "abcdefgh";
const UNIT = 0.082; // a shape unit, in cm
const SQ = 5.5; // a square, in cm
const HALF = 22; // the field's half-width
const OB = 25.6; // the board's outer half-width (frame included)
const BH = 2.2; // the board's top, above the table
const TABLE = { x: 62, near: 36, far: 50, r: 5, edge: 3.5, legs: 76 }; // cm, round the board
const RES = 1.6; // piece textures: pixels per shape unit
const RES_S = 1; // ...their shadows
const PHI = (38 * Math.PI) / 180; // how steeply the pieces are seen, from above
const SP = Math.sin(PHI);
const CP = Math.cos(PHI);

// Hand-drawn piece silhouettes, in a 100-unit box: base at y = 0, up is -y.
// polys and circles are the turned body; lines are cut details.
export const SHAPES = {
  P: {
    polys: [
      [
        [-28, 0],
        [28, 0],
        [28, -6],
        [22, -10],
        [-22, -10],
        [-28, -6],
      ],
      [
        [-19, -10],
        [19, -10],
        [12, -22],
        [9, -41],
        [14, -44],
        [14, -48],
        [-14, -48],
        [-14, -44],
        [-9, -41],
        [-12, -22],
      ],
    ],
    circles: [[0, -61, 14]],
    lines: [],
  },
  R: {
    polys: [
      [
        [-32, 0],
        [32, 0],
        [32, -7],
        [26, -11],
        [-26, -11],
        [-32, -7],
      ],
      [
        [-22, -11],
        [22, -11],
        [17, -24],
        [15, -58],
        [21, -62],
        [21, -65],
        [-21, -65],
        [-21, -62],
        [-15, -58],
        [-17, -24],
      ],
      [
        [-21, -65],
        [21, -65],
        [21, -84],
        [13, -84],
        [13, -76],
        [4, -76],
        [4, -84],
        [-4, -84],
        [-4, -76],
        [-13, -76],
        [-13, -84],
        [-21, -84],
      ],
    ],
    circles: [],
    lines: [
      [
        [-15, -58],
        [15, -58],
      ],
      [
        [-16, -34],
        [16, -34],
      ],
    ],
  },
  N: {
    polys: [
      [
        [-30, 0],
        [30, 0],
        [30, -7],
        [24, -11],
        [-24, -11],
        [-30, -7],
      ],
      [
        [22, -11],
        [21, -30],
        [20, -48],
        [17, -62],
        [11, -75],
        [4, -85],
        [1, -94],
        [-4, -86],
        [-10, -81],
        [-19, -72],
        [-28, -61],
        [-32, -52],
        [-27, -46],
        [-17, -49],
        [-9, -45],
        [-13, -33],
        [-19, -21],
        [-22, -11],
      ],
    ],
    circles: [],
    dots: [
      [-9, -71, 2.6],
      [-26, -55, 1.6],
    ],
    lines: [
      [
        [4, -85],
        [12, -71],
        [17, -55],
        [19, -40],
      ],
      [
        [-31, -50],
        [-24, -49],
      ],
    ],
  },
  B: {
    polys: [
      [
        [-28, 0],
        [28, 0],
        [28, -6],
        [22, -10],
        [-22, -10],
        [-28, -6],
      ],
      [
        [-19, -10],
        [19, -10],
        [11, -24],
        [8, -44],
        [15, -47],
        [15, -51],
        [-15, -51],
        [-15, -47],
        [-8, -44],
        [-11, -24],
      ],
      [
        [-12, -51],
        [12, -51],
        [16, -62],
        [13, -73],
        [6, -82],
        [0, -86],
        [-6, -82],
        [-13, -73],
        [-16, -62],
      ],
    ],
    circles: [[0, -91, 5]],
    lines: [
      [
        [7, -76],
        [-3, -63],
      ],
    ],
  },
  Q: {
    polys: [
      [
        [-34, 0],
        [34, 0],
        [34, -7],
        [28, -11],
        [-28, -11],
        [-34, -7],
      ],
      [
        [-24, -11],
        [24, -11],
        [14, -26],
        [10, -50],
        [16, -54],
        [16, -58],
        [-16, -58],
        [-16, -54],
        [-10, -50],
        [-14, -26],
      ],
      [
        [-16, -58],
        [16, -58],
        [26, -84],
        [17, -71],
        [13, -89],
        [6, -72],
        [0, -92],
        [-6, -72],
        [-13, -89],
        [-17, -71],
        [-26, -84],
      ],
    ],
    circles: [
      [-26, -87, 4],
      [-13, -92, 4],
      [0, -96, 4],
      [13, -92, 4],
      [26, -87, 4],
    ],
    lines: [],
  },
  K: {
    polys: [
      [
        [-34, 0],
        [34, 0],
        [34, -7],
        [28, -11],
        [-28, -11],
        [-34, -7],
      ],
      [
        [-24, -11],
        [24, -11],
        [15, -26],
        [11, -50],
        [17, -54],
        [17, -58],
        [-17, -58],
        [-17, -54],
        [-11, -50],
        [-15, -26],
      ],
      [
        [-17, -58],
        [17, -58],
        [23, -68],
        [20, -78],
        [10, -83],
        [-10, -83],
        [-20, -78],
        [-23, -68],
      ],
      [
        [-3, -83],
        [3, -83],
        [3, -89],
        [9, -89],
        [9, -95],
        [3, -95],
        [3, -102],
        [-3, -102],
        [-3, -95],
        [-9, -95],
        [-9, -89],
        [-3, -89],
      ],
    ],
    circles: [],
    lines: [
      [
        [-18, -70],
        [18, -70],
      ],
    ],
  },
};

// ── the camera: in front of the table and well above it ─────────────────────

function camera(W, H) {
  const S = Math.min(W, H);
  // on a short canvas (a phone held sideways) the eye comes closer, so the
  // board and its coordinates fill the height instead of half of it
  const F = 3.2 * S * (H < 400 ? 1.6 : 1);
  const hc = 204; // the eye, in cm above the table
  const zc = 258; // the board's centre, in cm in front of it
  const hy = H * 0.5 - (F * (hc - BH)) / zc; // puts the board's centre half way down
  const cx = W / 2;
  return {
    W,
    H,
    S,
    F,
    hc,
    zc,
    hy,
    cx,
    P: (x, y, z) => ({ x: cx + (F * x) / z, y: hy + (F * (hc - y)) / z }),
    k: (z) => F / z,
  };
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintParlour(scene, W, H, pieces) {
  const cam = camera(W, H);
  const t = scene.textures;
  const room = makeCanvas(W, H);
  const ctx = room.getContext("2d");
  paintFloor(ctx, cam, lcg(99));
  const top = paintTable(ctx, cam, lcg(311));
  paintBoard(ctx, cam, lcg(777));
  paintFallen(ctx, cam);
  const band = paintWindowLight(ctx, cam, top);
  paintCurtain(ctx, cam, lcg(515));
  finish(ctx, cam);
  add(t, ROOM, room);
  if (!t.exists(MOTE))
    t.addCanvas(
      MOTE,
      radial(16, "255,236,196", [
        [0, 0.9],
        [0.35, 0.35],
        [1, 0],
      ]),
    );

  const placed = pieces.map((def) => {
    const f = FILES.indexOf(def.sq[0]);
    const rank = parseInt(def.sq[1], 10);
    const x = -HALF + (f + 0.5) * SQ;
    const z = cam.zc - HALF + (rank - 0.5) * SQ;
    const p = cam.P(x, BH, z);
    const k = cam.k(z);
    const u = k * UNIT; // screen pixels per shape unit, here
    const art = pieceArt(t, def.kind, def.white);
    const sh = shadowArt(t, def.kind);
    return {
      ...def,
      rank,
      x: p.x,
      y: p.y,
      key: art.key,
      originX: art.ox,
      originY: art.oy,
      scale: u / RES,
      shadowKey: sh.key,
      shadowOrigin: { x: sh.ox, y: sh.oy },
      shadowScale: u / RES_S,
      sq: k * SQ,
      height: art.height * u,
      lift: k * 1.3,
    };
  });
  return { room: ROOM, mote: MOTE, pieces: placed, band };
}

/** Frees the room (after its image is destroyed). */
export function releaseParlourArt(textures) {
  if (textures.exists(ROOM)) textures.remove(ROOM);
}

/** Frees the pieces too — they are kept across resizes, so on shutdown. */
export function releasePieceArt(textures) {
  for (const key of textures.getTextureKeys ? textures.getTextureKeys() : []) {
    if (key.startsWith("ch_")) textures.remove(key);
  }
  if (textures.exists(MOTE)) textures.remove(MOTE);
}

// the room beyond the table: a dark floor, a rug just showing in the gloom
function paintFloor(ctx, cam, rnd) {
  const { W, H, hc, zc } = cam;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#150e0a");
  g.addColorStop(1, "#0b0706");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // the window's light, far off on the floor to the left
  const p = cam.P(-120, -TABLE.legs, zc + 260);
  soft(ctx, p.x, p.y, W * 0.35, H * 0.12, "120,80,50", 0.18, "source-over");
  void rnd;
  void hc;
}

// the table: a walnut top with a rounded edge and a line of maple let in
// round it, its front edge and apron, the dark under it
function paintTable(ctx, cam, rnd) {
  const { W, H, S, zc } = cam;
  const zN = zc - TABLE.near;
  const zF = zc + TABLE.far;
  const outline = (inset, y) =>
    roundRectZ(TABLE.x - inset, zN + inset, zF - inset, TABLE.r).map(([x, z]) =>
      cam.P(x, y, z),
    );
  const top = outline(0, 0);
  // under the table: its apron, then the dark
  const nearY = cam.P(0, 0, zN).y;
  const un = ctx.createLinearGradient(0, nearY, 0, H);
  un.addColorStop(0, "#0c0705");
  un.addColorStop(1, "#050303");
  ctx.fillStyle = un;
  ctx.fillRect(0, nearY, W, H - nearY);
  const ap = [
    cam.P(-TABLE.x + 4, -TABLE.edge, zN + 2),
    cam.P(TABLE.x - 4, -TABLE.edge, zN + 2),
    cam.P(TABLE.x - 4, -13, zN + 2),
    cam.P(-TABLE.x + 4, -13, zN + 2),
  ];
  poly(ctx, ap);
  const ag = ctx.createLinearGradient(0, ap[0].y, 0, ap[2].y);
  ag.addColorStop(0, "#2a150c");
  ag.addColorStop(1, "#140a06");
  ctx.fillStyle = ag;
  ctx.fill();
  // the room's gloom right round the table
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = S * 0.05;
  poly(ctx, top);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();
  // its front edge, rounded over
  const fe = [
    cam.P(-TABLE.x + TABLE.r, 0, zN),
    cam.P(TABLE.x - TABLE.r, 0, zN),
    cam.P(TABLE.x - TABLE.r, -TABLE.edge, zN),
    cam.P(-TABLE.x + TABLE.r, -TABLE.edge, zN),
  ];
  poly(ctx, fe);
  const eg = ctx.createLinearGradient(0, fe[0].y, 0, fe[2].y);
  eg.addColorStop(0, "#6a3a22");
  eg.addColorStop(0.35, "#3e2012");
  eg.addColorStop(1, "#1e0f08");
  ctx.fillStyle = eg;
  ctx.fill();
  // the top: walnut, its grain running the length of it
  const far = cam.P(0, 0, zF).y;
  const tg = ctx.createLinearGradient(0, far, 0, nearY);
  tg.addColorStop(0, "#3b2216");
  tg.addColorStop(1, "#56321f");
  poly(ctx, top);
  ctx.fillStyle = tg;
  ctx.fill();
  ctx.save();
  poly(ctx, top);
  ctx.clip();
  for (let i = 0; i < 140; i++) {
    const z = zN + rnd() * (zF - zN);
    const ph = rnd() * 6.28;
    const fr = 0.04 + rnd() * 0.05;
    const amp = 0.2 + rnd() * 0.5;
    ctx.beginPath();
    for (let x = -TABLE.x; x <= TABLE.x; x += 3) {
      const p = cam.P(x, 0, z + Math.sin(x * fr + ph) * amp);
      if (x === -TABLE.x) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle =
      rnd() < 0.75
        ? `rgba(20,8,4,${(0.12 + rnd() * 0.16).toFixed(3)})`
        : `rgba(255,196,150,${(0.03 + rnd() * 0.04).toFixed(3)})`;
    ctx.lineWidth = 0.7 + rnd() * 0.9;
    ctx.stroke();
  }
  // the polish holds the window
  const rp = cam.P(-30, 0, zc + 30);
  soft(
    ctx,
    rp.x,
    rp.y,
    cam.k(zc) * 40,
    cam.k(zc) * 9,
    "255,226,180",
    0.1,
    "lighter",
  );
  ctx.restore();
  // a line of maple let in round the top, and the edge catching the light
  poly(ctx, outline(4, 0));
  ctx.strokeStyle = "rgba(214,170,110,0.55)";
  ctx.lineWidth = Math.max(1, cam.k(zc) * 0.25);
  ctx.stroke();
  poly(ctx, top);
  ctx.strokeStyle = "rgba(255,200,150,0.35)";
  ctx.lineWidth = Math.max(1, S * 0.0025);
  ctx.stroke();
  return top;
}

// the board: its thickness, the mahogany frame, the brass line, the squares
// of maple and walnut, and the coordinates cut into the frame
function paintBoard(ctx, cam, rnd) {
  const { S, zc } = cam;
  const quad = (x0, z0, x1, z1, y = BH) => [
    cam.P(x0, y, zc + z0),
    cam.P(x1, y, zc + z0),
    cam.P(x1, y, zc + z1),
    cam.P(x0, y, zc + z1),
  ];
  const outer = quad(-OB, -OB, OB, OB);
  // its shadow on the table, thrown away from the window
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.75)";
  ctx.shadowBlur = S * 0.03;
  ctx.shadowOffsetX = S * 0.016;
  ctx.shadowOffsetY = S * 0.01;
  poly(ctx, quad(-OB, -OB, OB, OB, 0));
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();
  // the front edge: the board's thickness
  const fa = cam.P(-OB, BH, zc - OB);
  const fb = cam.P(OB, BH, zc - OB);
  const fc = cam.P(OB, 0, zc - OB);
  const fd = cam.P(-OB, 0, zc - OB);
  const fg = ctx.createLinearGradient(0, fa.y, 0, fd.y);
  fg.addColorStop(0, "#4a2215");
  fg.addColorStop(1, "#200e08");
  poly(ctx, [fa, fb, fc, fd]);
  ctx.fillStyle = fg;
  ctx.fill();
  for (let i = 0; i < 10; i++) {
    const y = fa.y + (fd.y - fa.y) * (0.15 + rnd() * 0.7);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(fa.x, y, fb.x - fa.x, 1);
  }
  // the frame's top: mahogany, grain along each bar
  const far = cam.P(0, BH, zc + OB).y;
  const near = cam.P(0, BH, zc - OB).y;
  const top = ctx.createLinearGradient(0, far, 0, near);
  top.addColorStop(0, "#5e2b1a");
  top.addColorStop(1, "#743822");
  poly(ctx, outer);
  ctx.fillStyle = top;
  ctx.fill();
  ctx.save();
  poly(ctx, outer);
  ctx.clip();
  for (let i = 0; i < 90; i++) {
    const along = rnd() < 0.5;
    const off = -OB + rnd() * OB * 2;
    const a = along ? cam.P(-OB, BH, zc + off) : cam.P(off, BH, zc - OB);
    const b = along ? cam.P(OB, BH, zc + off) : cam.P(off, BH, zc + OB);
    ctx.strokeStyle =
      rnd() < 0.7 ? "rgba(30,10,4,0.2)" : "rgba(255,190,150,0.07)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.lineWidth = Math.max(1, S * 0.0025);
  ctx.strokeStyle = "rgba(255,200,150,0.35)";
  line(ctx, outer[3], outer[2]);
  line(ctx, outer[0], outer[3]);
  ctx.strokeStyle = "rgba(255,190,140,0.5)";
  line(ctx, outer[0], outer[1]);
  // the brass line round the field
  poly(ctx, quad(-HALF - 0.55, -HALF - 0.55, HALF + 0.55, HALF + 0.55));
  ctx.strokeStyle = "#c9a35a";
  ctx.lineWidth = Math.max(1, cam.k(zc) * 0.14);
  ctx.stroke();
  poly(ctx, quad(-HALF - 0.55, -HALF - 0.55, HALF + 0.55, HALF + 0.55));
  ctx.strokeStyle = "rgba(255,236,180,0.4)";
  ctx.lineWidth = Math.max(0.6, cam.k(zc) * 0.04);
  ctx.stroke();
  // the squares: a1 is dark, as on every board
  for (let f = 0; f < 8; f++) {
    for (let rank = 1; rank <= 8; rank++) {
      const dark = (f + rank) % 2 === 1;
      const x0 = -HALF + f * SQ;
      const z0 = -HALF + (rank - 1) * SQ;
      const pts = quad(x0, z0, x0 + SQ, z0 + SQ);
      const v = 0.93 + 0.14 * rnd();
      const base = dark
        ? [104 * v, 58 * v, 36 * v]
        : [224 * v, 184 * v, 126 * v];
      const g = ctx.createLinearGradient(
        pts[3].x,
        pts[3].y,
        pts[1].x,
        pts[1].y,
      );
      g.addColorStop(0, rgb(base[0] * 1.06, base[1] * 1.06, base[2] * 1.06));
      g.addColorStop(1, rgb(base[0] * 0.92, base[1] * 0.92, base[2] * 0.92));
      poly(ctx, pts);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.save();
      poly(ctx, pts);
      ctx.clip();
      for (let i = 0; i < 9; i++) {
        const vz = z0 + rnd() * SQ;
        const ph = rnd() * 6.28;
        const amp = 0.08 + rnd() * 0.18;
        ctx.beginPath();
        for (let s = 0; s <= 12; s++) {
          const x = x0 + (s / 12) * SQ;
          const p = cam.P(x, BH, zc + vz + Math.sin(x * 1.3 + ph) * amp);
          if (s) ctx.lineTo(p.x, p.y);
          else ctx.moveTo(p.x, p.y);
        }
        ctx.strokeStyle = dark
          ? `rgba(36,16,8,${(0.2 + rnd() * 0.25).toFixed(3)})`
          : `rgba(160,106,52,${(0.12 + rnd() * 0.2).toFixed(3)})`;
        ctx.lineWidth = 0.6 + rnd() * 0.8;
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  ctx.strokeStyle = "rgba(20,8,4,0.3)";
  ctx.lineWidth = 0.7;
  for (let i = 0; i <= 8; i++) {
    const o = -HALF + i * SQ;
    line(ctx, cam.P(o, BH, zc - HALF), cam.P(o, BH, zc + HALF));
    line(ctx, cam.P(-HALF, BH, zc + o), cam.P(HALF, BH, zc + o));
  }
  const rp = cam.P(-9, BH, zc + 13);
  soft(
    ctx,
    rp.x,
    rp.y,
    cam.k(zc) * 20,
    cam.k(zc) * 4,
    "255,232,190",
    0.12,
    "lighter",
  );
  // the coordinates, cut into the frame and filled with pale gold
  const size = (z) => Math.max(10, cam.k(z) * 1.75);
  const letter = (str, p, sz, a) => {
    ctx.font = `italic 600 ${sz.toFixed(1)}px Georgia, "Times New Roman", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = `rgba(20,6,2,${(0.7 * a).toFixed(2)})`;
    ctx.fillText(str, p.x + 0.8, p.y + 1);
    ctx.fillStyle = `rgba(236,214,164,${a})`;
    ctx.fillText(str, p.x, p.y);
  };
  const mid = (HALF + OB) / 2;
  for (let f = 0; f < 8; f++) {
    const x = -HALF + (f + 0.5) * SQ;
    letter(FILES[f], cam.P(x, BH, zc - mid), size(zc - mid), 0.95);
    letter(FILES[f], cam.P(x, BH, zc + mid), size(zc + mid), 0.45);
  }
  for (let rank = 1; rank <= 8; rank++) {
    const z = zc - HALF + (rank - 0.5) * SQ;
    letter(String(rank), cam.P(-mid, BH, z), size(z), 0.95);
    letter(String(rank), cam.P(mid, BH, z), size(z), 0.45);
  }
}

// the captured, lying on their sides on the table by the board
function paintFallen(ctx, cam) {
  const { zc } = cam;
  for (const [kind, white, x, z, yaw] of [
    ["P", true, -40, -10, 2.6],
    ["P", false, -43, 5, -2.3],
    ["P", true, -38.5, 18, 0.6],
  ]) {
    const k = cam.k(zc + z);
    const p = cam.P(x, 0, zc + z);
    if (p.x - k * 7 < 4) continue;
    const u = k * UNIT;
    const pose = { yaw };
    const sh = renderShadow(kind, pose);
    const body = renderKind(kind, pose)[white ? 0 : 1];
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.drawImage(
      sh.canvas,
      p.x - sh.ox * sh.canvas.width * (u / RES_S),
      p.y - sh.oy * sh.canvas.height * (u / RES_S),
      sh.canvas.width * (u / RES_S),
      sh.canvas.height * (u / RES_S),
    );
    ctx.restore();
    ctx.drawImage(
      body.canvas,
      p.x - body.ox * body.canvas.width * (u / RES),
      p.y - body.oy * body.canvas.height * (u / RES),
      body.canvas.width * (u / RES),
      body.canvas.height * (u / RES),
    );
  }
}

// Late light from a window off to the left, through sheer curtains: a shaft
// of warm gold lying across the table, striped soft with the curtain's folds
// and crossed by the shadow of the window's bars
function paintWindowLight(ctx, cam, table) {
  const { W, H } = cam;
  const A0 = { x: W * 0.02, y: 0 };
  const A1 = { x: W * 0.42, y: H };
  const B0 = { x: W * 0.3, y: 0 };
  const B1 = { x: W * 0.72, y: H };
  const R = 4;
  const w = Math.ceil(W / R);
  const h = Math.ceil(H / R);
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const img = g.createImageData(w, h);
  const d = img.data;
  const sm = (a, b, v) => {
    const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  for (let j = 0; j < h; j++) {
    const s = (j + 0.5) / h;
    const left = A0.x + (A1.x - A0.x) * s;
    const right = B0.x + (B1.x - B0.x) * s;
    for (let i = 0; i < w; i++) {
      const t = ((i + 0.5) * R - left) / (right - left);
      if (t < -0.08 || t > 1.08) continue;
      const edge = sm(-0.06, 0.1, t) * (1 - sm(0.9, 1.06, t));
      const folds =
        0.7 +
        0.16 * Math.sin(t * 31 + 1.2) +
        0.09 * Math.sin(t * 67 + s * 3) +
        0.05 * Math.sin(t * 131 - s * 5);
      const bars =
        (1 - 0.55 * Math.exp(-(((t - 0.5) / 0.03) ** 2))) *
        (1 - 0.45 * Math.exp(-(((s - 0.36) / 0.02) ** 2)));
      const I = edge * folds * bars * (0.85 + 0.15 * s);
      const o = (j * w + i) * 4;
      d[o] = 255 * I * 0.26;
      d[o + 1] = 226 * I * 0.26;
      d[o + 2] = 170 * I * 0.26;
      d[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // it falls on the table, not on the floor far below it
  ctx.save();
  poly(ctx, table);
  ctx.clip();
  ctx.globalCompositeOperation = "lighter";
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(c, 0, 0, W, H);
  ctx.restore();
  return { A0, A1, B0, B1 };
}

// The sheer curtain the light comes through, hanging at the left edge of
// the picture: a veil of fine voile in soft folds, glowing where the sun is
// behind it, brightest where each fold turns edge-on
function paintCurtain(ctx, cam, rnd) {
  const { W, H, S } = cam;
  const wC = Math.max(36, W * 0.085);
  const folds = 9;
  const edge = (y) =>
    wC *
    (0.86 +
      0.08 * Math.sin((y / H) * 5.2 + 0.6) +
      0.05 * Math.sin((y / H) * 13 + 2));
  const foldX = (i, y) => {
    const u = i / folds;
    return (
      edge(y) * u +
      Math.sin((y / H) * (3 + i * 0.7) + i * 1.9) *
        wC *
        0.035 *
        Math.sin(Math.PI * u)
    );
  };
  const step = Math.max(4, H / 120);
  const column = (i) => {
    const pts = [];
    for (let y = -step; y <= H + step; y += step)
      pts.push({ x: foldX(i, y), y });
    return pts;
  };
  const cols = [];
  for (let i = 0; i <= folds; i++) cols.push(column(i));
  // the veil: every other strip between two folds turns away, and is denser
  for (let i = 0; i < folds; i++) {
    const a = cols[i];
    const b = cols[i + 1];
    poly(ctx, a.concat(b.slice().reverse()));
    ctx.fillStyle = i % 2 ? "rgba(255,236,206,0.13)" : "rgba(255,236,206,0.23)";
    ctx.fill();
  }
  // the sun behind it, coming through: warm, strongest toward its free edge
  ctx.save();
  poly(ctx, cols[0].concat(cols[folds].slice().reverse()));
  ctx.clip();
  const glow = ctx.createLinearGradient(0, 0, wC, 0);
  glow.addColorStop(0, "rgba(255,210,150,0.04)");
  glow.addColorStop(1, "rgba(255,212,156,0.22)");
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, wC * 1.2, H);
  soft(
    ctx,
    wC * 0.6,
    H * 0.18,
    wC * 1.2,
    H * 0.3,
    "255,220,170",
    0.18,
    "lighter",
  );
  ctx.restore();
  // the folds: bright where the voile turns edge-on to us
  ctx.lineJoin = "round";
  for (let i = 1; i < folds; i++) {
    const pts = cols[i];
    ctx.beginPath();
    pts.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.strokeStyle =
      i % 2 ? "rgba(255,244,222,0.14)" : "rgba(255,246,228,0.3)";
    ctx.lineWidth = Math.max(1, S * (i % 2 ? 0.0012 : 0.002));
    ctx.stroke();
  }
  // its free edge, with a narrow hem, catching the most light
  const hem = cols[folds];
  ctx.beginPath();
  hem.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.strokeStyle = "rgba(255,248,232,0.5)";
  ctx.lineWidth = Math.max(1.5, S * 0.003);
  ctx.stroke();
  ctx.beginPath();
  hem.forEach((p, j) =>
    j ? ctx.lineTo(p.x - S * 0.006, p.y) : ctx.moveTo(p.x - S * 0.006, p.y),
  );
  ctx.strokeStyle = "rgba(255,244,222,0.18)";
  ctx.lineWidth = Math.max(1, S * 0.005);
  ctx.stroke();
  void rnd;
}

function finish(ctx, cam) {
  const { W, H } = cam;
  const R = Math.hypot(W, H) / 2;
  const v = ctx.createRadialGradient(
    W * 0.47,
    H * 0.5,
    R * 0.42,
    W / 2,
    H / 2,
    R * 1.05,
  );
  v.addColorStop(0, "rgba(10,4,2,0)");
  v.addColorStop(1, "rgba(10,4,2,0.72)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  const noise = makeCanvas(128, 128);
  const g = noise.getContext("2d");
  const img = g.createImageData(128, 128);
  const rnd = lcg(90210);
  for (let i = 0; i < 128 * 128; i++) {
    const n = (rnd() * 255) | 0;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = n;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = ctx.createPattern(noise, "repeat");
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ── the pieces: solids, ray-marched from the board's own height ─────────────

const CACHE = new Map(); // painted once, reused through every resize
const LT = unit3(-0.62, 0.62, 0.48); // toward the window: left, up, far
const VC = { x: 0, y: SP, z: -CP }; // toward the eye
const HV = unit3(LT.x + VC.x, LT.y + VC.y, LT.z + VC.z);

function pieceArt(textures, kind, white) {
  const art = renderKind(kind, null)[white ? 0 : 1];
  const key = `ch_piece_${kind}_${white ? "w" : "b"}`;
  if (!textures.exists(key)) textures.addCanvas(key, art.canvas);
  return { ...art, key };
}

function shadowArt(textures, kind) {
  const art = renderShadow(kind, null);
  const key = `ch_shadow_${kind}`;
  if (!textures.exists(key)) textures.addCanvas(key, art.canvas);
  return { ...art, key };
}

// the half-width of a set of symmetric outlines, all the way up (h = -y)
function profile(polys, circles) {
  let top = 0;
  for (const p of polys) for (const q of p) top = Math.max(top, -q[1]);
  for (const [cx, cy, r] of circles)
    if (Math.abs(cx) < 0.5) top = Math.max(top, -cy + r);
  const n = Math.ceil(top / 0.25) + 1;
  const w = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const y = -i * 0.25;
    let m = 0;
    for (const poly of polys) {
      for (let a = 0; a < poly.length; a++) {
        const [x1, y1] = poly[a];
        const [x2, y2] = poly[(a + 1) % poly.length];
        if ((y1 <= y && y2 >= y) || (y2 <= y && y1 >= y)) {
          if (y1 === y2) m = Math.max(m, Math.abs(x1), Math.abs(x2));
          else
            m = Math.max(m, Math.abs(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1)));
        }
      }
    }
    for (const [cx, cy, r] of circles) {
      if (Math.abs(cx) > 0.5) continue;
      const dy = y - cy;
      if (Math.abs(dy) < r) m = Math.max(m, Math.sqrt(r * r - dy * dy));
    }
    w[i] = m;
  }
  let last = 0;
  for (let i = 0; i < w.length; i++) if (w[i] > 0) last = i;
  return { w, top: last * 0.25 };
}

// a solid of revolution round the upright axis
function revolve(pr, x, h, z) {
  const r = Math.hypot(x, z);
  if (h < 0) return Math.max(-h, r - pr.w[0]);
  if (h > pr.top)
    return Math.hypot(
      Math.max(0, r - pr.w[Math.floor(pr.top / 0.25)]),
      h - pr.top,
    );
  const i = h / 0.25;
  const i0 = Math.floor(i);
  const ww =
    pr.w[i0] + (pr.w[Math.min(pr.w.length - 1, i0 + 1)] - pr.w[i0]) * (i - i0);
  return (r - ww) * 0.8;
}

// signed distance to a polygon, in its own plane (y up negative, as drawn)
function polySDF(poly, x, y) {
  let d = Infinity;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const ex = xj - xi;
    const ey = yj - yi;
    const wx = x - xi;
    const wy = y - yi;
    const t = Math.max(
      0,
      Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey)),
    );
    const dx = wx - ex * t;
    const dy = wy - ey * t;
    d = Math.min(d, dx * dx + dy * dy);
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return (inside ? -1 : 1) * Math.sqrt(d);
}

// a flat shape given thickness, its edges rounded
function extrude(d2, z, half, round) {
  const qx = d2 + round;
  const qz = Math.abs(z) - half + round;
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) +
    Math.min(Math.max(qx, qz), 0) -
    round
  );
}

// each piece as a distance field, in shape units, its foot at the origin
function shapeField(kind) {
  const s = SHAPES[kind];
  if (kind === "N") {
    const base = profile([s.polys[0]], []);
    const head = s.polys[1];
    return (x, h, z) =>
      Math.min(
        revolve(base, x, h, z),
        extrude(polySDF(head, x, -h), z, 8.5 - Math.max(0, h - 55) * 0.06, 2.5),
      );
  }
  if (kind === "K") {
    const body = profile(s.polys.slice(0, 3), []);
    const cross = s.polys[3];
    return (x, h, z) =>
      Math.min(revolve(body, x, h, z), extrude(polySDF(cross, x, -h), z, 3, 1));
  }
  if (kind === "R") {
    const body = profile(s.polys, []);
    return (x, h, z) => {
      let d = revolve(body, x, h, z);
      const r = Math.hypot(x, z);
      d = Math.max(d, -Math.max(79 - h, r - 15)); // the parapet is hollow
      if (h > 72) {
        const a = Math.atan2(z, x);
        const q = Math.PI / 2;
        const m = (((a % q) + q) % q) - q / 4;
        d = Math.max(d, -Math.max(76 - h, Math.abs(m) * r - 3.4)); // four crenels
      }
      return d;
    };
  }
  if (kind === "Q") {
    const lower = profile(s.polys.slice(0, 2), []);
    return (x, h, z) => {
      let d = revolve(lower, x, h, z);
      const r = Math.hypot(x, z);
      if (h > 50) {
        const a = Math.atan2(z, x);
        const wc = 16 + Math.max(0, h - 58) * (9 / 26);
        const top = 71 + 14 * Math.pow(0.5 + 0.5 * Math.cos(a * 8), 3);
        let c = Math.max(r - wc, 58 - h, h - top);
        c = Math.max(c, -Math.max(66 - h, r - (wc - 2.6)));
        d = Math.min(d, c * 0.8);
      }
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        d = Math.min(
          d,
          Math.hypot(x - 24 * Math.cos(a), h - 87.5, z - 24 * Math.sin(a)) -
            3.6,
        );
      }
      d = Math.min(
        d,
        Math.max(Math.hypot(x, z) - 3, 64 - h, h - 90),
        Math.hypot(x, h - 93, z) - 4.6,
      );
      return d;
    };
  }
  if (kind === "B") {
    const body = profile(s.polys, s.circles);
    const n = unit3(13, -10, 0); // across the mitre's slanting cut
    return (x, h, z) => {
      const d = revolve(body, x, h, z);
      const dist = (x - 7) * n.x + (h - 76) * n.y;
      return Math.max(
        d,
        -Math.max(Math.abs(dist) - 1.4, z - 3, 60 - h, h - 82),
      );
    };
  }
  const body = profile(s.polys, s.circles);
  return (x, h, z) => revolve(body, x, h, z);
}

function fieldOf(kind) {
  const key = "field_" + kind;
  if (!CACHE.has(key)) CACHE.set(key, shapeField(kind));
  return CACHE.get(key);
}

// the field in the world: standing, or lying on its side (yaw: which way)
function posed(kind, pose) {
  const f = fieldOf(kind);
  if (!pose) return f;
  const lift = SHAPES[kind].polys[0][0][0] * -1; // it rests on its foot's rim
  const ax = Math.cos(pose.yaw);
  const az = Math.sin(pose.yaw);
  return (x, y, z) => f(x * -az + z * ax, x * ax + z * az, y - lift);
}

function marchBox(ox, oy, oz, dx, dy, dz, lo, hi) {
  let near = -1e9;
  let far = 1e9;
  for (const [o, d, a, b] of [
    [ox, dx, lo[0], hi[0]],
    [oy, dy, lo[1], hi[1]],
    [oz, dz, lo[2], hi[2]],
  ]) {
    if (Math.abs(d) < 1e-9) {
      if (o < a || o > b) return null;
      continue;
    }
    const t1 = (a - o) / d;
    const t2 = (b - o) / d;
    near = Math.max(near, Math.min(t1, t2));
    far = Math.min(far, Math.max(t1, t2));
  }
  return near > far ? null : [near, far];
}

// One piece (both colours), turned boxwood and ebony: seen from the board's
// height, lit from the window, its own parts shading each other
function renderKind(kind, pose) {
  const id = `${kind}_${pose ? pose.yaw : "up"}`;
  if (CACHE.has(id)) return CACHE.get(id);
  const f = posed(kind, pose);
  const [u0, u1, v0, v1] = pose ? [-70, 70, -55, 55] : [-44, 44, -28, 96];
  const w = Math.ceil((u1 - u0) * RES);
  const h = Math.ceil((v1 - v0) * RES);
  const lo = pose ? [-75, -1, -75] : [-45, -1, -45];
  const hi = pose ? [75, 40, 75] : [45, 108, 45];
  const outs = [makeCanvas(w, h), makeCanvas(w, h)];
  const imgs = outs.map((c) => c.getContext("2d").createImageData(w, h));
  const sd = (p) => f(p[0], p[1], p[2]);
  const pix = 1 / RES;
  for (let j = 0; j < h; j++) {
    const v = v1 - (j + 0.5) * pix;
    for (let i = 0; i < w; i++) {
      const u = u0 + (i + 0.5) * pix;
      const ox = u;
      const oy = v * CP;
      const oz = v * SP;
      const span = marchBox(ox, oy, oz, 0, -SP, CP, lo, hi);
      if (!span) continue;
      let t = span[0];
      let prev = t;
      let hit = false;
      let best = Infinity;
      let bestT = t;
      for (let s = 0; s < 120 && t < span[1]; s++) {
        const d = f(ox, oy - SP * t, oz + CP * t);
        if (d < best) {
          best = d;
          bestT = t;
        }
        if (d < 0.04) {
          let a = prev;
          let b = t;
          for (let q = 0; q < 6; q++) {
            const m = (a + b) / 2;
            if (f(ox, oy - SP * m, oz + CP * m) < 0.02) b = m;
            else a = m;
          }
          bestT = b;
          hit = true;
          break;
        }
        prev = t;
        t += Math.max(0.05, d * 0.85);
      }
      const cover = hit ? 1 : Math.max(0, 1 - best / (pix * 0.8));
      if (cover <= 0.02) continue;
      const p = [ox, oy - SP * bestT, oz + CP * bestT];
      const e = 0.12;
      let nx = f(p[0] + e, p[1], p[2]) - f(p[0] - e, p[1], p[2]);
      let ny = f(p[0], p[1] + e, p[2]) - f(p[0], p[1] - e, p[2]);
      let nz = f(p[0], p[1], p[2] + e) - f(p[0], p[1], p[2] - e);
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl;
      ny /= nl;
      nz /= nl;
      // how much of the window it sees: a soft shadow from its own parts
      let lit = 1;
      let st = 0.6;
      for (let s = 0; s < 22 && st < 110; s++) {
        const d = sd([
          p[0] + nx * 0.3 + LT.x * st,
          p[1] + ny * 0.3 + LT.y * st,
          p[2] + nz * 0.3 + LT.z * st,
        ]);
        if (d < 0.02) {
          lit = 0;
          break;
        }
        lit = Math.min(lit, (8 * d) / st);
        st += Math.max(0.4, d);
      }
      lit = Math.max(0, Math.min(1, lit));
      let ao = 1;
      for (let s = 1; s <= 3; s++)
        ao -=
          (Math.max(
            0,
            s * 1.6 -
              sd([
                p[0] + nx * s * 1.6,
                p[1] + ny * s * 1.6,
                p[2] + nz * s * 1.6,
              ]),
          ) /
            (s * 1.6)) *
          0.22;
      ao = Math.max(0.35, ao) * (0.72 + 0.28 * Math.min(1, p[1] / 8));
      const ndl = Math.max(0, nx * LT.x + ny * LT.y + nz * LT.z);
      const ndh = Math.max(0, nx * HV.x + ny * HV.y + nz * HV.z);
      const rim = Math.pow(
        1 - Math.max(0, nx * VC.x + ny * VC.y + nz * VC.z),
        3,
      );
      const ring = Math.sin(
        p[1] * 1.9 + Math.sin(p[0] * 0.3 + p[2] * 0.3) * 1.2,
      );
      const o = (j * w + i) * 4;
      for (let c = 0; c < 2; c++) {
        const white = c === 0;
        const base = white ? [236, 208, 160] : [58, 41, 34];
        const amb = white ? [0.36, 0.34, 0.37] : [0.5, 0.46, 0.48];
        const grain = 1 + (white ? 0.045 : 0.08) * ring;
        const spec =
          Math.pow(ndh, white ? 36 : 80) * (white ? 0.38 : 0.85) * lit;
        const key = [1, 0.9, 0.76];
        const d = imgs[c].data;
        for (let q = 0; q < 3; q++) {
          d[o + q] =
            base[q] * grain * (amb[q] * ao + ndl * lit * key[q] * 0.95) +
            spec * 255 * key[q] +
            rim * (white ? 22 : 30) * key[q];
        }
        d[o + 3] = 255 * cover;
      }
    }
  }
  const res = outs.map((c, i) => {
    c.getContext("2d").putImageData(imgs[i], 0, 0);
    return { canvas: c, ox: -u0 / (u1 - u0), oy: v1 / (v1 - v0), height: v1 };
  });
  CACHE.set(id, res);
  return res;
}

// A piece's shadow on the board: worked out from its shape, looking toward
// the window from every point of the board round it; darkest at its foot
function renderShadow(kind, pose) {
  const id = `shadow_${kind}_${pose ? pose.yaw : "up"}`;
  if (CACHE.has(id)) return CACHE.get(id);
  const f = posed(kind, pose);
  const [u0, u1, v0, v1] = pose ? [-75, 110, -90, 60] : [-45, 150, -85, 32];
  const w = Math.ceil((u1 - u0) * RES_S);
  const h = Math.ceil((v1 - v0) * RES_S);
  const small = makeCanvas(w, h);
  const g = small.getContext("2d");
  const img = g.createImageData(w, h);
  const d = img.data;
  for (let j = 0; j < h; j++) {
    const v = v1 - (j + 0.5) / RES_S;
    const z = v / SP; // a point on the board, seen here
    for (let i = 0; i < w; i++) {
      const x = u0 + (i + 0.5) / RES_S;
      let lit = 1;
      let t = 0.8;
      for (let s = 0; s < 40 && t < 170; s++) {
        const q = f(x + LT.x * t, 0.4 + LT.y * t, z + LT.z * t);
        if (q < 0.03) {
          lit = 0;
          break;
        }
        lit = Math.min(lit, (6 * q) / t);
        t += Math.max(0.6, q);
      }
      const near = f(x, 1.2, z);
      const touch = 0.5 * Math.exp(-Math.max(0, near) / 2.5);
      const a = Math.max((1 - Math.max(0, Math.min(1, lit))) * 0.78, touch);
      d[(j * w + i) * 4 + 3] = 255 * a;
    }
  }
  g.putImageData(img, 0, 0);
  const res = { canvas: small, ox: -u0 / (u1 - u0), oy: v1 / (v1 - v0) };
  CACHE.set(id, res);
  return res;
}

// ── helpers ─────────────────────────────────────────────────────────────────

function roundRectZ(half, z0, z1, r) {
  const pts = [];
  const corner = (cx, cz, a0) => {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (i / 6) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
    }
  };
  corner(half - r, z0 + r, -Math.PI / 2);
  corner(half - r, z1 - r, 0);
  corner(-half + r, z1 - r, Math.PI / 2);
  corner(-half + r, z0 + r, Math.PI);
  return pts;
}

function poly(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

function line(ctx, a, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function _bounds(pts) {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function soft(ctx, cx, cy, rx, ry, rgbs, a, op) {
  if (rx <= 0 || ry <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.translate(cx, cy);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(${rgbs},${a})`);
  g.addColorStop(0.5, `rgba(${rgbs},${a * 0.4})`);
  g.addColorStop(1, `rgba(${rgbs},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

function radial(size, rgbs, stops) {
  const c = makeCanvas(size, size);
  const g = c.getContext("2d");
  const r = g.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  for (const [o, a] of stops) r.addColorStop(o, `rgba(${rgbs},${a})`);
  g.fillStyle = r;
  g.fillRect(0, 0, size, size);
  return c;
}

const rgb = (r, g, b) =>
  `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

function unit3(x, y, z) {
  const l = Math.hypot(x, y, z) || 1;
  return { x: x / l, y: y / l, z: z / l };
}

function _hash(n) {
  let h = Math.imul(Math.floor(n * 13 + 7), 374761393) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

function add(textures, key, canvas) {
  if (textures.exists(key)) textures.remove(key);
  return textures.addCanvas(key, canvas);
}

function lcg(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
