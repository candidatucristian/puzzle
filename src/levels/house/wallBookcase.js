import { makeCanvas, lcg } from "../../shared/paint.js";
import { WARM, onWall } from "./roomKit.js";
import { caseBody } from "./solidFurniture.js";

// A bookcase against a side wall, as the library (Room II) has it: oak, five
// shelves of old books packed close, here and there one leaning into a gap,
// a few with gilt bands; painted flat and laid on the wall (roomKit onWall).
//
//   at       { d0, d1, y0, y1 } where on the wall it stands, in cm
//   side     -1 the left wall, 1 the right
//   depth    optional body projecting from the wall, with a moulded end panel
//   seed     which books, in which order
//   marked(r, n)  the books (row r, nth in it) that stand a little out, a
//            paper marker in each
//   gap      { row, at, w } a place kept empty on a shelf (`at`, `w` as parts
//            of its width) — for a book drawn live over the painting
//   lit      "far": a lamp beyond its far end lights that end
//   detail   painted richly, for a bookcase looked at closely: books in the
//            colours of old cloth and leather with rounded spines, gilt
//            titles, raised bands, a pile lying here and there; the wood with
//            its grain, the shelves' edges catching the light
//
// Returns where each shelf's books stand ({ base, rh } per row, in cm on the
// flat), for a live book to be set among them.
const SPINES = ["#3a1a16", "#1e2a24", "#2a2418", "#1a2230", "#3a2c16", "#2c1620", "#20201c", "#3c2a20", "#18261c"];
// for `detail`: the colours of old cloth and leather bindings, as the library's (bookshelf/library.js)
const BINDINGS = [[122, 30, 34], [38, 72, 58], [34, 52, 92], [102, 64, 30], [140, 96, 40], [74, 34, 70], [26, 60, 70], [150, 120, 80], [60, 40, 26], [90, 22, 28]];
const tone = (c, k) => `rgb(${Math.round(c[0] * k)},${Math.round(c[1] * k)},${Math.round(c[2] * k)})`;

// a book's spine, richly: rounded (dark at its edges, the light along it),
// the light on its head and the dark at its foot, gilt bands, raised bands
// on the leather ones, a gilt title or a paper label
function richSpine(g, x, top, w, h, col, k, rnd, R) {
  const gr = g.createLinearGradient(x, 0, x + w, 0);
  gr.addColorStop(0, tone(col, k * 0.42)); gr.addColorStop(0.3, tone(col, Math.min(1.3, k * 1.2))); gr.addColorStop(0.62, tone(col, k * 0.9)); gr.addColorStop(1, tone(col, k * 0.38));
  g.fillStyle = gr; g.fillRect(x, top, w, h);
  const foot = g.createLinearGradient(0, top + h * 0.82, 0, top + h);
  foot.addColorStop(0, "rgba(0,0,0,0)"); foot.addColorStop(1, "rgba(0,0,0,0.45)");
  g.fillStyle = foot; g.fillRect(x, top + h * 0.82, w, h * 0.18);
  g.fillStyle = "rgba(255,232,196,0.22)"; g.fillRect(x, top, w, Math.max(1, 0.35 * R));
  if (rnd() < 0.62) {
    for (const f of [0.08, 0.9]) {
      const gb = g.createLinearGradient(x, 0, x + w, 0);
      gb.addColorStop(0, "#6a5020"); gb.addColorStop(0.35, "#e6c26e"); gb.addColorStop(1, "#5a4218");
      g.fillStyle = gb; g.fillRect(x + 0.4, top + h * f, w - 0.8, Math.max(1, 0.45 * R));
    }
  }
  if (rnd() < 0.34) {
    for (const f of [0.22, 0.38, 0.62, 0.78]) {
      g.fillStyle = "rgba(0,0,0,0.42)"; g.fillRect(x + 0.4, top + h * f, w - 0.8, Math.max(1, 0.3 * R));
      g.fillStyle = "rgba(255,226,186,0.2)"; g.fillRect(x + 0.4, top + h * f + Math.max(1, 0.3 * R), w - 0.8, Math.max(1, 0.25 * R));
    }
  }
  const mark = rnd();
  if (mark < 0.38) {
    g.fillStyle = "rgba(226,190,110,0.8)";
    for (let i = 0; i < 3; i++) g.fillRect(x + w * 0.3, top + h * (0.44 + i * 0.05), w * 0.4, Math.max(1, 0.3 * R));
  } else if (mark < 0.56) {
    g.fillStyle = "rgba(214,198,160,0.78)"; g.fillRect(x + w * 0.16, top + h * 0.5, w * 0.68, h * 0.12);
    g.fillStyle = "rgba(60,44,24,0.5)"; g.fillRect(x + w * 0.28, top + h * 0.555, w * 0.44, Math.max(1, 0.2 * R));
  }
  g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(x + w - 0.5, top, 0.5, h);
}

