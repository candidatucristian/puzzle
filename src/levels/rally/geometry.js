export function ryBez(p0, p1, p2, n = 12) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const m = 1 - t;
    pts.push([
      m * m * p0[0] + 2 * m * t * p1[0] + t * t * p2[0],
      m * m * p0[1] + 2 * m * t * p1[1] + t * t * p2[1],
    ]);
  }
  return pts;
}
