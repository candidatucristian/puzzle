import PlainRoomScene from "../house/plainRoom.js";
import { soft, lcg, makeCanvas } from "../../shared/paint.js";
import { BACK, WARM, block, fillPoly, footShadow, onWall, thingAt } from "../house/roomKit.js";

// ─────────────────────────────────────────────────────────────────────────────
// The laboratory: the first room off the chemist's hall, behind door VII
// (see house/RoomScene.js for what every room does). The chemist's own
// bench along the back wall, as it was left: an oil lamp at one end, a
// retort on its stand, a rack of test tubes, five graduated bottles of
// coloured liquid in a row, a Bunsen burner under a flask, the magnifying
// glass on its green cloth at the front. Over the bench the faded periodic
// table and a shelf of jars; a glazed cupboard of reagents on the right
// wall; the window and the moon; a stool. The bottles are the puzzle —
// and the lamp and the burner burn until it is solved.
// ─────────────────────────────────────────────────────────────────────────────

const BLUE = "120,160,255";
// the bottles' shapes and liquids, as the puzzle has them: fluorine, oxygen,
// carbon, uranium, sulfur — [shape, height, width (cm), liquid, how full]
const BOTTLES = [
  ["conical", 22, 13, "214,230,120", 0.55],
  ["round", 25, 12, "140,196,250", 0.4],
  ["jar", 18, 12, "34,32,36", 0.45],
  ["tall", 32, 7, "120,255,110", 0.7],
  ["beaker", 17, 11, "250,214,40", 0.62],
];

export default class Room7Scene extends PlainRoomScene {
  constructor() {
    super("Room7", {
      style: {
        wall: "plaster", near: "#1f2725", far: "#0f1413", back: "#151c1a", rail: 0,
        dado: { kind: "boards", h: 92, near: "#1c2622", far: "#0d1311", back: "#131b18", rail: "#3a2c1c", railFar: "#1a130c", railBack: "#2c2216" },
        skirt: "#0e1210", skirtBack: "#080a09",
        floor: "flags", floorNear: "#2a2c2b", floorFar: "#121414", ceiling: "beams", ceilingCol: "#0c0d0d", window: "arch",
      },
      window: { x: 0.44, hw: 0.13, top: 272, sill: 118 },
      hearth: null,
      chest: null,
      rug: ["#121614", "#2a302b", "#171c19"],
    });
  }

  layout(W, H, levels) {
    const L = super.layout(W, H);
    const { Q, half: hx } = L;
    L.on = !levels.isCompleted(levels.indexOf("chemistry"));
    const b = (L.bench = { x0: -0.6 * hx, x1: 0.12 * hx, d0: 532, d1: 590, h: 90 });
    const span = b.x1 - b.x0;
    L.poster = { x0: -0.52 * hx, x1: -0.15 * hx, y0: 156, y1: 232 };
    L.shelf = { x0: -0.08 * hx, x1: 0.2 * hx, y: 178 };
    L.cabinet = { x0: hx - 46, x1: hx, d0: 420, d1: 528, h: 208 };
    L.lamp = { x: b.x0 + span * 0.06, d: 566 };
    L.burner = { x: b.x0 + span * 0.88, d: 562 };
    L.bottleRow = BOTTLES.map((bt, i) => ({ x: b.x0 + span * (0.46 + i * 0.075), d: 556, shape: bt }));
    L.loupe = { x: b.x0 + span * 0.62, d: 540 };
    L.sinks = { x0: 0.2 * hx, x1: 0.66 * hx, d0: 536, h: 90 };
    L.stool = { x: b.x0 + span * 0.3, d: 470, h: 64 };
    // the bottles open the puzzle
    const r0 = L.bottleRow[0], r4 = L.bottleRow[4];
    L.things = [thingAt("chemistry", "Look at the bottles", [Q(r0.x - 9, b.h - 1, 556), Q(r4.x + 9, b.h - 1, 556), Q(r4.x + 9, b.h + 36, 556), Q(r0.x - 9, b.h + 36, 556)])];
    // where the room's lights are, for the dark and for the scene
    const lp = Q(L.lamp.x, b.h + 28, L.lamp.d), bp = Q(L.burner.x, b.h + 14, L.burner.d);
    L.glows = { lamp: { x: lp.x, y: lp.y, r: 110 * lp.s }, burner: { x: bp.x, y: bp.y, r: 60 * bp.s } };
    L.detailLights = [
      { x: lp.x + 40 * lp.s, y: lp.y + 10 * lp.s, rx: 200 * lp.s, ry: 120 * lp.s, k: L.on ? 0.95 : 0.3 },
      { x: bp.x, y: bp.y, rx: 90 * bp.s, ry: 70 * bp.s, k: L.on ? 0.8 : 0.2 },
    ];
    // the shelves of glassware on the left wall, in what the lamp spills
    L.wallShelves = { d0: 430, d1: 575, y0: 100, y1: 224 };
    const sp = Q(-hx, 160, 505);
    L.detailLights.push({ x: sp.x, y: sp.y, rx: 120 * sp.s, ry: 90 * sp.s, k: 0.55 });
    // and the sinks under the window, in the moon
    const sk = Q((L.sinks.x0 + L.sinks.x1) / 2, 100, 570);
    L.detailLights.push({ x: sk.x, y: sk.y, rx: 150 * sk.s, ry: 70 * sk.s, k: 0.55 });
    return L;
  }

  paintDetails(ctx, L) {
    paintWallShelves(ctx, L);
    paintPoster(ctx, L);
    paintShelf(ctx, L);
    paintGasPipe(ctx, L);
    paintCabinet(ctx, L);
    paintSinks(ctx, L);
    paintBench(ctx, L);
    paintBenchTop(ctx, L);
    paintStool(ctx, L);
  }

