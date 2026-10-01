/** The study for SEQUENCE, painted like a storybook evening: a wall of warm
 *  wooden boards, and on it an oak-framed cork board where six slots are
 *  ruled in pencil; under them a strip of paper, pinned, for the long number
 *  to be written on. Below, the walnut desk: a green-shaded banker's lamp
 *  warming everything, a pencil, and the little note that teaches the
 *  cipher. The cards are index cards, each with its red pin, painted as
 *  their own texture so they can be dragged.
 *
 *  Painted once per screen size; the scene lays the cards, their numbers
 *  and the note's words on top. */

const ROOM = "seq_room";
const CARD = "seq_card";
const SHADOW = "seq_card_shadow";
const MOTE = "seq_mote";
const INK = "rgba(52,40,30,";

export function paintStudy(scene, W, H, L) {
  const S = Math.min(W, H);
  const cv = makeCanvas(W, H);
  const ctx = cv.getContext("2d");
  const lamp = { x: Math.max(S * 0.11, W * 0.1), y: L.deskY - S * 0.07 };
  paintWall(ctx, W, H, L, lamp, lcg(6161));
  const board = paintBoard(ctx, L, S, lcg(4477));
  paintDesk(ctx, W, H, L, S, lcg(808));
  paintNote(ctx, L.note, S);
  paintPencil(ctx, L, S);
  paintLamp(ctx, lamp, L, S);
  finish(ctx, W, H);
  const t = scene.textures;
  add(t, ROOM, cv);
  const s = L.slots[0];
  add(t, CARD, paintCard(s.w, s.h));
  add(t, SHADOW, paintShadow(s.w, s.h));
  if (!t.exists(MOTE))
    t.addCanvas(
      MOTE,
      radial(16, "255,226,170", [
        [0, 0.9],
        [0.35, 0.35],
        [1, 0],
      ]),
    );
  return { room: ROOM, card: CARD, shadow: SHADOW, mote: MOTE, board, lamp };
}

export function releaseStudyArt(textures) {
  for (const key of [ROOM, CARD, SHADOW, MOTE])
    if (textures.exists(key)) textures.remove(key);
}

// warm wooden boards, lit from the lamp
function paintWall(ctx, W, H, L, lamp, rnd) {
  const S = Math.min(W, H);
  const g = ctx.createLinearGradient(0, 0, 0, L.deskY);
  g.addColorStop(0, "#22150d");
  g.addColorStop(1, "#382215");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, L.deskY);
  const bw = Math.max(40, S * 0.085);
  for (let x = 0, i = 0; x < W; x += bw, i++) {
    const tone = 0.85 + 0.3 * rnd();
    ctx.fillStyle = `rgba(${Math.round(90 * tone)},${Math.round(56 * tone)},${Math.round(34 * tone)},0.25)`;
    ctx.fillRect(x, 0, bw, L.deskY);
    for (let k = 0; k < 6; k++) {
      const gx = x + rnd() * bw;
      const ph = rnd() * 6.28;
      ctx.beginPath();
      for (let y = 0; y <= L.deskY; y += 12) {
        const px = gx + Math.sin(y * 0.01 + ph) * 2;
        if (y) ctx.lineTo(px, y);
        else ctx.moveTo(px, y);
      }
      ctx.strokeStyle =
        rnd() < 0.7 ? "rgba(20,10,4,0.18)" : "rgba(255,200,150,0.04)";
      ctx.lineWidth = 0.8 + rnd();
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(10,5,2,0.6)";
    ctx.fillRect(x, 0, 1.5, L.deskY);
    ctx.fillStyle = "rgba(255,200,150,0.05)";
    ctx.fillRect(x + 1.5, 0, 1, L.deskY);
  }
  // a rail along the top, and the ceiling's dark
  ctx.fillStyle = "#1a100a";
  ctx.fillRect(0, H * 0.06, W, Math.max(3, S * 0.01));
  ctx.fillStyle = "rgba(255,200,150,0.12)";
  ctx.fillRect(0, H * 0.06, W, 1);
  const top = ctx.createLinearGradient(0, 0, 0, H * 0.2);
  top.addColorStop(0, "rgba(0,0,0,0.6)");
  top.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, W, H * 0.2);
  // the lamp's warmth on the wall, strongest by the board
  soft(
    ctx,
    lamp.x + W * 0.25,
    L.deskY - S * 0.15,
    W * 0.6,
    S * 0.55,
    "255,170,90",
    0.2,
    "lighter",
  );
  soft(
    ctx,
    lamp.x,
    lamp.y - S * 0.04,
    S * 0.25,
    S * 0.2,
    "255,190,110",
    0.25,
    "lighter",
  );
}

