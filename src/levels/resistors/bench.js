import { RESISTORS, BAND_PAINT, BAND_COLOURS, BAND_DIGITS } from "./puzzle.js";
import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";

/** The workbench for RESISTORS, painted like the game's storybook nights: a
 *  dark workshop, a bench under a magnifier lamp whose ring of light falls
 *  on a green circuit board. On the board, four big resistors in a row,
 *  R1 to R4, each with its four colour bands; round them the usual company
 *  of a board — an IC, capacitors, traces and pads. Pinned to the bench, a
 *  card with the colour code: ten swatches, black to white, a digit under
 *  each. A soldering iron rests in its stand, its tip still hot.
 *
 *  Painted once per screen size: the bench with everything on it; a loupe
 *  view of each resistor, for a closer look; the glow. */

const K = { room: "rs_room", glow: "rs_glow" };
const loupeKey = (i) => `rs_loupe_${i}`;
export const LABEL_FONT = '"Courier New", Courier, monospace';
const LAMP = "255,236,200";

// ── where everything is ─────────────────────────────────────────────────────

export function layoutBench(W, H) {
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, u };
  // the board, a little left of the middle, seen flat
  const bw = Math.min(W * 0.6, H * 0.78 * 1.5);
  const bh = bw / 1.5;
  L.board = { x: W * 0.42 - bw / 2, y: H * 0.52 - bh / 2, w: bw, h: bh };
  const b = L.board;
  // the four resistors in a row across the board's middle
  const len = bw * 0.17;
  L.resistors = RESISTORS.map((bands, i) => ({
    i,
    bands,
    x: b.x + bw * (0.14 + i * 0.24),
    y: b.y + bh * 0.56,
    len,
    r: len * 0.17,
  }));
  // the lamp: its arm from the top right, the lens over the board's corner,
  // clear of the resistors
  L.lens = { x: b.x + bw * 0.9, y: b.y + bh * 0.1, r: Math.min(bw * 0.12, H * 0.1) };
  L.arm = { x0: W * 0.96, y0: -H * 0.05, x1: W * 0.8, y1: H * 0.1 };
  // the colour code card, pinned on the bench below the board
  const cw = Math.min(W * 0.46, bw * 0.9);
  L.card = { x: b.x + bw / 2 - cw / 2, y: b.y + bh + H * 0.035, w: cw, h: Math.min(H * 0.1, cw * 0.2) };
  if (L.card.y + L.card.h > H - 6 * u) L.card.y = H - 6 * u - L.card.h;
  // the iron in its stand to the right
  L.iron = { x: W * 0.86, y: H * 0.72, s: u };
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintBench(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  paintRoom(ctx, L);
  paintBoard(ctx, L);
  for (const r of L.resistors) paintResistor(ctx, L, r, 1);
  paintSilkscreen(ctx, L);
  paintCard(ctx, L);
  paintIron(ctx, L);
  paintLamp(ctx, L);
  vignette(ctx, W, H, 0.65);
  grain(ctx, W, H, 0.035);
  addCanvasTexture(t, K.room, c);
  const loupes = L.resistors.map((r) => {
    addCanvasTexture(t, loupeKey(r.i), paintLoupe(L, r));
    return { key: loupeKey(r.i), x: r.x, y: r.y, i: r.i };
  });
  addCanvasTexture(t, K.glow, glowCanvas());
  return { keys: K, loupes };
}

export function releaseBenchArt(textures) {
  for (const key of [...Object.values(K), ...RESISTORS.map((_, i) => loupeKey(i))]) {
    if (textures.exists(key)) textures.remove(key);
  }
}

