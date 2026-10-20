import { soft, grain, vignette, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";
import { PAGES } from "./puzzle.js";

/** Ivy's herbarium, open on the console table under the window in Room VI:
 *  a photographed cloth-bound specimen album, its pages heavy and aged.
 *  On each page four or five real pressed botanical specimens,
 *  flat and faded, each held down by narrow
 *  strips of gummed paper, its Latin name under it in her hand; and on each
 *  page one of them drawn round in pencil with a figure of straight sides.
 *
 *  Painted once per screen size: the table with the book's binding on it;
 *  each page apart, to be turned (shared/pageFlip.js turns them); the shading
 *  where the pages curve into the spine. Transparent plant photographs retain
 *  their individual silhouettes. */

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
  const { book: photo, desk, specimens } = photography;
  addCanvasTexture(textures, BOOK.desk, paintDesk(L, photo, desk));
  addCanvasTexture(textures, BOOK.light, paintLight(L));
  return {
    shade: paintShade(L),
    faces: Array.from({ length: FACES }, (_, i) => paintPage(L, i, photo, specimens)),
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

// where the specimens lie on a page, as shares of it: five, or four
const SLOTS = {
  5: [[0.27, 0.17], [0.73, 0.17], [0.5, 0.47], [0.27, 0.76], [0.73, 0.76]],
  4: [[0.27, 0.25], [0.73, 0.25], [0.27, 0.69], [0.73, 0.69]],
};

// A leaf as it is turned: the whole reach of a leaf from the spine, out of
// the photograph, cut to the top sheet's own shape — so a leaf lifted is one
// sheet, and the edges of the pages under it stay where they are.
function paintPage(L, index, photo, specimens) {
  const pw = Math.round(L.pw * R), ph = Math.round(L.ph * R);
  const c = makeCanvas(pw, ph), g = c.getContext("2d");
  const right = index % 2 === 1;
  const k = pw / ALBUM.leaf, x0 = right ? ALBUM.spine : ALBUM.spine - ALBUM.leaf;
  // the page's paper, from the photographed book: its foxing and soft curl
  g.imageSmoothingQuality = "high";
  g.filter = "brightness(.83) saturate(.84)";
  g.drawImage(photo, x0, ALBUM.top, ALBUM.leaf, ALBUM.height, 0, 0, pw, ph);
  g.filter = "none";
  // the sheet, in the leaf's pixels: what is written on is laid out on it
  const [sx0, sy0, sx1, sy1] = ALBUM.sheet[right ? 1 : 0];
  const S = { x: (sx0 - x0) * k, y: (sy0 - ALBUM.top) * k, w: (sx1 - sx0) * k, h: (sy1 - sy0) * k };
  const page = PAGES[index];
  if (page) {
    const slots = SLOTS[page.length];
    const sw = S.w * 0.36, sh = S.h * (page.length === 5 ? 0.18 : 0.22);
    const size = Math.round(S.h * 0.026);
    page.forEach((spec, n) => {
      const [fx, fy] = slots[n], cx = S.x + S.w * fx, cy = S.y + S.h * fy;
      const rnd = lcg(1000 + index * 37 + n * 11);
      g.save();
      g.translate(cx, cy);
      g.rotate((rnd() - 0.5) * 0.22);
      drawSpecimen(g, spec.kind, sw, sh, rnd, specimens.get(spec.name));
      g.restore();
      // the one drawn round, in pencil — round the plant; her label stays clear of it, below
      let below = cy + sh * 0.62;
      if (spec.sides) {
        const r = S.w * (page.length === 5 ? .19 : .21), fy0 = cy + sh * 0.08;
        drawFigure(g, cx, fy0, r, spec.sides, lcg(77 + index * 13));
        below = Math.max(below, fy0 + r * 0.97 + size * 1.15);
      }
      // her label under it
      g.font = `italic 500 ${size}px ${HAND}`;
      g.fillStyle = "rgba(48,35,24,0.86)"; g.textAlign = "center"; g.textBaseline = "alphabetic";
      g.fillText(spec.name, cx, below, S.w * 0.42);
    });
    // the page's number at its outer foot, in roman as she numbered them
    g.font = `italic 500 ${Math.round(S.h * 0.03)}px ${HAND}`;
    g.fillStyle = "rgba(48,35,24,0.6)"; g.textAlign = right ? "right" : "left";
    g.fillText(["I", "II", "III", "IV", "V"][index], S.x + S.w * (right ? 0.92 : 0.08), S.y + S.h * 0.965);
  } else {
    // inside the back cover: her name, small, in the corner, and the year
    g.font = `italic 500 ${Math.round(S.h * 0.03)}px ${HAND}`;
    g.fillStyle = "rgba(48,35,24,0.55)"; g.textAlign = "right";
    g.fillText("I. Ashcombe · Ashcombe House, 1958", S.x + S.w * 0.9, S.y + S.h * 0.92);
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

// A figure of `n` straight sides drawn round a specimen in pencil, by hand:
// each side ruled straight, the corners plain — each side drawn a touch past
// the corner, as a hand draws — so that they can be counted.
function drawFigure(g, cx, cy, r, n, rnd) {
  const turn = rnd() * Math.PI * 2;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = turn + (i / n) * Math.PI * 2, rr = r * (0.96 + rnd() * 0.08);
    return { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.92 };
  });
  g.save();
  g.lineCap = "round";
  for (const [width, colour] of [[2.6 * R * 0.6, "rgba(70,72,80,0.5)"], [1.3 * R * 0.6, "rgba(52,54,62,0.85)"]]) {
    g.strokeStyle = colour; g.lineWidth = width;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const dx = b.x - a.x, dy = b.y - a.y, over = 0.05;
      g.beginPath();
      g.moveTo(a.x - dx * over + (rnd() - 0.5) * R, a.y - dy * over + (rnd() - 0.5) * R);
      g.lineTo(b.x + dx * over + (rnd() - 0.5) * R, b.y + dy * over + (rnd() - 0.5) * R);
      g.stroke();
    }
  }
  g.restore();
}

// ── the specimens ───────────────────────────────────────────────────────────

// pressed plants: flat, their greens gone olive and brown
const GREEN = ["#5f6c3c", "#55623a", "#6a7244", "#4e5a33", "#707a48"];
const VEIN = "rgba(40,48,24,0.55)";
const STEM = "#5a5432";
const pick = (rnd, list) => list[Math.floor(rnd() * list.length)];

function drawSpecimen(g, kind, w, h, rnd, photograph = null) {
  const s = Math.min(w, h * 1.5);
  const draw = SPECIMENS[kind] ?? SPECIMENS.ovate;
  if (photograph) {
    const scale = Math.min(w * .9 / photograph.width, h * .94 / photograph.height);
    const width = photograph.width * scale, height = photograph.height * scale;
    g.save();
    g.shadowColor = "rgba(47,33,18,.3)"; g.shadowBlur = R * .8; g.shadowOffsetY = R * .7;
    g.filter = "brightness(.83) saturate(.8)";
    g.drawImage(photograph, -width / 2, -height / 2, width, height);
    g.restore();
  } else draw(g, w, h, s, rnd);
  // the gummed strips that hold it down, across its stem
  tape(g, (rnd() - 0.5) * w * 0.15, h * 0.3, w * 0.22, rnd);
  if (rnd() < 0.6) tape(g, (rnd() - 0.5) * w * 0.3, -h * 0.05, w * 0.16, rnd);
}

function tape(g, x, y, len, rnd) {
  g.save(); g.translate(x, y); g.rotate((rnd() - 0.5) * 0.5);
  g.beginPath(); g.moveTo(-len / 2, -len * .14);
  g.lineTo(len * .49, -len * .13); g.lineTo(len * .5, len * .12);
  g.lineTo(-len * .48, len * .15); g.closePath();
  const paper = g.createLinearGradient(0, -len * .14, 0, len * .14);
  paper.addColorStop(0, "rgba(218,202,166,.8)"); paper.addColorStop(.4, "rgba(235,222,193,.86)");
  paper.addColorStop(1, "rgba(191,170,130,.7)");
  g.fillStyle = paper; g.fill();
  g.strokeStyle = "rgba(117,96,64,.3)"; g.lineWidth = R * .35; g.stroke();
  g.save(); g.clip();
  for (let i = 0; i < 25; i++) {
    g.fillStyle = `rgba(108,91,62,${.025 + rnd() * .08})`;
    g.fillRect((rnd() - .5) * len, (rnd() - .5) * len * .28, R * .3, (1 + rnd() * 2) * R);
  }
  g.restore();
  g.restore();
}

function stem(g, x0, y0, x1, y1, width, bend = 0) {
  g.strokeStyle = STEM; g.lineWidth = width; g.lineCap = "round";
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + bend, (y0 + y1) / 2, x1, y1); g.stroke();
}

