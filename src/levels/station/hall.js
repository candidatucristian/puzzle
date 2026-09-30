/** The hall for STATION, painted as a real night rather than a sketch: an
 *  empty station concourse under an iron roof, tall arched windows gone dark,
 *  a bench and a suitcase nobody came back for — and, hanging from the
 *  girder on two chains, a split-flap departures board still lit by the tube
 *  in its hood.
 *
 *  Painted once per screen size. What lives stays out of the painting: the
 *  scene writes the letters onto the empty flaps, lays `splits` (the gap
 *  between each flap's two halves) over them, breathes the lamp's `glow`,
 *  turns the clock's red second `hand` and drifts the dust `mote`s. Every
 *  position comes from the scene's own layout (L), so the painted flaps sit
 *  exactly under the live letters. */

const ROOM = "st_room";
const GLOW = "st_glow";
const SPLITS = "st_splits";
const HAND = "st_hand";
const MOTE = "st_mote";

// the lettering on the board's own headings, as on the flaps
const FLAP_FONT =
  '"Arial Narrow", "Roboto Condensed", "Helvetica Neue", Arial, sans-serif';

export function paintHall(scene, L) {
  const G = geometry(L);
  const room = makeCanvas(L.W, L.H);
  const ctx = room.getContext("2d");
  paintWall(ctx, L, G);
  paintWindows(ctx, L, G);
  paintTruss(ctx, L, G, lcg(4402));
  paintFloor(ctx, L, G, lcg(5503));
  paintChains(ctx, L, G);
  paintBoard(ctx, L, G);
  paintClock(ctx, L, G);
  paintBench(ctx, L, G);
  paintSuitcase(ctx, L, G);
  finish(ctx, L, lcg(6604));

  const t = scene.textures;
  addCanvas(t, ROOM, room);
  addCanvas(t, GLOW, paintGlow(L, G));
  addCanvas(t, SPLITS, paintSplits(L));
  const hand = paintHand(L.clock.rad);
  addCanvas(t, HAND, hand.canvas);
  addCanvas(
    t,
    MOTE,
    radial(16, "255,244,222", [
      [0, 1],
      [0.3, 0.45],
      [1, 0],
    ]),
  );

  return {
    room: ROOM,
    glow: GLOW,
    splits: SPLITS,
    hand: { key: HAND, originY: hand.originY },
    mote: MOTE,
  };
}

export function releaseHallArt(textures) {
  for (const key of [ROOM, GLOW, SPLITS, HAND, MOTE]) {
    if (textures.exists(key)) textures.remove(key);
  }
}

// ── the few numbers everything else hangs off ───────────────────────────────

function geometry(L) {
  const { W, H, S, board, cw, ch } = L;
  const girderTop = H * 0.018;
  const girderBot = H * 0.052;
  const hoodH = Math.max(8, ch * 0.36);
  const hoodOver = cw * 0.35;
  return {
    girderTop,
    girderBot,
    hood: {
      x: board.x - hoodOver,
      y: board.y - hoodH,
      w: board.w + hoodOver * 2,
      h: hoodH,
    },
    // the inset the flap panel sits in, inside the case
    rim: Math.max(4, cw * 0.2),
    corner: Math.max(4, cw * 0.28),
    lw: Math.max(1, S / 800),
    W,
    H,
  };
}

// ── the hall ────────────────────────────────────────────────────────────────

function paintWall(ctx, L, G) {
  const { W, H, floorY } = L;
  const wall = ctx.createLinearGradient(0, 0, 0, floorY);
  wall.addColorStop(0, "#06080c");
  wall.addColorStop(0.4, "#0d1119");
  wall.addColorStop(1, "#131824");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, W, floorY);

  // a glazed-tile dado along the bottom of the wall, and its rail
  const dado = H * 0.66;
  ctx.fillStyle = "#0f131b";
  ctx.fillRect(0, dado, W, floorY - dado);
  const course = Math.max(8, H * 0.021);
  ctx.lineWidth = G.lw;
  for (let y = dado + course, row = 0; y < floorY; y += course, row++) {
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    line(ctx, 0, y, W, y);
    const brick = course * 2.6;
    for (let x = (row % 2) * brick * 0.5; x < W; x += brick) {
      line(ctx, x, y - course, x, y);
    }
  }
  const rail = ctx.createLinearGradient(0, dado - H * 0.012, 0, dado);
  rail.addColorStop(0, "#1c2230");
  rail.addColorStop(1, "#0d1016");
  ctx.fillStyle = rail;
  ctx.fillRect(0, dado - H * 0.012, W, H * 0.012);
  ctx.fillStyle = "rgba(170,185,215,0.08)";
  ctx.fillRect(0, dado - H * 0.012, W, Math.max(1, G.lw));
}

