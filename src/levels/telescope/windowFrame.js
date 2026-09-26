/** The arched window in pencil, with a sheer curtain tied back on either
 *  side. Shared by the room sketch and by the painted close-up you reach
 *  through the telescope (window.js), so both really are the same window:
 *  the curtain model below drapes both — the close-up just hangs it from a
 *  far bigger arch. */
export const SKETCH = 0xd8d2c4;

// ── the curtain model ───────────────────────────────────────────────────────
// A curtain hangs from a curved rod that follows the arch (the "track"), is
// gathered into a tie-back beside the jamb and falls from there to a hem
// resting on the sill. Everything is given for the LEFT curtain; the right
// one is its mirror image about the arch's centre line (mirrorPoint).
//
//   c = { trackCX, trackCY, trackRX, trackRY,  the rod: an elliptic arc
//         heading,                              how far up the rod the cloth
//                                               hangs (0 springing, 1 crown)
//         tieX, tieY, gather, tilt,             the tie-back
//         hemX, hemY, hemW, hemWave }           the hem

/** A point on the rod: t = 0 at the springing (where the arch meets the
 *  left jamb), t = 1 at the crown. */
export function trackPoint(c, t) {
  const a = Math.PI * (1 + t / 2);
  return {
    x: c.trackCX + Math.cos(a) * c.trackRX,
    y: c.trackCY + Math.sin(a) * c.trackRY,
  };
}

/** The same point, on the right-hand curtain. */
export function mirrorPoint(c, p) {
  return { x: 2 * c.trackCX - p.x, y: p.y };
}

function bezier(A, C, B, s) {
  const r = 1 - s;
  return {
    x: r * r * A.x + 2 * r * s * C.x + s * s * B.x,
    y: r * r * A.y + 2 * r * s * C.y + s * s * B.y,
  };
}

/** The curtain's fold lines, outer edge (u = 0) to inner edge (u = 1). Each
 *  drops from the rod, sweeps in to the tie-back and flares out again to the
 *  hem — `up` samples above the tie, `down` below it, so the tie sits at
 *  index `up` of every line. */
export function curtainLines(c, folds, up = 18, down = 16) {
  const lines = [];
  for (let i = 0; i < folds; i++) {
    const u = folds > 1 ? i / (folds - 1) : 0;
    const T = trackPoint(c, u * c.heading);
    const G = { x: c.tieX + u * c.gather, y: c.tieY - u * c.tilt };
    // the hem scallops a little between folds, never at the two edges
    const wave =
      (c.hemWave || 0) * Math.sin(Math.PI * u) * (i % 2 ? -0.6 : 0.6);
    const B = { x: c.hemX + u * c.hemW, y: c.hemY + wave };
    const C1 = { x: T.x, y: T.y + (G.y - T.y) * 0.62 };
    const C2 = { x: G.x + (B.x - G.x) * 0.1, y: G.y + (B.y - G.y) * 0.5 };
    const pts = [];
    for (let s = 0; s <= up; s++) pts.push(bezier(T, C1, G, s / up));
    for (let s = 1; s <= down; s++) pts.push(bezier(G, C2, B, s / down));
    lines.push({ u, pts });
  }
  return lines;
}

/** Closed outline of the curtain: up the rod, down the inner edge, back
 *  along the hem and up the outer edge. */
export function curtainOutline(c, lines, steps = 16) {
  const out = [];
  for (let s = 0; s <= steps; s++)
    out.push(trackPoint(c, (c.heading * s) / steps));
  const inner = lines[lines.length - 1].pts;
  for (let i = 1; i < inner.length; i++) out.push(inner[i]);
  for (let i = lines.length - 2; i >= 1; i--) {
    const p = lines[i].pts;
    out.push(p[p.length - 1]);
  }
  const outer = lines[0].pts;
  for (let i = outer.length - 1; i >= 1; i--) out.push(outer[i]);
  return out;
}

/** Where the LEFT curtain's inner edge crosses height y, or null above the
 *  curtain. (The right curtain's edge is its mirror, 2·trackCX − x.) */
export function innerEdgeAt(lines, y) {
  const pts = lines[lines.length - 1].pts;
  if (y < pts[0].y) return null;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (y <= b.y) return a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y || 1);
  }
  return pts[pts.length - 1].x;
}

/** The room sketch's curtains, proportioned from the window itself — so the
 *  room's call needs no curtain arguments (any passed as `o.curtain` win).
 *  They stay just outside the jambs, clear of the telescope and the sill. */
function sketchCurtain(o) {
  const w = o.wr - o.wl;
  const h = o.sillY - o.archCY;
  const k = o.k || 1;
  return {
    trackCX: o.archCX,
    trackCY: o.archCY,
    trackRX: o.archRX + 4 * k,
    trackRY: o.archRY + 4 * k,
    heading: 0.36,
    tieX: o.wl - w * 0.0625,
    tieY: o.archCY + h * 0.6,
    gather: w * 0.06,
    tilt: h * 0.028,
    hemX: o.wl - w * 0.081,
    hemY: o.sillY - 2 * k,
    hemW: w * 0.081,
    hemWave: h * 0.01,
  };
}

