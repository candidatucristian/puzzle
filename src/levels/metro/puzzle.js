/** METRO: the line diagram on a metro platform's wall. The line runs through
 *  five stations — Papa Wharf, Yankee Dock, Lima Road, Oscar Square,
 *  November Street — and their first words are not place names at all but
 *  the NATO phonetic alphabet (and none of its famous letters): Papa P,
 *  Yankee Y, Lima L, Oscar O, November N. Read in the line's order they
 *  spell PYLON. */

export const METRO_WORD = "PYLON";

// the stations of the line, in the order the trains run through them
export const METRO_STATIONS = Object.freeze([
  "Papa Wharf",
  "Yankee Dock",
  "Lima Road",
  "Oscar Square",
  "November Street",
]);

// the NATO phonetic alphabet, A to Z
export const NATO = Object.freeze([
  "ALFA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT", "GOLF", "HOTEL", "INDIA",
  "JULIETT", "KILO", "LIMA", "MIKE", "NOVEMBER", "OSCAR", "PAPA", "QUEBEC", "ROMEO",
  "SIERRA", "TANGO", "UNIFORM", "VICTOR", "WHISKEY", "XRAY", "YANKEE", "ZULU",
]);
// the spellings in common use beside the official ones
const ALSO = Object.freeze({ ALPHA: "ALFA", JULIET: "JULIETT", "X-RAY": "XRAY" });

/** The letter a phonetic word stands for: ALPHA → A, NOVEMBER → N. */
export function natoLetter(word) {
  const key = String(word).trim().toUpperCase();
  const i = NATO.indexOf(ALSO[key] || key);
  if (i < 0) throw new RangeError(`Not a phonetic word: ${word}`);
  return String.fromCharCode(65 + i);
}

/** The first word of a station's name: the one that carries the letter. */
export function stationWord(name) {
  return String(name).trim().split(/\s+/)[0];
}

/** The word a line spells, station by station. */
export function readLine(stations = METRO_STATIONS) {
  return stations.map((name) => natoLetter(stationWord(name))).join("");
}
