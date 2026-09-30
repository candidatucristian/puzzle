import test from "node:test";
import assert from "node:assert/strict";
import { layoutStage, groundLight, trackCoords, CAR_LANES } from "../../src/levels/rally/stage.js";
import {
  relativeYaw,
  frameAt,
  frameYaw,
  renderCars,
  FRAME_COUNT,
  YAW_FIRST,
  YAW_STEP,
  NUMBER_PANEL,
  LIVERIES,
} from "../../src/levels/rally/cars.js";

// the level's canvas at a few real window sizes, portrait included
const SIZES = [
  [1072, 778],
  [1360, 900],
  [1920, 1080],
  [640, 480],
  [910, 876],
];

// u along the drive at which a car in `lane` stands at screen x
function uAtX(L, lane, x) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (L.carAt(mid, lane).x < x) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

test("every car is read side-on at the line, from one crisp view", () => {
  for (const [W, H] of SIZES) {
    const L = layoutStage(W, H);
    for (const lane of CAR_LANES) {
      const at = L.carAt(0.5, lane);
      assert.ok(Math.abs(at.x - W / 2) < 1e-6, "the line is where the timing says");
      const yaw = relativeYaw(at.wx, at.wz, at.heading);
      assert.ok(Math.abs(yaw + 90) < 1e-9, `side-on at the line (yaw ${yaw})`);
      const { i, t } = frameAt(yaw);
      assert.equal(t, 0, "no cross-fade while the number is read");
      assert.equal(frameYaw(i), -90);
    }
  }
});

test("round the bend the car turns: front first, side at the line, tail last", () => {
  const last = YAW_FIRST + (FRAME_COUNT - 1) * YAW_STEP;
  for (const [W, H] of SIZES) {
    const L = layoutStage(W, H);
    for (const lane of CAR_LANES) {
      let prev = Infinity;
      for (let u = 0; u <= 1.0001; u += 0.01) {
        const at = L.carAt(u, lane);
        const yaw = relativeYaw(at.wx, at.wz, at.heading);
        assert.ok(yaw < prev, "the view only ever swings one way");
        prev = yaw;
        // while any of the car is on screen (half a car, and the lamp pod,
        // either side of its centre), its view has been rendered
        const half = L.carLenPx * at.scale * 0.56;
        if (at.x > -half && at.x < W + half) {
          assert.ok(yaw >= YAW_FIRST - 1e-9 && yaw <= last + 1e-9, `yaw ${yaw.toFixed(1)} at u=${u.toFixed(2)}`);
        }
      }
    }
  }
});

test("the stage knows exactly how far every ground point is from the racing line", () => {
  // against a brute-force search round the oval — including the infield
  // corners by the masts, where a plain Newton iteration used to diverge
  const T = layoutStage(1360, 900).T;
  const out = {};
  const truth = (wx, wz) => {
    let best = Infinity;
    for (let i = 0; i < 20000; i++) {
      const th = (i / 20000) * 2 * Math.PI;
      best = Math.min(best, Math.hypot(wx - T.A * Math.cos(th), wz - T.ZC - T.RZ * Math.sin(th)));
    }
    return (wx / T.A) ** 2 + ((wz - T.ZC) / T.RZ) ** 2 < 1 ? -best : best;
  };
  let worst = 0;
  for (let wz = 4; wz < 15; wz += 0.37) {
    for (let wx = -0.55 * wz; wx < 0.55 * wz; wx += 0.37) {
      const d = truth(wx, wz);
      if (Math.abs(d) > T.TW + 0.6) continue;
      worst = Math.max(worst, Math.abs(trackCoords(T, wx, wz, out).d - d));
    }
  }
  assert.ok(worst < 1e-3, "worst error " + worst);
});

test("the floodlights are aimed at the line: brightest where the numbers are read", () => {
  for (const [W, H] of SIZES) {
    const L = layoutStage(W, H);
    const atLine = groundLight(L, 0, L.wzFinish);
    assert.ok(Math.abs(atLine - 1) < 1e-9);
    for (const lane of CAR_LANES) {
      for (const x of [W * 0.05, W * 0.95]) {
        const at = L.carAt(uAtX(L, lane, x), lane);
        assert.ok(groundLight(L, at.wx, at.wz) < atLine, "the edges of the screen are darker than the line");
      }
    }
  }
});

