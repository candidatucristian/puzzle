import { soft, grain, vignette, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";
import { PAGES } from "./puzzle.js";

/** Ivy's herbarium, open on the console table under the window in Room VI:
 *  a photographed cloth-bound specimen album, its pages heavy and aged.
 *  On each page two large pressed botanical specimens,
 *  flat and faded, each held down by narrow
 *  strips of gummed paper, its Latin name under it in her hand; and on each
 *  page one of them drawn round in pencil with a figure of straight sides.
 *
 *  Painted once per screen size: the table with the book's binding on it;
 *  each page apart, to be turned (shared/pageFlip.js turns them); the shading
 *  where the pages curve into the spine. Whole-page photographs retain fine leaf veins,
 *  petal wrinkles, mounting strips and their natural contact shadows. */

export const BOOK = { desk: "hb_desk", light: "hb_light", flip: "hb_flip" };
export const FACES = PAGES.length + 1; // five pages of plants, and the last, inside the back cover
const R = 2; // the pages are painted at twice their size, for crisp lines
const HAND = '"Cormorant Garamond", Georgia, "Times New Roman", serif'; // her hand: an old book's italic

// The photographed album's own measure, in its pixels (1536 x 1024): the
// spine, where the leaves are sewn; how far a leaf can reach from it, and how
// tall; and on each side the top sheet itself — left, top, right, bottom —
// just inside its deckled edge, clear of the pages under it.
const ALBUM = {
  spine: 767, top: 62, leaf: 668, height: 866,
  sheet: [[127, 68, 760, 927], [774, 64, 1433, 925]],
};

// The book as it lies once it has been brought `near` times nearer than it
// is first seen — as far as the screen still holds all of it. `zoom` is how
// much nearer that came to; `view`, the table as far as it is seen before.
export function layoutBook(W, H, near = 1) {
  const u = Math.min(W / 1000, H / 650);
  const first = Math.min(W * 0.82, H * 1.34);
  const bw = Math.max(first, Math.min(first * near, W, H * 1.5)), bh = bw / 1.5;
  const zoom = bw / first;
  const cx = W / 2, cy = Math.min(Math.max(H * 0.52, bh / 2), H - bh / 2);
  const k = bw / 1536; // screen pixels to the photograph's
  const pw = ALBUM.leaf * k, ph = ALBUM.height * k;
  return {
    W, H, u, cx, cy, zoom,
    view: { x: (W - W * zoom) / 2, y: (H - H * zoom) / 2, w: W * zoom, h: H * zoom },
    book: { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh },
    pw, ph, top: cy - bh / 2 + ALBUM.top * k, spine: cx - bw / 2 + ALBUM.spine * k,
  };
}

// the table is a texture; the pages and the spine's shading are canvases,
// handed to the page turner, which draws them
export function paintBook(textures, L, photography) {
  const { book: photo, desk, pages } = photography;
  addCanvasTexture(textures, BOOK.desk, paintDesk(L, photo, desk));
  addCanvasTexture(textures, BOOK.light, paintLight(L));
  return {
    shade: paintShade(L),
    faces: Array.from({ length: FACES }, (_, i) => paintPage(L, i, photo, pages)),
  };
}

export function releaseBook(textures) {
  for (const key of Object.values(BOOK)) if (textures.exists(key)) textures.remove(key);
}

// ── the table, the binding, the shading ─────────────────────────────────────

// (painted as far as the table is seen while the book is still further off,
// in the screen's own coordinates)
function paintDesk(L, photo, desk) {
  const { W, H, u, book: b, view: v } = L;
  const c = makeCanvas(Math.ceil(v.w), Math.ceil(v.h)), g = c.getContext("2d");
  g.translate(-v.x, -v.y);
  if (desk) {
    g.filter = "brightness(.68) saturate(.78)";
    g.drawImage(desk, v.x, v.y, v.w, v.h); g.filter = "none";
  } else {
    const wood = g.createLinearGradient(0, v.y, 0, v.y + v.h);
    wood.addColorStop(0, "#1c130b"); wood.addColorStop(1, "#0b0704");
    g.fillStyle = wood; g.fillRect(v.x, v.y, v.w, v.h);
    const rnd = lcg(907);
    for (let i = 0; i < 90; i++) {
      const y = v.y + rnd() * v.h, x0 = v.x, x1 = v.x + v.w;
      g.strokeStyle = `rgba(${rnd() < 0.5 ? "0,0,0" : "120,80,45"},${(0.05 + rnd() * 0.08).toFixed(2)})`;
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(x0, y); g.bezierCurveTo(x0 + v.w * 0.3, y + (rnd() - 0.5) * 8 * u, x0 + v.w * 0.7, y + (rnd() - 0.5) * 8 * u, x1, y + (rnd() - 0.5) * 6 * u); g.stroke();
    }
  }
  // the moon from the window behind, and the warm of the room's lamp
  soft(g, W * 0.5, -H * 0.1, W * 0.7, H * 0.5, "150,178,232", 0.1, "lighter");
  soft(g, W * 0.25, H * 0.3, W * 0.6, H * 0.7, "255,190,110", 0.18, "lighter");
  soft(g, L.cx + 10 * u, L.cy + 16 * u, b.w * 0.56, b.h * 0.58, "0,0,0", 0.75);
  g.imageSmoothingQuality = "high";
  g.filter = "brightness(.83) saturate(.84)";
  g.drawImage(photo, b.x, b.y, b.w, b.h); g.filter = "none";
  // a loose petal or two, fallen out of it onto the table
  for (const [x, y, a, col] of desk ? [] : [[b.x - 30 * u, b.y + b.h * 0.7, 0.6, "201,138,138"], [b.x + b.w + 24 * u, b.y + b.h * 0.3, -0.4, "226,212,138"]]) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = `rgba(${col},0.75)`; g.beginPath(); g.ellipse(0, 0, 9 * u, 5 * u, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  return c;
}

// the falling-off of the light toward the edges, and the grain of the
// picture, laid over everything — the pages, and a leaf as it turns, as much
// as the desk — so nothing lifted from the book is lit apart from it
function paintLight(L) {
  const c = makeCanvas(Math.ceil(L.view.w), Math.ceil(L.view.h)), g = c.getContext("2d");
  vignette(g, c.width, c.height, 0.48, "source-over");
  grain(g, c.width, c.height, 0.012);
  return c;
}

function paintShade(L) {
  const w = Math.round(L.pw * 2), h = Math.round(L.ph);
  const c = makeCanvas(w, h), g = c.getContext("2d");
  const s = g.createLinearGradient(0, 0, w, 0);
  s.addColorStop(0, "rgba(0,0,0,0.22)"); s.addColorStop(0.08, "rgba(0,0,0,0)");
  s.addColorStop(0.36, "rgba(255,250,235,0.05)"); s.addColorStop(0.46, "rgba(0,0,0,0.12)");
  s.addColorStop(0.5, "rgba(0,0,0,0.42)"); s.addColorStop(0.54, "rgba(0,0,0,0.12)");
  s.addColorStop(0.64, "rgba(255,250,235,0.05)"); s.addColorStop(0.92, "rgba(0,0,0,0)");
  s.addColorStop(1, "rgba(0,0,0,0.25)");
  g.fillStyle = s; g.fillRect(0, 0, w, h);
  // on the two top sheets only, not the edges of the pages under them
  const k = w / (ALBUM.leaf * 2), x0 = ALBUM.spine - ALBUM.leaf;
  g.globalCompositeOperation = "destination-in";
  g.beginPath();
  ALBUM.sheet.forEach(([sx0, sy0, sx1, sy1], right) => {
    const r = (sx1 - sx0) * 0.022 * k;
    g.roundRect((sx0 - x0) * k, (sy0 - ALBUM.top) * k, (sx1 - sx0) * k, (sy1 - sy0) * k, right ? [0, r, r, 0] : [r, 0, 0, r]);
  });
  g.fillStyle = "#000"; g.fill();
  return c;
}

// ── a page ─────────────────────────────────────────────────────────────────

// A leaf as it is turned: the whole reach of a leaf from the spine, out of
// the photograph, cut to the top sheet's own shape — so a leaf lifted is one
// sheet, and the edges of the pages under it stay where they are.
function paintPage(L, index, photo, pages) {
  const pw = Math.round(L.pw * R), ph = Math.round(L.ph * R);
  const c = makeCanvas(pw, ph), g = c.getContext("2d");
  const right = index % 2 === 1;
  const k = pw / ALBUM.leaf, x0 = right ? ALBUM.spine : ALBUM.spine - ALBUM.leaf;
  g.imageSmoothingQuality = "high";
  g.filter = "brightness(.83) saturate(.84)";
  g.drawImage(photo, x0, ALBUM.top, ALBUM.leaf, ALBUM.height, 0, 0, pw, ph);
  g.filter = "none";
  const [sx0, sy0, sx1, sy1] = ALBUM.sheet[right ? 1 : 0];
  const S = { x: (sx0 - x0) * k, y: (sy0 - ALBUM.top) * k, w: (sx1 - sx0) * k, h: (sy1 - sy0) * k };
  const specimens = PAGES[index], photograph = pages[index];
  if (specimens && photograph) {
    g.save();
    g.filter = "brightness(.83) saturate(.8)";
    g.drawImage(photograph, S.x, S.y, S.w, S.h);
    g.restore();
    const size = Math.round(S.h * .031);
    drawFigure(g, S, specimens[0].sides, lcg(77 + index * 13));
    g.fillStyle = "rgba(45,32,22,.9)"; g.textAlign = "center"; g.textBaseline = "alphabetic";
    g.font = `italic 500 ${size}px ${HAND}`;
    g.fillText(specimens[0].name, S.x + S.w * .5, S.y + S.h * .598, S.w * .85);
    g.font = `italic 500 ${Math.round(size * .88)}px ${HAND}`;
    g.fillText(specimens[1].name, S.x + S.w * .5, S.y + S.h * .942, S.w * .8);
    g.font = `italic 500 ${Math.round(S.h * .03)}px ${HAND}`;
    g.fillStyle = "rgba(48,35,24,.6)"; g.textAlign = right ? "right" : "left";
    g.fillText(["I", "II", "III", "IV", "V"][index], S.x + S.w * (right ? .92 : .08), S.y + S.h * .975);
  } else {
    g.font = `italic 500 ${Math.round(S.h * .03)}px ${HAND}`;
    g.fillStyle = "rgba(48,35,24,.55)"; g.textAlign = "right";
    g.fillText("I. Ashcombe · Ashcombe House, 1958", S.x + S.w * .9, S.y + S.h * .92);
  }
  cutToSheet(g, S, right, lcg(5 + index));
  return c;
}

// Everything outside the sheet cleared: its outer corners rounded with use,
// its three free edges a little uneven, as rag paper is; the edge along the
// spine, where it is sewn, straight.
function cutToSheet(g, S, right, rnd) {
  const r = S.w * 0.022, step = R * 5, w = S.w, y0 = S.y, y1 = S.y + S.h;
  const j = () => (rnd() - 0.5) * R * 0.9;
  const pts = []; // measured from the spine's side outward
  for (let x = 0; x < w - r; x += step) pts.push([x, y0 + (x > step ? j() : 0)]);
  for (let a = -Math.PI / 2; a < 0; a += 0.25) pts.push([w - r + Math.cos(a) * r, y0 + r + Math.sin(a) * r]);
  for (let y = y0 + r; y < y1 - r; y += step) pts.push([w + j(), y]);
  for (let a = 0; a < Math.PI / 2; a += 0.25) pts.push([w - r + Math.cos(a) * r, y1 - r + Math.sin(a) * r]);
  for (let x = w - r; x > step; x -= step) pts.push([x, y1 + j()]);
  pts.push([0, y1]);
  const X = (x) => (right ? S.x + x : S.x + S.w - x);
  g.save();
  g.globalCompositeOperation = "destination-in";
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), y) : g.moveTo(X(x), y)));
  g.closePath();
  g.fillStyle = "#000"; g.fill();
  g.restore();
}

