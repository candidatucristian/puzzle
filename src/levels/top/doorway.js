import { polygon, soft, lcg } from "../../shared/paint.js";

/** The way into the passage off the top floor: not a door but the passage
 *  itself, opening straight out of the rotunda's wall — no frame, no door
 *  ever hung in it. Its walls run back from the opening, the room's paper
 *  carried on along them and its parquet along the floor, and a little of
 *  the candlelight goes in with them; then the dark takes them. Its end is
 *  not to be seen.
 *
 *  Measured in centimetres on the wall (`L.passage.project`: across the
 *  opening from its middle, up from the floor, and in, along the passage). */

const fill = (g, pts, style) => { polygon(g, pts); g.fillStyle = style; g.fill(); };
// how far in anything at all is painted; the dark has it long before that
const DEEP = 420;

/** The opening's outline on the screen. */
function opening(g, p) {
  polygon(g, [p.project(-p.half, 0), p.project(-p.half, p.tall), p.project(p.half, p.tall), p.project(p.half, 0)]);
}

/** The passage going in from the room, into the room's picture. */
export function paintPassage(g, L) {
  const p = L.passage, P = p.project;
  const rnd = lcg(4040);
  // how a surface fades into the passage: lit at the mouth, black in a few metres
  const fade = (near, far, colour, reach = 0.55) => {
    const s = g.createLinearGradient(near.x, near.y, far.x, far.y);
    s.addColorStop(0, colour);
    s.addColorStop(reach, "rgba(2,2,3,1)");
    s.addColorStop(1, "rgba(2,2,3,1)");
    return s;
  };
  opening(g, p); g.fillStyle = "#020203"; g.fill();
  g.save(); opening(g, p); g.clip();
  // the floor: the rotunda's parquet carried on in, its boards running away
  fill(g, [P(-p.half, 0, 0), P(p.half, 0, 0), P(p.half, 0, DEEP), P(-p.half, 0, DEEP)], fade(P(0, 0, 0), P(0, 0, DEEP * 0.6), "#4c3622", 0.8));
  for (let i = 1; i < 6; i++) {
    const x = -p.half + (2 * p.half * i) / 6, a = P(x, 0, 0), b = P(x, 0, DEEP * 0.5);
    const s = g.createLinearGradient(a.x, a.y, b.x, b.y);
    s.addColorStop(0, "rgba(0,0,0,0.6)"); s.addColorStop(1, "rgba(0,0,0,0)");
    g.strokeStyle = s; g.lineWidth = Math.max(0.6, a.s * 0.8);
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  }
  // its two walls: the room's drab striped paper, the far one in the candle's
  // light a little way in, the near one hardly at all; a dado along the foot
  for (const side of [-1, 1]) {
    const x = side * p.half, lit = side < 0 ? "#5c4c3c" : "#30281f";
    fill(g, [P(x, 0, 0), P(x, 0, DEEP), P(x, p.tall, DEEP), P(x, p.tall, 0)], fade(P(x, p.tall * 0.5, 0), P(x, p.tall * 0.5, DEEP * 0.55), lit, side < 0 ? 0.85 : 0.65));
    for (let z = 8; z < DEEP * 0.45; z += 11) {
      const a = P(x, 96, z), b = P(x, p.tall, z), k = 1 - z / (DEEP * 0.45);
      g.strokeStyle = `rgba(255,226,180,${(0.04 * k).toFixed(3)})`; g.lineWidth = Math.max(0.5, a.s * 3);
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    }
    fill(g, [P(x, 0, 0), P(x, 0, DEEP * 0.5), P(x, 96, DEEP * 0.5), P(x, 96, 0)], fade(P(x, 48, 0), P(x, 48, DEEP * 0.5), side < 0 ? "#2a1a10" : "#140c07", 0.8));
    // the paper coming away, a sheet of it hanging, just in the light
    if (side < 0) {
      const z = 40 + rnd() * 30;
      fill(g, [P(x, 190, z), P(x, 196, z + 26), P(x, 150, z + 22), P(x, 158, z + 4)], "rgba(70,60,48,0.55)");
    }
  }
  // the ceiling, black
  fill(g, [P(-p.half, p.tall, 0), P(p.half, p.tall, 0), P(p.half, p.tall, DEEP), P(-p.half, p.tall, DEEP)], "#030303");
  // the dark, closing in from the middle of it
  const mid = P(0, p.tall * 0.45, DEEP * 0.4);
  soft(g, mid.x, mid.y, p.box.width * 0.42, p.box.height * 0.42, "0,0,0", 0.85);
  // the candle's light on the edge of the opening, and the dark along its head
  const head = g.createLinearGradient(0, P(0, p.tall).y, 0, P(0, p.tall * 0.6).y);
  head.addColorStop(0, "rgba(0,0,0,0.7)"); head.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = head; g.fillRect(p.box.x, p.box.y, p.box.width, p.box.height);
  g.restore();
  // the corners of the wall where the opening is cut through it: no frame,
  // only the paper turning the corner, its edge a little worn
  for (const side of [-1, 1]) {
    const a = P(side * p.half, 0), b = P(side * p.half, p.tall);
    g.strokeStyle = side < 0 ? "rgba(255,214,170,0.1)" : "rgba(0,0,0,0.5)";
    g.lineWidth = Math.max(1, a.s * 2.4);
    g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  }
  const t0 = P(-p.half, p.tall), t1 = P(p.half, p.tall);
  g.strokeStyle = "rgba(0,0,0,0.45)"; g.lineWidth = Math.max(1, t0.s * 3);
  g.beginPath(); g.moveTo(t0.x, t0.y); g.lineTo(t1.x, t1.y); g.stroke();
}