// four tall arched windows, dark with the night — only their tops show above
// the board, and the outer two at its sides
function paintWindows(ctx, L, G) {
  const { W, H, S } = L;
  const top = H * 0.13;
  const bottom = H * 0.62;
  const w = W * 0.15;
  const frame = Math.max(3, S * 0.007);
  for (const fx of [0.12, 0.37, 0.63, 0.88]) {
    const x = W * fx - w / 2;
    const r = w / 2;
    const arch = (inset) => {
      ctx.beginPath();
      ctx.moveTo(x + inset, bottom - inset);
      ctx.lineTo(x + inset, top + r);
      ctx.arc(x + w / 2, top + r, r - inset, Math.PI, 0);
      ctx.lineTo(x + w - inset, bottom - inset);
      ctx.closePath();
    };
    // the reveal around the opening, then the night through the glass
    arch(-frame * 1.6);
    ctx.fillStyle = "#090b10";
    ctx.fill();
    arch(0);
    const glass = ctx.createLinearGradient(0, top, 0, bottom);
    glass.addColorStop(0, "#0a1323");
    glass.addColorStop(0.6, "#0f1c33");
    glass.addColorStop(1, "#15243d");
    ctx.fillStyle = glass;
    ctx.fill();

    // glazing bars: two mullions, transoms, and spokes in the arch
    ctx.save();
    arch(0);
    ctx.clip();
    ctx.strokeStyle = "#07090d";
    ctx.lineWidth = frame * 0.55;
    for (const k of [1 / 3, 2 / 3]) line(ctx, x + w * k, top, x + w * k, bottom);
    for (let y = top + r; y < bottom; y += (bottom - top - r) / 5) {
      line(ctx, x, y, x + w, y);
    }
    for (let a = 1; a < 6; a++) {
      const ang = Math.PI + (Math.PI * a) / 6;
      line(
        ctx,
        x + w / 2,
        top + r,
        x + w / 2 + Math.cos(ang) * r,
        top + r + Math.sin(ang) * r,
      );
    }
    // the faintest cold light on the panes
    ctx.fillStyle = "rgba(120,150,210,0.05)";
    ctx.fillRect(x, top, w * 0.45, bottom - top);
    ctx.restore();

    arch(0);
    ctx.strokeStyle = "#1b2130";
    ctx.lineWidth = frame;
    ctx.stroke();
  }
}

