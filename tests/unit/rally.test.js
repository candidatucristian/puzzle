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

test("Rally door numbers in crossing order spell the configured answer", () => {
  assert.deepEqual([...RALLY_NUMBERS], [19, 9, 12, 22, 5, 18]);
  assert.deepEqual(rallyLetters(), ["S", "I", "L", "V", "E", "R"]);
  assert.equal(rallyWord(), "SILVER");
  assert.equal(rallyWord(), LEVEL_METADATA.find(({ id }) => id === "rally").code);
  assert.ok(RALLY_NUMBERS.every((number) => Number.isInteger(number) && number >= 1 && number <= 26));
});

test("Rally preserves the exact bunch spacing and never ties cars at the line", () => {
  assert.deepEqual([...RALLY_CROSS_MS], [0, 3000, 3420, 6420, 7170, 7590]);
  const gaps = RALLY_CROSS_MS.slice(1).map((cross, i) => cross - RALLY_CROSS_MS[i]);
  assert.deepEqual(gaps, [3000, 420, 3000, 750, 420]);
  assert.ok(gaps.every((gap) => gap > 0));
  assert.equal(RALLY_SPEED.length, RALLY_NUMBERS.length);
  assert.ok(new Set(RALLY_SPEED).size > 1);
});

test("resizing changes speed but preserves crossing order, readable durations and sound alignment", () => {
  for (const [width, height] of [[640, 480], [1100, 720], [1920, 1080]]) {
    const carLength = Math.min(width * 0.075, height * 0.13);
    const finishX = width * 0.6;
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
        assert.ok(visibleMs >= 3400 && visibleMs <= 3800);
      }
      assert.equal(lightsOut - plan.at(-1).cross, 350);
      assert.equal(podiumAt - lightsOut, 1800);
    }
  }
});

test("Rally's close pairs remain visibly separated throughout the screen crossing", () => {
  const width = 1100;
  const carLength = Math.min(width * 0.075, 720 * 0.13);
  const x0 = -carLength * 0.7;
  const x1 = width + carLength * 0.7;
  const { plan } = planRallyRound({ width, carLength, finishX: 660, soundLead: 625 });
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
