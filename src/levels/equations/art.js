import { soft, grain, vignette, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";
import { REACTIONS } from "./puzzle.js";

/** Silas's blackboard for EQUATIONS, painted: slate gone green-black with
 *  years of chalk, the grey arcs of the sponge over it and the ghosts of
 *  older working; an oak frame; the chalk tray with its sticks and the felt
 *  duster; the three reactions in his chalk hand, the wiped numbers each
 *  left as a small box. The wall round it in the dark, a lamp over it.
 *
 *  What he left is painted once; what the player chalks into the boxes is
 *  painted by `chalkDigit`, each box its own small texture. */

export const KEYS = { room: "eq_room", box: (i) => `eq_box_${i}` };
export const HAND = '"Architects Daughter", "Special Elite", cursive';
const CHALK = "236,236,226";

export function layoutBoard(W, H) {
  const u = Math.min(W / 1000, H / 620);
  const board = { x: W * 0.07, y: H * 0.07, w: W * 0.86, h: H * 0.72 };
  const fs = Math.min(board.h * 0.11, board.w * 0.05); // the size of his writing
  const L = { W, H, u, board, fs };
  // the reactions, one to a line, each laid out piece by piece; the boxes
  // where numbers were wiped, in reading order
  L.lines = [];
  L.boxes = [];
  const g = makeCanvas(4, 4).getContext("2d");
  REACTIONS.forEach((r, n) => {
    const y = board.y + board.h * (0.3 + n * 0.22);
    let x = board.x + board.w * 0.12;
    const parts = [];
    const term = ([c, f], i) => {
      if (i > 0) { parts.push({ kind: "plus", x: x + fs * 0.35, y }); x += fs * 1.1; }
      if (c === null) {
        const b = { x, y, w: fs * 0.72, h: fs * 0.95, index: L.boxes.length };
        L.boxes.push(b); parts.push({ kind: "box", ...b }); x += b.w + fs * 0.12;
      } else if (c > 1) {
        g.font = `${fs}px ${HAND}`;
        parts.push({ kind: "text", text: String(c), x, y, size: fs }); x += g.measureText(String(c)).width + fs * 0.04;
      }
      x = formula(g, parts, f, x, y, fs);
    };
    r.left.forEach((t, i) => term(t, i));
    parts.push({ kind: "arrow", x: x + fs * 0.35, y, len: fs * 1.6 }); x += fs * 2.3;
    r.right.forEach((t, i) => term(t, i));
    L.lines.push(parts);
  });
  return L;
}

// a formula laid out: its letters at full size, the numbers after them small and low
function formula(g, parts, f, x, y, fs) {
  for (const [, el, n] of f.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    g.font = `${fs}px ${HAND}`;
    parts.push({ kind: "text", text: el, x, y, size: fs }); x += g.measureText(el).width;
    if (n) {
      const s = fs * 0.6;
      g.font = `${s}px ${HAND}`;
      parts.push({ kind: "text", text: n, x: x + fs * 0.02, y: y + fs * 0.26, size: s }); x += g.measureText(n).width + fs * 0.06;
    }
  }
  return x;
}

export function paintBoard(scene, L) {
  addCanvasTexture(scene.textures, KEYS.room, paintRoom(L));
}

export function releaseBoard(textures) {
  if (textures.exists(KEYS.room)) textures.remove(KEYS.room);
  for (let i = 0; i < 12; i++) if (textures.exists(KEYS.box(i))) textures.remove(KEYS.box(i));
}

function paintRoom(L) {
  const { W, H, u, board: b, fs } = L;
  const c = makeCanvas(W, H), g = c.getContext("2d");
  const rnd = lcg(9091);
  // the wall
  g.fillStyle = "#121513"; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) soft(g, rnd() * W, rnd() * H, 60 + rnd() * 140, 40 + rnd() * 100, "0,0,0", 0.08);
  soft(g, W * 0.5, b.y - 20 * u, W * 0.7, H * 0.55, "255,200,140", 0.12, "lighter");
  // the frame's shadow, the frame: oak, mitred, its inner edge lit
  soft(g, W / 2 + 10 * u, b.y + b.h / 2 + 16 * u, b.w * 0.56, b.h * 0.58, "0,0,0", 0.6);
  const fw = 16 * u;
  const oak = g.createLinearGradient(0, b.y - fw, 0, b.y + b.h + fw);
  oak.addColorStop(0, "#5a3a20"); oak.addColorStop(0.5, "#3e2614"); oak.addColorStop(1, "#2a190c");
  g.fillStyle = oak; g.fillRect(b.x - fw, b.y - fw, b.w + fw * 2, b.h + fw * 2);
  g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = u;
  for (let i = 0; i < 30; i++) { const y = b.y - fw + rnd() * fw; g.beginPath(); g.moveTo(b.x - fw, y); g.lineTo(b.x + b.w + fw, y + (rnd() - 0.5) * 3 * u); g.stroke(); }
  g.fillStyle = "rgba(255,220,180,0.2)"; g.fillRect(b.x - fw, b.y - fw, b.w + fw * 2, 1.4 * u);
  // the slate
  const slate = g.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
  slate.addColorStop(0, "#1e2b25"); slate.addColorStop(0.5, "#18231e"); slate.addColorStop(1, "#141d19");
  g.fillStyle = slate; g.fillRect(b.x, b.y, b.w, b.h);
  g.save(); g.beginPath(); g.rect(b.x, b.y, b.w, b.h); g.clip();
  // the lamp on it from above
  soft(g, b.x + b.w * 0.5, b.y, b.w * 0.55, b.h * 0.7, "255,210,160", 0.1, "lighter");
  // the sponge's arcs, years of them, and the ghosts of what was written
  for (let i = 0; i < 46; i++) {
    const x = b.x + rnd() * b.w, y = b.y + rnd() * b.h, r = (60 + rnd() * 160) * u;
    g.strokeStyle = `rgba(${CHALK},${(0.015 + rnd() * 0.03).toFixed(3)})`;
    g.lineWidth = (14 + rnd() * 26) * u;
    g.beginPath(); g.arc(x, y + r, r, -Math.PI * (0.5 + rnd() * 0.25), -Math.PI * (0.25 - rnd() * 0.2)); g.stroke();
  }
  const ghosts = ["CuSO4 + Fe", "2KClO3", "NaCl", "Δt", "m = ρV", "H2SO4", "pV = nRT", "Zn + 2HCl", "0,1 mol"];
  g.font = `${Math.round(fs * 0.7)}px ${HAND}`;
  for (let i = 0; i < 14; i++) {
    g.fillStyle = `rgba(${CHALK},${(0.025 + rnd() * 0.035).toFixed(3)})`;
    g.save(); g.translate(b.x + rnd() * b.w * 0.9, b.y + b.h * 0.12 + rnd() * b.h * 0.85); g.rotate((rnd() - 0.5) * 0.08);
    g.fillText(ghosts[i % ghosts.length], 0, 0); g.restore();
  }
  // chalk dust settled along the bottom
  const dust = g.createLinearGradient(0, b.y + b.h - 40 * u, 0, b.y + b.h);
  dust.addColorStop(0, `rgba(${CHALK},0)`); dust.addColorStop(1, `rgba(${CHALK},0.06)`);
  g.fillStyle = dust; g.fillRect(b.x, b.y + b.h - 40 * u, b.w, 40 * u);
  g.restore();
  // his writing: the reactions, the boxes; the date, and a line in the corner
  const ink = makeCanvas(W, H), k = ink.getContext("2d");
  k.fillStyle = `rgb(${CHALK})`; k.strokeStyle = `rgb(${CHALK})`; k.textBaseline = "alphabetic";
  for (const parts of L.lines) {
    for (const p of parts) {
      if (p.kind === "text") { k.font = `${p.size}px ${HAND}`; k.fillText(p.text, p.x, p.y); }
      else if (p.kind === "plus") chalkPlus(k, p.x, p.y - fs * 0.32, fs * 0.22, u);
      else if (p.kind === "arrow") chalkArrow(k, p.x, p.y - fs * 0.3, p.len, fs, u);
      else if (p.kind === "box") chalkBox(k, p, u, rnd);
    }
  }
  k.font = `${Math.round(fs * 0.55)}px ${HAND}`;
  k.fillText("13. X. 1961", b.x + b.w * 0.06, b.y + b.h * 0.12);
  k.font = `italic ${Math.round(fs * 0.5)}px ${HAND}`;
  k.fillText("Rien ne se perd.", b.x + b.w * 0.7, b.y + b.h * 0.94);
  // a stroke under the first line, his habit
  k.lineWidth = 1.6 * u; k.beginPath(); k.moveTo(b.x + b.w * 0.06, b.y + b.h * 0.14); k.lineTo(b.x + b.w * 0.22, b.y + b.h * 0.142); k.stroke();
  chalkGrain(k, W, H, rnd, 0.55);
  g.save(); g.shadowColor = `rgba(${CHALK},0.25)`; g.shadowBlur = 2.5 * u; g.globalAlpha = 0.88; g.drawImage(ink, 0, 0); g.restore();
  // the tray: a ledge of oak along the foot, chalk and the duster on it
  const ty = b.y + b.h + fw;
  g.fillStyle = "#3a2414"; g.fillRect(b.x - fw, ty, b.w + fw * 2, 12 * u);
  g.fillStyle = "rgba(255,220,180,0.22)"; g.fillRect(b.x - fw, ty, b.w + fw * 2, 1.4 * u);
  g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(b.x - fw, ty + 12 * u, b.w + fw * 2, 3 * u);
  g.fillStyle = `rgba(${CHALK},0.12)`; g.fillRect(b.x, ty + 1.5 * u, b.w, 3 * u);
  for (const [fx, len, rot] of [[0.18, 46, 0.04], [0.23, 30, -0.06], [0.62, 22, 0.1]]) {
    g.save(); g.translate(b.x + b.w * fx, ty - 2 * u); g.rotate(rot);
    g.fillStyle = "#e8e6dc"; g.beginPath(); g.roundRect(0, -5 * u, len * u, 7 * u, 3 * u); g.fill();
    g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(0, 0, len * u, 2 * u);
    g.restore();
  }
  // the duster: a wooden back, grey felt worn white with chalk
  const dx = b.x + b.w * 0.76, dy = ty - 12 * u;
  g.fillStyle = "#6a4a2a"; g.beginPath(); g.roundRect(dx, dy, 90 * u, 9 * u, 3 * u); g.fill();
  g.fillStyle = "#8a8a84"; g.fillRect(dx + 3 * u, dy + 8 * u, 84 * u, 5 * u);
  g.fillStyle = `rgba(${CHALK},0.35)`; g.fillRect(dx + 3 * u, dy + 11 * u, 84 * u, 2 * u);
  vignette(g, W, H, 0.75);
  grain(g, W, H, 0.025);
  return c;
}