// the iron roof girder the board and the clock hang from
function paintTruss(ctx, L, G, rnd) {
  const { W, S } = L;
  const { girderTop: y0, girderBot: y1 } = G;
  const iron = ctx.createLinearGradient(0, 0, 0, y1);
  iron.addColorStop(0, "#050608");
  iron.addColorStop(1, "#0b0d11");
  ctx.fillStyle = iron;
  ctx.fillRect(0, 0, W, y0);

  // a Warren truss: two chords and the zigzag between them
  const bar = Math.max(3, S * 0.006);
  ctx.strokeStyle = "#181c23";
  ctx.lineWidth = bar;
  const step = Math.max(40, W * 0.065);
  for (let x = -step; x < W + step; x += step) {
    line(ctx, x, y1, x + step / 2, y0);
    line(ctx, x + step / 2, y0, x + step, y1);
  }
  ctx.fillStyle = "#1a1e26";
  ctx.fillRect(0, y0 - bar / 2, W, bar);
  // the bottom chord is the girder proper: deeper, riveted, catching light
  const gh = Math.max(6, S * 0.012);
  const girder = ctx.createLinearGradient(0, y1 - gh / 2, 0, y1 + gh / 2);
  girder.addColorStop(0, "#2a303b");
  girder.addColorStop(0.45, "#1a1e26");
  girder.addColorStop(1, "#0c0e12");
  ctx.fillStyle = girder;
  ctx.fillRect(0, y1 - gh / 2, W, gh);
  for (let x = 6 + rnd() * 6; x < W; x += Math.max(12, S * 0.022)) {
    ctx.fillStyle = "rgba(210,220,240,0.12)";
    ctx.beginPath();
    ctx.arc(x, y1, Math.max(0.9, gh * 0.13), 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintFloor(ctx, L, G, rnd) {
  const { W, H, floorY } = L;
  const floor = ctx.createLinearGradient(0, floorY, 0, H);
  floor.addColorStop(0, "#12161d");
  floor.addColorStop(1, "#08090c");
  ctx.fillStyle = floor;
  ctx.fillRect(0, floorY, W, H - floorY);
  // the skirting where the wall meets the floor
  ctx.fillStyle = "#07080b";
  ctx.fillRect(0, floorY - H * 0.006, W, H * 0.006);

  // flagstone joints, running away from us to one vanishing point
  const vx = W / 2;
  const vy = floorY - H * 0.5;
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = G.lw;
  for (let i = -12; i <= 12; i++) {
    const xb = vx + i * W * 0.09;
    const t = (floorY - vy) / (H - vy);
    line(ctx, vx + (xb - vx) * t, floorY, xb, H);
  }
  line(ctx, 0, floorY + (H - floorY) * 0.38, W, floorY + (H - floorY) * 0.38);

  // the platform's warning line, worn through in places
  const ly = floorY + (H - floorY) * 0.62;
  const lh = Math.max(2, (H - floorY) * 0.1);
  for (let x = 0; x < W; ) {
    const run = 20 + rnd() * 90;
    ctx.fillStyle = `rgba(176,146,70,${0.18 + rnd() * 0.14})`;
    ctx.fillRect(x, ly, run, lh);
    x += run + rnd() * 10;
  }
}

function paintChains(ctx, L, G) {
  const { S } = L;
  const top = G.girderBot;
  const bottom = G.hood.y;
  if (bottom <= top) return;
  const link = Math.max(6, S * 0.013);
  const lw = Math.max(1.2, S * 0.0026);
  for (const cx of L.chains) {
    for (let y = top, i = 0; y < bottom; y += link * 0.8, i++) {
      ctx.strokeStyle = "#454b56";
      ctx.lineWidth = lw;
      if (i % 2 === 0) {
        ctx.beginPath();
        ctx.ellipse(cx, y + link / 2, link * 0.28, link / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        line(ctx, cx, y, cx, y + link);
      }
    }
    // the shackle bolted to the hood
    ctx.fillStyle = "#2c313a";
    ctx.fillRect(cx - link * 0.45, bottom - link * 0.35, link * 0.9, link * 0.4);
  }
}

// the board itself: the case, the hood with its tube, the headings, and every
// flap left blank — the scene writes the letters on
function paintBoard(ctx, L, G) {
  const { board, x0, gW, headH, cw, ch, groups } = L;
  const { x, y, w, h } = board;
  const { hood, rim, corner, lw } = G;

  // its shadow on the wall behind, falling down and away from the lamp
  ctx.save();
  ctx.filter = `blur(${Math.max(4, ch * 0.5)}px)`;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  roundRect(ctx, x + ch * 0.2, y + ch * 0.55, w, h, corner);
  ctx.fill();
  ctx.restore();

  // the case
  const caseG = ctx.createLinearGradient(0, y, 0, y + h);
  caseG.addColorStop(0, "#1d2128");
  caseG.addColorStop(1, "#121418");
  ctx.fillStyle = caseG;
  roundRect(ctx, x, y, w, h, corner);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = lw;
  line(ctx, x + corner, y + lw, x + w - corner, y + lw);
  ctx.strokeStyle = "#07080a";
  roundRect(ctx, x, y, w, h, corner);
  ctx.stroke();

  // the black panel the flaps are set into
  ctx.fillStyle = "#0a0b0e";
  roundRect(ctx, x + rim, y + rim, w - rim * 2, h - rim * 2, corner * 0.6);
  ctx.fill();

  // the hood over it, whose underside carries the tube
  const hoodG = ctx.createLinearGradient(0, hood.y, 0, hood.y + hood.h);
  hoodG.addColorStop(0, "#262b34");
  hoodG.addColorStop(1, "#15181d");
  ctx.fillStyle = hoodG;
  ctx.beginPath();
  ctx.moveTo(hood.x + hood.h * 0.6, hood.y);
  ctx.lineTo(hood.x + hood.w - hood.h * 0.6, hood.y);
  ctx.lineTo(hood.x + hood.w, hood.y + hood.h);
  ctx.lineTo(hood.x, hood.y + hood.h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,246,226,0.55)";
  ctx.fillRect(x + corner, hood.y + hood.h - lw * 1.5, w - corner * 2, lw * 1.5);

  // DEPARTURES, and a hairline under it
  ctx.fillStyle = "#efe9dc";
  ctx.font = `bold ${Math.round(headH * 0.52)}px ${FLAP_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  trySpacing(ctx, `${Math.max(2, headH * 0.14)}px`);
  ctx.fillText("DEPARTURES", x0 + gW / 2, board.headY + headH / 2);
  trySpacing(ctx, "0px");
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x0, board.headY + headH - lw, gW, lw);

  // the column headings, small and dim
  const labels = ["TIME", "DESTINATION", "TRK", "REMARKS"];
  const sizes = [5, 8, 1, 10];
  ctx.fillStyle = "#7f838c";
  ctx.font = `bold ${Math.max(9, Math.round(L.colHeadH * 0.55))}px ${FLAP_FONT}`;
  trySpacing(ctx, "1px");
  labels.forEach((label, g) => {
    const gw = sizes[g] * cw + (sizes[g] - 1) * L.cellGap;
    ctx.fillText(label, groups[g] + gw / 2, board.colHeadY);
  });
  trySpacing(ctx, "0px");

  // the flaps: a slot for each group, and in it every cell blank
  const r = Math.min(cw, ch) * 0.1;
  for (let row = 0; row < L.rows; row++) {
    const cells = L.cellsOf(row);
    sizes.forEach((n, g) => {
      const first = cells.find((c) => c.group === g);
      const gw = n * cw + (n - 1) * L.cellGap;
      ctx.fillStyle = "#050607";
      ctx.fillRect(first.x - 2, first.y - 2, gw + 4, ch + 4);
    });
    for (const c of cells) {
      // the upper half catches the tube's light, the lower one is in shadow
      const upper = ctx.createLinearGradient(0, c.y, 0, c.y + ch / 2);
      upper.addColorStop(0, "#2a2e35");
      upper.addColorStop(1, "#1f2228");
      ctx.fillStyle = upper;
      roundRect(ctx, c.x, c.y, cw, ch / 2, { tl: r, tr: r, br: 0, bl: 0 });
      ctx.fill();
      const lower = ctx.createLinearGradient(0, c.y + ch / 2, 0, c.y + ch);
      lower.addColorStop(0, "#1a1d22");
      lower.addColorStop(1, "#141619");
      ctx.fillStyle = lower;
      roundRect(ctx, c.x, c.y + ch / 2, cw, ch / 2, { tl: 0, tr: 0, br: r, bl: r });
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(c.x + r, c.y, cw - r * 2, Math.max(1, lw * 0.8));
    }
  }
}

// a station clock stopped calm at 20:47 — its red second hand is live
function paintClock(ctx, L, G) {
  const { cx, cy, rad } = L.clock;
  if (!(rad > 4)) return;
  const caseR = rad * 1.1;

  // the stem up to the girder
  if (cy - caseR > G.girderBot) {
    ctx.fillStyle = "#1c2027";
    ctx.fillRect(cx - rad * 0.05, G.girderBot, rad * 0.1, cy - caseR - G.girderBot);
  }

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = rad * 0.3;
  ctx.shadowOffsetY = rad * 0.08;
  const caseG = ctx.createLinearGradient(0, cy - caseR, 0, cy + caseR);
  caseG.addColorStop(0, "#3a404b");
  caseG.addColorStop(1, "#171a1f");
  ctx.fillStyle = caseG;
  circle(ctx, cx, cy, caseR);
  ctx.fill();
  ctx.restore();

  // the dial, lit from within as they are at night
  const dial = ctx.createRadialGradient(cx, cy - rad * 0.2, rad * 0.1, cx, cy, rad);
  dial.addColorStop(0, "#efe9da");
  dial.addColorStop(1, "#c7c0ad");
  ctx.fillStyle = dial;
  circle(ctx, cx, cy, rad);
  ctx.fill();

  // sixty minute strokes, twelve heavy hour bars
  ctx.fillStyle = "#16181b";
  for (let i = 0; i < 60; i++) {
    const hour = i % 5 === 0;
    const len = rad * (hour ? 0.22 : 0.07);
    const wid = rad * (hour ? 0.07 : 0.022);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((i / 60) * Math.PI * 2);
    ctx.fillRect(-wid / 2, -rad * 0.92, wid, len);
    ctx.restore();
  }

  // hour and minute hands at 20:47
  const hand = (turns, back, len, wid) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(turns * Math.PI * 2);
    ctx.fillStyle = "#121315";
    ctx.beginPath();
    ctx.moveTo(-wid * 0.62, back);
    ctx.lineTo(-wid * 0.42, -len);
    ctx.lineTo(wid * 0.42, -len);
    ctx.lineTo(wid * 0.62, back);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  hand(((20 % 12) + 47 / 60) / 12, rad * 0.14, rad * 0.56, rad * 0.1);
  hand(47 / 60, rad * 0.16, rad * 0.86, rad * 0.075);
  ctx.fillStyle = "#121315";
  circle(ctx, cx, cy, rad * 0.06);
  ctx.fill();

  // the glass over it
  const gloss = ctx.createLinearGradient(cx - rad, cy - rad, cx + rad, cy + rad);
  gloss.addColorStop(0, "rgba(255,255,255,0.12)");
  gloss.addColorStop(0.5, "rgba(255,255,255,0)");
  ctx.fillStyle = gloss;
  circle(ctx, cx, cy, rad);
  ctx.fill();
}

// a slatted bench, bottom left, in front of everything
function paintBench(ctx, L, G) {
  const { W, H, floorY } = L;
  const x = W * 0.03;
  const w = W * 0.1;
  const seat = floorY - H * 0.052;
  const back = seat - H * 0.05;
  const slat = Math.max(2, H * 0.006);
  ctx.fillStyle = "#0b0d11";
  for (const sy of [seat, seat + slat * 1.6]) ctx.fillRect(x, sy, w, slat);
  for (const by of [back, back + slat * 1.7, back + slat * 3.4]) {
    ctx.fillRect(x + w * 0.04, by, w * 0.92, slat);
  }
  for (const lx of [x + w * 0.1, x + w * 0.86]) {
    ctx.fillRect(lx, back, slat * 0.9, floorY - back);
  }
  ctx.fillStyle = "rgba(190,200,220,0.09)";
  ctx.fillRect(x, seat, w, Math.max(1, G.lw));
  ctx.fillRect(x + w * 0.04, back, w * 0.92, Math.max(1, G.lw));
}

// a suitcase, bottom right — someone stopped waiting
function paintSuitcase(ctx, L, G) {
  const { W, H, floorY } = L;
  const w = W * 0.05;
  const h = H * 0.055;
  const x = W * 0.905;
  const y = floorY - h;
  ctx.fillStyle = "#1a130f";
  roundRect(ctx, x, y, w, h, Math.max(2, w * 0.08));
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(x, y + h * 0.48, w, Math.max(1, h * 0.05));
  ctx.strokeStyle = "#241a14";
  ctx.lineWidth = Math.max(1.5, w * 0.06);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.35, y);
  ctx.lineTo(x + w * 0.35, y - h * 0.18);
  ctx.lineTo(x + w * 0.65, y - h * 0.18);
  ctx.lineTo(x + w * 0.65, y);
  ctx.stroke();
  ctx.fillStyle = "rgba(200,180,150,0.1)";
  ctx.fillRect(x, y, w, Math.max(1, G.lw));
}

function finish(ctx, L, rnd) {
  const { W, H, S } = L;
  const v = ctx.createRadialGradient(
    W / 2,
    H * 0.5,
    S * 0.3,
    W / 2,
    H * 0.5,
    Math.hypot(W, H) * 0.62,
  );
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  const n = Math.floor((W * H) / 70);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.035})`;
    ctx.fillRect(rnd() * W, rnd() * H, 1, 1);
  }
}

// ── live layers ─────────────────────────────────────────────────────────────

// the tube's light: added over the room, strongest just under the hood
function paintGlow(L, G) {
  const { W, H, board, floorY } = L;
  const { x, y, w, h } = board;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");

  // down the face of the board, fading row by row
  const face = ctx.createLinearGradient(0, y, 0, y + h);
  face.addColorStop(0, "rgba(255,240,214,0.2)");
  face.addColorStop(0.35, "rgba(255,240,214,0.08)");
  face.addColorStop(1, "rgba(255,240,214,0.02)");
  ctx.fillStyle = face;
  roundRect(ctx, x, y, w, h, G.corner);
  ctx.fill();

  // spilling up the wall around the hood
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, y);
  ctx.clip();
  const up = ctx.createRadialGradient(x + w / 2, y, 0, x + w / 2, y, w * 0.6);
  up.addColorStop(0, "rgba(255,238,208,0.14)");
  up.addColorStop(1, "rgba(255,238,208,0)");
  ctx.fillStyle = up;
  ctx.fillRect(0, 0, W, y);
  ctx.restore();

  // the tube itself
  ctx.fillStyle = "rgba(255,250,236,0.9)";
  ctx.fillRect(x + G.corner, y - G.lw, w - G.corner * 2, G.lw * 2);

  // and a little on the floor below
  const pool = ctx.createRadialGradient(
    x + w / 2,
    floorY,
    0,
    x + w / 2,
    floorY,
    w * 0.55,
  );
  pool.addColorStop(0, "rgba(255,236,204,0.06)");
  pool.addColorStop(1, "rgba(255,236,204,0)");
  ctx.fillStyle = pool;
  ctx.fillRect(0, floorY, W, H - floorY);
  return c;
}

// the gap between each flap's two halves, laid over the letters
function paintSplits(L) {
  const { W, H, cw, ch } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  const t = Math.max(1, ch * 0.04);
  for (let row = 0; row < L.rows; row++) {
    for (const cell of L.cellsOf(row)) {
      const y = cell.y + ch / 2;
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(cell.x, y - t / 2, cw, t);
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.fillRect(cell.x + 1, y + t / 2, cw - 2, Math.max(1, t * 0.5));
      // the two hinge pins either side
      ctx.fillStyle = "#3b4049";
      ctx.fillRect(cell.x, y - t * 1.1, Math.max(1, cw * 0.05), t * 2.2);
      ctx.fillRect(
        cell.x + cw - Math.max(1, cw * 0.05),
        y - t * 1.1,
        Math.max(1, cw * 0.05),
        t * 2.2,
      );
    }
  }
  return c;
}

// the Swiss-station second hand: a red rod ending in a red disc
function paintHand(rad) {
  const reach = rad * 0.62; // pivot to the disc's centre
  const disc = Math.max(2, rad * 0.1);
  const tail = rad * 0.24;
  const pad = 2;
  const w = Math.ceil(disc * 2 + pad * 2);
  const h = Math.ceil(pad + disc + reach + tail + pad);
  const c = makeCanvas(w, h);
  const ctx = c.getContext("2d");
  const cx = w / 2;
  const pivotY = pad + disc + reach;
  ctx.fillStyle = "#c62a1f";
  const rod = Math.max(1.2, rad * 0.03);
  ctx.fillRect(cx - rod / 2, pivotY - reach, rod, reach + tail);
  circle(ctx, cx, pivotY - reach, disc);
  ctx.fill();
  circle(ctx, cx, pivotY, Math.max(1.5, rad * 0.045));
  ctx.fill();
  return { canvas: c, originY: pivotY / h };
}

// ── canvas helpers ──────────────────────────────────────────────────────────

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function roundRect(ctx, x, y, w, h, r) {
  const rr =
    typeof r === "number" ? { tl: r, tr: r, br: r, bl: r } : r;
  ctx.beginPath();
  ctx.moveTo(x + rr.tl, y);
  ctx.lineTo(x + w - rr.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr.tr);
  ctx.lineTo(x + w, y + h - rr.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr.br, y + h);
  ctx.lineTo(x + rr.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr.bl);
  ctx.lineTo(x, y + rr.tl);
  ctx.quadraticCurveTo(x, y, x + rr.tl, y);
  ctx.closePath();
}

// letter-spacing on a canvas is recent; without it the text is just tighter
function trySpacing(ctx, value) {
  try {
    ctx.letterSpacing = value;
  } catch (e) {
    // older canvas: no spacing
  }
}

function radial(size, rgb, stops) {
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
  for (const [o, a] of stops) r.addColorStop(o, `rgba(${rgb},${a})`);
  g.fillStyle = r;
  g.fillRect(0, 0, size, size);
  return c;
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
