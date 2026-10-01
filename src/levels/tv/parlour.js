/** The parlour for TV, painted dark as a storybook night: walls of deep
 *  walnut boards with a panelled wainscot under a moulded rail, the boards
 *  of the floor running back to them, a deep red rug laid where the set
 *  stands. Tall windows look out on a moonlit valley; their sheer curtains
 *  hang open from brass rods, swept aside and tied back with gold, glowing
 *  where the moon comes through them, and the moon lays its light on the
 *  floor. A tall plant to the left of the set, a small round table with a
 *  lamp still lit to the right, framed pictures over them — whichever of
 *  those the screen has room for.
 *
 *  The set itself is the DOM cabinet (TVScene) standing on the rug; its
 *  screen lights the wall behind and the floor in front, and the lamp warms
 *  its side. What lives stays out of the painting: the scene breathes the
 *  lamp's `glow`, flickers the screen's `light` and `pool`, and drifts the
 *  dust through them.
 *
 *  `tv` is the set's box from TVScene: centre, scale and the layout mode —
 *  "wide" (a window on each side of the set), "tall" (a phone held upright:
 *  one big window behind the set, the captions under it) or "low" (a phone
 *  on its side: the set to the left, one window behind the captions on the
 *  right). */

const ROOM = "tv_room";
const LIGHT = "tv_light";
const POOL = "tv_pool";
const GLOW = "tv_lamp";

export function layoutParlour(W, H, tv) {
  const { cx, cy, s, mode } = tv;
  const S = Math.min(W, H);
  const left = cx - 300 * s;
  const right = cx + 300 * s;
  const top = cy - 240 * s;
  const bottom = cy + 240 * s;
  const feet = cy + 316 * s;
  const floorY = mode === "wide" ? H * 0.63 : Math.min(H * 0.8, cy + 150 * s);
  const side = 54 * s; // how far the plant and the table stand off the set
  const fits = (x, half) => x - half > 4 && x + half < W - 4;

  // the windows
  const windows = [];
  if (mode === "wide") {
    const gap = left;
    const ww = Math.min(gap * 0.62, 230 * s);
    const wx = gap * 0.42;
    for (const x of [wx, W - wx]) {
      windows.push({
        x0: x - ww / 2,
        x1: x + ww / 2,
        top: H * 0.15,
        sill: floorY - H * 0.1,
      });
    }
    windows[0].moon = true;
  } else if (mode === "tall") {
    windows.push({
      x0: W * 0.06,
      x1: W * 0.94,
      top: Math.max(H * 0.05, top - H * 0.13),
      sill: floorY - 26 * s,
      moon: true,
    });
  } else {
    const x0 = tv.subs.x - W * 0.01;
    windows.push({
      x0,
      x1: W - W * 0.03,
      top: H * 0.1,
      sill: floorY - H * 0.06,
      moon: true,
    });
  }

  // what stands beside the set, if there is room for it
  const plantX = left - side;
  const plant =
    mode !== "tall" && fits(plantX, 40 * s)
      ? { x: plantX, base: feet + 2 * s, h: 250 * s }
      : null;
  const tableX = right + side;
  const hasTable = mode === "wide" && fits(tableX, 60 * s);
  const table = hasTable
    ? { x: tableX, top: feet - 150 * s, r: 46 * s, h: 150 * s }
    : null;
  const lamp = table
    ? { x: table.x, y: table.top - 118 * s, shadeW: 64 * s }
    : null;
  const clearOfWindows = (x, w) =>
    windows.every((wn) => x + w / 2 < wn.x0 - 8 || x - w / 2 > wn.x1 + 8);
  const frames = [];
  if (plant && clearOfWindows(plantX, 78 * s))
    frames.push({
      x: plantX,
      y: H * 0.27,
      w: 78 * s,
      h: 96 * s,
      tilt: -0.03,
      seed: 5,
    });
  if (table && clearOfWindows(tableX, 90 * s))
    frames.push({
      x: tableX,
      y: H * 0.26,
      w: 90 * s,
      h: 72 * s,
      tilt: 0.025,
      seed: 11,
    });

  return {
    W,
    H,
    S,
    s,
    cx,
    cy,
    left,
    right,
    top,
    bottom,
    feet,
    floorY,
    mode,
    rug: { cx, cy: feet + 12 * s, rx: Math.min(400 * s, W * 0.49), ry: 74 * s },
    windows,
    plant,
    table,
    lamp,
    frames,
  };
}

