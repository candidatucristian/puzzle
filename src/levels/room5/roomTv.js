import { soft, makeCanvas, lcg } from "../../shared/paint.js";
import { fillPoly, thingAt, onWall } from "../house/roomKit.js";

/** The television in the drawing room: a flat one, hung on the right-hand
 *  wall, so that from the door it is seen along its length — a wide black
 *  panel with a narrow edge, a small red lamp at its corner, its lead going
 *  down the wall. It has been left on with nothing to show: the glass is
 *  full of snow, and its cold light is the set's own, there until its puzzle
 *  is solved — after which the glass is dark.
 *
 *  Measured as the room is (house/roomKit.js). The snow itself is the
 *  scene's: here the glass is painted as it is with the set off, or with a
 *  still of the snow for the scene to lay the moving snow over. */

const R = 6; // how finely its face is painted: pixels to a centimetre
const EDGE = 1.6; // the frame round the glass, in centimetres

/** Put the set into a room's layout: where it is, what it opens, its light. */
export function layoutRoomTv(L, on) {
  const { Q, half: hx } = L;
  // along the wall from d0 (our end) to d1, and from y0 up to y1
  const t = (L.tv = { d0: 404, d1: 552, y0: 100, y1: 183, on });
  const corner = (d, y) => Q(hx, y, d);
  L.things.push(thingAt("rally", "Watch the television", [corner(t.d1, t.y1), corner(t.d0, t.y1), corner(t.d0, t.y0), corner(t.d1, t.y0)]));
  // where the glass is on the screen, for the scene's snow: far top, near top, near foot, far foot
  const quad = [corner(t.d1 - EDGE, t.y1 - EDGE), corner(t.d0 + EDGE, t.y1 - EDGE), corner(t.d0 + EDGE, t.y0 + EDGE), corner(t.d1 - EDGE, t.y0 + EDGE)];
  const xs = quad.map((p) => p.x), ys = quad.map((p) => p.y);
  t.glass = { quad, box: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }, grain: 0.42 * quad[0].s };
  const mid = corner((t.d0 + t.d1) / 2, (t.y0 + t.y1) / 2);
  t.glow = { x: mid.x - 30 * mid.s, y: mid.y, r: 130 * mid.s, tint: 0xa8c4ff };
  L.detailLights.push({ x: mid.x - 40 * mid.s, y: mid.y + 30 * mid.s, rx: 230 * mid.s, ry: 190 * mid.s, k: on ? 0.9 : 0.28 });
}

/** A square of television snow, for the scene to keep moving over the glass. */
export function paintSnow() {
  const n = 256;
  const c = makeCanvas(n, n);
  const g = c.getContext("2d");
  const img = g.createImageData(n, n);
  const rnd = lcg(1953);
  for (let i = 0; i < n * n; i++) {
    const v = Math.round(18 + Math.pow(rnd(), 1.6) * 230);
    img.data[i * 4] = v * 0.94; img.data[i * 4 + 1] = v * 0.97; img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

export function paintRoomTv(ctx, L) {
  const { Q, half: hx } = L;
  const t = L.tv, { d0, d1, y0, y1 } = t;
  // its lead, down the wall to the skirting
  const top = Q(hx, y0, (d0 + d1) / 2), foot = Q(hx, 12, (d0 + d1) / 2);
  ctx.strokeStyle = "#060606";
  ctx.lineWidth = Math.max(1, 1.1 * top.s);
  ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(foot.x, foot.y); ctx.stroke();
  // its shadow on the wall: it stands a hand's breadth off it
  fillPoly(ctx, [Q(hx, y1 - 3, d1 + 5), Q(hx, y1 - 3, d0 + 4), Q(hx, y0 - 6, d0 + 4), Q(hx, y0 - 6, d1 + 5)], "rgba(0,0,0,0.55)");
  onWall(ctx, L, 1, { d0, d1, y0, y1 }, paintFace(t.on, (d1 - d0) * R, (y1 - y0) * R));
  // the edge of it that is toward us
  fillPoly(ctx, [Q(hx, y1, d0), Q(hx - 4, y1, d0), Q(hx - 4, y0, d0), Q(hx, y0, d0)], "#1a1b1e");
  const e0 = Q(hx - 4, y1, d0), e1 = Q(hx - 4, y0, d0);
  ctx.strokeStyle = t.on ? "rgba(170,196,255,0.4)" : "rgba(170,186,220,0.16)";
  ctx.lineWidth = Math.max(0.8, 0.5 * e0.s);
  ctx.beginPath(); ctx.moveTo(e0.x, e0.y); ctx.lineTo(e1.x, e1.y); ctx.stroke();
  if (!t.on) return;
  // its light across the room: on the boards under it, and out toward the middle
  const f = Q(hx - 70, 0, (d0 + d1) / 2);
  soft(ctx, f.x, f.y, 150 * f.s, 30 * f.s, "160,186,240", 0.13, "lighter");
  soft(ctx, t.glow.x, t.glow.y, t.glow.r * 1.2, t.glow.r, "160,186,240", 0.1, "lighter");
}

// Its face, flat, w by h: a narrow black frame, the glass — snow, or dark
// with the window in it — and a small red lamp in the lower corner.
function paintFace(on, w, h) {
  const c = makeCanvas(w, h);
  const g = c.getContext("2d");
  const rnd = lcg(5301);
  const e = EDGE * R;
  g.fillStyle = "#0b0b0d";
  g.beginPath(); g.roundRect(0, 0, w, h, R * 1.2); g.fill();
  g.fillStyle = "rgba(255,255,255,0.1)";
  g.fillRect(R, 0, w - R * 2, 1.4);
  if (on) {
    // a still of the snow, for under the moving one
    for (let y = e; y < h - e; y += 3) {
      for (let x = e; x < w - e; x += 3) {
        const v = Math.round(18 + Math.pow(rnd(), 1.6) * 230);
        g.fillStyle = `rgb(${Math.round(v * 0.94)},${Math.round(v * 0.97)},${v})`;
        g.fillRect(x, y, 3, 3);
      }
    }
  } else {
    const off = g.createLinearGradient(0, 0, w, h);
    off.addColorStop(0, "#15181c");
    off.addColorStop(1, "#050607");
    g.fillStyle = off;
    g.fillRect(e, e, w - e * 2, h - e * 2);
    // the window across the room, in the glass
    soft(g, w * 0.3, h * 0.36, w * 0.09, h * 0.3, "150,178,232", 0.22, "lighter");
  }
  g.fillStyle = on ? "#3a0c0a" : "#c0281c";
  g.beginPath(); g.arc(w - e * 2.4, h - e * 0.5, R * 0.36, 0, Math.PI * 2); g.fill();
  return c;
}