// Broad pencil polygons follow the mounting area. Their corners stay on
// bare paper, outside the actual leaves, so every side can be counted.
const FIGURES = {
  4: [[.045, .025], [.955, .025], [.955, .615], [.045, .615]],
  5: [[.045, .025], [.81, .025], [.955, .13], [.955, .615], [.045, .615]],
  7: [[.16, .025], [.84, .025], [.955, .1], [.955, .55], [.84, .615], [.045, .615], [.045, .1]],
  8: [[.13, .025], [.87, .025], [.955, .09], [.955, .55], [.87, .615], [.13, .615], [.045, .55], [.045, .09]],
};

function drawFigure(g, S, sides, rnd) {
  const pts = FIGURES[sides].map(([x, y]) => ({ x: S.x + S.w * x, y: S.y + S.h * y }));
  g.save(); g.lineCap = "round";
  for (const [width, colour] of [[R * 1.3, "rgba(72,66,57,.24)"], [R * .65, "rgba(60,55,48,.67)"]]) {
    g.strokeStyle = colour; g.lineWidth = width;
    for (let i = 0; i < sides; i++) {
      const a = pts[i], b = pts[(i + 1) % sides], dx = b.x - a.x, dy = b.y - a.y;
      g.beginPath();
      g.moveTo(a.x - dx * .009 + (rnd() - .5) * R, a.y - dy * .009 + (rnd() - .5) * R);
      g.lineTo(b.x + dx * .009 + (rnd() - .5) * R, b.y + dy * .009 + (rnd() - .5) * R);
      g.stroke();
    }
  }
  g.restore();
}