  live(L, k, glow) {
    super.live(L, k);
    if (!L.on) return;
    // the lamp and the burner, breathing very slightly
    for (const [at, a, tint] of [[L.glows.lamp, 0.2, 0xffc078], [L.glows.burner, 0.28, 0x7aa0ff]]) {
      const light = glow(at, a, tint);
      this.ambientTween({ targets: light, alpha: { from: a * 0.85, to: a * 1.2 }, duration: tint === 0xffc078 ? 3200 : 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    // and the uranium's own faint green
    const u = L.bottleRow[3], p = L.Q(u.x, L.bench.h + 10, u.d);
    glow({ x: p.x, y: p.y, r: 22 * p.s }, 0.22, 0x78ff6e);
  }
}

// ── painting ────────────────────────────────────────────────────────────────

// draw in centimetres about a point in the room, y up the negative way
function at(ctx, L, x, y, d, draw) {
  const p = L.Q(x, y, d);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.s, p.s);
  draw(p);
  ctx.restore();
}

const grad = (ctx, x0, y0, x1, y1, stops) => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
};

// The periodic table, pinned to the back wall over the bench: an old printed
// sheet, foxed and gone pale, its cells tinted by family.
function paintPoster(ctx, L) {
  const p = L.poster, w = p.x1 - p.x0, h = p.y1 - p.y0;
  const rnd = lcg(77);
  at(ctx, L, p.x0, p.y1, BACK - 0.5, () => {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(1.5, 1.8, w, h);
    ctx.fillStyle = grad(ctx, 0, 0, w, h, [[0, "#b0a37e"], [0.6, "#9e9070"], [1, "#857854"]]);
    ctx.fillRect(0, 0, w, h);
    // the title
    ctx.fillStyle = "rgba(60,44,28,0.55)";
    ctx.fillRect(w * 0.3, 3, w * 0.4, 2.4);
    // the cells: 18 columns, 7 rows, the two rows set apart under them
    const cw = (w - 8) / 18, ch = (h - 16) / 10;
    const fam = ["206,110,90", "214,160,80", "176,170,120", "110,160,180", "130,176,110", "160,120,180"];
    const cell = (c, r, f) => {
      const x = 4 + c * cw, y = 9 + r * ch;
      ctx.fillStyle = `rgba(${fam[f]},0.85)`;
      ctx.fillRect(x + 0.2, y + 0.2, cw - 0.4, ch - 0.4);
      ctx.fillStyle = "rgba(50,36,22,0.5)";
      ctx.fillRect(x + cw * 0.3, y + ch * 0.35, cw * 0.4, ch * 0.22);
    };
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 18; c++) {
        const has = r === 0 ? c === 0 || c === 17 : r < 3 ? c < 2 || c > 11 : true;
        if (!has) continue;
        cell(c, r, c < 1 ? 0 : c < 2 ? 1 : c < 12 ? 2 : c < 16 ? 3 : c < 17 ? 4 : 5);
      }
    }
    for (let r = 0; r < 2; r++) for (let c = 2; c < 17; c++) { const x = 4 + c * cw, y = 9 + (7.5 + r) * ch; ctx.fillStyle = "rgba(200,170,190,0.5)"; ctx.fillRect(x + 0.2, y + 0.2, cw - 0.4, ch - 0.4); }
    // foxing, and the damp at the foot of it
    for (let i = 0; i < 40; i++) soft(ctx, rnd() * w, rnd() * h, 0.6 + rnd() * 2.4, 0.6 + rnd() * 2, "120,90,50", 0.18);
    ctx.fillStyle = grad(ctx, 0, h * 0.75, 0, h, [[0, "rgba(90,70,40,0)"], [1, "rgba(90,70,40,0.3)"]]);
    ctx.fillRect(0, h * 0.75, w, h * 0.25);
    // four brass pins
    for (const [x, y] of [[2, 2], [w - 2, 2], [2, h - 2], [w - 2, h - 2]]) {
      ctx.fillStyle = "#a8853e"; ctx.beginPath(); ctx.arc(x, y, 0.9, 0, Math.PI * 2); ctx.fill();
    }
  });
}

