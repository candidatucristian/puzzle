import PlainRoomScene from "../house/plainRoom.js";
import { soft, makeCanvas } from "../../shared/paint.js";
import { EYE, WARM, block, fillPoly, footShadow, onWall, thingAt } from "../house/roomKit.js";
import { FLAG_CODES } from "../flags/flagDesigns.js";
import { METAL, RIBBON, MEDAL } from "../flags/trophies.js";
import { ROOM6_PHOTOGRAPH, loadRoom6Photography, alignRoom6Photography, paintRoom6Photography, room6CabinetPoint, room6HerbariumQuad } from "./photographicRoom.js";

// ─────────────────────────────────────────────────────────────────────────────
// Room 6, the last along the hall: grey-green plaster under a coffered
// ceiling, bare boards, the tall arched window (see house/RoomScene.js for
// what every room does). Its puzzle is the trophy wall: against the left-hand
// wall a tall walnut cabinet, glazed above, his medals hanging inside on
// their ribbons under a small brass light that burns until it is solved; and
// in the right-hand corner a spiral stair, dark, winding up round its iron
// post through the ceiling.
// ─────────────────────────────────────────────────────────────────────────────

export default class Room6Scene extends PlainRoomScene {
  constructor() {
    super("Room6", {
      style: {
        wall: "plaster", near: "#222a28", far: "#101514", back: "#161c1b", rail: 0,
        dado: { near: "#1c1814", far: "#0e0c0a", back: "#14110e", rail: "#2e2620", railFar: "#16120f", railBack: "#221c17" },
        floor: "boards", floorNear: "#2a2118", floorFar: "#14100b", ceiling: "coffers", ceilingCol: "#0d0f0f", window: "arch",
      },
      window: { x: -0.3, hw: 0.17, top: 288, sill: 104 },
      hearth: null,
      chest: null,
      rug: ["#1c1a12", "#6a6040", "#2a2616"],
    });
  }

  preload() {
    super.preload();
    loadRoom6Photography(this);
  }

  layout(W, H, levels) {
    const L = super.layout(W, H);
    if (this.textures.exists(ROOM6_PHOTOGRAPH)) alignRoom6Photography(L, this.plan.window);
    const { Q, half: hx } = L;
    const lit = (id) => !levels.isCompleted(levels.indexOf(id));
    L.on = { flags: lit("flags") };
    // the medal cabinet against the left-hand wall: its front stands `deep`
    // off the wall, glazed from `glass.y0` up
    const mc = (L.cabinet = { x0: -hx, x1: -hx + 40, d0: 418, d1: 568, h: 212 });
    mc.glass = L.photographic ? { y0: 80, y1: 193 } : { y0: 84, y1: 198 };
    // the spiral stair in the right-hand corner, round its post, going up
    // through a round well in the ceiling; it climbs anticlockwise seen from
    // above and its last treads are at the back
    L.stairs = { cx: hx - 74, cd: 516, R: 66, r0: 5, rise: 20, perTurn: 13 };
    const front = -hx + 40, g = mc.glass;
    const cabinetFace = L.photographic ? [
      room6CabinetPoint(L, 0, (mc.h-g.y0)/mc.h), room6CabinetPoint(L, 1, (mc.h-g.y0)/mc.h),
      room6CabinetPoint(L, 1, (mc.h-g.y1)/mc.h), room6CabinetPoint(L, 0, (mc.h-g.y1)/mc.h),
    ] : [Q(front, g.y0, mc.d0), Q(front, g.y0, mc.d1), Q(front, g.y1, mc.d1), Q(front, g.y1, mc.d0)];
    L.things = [thingAt("flags", "Look at the medals", cabinetFace)];
    // Ivy's herbarium, shut, on the table under the window
    const herbarium = L.photographic ? room6HerbariumQuad(L) : (() => {
      const w = L.win, y = w.sill + (H - w.sill) * 0.28;
      return [{ x: w.cx - w.rx * 0.6, y: y + 14 }, { x: w.cx + w.rx * 0.6, y: y + 14 }, { x: w.cx + w.rx * 0.6, y: y - 14 }, { x: w.cx - w.rx * 0.6, y: y - 14 }];
    })();
    L.things.push(thingAt("herbarium", "Open her herbarium", herbarium));
    // where the room's light is, for the dark and for the scene
    const ml = Q(front - 4, g.y1 - 10, (mc.d0 + mc.d1) / 2);
    const mid = Q(front, (g.y0 + g.y1) / 2, (mc.d0 + mc.d1) / 2);
    const st = L.stairs, sm = Q(st.cx, L.top * 0.6, st.cd), sf = Q(st.cx - 20, 30, st.cd - 30);
    L.glows = { flags: { x: ml.x, y: ml.y + 30 * ml.s, r: 80 * ml.s } };
    if (L.photographic) {
      const lamp = room6CabinetPoint(L, 0.5, 0.07);
      L.glows.flags = { ...lamp, r: 52 * H / 948 };
    }
    L.detailLights = [
      { x: mid.x, y: mid.y, rx: 120 * mid.s, ry: 130 * mid.s, k: L.on.flags ? 0.85 : 0.35 },
      // the stairs: the light from the floor above down the well, enough to see them by
      { x: sm.x, y: sm.y, rx: 160 * sm.s, ry: 240 * sm.s, k: 0.62 },
      { x: sf.x, y: sf.y, rx: 120 * sf.s, ry: 70 * sf.s, k: 0.5 },
    ];
    return L;
  }