// the workshop: a wall of pegboard and shadow, the bench's scarred top
function paintRoom(ctx, L) {
  const { W, H, u } = L;
  const rnd = lcg(3303);
  ctx.fillStyle = "#121216";
  ctx.fillRect(0, 0, W, H);
  // the pegboard, in the dark behind
  const benchY = H * 0.3;
  ctx.fillStyle = "#1c1a18";
  ctx.fillRect(0, 0, W, benchY);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  for (let y = 10 * u; y < benchY; y += 22 * u) {
    for (let x = 10 * u; x < W; x += 22 * u) {
      ctx.beginPath();
      ctx.arc(x, y, 2 * u, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // tools hanging from it: a few dark silhouettes
  ctx.fillStyle = "#0c0c0e";
  for (const [fx, w, h] of [
    [0.08, 14, 120],
    [0.14, 30, 90],
    [0.2, 10, 140],
    [0.6, 22, 110],
    [0.68, 12, 150],
  ]) {
    ctx.fillRect(W * fx, 6 * u, w * u, Math.min(h * u, benchY - 10 * u));
  }
  // the bench top: old wood, burns and scratches
  const bg = ctx.createLinearGradient(0, benchY, 0, H);
  bg.addColorStop(0, "#4a3620");
  bg.addColorStop(1, "#1e140a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, benchY, W, H - benchY);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, benchY, W, 6 * u);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(0,0,0,${(0.1 + rnd() * 0.25).toFixed(2)})`;
    ctx.lineWidth = (0.6 + rnd() * 1.4) * u;
    const x = rnd() * W;
    const y = benchY + rnd() * (H - benchY);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rnd() - 0.5) * 160 * u, y + (rnd() - 0.5) * 30 * u);
    ctx.stroke();
  }
  for (let i = 0; i < 12; i++) {
    soft(ctx, rnd() * W, benchY + rnd() * (H - benchY), (6 + rnd() * 14) * u, (4 + rnd() * 8) * u, "0,0,0", 0.5);
  }
  // the lamp's ring of light on the bench and the board
  const b = L.board;
  soft(ctx, b.x + b.w * 0.55, b.y + b.h * 0.45, b.w * 0.95, b.h * 1.1, LAMP, 0.22, "lighter");
  // solder spatters and a few loose parts
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = "rgba(200,205,210,0.6)";
    ctx.beginPath();
    ctx.arc(rnd() * W, benchY + 20 * u + rnd() * (H - benchY - 30 * u), (0.8 + rnd() * 1.6) * u, 0, Math.PI * 2);
    ctx.fill();
  }
}