export function paintParlour(scene, L) {
  const { W, H } = L;
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext("2d");
  paintWall(ctx, L);
  for (const w of L.windows) paintWindow(ctx, L, w);
  paintFloor(ctx, L);
  paintRug(ctx, L);
  paintFrames(ctx, L);
  if (L.plant) paintPlant(ctx, L);
  if (L.table) paintTable(ctx, L);
  finish(ctx, L);

  const t = scene.textures;
  addCanvas(t, ROOM, cv);
  addCanvas(
    t,
    LIGHT,
    radial(256, "170,196,255", [
      [0, 0.5],
      [0.35, 0.18],
      [0.7, 0.04],
      [1, 0],
    ]),
  );
  addCanvas(
    t,
    POOL,
    radial(256, "186,206,255", [
      [0, 0.42],
      [0.4, 0.14],
      [1, 0],
    ]),
  );
  addCanvas(
    t,
    GLOW,
    radial(128, "255,188,108", [
      [0, 0.85],
      [0.2, 0.45],
      [0.55, 0.12],
      [1, 0],
    ]),
  );
  return { room: ROOM, light: LIGHT, pool: POOL, glow: GLOW };
}

export function releaseParlourArt(textures) {
  for (const key of [ROOM, LIGHT, POOL, GLOW]) {
    if (textures.exists(key)) textures.remove(key);
  }
}

// ── the walls ───────────────────────────────────────────────────────────────

// deep walnut boards, a moulded rail, raised panels under it; the screen's
// cold light behind the set, the lamp's warmth by the table
function paintWall(ctx, L) {
  const { W, H, S, floorY, cx, cy, s, lamp } = L;
  const g = ctx.createLinearGradient(0, 0, 0, floorY);
  g.addColorStop(0, "#0a0604");
  g.addColorStop(0.5, "#140c07");
  g.addColorStop(1, "#110a06");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, floorY);
  const rnd = lcg(4401);
  const railY = floorY - (floorY - H * 0.08) * 0.36;
  // the boards above the rail
  const bw = Math.max(26, S * 0.06);
  for (let x = 0; x < W; x += bw) {
    const tone = 0.7 + 0.5 * rnd();
    ctx.fillStyle = `rgba(${Math.round(70 * tone)},${Math.round(42 * tone)},${Math.round(24 * tone)},0.22)`;
    ctx.fillRect(x, 0, bw, railY);
    for (let k = 0; k < 5; k++) {
      const gx = x + rnd() * bw;
      const ph = rnd() * 6.28;
      ctx.beginPath();
      for (let y = 0; y <= railY; y += 14) {
        const px = gx + Math.sin(y * 0.012 + ph) * 2.2;
        if (y) ctx.lineTo(px, y);
        else ctx.moveTo(px, y);
      }
      ctx.strokeStyle =
        rnd() < 0.75 ? "rgba(0,0,0,0.3)" : "rgba(255,190,140,0.035)";
      ctx.lineWidth = 0.8 + rnd();
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(x, 0, 1.5, railY);
    ctx.fillStyle = "rgba(255,190,140,0.04)";
    ctx.fillRect(x + 1.5, 0, 1, railY);
  }
  // the wainscot: raised panels under the rail
  const pw = Math.max(70, S * 0.16);
  const ph = floorY - railY;
  for (let x = -pw * 0.3; x < W; x += pw) {
    const px = x + pw * 0.1;
    const py = railY + ph * 0.16;
    const pww = pw * 0.8;
    const phh = ph * 0.62;
    ctx.fillStyle = "rgba(60,36,20,0.22)";
    ctx.fillRect(px, py, pww, phh);
    ctx.fillStyle = "rgba(255,190,140,0.06)";
    ctx.fillRect(px, py, pww, 1.2);
    ctx.fillRect(px, py, 1.2, phh);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(px, py + phh - 1.2, pww, 1.2);
    ctx.fillRect(px + pww - 1.2, py, 1.2, phh);
  }
  // the rail
  const rh = Math.max(4, S * 0.012);
  const rg = ctx.createLinearGradient(0, railY - rh, 0, railY + rh);
  rg.addColorStop(0, "#3a2414");
  rg.addColorStop(0.4, "#24150c");
  rg.addColorStop(1, "#0c0704");
  ctx.fillStyle = rg;
  ctx.fillRect(0, railY - rh, W, rh * 2);
  ctx.fillStyle = "rgba(255,200,150,0.12)";
  ctx.fillRect(0, railY - rh, W, 1);
  // the ceiling's dark and the picture rail
  const ceil = ctx.createLinearGradient(0, 0, 0, H * 0.14);
  ceil.addColorStop(0, "rgba(0,0,0,0.75)");
  ceil.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = ceil;
  ctx.fillRect(0, 0, W, H * 0.14);
  ctx.fillStyle = "#0e0905";
  ctx.fillRect(0, H * 0.06, W, Math.max(3, S * 0.008));
  ctx.fillStyle = "rgba(255,200,150,0.08)";
  ctx.fillRect(0, H * 0.06, W, 1);
  // the screen's cold light behind the set, the lamp's warmth beside it
  soft(ctx, cx, cy - 20 * s, 480 * s, 340 * s, "100,130,200", 0.16, "lighter");
  if (lamp)
    soft(
      ctx,
      lamp.x,
      lamp.y + 10 * s,
      S * 0.2,
      S * 0.18,
      "255,160,80",
      0.16,
      "lighter",
    );
}