test("nothing in front of the track ever covers a car", () => {
  // the bales and the near photocell stand on our side of the track: their
  // tops must stay below the wheels of a car on the nearest line, wherever
  const nearest = Math.max(...CAR_LANES);
  for (const [W, H] of SIZES) {
    const L = layoutStage(W, H);
    const fronts = [
      ...L.bales.map((b) => ({ x: b.x, z: b.z, h: 0.45 * L.m })),
      { ...L.cellNear, h: 1.0 * L.m },
    ];
    for (const f of fronts) {
      const top = L.P(f.x, f.h, f.z);
      if (top.x < 0 || top.x > W) continue;
      const car = L.carAt(uAtX(L, nearest, top.x), nearest);
      assert.ok(top.y > car.y, `something at x=${top.x.toFixed(0)} reaches y=${top.y.toFixed(1)}, above a wheel at ${car.y.toFixed(1)} (${W}x${H})`);
    }
  }
});

test("the crowd, the marshal and the finish board stand off the track", () => {
  for (const [W, H] of SIZES) {
    const L = layoutStage(W, H);
    const T = L.T;
    const d = (x, z) => trackCoords(T, x, z, {}).d;
    for (const c of L.crowd) assert.ok(d(c.x, c.z) < -(T.TW + 0.12), "a spectator stands behind the tape");
    for (const run of L.tapeRuns) for (const p of run) assert.ok(d(p.x, p.z) < -T.TW, "the tape is off the gravel");
    assert.ok(d(L.marshal.x, L.marshal.z) < -T.TW);
    assert.ok(d(L.sign.x, L.sign.z) < -T.TW);
    assert.ok(d(L.hut.x, L.hut.z) < -T.TW - L.hut.d / 2);
    for (const q of L.masts) assert.ok(Math.abs(d(q.x, q.z)) > T.TW + 0.2, "a mast stands clear of the track");
    assert.ok(L.crowd.length > 12, "there is a crowd at the line");
  }
});

test("a rendered car is exactly as long as the track says, standing on its anchor, number toward us", () => {
  const carLenPx = 60;
  const white = { w: 8, h: 8, data: new Uint8ClampedArray(8 * 8 * 4).fill(255) };
  const set = renderCars({ carLenPx, pitchDeg: 8, res: 1, panels: LIVERIES.map(() => white) });
  const side = frameAt(-90).i;
  const { cell } = set;
  // the black car: a lit white panel on it can only be the number
  const img = set.images[5][side];
  let x0 = Infinity;
  let x1 = -Infinity;
  let yLow = -Infinity;
  for (let y = 0; y < cell.h; y++) {
    for (let x = 0; x < cell.w; x++) {
      if (img[(y * cell.w + x) * 4 + 3] !== 255) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      yLow = Math.max(yLow, y);
    }
  }
  const length = x1 - x0 + 1;
  assert.ok(length / carLenPx > 0.98 && length / carLenPx < 1.07, "rendered length " + length);
  assert.ok(Math.abs((x0 + x1 + 1) / 2 - cell.ax) < carLenPx * 0.03, "centred on its anchor");
  assert.ok(Math.abs(yLow + 0.5 - cell.ay) < 2.5, "the tyres touch the ground at the anchor");
  // the panel's middle, on the door facing the camera
  const ppm = carLenPx / 4.12;
  const px = Math.round(cell.ax + ((NUMBER_PANEL.x0 + NUMBER_PANEL.x1) / 2) * ppm);
  const py = Math.round(cell.ay - ((NUMBER_PANEL.y0 + NUMBER_PANEL.y1) / 2) * ppm * Math.cos((8 * Math.PI) / 180));
  let sum = 0;
  let n = 0;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const o = ((py + dy) * cell.w + px + dx) * 4;
      sum += (img[o] + img[o + 1] + img[o + 2]) / 3;
      n++;
    }
  }
  assert.ok(sum / n > 170, "the number panel is lit and faces us (" + (sum / n).toFixed(0) + ")");
});
