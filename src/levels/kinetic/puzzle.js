// The games cupboard: four board-game boxes standing face out on its middle
// shelf, left to right, and on each lid one big painted game piece. Count
// each piece's straight sides — one unbroken curve counts as one — and read
// the counts as letters: 3, 1, 7, 5 → C A G E.
export const GAME_LIDS = Object.freeze([
  { id: 'gl_triangle', kind: 'triangle', sides: 3, rimCount: 3, piece: '#e8735a', box: '#5a1e22' },
  { id: 'gl_circle', kind: 'circle', sides: 0, rimCount: 1, piece: '#f2c53d', box: '#1e2e5a' },
  { id: 'gl_heptagon', kind: 'heptagon', sides: 7, rimCount: 7, piece: '#3fae94', box: '#4a2a14' },
  { id: 'gl_pentagon', kind: 'pentagon', sides: 5, rimCount: 5, piece: '#4a74c8', box: '#1e4030' },
].map(Object.freeze));

export function polygonVertices(sides, radius, angle = -Math.PI / 2) {
  if (!Number.isInteger(sides) || sides < 3) return [];
  return Array.from({ length: sides }, (_, i) => ({
    x: Math.cos(angle + i * Math.PI * 2 / sides) * radius,
    y: Math.sin(angle + i * Math.PI * 2 / sides) * radius,
  }));
}

/** Where everything is: the cupboard in the middle of the picture, its three
 *  shelves, the four lids standing on the middle one with their pieces, and
 *  the card pinned inside the right-hand door. */
export function cupboardLayout(W, H) {
  const u = Math.min(W / 1000, H / 700);
  const cw = Math.min(W * 0.6, H * 0.86);
  const x0 = W / 2 - cw / 2, x1 = W / 2 + cw / 2;
  const y0 = H * 0.07, y1 = H * 0.93, ch = y1 - y0;
  const frame = cw * 0.045;
  const inner = { x0: x0 + frame, x1: x1 - frame, y0: y0 + frame * 1.6, y1: y1 - frame * 1.4 };
  const ih = inner.y1 - inner.y0, iw = inner.x1 - inner.x0;
  const shelves = [inner.y0 + ih * 0.3, inner.y0 + ih * 0.68];
  // the lids: as tall as the middle compartment lets them be, side by side
  const gap = iw * 0.03;
  const lw = Math.min((iw - gap * 5) / 4, (shelves[1] - shelves[0]) * 0.86 * 0.78);
  const lh = lw / 0.78;
  const row = lw * 4 + gap * 3, lx0 = W / 2 - row / 2;
  const lids = GAME_LIDS.map((lid, i) => {
    const x = lx0 + i * (lw + gap);
    const y = shelves[1] - lh;
    return { ...lid, x, y, w: lw, h: lh, cx: x + lw / 2, cy: y + lh * 0.52, r: lw * 0.3 };
  });
  // the doors stand open either side; the card is pinned inside the right one
  const door = { w: cw * 0.22 };
  const card = { x: x1 + door.w * 0.12, y: y0 + ch * 0.34, w: door.w * 0.76, h: door.w * 0.5 };
  return { W, H, width: W, height: H, u, x0, x1, y0, y1, frame, inner, shelves, lids, door, card };
}

/** Reading order is spatial — left to right along the shelf. */
export function readKinetic() {
  return [...cupboardLayout(1000, 700).lids].sort((a, b) => a.x - b.x)
    .map(lid => String.fromCharCode(64 + lid.rimCount)).join('');
}