// the board: green solder mask, traces, pads, an IC, capacitors, a connector
function paintBoard(ctx, L) {
  const { u } = L;
  const b = L.board;
  const rnd = lcg(4404);
  soft(ctx, b.x + b.w / 2 + 8 * u, b.y + b.h / 2 + 12 * u, b.w * 0.62, b.h * 0.64, "0,0,0", 0.7);
  const g = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
  g.addColorStop(0, "#1f6a3a");
  g.addColorStop(0.5, "#17582f");
  g.addColorStop(1, "#124a27");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(b.x, b.y, b.w, b.h, 6 * u);
  ctx.fill();
  // mounting holes
  for (const [fx, fy] of [
    [0.03, 0.06],
    [0.97, 0.06],
    [0.03, 0.94],
    [0.97, 0.94],
  ]) {
    ctx.fillStyle = "#c8a44a";
    ctx.beginPath();
    ctx.arc(b.x + b.w * fx, b.y + b.h * fy, 7 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2a1a08";
    ctx.beginPath();
    ctx.arc(b.x + b.w * fx, b.y + b.h * fy, 4 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  // traces: copper under the mask, a shade lighter, routed in right angles
  ctx.strokeStyle = "rgba(120,200,130,0.35)";
  ctx.lineWidth = 2.2 * u;
  ctx.lineCap = "round";
  for (let i = 0; i < 26; i++) {
    let x = b.x + b.w * (0.05 + rnd() * 0.9);
    let y = b.y + b.h * (0.05 + rnd() * 0.9);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 3; s++) {
      if (rnd() < 0.5) x = Math.max(b.x + 6 * u, Math.min(b.x + b.w - 6 * u, x + (rnd() - 0.5) * b.w * 0.3));
      else y = Math.max(b.y + 6 * u, Math.min(b.y + b.h - 6 * u, y + (rnd() - 0.5) * b.h * 0.3));
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // the resistors' pads and the traces between them
  ctx.strokeStyle = "rgba(120,200,130,0.5)";
  ctx.lineWidth = 3 * u;
  for (const r of L.resistors) {
    for (const s of [-1, 1]) {
      const px = r.x + s * (r.len / 2 + r.len * 0.22);
      ctx.beginPath();
      ctx.moveTo(px, r.y);
      ctx.lineTo(px, r.y + s * b.h * 0.18);
      ctx.stroke();
      pad(ctx, u, px, r.y);
    }
  }
  // an IC along the top, with its pins
  const ic = { x: b.x + b.w * 0.3, y: b.y + b.h * 0.13, w: b.w * 0.3, h: b.h * 0.14 };
  for (let i = 0; i < 8; i++) {
    const px = ic.x + ic.w * ((i + 0.5) / 8);
    ctx.fillStyle = "#c8ccd0";
    ctx.fillRect(px - 2 * u, ic.y - 6 * u, 4 * u, 6 * u);
    ctx.fillRect(px - 2 * u, ic.y + ic.h, 4 * u, 6 * u);
  }
  ctx.fillStyle = "#15161a";
  ctx.beginPath();
  ctx.roundRect(ic.x, ic.y, ic.w, ic.h, 2 * u);
  ctx.fill();
  ctx.fillStyle = "#26282e";
  ctx.beginPath();
  ctx.arc(ic.x + 8 * u, ic.y + ic.h / 2, 3 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(220,220,220,0.7)";
  ctx.font = `${Math.round(ic.h * 0.36)}px ${LABEL_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("NE555P", ic.x + ic.w / 2, ic.y + ic.h / 2);
  // two electrolytic capacitors, seen from above, bottom left
  for (const [fx, fy, rr] of [
    [0.12, 0.8, 0.07],
    [0.24, 0.84, 0.055],
  ]) {
    const cx = b.x + b.w * fx;
    const cy = b.y + b.h * fy;
    const r = b.h * rr;
    const cg = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    cg.addColorStop(0, "#3a4a9a");
    cg.addColorStop(1, "#141c40");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#9aa0aa";
    ctx.lineWidth = 1.5 * u;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.5, cy - r * 0.3);
    ctx.lineTo(cx + r * 0.5, cy - r * 0.3);
    ctx.moveTo(cx - r * 0.5, cy + r * 0.3);
    ctx.lineTo(cx + r * 0.5, cy + r * 0.3);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(cx - r * 0.9, cy - r * 0.08, r * 0.3, r * 0.16);
  }
  // a header connector, bottom right
  for (let i = 0; i < 6; i++) {
    const px = b.x + b.w * (0.7 + i * 0.04);
    ctx.fillStyle = "#1a1a1e";
    ctx.fillRect(px - 6 * u, b.y + b.h * 0.78, 12 * u, 14 * u);
    ctx.fillStyle = "#d8c050";
    ctx.fillRect(px - 2 * u, b.y + b.h * 0.78 + 3 * u, 4 * u, 8 * u);
  }
  // a small crystal can
  ctx.fillStyle = "#b8bcc2";
  ctx.beginPath();
  ctx.roundRect(b.x + b.w * 0.66, b.y + b.h * 0.14, b.w * 0.08, b.h * 0.07, b.h * 0.035);
  ctx.fill();
  ctx.lineCap = "butt";
}

function pad(ctx, u, x, y) {
  ctx.fillStyle = "#d4b25a";
  ctx.beginPath();
  ctx.arc(x, y, 6 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c8ccd0";
  ctx.beginPath();
  ctx.arc(x, y, 3.6 * u, 0, Math.PI * 2);
  ctx.fill();
}

// a resistor lying on the board: its leads to the pads, the body with its
// bands. `k` scales it (the loupe paints it big).
export function paintResistor(ctx, L, r, k, cx = r.x, cy = r.y) {
  const len = r.len * k;
  const rad = r.r * k;
  const u = L.u * k;
  // the leads
  ctx.strokeStyle = "#c8ccd0";
  ctx.lineWidth = 2.4 * u;
  ctx.beginPath();
  ctx.moveTo(cx - len / 2 - len * 0.22, cy);
  ctx.lineTo(cx + len / 2 + len * 0.22, cy);
  ctx.stroke();
  // its shadow on the board
  soft(ctx, cx + 2 * u, cy + rad * 0.9, len * 0.55, rad * 0.8, "0,0,0", 0.5);
  // the body: a beige capsule, fatter at its ends
  const bg = ctx.createLinearGradient(0, cy - rad, 0, cy + rad);
  bg.addColorStop(0, "#efe0bc");
  bg.addColorStop(0.45, "#d9c59a");
  bg.addColorStop(1, "#8a7250");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(cx - len / 2, cy - rad, len, rad * 2, rad);
  ctx.fill();
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * (len / 2 - rad * 1.1), cy, rad * 1.15, rad * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // the bands: three close together from the left end, the tolerance
  // band apart at the right
  const stops = [0.2, 0.34, 0.48, 0.8];
  r.bands.forEach((colour, i) => {
    const bx = cx - len / 2 + len * stops[i];
    const bw = rad * (i === 3 ? 0.6 : 0.74);
    const y0 = cy - rad * (Math.abs(stops[i] - 0.5) > 0.25 ? 1.05 : 1.0);
    const y1 = cy + rad * (Math.abs(stops[i] - 0.5) > 0.25 ? 1.05 : 1.0);
    ctx.fillStyle = BAND_PAINT[colour];
    ctx.fillRect(bx - bw / 2, y0, bw, y1 - y0);
    // the band's own light and shade, following the body's roundness
    const sh = ctx.createLinearGradient(0, y0, 0, y1);
    sh.addColorStop(0, "rgba(255,255,255,0.3)");
    sh.addColorStop(0.5, "rgba(255,255,255,0)");
    sh.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = sh;
    ctx.fillRect(bx - bw / 2, y0, bw, y1 - y0);
  });
  // the gloss along the top
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.roundRect(cx - len / 2 + rad * 0.8, cy - rad * 0.75, len - rad * 1.6, rad * 0.3, rad * 0.15);
  ctx.fill();
}

// the white silkscreen: R1 to R4 under each resistor, the board's name
function paintSilkscreen(ctx, L) {
  const b = L.board;
  ctx.fillStyle = "rgba(245,245,240,0.9)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const fs = Math.round(b.h * 0.05);
  ctx.font = `bold ${fs}px ${LABEL_FONT}`;
  for (const r of L.resistors) ctx.fillText(`R${r.i + 1}`, r.x, r.y + r.r * 1.9);
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.font = `${Math.round(fs * 0.8)}px ${LABEL_FONT}`;
  ctx.fillText("DSC-24  REV B", b.x + b.w * 0.07, b.y + b.h * 0.97);
  ctx.strokeStyle = "rgba(245,245,240,0.6)";
  ctx.lineWidth = Math.max(1, L.u);
  // a dashed outline round the row of resistors
  ctx.setLineDash([4 * L.u, 3 * L.u]);
  const r0 = L.resistors[0];
  const r3 = L.resistors[3];
  ctx.strokeRect(r0.x - r0.len * 0.8, r0.y - r0.r * 3, r3.x - r0.x + r0.len * 1.6, r0.r * 7.2);
  ctx.setLineDash([]);
}

// the colour code, pinned to the bench: a swatch of each colour and its
// digit, black to white, and the two tolerance colours apart
function paintCard(ctx, L) {
  const { u } = L;
  const c = L.card;
  ctx.save();
  ctx.translate(c.x + c.w / 2, c.y + c.h / 2);
  ctx.rotate(-0.012);
  soft(ctx, 6 * u, 8 * u, c.w * 0.6, c.h * 0.8, "0,0,0", 0.6);
  ctx.fillStyle = "#efe6cf";
  ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
  ctx.fillStyle = "rgba(120,90,40,0.15)";
  ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h * 0.08);
  // the pin
  ctx.fillStyle = "#c83030";
  ctx.beginPath();
  ctx.arc(-c.w / 2 + 12 * u, -c.h / 2 + 10 * u, 5 * u, 0, Math.PI * 2);
  ctx.fill();
  // the swatches
  const n = BAND_COLOURS.length;
  const pad = c.w * 0.03;
  const sw = (c.w * 0.76 - pad * 2) / n;
  const sh = c.h * 0.42;
  const top = -c.h * 0.36;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `bold ${Math.round(c.h * 0.3)}px ${LABEL_FONT}`;
  BAND_COLOURS.forEach((colour, i) => {
    const x = -c.w / 2 + pad + sw * i;
    ctx.fillStyle = BAND_PAINT[colour];
    ctx.fillRect(x + 2 * u, top, sw - 4 * u, sh);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = u;
    ctx.strokeRect(x + 2 * u, top, sw - 4 * u, sh);
    ctx.fillStyle = "#2a2622";
    ctx.fillText(String(BAND_DIGITS[colour]), x + sw / 2, top + sh + c.h * 0.08);
  });
  // gold and silver: a tolerance, no digit
  const gx = -c.w / 2 + pad + sw * n + c.w * 0.03;
  const gw = (c.w * 0.21 - c.w * 0.03) / 2;
  [
    ["gold", "±5%"],
    ["silver", "±10%"],
  ].forEach(([colour, text], i) => {
    const x = gx + gw * i;
    ctx.fillStyle = BAND_PAINT[colour];
    ctx.fillRect(x + 2 * u, top, gw - 4 * u, sh);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.strokeRect(x + 2 * u, top, gw - 4 * u, sh);
    ctx.fillStyle = "#6a625a";
    ctx.font = `${Math.round(c.h * 0.2)}px ${LABEL_FONT}`;
    ctx.fillText(text, x + gw / 2, top + sh + c.h * 0.1);
  });
  ctx.restore();
}

// the soldering iron in its coiled stand, its tip hot
function paintIron(ctx, L) {
  const it = L.iron;
  const k = it.s;
  ctx.save();
  ctx.translate(it.x, it.y);
  ctx.rotate(-0.5);
  soft(ctx, 10 * k, 14 * k, 70 * k, 20 * k, "0,0,0", 0.6);
  // the stand's coil
  ctx.strokeStyle = "#8a8e94";
  ctx.lineWidth = 2.5 * k;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.ellipse(-20 * k + i * 11 * k, 0, 7 * k, 13 * k, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // the handle, the shaft, the tip
  const hg = ctx.createLinearGradient(0, -8 * k, 0, 8 * k);
  hg.addColorStop(0, "#3a3e46");
  hg.addColorStop(1, "#15171b");
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.roundRect(-110 * k, -8 * k, 90 * k, 16 * k, 6 * k);
  ctx.fill();
  ctx.fillStyle = "#9a9ea4";
  ctx.fillRect(-22 * k, -3 * k, 70 * k, 6 * k);
  ctx.fillStyle = "#d8a050";
  ctx.beginPath();
  ctx.moveTo(48 * k, -3 * k);
  ctx.lineTo(62 * k, 0);
  ctx.lineTo(48 * k, 3 * k);
  ctx.closePath();
  ctx.fill();
  // its cable away off the bench
  ctx.strokeStyle = "#0c0c0e";
  ctx.lineWidth = 4 * k;
  ctx.beginPath();
  ctx.moveTo(-110 * k, 0);
  ctx.bezierCurveTo(-150 * k, 10 * k, -170 * k, 60 * k, -150 * k, 120 * k);
  ctx.stroke();
  ctx.restore();
}

// the magnifier lamp: its arm from above, the ring light and the lens over
// the board's corner (what the lens shows is the board under it, a little
// bigger)
function paintLamp(ctx, L) {
  const { u } = L;
  const a = L.arm;
  const l = L.lens;
  ctx.strokeStyle = "#2a2c30";
  ctx.lineWidth = 9 * u;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(a.x0, a.y0);
  ctx.lineTo(a.x1, a.y1);
  ctx.lineTo(l.x + l.r * 0.3, l.y - l.r * 1.15);
  ctx.stroke();
  ctx.strokeStyle = "#5a5e66";
  ctx.lineWidth = 2.5 * u;
  ctx.beginPath();
  ctx.moveTo(a.x0 - 2 * u, a.y0);
  ctx.lineTo(a.x1 - 2 * u, a.y1);
  ctx.lineTo(l.x + l.r * 0.3 - 2 * u, l.y - l.r * 1.15);
  ctx.stroke();
  // the lens: what is under it, enlarged, in a glass
  ctx.save();
  ctx.beginPath();
  ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
  ctx.clip();
  const zoom = 1.5;
  ctx.drawImage(ctx.canvas, l.x - l.r / zoom, l.y - l.r / zoom, (l.r * 2) / zoom, (l.r * 2) / zoom, l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  // the glass's tint and gleam
  ctx.fillStyle = "rgba(200,230,255,0.08)";
  ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  soft(ctx, l.x - l.r * 0.4, l.y - l.r * 0.45, l.r * 0.5, l.r * 0.35, "255,255,255", 0.3, "lighter");
  ctx.restore();
  // the ring light round the glass, and the housing
  ctx.strokeStyle = "#3a3c42";
  ctx.lineWidth = l.r * 0.22;
  ctx.beginPath();
  ctx.arc(l.x, l.y, l.r * 1.08, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(${LAMP},0.95)`;
  ctx.lineWidth = l.r * 0.07;
  ctx.beginPath();
  ctx.arc(l.x, l.y, l.r * 1.02, 0, Math.PI * 2);
  ctx.stroke();
  soft(ctx, l.x, l.y, l.r * 1.6, l.r * 1.6, LAMP, 0.18, "lighter");
}

// a resistor seen through a loupe: big, on its bit of green board, in a
// round glass with a dark rim; the texture the scene shows on a tap
function paintLoupe(L, r) {
  const R = Math.min(L.W, L.H) * 0.17;
  const c = makeCanvas(R * 2 + 8, R * 2 + 8);
  const ctx = c.getContext("2d");
  const cx = R + 4;
  const cy = R + 4;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#1a5e32";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = "rgba(120,200,130,0.4)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - R, cy + R * 0.6);
  ctx.lineTo(cx + R, cy + R * 0.6);
  ctx.moveTo(cx - R * 0.4, cy - R);
  ctx.lineTo(cx - R * 0.4, cy - R * 0.45);
  ctx.stroke();
  const k = (R * 1.5) / r.len;
  paintResistor(ctx, L, r, k, cx, cy);
  ctx.fillStyle = "rgba(245,245,240,0.9)";
  ctx.font = `bold ${Math.round(R * 0.16)}px ${LABEL_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(`R${r.i + 1}`, cx, cy + r.r * k * 1.7);
  // the glass
  soft(ctx, cx - R * 0.4, cy - R * 0.45, R * 0.5, R * 0.35, "255,255,255", 0.25, "lighter");
  ctx.restore();
  ctx.strokeStyle = "#2a2c30";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, R + 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, R - 2, 0, Math.PI * 2);
  ctx.stroke();
  return c;
}
