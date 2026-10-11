import { makeCanvas } from "./paint.js";

/** The picture of a key of the house, for wherever one is shown: coming up
 *  out of its chest in a room, and afterwards in the index, kept. */

// The key the chest gives up: a small old key of gilt brass — a trefoil bow,
// a collar, a long shank, two wards cut in its bit — standing on its bit.
export function paintKey() {
  const cv = makeCanvas(96, 220);
  const g = cv.getContext("2d");
  const body = g.createLinearGradient(20, 0, 76, 0);
  body.addColorStop(0, "#7a5410");
  body.addColorStop(0.4, "#f4d67c");
  body.addColorStop(0.6, "#fff4c0");
  body.addColorStop(1, "#8a6014");
  g.strokeStyle = body;
  g.fillStyle = body;
  g.lineWidth = 9;
  // the bow: three rings
  for (const [x, y] of [[48, 28], [29, 54], [67, 54]]) { g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.stroke(); }
  g.beginPath(); g.arc(48, 48, 7, 0, Math.PI * 2); g.fill();
  // the collar and the shank
  g.fillRect(38, 74, 20, 9);
  g.fillRect(43, 80, 10, 112);
  g.fillRect(40, 96, 16, 5);
  // the bit, its wards
  g.fillRect(53, 160, 24, 9);
  g.fillRect(53, 178, 24, 14);
  g.fillRect(68, 166, 9, 14);
  g.fillRect(41, 190, 14, 8);
  // its edges, where the light leaves it
  g.globalCompositeOperation = "source-atop";
  const edge = g.createLinearGradient(0, 0, 0, 220);
  edge.addColorStop(0, "rgba(255,255,230,0.25)");
  edge.addColorStop(1, "rgba(60,36,4,0.45)");
  g.fillStyle = edge;
  g.fillRect(0, 0, 96, 220);
  return cv;
}
