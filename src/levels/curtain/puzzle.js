export const CURTAIN_START = 0;
export const CURTAIN_ALIGNMENT = 0.72;
export const CURTAIN_WIDTH = 1.6;
export const CURTAIN_TRAVEL = 1.9;
const TARGETS = new Map([[21, 'M'], [13, 'O'], [36, 'T'], [28, 'H']]);
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
let engravingSeed = 31415;
const nextLetter = () => ALPHABET[Math.floor(((engravingSeed = engravingSeed * 16807 % 2147483647) / 2147483647) * ALPHABET.length)];

// All fifty engravings are fixed. The answer receives exactly the same ink,
// size and jitter as its neighbours; only the moving holes distinguish it.
export const CURTAIN_LETTERS = Object.freeze(Array.from({ length: 50 }, (_, i) => Object.freeze({
  letter: TARGETS.get(i) ?? nextLetter(),
  x: (i % 10 + 0.5) / 10 + Math.sin(i * 8.7) * 0.010,
  y: (Math.floor(i / 10) + 0.5) / 5 + Math.cos(i * 5.3) * 0.037,
  angle: Math.sin(i * 1.81) * 0.22,
})));
export const CURTAIN_HOLES = Object.freeze([...TARGETS.keys()].map(i => CURTAIN_LETTERS[i])
  .sort((a, b) => a.x - b.x).map((p, i) => Object.freeze({ x: p.x, y: p.y, seed: i })));

export const clampCurtain = value => Math.max(0, Math.min(1, Number.isFinite(value) ? value : CURTAIN_START));
export const curtainShift = position => (clampCurtain(position) - CURTAIN_ALIGNMENT) * CURTAIN_TRAVEL;
export const curtainLeft = position => -0.3 + curtainShift(position);

export function tearOutline(hole, shift = 0) {
  return Array.from({ length: 16 }, (_, i) => {
    const a = i * Math.PI / 8;
    const ragged = 1 + Math.sin(i * 7.3 + hole.seed * 3) * 0.085;
    return { x: hole.x + shift + Math.cos(a) * 0.040 * ragged, y: hole.y + Math.sin(a) * 0.061 * ragged };
  });
}

export function insidePolygon(point, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function curtainLightAt(point, position) {
  if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) return false;
  const left = curtainLeft(position);
  return point.x < left || point.x > left + CURTAIN_WIDTH ||
    CURTAIN_HOLES.some(hole => insidePolygon(point, tearOutline(hole, curtainShift(position))));
}

export function curtainLayout(width, height) {
  const size = Math.min(width * 0.62, height * 0.44);
  const ww = Math.min(width * 0.37, height * 0.36);
  const window = { x: width * 0.5 - ww / 2, y: height * 0.07, w: ww, h: height * 0.365 };
  return { width, height, horizon: height * 0.465, window,
    patch: { x: (width - size) / 2, y: height * 0.505, size } };
}