// an ovate leaf from its base at (x, y), pointing at `a`, `len` long
function leaf(g, x, y, a, len, wid, colour, { veins = 3, toothed = false } = {}) {
  g.save(); g.translate(x, y); g.rotate(a);
  g.beginPath(); g.moveTo(0, 0);
  if (toothed) {
    const n = 7;
    for (let i = 1; i <= n; i++) { const t = i / n, ww = Math.sin(Math.PI * t) * wid; g.lineTo(len * t, -ww * (i % 2 ? 1.08 : 0.92)); }
    for (let i = n - 1; i >= 0; i--) { const t = i / n, ww = Math.sin(Math.PI * t) * wid; g.lineTo(len * t, ww * (i % 2 ? 1.08 : 0.92)); }
  } else {
    g.quadraticCurveTo(len * 0.4, -wid * 1.25, len, 0);
    g.quadraticCurveTo(len * 0.4, wid * 1.25, 0, 0);
  }
  g.closePath(); g.fillStyle = colour; g.fill();
  g.strokeStyle = "rgba(30,36,18,0.35)"; g.lineWidth = R * 0.5; g.stroke();
  g.strokeStyle = VEIN; g.lineWidth = R * 0.55;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.94, 0); g.stroke();
  for (let i = 1; i <= veins; i++) {
    const t = i / (veins + 1);
    g.beginPath(); g.moveTo(len * t, 0); g.lineTo(len * (t + 0.14), -wid * 0.7); g.moveTo(len * t, 0); g.lineTo(len * (t + 0.14), wid * 0.7); g.stroke();
  }
  g.restore();
}

