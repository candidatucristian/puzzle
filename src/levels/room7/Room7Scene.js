import PlainRoomScene from "../house/plainRoom.js";
import { soft, lcg } from "../../shared/paint.js";
import { BACK, WARM, block, fillPoly, footShadow, thingAt } from "../house/roomKit.js";
import { LAB_FIXTURES, paintGlassCabinet, paintTestTubeRack, paintWashingStation } from "../chemistry/glassware.js";

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
        floor: "flags", floorNear: "#2a2c2b", floorFar: "#121414", ceiling: "beams", ceilingCol: "#0c0d0d", window: "custom",
      },
      window: { x: 0.5, hw: 0.28, top: 244, sill: 116 },
      hearth: null,
      chest: null,
      rug: ["#121614", "#2a302b", "#171c19"],
    });
  }

  preload() {
    for (const { key, url } of Object.values(LAB_FIXTURES)) this.load.image(key, url);
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
    L.sinks = { x0: 0.17 * hx, x1: 0.83 * hx, d0: 536, h: 90 };
    const sinkLeft = Q(L.sinks.x0, 0, L.sinks.d0), sinkRight = Q(L.sinks.x1, 0, L.sinks.d0);
    const stationWidth = sinkRight.x - sinkLeft.x, stationHeight = stationWidth * 1392 / 1012;
    L.washing = { x: sinkLeft.x, y: sinkLeft.y - stationHeight, width: stationWidth, height: stationHeight };
    // Keep the light and floor reflection aligned to the actual window panes.
    Object.assign(L.win, {
      cx: sinkLeft.x + stationWidth * 0.5, rx: stationWidth * 0.418,
      top: L.washing.y, sill: L.washing.y + stationHeight * 0.458,
      hw: stationWidth * 0.418 / Q(0, 0, BACK).s,
    });
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
    L.wallShelves = { d0: 410, d1: 575, y0: 98, y1: 238 };
    const sp = Q(-hx, 160, 505);
    L.detailLights.push({ x: sp.x, y: sp.y, rx: 180 * sp.s, ry: 135 * sp.s, k: 0.82 });
    // and the sinks under the window, in the moon
    const sk = Q((L.sinks.x0 + L.sinks.x1) / 2, 100, 570);
    L.detailLights.push({ x: sk.x, y: sk.y, rx: 150 * sk.s, ry: 70 * sk.s, k: 0.55 });
    return L;
  }

  paintDetails(ctx, L) {
    const sources = Object.fromEntries(Object.entries(LAB_FIXTURES).map(([name, asset]) => [name, this.textures.get(asset.key).getSourceImage()]));
    paintGlassCabinet(ctx, L, sources.cabinet);
    paintPoster(ctx, L);
    paintShelf(ctx, L);
    paintGasPipe(ctx, L);
    paintWashingStation(ctx, L, sources.washing);
    paintCabinet(ctx, L);
    paintBench(ctx, L);
    paintBenchTop(ctx, L, sources.rack);
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
function paintBenchTop(ctx, L, rack) {
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
  at(ctx, L, tx, h, 574, () => paintTestTubeRack(ctx, rack, 0, 0, 40));
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