// Open shelves on the left wall, glassware on them: flasks and retorts,
// stoppered bottles, a mortar, a row of notebooks. Painted flat, then laid
// on the wall so that it runs away into the room with it.
function paintWallShelves(ctx, L) {
  const at = L.wallShelves, PX = 2; // pixels to the centimetre, flat
  const w = Math.round((at.d1 - at.d0) * PX), h = Math.round((at.y1 - at.y0) * PX);
  const flat = makeCanvas(w, h), g = flat.getContext("2d");
  const rnd = lcg(5150);
  g.scale(PX, PX);
  const W = w / PX, H = h / PX;
  // the uprights and three boards
  g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(2, 2, W - 2, H - 2);
  const wood = (x, y, ww, hh) => { const gr = g.createLinearGradient(0, y, 0, y + hh); gr.addColorStop(0, "#5a3a20"); gr.addColorStop(1, "#24160b"); g.fillStyle = gr; g.fillRect(x, y, ww, hh); };
  wood(0, 0, 3, H); wood(W - 3, 0, 3, H);
  const boards = [H * 0.32, H * 0.64, H - 3];
  for (const y of boards) wood(0, y, W, 3);
  // on each board, from the left
  const glass = ["150,96,40", "70,110,80", "190,200,205", "110,60,30", "60,80,110", "140,40,40"];
  boards.forEach((y, row) => {
    for (let x = 6; x < W - 10;) {
      const kind = rnd();
      if (row === 2 && x < 40) {
        // notebooks, upright
        const bw = 2.6 + rnd() * 1.5, bh = 22 + rnd() * 8;
        g.fillStyle = ["#3a2418", "#2a3a2c", "#4a3a20", "#2a2a3a"][Math.floor(rnd() * 4)];
        g.fillRect(x, y - bh, bw, bh);
        g.fillStyle = "rgba(220,200,150,0.35)"; g.fillRect(x + 0.4, y - bh * 0.8, bw - 0.8, 1);
        x += bw + 0.4; continue;
      }
      const col = glass[Math.floor(rnd() * glass.length)];
      if (kind < 0.35) {
        // a stoppered bottle with a label
        const bw = 7 + rnd() * 4, bh = 14 + rnd() * 10;
        g.fillStyle = `rgba(${col},0.8)`; g.beginPath(); g.roundRect(x, y - bh, bw, bh, 1.2); g.fill();
        g.fillStyle = "#1a120a"; g.fillRect(x + bw * 0.25, y - bh - 2.4, bw * 0.5, 2.6);
        g.fillStyle = "rgba(226,214,180,0.7)"; g.fillRect(x + bw * 0.15, y - bh * 0.6, bw * 0.7, bh * 0.28);
        g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x + 1, y - bh + 1, 0.8, bh - 2);
        x += bw + 2 + rnd() * 3;
      } else if (kind < 0.6) {
        // a round flask, something left in it
        const r = 5 + rnd() * 2.5;
        g.fillStyle = "rgba(200,225,235,0.16)"; g.beginPath(); g.arc(x + r, y - r, r, 0, Math.PI * 2); g.fill();
        g.fillRect(x + r - 1.3, y - r * 2 - 8, 2.6, 9);
        g.fillStyle = `rgba(${col},0.75)`; g.beginPath(); g.arc(x + r, y - r, r - 0.4, 0.3, Math.PI - 0.3); g.fill();
        g.strokeStyle = "rgba(225,240,240,0.45)"; g.lineWidth = 0.35; g.beginPath(); g.arc(x + r, y - r, r, 0, Math.PI * 2); g.stroke();
        x += r * 2 + 3 + rnd() * 3;
      } else if (kind < 0.8) {
        // a conical flask
        const fw = 9 + rnd() * 3, fh = 13 + rnd() * 4;
        g.fillStyle = "rgba(200,225,235,0.16)";
        g.beginPath(); g.moveTo(x + fw * 0.38, y - fh); g.lineTo(x + fw * 0.62, y - fh); g.lineTo(x + fw * 0.62, y - fh * 0.62); g.lineTo(x + fw, y); g.lineTo(x, y); g.lineTo(x + fw * 0.38, y - fh * 0.62); g.closePath(); g.fill();
        g.fillStyle = `rgba(${col},0.7)`;
        g.beginPath(); g.moveTo(x + fw * 0.2, y - fh * 0.3); g.lineTo(x + fw * 0.8, y - fh * 0.3); g.lineTo(x + fw, y); g.lineTo(x, y); g.closePath(); g.fill();
        x += fw + 3 + rnd() * 3;
      } else {
        // a stoneware mortar and its pestle
        g.fillStyle = "#b8b0a0"; g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 12, y - 7); g.quadraticCurveTo(x + 11, y, x + 6, y); g.quadraticCurveTo(x + 1, y, x, y - 7); g.fill();
        g.fillStyle = "#8a8274"; g.fillRect(x, y - 7.6, 12, 1.2);
        g.save(); g.translate(x + 8, y - 7); g.rotate(0.5); g.fillStyle = "#9a9284"; g.fillRect(-1, -10, 2.2, 11); g.restore();
        x += 16 + rnd() * 3;
      }
    }
  });
  onWall(ctx, L, -1, at, flat);
}

// A shelf on brackets over the right end of the bench, apothecary jars on it.
function paintShelf(ctx, L) {
  const s = L.shelf, d = BACK - 14;
  block(ctx, L, { x0: s.x0, x1: s.x1, y0: s.y - 3, y1: s.y, d0: d, d1: BACK }, { side: "#1a0f08", top: "#4a301c", front: "#2c1a0e" });
  for (const x of [s.x0 + 8, s.x1 - 8]) {
    at(ctx, L, x, s.y - 3, BACK - 1, () => { ctx.fillStyle = "#120b06"; ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(1, 0); ctx.lineTo(1, 12); ctx.closePath(); ctx.fill(); });
  }
  const rnd = lcg(415);
  const glass = [["150,96,40", 0.85], ["70,110,80", 0.8], ["190,200,205", 0.35], ["110,60,30", 0.9], ["60,80,110", 0.8]];
  for (let x = s.x0 + 6, i = 0; x < s.x1 - 8; i++) {
    const w = 7 + rnd() * 5, h = 12 + rnd() * 12, [col, a] = glass[i % glass.length];
    at(ctx, L, x + w / 2, s.y, d + 7, () => {
      ctx.fillStyle = `rgba(${col},${a})`;
      ctx.beginPath(); ctx.roundRect(-w / 2, -h, w, h, 1.4); ctx.fill();
      ctx.fillStyle = "#1a120a";
      ctx.fillRect(-w * 0.3, -h - 2.4, w * 0.6, 2.6);
      ctx.fillStyle = "rgba(226,214,180,0.75)";
      ctx.fillRect(-w * 0.36, -h * 0.62, w * 0.72, h * 0.26);
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillRect(-w * 0.38, -h + 1.2, 0.8, h - 2.4);
    });
    x += w + 2 + rnd() * 3;
  }
}

// The gas: a copper pipe along the back wall, a brass tap, and the rubber
// hose down from it to the burner.
function paintGasPipe(ctx, L) {
  const { Q } = L, b = L.bench, y = b.h + 18;
  const a = Q(L.burner.x - 10, y, BACK - 2), z = Q(L.half * 0.19, y, BACK - 2);
  ctx.strokeStyle = "#5a3a1c"; ctx.lineWidth = 2.6 * a.s;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(z.x, z.y); ctx.stroke();
  ctx.strokeStyle = "rgba(230,160,100,0.35)"; ctx.lineWidth = 0.8 * a.s;
  ctx.beginPath(); ctx.moveTo(a.x, a.y - 0.8 * a.s); ctx.lineTo(z.x, z.y - 0.8 * a.s); ctx.stroke();
  ctx.fillStyle = "#a8853e";
  ctx.beginPath(); ctx.arc(a.x, a.y, 2.2 * a.s, 0, Math.PI * 2); ctx.fill();
  // the hose: down off the tap, across the bench to the burner's foot
  const f = Q(L.burner.x - 5, b.h + 1, L.burner.d);
  ctx.strokeStyle = "#3a1c14"; ctx.lineWidth = 1.6 * f.s; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(a.x, a.y + 2 * a.s); ctx.bezierCurveTo(a.x, a.y + 14 * a.s, f.x - 16 * f.s, f.y + 2 * f.s, f.x, f.y); ctx.stroke();
  ctx.lineCap = "butt";
}

