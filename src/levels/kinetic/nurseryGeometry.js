/** A small nursery, seen from the crib's long side and a little from above:
 * a single pinhole camera standing in the room, tilted gently down, so the
 * crib is in profile with its far rail showing over the near one, and the
 * two side walls close in at the edges of the picture. World units are
 * centimetres: x across, y up from the floor, z away from us. The crib has
 * its own local frame — u across it (toward us), v along it (the head end
 * at +v, to the right) — turned almost square to the back wall. */
export function nurseryLayout(width, height) {
  const focal = Math.min(height * 1.2, width * 0.8);
  const cx = width * 0.5, cy = height * 0.42;
  const eye = { x: 0, y: 170, z: 0 };
  const pitch = 0.34; // how far the camera looks down
  const sp = Math.sin(pitch), cp = Math.cos(pitch);
  const P = (x, y, z) => {
    const dx = x - eye.x, dy = y - eye.y, dz = z - eye.z;
    const depth = dz * cp - dy * sp;
    const up = dy * cp + dz * sp;
    return { x: cx + (focal * dx) / depth, y: cy - (focal * up) / depth, s: focal / depth };
  };
  const crib0 = { x: 4, z: 240 }, yaw = Math.PI / 2 - 0.08;
  const world = (u, y, v) => ({
    x: crib0.x + u * Math.cos(yaw) + v * Math.sin(yaw),
    y,
    z: crib0.z - u * Math.sin(yaw) + v * Math.cos(yaw),
  });
  const crib = (u, y, v) => { const q = world(u, y, v); return P(q.x, q.y, q.z); };
  const size = { u: 38, v: 68, rail: 96, mattress: 50 };
  // the sleeping baby's head, at the head end of the mattress
  const head = crib(0, size.mattress + 12, 42);
  // the room: the back wall close behind the crib, a side wall at either hand
  const wallZ = 335, sideX = 178;
  // the window in the back wall, the moon in it, over the dresser
  const w0 = P(-156, 164, wallZ), w1 = P(-66, 86, wallZ);
  const win = { x: w0.x, y: w0.y, w: w1.x - w0.x, h: w1.y - w0.y };
  win.arch = Math.min(win.w * 0.5, win.h * 0.4);
  // the floor lamp in the far right corner: the room's one warm light
  const lampAt = { x: 132, z: 306, shade: 148 };
  const lamp = P(lampAt.x, lampAt.shade + 12, lampAt.z);
  return {
    width, height, focal, cx, cy, eye, pitch, P, crib, world, yaw, size, head,
    wallZ, sideX, win, lampAt, lamp, floor: P(0, 0, wallZ).y,
  };
}
