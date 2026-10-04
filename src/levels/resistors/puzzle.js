/** RESISTORS: a circuit board under a workshop magnifier, four big resistors
 *  soldered to it, four colour bands on each. By the resistor colour code
 *  (black 0, brown 1, red 2, orange 3, yellow 4 …) the first band of each,
 *  R1 to R4, reads brown black red yellow: 1 0 2 4. The code is 1024. */

export const RESISTORS_CODE = "1024";

// the colour code: a digit for each colour, black to white
export const BAND_DIGITS = Object.freeze({
  black: 0,
  brown: 1,
  red: 2,
  orange: 3,
  yellow: 4,
  green: 5,
  blue: 6,
  violet: 7,
  grey: 8,
  white: 9,
});
export const BAND_COLOURS = Object.freeze(Object.keys(BAND_DIGITS));

// what each colour is painted as
export const BAND_PAINT = Object.freeze({
  black: "#141414",
  brown: "#6b3a1e",
  red: "#c8262a",
  orange: "#e8771e",
  yellow: "#e9c62b",
  green: "#2f8a3e",
  blue: "#2456b8",
  violet: "#7a3d9e",
  grey: "#8c8c8c",
  white: "#f2efe6",
  gold: "#c9a227",
  silver: "#c0c4c8",
});

// the four resistors on the board, R1 to R4, their bands read from the
// end away from the tolerance band
export const RESISTORS = Object.freeze([
  Object.freeze(["brown", "black", "red", "gold"]), // 1 kΩ
  Object.freeze(["black", "brown", "black", "gold"]), // 1 Ω (a shunt)
  Object.freeze(["red", "red", "orange", "gold"]), // 22 kΩ
  Object.freeze(["yellow", "violet", "red", "gold"]), // 4.7 kΩ
]);

/** The digit a band stands for; a tolerance band has none. */
export function bandDigit(colour) {
  const d = BAND_DIGITS[String(colour).toLowerCase()];
  if (d === undefined) throw new RangeError(`No digit for ${colour}`);
  return d;
}

/** A four-band resistor's value in ohms: two digits, a multiplier. */
export function resistorOhms(bands) {
  const [a, b, m] = bands;
  return (bandDigit(a) * 10 + bandDigit(b)) * 10 ** bandDigit(m);
}

/** The value written as on a parts list: 1000 → "1 kΩ". */
export function ohmsLabel(ohms) {
  if (ohms >= 1e6) return `${trim(ohms / 1e6)} MΩ`;
  if (ohms >= 1e3) return `${trim(ohms / 1e3)} kΩ`;
  return `${trim(ohms)} Ω`;
}
const trim = (n) => String(Math.round(n * 100) / 100);

/** The code the board gives: the first band of each resistor, in order. */
export function readFirstBands(resistors = RESISTORS) {
  return resistors.map((bands) => String(bandDigit(bands[0]))).join("");
}
