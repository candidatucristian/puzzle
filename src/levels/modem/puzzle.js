export const MODEM_WORD = 'HTTPS';
const MODEM_TIMING = Object.freeze({
  start: 500, bit: 600, bitGap: 330, afterLetter: 500, letterHold: 850, loopPause: 3500,
});

/** Absolute LED changes for one transmission; scheduling belongs to the scene. */
export function planTransmission(word = MODEM_WORD) {
  const events = [];
  let time = MODEM_TIMING.start;
  [...word].forEach((letter, index) => {
    const bits = letter.charCodeAt(0).toString(2).padStart(8, '0');
    [...bits].forEach((bit, bitIndex) => {
      if (bitIndex > 0) time += MODEM_TIMING.bitGap;
      const led = bit === '0' ? 5 : 6;
      events.push({ at: time, led, state: 'green' });
      time += MODEM_TIMING.bit;
      events.push({ at: time, led, state: 'off' });
    });
    time += MODEM_TIMING.afterLetter;
    events.push({ at: time, led: index, state: 'red' });
    time += MODEM_TIMING.letterHold;
  });
  return { events, duration: time + MODEM_TIMING.loopPause };
}