// the cork board: an oak frame, cork, six slots ruled in pencil, an arrow
// saying which way they run, and the paper strip for the long number
function paintBoard(ctx, L, S, rnd) {
  const r = L.slotRow;
  const pad = L.compact ? Math.max(12, L.slots[0].w * 0.25) : Math.max(16, L.slots[0].w * 0.45);
  const x0 = r.x - pad;
  const x1 = r.x + r.w + pad;
  const y0 = r.y - pad * 1.1;
  const y1 = L.fused.y + Math.max(30, L.slots[0].w * 0.5) / 2 + pad * 0.9;
  const fw = Math.max(8, S * 0.018);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = S * 0.03;
  ctx.shadowOffsetY = S * 0.012;
  ctx.fillStyle = "#4a3018";
  ctx.fillRect(x0 - fw, y0 - fw, x1 - x0 + fw * 2, y1 - y0 + fw * 2);
  ctx.restore();
  const fg = ctx.createLinearGradient(0, y0 - fw, 0, y1 + fw);
  fg.addColorStop(0, "#8a6038");
  fg.addColorStop(1, "#5a3a1e");
  ctx.fillStyle = fg;
  ctx.fillRect(x0 - fw, y0 - fw, x1 - x0 + fw * 2, y1 - y0 + fw * 2);
  ctx.fillStyle = "rgba(255,220,170,0.3)";
  ctx.fillRect(x0 - fw, y0 - fw, x1 - x0 + fw * 2, 1.5);
  ctx.fillRect(x0 - fw, y0 - fw, 1.5, y1 - y0 + fw * 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x0 - fw, y1 + fw - 1.5, x1 - x0 + fw * 2, 1.5);
  // the cork
  const cg = ctx.createLinearGradient(x0, y0, x1, y1);
  cg.addColorStop(0, "#b07c48");
  cg.addColorStop(1, "#8a5c32");
  ctx.fillStyle = cg;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (let i = 0; i < ((x1 - x0) * (y1 - y0)) / 14; i++) {
    const v = rnd();
    ctx.fillStyle =
      v < 0.45
        ? "rgba(60,32,14,0.3)"
        : v < 0.8
          ? "rgba(210,160,100,0.25)"
          : "rgba(40,20,8,0.45)";
    ctx.fillRect(
      x0 + rnd() * (x1 - x0),
      y0 + rnd() * (y1 - y0),
      1 + rnd() * 1.5,
      1 + rnd() * 1.5,
    );
  }
  const inner = ctx.createLinearGradient(0, y0, 0, y0 + fw * 1.5);
  inner.addColorStop(0, "rgba(0,0,0,0.4)");
  inner.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = inner;
  ctx.fillRect(x0, y0, x1 - x0, fw * 1.5);
  // the slots, ruled in pencil
  ctx.strokeStyle = INK + "0.55)";
  ctx.lineWidth = Math.max(1, S * 0.0016);
  ctx.setLineDash([Math.max(4, S * 0.007), Math.max(4, S * 0.007)]);
  for (const s of L.slots)
    ctx.strokeRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
  ctx.setLineDash([]);
  // a small arrow under the row: smallest first
  const ay = r.y + r.h + (L.compact ? 12 : 22);
  ctx.strokeStyle = INK + "0.7)";
  ctx.lineWidth = Math.max(1.2, S * 0.002);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(r.x + 6, ay);
  ctx.lineTo(r.x + 74, ay);
  ctx.moveTo(r.x + 64, ay - 5);
  ctx.lineTo(r.x + 74, ay);
  ctx.lineTo(r.x + 64, ay + 5);
  ctx.stroke();
  ctx.fillStyle = INK + "0.8)";
  ctx.font = `italic ${Math.max(11, Math.round(S * 0.016))}px Georgia, "Times New Roman", serif`;
  ctx.textBaseline = "middle";
  ctx.fillText("small → large", r.x + 84, ay);
  // the paper strip the long number is written on, pinned at both ends
  const sw = r.w * 0.82;
  const sh = Math.max(30, L.slots[0].w * 0.5);
  const sx = r.x + r.w / 2 - sw / 2;
  const sy = L.fused.y - sh / 2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = S * 0.01;
  ctx.shadowOffsetY = S * 0.005;
  const pg = ctx.createLinearGradient(0, sy, 0, sy + sh);
  pg.addColorStop(0, "#f1e6cc");
  pg.addColorStop(1, "#ddcca6");
  ctx.fillStyle = pg;
  ctx.fillRect(sx, sy, sw, sh);
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(sx, sy, sw, 1);
  const ul = L.fused.y + sh * 0.32;
  ctx.strokeStyle = INK + "0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx + sw * 0.07, ul);
  ctx.lineTo(sx + sw * 0.93, ul + 0.5);
  ctx.stroke();
  for (const px of [sx + sh * 0.3, sx + sw - sh * 0.3])
    pin(ctx, px, sy + sh * 0.25, Math.max(3, sh * 0.13));
  return { x0, y0, x1, y1 };
}

