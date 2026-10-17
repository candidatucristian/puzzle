// THE APOTHECARY'S BALANCE: four phials of reagent stand in a row on the
// desk, numbered I to IV on their labels, beside a two-pan balance and its
// box of brass weights. Weigh each phial: its weight in grams is a letter's
// place in the alphabet, and the phials read in their order give the word.
//
//   I 19 g  ·  II 1 g  ·  III 12 g  ·  IV 20 g   →   S A L T

/** What each phial weighs, in grams, in the order of their numbers. */
export const PHIALS = Object.freeze([19, 1, 12, 20]);

/** The box of weights, as a real set of them is made up. */
export const WEIGHTS = Object.freeze([20, 10, 10, 5, 2, 2, 1]);

/** The word the phials spell, read as letters (1 = A … 26 = Z). */
export const balanceWord = () => PHIALS.map((g) => String.fromCharCode(64 + g)).join("");

/** How far the beam leans, in radians, with `left` and `right` grams on its
 *  pans: the heavier pan goes down; a single gram shows, a big difference
 *  sends it to its stop. Positive turns it clockwise (the right pan down). */
export function beamAngle(left, right) {
  const max = 0.21;
  const d = right - left;
  if (d === 0) return 0;
  return Math.sign(d) * Math.min(max, 0.035 + Math.abs(d) * 0.012);
}

/** Every phial can be weighed with the weights in the box. */
export function canWeigh(grams, weights = WEIGHTS) {
  const reach = new Set([0]);
  for (const w of weights) for (const s of [...reach]) reach.add(s + w);
  return reach.has(grams);
}