// a tall window: the moonlit valley beyond, a sash of dark wood, a sill,
// and the sheer curtains open on either side
function paintWindow(ctx, L, w) {
  const { S, W } = L;
  const { x0, x1, top, sill } = w;
  const ww = x1 - x0;
  const wh = sill - top;
  const fw = Math.max(6, S * 0.014); // the casing
  // the moon's light on the wall round it
  soft(
    ctx,
    (x0 + x1) / 2,
    (top + sill) / 2,
    ww * 0.9,
    wh * 0.75,
    "90,120,190",
    0.1,
    "lighter",
  );
  // the casing
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = S * 0.02;
  ctx.fillStyle = "#1c110a";
  ctx.fillRect(x0 - fw, top - fw, ww + fw * 2, wh + fw * 2);
  ctx.restore();
  ctx.fillStyle = "rgba(160,180,230,0.14)";
  ctx.fillRect(x0 - fw, top - fw, ww + fw * 2, 1);
  // the night outside
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, top, ww, wh);
  ctx.clip();
  const sky = ctx.createLinearGradient(0, top, 0, sill);
  sky.addColorStop(0, "#040817");
  sky.addColorStop(0.65, "#0e1a3a");
  sky.addColorStop(1, "#1a2a50");
  ctx.fillStyle = sky;
  ctx.fillRect(x0, top, ww, wh);
  const rnd = lcg(Math.round(x0 * 13 + top));
  for (let i = 0; i < (ww * wh) / 700; i++) {
    ctx.fillStyle = `rgba(230,236,255,${(0.25 + rnd() * 0.6).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(
      x0 + rnd() * ww,
      top + rnd() * wh * 0.7,
      0.4 + rnd() * 0.8,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  if (w.moon) {
    const mr = Math.max(6, Math.min(ww, wh) * 0.07);
    const mx = x0 + ww * 0.7;
    const my = top + wh * 0.2;
    soft(ctx, mx, my, mr * 5, mr * 5, "160,180,235", 0.22, "lighter");
    const mg = ctx.createRadialGradient(
      mx - mr * 0.3,
      my - mr * 0.3,
      mr * 0.1,
      mx,
      my,
      mr,
    );
    mg.addColorStop(0, "#f6f2e6");
    mg.addColorStop(0.75, "#ddd6c4");
    mg.addColorStop(1, "#a8a090");
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
    soft(
      ctx,
      mx - mr * 0.3,
      my - mr * 0.15,
      mr * 0.3,
      mr * 0.22,
      "100,100,110",
      0.25,
    );
    soft(
      ctx,
      mx + mr * 0.28,
      my + mr * 0.2,
      mr * 0.26,
      mr * 0.2,
      "100,100,110",
      0.2,
    );
  }
  // the valley: a far ridge in the moonlight, a nearer dark one, a few lights
  const ridge = (base, amp, f, ph, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x0, sill);
    for (let x = x0; x <= x1 + 4; x += 4) {
      const u = x / W;
      ctx.lineTo(
        x,
        base -
          amp *
            (0.6 +
              0.4 * Math.sin(u * f + ph) +
              0.2 * Math.sin(u * f * 2.7 + ph)),
      );
    }
    ctx.lineTo(x1, sill);
    ctx.closePath();
    ctx.fill();
  };
  ridge(top + wh * 0.8, wh * 0.08, 9, 1.3, "#14203e");
  ridge(top + wh * 0.9, wh * 0.06, 14, 0.4, "#070b18");
  for (let i = 0; i < 4; i++) {
    soft(
      ctx,
      x0 + ww * (0.15 + rnd() * 0.7),
      top + wh * (0.85 + rnd() * 0.06),
      3,
      2,
      "255,200,120",
      0.8,
    );
  }
  ctx.restore();
  // the sashes: a meeting rail, a mullion, glazing bars; the moon on their edges
  const bar = Math.max(2, S * 0.005);
  const rail = Math.max(3, S * 0.009);
  const wood = "#160d07";
  ctx.fillStyle = wood;
  ctx.fillRect(x0, top + wh * 0.52 - rail / 2, ww, rail);
  ctx.fillRect((x0 + x1) / 2 - rail / 2, top, rail, wh);
  for (const f of [0.26, 0.76])
    ctx.fillRect(x0, top + wh * f - bar / 2, ww, bar);
  for (const f of [0.25, 0.75])
    ctx.fillRect(x0 + ww * f - bar / 2, top, bar, wh);
  ctx.fillStyle = "rgba(170,190,240,0.25)";
  ctx.fillRect(x0, top + wh * 0.52 - rail / 2, ww, 1);
  ctx.fillRect((x0 + x1) / 2 - rail / 2, top, 1, wh);
  // the glass, a cold sheen across it
  const gl = ctx.createLinearGradient(x0, top, x1, sill);
  gl.addColorStop(0, "rgba(200,220,255,0.06)");
  gl.addColorStop(0.4, "rgba(200,220,255,0)");
  gl.addColorStop(0.6, "rgba(200,220,255,0.03)");
  gl.addColorStop(1, "rgba(200,220,255,0)");
  ctx.fillStyle = gl;
  ctx.fillRect(x0, top, ww, wh);
  // the sill
  const sh = Math.max(4, S * 0.012);
  const sg = ctx.createLinearGradient(0, sill, 0, sill + sh * 2);
  sg.addColorStop(0, "#3a2414");
  sg.addColorStop(1, "#0e0805");
  ctx.fillStyle = sg;
  ctx.fillRect(x0 - fw * 1.8, sill, ww + fw * 3.6, sh * 2);
  ctx.fillStyle = "rgba(170,190,240,0.28)";
  ctx.fillRect(x0 - fw * 1.8, sill, ww + fw * 3.6, 1);
  paintCurtains(ctx, L, w);
}

// Sheer voile hanging from a brass rod, swept to either side of the window
// and tied back with gold: dim against the wall, glowing where the moon is
// behind it, its folds gathering at the tie and opening again below
function paintCurtains(ctx, L, w) {
  const { S } = L;
  const { x0, x1, top, sill } = w;
  const ww = x1 - x0;
  const wh = sill - top;
  const rodY = top - Math.max(10, S * 0.03);
  const mid = (x0 + x1) / 2;
  // the rod, its finials
  const ext = ww * 0.1;
  const rg = ctx.createLinearGradient(0, rodY - 3, 0, rodY + 3);
  rg.addColorStop(0, "#f6dc9a");
  rg.addColorStop(0.5, "#a8823e");
  rg.addColorStop(1, "#4a3418");
  ctx.fillStyle = rg;
  ctx.fillRect(
    x0 - ext,
    rodY - Math.max(1.5, S * 0.003),
    ww + ext * 2,
    Math.max(3, S * 0.006),
  );
  for (const fx of [x0 - ext, x1 + ext]) {
    const fg = ctx.createRadialGradient(
      fx - 1,
      rodY - 1,
      0.5,
      fx,
      rodY,
      Math.max(3, S * 0.008),
    );
    fg.addColorStop(0, "#fbe3a0");
    fg.addColorStop(1, "#5a3e18");
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(fx, rodY, Math.max(3, S * 0.008), 0, Math.PI * 2);
    ctx.fill();
  }
  const hem = sill + wh * 0.03;
  const tieY = top + wh * 0.6;
  for (const sideSign of [-1, 1]) {
    ctx.save();
    // draw the left panel; mirror it for the right
    if (sideSign > 0) {
      ctx.translate(mid * 2, 0);
      ctx.scale(-1, 1);
    }
    const outer = x0 - ww * 0.07;
    const innerTop = mid - ww * 0.03;
    const tieX = x0 + ww * 0.11;
    const hemIn = x0 + ww * 0.17;
    const shape = () => {
      ctx.beginPath();
      ctx.moveTo(outer, rodY);
      ctx.lineTo(innerTop, rodY);
      ctx.quadraticCurveTo(mid - ww * 0.08, top + wh * 0.32, tieX, tieY);
      ctx.quadraticCurveTo(tieX + ww * 0.01, tieY + wh * 0.2, hemIn, hem);
      ctx.lineTo(outer - ww * 0.01, hem);
      ctx.closePath();
    };
    shape();
    ctx.fillStyle = "rgba(200,212,240,0.09)";
    ctx.fill();
    // where the moon is behind it, it glows
    ctx.save();
    shape();
    ctx.clip();
    ctx.beginPath();
    ctx.rect(x0, top, ww, wh);
    ctx.clip();
    ctx.fillStyle = "rgba(190,210,255,0.14)";
    ctx.fillRect(x0, top, ww, wh);
    ctx.restore();
    // the folds: open at the rod, gathered at the tie, open again at the hem
    const n = 11;
    for (let i = 1; i < n; i++) {
      const u = i / n;
      const a = { x: outer + (innerTop - outer) * u, y: rodY };
      const b = { x: outer + (tieX - outer) * u, y: tieY };
      const c = {
        x: outer - ww * 0.01 + (hemIn - outer + ww * 0.01) * u,
        y: hem,
      };
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(a.x + (b.x - a.x) * 0.25, top + wh * 0.32, b.x, b.y);
      ctx.quadraticCurveTo(b.x, b.y + wh * 0.2, c.x, c.y);
      ctx.strokeStyle = i % 2 ? "rgba(230,238,255,0.2)" : "rgba(0,0,0,0.18)";
      ctx.lineWidth = Math.max(1, S * (i % 2 ? 0.0018 : 0.0026));
      ctx.stroke();
    }
    // its free edge, bright
    ctx.beginPath();
    ctx.moveTo(innerTop, rodY);
    ctx.quadraticCurveTo(mid - ww * 0.08, top + wh * 0.32, tieX, tieY);
    ctx.quadraticCurveTo(tieX + ww * 0.01, tieY + wh * 0.2, hemIn, hem);
    ctx.strokeStyle = "rgba(235,242,255,0.45)";
    ctx.lineWidth = Math.max(1.2, S * 0.0026);
    ctx.stroke();
    // the hem
    ctx.beginPath();
    ctx.moveTo(outer - ww * 0.01, hem);
    ctx.lineTo(hemIn, hem);
    ctx.strokeStyle = "rgba(225,232,255,0.3)";
    ctx.lineWidth = Math.max(1.5, S * 0.004);
    ctx.stroke();
    // the gold tie-back, a little bow
    const tb = Math.max(2.5, S * 0.006);
    const tg = ctx.createLinearGradient(0, tieY - tb, 0, tieY + tb);
    tg.addColorStop(0, "#fbe3a0");
    tg.addColorStop(0.5, "#c8a050");
    tg.addColorStop(1, "#5a3e18");
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.ellipse(
      (outer + tieX) / 2,
      tieY,
      (tieX - outer) / 2 + tb,
      tb,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    const bx = tieX;
    ctx.beginPath();
    ctx.ellipse(
      bx + tb * 1.6,
      tieY - tb * 0.8,
      tb * 1.8,
      tb * 1.1,
      -0.5,
      0,
      Math.PI * 2,
    );
    ctx.ellipse(
      bx + tb * 1.6,
      tieY + tb * 0.8,
      tb * 1.8,
      tb * 1.1,
      0.5,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.strokeStyle = "#c8a050";
    ctx.lineWidth = Math.max(1, tb * 0.6);
    ctx.beginPath();
    ctx.moveTo(bx + tb * 0.5, tieY);
    ctx.quadraticCurveTo(
      bx + tb * 2,
      tieY + tb * 4,
      bx + tb * 1.2,
      tieY + tb * 7,
    );
    ctx.stroke();
    ctx.restore();
  }
}

// ── the floor ───────────────────────────────────────────────────────────────

function paintFloor(ctx, L) {
  const { W, H, S, floorY, cx, feet, s } = L;
  const g = ctx.createLinearGradient(0, floorY, 0, H);
  g.addColorStop(0, "#110b07");
  g.addColorStop(0.5, "#1a120c");
  g.addColorStop(1, "#0e0805");
  ctx.fillStyle = g;
  ctx.fillRect(0, floorY, W, H - floorY);
  const vp = { x: W / 2, y: floorY - (H - floorY) * 1.2 };
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 1;
  for (let i = -24; i <= 24; i++) {
    const bx = W / 2 + i * Math.max(30, W * 0.06);
    const t = (floorY - vp.y) / (H - vp.y);
    ctx.beginPath();
    ctx.moveTo(vp.x + (bx - vp.x) * t, floorY);
    ctx.lineTo(bx, H);
    ctx.stroke();
  }
  const rnd = lcg(515);
  for (let i = 0; i < 260; i++) {
    const y = floorY + rnd() * (H - floorY);
    ctx.fillStyle =
      rnd() < 0.65 ? "rgba(0,0,0,0.16)" : "rgba(255,200,150,0.03)";
    ctx.fillRect(rnd() * W, y, 4 + rnd() * 24, 1);
  }
  // the moon through each window, lying on the boards
  for (const w of L.windows) {
    const wx = (w.x0 + w.x1) / 2;
    soft(
      ctx,
      wx + (w.x1 - w.x0) * 0.1,
      floorY + (H - floorY) * 0.28,
      (w.x1 - w.x0) * 0.55,
      (H - floorY) * 0.16,
      "120,150,220",
      0.09,
      "lighter",
    );
  }
  // the screen's light on the floor in front of the set
  soft(ctx, cx, feet + 20 * s, 360 * s, 64 * s, "150,176,240", 0.1, "lighter");
  // the skirting
  ctx.fillStyle = "#0c0805";
  ctx.fillRect(0, floorY - S * 0.022, W, S * 0.022);
  ctx.fillStyle = "rgba(160,180,230,0.1)";
  ctx.fillRect(0, floorY - S * 0.022, W, 1);
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, floorY, W, 2);
}

// an oval rug, deep red with a gold and navy border and a star in the middle
function paintRug(ctx, L) {
  const { rug, S } = L;
  const { cx, cy, rx, ry } = rug;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = S * 0.012;
  ctx.fillStyle = "#3e1512";
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  for (const [k, col, w] of [
    [0.95, "#8a6630", 2.2],
    [0.88, "#131c34", 4],
    [0.82, "#8a6630", 1.4],
  ]) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * k, ry * k, 0, 0, Math.PI * 2);
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1, (w * S) / 900);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(138,102,48,0.45)";
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.2, ry * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3e1512";
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.14, ry * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  star(ctx, cx, cy, ry * 0.16, "rgba(184,146,74,0.7)");
  ctx.strokeStyle = "rgba(200,180,140,0.25)";
  ctx.lineWidth = 1;
  for (const side of [-1, 1]) {
    for (let i = -6; i <= 6; i++) {
      const a = i * 0.045;
      const x = cx + side * rx * Math.cos(a);
      const y = cy + ry * Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + side * ry * 0.16, y + 1);
      ctx.stroke();
    }
  }
}

// framed pictures: a little night landscape under a moon
function paintFrames(ctx, L) {
  const { S } = L;
  for (const f of L.frames) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.tilt);
    const { w, h } = f;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
    const fg = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    fg.addColorStop(0, "#a8823e");
    fg.addColorStop(0.5, "#5a4018");
    fg.addColorStop(1, "#8a6a32");
    ctx.fillStyle = fg;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    const b = Math.max(3, S * 0.008);
    const pg = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    pg.addColorStop(0, "#060a18");
    pg.addColorStop(0.7, "#142040");
    pg.addColorStop(1, "#0a1020");
    ctx.fillStyle = pg;
    ctx.fillRect(-w / 2 + b, -h / 2 + b, w - b * 2, h - b * 2);
    const rnd = lcg(f.seed * 131);
    const mx = -w * 0.2 + rnd() * w * 0.4;
    const my = -h * 0.25;
    soft(ctx, mx, my, w * 0.2, w * 0.2, "200,215,255", 0.3, "lighter");
    ctx.fillStyle = "#e8e4d6";
    ctx.beginPath();
    ctx.arc(mx, my, Math.max(1.5, w * 0.045), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#070b16";
    ctx.beginPath();
    ctx.moveTo(-w / 2 + b, h / 2 - b);
    for (let x = -w / 2 + b; x <= w / 2 - b; x += 3) {
      const u = (x + w / 2) / w;
      ctx.lineTo(x, h * 0.12 + Math.sin(u * 6 + f.seed) * h * 0.08);
    }
    ctx.lineTo(w / 2 - b, h / 2 - b);
    ctx.closePath();
    ctx.fill();
    const gl = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    gl.addColorStop(0, "rgba(255,255,255,0.08)");
    gl.addColorStop(0.5, "rgba(255,255,255,0)");
    ctx.fillStyle = gl;
    ctx.fillRect(-w / 2 + b, -h / 2 + b, w - b * 2, h - b * 2);
    ctx.restore();
  }
}

// a tall plant in a terracotta pot, its leaves catching the screen's light
function paintPlant(ctx, L) {
  const { plant, S, s } = L;
  const { x, base, h } = plant;
  const pw = 58 * s;
  const ph = 54 * s;
  soft(ctx, x + pw, base, pw * 1.6, ph * 0.3, "0,0,0", 0.6);
  const pot = () => {
    ctx.beginPath();
    ctx.moveTo(x - pw / 2, base - ph);
    ctx.lineTo(x + pw / 2, base - ph);
    ctx.lineTo(x + pw * 0.38, base);
    ctx.lineTo(x - pw * 0.38, base);
    ctx.closePath();
  };
  pot();
  ctx.fillStyle = "#5a2e1a";
  ctx.fill();
  const pg = ctx.createLinearGradient(x - pw / 2, 0, x + pw / 2, 0);
  pg.addColorStop(0, "rgba(0,0,0,0.45)");
  pg.addColorStop(0.6, "rgba(160,180,240,0.1)");
  pg.addColorStop(1, "rgba(0,0,0,0.4)");
  pot();
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.fillStyle = "#6a3820";
  ctx.fillRect(x - pw * 0.56, base - ph, pw * 1.12, ph * 0.2);
  ctx.fillStyle = "rgba(170,190,240,0.15)";
  ctx.fillRect(x - pw * 0.56, base - ph, pw * 1.12, Math.max(1, S * 0.002));
  const rnd = lcg(77);
  const top = base - ph;
  for (let i = 0; i < 11; i++) {
    const a = -Math.PI / 2 + (rnd() - 0.5) * 1.5;
    const len = h * (0.45 + rnd() * 0.55);
    const ex = x + Math.cos(a) * len;
    const ey = top + Math.sin(a) * len;
    const bend = (rnd() - 0.5) * len * 0.5;
    ctx.strokeStyle = "#1a2e1e";
    ctx.lineWidth = Math.max(1, s * 2.2);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.quadraticCurveTo(x + bend, top + (ey - top) * 0.5, ex, ey);
    ctx.stroke();
    const lw = h * (0.07 + rnd() * 0.05);
    const ll = h * (0.22 + rnd() * 0.14);
    const la = a + (rnd() - 0.5) * 0.6;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(la + Math.PI / 2);
    const lg = ctx.createLinearGradient(-lw, 0, lw, 0);
    lg.addColorStop(0, "#3e6a4a");
    lg.addColorStop(0.45, "#1e3e28");
    lg.addColorStop(1, "#0e2216");
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-lw, -ll * 0.45, 0, -ll);
    ctx.quadraticCurveTo(lw, -ll * 0.45, 0, 0);
    ctx.fill();
    ctx.strokeStyle = "rgba(180,220,200,0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -ll * 0.9);
    ctx.stroke();
    ctx.restore();
  }
}

// a round side table with a lamp lit under its shade and a cup beside it
function paintTable(ctx, L) {
  const { table, lamp, S, s, feet } = L;
  const { x, top, r, h } = table;
  soft(ctx, x, feet + 6 * s, r * 1.6, r * 0.3, "0,0,0", 0.6);
  ctx.fillStyle = "#140c07";
  for (const dx of [-0.55, 0, 0.55]) {
    ctx.beginPath();
    ctx.moveTo(x, top + h * 0.55);
    ctx.lineTo(x + dx * r, feet);
    ctx.lineTo(x + dx * r + 6 * s, feet);
    ctx.lineTo(x + 3 * s, top + h * 0.55);
    ctx.closePath();
    ctx.fill();
  }
  const sg = ctx.createLinearGradient(x - 6 * s, 0, x + 6 * s, 0);
  sg.addColorStop(0, "#3a2414");
  sg.addColorStop(0.5, "#6a4428");
  sg.addColorStop(1, "#140c07");
  ctx.fillStyle = sg;
  ctx.fillRect(x - 6 * s, top + r * 0.2, 12 * s, h * 0.5);
  ctx.fillStyle = "#140c07";
  ctx.beginPath();
  ctx.ellipse(x, top + r * 0.22, r, r * 0.3, 0, 0, Math.PI);
  ctx.lineTo(x - r, top + r * 0.1);
  ctx.fill();
  const tg = ctx.createRadialGradient(x, top + r * 0.1, 0, x, top + r * 0.1, r);
  tg.addColorStop(0, "#6a4428");
  tg.addColorStop(1, "#2a1a0e");
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.ellipse(x, top + r * 0.1, r, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,190,130,0.3)";
  ctx.lineWidth = Math.max(1, S * 0.002);
  ctx.stroke();
  const cx = x + r * 0.55;
  const cy = top + r * 0.12;
  ctx.fillStyle = "#cfc2a6";
  ctx.fillRect(cx - 7 * s, cy - 16 * s, 14 * s, 16 * s);
  ctx.strokeStyle = "#cfc2a6";
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.arc(cx + 9 * s, cy - 9 * s, 4 * s, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(cx - 7 * s, cy - 16 * s, 14 * s, 2 * s);
  const { shadeW } = lamp;
  const ly = lamp.y;
  const bg = ctx.createLinearGradient(x - 12 * s, 0, x + 12 * s, 0);
  bg.addColorStop(0, "#fbe3a0");
  bg.addColorStop(0.4, "#c8a050");
  bg.addColorStop(1, "#5a3e18");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(x, top + r * 0.1, 14 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 2.5 * s, ly + 30 * s, 5 * s, top + r * 0.1 - ly - 30 * s);
  soft(
    ctx,
    x,
    ly + 8 * s,
    shadeW * 1.3,
    shadeW * 1.1,
    "255,180,100",
    0.45,
    "lighter",
  );
  const shade = ctx.createLinearGradient(x - shadeW / 2, 0, x + shadeW / 2, 0);
  shade.addColorStop(0, "#a8703a");
  shade.addColorStop(0.35, "#ffd090");
  shade.addColorStop(0.7, "#f0bc78");
  shade.addColorStop(1, "#7a4a22");
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.moveTo(x - shadeW * 0.3, ly - 30 * s);
  ctx.lineTo(x + shadeW * 0.3, ly - 30 * s);
  ctx.lineTo(x + shadeW * 0.5, ly + 30 * s);
  ctx.lineTo(x - shadeW * 0.5, ly + 30 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,240,200,0.45)";
  ctx.fillRect(x - shadeW * 0.3, ly - 30 * s, shadeW * 0.6, Math.max(1, s));
  ctx.fillStyle = "rgba(70,40,16,0.6)";
  ctx.fillRect(x - shadeW * 0.5, ly + 29 * s, shadeW, Math.max(1, s * 1.5));
  soft(
    ctx,
    x,
    ly + 34 * s,
    shadeW * 0.5,
    10 * s,
    "255,220,160",
    0.55,
    "lighter",
  );
}

function finish(ctx, L) {
  const { W, H } = L;
  const R = Math.hypot(W, H) / 2;
  const v = ctx.createRadialGradient(
    W / 2,
    H * 0.46,
    R * 0.3,
    W / 2,
    H * 0.46,
    R * 1.05,
  );
  v.addColorStop(0, "rgba(2,2,6,0)");
  v.addColorStop(1, "rgba(2,2,6,0.72)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H, 0.03);
}

// ── helpers ─────────────────────────────────────────────────────────────────

function star(ctx, x, y, r, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const rr = i % 2 ? r * 0.35 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function soft(ctx, cx, cy, rx, ry, rgbs, a, op = "source-over") {
  if (rx <= 0 || ry <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.translate(cx, cy);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(${rgbs},${a})`);
  g.addColorStop(0.45, `rgba(${rgbs},${a * 0.4})`);
  g.addColorStop(1, `rgba(${rgbs},0)`);
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