// The reagent cupboard against the right wall: tall, its glazed doors facing
// into the room, bottles on its shelves behind the glass.
function paintCabinet(ctx, L) {
  const { Q } = L, c = L.cabinet;
  footShadow(ctx, L, c, 0.6);
  block(ctx, L, { x0: c.x0, x1: c.x1, y0: 0, y1: c.h, d0: c.d0, d1: c.d1 }, { side: "#24170d", top: "#3a2616", front: "#1a0f08" });
  const face = (d0, d1, y0, y1, col, x = c.x0 - 0.2) => fillPoly(ctx, [Q(x, y0, d0), Q(x, y0, d1), Q(x, y1, d1), Q(x, y1, d0)], col);
  // the plinth and the cornice
  face(c.d0, c.d1, 0, 12, "#120a05");
  face(c.d0 - 2, c.d1, c.h - 10, c.h, "#2e1d10", c.x0 - 2);
  // two glazed doors, two panes high each, a dark inside with bottles in it
  const rnd = lcg(907);
  const dm = (c.d0 + c.d1) / 2;
  for (const [d0, d1] of [[c.d0 + 5, dm - 1.5], [dm + 1.5, c.d1 - 5]]) {
    face(d0, d1, 18, c.h - 16, "#0a0705");
    for (const y of [60, 108, 156]) {
      face(d0 + 2, d1 - 2, y - 1.6, y, "#2a1a0e", c.x0 + 8);
      for (let d = d0 + 4; d < d1 - 6;) {
        const w = 5 + rnd() * 5, h = 12 + rnd() * 18;
        const col = ["150,96,40", "70,110,80", "190,200,205", "110,60,30"][Math.floor(rnd() * 4)];
        fillPoly(ctx, [Q(c.x0 + 10, y, d), Q(c.x0 + 10, y, d + w), Q(c.x0 + 10, y + h, d + w), Q(c.x0 + 10, y + h, d)], `rgba(${col},0.7)`);
        fillPoly(ctx, [Q(c.x0 + 10, y + h * 0.4, d + 1), Q(c.x0 + 10, y + h * 0.4, d + w - 1), Q(c.x0 + 10, y + h * 0.7, d + w - 1), Q(c.x0 + 10, y + h * 0.7, d + 1)], "rgba(220,206,170,0.5)");
        d += w + 2 + rnd() * 4;
      }
    }
    // the frame and glazing bars, and the moon in the glass
    ctx.strokeStyle = "#3e2716";
    const frame = (pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke(); };
    ctx.lineWidth = 2.4 * Q(c.x0, 0, d0).s;
    frame([Q(c.x0, 18, d0), Q(c.x0, c.h - 16, d0), Q(c.x0, c.h - 16, d1), Q(c.x0, 18, d1), Q(c.x0, 18, d0)]);
    ctx.lineWidth = 1.2 * Q(c.x0, 0, d0).s;
    frame([Q(c.x0, 110, d0), Q(c.x0, 110, d1)]);
    fillPoly(ctx, [Q(c.x0, 26, d0 + 4), Q(c.x0, c.h - 24, d0 + 14), Q(c.x0, c.h - 24, d0 + 20), Q(c.x0, 26, d0 + 10)], "rgba(190,206,240,0.06)");
    const k = Q(c.x0 - 1, 100, d1 - 3);
    ctx.fillStyle = "#a8853e"; ctx.beginPath(); ctx.arc(k.x, k.y, 1.4 * k.s, 0, Math.PI * 2); ctx.fill();
  }
}

