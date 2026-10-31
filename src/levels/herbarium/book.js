import { grain, vignette, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";
import { PAGES } from "./puzzle.js";
import DESK from "./herbariumDesk.json";

/** Ivy's herbarium, open on the walnut console table under the window in
 *  Room VI: a cloth-bound album of pressed plants, its pages heavy and aged.
 *  On each page two pressed specimens, flat and faded, each held down by
 *  narrow strips of gummed paper, its Latin name under it in her hand; and on
 *  each page one of them drawn round in pencil with a figure of straight
 *  sides.
 *
 *  The table and the album, and each page with its plants on its own sheet,
 *  are Blender renders (art/blender/herbarium_desk.py, herbarium_plants.py):
 *  the plants built flat as pressed ones are, their veins, their petals thin
 *  to the light, the strips across their stems. Her hand and her pencil are
 *  drawn over them here. Painted once per screen size: the table with the
 *  book on it; each page apart, to be turned (shared/pageFlip.js turns them);
 *  the shading where the pages curve into the spine. */

export const BOOK = { desk: "hb_desk", light: "hb_light", flip: "hb_flip" };
// the renders: the table with the album on it, and each page's sheet
export const HERBARIUM_RENDERS = {
  desk: { key: `hb_desk_render_v${DESK.version}`, url: `assets/images/Herbarium/desk-v${DESK.version}.webp` },
  sheets: PAGES.map((_, i) => ({ key: `hb_sheet_${i + 1}_v${DESK.version}`, url: `assets/images/Herbarium/sheet-${i + 1}-v${DESK.version}.webp` })),
};
export function loadHerbarium(scene) {
  for (const { key, url } of [HERBARIUM_RENDERS.desk, ...HERBARIUM_RENDERS.sheets]) if (!scene.textures.exists(key)) scene.load.image(key, url);
}
/** The renders, as images: the table, the book's own picture cut out of it,
 *  and the five sheets. */
export function herbariumRenders(scene) {
  const image = (key) => (scene.textures.exists(key) ? scene.textures.get(key).getSourceImage() : null);
  const desk = image(HERBARIUM_RENDERS.desk.key);
  let book = null;
  if (desk) {
    book = makeCanvas(DESK.book.w, DESK.book.h);
    book.getContext("2d").drawImage(desk, -DESK.book.x, -DESK.book.y);
  }
  return { desk, book, pages: HERBARIUM_RENDERS.sheets.map(({ key }) => image(key)) };
}
export const FACES = PAGES.length + 1; // five pages of plants, and the last, inside the back cover
const R = 2; // the pages are painted at twice their size, for crisp lines
const HAND = '"Cormorant Garamond", Georgia, "Times New Roman", serif'; // her hand: an old book's italic

// The album's own measure, in the picture of it the render was laid out to
// (herbarium_desk.py: 1536 x 1024 px, 24 px a centimetre): the spine, where
// the leaves are sewn; how far a leaf can reach from it, and how tall; and on
// each side the top sheet itself — left, top, right, bottom (herbariumDesk.json).
const sheetBox = (pts) => {
  const xs = pts.map(([x]) => x), ys = pts.map(([, y]) => y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
const ALBUM = {
  spine: 768, top: 40, leaf: 680, height: 904,
  sheet: [sheetBox(DESK.sheets.left), sheetBox(DESK.sheets.right)],
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
  addCanvasTexture(textures, BOOK.desk, paintDesk(L, desk));
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

// the table under the window, as Blender rendered it — walnut, the album
// open on it, her pencil, tweezers, the gummed strip, a leaf of ivy and a
// petal fallen out — laid so that the book in it lies where the book is
// (painted as far as the table is seen while the book is still further off,
// in the screen's own coordinates)
function paintDesk(L, desk) {
  const { book: b, view: v } = L;
  const c = makeCanvas(Math.ceil(v.w), Math.ceil(v.h)), g = c.getContext("2d");
  g.translate(-v.x, -v.y);
  g.fillStyle = "#0b0705"; g.fillRect(v.x, v.y, v.w, v.h);
  const k = b.w / DESK.book.w;
  g.imageSmoothingQuality = "high";
  if (desk) g.drawImage(desk, b.x - DESK.book.x * k, b.y - DESK.book.y * k, DESK.width * k, DESK.height * k);
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
  s.addColorStop(0.36, "rgba(255,250,235,0.04)"); s.addColorStop(0.46, "rgba(0,0,0,0.06)");
  s.addColorStop(0.5, "rgba(0,0,0,0.22)"); s.addColorStop(0.54, "rgba(0,0,0,0.06)");
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
// the render, its page's own sheet laid on it, cut to the top sheet's own
// shape — so a leaf lifted is one sheet, and the edges of the pages under it
// stay where they are.
function paintPage(L, index, photo, pages) {
  const pw = Math.round(L.pw * R), ph = Math.round(L.ph * R);
  const c = makeCanvas(pw, ph), g = c.getContext("2d");
  const right = index % 2 === 1;
  const k = pw / ALBUM.leaf, x0 = right ? ALBUM.spine : ALBUM.spine - ALBUM.leaf;
  g.imageSmoothingQuality = "high";
  if (photo) g.drawImage(photo, x0, ALBUM.top, ALBUM.leaf, ALBUM.height, 0, 0, pw, ph);
  const [sx0, sy0, sx1, sy1] = ALBUM.sheet[right ? 1 : 0];
  const S = { x: (sx0 - x0) * k, y: (sy0 - ALBUM.top) * k, w: (sx1 - sx0) * k, h: (sy1 - sy0) * k };
  const specimens = PAGES[index], photograph = pages[index];
  if (specimens && photograph) {
    g.drawImage(photograph, S.x, S.y, S.w, S.h);
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
