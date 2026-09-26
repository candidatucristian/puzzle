// Deterministic pencil strokes. Keep call order stable to preserve existing artwork.

export function seededRandom(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function sketchSegment(rnd, x1, y1, x2, y2, mag) {
  const pts = [{ x: x1, y: y1 }];
  const steps = 3;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const off = (rnd() - 0.5) * 2 * mag;
    pts.push({ x: x1 + dx * t + nx * off, y: y1 + dy * t + ny * off });
  }
  pts.push({ x: x2, y: y2 });
  return pts;
}

export function drawPath(g, pts, width, color, alpha) {
  g.lineStyle(width, color, alpha);
  for (let i = 0; i < pts.length - 1; i++) {
    g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  }
}

export function roundRectPoints(x, y, w, h, r, seg = 5) {
  r = Math.min(r, w / 2, h / 2);
  const pts = [];
  const arc = (cx, cy, a0) => {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (Math.PI / 2) * (i / seg);
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
  };
  arc(x + w - r, y + r, -Math.PI / 2);
  arc(x + w - r, y + h - r, 0);
  arc(x + r, y + h - r, Math.PI / 2);
  arc(x + r, y + r, Math.PI);
  pts.push({ ...pts[0] });
  return pts;
}
