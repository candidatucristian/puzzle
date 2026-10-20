import PlainRoomScene from "../house/plainRoom.js";
import { soft, lcg } from "../../shared/paint.js";
import { BACK, WARM, block, fillPoly, footShadow, thingAt } from "../house/roomKit.js";
import { ROOM8_PHOTOGRAPH, loadRoom8Photography, alignRoom8Photography, paintRoom8Photography } from "./photographicRoom.js";

// ─────────────────────────────────────────────────────────────────────────────
// Room 8, behind door VIII off the chemist's hall: his weighing room (see
// house/RoomScene.js for what every room does). Three things he left half
// done, and a puzzle in each: on the desk against the left wall his
// apothecary's balance, its box of weights open and four phials beside it,
// a green-shaded lamp over them; on the back wall the blackboard, three
// reactions on it, a brass light over it; and under the window, on the
// slate by the sink, two plain bottles and a volumetric flask, a small lamp
// on the wall beside them. Each light burns until its puzzle is solved.
// ─────────────────────────────────────────────────────────────────────────────

export default class Room8Scene extends PlainRoomScene {
  constructor() {
    super("Room8", {
      style: {
        wall: "plaster", near: "#20262a", far: "#0f1315", back: "#161b1e", rail: 0,
        dado: { kind: "boards", h: 92, near: "#1a2024", far: "#0c1012", back: "#12171a", rail: "#3a2c1c", railFar: "#1a130c", railBack: "#2c2216" },
        skirt: "#0e1012", skirtBack: "#08090a",
        floor: "flags", floorNear: "#2a2b2c", floorFar: "#121314", ceiling: "beams", ceilingCol: "#0c0d0e", window: "sash",
      },
      window: { x: 0.49, hw: 0.2, top: 238, sill: 132 },
      hearth: null,
      chest: null,
      rug: ["#141618", "#2c2e30", "#191b1d"],
    });
  }

  preload() {
    super.preload();
    loadRoom8Photography(this);
  }

  layout(W, H, levels) {
    const L = super.layout(W, H);
    const { Q, half: hx } = L;
    const lit = (id) => !levels.isCompleted(levels.indexOf(id));
    L.on = { balance: lit("balance"), equations: lit("equations"), measures: lit("measures") };
    // the desk against the left wall, the balance in the middle of it
    const dk = (L.desk = { x0: -hx + 4, x1: -hx + 84, d0: 432, d1: 566, h: 78 });
    L.balance = { x: dk.x1 - 34, d: 500 };
    L.deskLamp = { x: dk.x0 + 30, d: 552 };
    // the blackboard on the back wall, left of the window
    L.board = { x0: -0.66 * hx, x1: -0.06 * hx, y0: 104, y1: 214 };
    // the sink counter under the window, the vessels on its slate
    const ct = (L.counter = { x0: 0.12 * hx, x1: 0.86 * hx, d0: 546, h: 90 });
    L.sinkAt = { x0: ct.x0 + 12, x1: ct.x0 + 12 + 0.26 * hx };
    L.vessels = [
      { x: 0.55 * hx, d: 566, cap: 500 },
      { x: 0.63 * hx, d: 566, cap: 300 },
      { x: 0.75 * hx, d: 568, flask: true },
    ];
    L.wallLamp = { x: ct.x1 - 4, y: 196 };
    const b = L.balance, bd = L.board;
    L.things = [
      thingAt("balance", "Look at the balance", [Q(b.x - 28, dk.h - 1, b.d), Q(b.x + 28, dk.h - 1, b.d), Q(b.x + 28, dk.h + 52, b.d), Q(b.x - 28, dk.h + 52, b.d)]),
      thingAt("equations", "Look at the blackboard", [Q(bd.x0, bd.y0, BACK), Q(bd.x1, bd.y0, BACK), Q(bd.x1, bd.y1, BACK), Q(bd.x0, bd.y1, BACK)]),
      thingAt("measures", "Look at the bottles by the sink", [Q(L.vessels[0].x - 10, ct.h - 1, 566), Q(L.vessels[2].x + 12, ct.h - 1, 566), Q(L.vessels[2].x + 12, ct.h + 44, 566), Q(L.vessels[0].x - 10, ct.h + 44, 566)]),
    ];
    // where the room's lights are, for the dark and for the scene
    const dl = Q(L.deskLamp.x, dk.h + 30, L.deskLamp.d);
    const bl = Q((bd.x0 + bd.x1) / 2, bd.y1 + 8, BACK - 4);
    const wl = Q(L.wallLamp.x, L.wallLamp.y, BACK - 6);
    L.glows = {
      balance: { x: dl.x, y: dl.y + 6 * dl.s, r: 70 * dl.s },
      equations: { x: bl.x, y: bl.y + 10 * bl.s, r: 120 * bl.s },
      measures: { x: wl.x, y: wl.y, r: 60 * wl.s },
    };
    const bc = Q(b.x, dk.h + 20, b.d), bm = Q((bd.x0 + bd.x1) / 2, (bd.y0 + bd.y1) / 2, BACK), vm = Q(L.vessels[1].x, ct.h + 20, 566);
    L.detailLights = [
      { x: bc.x, y: bc.y, rx: 120 * bc.s, ry: 90 * bc.s, k: L.on.balance ? 0.9 : 0.35 },
      { x: bm.x, y: bm.y, rx: 200 * bm.s, ry: 110 * bm.s, k: L.on.equations ? 0.85 : 0.35 },
      { x: vm.x, y: vm.y, rx: 150 * vm.s, ry: 80 * vm.s, k: L.on.measures ? 0.85 : 0.35 },
    ];
    if (this.textures.exists(ROOM8_PHOTOGRAPH)) alignRoom8Photography(L);
    return L;
  }

