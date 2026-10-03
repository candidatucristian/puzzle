/** COMPASS: the word LOST, written as a walk. Every number on the map is a
 *  compass bearing in degrees — North 0, East 90, South 180, West 270 — and
 *  every bearing is one step that way. Walk one line of the map and you have
 *  drawn one letter: L is down, down, right (180 180 90). */

export const COMPASS_WORD = "LOST";

// one line of bearings for each letter, in the order the letters are written
export const COMPASS_BEARINGS = Object.freeze([
  Object.freeze([180, 180, 90]), // L: down the stem, along the foot
  Object.freeze([270, 180, 180, 90, 90, 0, 0, 270]), // O: from the top middle, round and home
  Object.freeze([270, 270, 180, 90, 90, 180, 270, 270]), // S: from the top right
  Object.freeze([90, 90, 270, 180, 180]), // T: the bar, back to its middle, down the stem
]);

const STEP = { 0: [0, -1], 90: [1, 0], 180: [0, 1], 270: [-1, 0] };

/** The points a line of bearings visits, one unit step each, y down. */
export function walk(bearings) {
  const points = [[0, 0]];
  for (const bearing of bearings) {
    const step = STEP[((bearing % 360) + 360) % 360];
    if (!step) throw new RangeError(`Not a compass bearing: ${bearing}`);
    const [x, y] = points.at(-1);
    points.push([x + step[0], y + step[1]]);
  }
  return points;
}

/** A line of bearings drawn as text, on a grid twice as fine as the steps so
 *  every stroke shows: "#" where the pen went, "." where it did not. */
export function drawBearings(bearings) {
  const points = walk(bearings).map(([x, y]) => [x * 2, y * 2]);
  const marks = new Set();
  points.forEach(([x, y], i) => {
    marks.add(`${x},${y}`);
    if (i) {
      const [px, py] = points[i - 1];
      marks.add(`${(x + px) / 2},${(y + py) / 2}`);
    }
  });
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const rows = [];
  for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
    let row = "";
    for (let x = Math.min(...xs); x <= Math.max(...xs); x++) row += marks.has(`${x},${y}`) ? "#" : ".";
    rows.push(row);
  }
  return rows;
}
