import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";

/** The botanical trophy wall for FLAGS: a photoreal walnut cabinet and rainy
 *  laboratory window, with photoreal struck medal faces and exact live flag
 *  ribbons so the visual code remains precise. */

const K = { room: "fl_room", glow: "fl_glow", glint: "fl_glint" };
const HANG = { ribbon: "fl_ribbon_", disc: "fl_disc_", sheen: "fl_sheen_" }; // + the medal's index
export const TROPHY_BACKGROUND = "fl_trophy_background";
export const TROPHY_BACKGROUND_URL = "assets/images/Flags/trophy-wall-background.png";
export const TROPHY_MEDAL_FACES = "fl_trophy_medal_faces";
export const TROPHY_MEDAL_FACES_URL = "assets/images/Flags/trophy-medal-faces.png";
export const TROPHY_BRAZIL_MEDAL = "fl_trophy_brazil_medal";
export const TROPHY_BRAZIL_MEDAL_URL = "assets/images/Flags/trophy-brazil-medal.png";

// what is won, across a polished curve: the dark edge, the shadow, the body,
// the light, the body, the room reflected, a lighter band, the far edge
export const METAL = {
  gold: ["#2a1c04", "#7a5814", "#c99a38", "#fff0bc", "#d6ab4c", "#664608", "#bd8f30", "#463006"],
  silver: ["#1e2228", "#5c646e", "#b8bec6", "#f6f8fa", "#c8ced4", "#4c545e", "#9aa2aa", "#30363e"],
  bronze: ["#261204", "#6c3c1a", "#b27848", "#f6d0a6", "#bc8456", "#5a2e12", "#a06634", "#381c08"],
  copper: ["#2a0e06", "#74301a", "#bc6a48", "#ffc8a8", "#c8785a", "#5e2414", "#a85638", "#3a140a"],
};
const STOPS = [0, 0.12, 0.28, 0.37, 0.47, 0.63, 0.8, 1];

// the five ribbons, each its country's flag as a ribbon would wear it
export const RIBBON = {
  DE: { stripes: ["#151517", "#c8201b", "#f2c21c"] },
  BR: { stripes: ["#f2cf1e", "#0b8a40", "#0b8a40", "#0b8a40", "#f2cf1e"], globe: true },
  IE: { stripes: ["#14905a", "#f3f1ea", "#f08a3e"] },
  FI: { stripes: ["#f3f3ef"], cross: "#123f8f" },
  NG: { stripes: ["#0a7f4a", "#f3f1ea", "#0a7f4a"] },
};
// each medal: its metal, its shape, the plant struck on it
export const MEDAL = {
  DE: { metal: "bronze", sides: 0, motif: "leaf" },
  BR: { metal: "bronze", sides: 10, motif: "fern" },
  IE: { metal: "silver", sides: 0, motif: "shamrock" },
  FI: { metal: "gold", sides: 0, motif: "sprig" },
  NG: { metal: "copper", sides: 0, motif: "flower" },
};

// ── where everything is ─────────────────────────────────────────────────────

