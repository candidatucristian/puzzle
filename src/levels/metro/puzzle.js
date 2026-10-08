/** METRO: the line diagram that hangs over a metro platform. The line runs
 *  through six stations — Sierra Heights, India Docks, Golf Links, November
 *  Street, Alpha Park, Lima Road — and their first words are not place names
 *  at all but the NATO phonetic alphabet: Sierra S, India I, Golf G,
 *  November N, Alpha A, Lima L. Read in the line's order they spell SIGNAL. */

export const METRO_WORD = "SIGNAL";

// the stations of the line, in the order the trains run through them
export const METRO_STATIONS = Object.freeze([
  "Sierra Heights",
  "India Docks",
  "Golf Links",
  "November Street",
  "Alpha Park",
  "Lima Road",
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