// chalk: strokes broken by the grain of the slate, dry at their edges
function chalkGrain(k, W, H, rnd, a) {
  k.save();
  k.globalCompositeOperation = "destination-out";
  k.fillStyle = `rgba(0,0,0,${a})`;
  for (let i = 0; i < (W * H) / 26; i++) k.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 1.6, 1);
  k.restore();
}

function chalkPlus(k, x, y, r, u) {
  k.lineWidth = 2.2 * u; k.lineCap = "round";
  k.beginPath(); k.moveTo(x - r, y); k.lineTo(x + r, y + 0.5 * u); k.moveTo(x, y - r); k.lineTo(x + 0.6 * u, y + r); k.stroke();
}

function chalkArrow(k, x, y, len, fs, u) {
  k.lineWidth = 2.4 * u; k.lineCap = "round";
  k.beginPath(); k.moveTo(x, y); k.lineTo(x + len, y - 0.8 * u); k.stroke();
  k.beginPath(); k.moveTo(x + len - fs * 0.26, y - fs * 0.18); k.lineTo(x + len, y - 0.8 * u); k.lineTo(x + len - fs * 0.24, y + fs * 0.16); k.stroke();
}

function chalkBox(k, b, u, rnd) {
  const top = b.y - b.h * 0.86, j = () => (rnd() - 0.5) * 2 * u;
  k.lineWidth = 2 * u; k.lineCap = "round"; k.lineJoin = "round";
  k.beginPath();
  k.moveTo(b.x + j(), top + j()); k.lineTo(b.x + b.w + j(), top + j());
  k.lineTo(b.x + b.w + j(), top + b.h + j()); k.lineTo(b.x + j(), top + b.h + j()); k.closePath();
  k.stroke();
}

/** A digit chalked into a box, fresh: brighter than his writing, the stick
 *  still dragging a little. Returns the canvas to show over the box. */
export function chalkDigit(L, box, digit, seed) {
  const { u, fs } = L, pad = 4 * u;
  const w = box.w + pad * 2, h = box.h + pad * 2;
  const c = makeCanvas(w * 2, h * 2), k = c.getContext("2d");
  k.scale(2, 2);
  if (digit) {
    k.fillStyle = `rgb(${CHALK})`; k.textAlign = "center"; k.textBaseline = "alphabetic";
    k.font = `${Math.round(fs * 0.86)}px ${HAND}`;
    k.save(); k.translate(w / 2, pad + box.h * 0.84); k.rotate(((seed % 7) - 3) * 0.012);
    k.fillText(String(digit), 0, 0); k.restore();
    chalkGrain(k, w, h, lcg(seed * 31 + 7), 0.45);
  }
  return c;
}

export const boxPad = (L) => 4 * L.u;
