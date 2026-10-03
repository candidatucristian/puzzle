// One distance unit scales uniformly in both axes: the fronts remain circles
// at every viewport size. Each trio of drops meets at one engraved stone.
export const RIPPLE_SOURCES = Object.freeze([
  { x: 0.125, y: 0.09 }, { x: 0.875, y: 0.09 }, { x: 0.5, y: 0.94 },
].map(Object.freeze));
export const RIPPLE_SPEED = 0.00027;
export const RIPPLE_MEET_MS = 3200;
export const RIPPLE_ROUND_MS = 5600;
export const RIPPLE_BAND = 0.007;

const letters = ["SNTAVHE", "LQBDKMF", "WURGXIZ", "EFYSAJB", "TKHCOQN", "VMSPLAU", "BCENRFX"];
export const RIPPLE_STONES = Object.freeze(letters.flatMap((row, r) => [...row].map((letter, c) => Object.freeze({
  id: `${r}-${c}`, letter, x: (c + 1) / 8, y: 0.15 + r * 0.7 / 6,
}))));
export const RIPPLE_TARGETS = Object.freeze(["1-3", "2-2", "4-4", "5-3"].map(id => RIPPLE_STONES.find(s => s.id === id)));
export const RIPPLE_CYCLE_MS = RIPPLE_ROUND_MS * RIPPLE_TARGETS.length;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function dropTimes(round) {
  return RIPPLE_SOURCES.map(source => RIPPLE_MEET_MS - distance(source, RIPPLE_TARGETS[round]) / RIPPLE_SPEED);
}

export function rippleFrame(time) {
  const cycleTime = ((time % RIPPLE_CYCLE_MS) + RIPPLE_CYCLE_MS) % RIPPLE_CYCLE_MS;
  const round = Math.floor(cycleTime / RIPPLE_ROUND_MS);
  const localTime = cycleTime % RIPPLE_ROUND_MS;
  return {
    round, localTime,
    waves: RIPPLE_SOURCES.map((source, i) => {
      const age = localTime - dropTimes(round)[i];
      return { ...source, age, radius: Math.max(0, age * RIPPLE_SPEED), active: age >= 0 };
    }),
  };
}

// Find the closest agreement of three arrival times at ANY stone. Rendering
// uses this same distance calculation for every engraving, including decoys.
export function convergence(point, round) {
  const arrivals = dropTimes(round).map((drop, i) => drop + distance(RIPPLE_SOURCES[i], point) / RIPPLE_SPEED);
  const at = arrivals.reduce((sum, t) => sum + t, 0) / arrivals.length;
  const error = arrivals.reduce((sum, t) => sum + ((t - at) * RIPPLE_SPEED) ** 2, 0) / arrivals.length;
  return { at, strength: Math.exp(-error / RIPPLE_BAND ** 2) };
}

export function readConvergences() {
  return RIPPLE_STONES.filter(stone => RIPPLE_TARGETS.some((_, r) => convergence(stone, r).strength > 0.55))
    .sort((a, b) => a.y - b.y).map(stone => stone.letter).join("");
}

export function rippleLayout(width, height) {
  const size = Math.min(width * 0.92, height * 0.82);
  return { width, height, size, x: (width - size) / 2, y: (height - size) / 2 + height * 0.015 };
}