  paint(L) {
    return L.photographic ? paintRoom6Photography(this, L, this._keys) : super.paint(L);
  }

  paintDetails(ctx, L) {
    paintSpiralStairs(ctx, L);
    paintMedalCabinet(ctx, L);
  }

  live(L, k, glow) {
    super.live(L, k);
    // the cabinet's light while it burns, breathing very slightly
    if (!L.on.flags) return;
    const a = L.photographic ? 0.07 : 0.16;
    const lamp = glow(L.glows.flags, a, 0xffc078);
    this.ambientTween({ targets: lamp, alpha: { from: a * 0.85, to: a * 1.2 }, duration: 3200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }
}

// ── painting ────────────────────────────────────────────────────────────────

const grad = (ctx, x0, y0, x1, y1, stops) => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
};

// The medal cabinet: walnut, standing against the wall, a cupboard of two
// panelled doors below and a glazed case above. Inside, on dark green
// velvet, the five medals hang in a row from a brass rod, each on its
// country's ribbon (the trophy wall's own: flags/trophies.js), and on the
// glass shelf under them two cups and a small engraved plate. A brass light
// along the top inside, lit while its puzzle waits. Its front is painted
// flat and stood off the wall; the carcass round it in the room's projection.
function paintMedalCabinet(ctx, L) {
  const { Q } = L, c = L.cabinet, on = L.on.flags;
  footShadow(ctx, L, c, 0.75);
  // the carcass: the near end of it, and its face (painted over, below)
  block(ctx, L, { x0: c.x0, x1: c.x1, y0: 0, y1: c.h, d0: c.d0, d1: c.d1 }, { side: "#24160c", top: "#4a3020", front: "#1e1209" });
  // the cornice, jutting over the near end
  block(ctx, L, { x0: c.x0, x1: c.x1 + 3, y0: c.h - 7, y1: c.h + 2, d0: c.d0 - 3, d1: c.d1 }, { side: "#2e1c10", top: "#5a3c24", front: "#24160c" });
  fillPoly(ctx, [Q(c.x0, c.h - 7.4, c.d0 - 3.1), Q(c.x1 + 3, c.h - 7.4, c.d0 - 3.1), Q(c.x1 + 3, c.h - 6.6, c.d0 - 3.1), Q(c.x0, c.h - 6.6, c.d0 - 3.1)], "rgba(255,214,170,0.18)");

  const PX = 3, w = c.d1 - c.d0, h = c.h;
  const flat = makeCanvas(Math.round(w * PX), Math.round(h * PX)), g = flat.getContext("2d");
  g.scale(PX, PX);
  const Y = (y) => h - y; // flat rows run down from its top; heights run up from the floor
  // walnut, with its grain
  g.fillStyle = grad(g, 0, 0, w, 0, [[0, "#3a2414"], [0.5, "#2c1a0e"], [1, "#3a2414"]]);
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(0,0,0,0.22)"; g.lineWidth = 0.3;
  for (let i = 0; i < 46; i++) {
    const x = (i * 37.3) % w;
    g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 3, h * 0.3, x - 3, h * 0.7, x + 1.5, h); g.stroke();
  }
  // the plinth and the cornice
  g.fillStyle = "#160d07"; g.fillRect(0, Y(6), w, 6);
  g.fillStyle = grad(g, 0, 0, 0, 9, [[0, "#5a3a20"], [0.35, "#3a2414"], [1, "#1a0f08"]]);
  g.fillRect(0, 0, w, 9);
  g.fillStyle = "rgba(255,214,170,0.25)"; g.fillRect(0, 9, w, 0.4);

