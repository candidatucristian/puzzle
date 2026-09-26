export const MORSE = Object.freeze({
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.',
  G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..',
  M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
  S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
  Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-',
  5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
});

/** Visual Morse timing: retain the brief dots and longer, readable dashes. */
export function buildMorseSteps(word) {
  const steps = [];
  const chars = String(word || '').toUpperCase().split('');
  chars.forEach((letter, index) => {
    const pattern = MORSE[letter];
    if (!pattern) return;
    [...pattern].forEach((symbol, symbolIndex) => {
      steps.push({ on: true, dur: symbol === '-' ? 500 : 40 });
      if (symbolIndex < pattern.length - 1) steps.push({ on: false, dur: 120 * 3.2 });
    });
    if (index < chars.length - 1) steps.push({ on: false, dur: 120 * 6.5 });
  });
  return steps;
}
