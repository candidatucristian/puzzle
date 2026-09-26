// One-based row/column counts carved into the cell wall. K shares C's square.
export const TAP_GRID = Object.freeze(["ABCDE", "FGHIJ", "LMNOP", "QRSTU", "VWXYZ"]);
export const TAP_WORD = "ESCAPE";

export function tapPair(letter) {
  if (typeof letter !== "string" || !/^[A-Z]$/.test(letter)) return null;
  const character = letter === "K" ? "C" : letter;
  for (let row = 0; row < TAP_GRID.length; row++) {
    const column = TAP_GRID[row].indexOf(character);
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
