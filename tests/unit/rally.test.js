import test from "node:test";
import assert from "node:assert/strict";
import { LEVEL_METADATA } from "../../src/levels/metadata.js";
import {
  RALLY_NUMBERS,
  RALLY_CROSS_MS,
  RALLY_SPEED,
  RALLY_SOUND_LEAD_MS,
  rallyLetters,
  rallyWord,
  measureWhooshLead,
  planRallyRound,
} from "../../src/levels/rally/puzzle.js";
import { makeTrack, checkPerspective } from "../../src/levels/rally/track.js";
import { layoutStage } from "../../src/levels/rally/stage.js";

test("Rally door numbers in crossing order spell the configured answer", () => {
  assert.deepEqual([...RALLY_NUMBERS], [19, 9, 12, 22, 5, 18]);
  assert.deepEqual(rallyLetters(), ["S", "I", "L", "V", "E", "R"]);
  assert.equal(rallyWord(), "SILVER");
  assert.equal(rallyWord(), LEVEL_METADATA.find(({ id }) => id === "rally").code);
  assert.ok(RALLY_NUMBERS.every((number) => Number.isInteger(number) && number >= 1 && number <= 26));
});

test("Rally runs the bunch schedule at 77% of base pace and never ties cars at the line", () => {
  assert.deepEqual([...RALLY_CROSS_MS], [0, 3000, 3420, 6420, 7170, 7590].map((ms) => ms / 0.77));
  const gaps = RALLY_CROSS_MS.slice(1).map((cross, i) => cross - RALLY_CROSS_MS[i]);
  assert.deepEqual(gaps.map((gap) => Math.round(gap)), [3896, 545, 3896, 974, 545]);
  assert.ok(gaps.every((gap) => gap > 0));
  assert.equal(RALLY_SPEED.length, RALLY_NUMBERS.length);
  assert.ok(new Set(RALLY_SPEED).size > 1);
});

test("resizing changes speed but preserves crossing order, readable durations and sound alignment", () => {
  for (const [width, height] of [[640, 480], [1100, 720], [1920, 1080]]) {
    const { carLenPx: carLength, finishX } = layoutStage(width, height);
    const x0 = -carLength * 0.7;
    for (const soundLead of [0, 625, 1800]) {
      const { plan, base, lightsOut, podiumAt } = planRallyRound({ width, carLength, finishX, soundLead });
      assert.deepEqual(plan.map((car) => car.cross), [...RALLY_CROSS_MS]);
      for (const car of plan) {
        const reach = (finishX - x0) / car.speed;
        assert.ok(Math.abs(car.launch + reach - car.cross) < 1e-6);
        assert.equal(car.whoosh + soundLead, car.cross);
        assert.ok(car.launch + base >= 0 && car.whoosh + base >= 0);
        const visibleMs = car.gone - car.launch;
        assert.ok(visibleMs >= 4500 && visibleMs <= 4800);
      }
      assert.equal(lightsOut - plan.at(-1).cross, 350);
      assert.equal(podiumAt - lightsOut, 1800);
    }
  }
});

test("Rally's close pairs remain visibly separated throughout the screen crossing", () => {
  const width = 1100;
  const { carLenPx: carLength, finishX } = layoutStage(width, 720);
  const x0 = -carLength * 0.7;
  const x1 = width + carLength * 0.7;
  const { plan } = planRallyRound({ width, carLength, finishX, soundLead: 625 });
  for (const [lead, follow] of [[1, 2], [4, 5]]) {
    const first = plan[lead];
    const second = plan[follow];
    for (let time = first.launch; time <= second.gone; time += 5) {
      const xa = x0 + first.speed * (time - first.launch);
      const xb = x0 + second.speed * (time - second.launch);
      if (xb < x0 || xa > x1) continue;
      assert.ok(xa - xb > carLength * 1.05, `pair ${lead}-${follow} at ${time} ms`);
    }
  }
});

test("the measured loudest recording window lands on every car's crossing", () => {
  const samples = new Float32Array(2000);
  samples.fill(0.2, 300, 700);
  samples.fill(0.9, 700, 750);
  const lead = measureWhooshLead(samples, 1000);
  assert.equal(lead, 725);
  const { plan } = planRallyRound({ width: 1100, carLength: 176, finishX: 660, soundLead: lead });
  for (const car of plan) assert.equal(car.whoosh + lead, car.cross);
});

test("silent, missing or unreadable recordings use the existing 600 ms fallback", () => {
  assert.equal(RALLY_SOUND_LEAD_MS, 600);
  assert.equal(measureWhooshLead(null, 1000), 600);
  assert.equal(measureWhooshLead(new Float32Array(), 1000), 600);
  assert.equal(measureWhooshLead(new Float32Array(2000), 1000), 600);
  assert.equal(measureWhooshLead(new Float32Array(2000), NaN), 600);
  assert.equal(measureWhooshLead(new Float32Array(2000), 0), 600);
});

test("the track is one projection: a car's size always follows its height below the horizon", () => {
  for (const [width, height] of [[640, 480], [910, 876], [1400, 800], [1920, 1080]]) {
    const track = makeTrack(width, height);
    // the rule the whole scene rests on — size is set by depth, nothing else
    assert.ok(checkPerspective(track) < 1e-9, "perspective drifts at " + width + "x" + height);

    // the drive enters and leaves off screen, and never doubles back
    let last = -Infinity;
    for (let i = 0; i <= 100; i++) {
      const c = track.centre(i / 100);
      assert.ok(c.x > last, "x must advance the whole way");
      last = c.x;
    }
    assert.ok(track.centre(0).x < 0 && track.centre(1).x > width);

    // the car is at its biggest, and so most readable, on the finish line
    const atFinish = track.scaleAt(track.finishU);
    for (let i = 0; i <= 100; i++) {
      assert.ok(track.scaleAt(i / 100) <= atFinish + 1e-9);
    }
    assert.equal(Math.round(atFinish * 1e9) / 1e9, 1);

    // and it never shrinks so far that the number stops being legible
    let smallest = Infinity;
    for (let i = 0; i <= 100; i++) smallest = Math.min(smallest, track.scaleAt(i / 100));
    assert.ok(smallest > 0.8, "a car shrinks to " + smallest.toFixed(2) + " of its size");

    // the near side of the oval really is nearer than the far side
    const near = track.edges(0.5).near.y;
    const far = track.edges(0.5).far.y;
    assert.ok(near > far && far > track.horizonY);
    assert.ok(track.scaleAtY(near) > track.scaleAtY(far));
  }
});