  paint(L) {
    return L.photographic ? paintRoom8Photography(this, L, this._keys) : super.paint(L);
  }

  paintDetails(ctx, L) {
    paintBoard(ctx, L);
    paintCounter(ctx, L);
    paintWallLamp(ctx, L);
    paintDesk(ctx, L);
  }

  live(L, k, glow) {
    super.live(L, k);
    // each light while it burns, breathing very slightly
    for (const [id, a, tint] of [["balance", 0.22, 0xffcf8a], ["equations", 0.16, 0xffd6a0], ["measures", 0.18, 0xffc884]]) {
      if (!L.on[id]) continue;
      const alpha = L.photographic ? a * 0.35 : a;
      const light = glow(L.glows[id], alpha, tint);
      this.ambientTween({ targets: light, alpha: { from: alpha * 0.85, to: alpha * 1.18 }, duration: 3000 + a * 4000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
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
const brass = (ctx, x0, x1) => grad(ctx, x0, 0, x1, 0, [[0, "#3a2808"], [0.45, "#d8b86a"], [1, "#5a4012"]]);

// The blackboard: an oak frame, the slate with the sponge's grey on it, his
// three lines of chalk too small to read from here, the tray and its chalk;
// a brass picture light over it.
function paintBoard(ctx, L) {
  const b = L.board, w = b.x1 - b.x0, h = b.y1 - b.y0, on = L.on.equations;
  const rnd = lcg(808);
  at(ctx, L, b.x0, b.y1, BACK - 1, () => {
    ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(2, 2.5, w, h);
    ctx.fillStyle = grad(ctx, 0, -3, 0, h + 3, [[0, "#5a3a20"], [1, "#2a190c"]]);
    ctx.fillRect(-3, -3, w + 6, h + 6);
    ctx.fillStyle = grad(ctx, 0, 0, w, h, [[0, "#1f2c26"], [1, "#141d19"]]);
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) {
      ctx.strokeStyle = `rgba(236,236,226,${(0.02 + rnd() * 0.03).toFixed(3)})`; ctx.lineWidth = 4 + rnd() * 6;
      const x = rnd() * w, y = rnd() * h, r = 14 + rnd() * 30;
      ctx.beginPath(); ctx.arc(x, y + r, r, -Math.PI * 0.75, -Math.PI * 0.3); ctx.stroke();
    }
    // his three lines: chalk too small to read from the door
    ctx.strokeStyle = "rgba(236,236,226,0.62)"; ctx.lineWidth = 0.7; ctx.lineCap = "round";
    for (let r = 0; r < 3; r++) {
      let x = w * 0.12;
      const y = h * (0.32 + r * 0.22);
      while (x < w * (0.72 + rnd() * 0.12)) {
        const len = 2 + rnd() * 5;
        ctx.beginPath(); ctx.moveTo(x, y + (rnd() - 0.5) * 1.6); ctx.lineTo(x + len, y + (rnd() - 0.5) * 1.6); ctx.stroke();
        x += len + 1.5 + rnd() * 3;
      }
    }
    ctx.lineCap = "butt";
    // the tray, its chalk
    ctx.fillStyle = "#3a2414"; ctx.fillRect(-3, h + 3, w + 6, 2.4);
    ctx.fillStyle = "#e8e6dc"; ctx.fillRect(w * 0.2, h + 1.6, 5, 1.4); ctx.fillRect(w * 0.27, h + 1.8, 3, 1.2);
    // the picture light: a brass hood on two arms
    ctx.fillStyle = "#3a2c14"; ctx.fillRect(w * 0.25, -12, w * 0.5, 3);
    ctx.fillStyle = on ? "#e8c070" : "#6e5a2c"; ctx.fillRect(w * 0.25, -9.6, w * 0.5, 0.8);
    ctx.strokeStyle = "#3a2c14"; ctx.lineWidth = 0.8;
    for (const x of [w * 0.32, w * 0.68]) { ctx.beginPath(); ctx.moveTo(x, -9); ctx.lineTo(x, -4); ctx.stroke(); }
    if (on) soft(ctx, w / 2, h * 0.25, w * 0.5, h * 0.55, "255,214,160", 0.14, "lighter");
  });
}

// The counter under the window: oak cupboards, a slate top, the fireclay
// sink let into it with its brass tap; a band of white tiles behind; the
// two bottles and the flask on the slate.
function paintCounter(ctx, L) {
  const { Q } = L, c = L.counter, on = L.on.measures;
  // the tiles behind, up to the sill
  at(ctx, L, c.x0, L.plan.window.sill, BACK - 0.5, () => {
    const w = c.x1 - c.x0, h = L.plan.window.sill - c.h;
    ctx.fillStyle = "#5a5c56"; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 7.5) for (let x = 0; x < w; x += 7.5) {
      ctx.fillStyle = "#8c8e86"; ctx.fillRect(x + 0.4, y + 0.4, 6.7, 6.7);
    }
    ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(0, 0, w, h);
  });
  footShadow(ctx, L, { ...c, d1: BACK }, 0.7);
  block(ctx, L, { x0: c.x0 + 2, x1: c.x1 - 2, y0: 0, y1: c.h - 4, d0: c.d0 + 3, d1: BACK }, { side: "#1c1109", top: "#3a2414", front: "#2a190d" });
  const d = c.d0 + 3, face = (x0, x1, y0, y1, col) => fillPoly(ctx, [Q(x0, y1, d - 0.2), Q(x1, y1, d - 0.2), Q(x1, y0, d - 0.2), Q(x0, y0, d - 0.2)], col);
  face(c.x0 + 2, c.x1 - 2, 0, 8, "#100904");
  const n = 4, cw = (c.x1 - c.x0 - 12) / n;
  for (let i = 0; i < n; i++) {
    const x0 = c.x0 + 6 + i * cw, x1 = x0 + cw - 3;
    face(x0, x1, 12, 78, "#2e1b0f");
    face(x0 + 4, x1 - 4, 18, 72, "rgba(0,0,0,0.22)");
    const k = Q(i % 2 ? x0 + 5 : x1 - 5, 62, d - 1);
    ctx.fillStyle = "#7a5c26"; ctx.beginPath(); ctx.arc(k.x, k.y, 1.2 * k.s, 0, Math.PI * 2); ctx.fill();
  }
  block(ctx, L, { x0: c.x0, x1: c.x1, y0: c.h - 4, y1: c.h, d0: c.d0, d1: BACK }, { side: "#0c0e0f", top: "#262c2e", front: "#16191a" });
  fillPoly(ctx, [Q(c.x0, c.h, c.d0), Q(c.x1, c.h, c.d0), Q(c.x1, c.h - 0.6, c.d0), Q(c.x0, c.h - 0.6, c.d0)], "rgba(200,220,230,0.14)");
  // the sink let into the slate
  const s = L.sinkAt, h = c.h + 0.1;
  fillPoly(ctx, [Q(s.x0, h, c.d0 + 4), Q(s.x1, h, c.d0 + 4), Q(s.x1, h, BACK - 6), Q(s.x0, h, BACK - 6)], "#bdb9ae");
  fillPoly(ctx, [Q(s.x0 + 4, h + 0.1, c.d0 + 8), Q(s.x1 - 4, h + 0.1, c.d0 + 8), Q(s.x1 - 4, h + 0.1, BACK - 10), Q(s.x0 + 4, h + 0.1, BACK - 10)], "#6e6c66");
  // its tap: a brass swan neck from the back
  const tx = (s.x0 + s.x1) / 2;
  at(ctx, L, tx, c.h, BACK - 4, () => {
    ctx.strokeStyle = "#c9a457"; ctx.lineWidth = 1.6; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -16); ctx.bezierCurveTo(0, -26, 9, -26, 9, -16); ctx.stroke();
    ctx.fillStyle = brass(ctx, -5, 5); ctx.fillRect(-5, -8, 10, 1.4);
    ctx.lineCap = "butt";
  });
  // the bottles and the flask on the slate
  for (const v of L.vessels) at(ctx, L, v.x, c.h, v.d, () => vessel(ctx, v, on));
}

// a plain bottle or the flask, small, glass catching the lamp
function vessel(ctx, v, on) {
  soft(ctx, 0, 0, 8, 1.6, "0,0,0", 0.6);
  ctx.beginPath();
  if (v.flask) {
    ctx.arc(0, -6, 6, 0, Math.PI * 2);
    ctx.rect(-1.2, -26, 2.4, 16);
  } else {
    const w = v.cap === 500 ? 4.2 : 3.6, hh = v.cap === 500 ? 19 : 15.5;
    ctx.roundRect(-w, -hh, w * 2, hh, 1);
    ctx.rect(-1.5, -hh - 3, 3, 3.2);
  }
  ctx.fillStyle = "rgba(200,225,235,0.16)"; ctx.fill();
  ctx.strokeStyle = "rgba(225,240,245,0.5)"; ctx.lineWidth = 0.35; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(v.flask ? -4 : -3, v.flask ? -9 : -14, 0.6, v.flask ? 5 : 9);
  if (v.flask) {
    ctx.strokeStyle = "rgba(240,245,245,0.7)"; ctx.lineWidth = 0.3;
    ctx.beginPath(); ctx.moveTo(-1.3, -16); ctx.lineTo(1.3, -16); ctx.stroke();
    ctx.fillStyle = on ? "#5a6eb0" : "#b8303e"; ctx.fillRect(-0.5, -25, 1, 9);
  }
}

// The small wall lamp by the window, a brass bracket and a glass shade.
function paintWallLamp(ctx, L) {
  const l = L.wallLamp, on = L.on.measures;
  at(ctx, L, l.x, l.y, BACK - 1, () => {
    ctx.fillStyle = brass(ctx, -2, 2); ctx.fillRect(-1.2, 0, 2.4, 8);
    ctx.fillStyle = "#4a3818"; ctx.fillRect(-3, 7, 6, 1.6);
    ctx.fillStyle = on ? "rgba(255,226,170,0.85)" : "rgba(180,170,150,0.4)";
    ctx.beginPath(); ctx.moveTo(-5, -1); ctx.lineTo(5, -1); ctx.lineTo(3, -8); ctx.lineTo(-3, -8); ctx.closePath(); ctx.fill();
    if (on) soft(ctx, 0, 2, 20, 18, WARM, 0.45, "lighter");
  });
}

// The desk against the left wall: oak, two drawers; on it the balance —
// plinth, column, the beam leaning still under its last weighing — its box
// of weights open, the four phials, and the green-shaded lamp.
function paintDesk(ctx, L) {
  const { Q } = L, dk = L.desk, h = dk.h, on = L.on.balance;
  footShadow(ctx, L, dk, 0.75);
  const oak = { side: "#2a190d", top: "#3e2614", front: "#1c1109" };
  block(ctx, L, { x0: dk.x0, x1: dk.x1 - 4, y0: 0, y1: h - 4, d0: dk.d0 + 4, d1: dk.d1 - 4 }, oak);
  // its drawers, on the face toward the room
  for (const [d0, d1] of [[dk.d0 + 12, dk.d0 + 60], [dk.d1 - 60, dk.d1 - 12]]) {
    const x = dk.x1 - 4.2;
    fillPoly(ctx, [Q(x, h - 8, d0), Q(x, h - 8, d1), Q(x, h - 22, d1), Q(x, h - 22, d0)], "#3a2414");
    const k = Q(x - 0.5, h - 15, (d0 + d1) / 2);
    ctx.fillStyle = "#8a6c34"; ctx.fillRect(k.x - 1.2 * k.s, k.y - 2 * k.s, 2.4 * k.s, 4 * k.s);
  }
  block(ctx, L, { x0: dk.x0, x1: dk.x1, y0: h - 4, y1: h, d0: dk.d0, d1: dk.d1 }, { side: "#3a2414", top: "#4e3018", front: "#2a190d" });
  // the lamp: brass foot and stem, the green glass shade, lit under
  at(ctx, L, L.deskLamp.x, h, L.deskLamp.d, () => {
    soft(ctx, 0, 0, 10, 2.4, "0,0,0", 0.6);
    ctx.fillStyle = brass(ctx, -6, 6); ctx.beginPath(); ctx.ellipse(0, -1, 6, 1.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-0.8, -26, 1.6, 25);
    ctx.fillStyle = grad(ctx, -11, 0, 11, 0, [[0, "#0c2a16"], [0.45, on ? "#3a9a58" : "#1a4a2a"], [1, "#081a0e"]]);
    ctx.beginPath(); ctx.moveTo(-11, -26); ctx.quadraticCurveTo(0, -34, 11, -26); ctx.lineTo(11, -24); ctx.lineTo(-11, -24); ctx.closePath(); ctx.fill();
    if (on) { ctx.fillStyle = "#fff0c8"; ctx.fillRect(-10, -24.4, 20, 0.8); soft(ctx, 0, -18, 20, 14, WARM, 0.4, "lighter"); }
  });
  // the box of weights, open, the lid up
  at(ctx, L, L.balance.x - 2, h, dk.d0 + 28, () => {
    ctx.fillStyle = "#3a2614"; ctx.fillRect(-9, -11, 18, 7);
    ctx.fillStyle = "#5a1a1e"; ctx.fillRect(-8, -10, 16, 5);
    ctx.fillStyle = "#4a3018"; ctx.fillRect(-9, -4, 18, 4);
    ctx.fillStyle = "#c9a457"; for (const x of [-6, -3, 0, 3, 6]) ctx.fillRect(x - 0.7, -5.8, 1.4, 1.6);
  });
  // the four phials in a row
  for (let i = 0; i < 4; i++) {
    at(ctx, L, L.balance.x + 10 + i * 4, h, dk.d0 + 36, () => {
      const hh = 3 + i % 2 + (i === 3 ? 1.6 : 0);
      ctx.fillStyle = "rgba(200,220,215,0.35)"; ctx.fillRect(-1.2, -hh, 2.4, hh);
      ctx.fillStyle = ["#3a72c0", "#b8bcc2", "#e2c23a", "#ece8de"][i]; ctx.fillRect(-1, -hh * 0.5, 2, hh * 0.5);
      ctx.fillStyle = "#d9cfb2"; ctx.fillRect(-1.1, -hh * 0.8, 2.2, 1);
    });
  }
  // the balance: plinth, column, the beam leaning a little, the pans hung from it
  at(ctx, L, L.balance.x, h, L.balance.d, () => {
    soft(ctx, 0, 0, 18, 2.6, "0,0,0", 0.6);
    ctx.fillStyle = grad(ctx, -14, 0, 14, 0, [[0, "#2a120a"], [0.4, "#5a2a16"], [1, "#200d07"]]);
    ctx.fillRect(-14, -4, 28, 4);
    ctx.fillStyle = "#6a3420"; ctx.fillRect(-15, -4.6, 30, 0.8);
    ctx.fillStyle = brass(ctx, -1.2, 1.2); ctx.fillRect(-0.8, -36, 1.6, 31);
    const lean = on ? -0.12 : 0;
    ctx.save(); ctx.translate(0, -36); ctx.rotate(lean);
    ctx.fillStyle = brass(ctx, -17, 17); ctx.fillRect(-17, -0.7, 34, 1.4);
    ctx.fillStyle = "#c9a457"; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    for (const s of [-1, 1]) {
      const hx = s * 17 * Math.cos(lean), hy = -36 + s * 17 * Math.sin(lean), py = hy + 16;
      ctx.strokeStyle = "rgba(160,120,50,0.7)"; ctx.lineWidth = 0.25;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - 5.5, py); ctx.moveTo(hx, hy); ctx.lineTo(hx + 5.5, py); ctx.stroke();
      ctx.fillStyle = brass(ctx, hx - 6, hx + 6);
      ctx.beginPath(); ctx.ellipse(hx, py, 6, 1.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx - 6, py); ctx.quadraticCurveTo(hx, py + 3.5, hx + 6, py); ctx.fill();
    }
    // a phial on the left pan, from the weighing he never finished
    if (on) {
      const hx = -17 * Math.cos(lean), py = -36 - 17 * Math.sin(lean) + 16;
      ctx.fillStyle = "rgba(200,220,215,0.4)"; ctx.fillRect(hx - 1.2, py - 4.6, 2.4, 4.4);
      ctx.fillStyle = "#3a72c0"; ctx.fillRect(hx - 1, py - 2.2, 2, 2);
    }
  });
}
