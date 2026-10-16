export const MODEM_WORD = 'HTTPS';
// The eight lights on the right show a whole letter at once: its ASCII byte,
// the first bit on the left, a light on for each 1 and dark for each 0. They
// come on left to right in a quick run, hold so the pattern can be read, and
// go out; then one of the five counters on the left turns red for it.
export const BYTE_LEDS = Object.freeze([5, 6, 7, 8, 9, 10, 11, 12]);
const MODEM_TIMING = Object.freeze({
  start: 700, sweep: 70, hold: 2800, afterLetter: 450, letterHold: 900, loopPause: 3500,
});

/** Absolute LED changes for one transmission; scheduling belongs to the scene. */
export function planTransmission(word = MODEM_WORD) {
  const events = [];
  let time = MODEM_TIMING.start;
  [...word].forEach((letter, index) => {
    const bits = letter.charCodeAt(0).toString(2).padStart(8, '0');
    [...bits].forEach((bit, b) => {
      if (bit === '1') events.push({ at: time + b * MODEM_TIMING.sweep, led: BYTE_LEDS[b], state: 'green' });
    });
    time += BYTE_LEDS.length * MODEM_TIMING.sweep + MODEM_TIMING.hold;
    for (const led of BYTE_LEDS) events.push({ at: time, led, state: 'off' });
    time += MODEM_TIMING.afterLetter;
    events.push({ at: time, led: index, state: 'red' });
    time += MODEM_TIMING.letterHold;
  });
  return { events, duration: time + MODEM_TIMING.loopPause };
}
