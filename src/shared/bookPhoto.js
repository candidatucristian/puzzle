import { makeCanvas } from "./paint.js";

// The photographed open book (assets/images/Molecules/notebook-open.webp) was
// saved with a grey-and-white chequer baked in round it, where it was meant to
// be transparent. Cleared here once per image: from the picture's edges
// inward, every pixel that is light and colourless (the chequer) is made
// clear, so the book lies on whatever table it is put on. The book itself —
// green cloth, cream pages — is never colourless, so the clearing stops at
// its edge.
const cleaned = new WeakMap();

export function cleanBookPhoto(photo) {
  if (!photo) return photo;
  if (cleaned.has(photo)) return cleaned.get(photo);
  const W = photo.width, H = photo.height;
  const canvas = makeCanvas(W, H), g = canvas.getContext("2d", { willReadFrequently: true });
  g.drawImage(photo, 0, 0);
  const image = g.getImageData(0, 0, W, H), d = image.data;
  const chequer = (p) => {
    const i = p * 4, r = d[i], gr = d[i + 1], b = d[i + 2];
    return Math.min(r, gr, b) > 150 && Math.max(r, gr, b) - Math.min(r, gr, b) < 14;
  };
  const seen = new Uint8Array(W * H), stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    seen[p] = 1;
    if (!chequer(p)) continue;
    d[p * 4 + 3] = 0;
    const x = p % W;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (p >= W) stack.push(p - W);
    if (p < W * (H - 1)) stack.push(p + W);
  }
  // the pixels at the edge of what was cleared, half-tone between book and
  // chequer: softened, so no pale fringe is left round the book
  for (let p = 0; p < W * H; p++) {
    if (d[p * 4 + 3] === 0) continue;
    const x = p % W;
    const near = (x > 0 && d[(p - 1) * 4 + 3] === 0) || (x < W - 1 && d[(p + 1) * 4 + 3] === 0)
      || (p >= W && d[(p - W) * 4 + 3] === 0) || (p < W * (H - 1) && d[(p + W) * 4 + 3] === 0);
    if (near) d[p * 4 + 3] = 110;
  }
  g.putImageData(image, 0, 0);
  cleaned.set(photo, canvas);
  return canvas;
}