// Under the window, the sinks: two deep white fireclay basins set in a slate
// counter on oak cupboards, their fronts showing; white tiles behind them, a
// brass swan-neck tap over each; and by the window a draining rack on the
// wall, flasks and tubes upturned on its pegs to dry.
function paintSinks(ctx, L) {
  const { Q } = L, s = L.sinks, h = s.h;
  const face = (x0, x1, y0, y1, d, col) => fillPoly(ctx, [Q(x0, y1, d), Q(x1, y1, d), Q(x1, y0, d), Q(x0, y0, d)], col);
  // the tiles behind, up to the sill
  face(s.x0, s.x1, h, 116, BACK - 0.5, "#8e9691");
  ctx.strokeStyle = "rgba(40,50,46,0.55)"; ctx.lineWidth = Math.max(0.5, 0.3 * Q(0, 0, BACK).s);
  for (let y = h; y <= 116; y += 7.5) { const p = Q(s.x0, y, BACK - 0.6), q = Q(s.x1, y, BACK - 0.6); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
  for (let x = s.x0; x <= s.x1; x += 15) { const p = Q(x, h, BACK - 0.6), q = Q(x, 116, BACK - 0.6); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
  face(s.x0, s.x1, 115, 117, BACK - 1, "#7d857f");
  paintDryingRack(ctx, L);
  // the cupboards and the counter
  footShadow(ctx, L, { x0: s.x0, x1: s.x1, d0: s.d0, d1: BACK }, 0.7);
  block(ctx, L, { x0: s.x0 + 2, x1: s.x1 - 2, y0: 0, y1: h - 4, d0: s.d0 + 3, d1: BACK }, { side: "#1c1109", top: "#3a2414", front: "#2a190d" });
  const d = s.d0 + 2.8;
  face(s.x0 + 2, s.x1 - 2, 0, 8, d, "#100904");
  const n = 3, w = (s.x1 - s.x0 - 10) / n;
  for (let i = 0; i < n; i++) {
    const x0 = s.x0 + 5 + i * w, x1 = x0 + w - 3;
    face(x0, x1, 12, 58, d, "#2e1b0f");
    face(x0 + 4, x1 - 4, 18, 52, d, "rgba(0,0,0,0.22)");
    const k = Q(i % 2 ? x0 + 4 : x1 - 4, 46, d - 0.6);
    ctx.fillStyle = "#7a5c26"; ctx.beginPath(); ctx.arc(k.x, k.y, 1.3 * k.s, 0, Math.PI * 2); ctx.fill();
  }
  block(ctx, L, { x0: s.x0, x1: s.x1, y0: h - 4, y1: h, d0: s.d0, d1: BACK }, { side: "#0c0e0f", top: "#2a3032", front: "#16191a" });
  fillPoly(ctx, [Q(s.x0, h, s.d0), Q(s.x1, h, s.d0), Q(s.x1, h - 0.6, s.d0), Q(s.x0, h - 0.6, s.d0)], "rgba(200,220,230,0.14)");
  // the two basins
  const mid = (s.x0 + s.x1) / 2, bw = (s.x1 - s.x0) * 0.32;
  for (const cx of [mid - (s.x1 - s.x0) * 0.22, mid + (s.x1 - s.x0) * 0.22]) {
    const x0 = cx - bw / 2, x1 = cx + bw / 2, b0 = s.d0 - 2, b1 = BACK - 10;
    // its front, white, standing proud of the cupboards
    const fa = Q(x0, h, b0), fb = Q(x0, h - 20, b0);
    ctx.fillStyle = grad(ctx, 0, fa.y, 0, fb.y, [[0, "#b9bfbb"], [0.15, "#a3aaa6"], [1, "#6f7672"]]);
    ctx.fillRect(fa.x, fa.y, Q(x1, h, b0).x - fa.x, fb.y - fa.y);
    face(x0, x1, h - 20, h - 19, b0, "rgba(0,0,0,0.4)");
    face(x0, x0 + 1, h - 20, h, b0, "rgba(255,255,255,0.12)");
    face(x0, x1, h - 1, h, b0, "rgba(255,255,255,0.5)");
    // the rim, and the deep inside of it
    const rim = [Q(x0, h + 0.2, b0), Q(x1, h + 0.2, b0), Q(x1, h + 0.2, b1), Q(x0, h + 0.2, b1)];
    fillPoly(ctx, rim, "#b8beba");
    const inner = [Q(x0 + 3, h + 0.3, b0 + 3), Q(x1 - 3, h + 0.3, b0 + 3), Q(x1 - 3, h + 0.3, b1 - 3), Q(x0 + 3, h + 0.3, b1 - 3)];
    ctx.save();
    ctx.beginPath(); inner.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); ctx.clip();
    fillPoly(ctx, inner, "#aeb4b0");
    // the floor of it, deep down, and its drain
    fillPoly(ctx, [Q(x0 + 4, h - 20, b0 + 4), Q(x1 - 4, h - 20, b0 + 4), Q(x1 - 4, h - 20, b1 - 4), Q(x0 + 4, h - 20, b1 - 4)], "#878e8a");
    const dr = Q(cx, h - 20, (b0 + b1) / 2), dr2 = Q(cx, h - 20, (b0 + b1) / 2 + 2);
    ctx.fillStyle = "#2a2e2c"; ctx.beginPath(); ctx.ellipse(dr.x, dr.y, 2.2 * dr.s, Math.max(0.8, Math.abs(dr2.y - dr.y)), 0, 0, Math.PI * 2); ctx.fill();
    // shadow under the near lip
    ctx.fillStyle = grad(ctx, 0, inner[0].y - 6 * inner[0].s, 0, inner[0].y, [[0, "rgba(20,24,22,0)"], [1, "rgba(20,24,22,0.55)"]]);
    ctx.fillRect(inner[0].x, inner[0].y - 6 * inner[0].s, inner[1].x - inner[0].x, 6 * inner[0].s);
    ctx.restore();
    // the tap: out of the tiles, up, over and down into the basin
    const pts = [Q(cx, h + 8, BACK - 1), Q(cx, h + 34, BACK - 1), Q(cx, h + 38, BACK - 6), Q(cx, h + 34, BACK - 13), Q(cx, h + 24, BACK - 15)];
    for (const [lw, col] of [[2.2, "#4a3612"], [1.3, "#c8a050"], [0.4, "rgba(255,240,200,0.7)"]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw * pts[0].s; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y);
      ctx.quadraticCurveTo(pts[2].x, pts[2].y, pts[3].x, pts[3].y); ctx.lineTo(pts[4].x, pts[4].y); ctx.stroke();
    }
    ctx.lineCap = "butt";
    // and its two cross-handles, either side of the foot
    for (const side of [-1, 1]) {
      const p = Q(cx + side * 6, h + 14, BACK - 2);
      ctx.fillStyle = "#a8853e"; ctx.fillRect(p.x - 2.4 * p.s, p.y - 0.5 * p.s, 4.8 * p.s, 1 * p.s); ctx.fillRect(p.x - 0.5 * p.s, p.y - 2.4 * p.s, 1 * p.s, 4.8 * p.s);
      ctx.beginPath(); ctx.arc(p.x, p.y, 1 * p.s, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// A draining rack on the wall by the window: a board of pegs, glassware
// upturned on them to dry.
function paintDryingRack(ctx, L) {
  const hx = L.half, x0 = 0.6 * hx, x1 = 0.72 * hx, y0 = 122, y1 = 186;
  at(ctx, L, x0, y1, BACK - 0.5, () => {
    const w = x1 - x0, hh = y1 - y0;
    ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(1.2, 1.4, w, hh);
    ctx.fillStyle = grad(ctx, 0, 0, w, 0, [[0, "#3a2414"], [0.5, "#5a3a20"], [1, "#2a190d"]]);
    ctx.fillRect(0, 0, w, hh);
    ctx.fillStyle = "#24160b"; ctx.fillRect(0, hh - 4, w, 4);
    const rnd = lcg(321);
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 4; i++) {
        // a peg, and the glass hung mouth-down over it
        const px = 5 + i * ((w - 10) / 3), py = 14 + row * 18;
        ctx.fillStyle = "#1a0f08"; ctx.fillRect(px - 0.6, py - 2, 1.2, 6);
        const kind = rnd();
        ctx.fillStyle = "rgba(200,225,235,0.3)"; ctx.strokeStyle = "rgba(225,240,240,0.55)"; ctx.lineWidth = 0.3;
        ctx.beginPath();
        if (kind < 0.4) ctx.rect(px - 0.9, py - 12, 1.8, 14); // a test tube
        else if (kind < 0.75) { ctx.moveTo(px - 1, py + 2); ctx.lineTo(px + 1, py + 2); ctx.lineTo(px + 1, py - 3); ctx.lineTo(px + 4, py - 11); ctx.lineTo(px - 4, py - 11); ctx.lineTo(px - 1, py - 3); ctx.closePath(); } // a conical flask
        else { ctx.rect(px - 0.9, py - 4, 1.8, 6); ctx.moveTo(px + 3.6, py - 7.5); ctx.arc(px, py - 7.5, 3.6, 0, Math.PI * 2); } // a round flask
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(px - 0.6, py - 9, 0.4, 5);
      }
    }
  });
}

// The bench: oak cupboards under a black slate top, a row of drawers.
function paintBench(ctx, L) {
  const { Q } = L, b = L.bench;
  const oak = { side: "#1c1109", top: "#3a2414", front: "#2a190d" };
  footShadow(ctx, L, b, 0.7);
  block(ctx, L, { x0: b.x0 + 2, x1: b.x1 - 2, y0: 0, y1: b.h - 4, d0: b.d0 + 3, d1: b.d1 }, oak);
  const d = b.d0 + 3;
  const face = (x0, x1, y0, y1, col) => fillPoly(ctx, [Q(x0, y1, d - 0.2), Q(x1, y1, d - 0.2), Q(x1, y0, d - 0.2), Q(x0, y0, d - 0.2)], col);
  face(b.x0 + 2, b.x1 - 2, 0, 8, "#100904");
  const n = 4, w = (b.x1 - b.x0 - 12) / n;
  for (let i = 0; i < n; i++) {
    const x0 = b.x0 + 6 + i * w, x1 = x0 + w - 3;
    // a drawer
    face(x0, x1, 70, 82, "#331f11");
    face(x0, x1, 70, 70.8, "rgba(0,0,0,0.6)");
    face(x0, x1, 81.3, 82, "rgba(255,206,160,0.1)");
    const k = Q((x0 + x1) / 2, 76, d - 1);
    ctx.fillStyle = "#8a6c34"; ctx.fillRect(k.x - 3 * k.s, k.y - 0.6 * k.s, 6 * k.s, 1.4 * k.s);
    // and a cupboard door under it, a sunk panel in it
    face(x0, x1, 12, 66, "#2e1b0f");
    face(x0 + 4, x1 - 4, 18, 60, "rgba(0,0,0,0.22)");
    face(x0 + 4, x1 - 4, 59.3, 60, "rgba(0,0,0,0.5)");
    const h = Q(i % 2 ? x0 + 4 : x1 - 4, 52, d - 1);
    ctx.fillStyle = "#7a5c26"; ctx.beginPath(); ctx.arc(h.x, h.y, 1.3 * h.s, 0, Math.PI * 2); ctx.fill();
  }
  // the slate top, overhanging a little
  block(ctx, L, { x0: b.x0, x1: b.x1, y0: b.h - 4, y1: b.h, d0: b.d0, d1: BACK }, { side: "#0c0e0f", top: "#2a3032", front: "#16191a" });
  fillPoly(ctx, [Q(b.x0, b.h, b.d0), Q(b.x1, b.h, b.d0), Q(b.x1, b.h - 0.6, b.d0), Q(b.x0, b.h - 0.6, b.d0)], "rgba(200,220,230,0.14)");
}

// What stands on the bench, from the left: the oil lamp, the retort on its
// stand, the rack of tubes, the five bottles, the burner under its flask;
// the magnifying glass on its cloth at the front.
function paintBenchTop(ctx, L) {
  const b = L.bench, on = L.on, h = b.h;
  // ── the oil lamp
  at(ctx, L, L.lamp.x, h, L.lamp.d, () => {
    soft(ctx, 0, 0, 12, 3, "0,0,0", 0.6);
    ctx.fillStyle = grad(ctx, -7, 0, 7, 0, [[0, "#3a2a10"], [0.45, on ? "#c8a050" : "#6e5a2c"], [1, "#2a1e0c"]]);
    ctx.beginPath(); ctx.ellipse(0, -1, 7, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-2, -8, 4, 7);
    // the glass font, oil in it
    ctx.fillStyle = "rgba(170,140,70,0.55)";
    ctx.beginPath(); ctx.ellipse(0, -13, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,240,200,0.25)"; ctx.fillRect(-4.5, -16, 1.2, 5);
    ctx.fillStyle = "#8a6c34"; ctx.fillRect(-3.4, -21, 6.8, 3);
    // the chimney
    ctx.fillStyle = on ? "rgba(255,236,200,0.22)" : "rgba(200,210,220,0.12)";
    ctx.beginPath(); ctx.moveTo(-3, -21); ctx.bezierCurveTo(-6, -26, -6, -31, -2.4, -34); ctx.lineTo(-2.4, -44); ctx.lineTo(2.4, -44); ctx.lineTo(2.4, -34); ctx.bezierCurveTo(6, -31, 6, -26, 3, -21); ctx.closePath(); ctx.fill();
    if (on) {
      soft(ctx, 0, -27, 9, 11, WARM, 0.8, "lighter");
      ctx.fillStyle = grad(ctx, 0, -32, 0, -23, [[0, "#ffd070"], [0.5, "#fff2c8"], [1, "#ff9a3a"]]);
      ctx.beginPath(); ctx.moveTo(0, -32); ctx.quadraticCurveTo(2, -26, 0, -23); ctx.quadraticCurveTo(-2, -26, 0, -32); ctx.fill();
    }
  });
  // ── the retort stand: a foot, a rod, a clamp, a round flask held in it
  const rx = b.x0 + (b.x1 - b.x0) * 0.18;
  at(ctx, L, rx, h, 576, () => {
    ctx.fillStyle = "#16181a"; ctx.fillRect(-12, -1.6, 20, 1.6);
    ctx.fillStyle = "#4a4e52"; ctx.fillRect(-9, -58, 1.4, 57);
    ctx.fillRect(-9, -36, 12, 1.2);
    ctx.fillStyle = "rgba(190,220,200,0.18)";
    ctx.beginPath(); ctx.arc(4, -26, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(2.6, -42, 2.8, 10);
    ctx.fillStyle = "rgba(110,170,120,0.7)";
    ctx.beginPath(); ctx.arc(4, -26, 7.4, 0.15, Math.PI - 0.15); ctx.fill();
    ctx.strokeStyle = "rgba(225,240,240,0.5)"; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.arc(4, -26, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(0, -31, 1, 3);
  });
  // ── the rack of test tubes
  const tx = b.x0 + (b.x1 - b.x0) * 0.3;
  at(ctx, L, tx, h, 574, () => {
    ctx.fillStyle = "#5a3a20"; ctx.fillRect(-13, -2, 26, 2); ctx.fillRect(-13, -10, 26, 2);
    ctx.fillStyle = "#2a190d"; ctx.fillRect(-13, -10, 1.6, 10); ctx.fillRect(11.4, -10, 1.6, 10);
    const cols = ["220,90,70", "140,196,250", "240,200,80", "120,200,120", "200,120,200", "230,230,220"];
    cols.forEach((col, i) => {
      const x = -10 + i * 4;
      const top = -16 - (i % 2) * 1.5;
      ctx.fillStyle = "rgba(210,230,235,0.2)"; ctx.fillRect(x - 0.9, top, 1.8, -top - 1);
      ctx.fillStyle = `rgba(${col},0.75)`; ctx.fillRect(x - 0.8, top + 7, 1.6, -top - 8);
      ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(x - 0.6, top + 0.5, 0.4, 5);
    });
  });
  // ── the five bottles
  for (const bt of L.bottleRow) at(ctx, L, bt.x, h, bt.d, () => bottle(ctx, bt.shape));
  // ── the magnifying glass on its green cloth, lying at the front
  {
    const { Q } = L, g = L.loupe;
    const cloth = [Q(g.x - 16, h + 0.1, g.d - 6), Q(g.x + 18, h + 0.1, g.d - 6), Q(g.x + 19, h + 0.1, g.d + 9), Q(g.x - 15, h + 0.1, g.d + 9)];
    fillPoly(ctx, cloth, "#24482f");
    fillPoly(ctx, [cloth[0], cloth[1], Q(g.x + 18, h - 0.6, g.d - 6), Q(g.x - 16, h - 0.6, g.d - 6)], "#163020");
    const c = Q(g.x - 2, h + 0.4, g.d + 1.5), e = Q(g.x - 2, h + 0.4, g.d + 9.5);
    const rx = 8 * c.s, ry = Math.max(1.5, Math.abs(c.y - e.y) * 0.9);
    ctx.fillStyle = "#14100a";
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(0.25);
    ctx.fillRect(rx * 0.85, -1 * c.s, 13 * c.s, 2 * c.s);
    ctx.fillStyle = "#a8853e"; ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(170,200,220,0.4)"; ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.84, ry * 0.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.beginPath(); ctx.ellipse(-rx * 0.3, -ry * 0.25, rx * 0.25, ry * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // ── the burner: its foot and tube, the blue flame, a tripod and a flask over it
  at(ctx, L, L.burner.x, h, L.burner.d, () => {
    soft(ctx, 0, 0, 14, 3, "0,0,0", 0.6);
    ctx.fillStyle = "#2a2c2e"; ctx.beginPath(); ctx.ellipse(0, -1, 5, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = grad(ctx, -1.2, 0, 1.2, 0, [[0, "#3a3c3e"], [0.5, "#9a9ea2"], [1, "#2a2c2e"]]);
    ctx.fillRect(-1.2, -14, 2.4, 13);
    if (on) {
      soft(ctx, 0, -18, 6, 8, BLUE, 0.7, "lighter");
      ctx.fillStyle = "rgba(110,150,255,0.85)";
      ctx.beginPath(); ctx.moveTo(-1.3, -14); ctx.quadraticCurveTo(-1.6, -19, 0, -22.5); ctx.quadraticCurveTo(1.6, -19, 1.3, -14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(220,235,255,0.8)";
      ctx.beginPath(); ctx.moveTo(-0.6, -14); ctx.quadraticCurveTo(-0.6, -17, 0, -18.5); ctx.quadraticCurveTo(0.6, -17, 0.6, -14); ctx.closePath(); ctx.fill();
    }
    // the tripod and its gauze
    ctx.strokeStyle = "#3a3e42"; ctx.lineWidth = 0.9;
    for (const x of [-9, 9]) { ctx.beginPath(); ctx.moveTo(x * 0.7, -24); ctx.lineTo(x, 0); ctx.stroke(); }
    ctx.fillStyle = "#4a4e52"; ctx.fillRect(-9, -25, 18, 1.4);
    // the flask on it, something in it on the boil
    ctx.fillStyle = "rgba(200,225,235,0.18)";
    ctx.beginPath(); ctx.moveTo(-1.6, -41); ctx.lineTo(-1.6, -36); ctx.lineTo(-7.5, -25.5); ctx.lineTo(7.5, -25.5); ctx.lineTo(1.6, -36); ctx.lineTo(1.6, -41); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(220,110,80,0.7)";
    ctx.beginPath(); ctx.moveTo(-4.6, -31); ctx.lineTo(-7.2, -26); ctx.lineTo(7.2, -26); ctx.lineTo(4.6, -31); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(225,240,240,0.45)"; ctx.lineWidth = 0.35;
    ctx.beginPath(); ctx.moveTo(-1.6, -41); ctx.lineTo(-1.6, -36); ctx.lineTo(-7.5, -25.5); ctx.lineTo(7.5, -25.5); ctx.lineTo(1.6, -36); ctx.lineTo(1.6, -41); ctx.stroke();
    if (on) for (const [x, y] of [[-2, -28.5], [1.5, -29.5], [3.4, -27.6]]) { ctx.fillStyle = "rgba(255,230,210,0.6)"; ctx.beginPath(); ctx.arc(x, y, 0.5, 0, Math.PI * 2); ctx.fill(); }
  });
}

// A graduated vessel, drawn about the middle of its foot: the glass, its
// liquid, a fine white scale, the shine down one side.
function bottle(ctx, [shape, H, W, liquid, full]) {
  const w = W / 2;
  const outline = () => {
    ctx.beginPath();
    if (shape === "conical") { ctx.moveTo(-w * 0.3, -H); ctx.lineTo(-w * 0.3, -H * 0.68); ctx.lineTo(-w, -1); ctx.quadraticCurveTo(-w, 0, -w + 1, 0); ctx.lineTo(w - 1, 0); ctx.quadraticCurveTo(w, 0, w, -1); ctx.lineTo(w * 0.3, -H * 0.68); ctx.lineTo(w * 0.3, -H); }
    else if (shape === "round") { ctx.moveTo(-w * 0.26, -H); ctx.lineTo(-w * 0.26, -w * 2 + 1); ctx.arc(0, -w, w, -Math.PI / 2 - 0.27, Math.PI * 1.5 + 0.27, true); ctx.lineTo(w * 0.26, -H); }
    else if (shape === "jar") { ctx.moveTo(-w * 0.7, -H); ctx.lineTo(-w * 0.7, -H * 0.9); ctx.lineTo(-w, -H * 0.8); ctx.lineTo(-w, 0); ctx.lineTo(w, 0); ctx.lineTo(w, -H * 0.8); ctx.lineTo(w * 0.7, -H * 0.9); ctx.lineTo(w * 0.7, -H); }
    else if (shape === "tall") { ctx.moveTo(-w, -H); ctx.lineTo(-w, -1.6); ctx.lineTo(-w * 1.7, -1.6); ctx.lineTo(-w * 1.7, 0); ctx.lineTo(w * 1.7, 0); ctx.lineTo(w * 1.7, -1.6); ctx.lineTo(w, -1.6); ctx.lineTo(w, -H); }
    else { ctx.moveTo(-w - 0.8, -H); ctx.lineTo(-w, -H + 1); ctx.lineTo(-w, 0); ctx.lineTo(w, 0); ctx.lineTo(w, -H); }
    ctx.closePath();
  };
  soft(ctx, 0, 0, w * 1.6, 1.6, "0,0,0", 0.6);
  outline();
  ctx.fillStyle = "rgba(200,225,235,0.14)";
  ctx.fill();
  // the liquid, up to where it stands
  ctx.save();
  outline(); ctx.clip();
  const top = shape === "round" ? -w * 2 * full : -H * full * (shape === "conical" ? 0.68 : 0.9);
  ctx.fillStyle = `rgba(${liquid},${liquid === "34,32,36" ? 0.92 : 0.72})`;
  ctx.fillRect(-W, top, W * 2, -top);
  ctx.fillStyle = `rgba(${liquid},0.95)`;
  ctx.fillRect(-W, top, W * 2, 0.5);
  // the scale
  ctx.fillStyle = "rgba(240,240,230,0.55)";
  for (let y = -2; y > -H * 0.85; y -= 1.6) ctx.fillRect(-w * 0.15, y, (Math.round(-y / 1.6) % 5 ? 1.2 : 2.4), 0.22);
  ctx.restore();
  outline();
  ctx.strokeStyle = "rgba(225,240,240,0.5)"; ctx.lineWidth = 0.35; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(-w * 0.75, -H * 0.62, 0.7, H * 0.5);
  if (shape !== "round" && shape !== "beaker") { ctx.fillStyle = "#2a1c10"; ctx.fillRect(shape === "tall" ? -w : -w * (shape === "jar" ? 0.75 : 0.36), -H - 2, shape === "tall" ? W : W * (shape === "jar" ? 0.75 : 0.36), 2.4); }
}

// A round laboratory stool before the bench: three legs, a ring, a seat.
function paintStool(ctx, L) {
  const { Q } = L, s = L.stool;
  footShadow(ctx, L, { x0: s.x - 18, x1: s.x + 18, d0: s.d - 18, d1: s.d + 18 }, 0.6);
  ctx.strokeStyle = "#3a2616"; ctx.lineCap = "round";
  for (const a of [Math.PI * 0.15, Math.PI * 0.85, Math.PI * 1.5]) {
    const f = Q(s.x + Math.cos(a) * 17, 0, s.d + Math.sin(a) * 17), t = Q(s.x + Math.cos(a) * 11, s.h - 3, s.d + Math.sin(a) * 11);
    ctx.lineWidth = 2.6 * t.s;
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(t.x, t.y); ctx.stroke();
  }
  ctx.lineCap = "butt";
  const ring = Q(s.x, 22, s.d), r1 = Q(s.x, 22, s.d + 14);
  ctx.strokeStyle = "#2a1a0e"; ctx.lineWidth = 1.4 * ring.s;
  ctx.beginPath(); ctx.ellipse(ring.x, ring.y, 14 * ring.s, Math.abs(r1.y - ring.y), 0, 0, Math.PI * 2); ctx.stroke();
  const c = Q(s.x, s.h, s.d), e = Q(s.x, s.h, s.d + 17);
  const rx = 17 * c.s, ry = Math.max(1, Math.abs(e.y - c.y));
  ctx.fillStyle = "#3a2414"; ctx.fillRect(c.x - rx, c.y, rx * 2, 3 * c.s);
  ctx.beginPath(); ctx.ellipse(c.x, c.y + 3 * c.s, rx, ry, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = grad(ctx, c.x - rx, 0, c.x + rx, 0, [[0, "#4a3018"], [0.4, "#8a5e34"], [1, "#3a2414"]]);
  ctx.beginPath(); ctx.ellipse(c.x, c.y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
