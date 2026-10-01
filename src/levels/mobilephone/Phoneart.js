/** The phone itself, painted: an old candy-bar mobile in deep blue plastic,
 *  lit from the lamp at the top left — a soft sheen down its left side, a
 *  stub antenna, the earpiece's grille, a glossy black bezel round the LCD,
 *  a little silver plate, side buttons, the microphone's holes — and its
 *  rubber keys. Each piece is a texture painted at K times its size in the
 *  phone's own units (the 340×720 body is centred on 0,0), so it stays
 *  sharp when the phone is scaled up; the scene shows them at 1/K.
 *
 *  Painted once and kept across resizes; releasePhoneArt() on shutdown. */

export const K = 2.5;
const PAD = 8; // room round each key for its shadow, in units

export const BODY = { key: "mp_body", x0: -205, y0: -435, w: 425, h: 845 };
const KEYS = {
  number: {
    key: "mp_key",
    w: 84,
    h: 52,
    r: 14,
    top: "#3c4556",
    bot: "#1c222c",
    edge: "rgba(200,215,240,0.18)",
  },
  soft: {
    key: "mp_key_soft",
    w: 84,
    h: 25,
    r: 12.5,
    top: "#363e4e",
    bot: "#1a2028",
    edge: "rgba(200,215,240,0.18)",
  },
  back: {
    key: "mp_key_back",
    w: 84,
    h: 25,
    r: 12.5,
    top: "#7a3038",
    bot: "#3a1418",
    edge: "rgba(255,190,200,0.3)",
  },
  answer: {
    key: "mp_answer",
    w: 120,
    h: 50,
    r: 20,
    top: "#4e9a3a",
    bot: "#1e4a16",
    edge: "rgba(210,255,180,0.45)",
  },
};
export const NAV = { key: "mp_nav", w: 108, h: 54 };

export function ensurePhoneArt(textures) {
  if (!textures.exists(BODY.key)) textures.addCanvas(BODY.key, paintBody());
  for (const k of Object.values(KEYS))
    if (!textures.exists(k.key)) textures.addCanvas(k.key, paintKey(k));
  if (!textures.exists(NAV.key)) textures.addCanvas(NAV.key, paintNav());
  return {
    body: BODY.key,
    origin: { x: -BODY.x0 / BODY.w, y: -BODY.y0 / BODY.h },
    key: KEYS.number.key,
    soft: KEYS.soft.key,
    back: KEYS.back.key,
    answer: KEYS.answer.key,
    nav: NAV.key,
  };
}

export function releasePhoneArt(textures) {
  for (const k of [
    BODY.key,
    NAV.key,
    ...Object.values(KEYS).map((v) => v.key),
  ]) {
    if (textures.exists(k)) textures.remove(k);
  }
}

// ── the body ────────────────────────────────────────────────────────────────

