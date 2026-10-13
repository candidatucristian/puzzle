// One clock drives the latch, the heavy leaf and the approach to the doorway.
// The quintic curve starts and ends with zero velocity and acceleration.
export const DOOR_LATCH_MS = 150;
export const DOOR_SWING_MS = 1320;
export const DOOR_WALK_START_MS = 760;
export const DOOR_LENGTH = 0.5;
const OPEN_ANGLE = 78 * Math.PI / 180;
const clamp = (value) => Math.max(0, Math.min(1, value));
const settle = (value) => {
  const t = clamp(value);
  return t * t * t * (10 + t * (-15 + t * 6));
};

export function doorMotion(elapsed) {
  return {
    angle: OPEN_ANGLE * settle((elapsed - DOOR_LATCH_MS) / DOOR_SWING_MS),
    handle: settle(elapsed / DOOR_LATCH_MS) * (1 - settle((elapsed - 300) / 360)),
  };
}

/** A rigid leaf hung on the near jamb, using the hall's existing projection.
 *  `point` addresses the wood in physical coordinates. `surface` preserves
 *  the original painted panel positions exactly when the door is shut. */
export function projectDoor(L, d, angle) {
  const length = DOOR_LENGTH, tall = L.floor - L.doorTop, wide = tall * 0.43;
  const sin = Math.sin(angle), cos = Math.cos(angle);
  const point = (along, down, thickness = 0) => L.P(
    d.side * (L.wall + wide * (along * sin + thickness * cos)),
    L.doorTop + tall * down,
    d.z + length * (along * cos - thickness * sin),
  );
  const physical = (along) => along * d.z / (d.z + length * (1 - along));
  const surface = (along, down) => point(physical(along), down);
  const quad = [point(0, 0), point(1, 0), point(1, 1), point(0, 1)];
  const edge = [quad[1], point(1, 0, 0.045), point(1, 1, 0.045), quad[2]];
  const visible = clamp((quad[1].x - quad[0].x) / (d.quad[1].x - d.quad[0].x));
  return { point, surface, quad, edge, visible, aperture: 1 - visible };
}