export function layoutTrophies(W, H, codes) {
  const u = Math.min(W / 1000, H / 600);
  const L = { W, H, u };
  L.case = { x1: W * 0.775 };
  L.upper = { y: H * 0.33, t: 18 * u };
  L.lower = { y: H * 0.82, t: 18 * u };
  L.window = { x0: W * 0.805, x1: W * 1.02, y0: -H * 0.02, y1: H * 0.72 };
  const sx = (f) => L.case.x1 * f;
  const up = L.upper.y;
  // the upper shelf: cups, certificates, scrolls, plants, a book
  L.certs = [
    { x: sx(0.24), y: up, w: 150 * u, h: 120 * u, rot: -0.02, title: "" },
    { x: sx(0.55), y: up, w: 150 * u, h: 125 * u, rot: 0.03, title: "Certificate" },
    { x: sx(0.93), y: up, w: 100 * u, h: 150 * u, rot: 0.05, title: "" },
  ];
  L.cups = [
    { x: sx(0.12), y: up, h: 150 * u, laurel: true },
    { x: sx(0.3), y: up, h: 130 * u, laurel: true },
    { x: sx(0.54), y: up, h: 150 * u, laurel: true, handles: true },
    { x: sx(0.72), y: up, h: 110 * u, laurel: false, handles: true, slim: true },
  ];
  L.plants = [{ x: sx(0.22), y: up, s: 38 * u }, { x: sx(0.44), y: up, s: 34 * u }, { x: sx(0.66), y: up, s: 30 * u }];
  L.scrolls = [
    { x0: sx(0.36), x1: sx(0.5), y: up - 11 * u, r: 11 * u },
    { x0: sx(0.64), x1: sx(0.86), y: up - 92 * u, r: 9 * u, lean: true },
  ];
  L.book = { x: sx(0.8), y: up, w: 90 * u, h: 120 * u };
  // the five medals, hung from the shelf's front edge, left to right
  const spots = [0.2, 0.36, 0.52, 0.68, 0.84];
  const lens = [150, 92, 104, 98, 92];
  L.medals = codes.map((code, i) => ({ code, index: i, x: sx(spots[i]), y: up + L.upper.t - 2 * u, len: lens[i] * u, r: 40 * u, w: 46 * u }));
  // the lower shelf: books lying, scrolls, medals lying loose, a plant, a certificate
  const lo = L.lower.y;
  L.lowBooks = [
    { x: sx(0.6), y: lo, w: 170 * u, h: 22 * u, col: "#1d2a22", title: "BOTANICA" },
    { x: sx(0.62), y: lo - 22 * u, w: 150 * u, h: 18 * u, col: "#3a2a1a", title: "" },
    { x: sx(0.66), y: lo - 40 * u, w: 120 * u, h: 20 * u, col: "#242a34", title: "" },
  ];
  L.lowScrolls = [{ x0: sx(0.26), x1: sx(0.44), y: lo - 12 * u, r: 12 * u }];
  L.loose = [
    { x: sx(0.3), y: lo - 4 * u, r: 18 * u, metal: "bronze" }, { x: sx(0.4), y: lo - 4 * u, r: 16 * u, metal: "gold" },
    { x: sx(0.48), y: lo - 4 * u, r: 15 * u, metal: "silver" }, { x: sx(0.08), y: lo - 32 * u, r: 28 * u, metal: "silver", standing: true },
  ];
  L.lowPlant = { x: sx(0.17), y: lo, s: 40 * u };
  L.lowCert = { x: sx(0.9), y: lo, w: 90 * u, h: 140 * u, rot: 0.06, title: "" };
  L.backCert = { x: sx(0.12), y: lo - 160 * u, w: 160 * u, h: 120 * u, rot: 0, title: "Certificate" };
  L.scope = { x: W * 0.9, y: L.window.y1 + 6 * u, s: u };
  // where the light catches the metal now and then
  L.glints = [
    ...L.cups.map((c) => ({ x: c.x - c.h * 0.08, y: c.y - c.h * 0.66, s: c.h * 0.8 })),
    ...L.medals.map((m) => ({ x: m.x - m.r * 0.45, y: m.y + m.len + m.r * 0.5, s: m.r * 3 })),
  ];
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintTrophies(scene, W, H, codes) {
  const L = layoutTrophies(W, H, codes);
  const t = scene.textures;
  const c = makeCanvas(W, H);
  const g = c.getContext("2d");
  const background = t.exists(TROPHY_BACKGROUND)
    ? t.get(TROPHY_BACKGROUND).getSourceImage()
    : null;
  const medalFaces = t.exists(TROPHY_MEDAL_FACES)
    ? t.get(TROPHY_MEDAL_FACES).getSourceImage()
    : null;
  const brazilMedal = t.exists(TROPHY_BRAZIL_MEDAL)
    ? t.get(TROPHY_BRAZIL_MEDAL).getSourceImage()
    : null;
  if (background) {
    g.drawImage(background, 0, 0, W, H);
    // The photograph supplies the cabinet and awards; keep the five puzzle
    // medals live so every ribbon keeps its exact national flag.
    for (const m of L.medals) paintMedal(g, L, m, medalFaces, brazilMedal, "shadow");
    vignette(g, W, H, 0.18);
    grain(g, W, H, 0.012);
  } else {
    paintRoom(g, L);
    paintWindow(g, L);
    paintMicroscope(g, L);
    paintBookcase(g, L);
    // the upper shelf, back to front
    for (const cert of L.certs) paintCertificate(g, L, cert);
    paintScroll(g, L, L.scrolls[1]);
    paintBook(g, L, L.book);
    for (const p of L.plants) paintPlant(g, L, p);
    for (const cup of L.cups) paintCup(g, L, cup);
    paintScroll(g, L, L.scrolls[0]);
    paintShelf(g, L, L.upper);
    // the lower shelf
    paintCertificate(g, L, L.backCert);
    paintCertificate(g, L, L.lowCert);
    paintPlant(g, L, L.lowPlant);
    for (const b of L.lowBooks) paintLyingBook(g, L, b);
    for (const s of L.lowScrolls) paintScroll(g, L, s);
    for (const m of L.loose) paintLooseMedal(g, L, m);
    paintShelf(g, L, L.lower);
    // the medals, in front of it all
    for (const m of L.medals) paintMedal(g, L, m, medalFaces, brazilMedal, "shadow");
    paintWindowLight(g, L);
    vignette(g, W, H, 0.85);
    grain(g, W, H, 0.03);
  }
  addCanvasTexture(t, K.room, c);
  addCanvasTexture(t, K.glow, glowCanvas());
  addCanvasTexture(t, K.glint, paintGlint());
  const medals = L.medals.map((m, i) => paintHanging(t, L, m, medalFaces, brazilMedal, i));
  return { L, keys: K, medals };
}

// One medal as the scene moves it: its ribbon, hung from the shelf's edge
// (`px`, `py`: where it turns, in the room), and its disc, hung from the
// ribbon's foot — each its own texture, with where its top-left corner sits
// in the room; and a sheen for the disc, the light along its face.
function paintHanging(t, L, m, faces, brazil, i) {
  const { u } = L, { x, y, len, r, w } = m, foot = y + len, my = foot + r * 0.86;
  const part = (key, x0, y0, x1, y1, paint) => {
    const c = makeCanvas(x1 - x0, y1 - y0), g = c.getContext("2d");
    g.translate(-x0, -y0);
    paint(g);
    addCanvasTexture(t, key, c);
    return { key, x0, y0 };
  };
  const ribbon = part(HANG.ribbon + i, x - w / 2 - 3 * u, y - 16 * u, x + w / 2 + 3 * u, foot + 3 * u,
    (g) => paintMedal(g, L, m, faces, brazil, "ribbon"));
  const box = [x - r * 1.2, foot - r * 0.3, x + r * 1.2, my + r * 1.25];
  const disc = part(HANG.disc + i, ...box, (g) => paintMedal(g, L, m, faces, brazil, "disc"));
  // the sheen: a band of the window's light across the face, held to its shape
  const sheen = part(HANG.sheen + i, ...box, (g) => {
    g.beginPath();
    const sides = MEDAL[m.code].sides;
    if (!sides) g.arc(x, my, r * 0.97, 0, Math.PI * 2);
    else for (let k = 0; k < sides; k++) {
      const a = -Math.PI / 2 + (k / sides) * Math.PI * 2 + Math.PI / sides;
      g[k ? "lineTo" : "moveTo"](x + Math.cos(a) * r * 0.97, my + Math.sin(a) * r * 0.97);
    }
    g.closePath();
    g.clip();
    const band = g.createLinearGradient(x - r, my - r, x + r, my + r);
    band.addColorStop(0, "rgba(255,244,214,0)");
    band.addColorStop(0.3, "rgba(255,244,214,0.05)");
    band.addColorStop(0.42, "rgba(255,248,226,0.75)");
    band.addColorStop(0.5, "rgba(255,244,214,0.12)");
    band.addColorStop(0.62, "rgba(190,214,236,0.3)");
    band.addColorStop(0.72, "rgba(190,214,236,0)");
    g.fillStyle = band;
    g.fillRect(x - r, my - r, r * 2, r * 2);
  });
  return {
    code: m.code, x, y, len, r, my,
    ribbon: { ...ribbon, px: x, py: y },
    disc: { ...disc, px: x, py: foot },
    sheen: { ...sheen, px: x, py: foot },
  };
}

export function releaseTrophyArt(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
  for (const prefix of Object.values(HANG))
    for (let i = 0; i < 8; i++) if (textures.exists(prefix + i)) textures.remove(prefix + i);
}

const metalFill = (g, metal, x0, x1, y0 = 0, y1 = 0) => {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  METAL[metal].forEach((col, i) => gr.addColorStop(STOPS[i], col));
  return gr;
};

// ── the room, the window, the microscope ────────────────────────────────────

function paintRoom(g, L) {
  const { W, H } = L;
  const wall = g.createLinearGradient(0, 0, W, 0);
  wall.addColorStop(0, "#0b0d0c"); wall.addColorStop(0.7, "#111614"); wall.addColorStop(1, "#0a0c0e");
  g.fillStyle = wall; g.fillRect(0, 0, W, H);
}

// the window: night and rain on the glass, the street's light far off,
// the glazing bars dark across it
function paintWindow(g, L) {
  const { u } = L;
  const w = L.window;
  const glass = g.createLinearGradient(0, w.y0, 0, w.y1);
  glass.addColorStop(0, "#1a2a3c"); glass.addColorStop(0.6, "#122030"); glass.addColorStop(1, "#0c1622");
  g.fillStyle = glass; g.fillRect(w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0);
  soft(g, w.x0 + (w.x1 - w.x0) * 0.6, w.y0 + (w.y1 - w.y0) * 0.55, 90 * u, 140 * u, "120,150,190", 0.25);
  // the rain: drops held on the glass, a few run down
  const rnd = lcg(93);
  for (let i = 0; i < 420; i++) {
    const x = w.x0 + rnd() * (w.x1 - w.x0), y = w.y0 + rnd() * (w.y1 - w.y0), r = (0.6 + rnd() * 2.2) * u;
    g.fillStyle = "rgba(6,12,20,0.55)"; g.beginPath(); g.ellipse(x + r * 0.3, y + r * 0.4, r, r * 1.2, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = `rgba(190,215,240,${(0.25 + rnd() * 0.35).toFixed(2)})`; g.beginPath(); g.ellipse(x - r * 0.25, y - r * 0.35, r * 0.45, r * 0.5, 0, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = "rgba(170,200,230,0.18)"; g.lineCap = "round";
  for (let i = 0; i < 26; i++) {
    const x = w.x0 + rnd() * (w.x1 - w.x0), y = w.y0 + rnd() * (w.y1 - w.y0) * 0.8;
    g.lineWidth = (0.8 + rnd()) * u;
    g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 2 * u, y + 20 * u, x - 2 * u, y + 40 * u, x + rnd() * 3 * u, y + (50 + rnd() * 80) * u); g.stroke();
  }
  g.lineCap = "butt";
  // the frame and its bars
  g.fillStyle = "#07090b";
  g.fillRect(w.x0 - 12 * u, w.y0, 14 * u, w.y1 - w.y0 + 10 * u);
  g.fillRect(w.x0 + (w.x1 - w.x0) * 0.52, w.y0, 10 * u, w.y1 - w.y0);
  for (const f of [0.18, 0.5]) g.fillRect(w.x0, w.y0 + (w.y1 - w.y0) * f, w.x1 - w.x0, 9 * u);
  // the sill
  const sill = g.createLinearGradient(0, w.y1, 0, w.y1 + 18 * u);
  sill.addColorStop(0, "#2a2420"); sill.addColorStop(1, "#0e0b09");
  g.fillStyle = sill; g.fillRect(w.x0 - 20 * u, w.y1, w.x1 - w.x0 + 40 * u, 18 * u);
  g.fillStyle = "rgba(160,190,220,0.25)"; g.fillRect(w.x0 - 20 * u, w.y1, w.x1 - w.x0 + 40 * u, 1.2 * u);
  g.fillStyle = "#08090a"; g.fillRect(w.x0 - 20 * u, w.y1 + 18 * u, w.x1 - w.x0 + 40 * u, L.H);
}

// a microscope on the sill, dark against the rain, the window's light along its edges
function paintMicroscope(g, L) {
  const { x, y, s } = L.scope;
  const P = (dx, dy) => [x + dx * s, y + dy * s];
  const shape = () => {
    g.beginPath();
    // the foot
    g.moveTo(...P(-46, 0)); g.lineTo(...P(40, 0)); g.lineTo(...P(34, -14)); g.lineTo(...P(-40, -14)); g.closePath();
    // the pillar and the arm, curving up and over
    g.moveTo(...P(-22, -14)); g.lineTo(...P(-22, -60));
    g.bezierCurveTo(...P(-30, -110), ...P(-14, -150), ...P(8, -168));
    g.lineTo(...P(20, -156));
    g.bezierCurveTo(...P(2, -138), ...P(-6, -108), ...P(0, -60));
    g.lineTo(...P(0, -14)); g.closePath();
    // the stage
    g.moveTo(...P(-6, -64)); g.lineTo(...P(44, -64)); g.lineTo(...P(44, -56)); g.lineTo(...P(-6, -56)); g.closePath();
    // the tube, slanting, the eyepiece on it
    g.moveTo(...P(6, -150)); g.lineTo(...P(40, -196)); g.lineTo(...P(54, -186)); g.lineTo(...P(22, -138)); g.closePath();
    g.moveTo(...P(38, -200)); g.lineTo(...P(48, -214)); g.lineTo(...P(60, -206)); g.lineTo(...P(52, -190)); g.closePath();
    // the objective, down at the stage
    g.moveTo(...P(16, -132)); g.lineTo(...P(26, -132)); g.lineTo(...P(24, -86)); g.lineTo(...P(18, -86)); g.closePath();
    // the focus knob
    g.moveTo(...P(-8, -92)); g.arc(...P(-14, -92), 9 * s, 0, Math.PI * 2);
  };
  shape();
  g.fillStyle = "#06080a"; g.fill();
  g.save(); g.translate(1.6 * s, -0.8 * s);
  shape(); g.strokeStyle = "rgba(140,175,215,0.35)"; g.lineWidth = 1.2 * s; g.stroke();
  g.restore();
}

// ── the bookcase ────────────────────────────────────────────────────────────

// the back of it, dark boards; its side against the window
function paintBookcase(g, L) {
  const { H, u } = L;
  const x1 = L.case.x1;
  const back = g.createLinearGradient(0, 0, 0, H);
  back.addColorStop(0, "#141a17"); back.addColorStop(0.5, "#101512"); back.addColorStop(1, "#0b0f0d");
  g.fillStyle = back; g.fillRect(0, 0, x1, H);
  g.strokeStyle = "rgba(0,0,0,0.5)"; g.lineWidth = 1.5 * u;
  for (let x = 60 * u; x < x1; x += 120 * u) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  // a little warm light pooled on the back, over the middle of the shelf
  soft(g, x1 * 0.45, L.upper.y - 120 * u, x1 * 0.42, 200 * u, "160,120,70", 0.12);
  soft(g, x1 * 0.5, L.lower.y - 110 * u, x1 * 0.45, 150 * u, "130,100,60", 0.08);
  // the side of the case
  const side = g.createLinearGradient(x1, 0, x1 + 26 * u, 0);
  side.addColorStop(0, "#1e1610"); side.addColorStop(0.4, "#2e2218"); side.addColorStop(1, "#0c0806");
  g.fillStyle = side; g.fillRect(x1, 0, 26 * u, H);
  g.fillStyle = "rgba(150,180,215,0.18)"; g.fillRect(x1 + 24 * u, 0, 1.5 * u, H);
}

// a shelf: its top lit a little, its front edge, the shadow it throws
function paintShelf(g, L, s) {
  const { u } = L;
  const x1 = L.case.x1;
  const front = g.createLinearGradient(0, s.y, 0, s.y + s.t);
  front.addColorStop(0, "#3c2b1c"); front.addColorStop(0.25, "#2c1f14"); front.addColorStop(1, "#140d08");
  g.fillStyle = front; g.fillRect(0, s.y, x1, s.t);
  g.fillStyle = "rgba(255,210,150,0.2)"; g.fillRect(0, s.y, x1, 1.2 * u);
  g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(0, s.y + s.t, x1, 8 * u);
  // the grain along it
  const rnd = lcg(Math.round(s.y));
  g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 0.8 * u;
  for (let i = 0; i < 6; i++) {
    const y = s.y + 3 * u + rnd() * (s.t - 5 * u);
    g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(x1 * 0.3, y + rnd() * 2 * u, x1 * 0.6, y - rnd() * 2 * u, x1, y); g.stroke();
  }
}

// ── on the shelves ──────────────────────────────────────────────────────────

// a certificate leant against the back: old paper, a printed border, a
// title and a drawn leaf, the light on its upper edge
function paintCertificate(g, L, c) {
  const { u } = L;
  g.save();
  g.translate(c.x, c.y); g.rotate(c.rot);
  soft(g, 6 * u, -c.h * 0.45, c.w * 0.6, c.h * 0.55, "0,0,0", 0.5);
  const paper = g.createLinearGradient(0, -c.h, 0, 0);
  paper.addColorStop(0, "#8a8068"); paper.addColorStop(0.5, "#6e6550"); paper.addColorStop(1, "#4a4334");
  g.fillStyle = paper; g.fillRect(-c.w / 2, -c.h, c.w, c.h);
  g.strokeStyle = "rgba(40,30,15,0.5)"; g.lineWidth = 1.2 * u;
  g.strokeRect(-c.w / 2 + 7 * u, -c.h + 7 * u, c.w - 14 * u, c.h - 14 * u);
  g.lineWidth = 0.6 * u; g.strokeRect(-c.w / 2 + 10 * u, -c.h + 10 * u, c.w - 20 * u, c.h - 20 * u);
  if (c.title) {
    g.fillStyle = "rgba(35,25,12,0.75)"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `italic 600 ${Math.round(c.w * 0.1)}px Georgia, "Times New Roman", serif`;
    g.fillText(c.title, 0, -c.h * 0.78);
  }
  // a leaf drawn on it, and lines of text under
  g.strokeStyle = "rgba(40,50,25,0.6)"; g.lineWidth = 1 * u;
  const ly = -c.h * (c.title ? 0.55 : 0.62), ls = c.w * 0.07;
  g.beginPath(); g.moveTo(0, ly + ls * 1.4); g.lineTo(0, ly - ls * 1.2); g.stroke();
  for (const k of [-1, 1]) for (let i = 0; i < 3; i++) {
    g.beginPath(); g.ellipse(k * ls * 0.5, ly - i * ls * 0.6, ls * 0.45, ls * 0.18, k * -0.6, 0, Math.PI * 2); g.stroke();
  }
  g.strokeStyle = "rgba(40,30,15,0.35)"; g.lineWidth = 0.8 * u;
  for (let i = 0; i < 4; i++) {
    const y = -c.h * 0.32 + i * c.h * 0.06, w = c.w * (0.5 - (i % 2) * 0.12);
    g.beginPath(); g.moveTo(-w / 2, y); g.lineTo(w / 2, y); g.stroke();
  }
  g.fillStyle = "rgba(255,230,180,0.12)"; g.fillRect(-c.w / 2, -c.h, c.w, 2 * u);
  g.restore();
}

// a scroll: a roll of paper tied with red ribbon, its ends showing the coil
function paintScroll(g, L, s) {
  const { u } = L;
  const r = s.r, len = s.x1 - s.x0;
  g.save();
  g.translate(s.x0, s.y);
  if (s.lean) g.rotate(-0.42);
  soft(g, len / 2 + 4 * u, r * 1.2, len * 0.55, r * 0.7, "0,0,0", 0.55);
  const body = g.createLinearGradient(0, -r, 0, r);
  body.addColorStop(0, "#9a8f76"); body.addColorStop(0.35, "#d8ccb0"); body.addColorStop(0.7, "#8c8068"); body.addColorStop(1, "#3e3828");
  g.fillStyle = body; g.fillRect(0, -r, len, r * 2);
  g.strokeStyle = "rgba(40,30,15,0.45)"; g.lineWidth = 0.8 * u;
  g.beginPath(); g.moveTo(len * 0.18, -r); g.lineTo(len * 0.2, r); g.stroke();
  // the ribbon round it, and its seal of wax
  g.fillStyle = "#7a1612"; g.fillRect(len * 0.56, -r * 1.02, r * 0.5, r * 2.04);
  g.fillStyle = "rgba(255,150,130,0.25)"; g.fillRect(len * 0.56, -r * 1.02, r * 0.5, r * 0.5);
  for (const end of [0, len]) {
    g.fillStyle = "#b8ac90"; g.beginPath(); g.ellipse(end, 0, r * 0.38, r, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(60,45,25,0.6)"; g.lineWidth = 0.7 * u;
    for (const f of [0.7, 0.45]) { g.beginPath(); g.ellipse(end, 0, r * 0.38 * f, r * f, 0, 0, Math.PI * 2); g.stroke(); }
  }
  g.restore();
}

// a book stood up, its front to us: cloth binding, a title stamped in gold, a plant drawn on it
function paintBook(g, L, b) {
  const { u } = L;
  soft(g, b.x + 6 * u, b.y - b.h * 0.4, b.w * 0.6, b.h * 0.5, "0,0,0", 0.5);
  const cloth = g.createLinearGradient(b.x - b.w / 2, 0, b.x + b.w / 2, 0);
  cloth.addColorStop(0, "#2a3226"); cloth.addColorStop(0.5, "#3c4636"); cloth.addColorStop(1, "#1c2219");
  g.fillStyle = cloth; g.fillRect(b.x - b.w / 2, b.y - b.h, b.w, b.h);
  g.strokeStyle = "rgba(200,170,100,0.45)"; g.lineWidth = 1 * u;
  g.strokeRect(b.x - b.w / 2 + 6 * u, b.y - b.h + 6 * u, b.w - 12 * u, b.h - 12 * u);
  g.fillStyle = "rgba(214,182,110,0.75)"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `600 ${Math.round(b.w * 0.13)}px Georgia, "Times New Roman", serif`;
  g.fillText("BOTANICA", b.x, b.y - b.h * 0.78);
  g.strokeStyle = "rgba(214,182,110,0.55)";
  const cy = b.y - b.h * 0.42;
  g.beginPath(); g.moveTo(b.x, cy + 22 * u); g.lineTo(b.x, cy - 18 * u); g.stroke();
  for (const k of [-1, 1]) for (let i = 0; i < 3; i++) {
    g.beginPath(); g.ellipse(b.x + k * 7 * u, cy - i * 9 * u, 8 * u, 3 * u, k * -0.5, 0, Math.PI * 2); g.stroke();
  }
}

// a book lying flat on the lower shelf: its spine to us, the page edges pale
function paintLyingBook(g, L, b) {
  const { u } = L;
  g.fillStyle = "rgba(0,0,0,0.45)"; g.fillRect(b.x - b.w / 2 + 4 * u, b.y - 2 * u, b.w, 4 * u);
  const spine = g.createLinearGradient(0, b.y - b.h, 0, b.y);
  spine.addColorStop(0, b.col); spine.addColorStop(0.4, "rgba(255,255,255,0.08)"); spine.addColorStop(1, "#050505");
  g.fillStyle = b.col; g.fillRect(b.x - b.w / 2, b.y - b.h, b.w, b.h);
  g.fillStyle = spine; g.fillRect(b.x - b.w / 2, b.y - b.h, b.w, b.h);
  g.fillStyle = "rgba(200,170,100,0.5)"; g.fillRect(b.x - b.w / 2 + 8 * u, b.y - b.h + 3 * u, 2 * u, b.h - 6 * u);
  g.fillRect(b.x + b.w / 2 - 10 * u, b.y - b.h + 3 * u, 2 * u, b.h - 6 * u);
  if (b.title) {
    g.fillStyle = "rgba(214,182,110,0.8)"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `600 ${Math.round(b.h * 0.55)}px Georgia, "Times New Roman", serif`;
    g.fillText(b.title, b.x, b.y - b.h / 2 + 1);
  }
}

// a little plant in a clay pot: the pot's rim and body, a rosette of leaves
function paintPlant(g, L, p) {
  const { u } = L;
  const { x, y, s } = p;
  soft(g, x + 4 * u, y - 2 * u, s * 0.7, 5 * u, "0,0,0", 0.6);
  const clay = g.createLinearGradient(x - s / 2, 0, x + s / 2, 0);
  clay.addColorStop(0, "#3a1c10"); clay.addColorStop(0.35, "#8a4a2c"); clay.addColorStop(0.6, "#6a3620"); clay.addColorStop(1, "#24110a");
  g.fillStyle = clay;
  g.beginPath(); g.moveTo(x - s * 0.42, y - s * 0.72); g.lineTo(x + s * 0.42, y - s * 0.72); g.lineTo(x + s * 0.32, y); g.lineTo(x - s * 0.32, y); g.closePath(); g.fill();
  g.fillRect(x - s * 0.48, y - s * 0.86, s * 0.96, s * 0.16);
  g.fillStyle = "rgba(255,200,160,0.18)"; g.fillRect(x - s * 0.48, y - s * 0.86, s * 0.96, 1.2 * u);
  const rnd = lcg(Math.round(x));
  for (let i = 0; i < 11; i++) {
    const a = -Math.PI / 2 + (rnd() - 0.5) * 2.4, len = s * (0.45 + rnd() * 0.45);
    g.save(); g.translate(x, y - s * 0.86); g.rotate(a + Math.PI / 2);
    const leaf = g.createLinearGradient(-s * 0.08, 0, s * 0.08, 0);
    leaf.addColorStop(0, "#14301a"); leaf.addColorStop(0.5, "#3c7a44"); leaf.addColorStop(1, "#102614");
    g.fillStyle = leaf;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s * 0.1, -len * 0.5, 0, -len); g.quadraticCurveTo(-s * 0.1, -len * 0.5, 0, 0); g.fill();
    g.restore();
  }
}

// a gold cup on its plinth: turned and polished, a laurel wreath round its
// bowl if it has one, handles if it has them, a brass plate on the plinth
function paintCup(g, L, c) {
  const { u } = L;
  const { x, y } = c;
  const ph = c.h * 0.17, pw = c.h * 0.42;
  // the plinth, dark wood, its brass plate
  soft(g, x + 5 * u, y - 2 * u, pw * 0.7, 6 * u, "0,0,0", 0.75);
  const wood = g.createLinearGradient(x - pw / 2, 0, x + pw / 2, 0);
  wood.addColorStop(0, "#120c08"); wood.addColorStop(0.35, "#3a2a1c"); wood.addColorStop(1, "#0a0706");
  g.fillStyle = wood; g.fillRect(x - pw / 2, y - ph, pw, ph);
  g.fillStyle = "rgba(255,210,150,0.2)"; g.fillRect(x - pw / 2, y - ph, pw, 1.2 * u);
  g.fillStyle = metalFill(g, "gold", x - pw * 0.36, x + pw * 0.36, y - ph * 0.7, y - ph * 0.3);
  g.fillRect(x - pw * 0.36, y - ph * 0.72, pw * 0.72, ph * 0.46);
  g.fillStyle = "rgba(40,25,5,0.8)"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `600 ${Math.max(5, Math.round(ph * 0.18))}px Georgia, serif`;
  g.fillText("Olympiad", x, y - ph * 0.49);
  // the cup: foot, stem, knop, bowl
  const h = c.h - ph, foot = y - ph;
  const prof = c.slim
    ? [[0, 0.17], [0.04, 0.16], [0.07, 0.05], [0.42, 0.035], [0.48, 0.07], [0.62, 0.14], [0.85, 0.17], [1, 0.19]]
    : [[0, 0.19], [0.04, 0.18], [0.07, 0.06], [0.3, 0.045], [0.34, 0.07], [0.38, 0.05], [0.44, 0.14], [0.62, 0.24], [0.82, 0.27], [1, 0.29]];
  const at = (f) => { for (let i = 1; i < prof.length; i++) if (prof[i][0] >= f) { const [f0, r0] = prof[i - 1], [f1, r1] = prof[i]; return r0 + ((f - f0) / (f1 - f0 || 1)) * (r1 - r0); } return prof[prof.length - 1][1]; };
  const R = Math.max(...prof.map((p) => p[1])) * h;
  const Y = (f) => foot - f * h;
  const outline = () => {
    const pts = [...prof.map(([f, r]) => [x + r * h, Y(f)]), ...prof.map(([f, r]) => [x - r * h, Y(f)]).reverse()];
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) g.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); g.closePath();
  };
  if (c.handles) {
    for (const sgn of [-1, 1]) {
      const a = Y(0.9), b = Y(0.5), out = R + h * 0.16;
      const path = () => { g.beginPath(); g.moveTo(x + sgn * at(0.9) * h * 0.92, a); g.bezierCurveTo(x + sgn * (out + h * 0.05), a - h * 0.03, x + sgn * (out + h * 0.02), b + h * 0.06, x + sgn * at(0.5) * h * 0.9, b); };
      g.lineCap = "round";
      path(); g.strokeStyle = METAL.gold[0]; g.lineWidth = h * 0.05; g.stroke();
      path(); g.strokeStyle = METAL.gold[2]; g.lineWidth = h * 0.032; g.stroke();
      g.save(); g.translate(-sgn * h * 0.006, -h * 0.006); path(); g.strokeStyle = METAL.gold[3]; g.lineWidth = h * 0.01; g.stroke(); g.restore();
      g.lineCap = "butt";
    }
  }
  outline(); g.fillStyle = metalFill(g, "gold", x - R, x + R); g.fill();
  g.save(); outline(); g.clip();
  const fall = g.createLinearGradient(0, Y(1), 0, foot);
  fall.addColorStop(0, "rgba(255,235,190,0.1)"); fall.addColorStop(0.6, "rgba(0,0,0,0)"); fall.addColorStop(1, "rgba(0,0,0,0.4)");
  g.fillStyle = fall; g.fillRect(x - R, Y(1), R * 2, h);
  soft(g, x - R * 0.36, Y(0.68), R * 0.12, h * 0.24, "255,250,230", 0.6, "lighter");
  soft(g, x - R * 0.38, Y(0.76), R * 0.06, h * 0.05, "255,255,255", 0.85, "lighter");
  soft(g, x + R * 0.55, Y(0.62), R * 0.08, h * 0.2, "150,180,220", 0.22, "lighter"); // the window, cold, on the far side
  g.restore();
  // the mouth: the rim, the dark of the bowl
  const rim = at(1) * h, ry = rim * 0.2;
  const inside = g.createLinearGradient(x - rim, 0, x + rim, 0);
  inside.addColorStop(0, METAL.gold[1]); inside.addColorStop(0.6, METAL.gold[0]); inside.addColorStop(1, METAL.gold[2]);
  g.fillStyle = inside; g.beginPath(); g.ellipse(x, Y(1), rim, ry, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = METAL.gold[3]; g.lineWidth = Math.max(1, 1.5 * u);
  g.beginPath(); g.ellipse(x, Y(1), rim, ry, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  // the laurel wreath round the bowl: two sprays of gold leaves, rising either side
  if (c.laurel) {
    for (const sgn of [-1, 1]) {
      for (let i = 0; i < 8; i++) {
        const k = i / 7;
        const lx = x + sgn * (R * 1.05 + h * 0.05 * Math.sin(k * Math.PI)), ly = Y(0.42 + k * 0.5);
        g.save(); g.translate(lx, ly); g.rotate(sgn * (0.5 + k * 0.6));
        g.fillStyle = "rgba(0,0,0,0.4)"; g.beginPath(); g.ellipse(1, 1.2, h * 0.05, h * 0.02, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = metalFill(g, "gold", -h * 0.05, h * 0.05); g.beginPath(); g.ellipse(0, 0, h * 0.05, h * 0.02, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
    }
  }
}

// a medal lying loose on the shelf, seen from above and in front: a flattened
// disc, its rim catching the light; or one stood up on its edge
function paintLooseMedal(g, L, m) {
  const { u } = L;
  const ry = m.standing ? m.r : m.r * 0.32;
  soft(g, m.x + 3 * u, m.y + ry * 0.6, m.r * 1.1, ry * 0.6, "0,0,0", 0.55);
  g.fillStyle = metalFill(g, m.metal, m.x - m.r, m.x + m.r, m.y - ry, m.y + ry);
  g.beginPath(); g.ellipse(m.x, m.y, m.r, ry, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(0,0,0,0.4)"; g.lineWidth = Math.max(1, m.r * 0.08);
  g.beginPath(); g.ellipse(m.x, m.y, m.r * 0.8, ry * 0.8, 0, 0, Math.PI * 2); g.stroke();
  soft(g, m.x - m.r * 0.4, m.y - ry * 0.4, m.r * 0.3, ry * 0.3, "255,250,235", 0.5, "lighter");
}

// ── the five medals ─────────────────────────────────────────────────────────

// a medal hung from the shelf's edge: a broad ribbon in its country's flag,
// folded over the edge and down to a ring; the medal — round or many-sided —
// with a raised rim, the words of the Olympiad round it, and a plant struck
// in relief in the middle
// `part`: "shadow" (what it throws on the shelf behind), "ribbon", "disc"
// (with its ring), or all of them
export function paintMedal(g, L, m, medalFaces, brazilMedal, part = "all") {
  const { u } = L;
  const { x, y, len, r, w, code } = m;
  const look = MEDAL[code], rib = RIBBON[code];
  const my = y + len + r * 0.86;
  // shadows behind, on the shelf front and the dark below it
  if (part === "all" || part === "shadow") {
    soft(g, x + 7 * u, y + len * 0.5, w * 0.55, len * 0.55, "0,0,0", 0.45);
    soft(g, x + 8 * u, my + 8 * u, r * 1.2, r * 1.2, "0,0,0", 0.55);
  }
  if (part === "shadow") return;
  // the ribbon: over the edge, then straight down, narrowing a little to the ring
  const foot = y + len;
  if (part !== "disc") paintRibbon();
  if (part === "ribbon") return;
  function paintRibbon() {
  const ribbon = () => {
    g.beginPath();
    g.moveTo(x - w / 2, y - 14 * u); g.lineTo(x + w / 2, y - 14 * u);
    g.lineTo(x + w / 2, y + len * 0.3);
    g.lineTo(x + w * 0.42, foot); g.lineTo(x - w * 0.42, foot);
    g.lineTo(x - w / 2, y + len * 0.3); g.closePath();
  };
  g.save(); ribbon(); g.clip();
  const n = rib.stripes.length;
  rib.stripes.forEach((col, i) => { g.fillStyle = col; g.fillRect(x - w / 2 + (i * w) / n, y - 14 * u, w / n + 0.6, len + 14 * u); });
  if (rib.cross) {
    g.fillStyle = rib.cross;
    g.fillRect(x - w * 0.12, y - 14 * u, w * 0.24, len + 14 * u);
    g.fillRect(x - w / 2, y + len * 0.28, w, w * 0.24);
  }
  if (rib.globe) {
    const gy = y + len * 0.42, gr = w * 0.15;
    const gl = g.createRadialGradient(x - gr * 0.3, gy - gr * 0.3, 0, x, gy, gr);
    gl.addColorStop(0, "#5a88d8"); gl.addColorStop(1, "#16306e");
    g.fillStyle = gl; g.beginPath(); g.arc(x, gy, gr, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = gr * 0.18; g.beginPath(); g.arc(x - gr * 0.2, gy + gr * 1.1, gr * 1.3, -2.1, -1.1); g.stroke();
  }
  // its silk: worn, a sheen down one side, shadow down the other, the fold over the edge
  const silk = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  silk.addColorStop(0, "rgba(0,0,0,0.45)"); silk.addColorStop(0.28, "rgba(255,255,255,0.12)"); silk.addColorStop(0.5, "rgba(0,0,0,0)"); silk.addColorStop(1, "rgba(0,0,0,0.5)");
  g.fillStyle = silk; g.fillRect(x - w / 2, y - 14 * u, w, len + 14 * u);
  const fold = g.createLinearGradient(0, y - 14 * u, 0, foot);
  fold.addColorStop(0, "rgba(255,240,220,0.18)"); fold.addColorStop(0.12, "rgba(0,0,0,0.55)"); fold.addColorStop(0.22, "rgba(0,0,0,0.05)"); fold.addColorStop(0.7, "rgba(0,0,0,0.1)"); fold.addColorStop(1, "rgba(0,0,0,0.35)");
  g.fillStyle = fold; g.fillRect(x - w / 2, y - 14 * u, w, len + 14 * u);
  const rnd = lcg(code.charCodeAt(0) * 7);
  g.fillStyle = "rgba(0,0,0,0.12)";
  for (let i = 0; i < 40; i++) g.fillRect(x - w / 2 + rnd() * w, y + rnd() * len, 0.8 * u, (2 + rnd() * 6) * u);
  g.restore();
  }
  // the ring and the loop it hangs by
  g.strokeStyle = metalFill(g, look.metal, x - r * 0.2, x + r * 0.2);
  g.lineWidth = Math.max(1.6, r * 0.08);
  g.beginPath(); g.ellipse(x, foot + r * 0.02, r * 0.14, r * 0.12, 0, 0, Math.PI * 2); g.stroke();
  // the medal body: a cast edge sits just below the face, giving the disc
  // thickness before the brighter struck face is laid over it.
  const outline = (rr) => {
    g.beginPath();
    if (!look.sides) { g.arc(x, my, rr, 0, Math.PI * 2); return; }
    for (let i = 0; i < look.sides; i++) {
      const a = -Math.PI / 2 + (i / look.sides) * Math.PI * 2 + Math.PI / look.sides;
      const px = x + Math.cos(a) * rr, py = my + Math.sin(a) * rr;
      if (i) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.closePath();
  };
  if (medalFaces || (m.index === 1 && brazilMedal)) {
    // These five photographed faces were generated as a clean sprite strip;
    // crop the exact medal bounds and keep the national-flag silk ribbons live.
    if (m.index === 1 && brazilMedal) {
      g.drawImage(brazilMedal, x - r, my - r, r * 2, r * 2);
    } else if (medalFaces) {
      const faceBounds = [28, 456, 880, 1306, 1732];
      const size = 412;
      g.drawImage(medalFaces, faceBounds[m.index], 128, size, size, x - r, my - r, r * 2, r * 2);
    }
    // The suspension eyelet sits over the face where the ribbon meets it.
    g.lineWidth = Math.max(1.2, r * 0.055);
    g.strokeStyle = "rgba(31,23,14,0.9)";
    g.beginPath(); g.ellipse(x, foot + r * 0.02, r * 0.14, r * 0.12, 0, 0, Math.PI * 2); g.stroke();
    g.lineWidth = Math.max(0.7, r * 0.024);
    g.strokeStyle = "rgba(239,213,160,0.78)";
    g.beginPath(); g.ellipse(x - r * 0.025, foot + r * 0.005, r * 0.11, r * 0.09, 0, Math.PI * 1.05, Math.PI * 1.85); g.stroke();
    return;
  }
  g.save(); g.translate(0, 2.3 * u); outline(r * 0.98);
  g.fillStyle = METAL[look.metal][0]; g.fill();
  g.strokeStyle = "rgba(8,6,4,0.72)"; g.lineWidth = Math.max(1, r * 0.055); g.stroke();
  g.restore();
  outline(r); g.fillStyle = medalFaceFill(g, look.metal, x, my, r); g.fill();
  // Fine, broken casting marks keep the surface from reading as smooth plastic.
  g.save(); outline(r * 0.94); g.clip();
  const wear = lcg(code.charCodeAt(0) * 173 + 29);
  for (let i = 0; i < 54; i++) {
    const a = wear() * Math.PI * 2;
    const rr = r * (0.34 + wear() * 0.52);
    const sweep = 0.018 + wear() * 0.085;
    g.beginPath(); g.arc(x, my, rr, a, a + sweep);
    g.lineWidth = Math.max(0.45, u * (0.35 + wear() * 0.38));
    g.strokeStyle = wear() > 0.43 ? "rgba(255,239,194,0.18)" : "rgba(28,18,8,0.19)";
    g.stroke();
  }
  g.restore();
  // Concentric struck edges, with a narrow highlight and a dark recessed groove.
  outline(r * 0.94); g.lineWidth = Math.max(1, r * 0.065);
  g.strokeStyle = "rgba(20,13,6,0.72)"; g.stroke();
  outline(r * 0.91); g.lineWidth = Math.max(0.8, r * 0.026);
  g.strokeStyle = "rgba(255,226,155,0.5)"; g.stroke();
  outline(r * 0.86); g.lineWidth = Math.max(0.7, r * 0.018);
  g.strokeStyle = "rgba(36,23,9,0.65)"; g.stroke();
  // A fine beaded border catches light unevenly like an old struck medal.
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2 - Math.PI / 2;
    const bx = x + Math.cos(a) * r * 0.9, by = my + Math.sin(a) * r * 0.9;
    g.beginPath(); g.arc(bx, by, Math.max(0.55, r * 0.018), 0, Math.PI * 2);
    g.fillStyle = i < 16 ? "rgba(255,232,177,0.48)" : "rgba(24,16,8,0.48)"; g.fill();
  }
  // The recessed field is slightly darker than the rim; the botanical mark
  // sits in it as a shallow engraving with a cast shadow and a worn highlight.
  const field = g.createRadialGradient(x - r * 0.22, my - r * 0.3, r * 0.04, x, my, r * 0.78);
  field.addColorStop(0, "rgba(255,230,174,0.18)");
  field.addColorStop(0.6, "rgba(27,19,9,0.08)");
  field.addColorStop(1, "rgba(12,9,5,0.46)");
  g.fillStyle = field; g.beginPath(); g.arc(x, my, r * 0.81, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(225,188,115,0.44)"; g.lineWidth = Math.max(0.7, r * 0.018);
  g.beginPath(); g.arc(x, my, r * 0.81, Math.PI * 1.05, Math.PI * 1.88); g.stroke();
  // the words of the Olympiad, round the inside of the rim
  arcText(g, "BOTANICAL OLYMPIAD", x, my, r * 0.735, r * 0.14, look.metal);
  // the plant, struck in relief in the middle
  relief(g, look.motif, x, my + r * 0.05, r * 0.38, look.metal);
  // A restrained reflected window strip gives the metal a hard, directional
  // highlight instead of the broad soft blobs that made it look synthetic.
  g.save(); outline(r * 0.84); g.clip();
  const reflection = g.createLinearGradient(x - r * 0.85, my - r * 0.75, x + r * 0.35, my + r * 0.3);
  reflection.addColorStop(0, "rgba(255,247,220,0.28)");
  reflection.addColorStop(0.22, "rgba(255,247,220,0.06)");
  reflection.addColorStop(0.58, "rgba(255,255,255,0)");
  reflection.addColorStop(1, "rgba(126,169,202,0.12)");
  g.fillStyle = reflection; g.fillRect(x - r, my - r, r * 2, r * 2);
  g.restore();
}

function medalFaceFill(g, metal, x, y, r) {
  const colors = METAL[metal];
  const face = g.createRadialGradient(x - r * 0.28, y - r * 0.36, r * 0.04, x, y, r * 1.08);
  face.addColorStop(0, colors[3]);
  face.addColorStop(0.2, colors[2]);
  face.addColorStop(0.48, colors[4]);
  face.addColorStop(0.78, colors[1]);
  face.addColorStop(1, colors[0]);
  return face;
}

// letters set round an arc, struck into the metal (dark, a light edge under)
function arcText(g, text, x, y, rad, size, metal) {
  g.save();
  g.font = `700 ${Math.round(size)}px Georgia, "Times New Roman", serif`;
  g.textAlign = "center"; g.textBaseline = "middle";
  const span = Math.PI * 1.1, start = -Math.PI / 2 - span / 2;
  const chars = [...text];
  chars.forEach((ch, i) => {
    const a = start + (i + 0.5) * (span / chars.length);
    g.save();
    g.translate(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    g.rotate(a + Math.PI / 2);
    g.fillStyle = "rgba(255,245,220,0.35)"; g.fillText(ch, 0.5, 0.7);
    g.fillStyle = METAL[metal][0]; g.fillText(ch, 0, 0);
    g.restore();
  });
  g.restore();
}

// a plant in low relief: drawn twice, its shadow below and its lit edge above,
// over a darker field
function relief(g, motif, x, y, s, metal) {
  const draw = () => {
    g.beginPath();
    if (motif === "leaf") {
      g.moveTo(x, y + s); g.bezierCurveTo(x - s * 0.75, y + s * 0.2, x - s * 0.45, y - s * 0.8, x, y - s);
      g.bezierCurveTo(x + s * 0.45, y - s * 0.8, x + s * 0.75, y + s * 0.2, x, y + s);
      g.moveTo(x, y + s * 1.15); g.lineTo(x, y - s * 0.8);
      for (let i = 0; i < 4; i++) { const yy = y + s * 0.5 - i * s * 0.35; g.moveTo(x, yy); g.lineTo(x - s * 0.35, yy - s * 0.22); g.moveTo(x, yy); g.lineTo(x + s * 0.35, yy - s * 0.22); }
    } else if (motif === "fern") {
      g.moveTo(x - s * 0.2, y + s); g.quadraticCurveTo(x, y, x + s * 0.15, y - s);
      for (let i = 0; i < 7; i++) {
        const k = i / 7, cx = x - s * 0.2 + k * s * 0.33, cy = y + s * 0.85 - k * s * 1.75, l = s * (0.6 - k * 0.45);
        g.moveTo(cx, cy); g.quadraticCurveTo(cx - l * 0.6, cy - l * 0.1, cx - l, cy - l * 0.35);
        g.moveTo(cx, cy); g.quadraticCurveTo(cx + l * 0.6, cy - l * 0.2, cx + l, cy - l * 0.5);
      }
    } else if (motif === "shamrock") {
      for (const a of [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6]) {
        const lx = x + Math.cos(a) * s * 0.42, ly = y - s * 0.15 + Math.sin(a) * s * 0.42;
        g.moveTo(lx + s * 0.32, ly); g.arc(lx, ly, s * 0.32, 0, Math.PI * 2);
      }
      g.moveTo(x, y + s * 0.05); g.quadraticCurveTo(x + s * 0.1, y + s * 0.6, x + s * 0.35, y + s);
    } else if (motif === "sprig") {
      g.moveTo(x, y + s); g.lineTo(x, y - s * 0.9);
      for (let i = 0; i < 4; i++) {
        const yy = y + s * 0.5 - i * s * 0.42, k = i % 2 ? 1 : -1;
        g.moveTo(x, yy); g.quadraticCurveTo(x + k * s * 0.3, yy - s * 0.1, x + k * s * 0.42, yy - s * 0.32);
        g.moveTo(x + k * s * 0.42 + s * 0.09, yy - s * 0.36); g.arc(x + k * s * 0.42, yy - s * 0.36, s * 0.09, 0, Math.PI * 2);
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.moveTo(x, y - s * 0.2); g.quadraticCurveTo(x + Math.cos(a - 0.4) * s * 0.7, y - s * 0.2 + Math.sin(a - 0.4) * s * 0.7, x + Math.cos(a) * s * 0.75, y - s * 0.2 + Math.sin(a) * s * 0.75);
        g.quadraticCurveTo(x + Math.cos(a + 0.4) * s * 0.7, y - s * 0.2 + Math.sin(a + 0.4) * s * 0.7, x, y - s * 0.2);
      }
      g.moveTo(x, y + s * 0.05); g.quadraticCurveTo(x - s * 0.05, y + s * 0.6, x - s * 0.25, y + s);
    }
  };
  g.lineCap = "round"; g.lineJoin = "round";
  g.lineWidth = Math.max(1.2, s * 0.13);
  g.save(); g.translate(s * 0.05, s * 0.06); draw(); g.strokeStyle = "rgba(0,0,0,0.55)"; g.stroke(); g.restore();
  draw(); g.strokeStyle = METAL[metal][2]; g.stroke();
  g.save(); g.translate(-s * 0.03, -s * 0.04); draw(); g.strokeStyle = "rgba(255,248,225,0.5)"; g.lineWidth = Math.max(0.6, s * 0.04); g.stroke(); g.restore();
  g.lineCap = "butt"; g.lineJoin = "miter";
}

// the window's cold light on the right of the shelves, the room's dark on the left
function paintWindowLight(g, L) {
  const { W, H } = L;
  g.save();
  g.globalCompositeOperation = "soft-light";
  const cold = g.createLinearGradient(W * 0.4, 0, W * 0.8, 0);
  cold.addColorStop(0, "rgba(0,0,0,0)"); cold.addColorStop(1, "rgba(120,160,210,0.35)");
  g.fillStyle = cold; g.fillRect(0, 0, W, H);
  g.restore();
  const dark = g.createLinearGradient(0, 0, W * 0.25, 0);
  dark.addColorStop(0, "rgba(0,0,0,0.45)"); dark.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = dark; g.fillRect(0, 0, W * 0.25, H);
}

// ── the glint the scene lays over the metal now and then ───────────────────

function paintGlint() {
  const s = 64;
  const c = makeCanvas(s, s);
  const g = c.getContext("2d");
  const h = s / 2;
  const r = g.createRadialGradient(h, h, 0, h, h, h);
  r.addColorStop(0, "rgba(255,255,255,0.75)"); r.addColorStop(0.16, "rgba(255,248,225,0.32)"); r.addColorStop(1, "rgba(255,240,210,0)");
  g.fillStyle = r; g.fillRect(0, 0, s, s);
  // A small soft reflection looks like light moving over metal, without the
  // four-point star flare that made the awards feel like plastic props.
  g.save(); g.translate(h, h); g.rotate(-0.58);
  g.fillStyle = "rgba(255,253,238,0.52)";
  g.beginPath(); g.ellipse(-5, -2, 2.5, 11, 0, 0, Math.PI * 2); g.fill();
  g.restore();
  return c;
}