// the walnut desk, its edge against the wall
function paintDesk(ctx, W, H, L, S, rnd) {
  const y = L.deskY;
  const g = ctx.createLinearGradient(0, y, 0, H);
  g.addColorStop(0, "#3a2416");
  g.addColorStop(1, "#4e3020");
  ctx.fillStyle = g;
  ctx.fillRect(0, y, W, H - y);
  for (let i = 0; i < 70; i++) {
    const gy = y + 4 + rnd() * (H - y - 4);
    const ph = rnd() * 6.28;
    ctx.beginPath();
    for (let x = -10; x <= W + 10; x += 14) {
      const py = gy + Math.sin(x * 0.008 + ph) * 2;
      if (x < 0) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    ctx.strokeStyle =
      rnd() < 0.75 ? "rgba(20,8,4,0.18)" : "rgba(255,200,150,0.05)";
    ctx.lineWidth = 0.7 + rnd();
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, y, W, Math.max(2, S * 0.006));
  const sh = ctx.createLinearGradient(0, y, 0, y + S * 0.05);
  sh.addColorStop(0, "rgba(0,0,0,0.35)");
  sh.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sh;
  ctx.fillRect(0, y, W, S * 0.05);
  soft(
    ctx,
    W * 0.5,
    H - S * 0.02,
    W * 0.5,
    S * 0.06,
    "255,200,150",
    0.06,
    "lighter",
  );
}

// the note that teaches the cipher: a little card lying on the desk
function paintNote(ctx, n, S) {
  ctx.save();
  ctx.translate(n.x + n.w / 2, n.y + n.h / 2);
  ctx.rotate(n.angle);
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = S * 0.015;
  ctx.shadowOffsetY = S * 0.006;
  const g = ctx.createLinearGradient(0, -n.h / 2, 0, n.h / 2);
  g.addColorStop(0, "#f3e8cf");
  g.addColorStop(1, "#e0cfaa");
  ctx.fillStyle = g;
  ctx.fillRect(-n.w / 2, -n.h / 2, n.w, n.h);
  ctx.restore();
  ctx.save();
  ctx.translate(n.x + n.w / 2, n.y + n.h / 2);
  ctx.rotate(n.angle);
  ctx.strokeStyle = "rgba(190,70,60,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-n.w / 2 + 6, -n.h * 0.3);
  ctx.lineTo(n.w / 2 - 6, -n.h * 0.3);
  ctx.stroke();
  ctx.strokeStyle = "rgba(90,120,170,0.25)";
  for (const f of [0.02, 0.28]) {
    ctx.beginPath();
    ctx.moveTo(-n.w / 2 + 6, n.h * f + n.h * 0.12);
    ctx.lineTo(n.w / 2 - 6, n.h * f + n.h * 0.12);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(-n.w / 2, -n.h / 2, n.w, 1);
  ctx.restore();
}

// a yellow pencil lying on the desk by the note
function paintPencil(ctx, L, S) {
  const n = L.note;
  const len = Math.min(n.w * 0.9, S * 0.2);
  const th = Math.max(4, S * 0.008);
  const cx = n.x - len * 0.15;
  const cy = n.y + n.h + th * 2.5;
  if (cy > L.H - th * 2) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.12);
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(-len / 2 + 3, th * 0.6, len, th * 0.7);
  const g = ctx.createLinearGradient(0, -th / 2, 0, th / 2);
  g.addColorStop(0, "#f4c64a");
  g.addColorStop(0.5, "#e0a82a");
  g.addColorStop(1, "#9a6a14");
  ctx.fillStyle = g;
  ctx.fillRect(-len / 2, -th / 2, len * 0.82, th);
  ctx.fillStyle = "#e8c9a0";
  ctx.beginPath();
  ctx.moveTo(-len / 2 + len * 0.82, -th / 2);
  ctx.lineTo(len / 2, 0);
  ctx.lineTo(-len / 2 + len * 0.82, th / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2a2a2a";
  ctx.beginPath();
  ctx.moveTo(len / 2 - len * 0.05, -th * 0.12);
  ctx.lineTo(len / 2, 0);
  ctx.lineTo(len / 2 - len * 0.05, th * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#b8b8b0";
  ctx.fillRect(-len / 2, -th / 2, len * 0.05, th);
  ctx.fillStyle = "#d87a8a";
  ctx.fillRect(-len / 2 - len * 0.05, -th / 2, len * 0.05, th);
  ctx.restore();
}

// a banker's lamp: brass, a green glass shade, its light on the desk
function paintLamp(ctx, lamp, L, S) {
  const baseY = L.deskY + (L.H - L.deskY) * 0.42;
  const bx = lamp.x;
  soft(
    ctx,
    bx + S * 0.05,
    baseY + S * 0.01,
    S * 0.24,
    S * 0.08,
    "255,196,120",
    0.3,
    "lighter",
  );
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.ellipse(
    bx + S * 0.01,
    baseY + S * 0.006,
    S * 0.05,
    S * 0.012,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  const brass = (x0, x1) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, "#5a4018");
    g.addColorStop(0.35, "#f0d08a");
    g.addColorStop(0.6, "#b88a3a");
    g.addColorStop(1, "#4a3010");
    return g;
  };
  ctx.fillStyle = brass(bx - S * 0.045, bx + S * 0.045);
  ctx.beginPath();
  ctx.ellipse(bx, baseY, S * 0.045, S * 0.011, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(bx - S * 0.045, baseY - S * 0.012, S * 0.09, S * 0.012);
  ctx.fillStyle = brass(bx - S * 0.004, bx + S * 0.004);
  ctx.fillRect(bx - S * 0.004, lamp.y, S * 0.008, baseY - lamp.y);
  // the shade
  const sw = S * 0.075;
  const sh = S * 0.035;
  ctx.save();
  ctx.translate(bx, lamp.y);
  const glow = ctx.createLinearGradient(0, sh * 0.6, 0, sh * 2.6);
  glow.addColorStop(0, "rgba(255,214,140,0.35)");
  glow.addColorStop(1, "rgba(255,214,140,0)");
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.moveTo(-sw * 0.9, sh * 0.6);
  ctx.lineTo(sw * 0.9, sh * 0.6);
  ctx.lineTo(sw * 2.4, sh * 3.6);
  ctx.lineTo(-sw * 2.4, sh * 3.6);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  const gg = ctx.createLinearGradient(0, -sh, 0, sh * 0.6);
  gg.addColorStop(0, "#2e6a4a");
  gg.addColorStop(0.5, "#1e5a3a");
  gg.addColorStop(1, "#0e3a24");
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.moveTo(-sw * 0.35, -sh);
  ctx.quadraticCurveTo(0, -sh * 1.25, sw * 0.35, -sh);
  ctx.quadraticCurveTo(sw * 0.8, -sh * 0.2, sw * 0.95, sh * 0.6);
  ctx.lineTo(-sw * 0.95, sh * 0.6);
  ctx.quadraticCurveTo(-sw * 0.8, -sh * 0.2, -sw * 0.35, -sh);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(150,230,180,0.5)";
  ctx.lineWidth = Math.max(1, S * 0.0018);
  ctx.beginPath();
  ctx.moveTo(-sw * 0.3, -sh * 0.95);
  ctx.quadraticCurveTo(-sw * 0.7, -sh * 0.2, -sw * 0.82, sh * 0.45);
  ctx.stroke();
  ctx.fillStyle = "#fff2cc";
  ctx.beginPath();
  ctx.ellipse(0, sh * 0.62, sw * 0.88, sh * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = brass(-sw, sw);
  ctx.fillRect(-sw * 0.97, sh * 0.5, sw * 1.94, Math.max(1.5, sh * 0.1));
  ctx.restore();
}

function finish(ctx, W, H) {
  const R = Math.hypot(W, H) / 2;
  const v = ctx.createRadialGradient(
    W * 0.45,
    H * 0.45,
    R * 0.4,
    W / 2,
    H / 2,
    R * 1.05,
  );
  v.addColorStop(0, "rgba(8,4,2,0)");
  v.addColorStop(1, "rgba(8,4,2,0.6)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

// ── the cards ───────────────────────────────────────────────────────────────

// an index card: cream, a red rule and faint blue lines, its red pin
function paintCard(w, h) {
  const k = 2;
  const c = makeCanvas(w * k, h * k);
  const g = c.getContext("2d");
  g.scale(k, k);
  const pg = g.createLinearGradient(0, 0, w, h);
  pg.addColorStop(0, "#f6ecd4");
  pg.addColorStop(1, "#e2d2ae");
  g.fillStyle = pg;
  g.fillRect(0, 0, w, h);
  const rnd = lcg(Math.round(w * 7 + h));
  for (let i = 0; i < (w * h) / 6; i++) {
    g.fillStyle =
      rnd() < 0.5 ? "rgba(120,90,50,0.06)" : "rgba(255,255,255,0.12)";
    g.fillRect(rnd() * w, rnd() * h, 1, 1);
  }
  g.strokeStyle = "rgba(200,70,60,0.5)";
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(3, h * 0.24);
  g.lineTo(w - 3, h * 0.24);
  g.stroke();
  g.strokeStyle = "rgba(90,120,170,0.22)";
  for (const f of [0.5, 0.72, 0.92]) {
    g.beginPath();
    g.moveTo(3, h * f);
    g.lineTo(w - 3, h * f);
    g.stroke();
  }
  const edge = g.createLinearGradient(0, 0, 0, h);
  edge.addColorStop(0, "rgba(255,255,255,0.35)");
  edge.addColorStop(0.08, "rgba(255,255,255,0)");
  edge.addColorStop(0.9, "rgba(90,60,30,0)");
  edge.addColorStop(1, "rgba(90,60,30,0.18)");
  g.fillStyle = edge;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(120,90,50,0.35)";
  g.strokeRect(0.5, 0.5, w - 1, h - 1);
  pin(g, w / 2, h * 0.12, Math.max(3, Math.min(w, h) * 0.08));
  return c;
}

function paintShadow(w, h) {
  const m = Math.ceil(Math.max(w, h) * 0.25);
  const c = makeCanvas(w + m * 2, h + m * 2);
  const g = c.getContext("2d");
  g.shadowColor = "rgba(0,0,0,0.7)";
  g.shadowBlur = m * 0.6;
  g.fillStyle = "rgba(0,0,0,0.5)";
  g.fillRect(m, m, w, h);
  return c;
}

// a red push-pin, seen from the front
function pin(g, x, y, r) {
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.beginPath();
  g.ellipse(x + r * 0.5, y + r * 0.7, r * 0.9, r * 0.5, 0, 0, Math.PI * 2);
  g.fill();
  const rg = g.createRadialGradient(
    x - r * 0.35,
    y - r * 0.35,
    r * 0.1,
    x,
    y,
    r,
  );
  rg.addColorStop(0, "#ff8a7a");
  rg.addColorStop(0.5, "#c8342a");
  rg.addColorStop(1, "#6a1410");
  g.fillStyle = rg;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.7)";
  g.beginPath();
  g.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, Math.PI * 2);
  g.fill();
}

// ── helpers ─────────────────────────────────────────────────────────────────

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

function add(textures, key, canvas) {
  if (textures.exists(key)) textures.remove(key);
  return textures.addCanvas(key, canvas);
}

function lcg(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