function paintBody() {
  const c = makeCanvas(BODY.w * K, BODY.h * K);
  const g = c.getContext("2d");
  g.scale(K, K);
  g.translate(-BODY.x0, -BODY.y0);
  const bw = 340;
  const bh = 720;
  const bx = -bw / 2;
  const by = -bh / 2;

  // its shadow on the desk, away from the lamp
  g.save();
  g.shadowColor = "rgba(0,0,0,0.75)";
  g.shadowBlur = 30 * K;
  g.shadowOffsetX = 18 * K;
  g.shadowOffsetY = 26 * K;
  rr(g, bx, by, bw, bh, 62);
  g.fillStyle = "#000";
  g.fill();
  g.restore();

  // the stub antenna
  const ax = bx + bw - 62;
  const ay = by - 62;
  const ag = g.createLinearGradient(ax, 0, ax + 15, 0);
  ag.addColorStop(0, "#3a4252");
  ag.addColorStop(0.4, "#20262f");
  ag.addColorStop(1, "#0c0f14");
  rr(g, ax, ay, 15, 70, 6);
  g.fillStyle = ag;
  g.fill();
  g.fillStyle = "rgba(220,230,255,0.25)";
  g.fillRect(ax + 3, ay + 6, 1.5, 50);

  // the side buttons
  for (const [x, y, w, h] of [
    [bx - 6, by + 160, 6, 50],
    [bx - 6, by + 230, 6, 38],
    [bx + bw, by + 185, 6, 58],
  ]) {
    rr(g, x, y, w, h, 3);
    g.fillStyle = "#1a2030";
    g.fill();
    g.fillStyle = "rgba(220,230,255,0.2)";
    g.fillRect(x + 1, y + 3, 1, h - 6);
  }

  // the body: deep blue plastic, lit from the top left
  const body = g.createLinearGradient(bx, by, bx + bw, by + bh);
  body.addColorStop(0, "#34405e");
  body.addColorStop(0.35, "#232c44");
  body.addColorStop(1, "#10141f");
  rr(g, bx, by, bw, bh, 62);
  g.fillStyle = body;
  g.fill();
  g.save();
  rr(g, bx, by, bw, bh, 62);
  g.clip();
  // the sheen down its left side, the curve of its top
  const sheen = g.createLinearGradient(bx, 0, bx + 60, 0);
  sheen.addColorStop(0, "rgba(200,215,255,0.04)");
  sheen.addColorStop(0.35, "rgba(200,215,255,0.16)");
  sheen.addColorStop(1, "rgba(200,215,255,0)");
  g.fillStyle = sheen;
  g.fillRect(bx, by, 60, bh);
  soft(g, bx + 90, by + 70, 160, 90, "220,230,255", 0.12);
  soft(g, 0, by + bh, bw * 0.7, 120, "0,0,0", 0.35);
  // a warm touch of the lamp on its upper left
  soft(g, bx + 40, by + 40, 120, 120, "255,210,150", 0.08);
  g.restore();
  rr(g, bx + 0.5, by + 0.5, bw - 1, bh - 1, 62);
  g.strokeStyle = "rgba(180,200,240,0.3)";
  g.lineWidth = 1.2;
  g.stroke();
  rr(g, bx + 12, by + 12, bw - 24, bh - 24, 50);
  g.strokeStyle = "rgba(0,0,0,0.35)";
  g.lineWidth = 1.5;
  g.stroke();
  rr(g, bx + 13, by + 13, bw - 26, bh - 26, 49);
  g.strokeStyle = "rgba(200,215,255,0.07)";
  g.lineWidth = 1;
  g.stroke();

  // the earpiece
  rr(g, -46, by + 20, 92, 16, 8);
  g.fillStyle = "#07090d";
  g.fill();
  rr(g, -46, by + 21, 92, 16, 8);
  g.strokeStyle = "rgba(200,215,255,0.18)";
  g.lineWidth = 1;
  g.stroke();
  for (let i = 0; i < 10; i++) {
    g.fillStyle = "#1e2534";
    g.beginPath();
    g.arc(-33 + i * 7.3, by + 28, 1.6, 0, Math.PI * 2);
    g.fill();
  }

  // the glossy black bezel round the LCD
  const sx = -105 - 16;
  const sy = -218 - 74 - 16;
  const sw = 210 + 32;
  const sh = 148 + 32;
  rr(g, sx - 2, sy - 2, sw + 4, sh + 4, 21);
  g.fillStyle = "rgba(0,0,0,0.5)";
  g.fill();
  const bz = g.createLinearGradient(0, sy, 0, sy + sh);
  bz.addColorStop(0, "#151a22");
  bz.addColorStop(1, "#05070a");
  rr(g, sx, sy, sw, sh, 19);
  g.fillStyle = bz;
  g.fill();
  g.save();
  rr(g, sx, sy, sw, sh, 19);
  g.clip();
  g.fillStyle = "rgba(220,230,255,0.09)";
  g.beginPath();
  g.moveTo(sx, sy);
  g.lineTo(sx + sw * 0.55, sy);
  g.lineTo(sx, sy + sh * 0.6);
  g.closePath();
  g.fill();
  g.restore();
  rr(g, sx + 0.5, sy + 0.5, sw - 1, sh - 1, 19);
  g.strokeStyle = "rgba(200,215,255,0.22)";
  g.stroke();

  // the little silver plate under it
  const pg = g.createLinearGradient(0, -116, 0, -103);
  pg.addColorStop(0, "#d8dde6");
  pg.addColorStop(0.5, "#8a93a4");
  pg.addColorStop(1, "#4a5262");
  rr(g, -40, -116, 80, 13, 6);
  g.fillStyle = pg;
  g.fill();
  g.fillStyle = "rgba(30,36,48,0.85)";
  g.font = "bold 8px Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("N O K I O", 0, -109.3);

  // the keypad's well, a faint recess the keys sit in
  rr(g, -150, -64, 300, 400, 30);
  g.fillStyle = "rgba(0,0,0,0.16)";
  g.fill();

  // the microphone
  for (let i = 0; i < 5; i++) {
    g.fillStyle = "#07090d";
    g.beginPath();
    g.arc(-18 + i * 9, by + bh - 24, 1.9, 0, Math.PI * 2);
    g.fill();
  }
  return c;
}

