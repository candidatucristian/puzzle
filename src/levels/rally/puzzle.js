// The puzzle is the order at the finish line, independently of rendering speed.
export const RALLY_NUMBERS = Object.freeze([19, 9, 12, 22, 5, 18]);
export const RALLY_CROSS_MS = Object.freeze([0, 3000, 3420, 6420, 7170, 7590]);
export const RALLY_SPEED = Object.freeze([1, 0.99, 1.01, 1.02, 0.98, 1.0]);
export const RALLY_CAR_MS = 3600;
export const RALLY_START_DELAY_MS = 900;
export const RALLY_LIGHTS_OUT_DELAY_MS = 350;
export const RALLY_PODIUM_MS = 1800;
export const RALLY_SOUND_LEAD_MS = 600;
export const RALLY_SOUND_WINDOW_MS = 50;

export function rallyLetters() {
  return RALLY_NUMBERS.map((number) => String.fromCharCode(64 + number));
}

export function rallyWord() {
  return rallyLetters().join("");
}

/** Centre of the loudest 50 ms energy window, measured from decoded PCM samples. */
export function measureWhooshLead(samples, sampleRate) {
  if (!samples?.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return RALLY_SOUND_LEAD_MS;
  const win = Math.max(1, Math.round(sampleRate * RALLY_SOUND_WINDOW_MS / 1000));
  let best = 0;
  let bestAt = -1;
  for (let i = 0; i + win <= samples.length; i += win) {
    let sum = 0;
    for (let j = 0; j < win; j++) sum += samples[i + j] * samples[i + j];
    if (sum > best) {
      best = sum;
      bestAt = i;
    }
  }
  return bestAt < 0 ? RALLY_SOUND_LEAD_MS : ((bestAt + win / 2) / sampleRate) * 1000;
}

/** Plan one race. Times remain relative to the first crossing; base makes timers nonnegative. */
export function planRallyRound({ width, carLength, finishX, soundLead = RALLY_SOUND_LEAD_MS }) {
  const x0 = -carLength * 0.7;
  const x1 = width + carLength * 0.7;
  const velocity = (x1 - x0) / RALLY_CAR_MS;
  const plan = RALLY_NUMBERS.map((_, i) => {
    const speed = velocity * RALLY_SPEED[i];
    const reach = (finishX - x0) / speed;
    const cross = RALLY_CROSS_MS[i];
    return {
      i,
      speed,
      cross,
      launch: cross - reach,
      gone: cross - reach + (x1 - x0) / speed,
      whoosh: cross - soundLead,
    };
  });
  const base = -Math.min(0, ...plan.map((car) => Math.min(car.launch, car.whoosh)));
  const lightsOut = Math.max(...plan.map((car) => car.cross)) + RALLY_LIGHTS_OUT_DELAY_MS;
  return { plan, base, lightsOut, podiumAt: lightsOut + RALLY_PODIUM_MS };
}
