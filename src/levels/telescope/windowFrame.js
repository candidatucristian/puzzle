/** Geometry for the arched telescope window and its tied-back curtains. */

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
