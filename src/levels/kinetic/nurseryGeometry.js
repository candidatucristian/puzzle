/** The nursery seen from above, standing at the foot of the crib: a single
 * pinhole camera, raised and tilted down, so the crib's rails close in toward
 * the floor and we look over them onto the sleeping baby. World units are
 * centimetres: x across, y up from the floor, z away from us. The crib has
 * its own local frame — u across it, v along it (the head end at +v) —
 * turned a little on the floor. */
export function nurseryLayout(width, height) {
  const focal = Math.min(height * 1.08, width * 0.92);
  const cx = width * 0.5, cy = height * 0.5;
  const eye = { x: 0, y: 238, z: 0 };
  const pitch = 0.56; // how far the camera looks down
  const sp = Math.sin(pitch), cp = Math.cos(pitch);
  const P = (x, y, z) => {
    const dx = x - eye.x, dy = y - eye.y, dz = z - eye.z;
    const depth = dz * cp - dy * sp;
    const up = dy * cp + dz * sp;
    return { x: cx + (focal * dx) / depth, y: cy - (focal * up) / depth, s: focal / depth };
  };
  const crib0 = { x: 6, z: 196 }, yaw = 0.1;
  const world = (u, y, v) => ({
    x: crib0.x + u * Math.cos(yaw) + v * Math.sin(yaw),
    y,
    z: crib0.z - u * Math.sin(yaw) + v * Math.cos(yaw),
  });
  const crib = (u, y, v) => { const q = world(u, y, v); return P(q.x, q.y, q.z); };
  const size = { u: 38, v: 68, rail: 96, mattress: 50 };
  // the sleeping baby's head, at the head end of the mattress
  const head = crib(-2, size.mattress + 12, 42);
  // the far wall and its window, the moon in it
  const wallZ = 470;
  const w0 = P(112, 126, wallZ), w1 = P(236, 42, wallZ);
  const win = { x: w0.x, y: w0.y, w: w1.x - w0.x, h: w1.y - w0.y };
  win.arch = Math.min(win.w * 0.5, win.h * 0.4);
  return { width, height, focal, cx, cy, eye, pitch, P, crib, world, yaw, size, head, wallZ, win, floor: P(0, 0, wallZ).y };
}