export function paintWallBookcase(ctx, L, { at, side, seed, marked = () => false, gap = null, lit = null, detail = false, depth = 0, bindings = null }) {
  const R = 3, fw = (at.d1 - at.d0) * R, fh = (at.y1 - at.y0) * R;
  const flat = makeCanvas(fw, fh);
  const g = flat.getContext("2d");
  const rnd = lcg(seed);
  g.fillStyle = "#1c110a";
  g.fillRect(0, 0, fw, fh);
  g.fillStyle = "#060403";
  g.fillRect(7 * R, 9 * R, fw - 14 * R, fh - 20 * R);
  if (detail) {
    // the wood of it, with its grain; the back boards inside, dark
    const oak = g.createLinearGradient(0, 0, fw, 0);
    oak.addColorStop(0, "#3a2414"); oak.addColorStop(0.5, "#2a1a0e"); oak.addColorStop(1, "#3a2414");
    g.fillStyle = oak; g.fillRect(0, 0, fw, fh);
    if (depth > 0 && L.surfaceMaterials?.wood) g.drawImage(L.surfaceMaterials.wood, 0, 0, fw, fh);
    g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 1;
    for (let i = 0; i < 40; i++) { const gx = rnd() * fw; g.beginPath(); g.moveTo(gx, 0); g.bezierCurveTo(gx + 4, fh * 0.3, gx - 4, fh * 0.7, gx + 2, fh); g.stroke(); }
    const back = g.createLinearGradient(0, 9 * R, 0, fh - 11 * R);
    back.addColorStop(0, "#0e0905"); back.addColorStop(1, "#060403");
    g.fillStyle = back; g.fillRect(7 * R, 9 * R, fw - 14 * R, fh - 20 * R);
    g.strokeStyle = "rgba(255,220,170,0.04)";
    for (let bx = 7 * R + 16 * R; bx < fw - 7 * R; bx += 16 * R) { g.beginPath(); g.moveTo(bx, 9 * R); g.lineTo(bx, fh - 11 * R); g.stroke(); }
  }
  const rows = 5, rh = (fh - 20 * R) / rows;
  const shelves = [];
  for (let r = 0; r < rows; r++) {
    const base = 9 * R + (r + 1) * rh - 2.6 * R;
    shelves.push({ base: base / R, rh: rh / R });
    const kept = gap && gap.row === r ? { x0: fw * gap.at, x1: fw * (gap.at + gap.w) } : null;
    let x = 8.5 * R, n = 0;
    while (x < fw - 12 * R) {
      if (kept && x + 2 * R > kept.x0 && x < kept.x1) { x = kept.x1; continue; }
      const bw = (2.6 + rnd() * 3.8) * R, bh = (rh - 6 * R) * (0.66 + rnd() * 0.3);
      if (rnd() < 0.06) { x += bw * 1.4; continue; }
      const out = marked(r, n);
      n++;
      const col = SPINES[Math.floor(rnd() * SPINES.length)];
      if (detail) {
        const bc = BINDINGS[Math.floor(rnd() * BINDINGS.length)], k = 0.55 + rnd() * 0.35;
        const spine = (x0, y0, width, height) => {
          if (!bindings) { richSpine(g, x0, y0, width, height, bc, k, rnd, R); return; }
          g.drawImage(bindings[(r + n) % bindings.length], x0, y0, width, height);
          g.fillStyle = `rgba(0,0,0,${1 - k})`; g.fillRect(x0, y0, width, height);
        };
        // now and then a pile lying flat, instead of one standing
        if (rnd() < 0.06 && !out && x + 22 * R < fw - 12 * R && !(kept && x + 24 * R > kept.x0 && x < kept.x1)) {
          let y = base;
          const pw = (17 + rnd() * 5) * R;
          for (let i = 0, n2 = 3 + Math.floor(rnd() * 2); i < n2; i++) {
            const th = (3 + rnd() * 2) * R, pc = BINDINGS[Math.floor(rnd() * BINDINGS.length)], pk = 0.55 + rnd() * 0.3, inset = rnd() * 2 * R;
            const lg = g.createLinearGradient(0, y - th, 0, y);
            lg.addColorStop(0, tone(pc, pk * 1.15)); lg.addColorStop(0.5, tone(pc, pk)); lg.addColorStop(1, tone(pc, pk * 0.45));
            g.fillStyle = lg; g.fillRect(x + inset, y - th, pw - inset, th);
            g.fillStyle = "rgba(226,190,110,0.6)"; g.fillRect(x + inset + pw * 0.3, y - th * 0.55, pw * 0.3, Math.max(1, 0.3 * R));
            y -= th;
          }
          x += pw + 1.5 * R;
          continue;
        }
        if (rnd() < 0.05 && !out) {
          g.save(); g.translate(x, base); g.rotate(-0.16);
          spine(0, -bh, bw, bh);
          g.restore();
          x += bw + 2.4 * R;
          continue;
        }
        spine(x, base - bh, bw - 0.4, bh);
        x += bw;
        continue;
      }
      if (rnd() < 0.05 && !out) {
        // one leaning against its neighbour
        g.save();
        g.translate(x, base);
        g.rotate(-0.16);
        g.fillStyle = col;
        g.fillRect(0, -bh, bw, bh);
        g.restore();
        x += bw + 2.4 * R;
        continue;
      }
      g.fillStyle = col;
      g.fillRect(x, base - bh, bw - 0.7, bh);
      g.fillStyle = "rgba(255,220,170,0.1)";
      g.fillRect(x, base - bh, 0.9, bh);
      if (rnd() < 0.55) {
        g.fillStyle = "rgba(190,160,90,0.45)";
        g.fillRect(x + 1, base - bh * 0.78, bw - 2.4, 0.04 * bh);
        g.fillRect(x + 1, base - bh * 0.24, bw - 2.4, 0.03 * bh);
      }
      if (out) {
        // standing out: its edge catches the light, a marker stands up out of it
        g.fillStyle = "rgba(255,226,180,0.16)";
        g.fillRect(x, base - bh, bw - 0.7, bh);
        g.fillStyle = "#e6dcc0";
        g.fillRect(x + bw * 0.3, base - bh - 3.6 * R, 1.2 * R, 3.6 * R);
      }
      x += bw;
    }
    // the shelf under them, and the shadow of the one above
    g.fillStyle = "#2a1a0e";
    g.fillRect(7 * R, base, fw - 14 * R, 2.6 * R);
    if (detail) {
      const edge = g.createLinearGradient(0, base, 0, base + 2.6 * R);
      edge.addColorStop(0, "#5a3a20"); edge.addColorStop(0.3, "#3a2414"); edge.addColorStop(1, "#1a0f08");
      g.fillStyle = edge; g.fillRect(7 * R, base, fw - 14 * R, 2.6 * R);
      g.fillStyle = "rgba(255,214,170,0.3)"; g.fillRect(7 * R, base, fw - 14 * R, Math.max(1, 0.3 * R));
    }
    const sh = g.createLinearGradient(0, base - rh + 2.6 * R, 0, base - rh + 12 * R);
    sh.addColorStop(0, "rgba(0,0,0,0.75)");
    sh.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = sh;
    g.fillRect(7 * R, base - rh + 2.6 * R, fw - 14 * R, 9.4 * R);
  }
  // its plinth and its cornice
  g.fillStyle = "#24160c";
  g.fillRect(0, fh - 11 * R, fw, 11 * R);
  g.fillStyle = "#2e1c10";
  g.fillRect(0, 0, fw, 8 * R);
  g.fillStyle = "rgba(255,214,170,0.18)";
  g.fillRect(0, 0, fw, 1.2 * R);
  // a lamp beyond its far end lights that end
  if (lit === "far") {
    const lg = g.createLinearGradient(fw, 0, fw * 0.35, 0);
    lg.addColorStop(0, `rgba(${WARM},0.26)`);
    lg.addColorStop(1, `rgba(${WARM},0)`);
    g.globalCompositeOperation = "lighter";
    g.fillStyle = lg;
    g.fillRect(0, 0, fw, fh);
  }
  if (detail) {
    const top = g.createLinearGradient(0, 0, 0, 8 * R);
    top.addColorStop(0, "#5a3a20"); top.addColorStop(0.4, "#3a2414"); top.addColorStop(1, "#1e120a");
    g.fillStyle = top; g.fillRect(0, 0, fw, 8 * R);
    g.fillStyle = "rgba(255,214,170,0.3)"; g.fillRect(0, 0, fw, Math.max(1, 0.4 * R));
    g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(0, 8 * R - 2, fw, 2);
    // the cold of the window on its far end, the near end darker
    const cool = g.createLinearGradient(0, 0, fw, 0);
    cool.addColorStop(0, "rgba(150,178,225,0.12)"); cool.addColorStop(0.55, "rgba(150,178,225,0.02)"); cool.addColorStop(1, "rgba(0,0,0,0)");
    g.globalCompositeOperation = "lighter"; g.fillStyle = cool; g.fillRect(0, 0, fw, fh);
    g.globalCompositeOperation = "source-over";
    const near = g.createLinearGradient(fw, 0, fw * 0.6, 0);
    near.addColorStop(0, "rgba(0,0,0,0.18)"); near.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = near; g.fillRect(0, 0, fw, fh);
  }
  if (depth > 0) caseBody(ctx, L, { at, side, depth });
  onWall(ctx, depth > 0 ? { ...L, half: L.half - depth } : L, side, at, flat);
  return shelves;
}
