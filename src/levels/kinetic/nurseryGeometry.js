/** The nursery, like Overtime, uses centimetres and a single pinhole camera.
 * Local crib coordinates rotate around its centre before projection. */
export function nurseryLayout(width, height) {
  const focal = Math.min(height * 0.95, width * 0.99);
  const cx = width * 0.46, horizon = height * 0.22, eye = 180;
  const P = (x, y, z) => ({ x: cx + focal * x / z, y: horizon + focal * (eye - y) / z });
  const yaw = 0.30;
  const world = (u, y, v) => ({
    x: -27 + u * Math.cos(yaw) + v * Math.sin(yaw),
    y,
    z: 285 - u * Math.sin(yaw) + v * Math.cos(yaw),
  });
  const crib = (u, y, v) => { const q = world(u, y, v); return P(q.x, q.y, q.z); };
  const winW = Math.min(width * 0.34, height * 0.40);
  const win = { x: width * 0.95 - winW, y: height * 0.047, w: winW, h: height * 0.49 };
  win.arch = Math.min(win.w * 0.5, win.h * 0.34);
  return { width, height, focal, cx, horizon, eye, P, crib, world, win, floor: P(0, 0, 490).y };
}