// ── the keys ────────────────────────────────────────────────────────────────

// a rubber key: its shadow, a domed face catching the lamp, a soft rim
function paintKey(k) {
  const { w, h, r } = k;
  const c = makeCanvas((w + PAD * 2) * K, (h + PAD * 2) * K);
  const g = c.getContext("2d");
  g.scale(K, K);
  g.translate(PAD + w / 2, PAD + h / 2);
  g.save();
  g.shadowColor = "rgba(0,0,0,0.7)";
  g.shadowBlur = 5 * K;
  g.shadowOffsetX = 1.5 * K;
  g.shadowOffsetY = 3.5 * K;
  rr(g, -w / 2, -h / 2, w, h, r);
  g.fillStyle = k.bot;
  g.fill();
  g.restore();
  const face = g.createLinearGradient(0, -h / 2, 0, h / 2);
  face.addColorStop(0, k.top);
  face.addColorStop(1, k.bot);
  rr(g, -w / 2, -h / 2, w, h, r);
  g.fillStyle = face;
  g.fill();
  g.save();
  rr(g, -w / 2, -h / 2, w, h, r);
  g.clip();
  soft(g, -w * 0.18, -h * 0.28, w * 0.5, h * 0.35, "255,255,255", 0.14);
  g.restore();
  rr(g, -w / 2 + 0.6, -h / 2 + 0.6, w - 1.2, h - 1.2, r);
  g.strokeStyle = k.edge;
  g.lineWidth = 1;
  g.stroke();
  return c;
}

// the round navigation key: a dark ring, a domed centre, two chevrons
function paintNav() {
  const { w, h } = NAV;
  const c = makeCanvas((w + PAD * 2) * K, (h + PAD * 2) * K);
  const g = c.getContext("2d");
  g.scale(K, K);
  g.translate(PAD + w / 2, PAD + h / 2);
  g.save();
  g.shadowColor = "rgba(0,0,0,0.7)";
  g.shadowBlur = 5 * K;
  g.shadowOffsetX = 1.5 * K;
  g.shadowOffsetY = 3.5 * K;
  g.fillStyle = "#11151c";
  g.beginPath();
  g.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
  const ring = g.createLinearGradient(0, -h / 2, 0, h / 2);
  ring.addColorStop(0, "#2c3442");
  ring.addColorStop(1, "#11151c");
  g.fillStyle = ring;
  g.beginPath();
  g.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(200,215,240,0.18)";
  g.lineWidth = 1;
  g.stroke();
  const ctr = g.createRadialGradient(-8, -9, 2, 0, 0, 27);
  ctr.addColorStop(0, "#4a5468");
  ctr.addColorStop(1, "#1e242e");
  g.fillStyle = ctr;
  g.beginPath();
  g.arc(0, 0, 27, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(0,0,0,0.5)";
  g.stroke();
  g.strokeStyle = "rgba(220,228,245,0.55)";
  g.lineWidth = 1.6;
  g.lineCap = "round";
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.moveTo(sx * 39, -4);
    g.lineTo(sx * 44, 0);
    g.lineTo(sx * 39, 4);
    g.stroke();
  }
  return c;
}

// ── helpers ─────────────────────────────────────────────────────────────────

export function keyOrigin(w, h) {
  return { scale: 1 / K, w: w + PAD * 2, h: h + PAD * 2 };
}

function rr(g, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function soft(g, cx, cy, rx, ry, rgbs, a) {
  g.save();
  g.translate(cx, cy);
  g.scale(rx, ry);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
  gr.addColorStop(0, `rgba(${rgbs},${a})`);
  gr.addColorStop(1, `rgba(${rgbs},0)`);
  g.fillStyle = gr;
  g.fillRect(-1, -1, 2, 2);
  g.restore();
}

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}
