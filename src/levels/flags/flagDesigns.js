import { lcg } from "../../shared/paint.js";

/** The five flags of FLAGS — the national flags the puzzle is read from —
 *  their colours and how each is drawn, flat, in a w × h box. The trophy
 *  wall (trophies.js) and the string of them in Room 6 both paint from here,
 *  so a flag is always the same flag. */

// the hanging order: the countries' two-letter codes spell the answer
export const FLAG_CODES = ["DE", "BR", "IE", "FI", "NG"];

export const C = {
  black: "#1b1b1f",
  red: "#dd1c17",
  gold: "#ffcd1c",
  brGreen: "#0a9a44",
  brYellow: "#fedb1e",
  brBlue: "#10307e",
  ieGreen: "#169b62",
  orange: "#ff8a3d",
  white: "#fbfbf8",
  fiBlue: "#0a3a8c",
  ngGreen: "#088a4f",
};

// one flag's design, flat, in a w × h box
export function paintDesign(g, code, w, h) {
  const band = (col, x, y, bw, bh) => {
    g.fillStyle = col;
    g.fillRect(x, y, bw, bh);
  };
  switch (code) {
    case "DE":
      band(C.black, 0, 0, w, h / 3 + 0.5);
      band(C.red, 0, h / 3, w, h / 3 + 0.5);
      band(C.gold, 0, (2 * h) / 3, w, h / 3);
      break;
    case "BR": {
      band(C.brGreen, 0, 0, w, h);
      g.fillStyle = C.brYellow;
      g.beginPath();
      g.moveTo(w / 2, h * 0.1);
      g.lineTo(w * 0.915, h / 2);
      g.lineTo(w / 2, h * 0.9);
      g.lineTo(w * 0.085, h / 2);
      g.closePath();
      g.fill();
      const r = h * 0.25;
      g.fillStyle = C.brBlue;
      g.beginPath();
      g.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      g.fill();
      g.save();
      g.beginPath();
      g.arc(w / 2, h / 2, r, 0, Math.PI * 2);
      g.clip();
      g.strokeStyle = C.white;
      g.lineWidth = r * 0.2;
      g.beginPath();
      g.arc(
        w / 2 - r * 0.25,
        h / 2 + r * 1.9,
        r * 2.05,
        -Math.PI * 0.72,
        -Math.PI * 0.2,
      );
      g.stroke();
      g.fillStyle = C.white;
      const rnd = lcg(1889);
      for (let i = 0; i < 14; i++) {
        const a = rnd() * Math.PI * 2;
        const d = Math.sqrt(rnd()) * r * 0.85;
        const x = w / 2 + Math.cos(a) * d;
        const y = h / 2 + Math.sin(a) * d;
        if (y < h / 2 - r * 0.05 && rnd() < 0.7) continue;
        g.beginPath();
        g.arc(x, y, Math.max(0.6, r * 0.045), 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
      break;
    }
    case "IE":
      band(C.ieGreen, 0, 0, w / 3 + 0.5, h);
      band(C.white, w / 3, 0, w / 3 + 0.5, h);
      band(C.orange, (2 * w) / 3, 0, w / 3, h);
      break;
    case "FI": {
      band(C.white, 0, 0, w, h);
      g.fillStyle = C.fiBlue;
      const u = w / 18;
      g.fillRect(5 * u, 0, 3 * u, h);
      g.fillRect(0, (4 / 11) * h, w, (3 / 11) * h);
      break;
    }
    case "NG":
      band(C.ngGreen, 0, 0, w / 3 + 0.5, h);
      band(C.white, w / 3, 0, w / 3 + 0.5, h);
      band(C.ngGreen, (2 * w) / 3, 0, w / 3, h);
      break;
    default:
      band(C.white, 0, 0, w, h);
  }
}