// a leaf of `lobes` points spread like a hand (ivy, maple)
function palmate(g, x, y, a, size, lobes, colour, depth = 0.45) {
  g.save(); g.translate(x, y); g.rotate(a);
  g.beginPath();
  const n = lobes * 2;
  for (let i = 0; i <= n; i++) {
    const t = -Math.PI * 0.85 + (i / n) * Math.PI * 1.7;
    const rr = i % 2 === 0 ? size * (1 - depth) : size * (i === lobes ? 1 : 0.82);
    const px = Math.sin(t) * rr, py = -Math.cos(t) * rr;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.lineTo(0, size * 0.12); g.closePath();
  g.fillStyle = colour; g.fill();
  g.strokeStyle = "rgba(30,36,18,0.35)"; g.lineWidth = R * 0.5; g.stroke();
  g.strokeStyle = VEIN; g.lineWidth = R * 0.5;
  for (let i = 1; i < n; i += 2) {
    const t = -Math.PI * 0.85 + (i / n) * Math.PI * 1.7;
    g.beginPath(); g.moveTo(0, size * 0.05); g.lineTo(Math.sin(t) * size * 0.75, -Math.cos(t) * size * 0.75); g.stroke();
  }
  g.restore();
}

function flower(g, x, y, r, petals, colour, centre) {
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = colour; g.beginPath(); g.ellipse(0, -r * 0.55, r * (petals > 8 ? 0.16 : 0.42), r * 0.55, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(90,70,50,0.25)"; g.lineWidth = R * 0.4; g.stroke();
    g.restore();
  }
  g.fillStyle = centre; g.beginPath(); g.arc(x, y, r * (petals > 8 ? 0.3 : 0.22), 0, Math.PI * 2); g.fill();
}

const SPECIMENS = {
  fern(g, w, h, s, rnd) {
    const top = -h * 0.48, foot = h * 0.42, col = pick(rnd, GREEN);
    stem(g, 0, foot, 0, top, R * 1.1, w * 0.04);
    const n = 9;
    for (let i = 0; i < n; i++) {
      const t = i / n, y = foot - (foot - top) * (0.12 + t * 0.85), len = s * 0.34 * (1 - t * 0.75);
      for (const side of [-1, 1]) leaf(g, side * R * 0.5, y, side > 0 ? -0.35 : Math.PI + 0.35, len, len * 0.22, col, { veins: 1, toothed: true });
    }
  },
  daisy(g, w, h, s, rnd) {
    stem(g, 0, h * 0.42, w * 0.03, -h * 0.2, R * 0.9, -w * 0.05);
    for (const [x, a] of [[-w * 0.02, Math.PI * 0.82], [w * 0.02, Math.PI * 0.18]]) leaf(g, x, h * 0.38, -a, s * 0.24, s * 0.08, pick(rnd, GREEN), { veins: 1 });
    flower(g, w * 0.03, -h * 0.26, s * 0.16, 16, "rgba(236,228,206,0.95)", "#c4a03c");
  },
  hawthorn(g, w, h, s, rnd) {
    stem(g, -w * 0.04, h * 0.42, w * 0.05, -h * 0.44, R * 1.2, w * 0.06);
    for (let i = 0; i < 4; i++) {
      const y = h * 0.28 - i * h * 0.22, side = i % 2 ? 1 : -1;
      palmate(g, side * R, y, side * 1.1, s * 0.13, 3, pick(rnd, GREEN), 0.55);
      g.strokeStyle = STEM; g.lineWidth = R * 0.7; g.beginPath(); g.moveTo(0, y + h * 0.06); g.lineTo(-side * w * 0.07, y + h * 0.02); g.stroke();
    }
    for (let k = 0; k < 5; k++) flower(g, w * 0.05 + (rnd() - 0.5) * w * 0.12, -h * 0.44 + (rnd() - 0.5) * h * 0.1, s * 0.035, 5, "rgba(238,232,214,0.95)", "#9a7a50");
  },
  grass(g, w, h, s, rnd) {
    for (let k = -1; k <= 1; k++) {
      const x = k * w * 0.06, top = -h * (0.4 - Math.abs(k) * 0.08);
      stem(g, x * 0.3, h * 0.42, x, top, R * 0.6, k * w * 0.05);
      for (let i = 0; i < 6; i++) {
        const y = top + i * h * 0.05;
        g.fillStyle = "rgba(150,130,80,0.85)";
        g.beginPath(); g.ellipse(x + (i % 2 ? 1 : -1) * w * 0.03, y + h * 0.02, s * 0.022, s * 0.034, (i % 2 ? 1 : -1) * 0.5, 0, Math.PI * 2); g.fill();
      }
    }
    leaf(g, 0, h * 0.4, -Math.PI * 0.62, s * 0.4, s * 0.03, pick(rnd, GREEN), { veins: 0 });
  },
  clover(g, w, h, s, rnd) {
    stem(g, 0, h * 0.42, w * 0.02, -h * 0.05, R * 0.8, w * 0.04);
    stem(g, 0, h * 0.42, -w * 0.08, -h * 0.25, R * 0.7, -w * 0.04);
    const col = pick(rnd, GREEN);
    for (let i = 0; i < 3; i++) leaf(g, w * 0.02, -h * 0.05, -Math.PI / 2 + (i - 1) * 1.1, s * 0.13, s * 0.08, col, { veins: 1 });
    // its flower head, a round of small florets
    g.fillStyle = "rgba(226,214,200,0.92)"; g.beginPath(); g.arc(-w * 0.08, -h * 0.3, s * 0.07, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < 14; k++) { const a = rnd() * Math.PI * 2, rr = rnd() * s * 0.06; g.fillStyle = "rgba(180,150,140,0.5)"; g.fillRect(-w * 0.08 + Math.cos(a) * rr, -h * 0.3 + Math.sin(a) * rr, R, R); }
  },
  oak(g, w, h, s) {
    stem(g, 0, h * 0.42, 0, h * 0.28, R * 1.2);
    g.save(); g.translate(0, h * 0.28);
    g.beginPath(); g.moveTo(0, 0);
    const len = h * 0.7, n = 5;
    for (let i = 0; i <= n * 2; i++) { const t = i / (n * 2), ww = Math.sin(Math.PI * t) * s * 0.2 * (i % 2 ? 1 : 0.55); g.lineTo(-ww, -len * t); }
    for (let i = n * 2; i >= 0; i--) { const t = i / (n * 2), ww = Math.sin(Math.PI * t) * s * 0.2 * (i % 2 ? 1 : 0.55); g.lineTo(ww, -len * t); }
    g.closePath(); g.fillStyle = "#6b6a3a"; g.fill(); g.strokeStyle = "rgba(30,36,18,0.35)"; g.lineWidth = R * 0.5; g.stroke();
    g.strokeStyle = VEIN; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -len * 0.95); g.stroke();
    g.restore();
  },
  rose(g, w, h, s, rnd) {
    stem(g, 0, h * 0.42, w * 0.02, -h * 0.22, R * 1.1, w * 0.05);
    // a leaf of five leaflets
    const col = pick(rnd, GREEN);
    for (let i = 0; i < 2; i++) for (const side of [-1, 1]) leaf(g, w * 0.01, h * 0.22 - i * h * 0.12, side > 0 ? -0.5 : Math.PI + 0.5, s * 0.14, s * 0.06, col, { veins: 1, toothed: true });
    leaf(g, w * 0.01, h * 0.04, -Math.PI / 2, s * 0.15, s * 0.06, col, { veins: 1, toothed: true });
    flower(g, w * 0.02, -h * 0.3, s * 0.15, 5, "rgba(206,148,148,0.92)", "#c9a050");
  },
  willow(g, w, h, s, rnd) {
    stem(g, -w * 0.03, h * 0.42, w * 0.04, -h * 0.46, R * 1, w * 0.05);
    for (let i = 0; i < 6; i++) {
      const y = h * 0.32 - i * h * 0.14, side = i % 2 ? 1 : -1;
      leaf(g, 0, y, side > 0 ? -0.7 : Math.PI + 0.7, s * 0.3, s * 0.04, pick(rnd, GREEN), { veins: 0 });
    }
  },
  ovate(g, w, h, s, rnd) {
    stem(g, 0, h * 0.42, w * 0.02, -h * 0.3, R * 1, w * 0.04);
    leaf(g, w * 0.02, -h * 0.3, -Math.PI / 2 - 0.15, s * 0.36, s * 0.16, pick(rnd, GREEN), { veins: 4, toothed: rnd() < 0.5 });
    leaf(g, 0, h * 0.1, -0.5, s * 0.3, s * 0.13, pick(rnd, GREEN), { veins: 3 });
    leaf(g, 0, h * 0.2, Math.PI + 0.5, s * 0.26, s * 0.11, pick(rnd, GREEN), { veins: 3 });
  },
  ivy(g, w, h, s, rnd) {
    stem(g, -w * 0.08, h * 0.42, w * 0.08, -h * 0.42, R * 1, w * 0.08);
    for (let i = 0; i < 3; i++) {
      const y = h * 0.25 - i * h * 0.3, side = i % 2 ? 1 : -1;
      palmate(g, side * w * 0.02, y, side * 0.5, s * 0.17, 5, pick(rnd, ["#4c5a34", "#45522f", "#56623a"]), 0.42);
    }
  },
  maple(g, w, h, s, rnd) {
    stem(g, 0, h * 0.42, 0, h * 0.1, R * 1.1);
    palmate(g, 0, h * 0.06, 0, s * 0.36, 5, pick(rnd, ["#7a6a3e", "#6e6a3c", "#827044"]), 0.5);
  },
  dandelion(g, w, h, s, rnd) {
    stem(g, 0, h * 0.42, w * 0.02, -h * 0.3, R * 0.9, w * 0.03);
    for (const a of [-2.3, -0.84, -2.7, -0.44]) leaf(g, 0, h * 0.42, a, s * 0.3, s * 0.06, pick(rnd, GREEN), { veins: 1, toothed: true });
    flower(g, w * 0.02, -h * 0.34, s * 0.12, 20, "rgba(214,178,62,0.95)", "#b8922e");
  },
  blackthorn(g, w, h, s, rnd) {
    g.strokeStyle = "#3a3024"; g.lineWidth = R * 1.4; g.lineCap = "round";
    g.beginPath(); g.moveTo(-w * 0.05, h * 0.42); g.quadraticCurveTo(w * 0.06, 0, -w * 0.02, -h * 0.45); g.stroke();
    for (let i = 0; i < 4; i++) {
      const y = h * 0.28 - i * h * 0.2, side = i % 2 ? 1 : -1;
      leaf(g, w * 0.02, y, side > 0 ? -0.6 : Math.PI + 0.6, s * 0.15, s * 0.06, pick(rnd, GREEN), { veins: 2, toothed: true });
      g.strokeStyle = "#3a3024"; g.lineWidth = R * 0.8; g.beginPath(); g.moveTo(w * 0.02, y + h * 0.05); g.lineTo(-side * w * 0.09, y + h * 0.08); g.stroke();
    }
    for (let k = 0; k < 4; k++) flower(g, (rnd() - 0.3) * w * 0.12, -h * 0.4 + rnd() * h * 0.12, s * 0.04, 5, "rgba(240,236,222,0.95)", "#9a8050");
  },
  privet(g, w, h, s, rnd) {
    stem(g, 0, h * 0.42, 0, -h * 0.28, R * 1, w * 0.02);
    for (let i = 0; i < 4; i++) {
      const y = h * 0.3 - i * h * 0.15;
      for (const side of [-1, 1]) leaf(g, 0, y, side > 0 ? -0.35 : Math.PI + 0.35, s * 0.16, s * 0.065, pick(rnd, GREEN), { veins: 1 });
    }
    // its small white flowers, in a spike at the top
    for (let k = 0; k < 22; k++) {
      const t = rnd();
      g.fillStyle = "rgba(240,236,222,0.95)";
      g.beginPath(); g.arc((rnd() - 0.5) * s * 0.12 * (1 - t), -h * 0.3 - t * h * 0.16, s * 0.016, 0, Math.PI * 2); g.fill();
    }
  },
  primrose(g, w, h, s, rnd) {
    for (const a of [-2.4, -0.7, -1.9, -1.2]) leaf(g, 0, h * 0.4, a, s * 0.3, s * 0.1, pick(rnd, GREEN), { veins: 4, toothed: true });
    for (const [x, y] of [[-w * 0.08, -h * 0.18], [w * 0.09, -h * 0.28]]) {
      stem(g, 0, h * 0.36, x, y, R * 0.7, x * 0.3);
      flower(g, x, y, s * 0.1, 5, "rgba(226,214,140,0.95)", "#b89a3a");
    }
  },
};