  // ── the cupboard below: two panelled doors, brass at their meeting ──
  const cb = { y0: 8, y1: c.glass.y0 - 6 };
  const panel = (x0, x1, y0, y1) => {
    g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(x0, Y(y1), x1 - x0, y1 - y0);
    g.fillStyle = grad(g, x0, 0, x1, 0, [[0, "#2a190d"], [0.5, "#3a2414"], [1, "#24150b"]]);
    g.fillRect(x0 + 1.2, Y(y1) + 1.2, x1 - x0 - 2.4, y1 - y0 - 2.4);
    g.fillStyle = "rgba(255,214,170,0.12)"; g.fillRect(x0, Y(y0) - 0.4, x1 - x0, 0.4);
  };
  for (const [x0, x1] of [[5, w / 2 - 1], [w / 2 + 1, w - 5]]) {
    g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(x0 - 0.5, Y(cb.y1) - 0.5, x1 - x0 + 1, cb.y1 - cb.y0 + 1);
    g.fillStyle = "#2e1c0f"; g.fillRect(x0, Y(cb.y1), x1 - x0, cb.y1 - cb.y0);
    panel(x0 + 6, x1 - 6, cb.y0 + 7, cb.y1 - 7);
  }
  for (const x of [w / 2 - 4, w / 2 + 4]) {
    g.fillStyle = "#b8903e"; g.beginPath(); g.arc(x, Y((cb.y0 + cb.y1) / 2), 1.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(255,240,200,0.6)"; g.beginPath(); g.arc(x - 0.4, Y((cb.y0 + cb.y1) / 2) - 0.4, 0.4, 0, Math.PI * 2); g.fill();
  }
  // the ledge between them, catching the light
  g.fillStyle = grad(g, 0, Y(c.glass.y0 - 1), 0, Y(c.glass.y0 - 6), [[0, "#5a3a20"], [0.4, "#3a2414"], [1, "#1a0f08"]]);
  g.fillRect(0, Y(c.glass.y0 - 1), w, 5);

  // ── the glazed case ──
  const gx0 = 6, gx1 = w - 6, gy0 = Y(c.glass.y1), gy1 = Y(c.glass.y0);
  const gw = gx1 - gx0, gh = gy1 - gy0;
  g.save();
  g.beginPath(); g.rect(gx0, gy0, gw, gh); g.clip();
  // velvet, dark green, lit from the light along its top
  g.fillStyle = grad(g, 0, gy0, 0, gy1, [[0, on ? "#24402e" : "#142218"], [0.5, on ? "#16281c" : "#0c1610"], [1, "#08100b"]]);
  g.fillRect(gx0, gy0, gw, gh);
  for (let i = 0; i < 300; i++) {
    g.fillStyle = `rgba(${i % 2 ? "0,0,0" : "120,170,130"},0.05)`;
    g.fillRect(gx0 + ((i * 53.7) % gw), gy0 + ((i * 31.1) % gh), 0.6, 0.6);
  }
  if (on) {
    g.save(); g.translate(w / 2, gy0 + 4); g.scale(gw * 0.6, gh * 0.75);
    const lg = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    lg.addColorStop(0, "rgba(255,210,150,0.32)"); lg.addColorStop(1, "rgba(255,210,150,0)");
    g.fillStyle = lg; g.fillRect(-1, 0, 2, 1); g.restore();
  }
  // the light: a brass tube along the top
  g.fillStyle = "#3a2c14"; g.fillRect(gx0 + gw * 0.2, gy0 + 1, gw * 0.6, 2.6);
  g.fillStyle = on ? "#e8c070" : "#6e5a2c"; g.fillRect(gx0 + gw * 0.2, gy0 + 3, gw * 0.6, 0.7);
  // the rod the medals hang from, and the medals on their ribbons
  const rodY = gy0 + 10;
  g.fillStyle = grad(g, 0, rodY - 0.8, 0, rodY + 0.8, [[0, "#f0d290"], [0.5, "#a8803a"], [1, "#4a3410"]]);
  g.fillRect(gx0 + 6, rodY - 0.8, gw - 12, 1.6);
  const n = FLAG_CODES.length, step = (gw - 16) / n;
  FLAG_CODES.forEach((code, i) => {
    const cx = gx0 + 8 + step * (i + 0.5);
    const rw = 7, rl = 18, ry0 = rodY + 0.4;
    // the ribbon: its country's stripes, folded over the rod and narrowing to the ring
    const rb = RIBBON[code];
    g.save();
    g.beginPath();
    g.moveTo(cx - rw / 2, ry0); g.lineTo(cx + rw / 2, ry0); g.lineTo(cx + rw * 0.36, ry0 + rl); g.lineTo(cx - rw * 0.36, ry0 + rl); g.closePath();
    g.fillStyle = "rgba(0,0,0,0.35)"; g.save(); g.translate(0.8, 1); g.fill(); g.restore();
    g.clip();
    const sw = rw / rb.stripes.length;
    rb.stripes.forEach((col, k) => { g.fillStyle = col; g.fillRect(cx - rw / 2 + k * sw, ry0, sw + 0.05, rl); });
    if (rb.cross) { g.fillStyle = rb.cross; g.fillRect(cx - rw / 2, ry0 + rl * 0.35, rw, rl * 0.16); g.fillRect(cx - rw * 0.18, ry0, rw * 0.22, rl); }
    if (rb.globe) { g.fillStyle = "#1c3d8a"; g.beginPath(); g.arc(cx, ry0 + rl * 0.45, rw * 0.22, 0, Math.PI * 2); g.fill(); }
    // the silk's sheen and its folds
    g.fillStyle = grad(g, cx - rw / 2, 0, cx + rw / 2, 0, [[0, "rgba(0,0,0,0.3)"], [0.35, "rgba(255,255,255,0.12)"], [0.6, "rgba(0,0,0,0.1)"], [1, "rgba(0,0,0,0.35)"]]);
    g.fillRect(cx - rw / 2, ry0, rw, rl);
    g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(cx - rw / 2, ry0, rw, 1.2);
    g.restore();
    // the ring, and the medal itself
    const metal = METAL[MEDAL[code].metal], r = 5.4, my = ry0 + rl + r + 0.6;
    g.strokeStyle = metal[2]; g.lineWidth = 0.6;
    g.beginPath(); g.arc(cx, ry0 + rl + 0.3, 0.9, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "rgba(0,0,0,0.4)"; g.beginPath(); g.arc(cx + 0.9, my + 1.1, r, 0, Math.PI * 2); g.fill();
    const sides = MEDAL[code].sides;
    g.beginPath();
    if (sides) for (let k = 0; k < sides; k++) { const a = -Math.PI / 2 + (k * Math.PI * 2) / sides; g[k ? "lineTo" : "moveTo"](cx + Math.cos(a) * r, my + Math.sin(a) * r); }
    else g.arc(cx, my, r, 0, Math.PI * 2);
    g.closePath();
    const mg = g.createRadialGradient(cx - r * 0.35, my - r * 0.4, r * 0.1, cx, my, r);
    mg.addColorStop(0, metal[3]); mg.addColorStop(0.35, metal[2]); mg.addColorStop(0.8, metal[1]); mg.addColorStop(1, metal[0]);
    g.fillStyle = mg; g.fill();
    g.strokeStyle = metal[1]; g.lineWidth = 0.35;
    g.beginPath(); g.arc(cx, my, r * 0.72, 0, Math.PI * 2); g.stroke();
    // a sprig struck on it
    g.strokeStyle = metal[0]; g.lineWidth = 0.35;
    g.beginPath(); g.moveTo(cx, my + r * 0.45); g.quadraticCurveTo(cx - r * 0.1, my, cx + r * 0.05, my - r * 0.45); g.stroke();
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * r * 0.2, my - r * 0.05 + s * r * 0.05, r * 0.2, r * 0.09, s * 0.6, 0, Math.PI * 2); g.stroke(); }
  });
  // the glass shelf, two cups and an engraved plate on it
  const sy = gy0 + gh * 0.66;
  g.fillStyle = "rgba(200,230,220,0.22)"; g.fillRect(gx0, sy, gw, 0.8);
  g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(gx0, sy + 0.8, gw, 1.4);
  const cup = (x, s) => {
    const G = METAL.gold;
    g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.ellipse(x + 1, sy, 7 * s, 1.2, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#1a120a"; g.fillRect(x - 5 * s, sy - 4 * s, 10 * s, 4 * s);
    const body = grad(g, x - 7 * s, 0, x + 7 * s, 0, [[0, G[0]], [0.3, G[3]], [0.5, G[2]], [0.8, G[1]], [1, G[0]]]);
    g.fillStyle = body;
    g.fillRect(x - 1.2 * s, sy - 9 * s, 2.4 * s, 5 * s);
    g.beginPath(); g.moveTo(x - 7 * s, sy - 20 * s); g.quadraticCurveTo(x - 6.4 * s, sy - 10 * s, x, sy - 9 * s); g.quadraticCurveTo(x + 6.4 * s, sy - 10 * s, x + 7 * s, sy - 20 * s); g.closePath(); g.fill();
    g.strokeStyle = G[2]; g.lineWidth = 0.8 * s;
    for (const d of [-1, 1]) { g.beginPath(); g.moveTo(x + d * 6.6 * s, sy - 18 * s); g.bezierCurveTo(x + d * 11 * s, sy - 18 * s, x + d * 10 * s, sy - 12 * s, x + d * 4 * s, sy - 12 * s); g.stroke(); }
    g.fillStyle = G[1]; g.beginPath(); g.ellipse(x, sy - 20 * s, 7 * s, 1.1 * s, 0, 0, Math.PI * 2); g.fill();
  };
  cup(gx0 + gw * 0.18, 1);
  cup(gx0 + gw * 0.82, 0.8);
  g.fillStyle = grad(g, 0, sy - 7, 0, sy, [[0, "#d8b860"], [1, "#6a4e1c"]]);
  g.fillRect(w / 2 - 9, sy - 7, 18, 7);
  g.fillStyle = "rgba(60,40,10,0.6)";
  for (const [dy, lw] of [[2.2, 12], [4.4, 8]]) g.fillRect(w / 2 - lw / 2, sy - 7 + dy, lw, 0.4);
  // the glass: the room's light across it, and its frame's shadow inside
  for (const [f, fw, a] of [[0.1, 0.14, 0.07], [0.32, 0.04, 0.05], [0.66, 0.1, 0.04]]) {
    g.fillStyle = `rgba(220,235,240,${a})`;
    g.beginPath();
    g.moveTo(gx0 + gw * f, gy0); g.lineTo(gx0 + gw * (f + fw), gy0);
    g.lineTo(gx0 + gw * (f + fw) - gh * 0.25, gy1); g.lineTo(gx0 + gw * f - gh * 0.25, gy1);
    g.closePath(); g.fill();
  }
  g.fillStyle = grad(g, 0, gy0, 0, gy0 + 6, [[0, "rgba(0,0,0,0.5)"], [1, "rgba(0,0,0,0)"]]);
  g.fillRect(gx0, gy0, gw, 6);
  g.restore();
  // the frame round the glass: a thin moulding, its inner edge lit
  g.strokeStyle = "#1a0f08"; g.lineWidth = 1.6; g.strokeRect(gx0 - 0.8, gy0 - 0.8, gw + 1.6, gh + 1.6);
  g.strokeStyle = "rgba(255,214,170,0.22)"; g.lineWidth = 0.4; g.strokeRect(gx0 - 0.2, gy0 - 0.2, gw + 0.4, gh + 0.4);
  // a small brass escutcheon at the glazed door's edge
  g.fillStyle = "#b8903e"; g.fillRect(gx1 + 1.2, (gy0 + gy1) / 2 - 2.5, 1.8, 5);

  onWall(ctx, { ...L, half: L.half - (c.x1 - c.x0) }, -1, { d0: c.d0, d1: c.d1, y0: 0, y1: c.h }, flat);
  // its light, spilling out a little onto the floor in front of it
  if (on) {
    const fl = Q(c.x1 + 30, 0, (c.d0 + c.d1) / 2);
    soft(ctx, fl.x, fl.y, 90 * fl.s, 20 * fl.s, WARM, 0.08, "lighter");
  }
}

// The spiral stair in the right-hand corner: dark oak treads, each a wedge
// from the iron post at the middle out to the curve of the rail, winding up
// round the post and through a round well in the ceiling; a baluster at the
// outer end of each, the handrail running over them. Little light reaches
// it — what there is comes down the well from the floor above. Each tread
// is painted far to near, the post among them, so they pass behind it and
// in front of it as they go round.
function paintSpiralStairs(ctx, L) {
  const { Q } = L, s = L.stairs, { cx, cd, R, r0, rise } = s;
  const da = (Math.PI * 2) / s.perTurn;
  const n = Math.floor((L.top - 4) / rise);
  const aTop = Math.PI / 2 + 0.25; // the last tread, at the back
  const at = (r, a, y) => Q(cx + r * Math.cos(a), y, cd + r * Math.sin(a));
  const arc = (r, a0, a1, y, k = 6) => Array.from({ length: k + 1 }, (_, j) => at(r, a0 + ((a1 - a0) * j) / k, y));

  // the well in the ceiling, and the faint warm light down it
  fillPoly(ctx, arc(R + 10, 0, Math.PI * 2, L.top, 32), "#030303");
  const wl = Q(cx, L.top - 20, cd);
  soft(ctx, wl.x, wl.y + 40 * wl.s, 90 * wl.s, 170 * wl.s, WARM, 0.16, "lighter");
  footShadow(ctx, L, { x0: cx - R, x1: cx + R, d0: cd - R, d1: cd + R }, 0.7);

  const items = [];
  for (let i = 0; i < n; i++) {
    const y = (i + 1) * rise, a0 = aTop - (n - 1 - i) * da, a1 = a0 + da * 1.04, am = (a0 + a1) / 2;
    items.push({ depth: cd + R * 0.6 * Math.sin(am), draw: () => tread(y, a0, a1) });
    items.push({ depth: cd + 0.01, draw: () => post(y - rise, y) });
  }
  items.sort((a, b) => b.depth - a.depth);
  for (const it of items) it.draw();

  function post(y0, y1) {
    const p = Q(cx - r0, y1, cd), q = Q(cx + r0, y0, cd);
    ctx.fillStyle = grad(ctx, p.x, 0, q.x, 0, [[0, "#0a0a0b"], [0.35, "#2a2a2e"], [0.6, "#141416"], [1, "#060607"]]);
    ctx.fillRect(p.x, p.y, q.x - p.x, q.y - p.y + 0.6);
  }

  function tread(y, a0, a1) {
    const T = 4;
    const top = [...arc(R, a0, a1, y), ...arc(r0, a1, a0, y)];
    if (y < EYE) {
      // seen from above: its outer edge, its leading edge, then its top
      fillPoly(ctx, [...arc(R, a0, a1, y), ...arc(R, a1, a0, y - T)], "#140c07");
      fillPoly(ctx, [at(r0, a1, y), at(R, a1, y), at(R, a1, y - T), at(r0, a1, y - T)], "#1e130b");
      const m0 = at(r0, (a0 + a1) / 2, y), m1 = at(R, (a0 + a1) / 2, y);
      fillPoly(ctx, top, grad(ctx, m0.x, m0.y, m1.x, m1.y, [[0, "#2a1c10"], [0.6, "#4a3220"], [1, "#3a2616"]]));
      // the nosing, catching what little light there is
      const e = arc(R, a0, a1, y);
      ctx.strokeStyle = "rgba(255,210,170,0.2)"; ctx.lineWidth = Math.max(0.6, 0.6 * e[0].s);
      ctx.beginPath(); e.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
    } else {
      // seen from below: its underside, then its outer edge
      fillPoly(ctx, [...arc(R, a0, a1, y - T), ...arc(r0, a1, a0, y - T)], "#0c0805");
      fillPoly(ctx, [...arc(R, a0, a1, y), ...arc(R, a1, a0, y - T)], "#120b06");
    }
    // the baluster at its outer end, and the rail over it
    const bA = a0 + (a1 - a0) * 0.5, H = 88;
    const b0 = at(R - 3, bA, y), b1 = at(R - 3, bA, Math.min(L.top, y + H));
    ctx.strokeStyle = "#0e0905"; ctx.lineWidth = Math.max(0.8, 1.4 * b0.s);
    ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.stroke();
    if (y + H < L.top) {
      const rail = Array.from({ length: 7 }, (_, j) => {
        const u = j / 6;
        return at(R - 3, a0 + (a1 - a0) * u, Math.min(L.top, y + H + rise * (u - 0.5)));
      });
      for (const [lw, col] of [[3.4, "#0c0805"], [2, "#2a1a10"], [0.6, "rgba(255,210,170,0.14)"]]) {
        ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.5, lw * rail[0].s); ctx.lineCap = "round";
        ctx.beginPath(); rail.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      }
      ctx.lineCap = "butt";
    }
  }
}
