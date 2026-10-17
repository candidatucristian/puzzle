import { soft, grain, vignette, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";
import { PHIALS, WEIGHTS } from "./puzzle.js";

/** The apothecary's balance for BALANCE, painted: a dark wall, his walnut
 *  desk under a lamp somewhere to the left, the balance in the middle of it —
 *  a mahogany plinth, a fluted brass column, an ivory scale at its foot —
 *  the four phials in a row on the left, and the box of brass weights open
 *  on the right, each weight in its velvet hole.
 *
 *  What moves is painted apart: the beam with its pointer, the pans, each
 *  phial and each weight, so the scene can hang and move them. */

export const KEYS = {
  room: "bl_room",
  beam: "bl_beam",
  pan: "bl_pan",
  phial: (i) => `bl_phial_${i}`,
  weight: (g) => `bl_weight_${g}`,
};

const RES = 2; // the moving parts are painted at twice their size

export function layoutBalance(W, H) {
  const u = Math.min(W / 1000, H / 620);
  const L = { W, H, u };
  L.deskY = H * 0.6; // the desk's back edge
  L.front = H * 0.94; // its front edge
  L.pivot = { x: W * 0.5, y: L.deskY - 205 * u };
  L.arm = 168 * u; // the beam, from its pivot to a hook
  L.chain = 150 * u; // from a hook down to its pan
  L.panR = 64 * u;
  L.base = { x: W * 0.5, y: L.deskY + 66 * u, w: 330 * u, h: 38 * u };
  // the phials, I to IV, standing in a row on the left of the desk
  L.phials = PHIALS.map((g, i) => {
    const h = (26 + 34 * Math.cbrt(g / 20)) * u;
    return { i, grams: g, h, w: h * 0.48, home: { x: W * 0.09 + i * 62 * u, y: L.deskY + 112 * u } };
  });
  // the box of weights on the right, its holes in two rows
  L.box = { x: W * 0.7, y: L.deskY + 58 * u, w: 230 * u, h: 104 * u };
  const holes = [
    [0.16, 0.36], [0.4, 0.36], [0.62, 0.36], [0.82, 0.38],
    [0.3, 0.74], [0.5, 0.74], [0.7, 0.74],
  ];
  L.weights = WEIGHTS.map((g, i) => {
    const h = (12 + 20 * Math.cbrt(g / 20)) * u;
    const [fx, fy] = holes[i];
    return { i, grams: g, h, w: h * 0.86, home: { x: L.box.x + L.box.w * fx, y: L.box.y + L.box.h * fy + h * 0.42 } };
  });
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

const BRASS = ["#2a1c06", "#6e5218", "#c9a457", "#f2dc9c", "#b48c3e", "#5a4012"];
const brass = (g, x0, y0, x1, y1) => {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  [0, 0.18, 0.42, 0.55, 0.75, 1].forEach((o, i) => gr.addColorStop(o, BRASS[i]));
  return gr;
};

export function paintBalance(scene, L) {
  const t = scene.textures;
  addCanvasTexture(t, KEYS.room, paintRoom(L));
  addCanvasTexture(t, KEYS.beam, paintBeam(L));
  addCanvasTexture(t, KEYS.pan, paintPan(L));
  for (const p of L.phials) addCanvasTexture(t, KEYS.phial(p.i), paintPhial(L, p));
  for (const g of new Set(WEIGHTS)) addCanvasTexture(t, KEYS.weight(g), paintWeight(L, L.weights.find((w) => w.grams === g)));
}

export function releaseBalance(textures) {
  const keys = [KEYS.room, KEYS.beam, KEYS.pan, ...PHIALS.map((_, i) => KEYS.phial(i)), ...new Set(WEIGHTS.map((g) => KEYS.weight(g)))];
  for (const k of keys) if (textures.exists(k)) textures.remove(k);
}

// The room: the wall in the dark, the desk under the lamp, the plinth and
// column of the balance, its scale, the box of weights with its lid open.
function paintRoom(L) {
  const { W, H, u, deskY, front } = L;
  const c = makeCanvas(W, H), g = c.getContext("2d");
  const rnd = lcg(5113);
  // the wall: dark green paint over old plaster, a dado rail
  g.fillStyle = "#0f1513";
  g.fillRect(0, 0, W, deskY);
  for (let i = 0; i < 90; i++) soft(g, rnd() * W, rnd() * deskY, 40 + rnd() * 120, 30 + rnd() * 90, rnd() < 0.5 ? "0,0,0" : "60,80,70", 0.05);
  const rail = deskY - 120 * u;
  g.fillStyle = "#0a0d0c"; g.fillRect(0, rail, W, deskY - rail);
  g.fillStyle = "rgba(255,220,170,0.06)"; g.fillRect(0, rail, W, 2 * u);
  g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(0, rail + 6 * u, W, 2 * u);
  // the lamp's light on the wall, warm, from the left and above
  soft(g, W * 0.3, deskY - 180 * u, W * 0.55, 260 * u, "255,190,120", 0.16, "lighter");
  // the desk: walnut, its grain running across, the light pooled on it
  const desk = g.createLinearGradient(0, deskY, 0, H);
  desk.addColorStop(0, "#1c120a"); desk.addColorStop(0.4, "#2e1d10"); desk.addColorStop(1, "#160d07");
  g.fillStyle = desk; g.fillRect(0, deskY, W, H - deskY);
  g.strokeStyle = "rgba(0,0,0,0.28)"; g.lineWidth = Math.max(1, u);
  for (let i = 0; i < 60; i++) {
    const y = deskY + rnd() * (front - deskY), x0 = rnd() * W * 0.4, x1 = x0 + W * (0.3 + rnd() * 0.7);
    g.beginPath(); g.moveTo(x0, y); g.bezierCurveTo(x0 + (x1 - x0) * 0.3, y + (rnd() - 0.5) * 6 * u, x0 + (x1 - x0) * 0.7, y + (rnd() - 0.5) * 6 * u, x1, y + (rnd() - 0.5) * 3 * u); g.stroke();
  }
  soft(g, W * 0.42, deskY + 90 * u, W * 0.5, 120 * u, "255,190,120", 0.2, "lighter");
  g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(0, deskY, W, 3 * u); // where it meets the wall
  // its front edge, and below it the dark
  g.fillStyle = "#3a2414"; g.fillRect(0, front, W, 4 * u);
  g.fillStyle = "rgba(255,214,170,0.18)"; g.fillRect(0, front, W, 1.2 * u);
  g.fillStyle = "#070504"; g.fillRect(0, front + 4 * u, W, H - front);
  // the phials' tray: a slip of green baize under them
  const p0 = L.phials[0], p3 = L.phials[L.phials.length - 1];
  g.fillStyle = "#18301f";
  g.beginPath(); g.ellipse((p0.home.x + p3.home.x) / 2, p0.home.y + 2 * u, (p3.home.x - p0.home.x) / 2 + 40 * u, 13 * u, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(255,255,255,0.03)";
  g.beginPath(); g.ellipse((p0.home.x + p3.home.x) / 2, p0.home.y, (p3.home.x - p0.home.x) / 2 + 36 * u, 10 * u, 0, Math.PI, Math.PI * 2); g.fill();
  paintStand(g, L);
  paintBox(g, L);
  vignette(g, W, H, 0.7);
  grain(g, W, H, 0.025);
  return c;
}

// The balance's own stand: a mahogany plinth with a drawer, a fluted brass
// column to the pivot, and at its foot the ivory scale the pointer reads.
function paintStand(g, L) {
  const { u, pivot, base: b } = L;
  // its shadow on the desk
  soft(g, b.x + 10 * u, b.y + b.h * 0.9, b.w * 0.62, 18 * u, "0,0,0", 0.7);
  // the plinth: mahogany, a moulded top, a drawer with a brass knob
  const x0 = b.x - b.w / 2, y0 = b.y - b.h;
  g.fillStyle = (() => { const gr = g.createLinearGradient(x0, 0, x0 + b.w, 0); gr.addColorStop(0, "#2a120a"); gr.addColorStop(0.35, "#5a2a16"); gr.addColorStop(1, "#200d07"); return gr; })();
  g.fillRect(x0, y0, b.w, b.h);
  g.fillStyle = "#6a3420"; g.fillRect(x0 - 6 * u, y0 - 6 * u, b.w + 12 * u, 7 * u);
  g.fillStyle = "rgba(255,210,170,0.25)"; g.fillRect(x0 - 6 * u, y0 - 6 * u, b.w + 12 * u, 1.5 * u);
  g.strokeStyle = "rgba(0,0,0,0.45)"; g.lineWidth = 1.2 * u;
  g.strokeRect(b.x - 50 * u, y0 + 10 * u, 100 * u, b.h - 18 * u);
  g.fillStyle = brass(g, b.x - 5 * u, 0, b.x + 5 * u, 0);
  g.beginPath(); g.arc(b.x, y0 + b.h * 0.55, 4.5 * u, 0, Math.PI * 2); g.fill();
  // levelling feet
  for (const fx of [x0 + 18 * u, x0 + b.w - 18 * u]) { g.fillStyle = brass(g, fx - 9 * u, 0, fx + 9 * u, 0); g.fillRect(fx - 9 * u, b.y - 1, 18 * u, 6 * u); }
  // the column: fluted brass, a collar at its foot and under the pivot
  const cw = 13 * u, top = pivot.y + 6 * u;
  g.fillStyle = brass(g, b.x - cw, 0, b.x + cw, 0);
  g.fillRect(b.x - cw / 2, top, cw, y0 - 6 * u - top);
  g.strokeStyle = "rgba(40,26,6,0.45)"; g.lineWidth = 0.8 * u;
  for (const f of [-0.3, 0, 0.3]) { g.beginPath(); g.moveTo(b.x + f * cw, top + 20 * u); g.lineTo(b.x + f * cw, y0 - 30 * u); g.stroke(); }
  for (const [y, w, h] of [[y0 - 6 * u - 14 * u, 34 * u, 14 * u], [y0 - 6 * u - 22 * u, 24 * u, 8 * u], [top - 4 * u, 22 * u, 10 * u]]) {
    g.fillStyle = brass(g, b.x - w / 2, 0, b.x + w / 2, 0);
    g.beginPath(); g.roundRect(b.x - w / 2, y, w, h, 2 * u); g.fill();
  }
  // the ivory scale the pointer reads, low on the column, and its zero
  const sy = y0 - 64 * u;
  g.fillStyle = "#d8ccb0";
  g.beginPath(); g.roundRect(b.x - 34 * u, sy, 68 * u, 13 * u, 2 * u); g.fill();
  g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(b.x - 34 * u, sy + 11 * u, 68 * u, 2 * u);
  g.strokeStyle = "#2a2018"; g.lineWidth = 0.8 * u;
  for (let k = -6; k <= 6; k++) {
    const x = b.x + k * 5 * u, len = k === 0 ? 9 * u : k % 2 ? 4 * u : 6 * u;
    g.beginPath(); g.moveTo(x, sy + 1 * u); g.lineTo(x, sy + 1 * u + len); g.stroke();
  }
  // a stop under each end of the beam: where it comes to rest when it leans
  for (const s of [-1, 1]) {
    const x = b.x + s * (L.arm - 26 * u), y = y0 - 6 * u;
    g.fillStyle = brass(g, x - 3 * u, 0, x + 3 * u, 0);
    g.fillRect(x - 2 * u, y - 14 * u, 4 * u, 14 * u);
  }
}

// The box of weights: an oak box lined with dark red velvet, its lid open
// against the light, a hole for each weight; the brass tweezers along the front.
function paintBox(g, L) {
  const { u, box: b } = L;
  soft(g, b.x + b.w / 2 + 8 * u, b.y + b.h + 4 * u, b.w * 0.6, 16 * u, "0,0,0", 0.7);
  // the lid, standing open behind it
  g.fillStyle = "#3a2614"; g.fillRect(b.x, b.y - 56 * u, b.w, 56 * u);
  g.fillStyle = "#5a1a1e"; g.fillRect(b.x + 8 * u, b.y - 50 * u, b.w - 16 * u, 44 * u);
  g.fillStyle = "rgba(255,220,180,0.08)"; g.fillRect(b.x + 8 * u, b.y - 50 * u, b.w - 16 * u, 6 * u);
  g.fillStyle = "rgba(226,200,150,0.55)"; g.font = `italic ${Math.round(9 * u)}px Georgia, serif`; g.textAlign = "center";
  g.fillText("Poids", b.x + b.w / 2, b.y - 28 * u);
  // the box: oak walls, the velvet tray
  g.fillStyle = "#4a3018"; g.fillRect(b.x, b.y, b.w, b.h);
  g.fillStyle = "rgba(255,214,170,0.18)"; g.fillRect(b.x, b.y, b.w, 1.4 * u);
  g.fillStyle = "#4a1216"; g.fillRect(b.x + 8 * u, b.y + 7 * u, b.w - 16 * u, b.h - 18 * u);
  const vel = g.createLinearGradient(0, b.y, 0, b.y + b.h);
  vel.addColorStop(0, "rgba(0,0,0,0.35)"); vel.addColorStop(0.3, "rgba(0,0,0,0)"); vel.addColorStop(1, "rgba(0,0,0,0.3)");
  g.fillStyle = vel; g.fillRect(b.x + 8 * u, b.y + 7 * u, b.w - 16 * u, b.h - 18 * u);
  // the holes the weights stand in
  for (const w of L.weights) {
    g.fillStyle = "#1a0507";
    g.beginPath(); g.ellipse(w.home.x, w.home.y - 1 * u, w.w * 0.56, w.w * 0.18, 0, 0, Math.PI * 2); g.fill();
  }
  // the box's front face
  g.fillStyle = "#3a2412"; g.fillRect(b.x, b.y + b.h - 11 * u, b.w, 11 * u);
  g.fillStyle = "rgba(0,0,0,0.4)"; g.fillRect(b.x, b.y + b.h - 11 * u, b.w, 1.2 * u);
  // the tweezers, lying along its front
  g.strokeStyle = brass(g, b.x + 20 * u, 0, b.x + 120 * u, 0); g.lineWidth = 2 * u; g.lineCap = "round";
  g.beginPath(); g.moveTo(b.x + 24 * u, b.y + b.h + 12 * u); g.lineTo(b.x + 116 * u, b.y + b.h + 8 * u); g.stroke();
  g.beginPath(); g.moveTo(b.x + 24 * u, b.y + b.h + 12 * u); g.lineTo(b.x + 114 * u, b.y + b.h + 14 * u); g.stroke();
  g.lineCap = "butt";
}

// The beam: a tapering brass bar on its knife-edge, a hook at each end, and
// the long pointer down from its middle to the scale. Painted about its
// pivot, at the middle of the texture.
function paintBeam(L) {
  const { u, arm } = L, R = RES;
  const w = (arm + 14 * u) * 2, h = 160 * u;
  const c = makeCanvas(w * R, h * R), g = c.getContext("2d");
  g.scale(R, R);
  const cx = w / 2, cy = 20 * u;
  // the pointer, down to the scale
  g.fillStyle = brass(g, cx - 2 * u, 0, cx + 2 * u, 0);
  g.beginPath(); g.moveTo(cx - 2.2 * u, cy); g.lineTo(cx + 2.2 * u, cy); g.lineTo(cx + 0.6 * u, cy + 132 * u); g.lineTo(cx - 0.6 * u, cy + 132 * u); g.closePath(); g.fill();
  g.fillStyle = "#1a1208"; g.fillRect(cx - 0.6 * u, cy + 124 * u, 1.2 * u, 9 * u);
  // the bar, thick in the middle, thin at its ends
  g.fillStyle = brass(g, 0, cy - 7 * u, 0, cy + 7 * u);
  g.beginPath();
  g.moveTo(cx - arm, cy - 2 * u); g.quadraticCurveTo(cx - arm * 0.4, cy - 4 * u, cx, cy - 8 * u);
  g.quadraticCurveTo(cx + arm * 0.4, cy - 4 * u, cx + arm, cy - 2 * u);
  g.lineTo(cx + arm, cy + 3 * u); g.quadraticCurveTo(cx + arm * 0.4, cy + 5 * u, cx, cy + 9 * u);
  g.quadraticCurveTo(cx - arm * 0.4, cy + 5 * u, cx - arm, cy + 3 * u); g.closePath(); g.fill();
  g.strokeStyle = "rgba(255,240,200,0.45)"; g.lineWidth = 0.7 * u;
  g.beginPath(); g.moveTo(cx - arm, cy - 1.4 * u); g.quadraticCurveTo(cx - arm * 0.4, cy - 3.4 * u, cx, cy - 7.2 * u); g.quadraticCurveTo(cx + arm * 0.4, cy - 3.4 * u, cx + arm, cy - 1.4 * u); g.stroke();
  // the boss at the pivot, its knife-edge, a finial on top
  g.fillStyle = brass(g, cx - 12 * u, 0, cx + 12 * u, 0);
  g.beginPath(); g.ellipse(cx, cy, 12 * u, 11 * u, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#2a1c06"; g.beginPath(); g.arc(cx, cy, 3 * u, 0, Math.PI * 2); g.fill();
  g.fillStyle = brass(g, cx - 4 * u, 0, cx + 4 * u, 0);
  g.beginPath(); g.moveTo(cx - 4 * u, cy - 10 * u); g.lineTo(cx + 4 * u, cy - 10 * u); g.lineTo(cx, cy - 19 * u); g.closePath(); g.fill();
  // the hooks at its ends
  for (const s of [-1, 1]) {
    const x = cx + s * arm;
    g.fillStyle = brass(g, x - 5 * u, 0, x + 5 * u, 0);
    g.beginPath(); g.arc(x, cy, 5 * u, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#1a1208"; g.beginPath(); g.arc(x, cy, 1.8 * u, 0, Math.PI * 2); g.fill();
  }
  return c;
}

// A pan: a shallow brass dish seen a little from above, its rim catching
// the light, the three chains' rings on its rim.
function paintPan(L) {
  const { u, panR } = L, R = RES;
  const w = panR * 2 + 8 * u, h = 34 * u;
  const c = makeCanvas(w * R, h * R), g = c.getContext("2d");
  g.scale(R, R);
  const cx = w / 2, cy = 12 * u, ry = 9 * u;
  // the underside of the dish
  g.fillStyle = brass(g, cx - panR, 0, cx + panR, 0);
  g.beginPath(); g.moveTo(cx - panR, cy); g.quadraticCurveTo(cx, cy + 26 * u, cx + panR, cy); g.closePath(); g.fill();
  // its inside, seen from above
  const inside = g.createLinearGradient(0, cy - ry, 0, cy + ry);
  inside.addColorStop(0, "#5a4214"); inside.addColorStop(0.6, "#c9a457"); inside.addColorStop(1, "#8a6a2a");
  g.fillStyle = inside; g.beginPath(); g.ellipse(cx, cy, panR - 2 * u, ry - 1.4 * u, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#f2dc9c"; g.lineWidth = 1.2 * u;
  g.beginPath(); g.ellipse(cx, cy, panR - 0.6 * u, ry - 0.4 * u, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  g.strokeStyle = "rgba(40,26,6,0.7)";
  g.beginPath(); g.ellipse(cx, cy, panR - 0.6 * u, ry - 0.4 * u, 0, Math.PI * 0.05, Math.PI * 0.95); g.stroke();
  return c;
}

// A phial: a small glass bottle with a ground stopper, its contents, a paper
// label with its number in his hand. Painted standing on its foot at the
// bottom middle of the texture.
const CONTENTS = [
  { col: "#3a72c0", kind: "crystals" }, // I: blue crystals
  { col: "#c8c4b8", kind: "silver" }, // II: a bead of something heavy and silver
  { col: "#e2c23a", kind: "powder" }, // III: yellow powder
  { col: "#ece8de", kind: "crystals" }, // IV: white crystals
];
const NUMERALS = ["I", "II", "III", "IV"];
function paintPhial(L, p) {
  const { u } = L, R = RES, { w, h } = p;
  const W = w + 10 * u, Hh = h + 14 * u;
  const c = makeCanvas(W * R, Hh * R), g = c.getContext("2d");
  g.scale(R, R);
  const cx = W / 2, foot = Hh - 2 * u, top = foot - h, neck = w * 0.28, sh = top + h * 0.22;
  const body = () => {
    g.beginPath();
    g.moveTo(cx - neck, top + 3 * u); g.lineTo(cx - neck, sh - 2 * u);
    g.quadraticCurveTo(cx - w / 2, sh, cx - w / 2, sh + 6 * u);
    g.lineTo(cx - w / 2, foot - 2 * u); g.quadraticCurveTo(cx - w / 2, foot, cx - w / 2 + 2 * u, foot);
    g.lineTo(cx + w / 2 - 2 * u, foot); g.quadraticCurveTo(cx + w / 2, foot, cx + w / 2, foot - 2 * u);
    g.lineTo(cx + w / 2, sh + 6 * u); g.quadraticCurveTo(cx + w / 2, sh, cx + neck, sh - 2 * u);
    g.lineTo(cx + neck, top + 3 * u); g.closePath();
  };
  // the glass, faintly green
  body(); g.fillStyle = "rgba(170,200,190,0.16)"; g.fill();
  // what is in it
  g.save(); body(); g.clip();
  const cont = CONTENTS[p.i];
  const level = foot - (foot - sh) * (cont.kind === "silver" ? 0.22 : 0.55);
  if (cont.kind === "silver") {
    const sg = g.createRadialGradient(cx - w * 0.1, foot - 4 * u, 0, cx, foot - 3 * u, w * 0.4);
    sg.addColorStop(0, "#ffffff"); sg.addColorStop(0.4, "#b8bcc2"); sg.addColorStop(1, "#4a4e54");
    g.fillStyle = sg; g.beginPath(); g.ellipse(cx, foot - 3 * u, w * 0.36, (foot - level) * 0.9, 0, 0, Math.PI * 2); g.fill();
  } else {
    g.fillStyle = cont.col; g.fillRect(cx - w, level, w * 2, foot - level);
    const rnd = lcg(311 + p.i * 7);
    for (let k = 0; k < 70; k++) {
      g.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.2)";
      g.fillRect(cx - w / 2 + rnd() * w, level + rnd() * (foot - level), 0.9 * u, 0.9 * u);
    }
    g.fillStyle = "rgba(255,255,255,0.25)"; g.beginPath(); g.ellipse(cx, level, w / 2, 2 * u, 0, 0, Math.PI * 2); g.fill();
  }
  g.restore();
  // the label, and his numeral on it
  const ly = sh + (foot - sh) * 0.38, lh = Math.max(9 * u, (foot - sh) * 0.34);
  g.fillStyle = "#d9cfb2"; g.fillRect(cx - w * 0.42, ly, w * 0.84, lh);
  g.fillStyle = "rgba(120,90,50,0.25)"; g.fillRect(cx - w * 0.42, ly + lh - 1.4 * u, w * 0.84, 1.4 * u);
  g.strokeStyle = "rgba(60,40,20,0.5)"; g.lineWidth = 0.5 * u; g.strokeRect(cx - w * 0.42 + 1.4 * u, ly + 1.4 * u, w * 0.84 - 2.8 * u, lh - 2.8 * u);
  g.fillStyle = "#2a1c10"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `italic 600 ${Math.round(Math.min(lh * 0.62, w * 0.34))}px "Cormorant Garamond", Georgia, serif`;
  g.fillText(NUMERALS[p.i], cx, ly + lh * 0.54);
  // the glass's edges and its shine
  body(); g.strokeStyle = "rgba(220,240,235,0.55)"; g.lineWidth = 0.8 * u; g.stroke();
  g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(cx - w / 2 + 2.4 * u, sh + 8 * u, 1.3 * u, (foot - sh) * 0.5);
  g.fillStyle = "rgba(255,255,255,0.2)"; g.fillRect(cx + w / 2 - 4 * u, sh + 10 * u, 0.8 * u, (foot - sh) * 0.4);
  // the ground-glass stopper
  g.fillStyle = "rgba(200,215,210,0.7)";
  g.beginPath(); g.roundRect(cx - neck - 1 * u, top - 6 * u, neck * 2 + 2 * u, 9 * u, 2 * u); g.fill();
  g.fillStyle = "rgba(255,255,255,0.4)"; g.fillRect(cx - neck, top - 5 * u, neck * 2, 1.2 * u);
  return c;
}

// A brass weight: a cylinder with a knob, its weight stamped on its face.
// Painted standing at the bottom middle of the texture.
function paintWeight(L, wt) {
  const { u } = L, R = RES, { w, h, grams } = wt;
  const W = w + 6 * u, Hh = h + 4 * u;
  const c = makeCanvas(W * R, Hh * R), g = c.getContext("2d");
  g.scale(R, R);
  const cx = W / 2, foot = Hh - 1 * u, bodyH = h * 0.62, top = foot - bodyH, ry = w * 0.14;
  // the body
  g.fillStyle = brass(g, cx - w / 2, 0, cx + w / 2, 0);
  g.fillRect(cx - w / 2, top, w, bodyH);
  g.beginPath(); g.ellipse(cx, foot - ry * 0.4, w / 2, ry, 0, 0, Math.PI); g.fill();
  // its top face
  g.fillStyle = "#d8b86a"; g.beginPath(); g.ellipse(cx, top, w / 2, ry, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "rgba(60,40,10,0.5)"; g.lineWidth = 0.5 * u; g.stroke();
  // the knob: a neck and a ball
  const kw = w * 0.22, kTop = foot - h + kw;
  g.fillStyle = brass(g, cx - kw, 0, cx + kw, 0);
  g.fillRect(cx - kw * 0.45, kTop, kw * 0.9, top - kTop);
  g.beginPath(); g.arc(cx, kTop, kw, 0, Math.PI * 2); g.fill();
  g.fillStyle = "rgba(255,245,210,0.7)"; g.beginPath(); g.arc(cx - kw * 0.35, kTop - kw * 0.35, kw * 0.3, 0, Math.PI * 2); g.fill();
  // what it weighs, stamped into its face
  g.fillStyle = "rgba(40,26,6,0.85)"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `600 ${Math.max(5, Math.round(bodyH * 0.42))}px Georgia, serif`;
  g.fillText(`${grams}g`, cx, top + bodyH * 0.56);
  g.fillStyle = "rgba(255,240,200,0.25)"; g.fillText(`${grams}g`, cx, top + bodyH * 0.56 + 0.6 * u);
  return c;
}

/** The size, in screen pixels, a texture painted here is shown at. */
export const shown = (scene, key) => {
  const img = scene.textures.get(key).getSourceImage();
  return { w: img.width / RES, h: img.height / RES };
};
