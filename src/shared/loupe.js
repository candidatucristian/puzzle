import { soft, makeCanvas } from "./paint.js";

/** The magnifying glass of the chemistry bench, held: a brass-rimmed lens of
 *  radius `r` and its turned wooden handle, on a sheet 5r across with the
 *  lens in the middle. Shared by the bench and the house's own glass. */
export function paintLens(r) {
  const R = 2;
  const half = r * 2.5;
  const c = makeCanvas(half * 2 * R, half * 2 * R);
  const g = c.getContext("2d");
  g.scale(R, R);
  g.translate(half, half);
  // the handle
  g.save();
  g.rotate(0.72);
  soft(g, r * 1.7, r * 0.08, r * 0.75, r * 0.2, "0,0,0", 0.4);
  const wood = g.createLinearGradient(0, -r * 0.13, 0, r * 0.13);
  wood.addColorStop(0, "#7a4428");
  wood.addColorStop(0.35, "#42200f");
  wood.addColorStop(1, "#160904");
  g.fillStyle = wood;
  g.beginPath();
  g.moveTo(r * 1.26, -r * 0.085);
  g.bezierCurveTo(r * 1.6, -r * 0.15, r * 2.05, -r * 0.14, r * 2.26, -r * 0.1);
  g.quadraticCurveTo(r * 2.36, 0, r * 2.26, r * 0.1);
  g.bezierCurveTo(r * 2.05, r * 0.14, r * 1.6, r * 0.15, r * 1.26, r * 0.085);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(255,205,160,0.35)";
  g.lineWidth = r * 0.02;
  g.beginPath();
  g.moveTo(r * 1.32, -r * 0.055);
  g.quadraticCurveTo(r * 1.8, -r * 0.1, r * 2.2, -r * 0.065);
  g.stroke();
  const ferrule = g.createLinearGradient(0, -r * 0.1, 0, r * 0.1);
  ferrule.addColorStop(0, "#f8e2a2");
  ferrule.addColorStop(0.5, "#b88a34");
  ferrule.addColorStop(1, "#5a3c0c");
  g.fillStyle = ferrule;
  g.fillRect(r * 1.02, -r * 0.065, r * 0.26, r * 0.13);
  g.fillRect(r * 1.24, -r * 0.1, r * 0.06, r * 0.2);
  g.restore();
  // the lens: the glass's own faint colour, darker at its edge, a soft
  // reflection of the lamp across the top
  const tint = g.createRadialGradient(0, 0, r * 0.55, 0, 0, r);
  tint.addColorStop(0, "rgba(200,230,235,0.02)");
  tint.addColorStop(0.8, "rgba(120,170,180,0.08)");
  tint.addColorStop(1, "rgba(10,30,36,0.5)");
  g.fillStyle = tint;
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(255,250,235,0.3)";
  g.lineWidth = r * 0.05;
  g.lineCap = "round";
  g.beginPath();
  g.arc(0, 0, r * 0.84, Math.PI * 1.1, Math.PI * 1.42);
  g.stroke();
  g.strokeStyle = "rgba(255,250,235,0.14)";
  g.lineWidth = r * 0.025;
  g.beginPath();
  g.arc(0, 0, r * 0.84, Math.PI * 0.14, Math.PI * 0.3);
  g.stroke();
  g.lineCap = "butt";
  // the ring
  const ring = (radius, width, colour) => {
    g.strokeStyle = colour;
    g.lineWidth = width;
    g.beginPath();
    g.arc(0, 0, radius, 0, Math.PI * 2);
    g.stroke();
  };
  ring(r * 1.05, r * 0.16, "rgba(0,0,0,0.35)");
  const brass = g.createLinearGradient(-r, -r, r, r);
  brass.addColorStop(0, "#fbe9b0");
  brass.addColorStop(0.3, "#c89a40");
  brass.addColorStop(0.6, "#7a5416");
  brass.addColorStop(1, "#c8a04c");
  ring(r * 1.04, r * 0.11, brass);
  ring(r * 1.09, r * 0.014, "rgba(40,24,4,0.8)");
  ring(r * 0.99, r * 0.014, "rgba(40,24,4,0.7)");
  ring(r * 1.04, r * 0.02, "rgba(255,246,210,0.45)");
  return c;
}
