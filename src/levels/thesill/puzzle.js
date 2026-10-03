// Outlines of the LIGHT between cast shadows, not text drawn over the floor.
// The triangular counter of A remains dark. Broad straight and sloping edges
// belong to books, the bottle, candlestick, vase and clock on the sill.
export const SILL_APERTURES = Object.freeze([
  { outline: [[0,0],[0.18,0],[0.30,0.71],[0.43,0.22],[0.57,0.22],[0.71,0.71],[0.83,0],[1,0],[0.82,1],[0.63,1],[0.50,0.53],[0.36,1],[0.17,1]], counters: [] },
  { outline: [[0,1],[0.37,0],[0.63,0],[1,1],[0.79,1],[0.68,0.71],[0.31,0.71],[0.21,1]], counters: [[[0.38,0.53],[0.62,0.53],[0.50,0.20]]] },
  { outline: [[0,0],[0.21,0],[0.21,0.43],[0.73,0],[1,0],[0.45,0.49],[1,1],[0.72,1],[0.21,0.57],[0.21,1],[0,1]], counters: [] },
  { outline: [[0,0],[0.96,0],[0.96,0.18],[0.22,0.18],[0.22,0.41],[0.78,0.41],[0.78,0.59],[0.22,0.59],[0.22,0.82],[1,0.82],[1,1],[0,1]], counters: [] },
].map(aperture => Object.freeze(aperture)));

function contains(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[i], [bx, by] = points[j];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

export function sillLightAt(index, x, y) {
  const aperture = SILL_APERTURES[index];
  return Boolean(aperture && contains(aperture.outline, x, y) && !aperture.counters.some(hole => contains(hole, x, y)));
}

export function sillLayout(width, height) {
  const ww = Math.min(width * 0.70, height * 1.15);
  const wordWidth = Math.min(width * 0.76, height * 0.94);
  return { width, height, horizon: height * 0.43,
    window: { x: (width - ww) / 2, y: height * 0.085, w: ww, h: height * 0.325 },
    word: { x: (width - wordWidth) / 2, y: height * 0.59, w: wordWidth, h: Math.min(height * 0.245, wordWidth * 0.34) },
  };
}

export function aperturePoints(L, index, points) {
  const unit = L.word.w / 4.72;
  const lean = [-0.12, 0.08, -0.10, 0.15][index];
  const rise = [0.045, -0.035, 0.055, -0.025][index];
  return points.map(([x, y]) => ({
    x: L.word.x + (index * 1.24 + x + (0.5 - y) * lean) * unit,
    y: L.word.y + (y + rise + (x - 0.5) * lean * 0.25) * L.word.h,
  }));
}
