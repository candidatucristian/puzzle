import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutHall } from '../../src/levels/hall/hall.js';
import { doorMotion, projectDoor, DOOR_LATCH_MS, DOOR_SWING_MS, DOOR_LENGTH } from '../../src/levels/hall/doorMotion.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('the latch releases before the leaf moves; the heavy leaf starts and settles smoothly', () => {
  assert.equal(doorMotion(0).angle, 0);
  assert.equal(doorMotion(DOOR_LATCH_MS).angle, 0);
  assert.equal(doorMotion(DOOR_LATCH_MS).handle, 1);
  const end = DOOR_LATCH_MS + DOOR_SWING_MS;
  const opened = doorMotion(end);
  assert.equal(opened.handle, 0);
  assert.deepEqual(doorMotion(end + 500), opened);
  assert.ok(doorMotion(DOOR_LATCH_MS + 1).angle < 1e-7);
  assert.ok(opened.angle - doorMotion(end - 1).angle < 1e-7);
  let previous = 0;
  // Sample at 240 Hz: there must be no held frames or angle jumps.
  for (let ms = DOOR_LATCH_MS + 1000 / 240; ms < end; ms += 1000 / 240) {
    const angle = doorMotion(ms).angle;
    assert.ok(angle > previous);
    assert.ok(angle - previous < 0.01);
    previous = angle;
  }
});

for (const [W, H] of [[740, 560], [1180, 822], [2560, 1440]]) {
  test(`door geometry at ${W}×${H} preserves the shut artwork, hinges and rigid leaf`, () => {
    const L = layoutHall(W, H);
    for (const d of L.doors) {
      const shut = projectDoor(L, d, 0);
      for (let i = 0; i < 4; i++) {
        close(shut.quad[i].x, d.quad[i].x);
        close(shut.quad[i].y, d.quad[i].y);
      }
      for (const a of [0.1, 0.46, 0.54, 0.86, 0.9]) {
        const p = shut.surface(a, 0.53);
        const [tl, tr, br, bl] = d.quad;
        close(p.x, tl.x + (tr.x - tl.x) * a);
        close(p.y, (tl.y + (tr.y - tl.y) * a) * 0.47 + (bl.y + (br.y - bl.y) * a) * 0.53);
      }
      const wide = (L.floor - L.doorTop) * 0.43;
      let visible = 1;
      for (let angle = 0; angle <= 1.4; angle += 0.01) {
        const pose = projectDoor(L, d, angle);
        assert.deepEqual(pose.quad[0], d.quad[0]);
        assert.deepEqual(pose.quad[3], d.quad[3]);
        assert.ok(pose.visible <= visible + 1e-12);
        visible = pose.visible;
        // Undo the hall projection to verify the free edge stays one
        // physical door-width from its hinge throughout the rotation.
        const edge = pose.point(1, 0.5), z = 1 / edge.s;
        const x = (edge.x - L.vp.x) * z - d.side * L.wall;
        const depth = (z - d.z) * wide / DOOR_LENGTH;
        close(Math.hypot(x, depth), wide);
      }
      assert.equal(visible, 0);
    }
    for (let i = 0; i < 3; i++) {
      for (const angle of [0, 0.15, 0.5, 1.2]) {
        const left = projectDoor(L, L.doors[i], angle);
        const right = projectDoor(L, L.doors[i + 3], angle);
        left.quad.forEach((point, n) => {
          close(point.x + right.quad[n].x, W);
          close(point.y, right.quad[n].y);
        });
      }
    }
  });
}
