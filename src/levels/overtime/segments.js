import { SEGMENTS } from "./puzzle.js";

/** One seven-segment glyph as polygons, in a face's own units (v up, (x, y)
 *  its bottom-left corner). `slant` leans it like a real display. The
 *  calculator's display draws exactly these shapes, so reading it upside down
 *  is a property of the drawing (puzzle.js SEGMENTS, turnSegments). */
export function glyph(ch, x, y, w, h, t, slant = 0) {
  const shapes = segmentShapes(w, h, t);
  const lit = SEGMENTS[ch] ?? "";
  const on = [];
  const off = [];
  for (const key of "abcdefg") {
    const poly = shapes[key].map(([px, py]) => [
      x + px + slant * (h - py),
      y + (h - py),
    ]);
    (lit.includes(key) ? on : off).push(poly);
  }
  return { on, off };
}

// the seven bars of a w × h digit, t thick, each a long hexagon (y down)
function segmentShapes(w, h, t) {
  const gap = t * 0.14;
  const mid = h / 2;
  const hx0 = t * 0.45 + gap;
  const hx1 = w - t * 0.45 - gap;
  const horiz = (yy) => [
    [hx0, yy + t / 2],
    [hx0 + t / 2, yy],
    [hx1 - t / 2, yy],
    [hx1, yy + t / 2],
    [hx1 - t / 2, yy + t],
    [hx0 + t / 2, yy + t],
  ];
  const vert = (xx, ya, yb) => [
    [xx + t / 2, ya],
    [xx + t, ya + t / 2],
    [xx + t, yb - t / 2],
    [xx + t / 2, yb],
    [xx, yb - t / 2],
    [xx, ya + t / 2],
  ];
  const up = [t * 0.5 + gap, mid - gap];
  const low = [mid + gap, h - t * 0.5 - gap];
  return {
    a: horiz(0),
    g: horiz(mid - t / 2),
    d: horiz(h - t),
    f: vert(0, up[0], up[1]),
    b: vert(w - t, up[0], up[1]),
    e: vert(0, low[0], low[1]),
    c: vert(w - t, low[0], low[1]),
  };
}