export function drawWindowFrame(scene, g, rnd, o) {
  const {
    wl,
    wr,
    archCX,
    archCY,
    archRX,
    archRY,
    sillY,
    sillL,
    sillR,
    k = 1, // stroke / offset scale, so an enlarged window keeps its weight
  } = o;
  const SK = SKETCH;

  // arch + jambs, doubled pencil strokes
  scene._pencilArc(
    g,
    rnd,
    archCX,
    archCY,
    archRX,
    archRY,
    Math.PI,
    Math.PI * 2,
    2 * k,
    SK,
    0.55,
  );
  scene._pencilArc(
    g,
    rnd,
    archCX,
    archCY,
    archRX + 7 * k,
    archRY + 7 * k,
    Math.PI,
    Math.PI * 2,
    1.2 * k,
    SK,
    0.3,
  );
  scene._pencilSeg(g, rnd, wl, archCY, wl, sillY, 2 * k, SK, 0.55, 1.6);
  scene._pencilSeg(g, rnd, wr, archCY, wr, sillY, 2 * k, SK, 0.55, 1.6);
  scene._pencilSeg(
    g,
    rnd,
    wl - 7 * k,
    archCY,
    wl - 7 * k,
    sillY,
    1.2 * k,
    SK,
    0.3,
    1.6,
  );
  scene._pencilSeg(
    g,
    rnd,
    wr + 7 * k,
    archCY,
    wr + 7 * k,
    sillY,
    1.2 * k,
    SK,
    0.3,
    1.6,
  );

  // sill
  scene._pencilSeg(g, rnd, sillL, sillY, sillR, sillY, 2.2 * k, SK, 0.55, 1.6);
  scene._pencilSeg(
    g,
    rnd,
    sillL + 4 * k,
    sillY + 9 * k,
    sillR - 4 * k,
    sillY + 9 * k,
    1.4 * k,
    SK,
    0.35,
    1.6,
  );

  // the sheer curtains, tied back either side (they replace the shutters;
  // the old shutter arguments are simply ignored)
  drawCurtains(scene, g, rnd, o.curtain || sketchCurtain(o), k);
}

function drawCurtains(scene, g, rnd, c, k) {
  const SK = SKETCH;
  const TIE = 14;
  const wobble = (pts, j) =>
    pts.map((p) => ({
      x: p.x + (rnd() - 0.5) * j,
      y: p.y + (rnd() - 0.5) * j,
    }));
  const base = curtainLines(c, 7, TIE, 12);
  const outline = curtainOutline(c, base, 10);

  // the rod follows the arch all the way over, a knob at either end
  scene._pencilArc(
    g,
    rnd,
    c.trackCX,
    c.trackCY,
    c.trackRX,
    c.trackRY,
    Math.PI,
    Math.PI * 2,
    1.1 * k,
    SK,
    0.38,
  );
  g.fillStyle(SK, 0.5);
  g.fillCircle(c.trackCX - c.trackRX, c.trackCY, 2.2 * k);
  g.fillCircle(c.trackCX + c.trackRX, c.trackCY, 2.2 * k);

  for (const right of [false, true]) {
    const m = right ? (p) => mirrorPoint(c, p) : (p) => p;
    const lines = base.map((l) => l.pts.map(m));
    const last = lines.length - 1;

    // a whisper of fill, so the cloth reads over the stars behind it
    g.fillStyle(SK, 0.05);
    g.fillPoints(outline.map(m), true);

    // outer and inner edge, then three softer folds starting below the rod
    scene._drawPath(g, wobble(lines[0], 1.2 * k), 1.3 * k, SK, 0.5);
    scene._drawPath(g, wobble(lines[last], 1.2 * k), 1.4 * k, SK, 0.55);
    for (const [i, from] of [
      [2, 0.25],
      [3, 0.12],
      [5, 0.3],
    ]) {
      const pts = lines[i].slice(Math.floor(lines[i].length * from));
      scene._drawPath(g, wobble(pts, k), 0.9 * k, SK, 0.26);
    }

    // the hem, and the rings the curtain hangs from
    scene._drawPath(
      g,
      wobble(
        lines.map((p) => p[p.length - 1]),
        0.8 * k,
      ),
      1.2 * k,
      SK,
      0.45,
    );
    g.fillStyle(SK, 0.55);
    for (let s = 0; s <= 5; s++) {
      const p = m(trackPoint(c, (c.heading * s) / 5));
      g.fillCircle(p.x, p.y, 1.5 * k);
    }

    // the tie-back: a band round the gathered cloth, and a small bow
    const A = lines[0][TIE];
    const B = lines[last][TIE];
    scene._pencilSeg(
      g,
      rnd,
      A.x,
      A.y - 2 * k,
      B.x,
      B.y - 2 * k,
      1.1 * k,
      SK,
      0.5,
      0.8,
    );
    scene._pencilSeg(
      g,
      rnd,
      A.x,
      A.y + 2 * k,
      B.x,
      B.y + 2 * k,
      1.1 * k,
      SK,
      0.5,
      0.8,
    );
    const q = { x: A.x + (B.x - A.x) * 0.55, y: A.y + (B.y - A.y) * 0.55 };
    const s = 4.5 * k;
    for (const d of [-1, 1]) {
      scene._drawPath(
        g,
        [
          q,
          { x: q.x + d * s * 0.6, y: q.y - s * 0.75 },
          { x: q.x + d * s * 1.2, y: q.y - s * 0.45 },
          { x: q.x + d * s * 1.15, y: q.y + s * 0.3 },
          { x: q.x + d * s * 0.45, y: q.y + s * 0.2 },
          q,
        ],
        k,
        SK,
        0.5,
      );
    }
    scene._pencilSeg(
      g,
      rnd,
      q.x,
      q.y,
      q.x - s * 0.35,
      q.y + s * 1.3,
      0.9 * k,
      SK,
      0.45,
      0.5,
    );
    scene._pencilSeg(
      g,
      rnd,
      q.x,
      q.y,
      q.x + s * 0.45,
      q.y + s * 1.2,
      0.9 * k,
      SK,
      0.45,
      0.5,
    );
    g.fillCircle(q.x, q.y, 1.2 * k);
  }
}
