/** A level's render laid over a screen W × H: covering it, centred — and
 *  moved, if it has to be, just enough to keep what matters in view (`safe`:
 *  [x, y, w, h] in the render's reference pixels). `spec` is the render's
 *  layout as Blender wrote it ({ width, height, safe }). Returns the scale and
 *  where the render's corner falls, and `at` to place a reference point. */
export function fitRender(W, H, spec) {
  const s = Math.max(W / spec.width, H / spec.height);
  const [sx, sy, sw, sh] = spec.safe;
  const along = (view, size, a, b) => {
    const centred = (view - size * s) / 2;
    const lo = Math.max(view - size * s, -a * s), hi = Math.min(0, view - (a + b) * s);
    return lo <= hi ? Math.min(hi, Math.max(lo, centred)) : centred;
  };
  const x = along(W, spec.width, sx, sw), y = along(H, spec.height, sy, sh);
  return { s, x, y, at: ([px, py]) => ({ x: x + px * s, y: y + py * s }) };
}
