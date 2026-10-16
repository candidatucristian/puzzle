// One-based row/column counts carved into the cell wall. The alphabet runs
// through the five-by-five rack, A to Y; the Z it has no room for is
// scratched on the wall past the end of the last row — the sixth place of it.
export const TAP_GRID = Object.freeze(["ABCDE", "FGHIJ", "KLMNO", "PQRST", "UVWXYZ"]);
export const TAP_WORD = "ESCAPE";

export function tapPair(letter) {
  if (typeof letter !== "string" || !/^[A-Z]$/.test(letter)) return null;
  for (let row = 0; row < TAP_GRID.length; row++) {
    const column = TAP_GRID[row].indexOf(letter);
    if (column >= 0) return [row + 1, column + 1];
  }
  return null;
}

export function letterFromTapPair(row, column) {
  if (!Number.isInteger(row) || !Number.isInteger(column) ||
    row < 1 || row > TAP_GRID.length || column < 1 || column > TAP_GRID[row - 1].length) {
    return null;
  }
  return TAP_GRID[row - 1][column - 1];
}
