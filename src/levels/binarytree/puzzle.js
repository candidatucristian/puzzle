// Three forks reach eight leaves. Preserve their visual order: L=0, R=1.
export const BINARY_PATHS = Object.freeze(["RLR", "LRL", "LLL", "LLL", "LRL", "LLR", "LRR"]);
export const BINARY_LEAVES = Object.freeze(["B", "G", "A", "E", "D", "C", "H", "F"]);

export function decodeBinaryPath(path) {
  if (typeof path !== "string" || !/^[LR]{3}$/.test(path)) return null;
  let index = 0;
  for (const branch of path) index = index * 2 + (branch === "R" ? 1 : 0);
  return BINARY_LEAVES[index];
}

export function decodeBinaryMessage(paths = BINARY_PATHS) {
  if (!Array.isArray(paths) || paths.length === 0) return null;
  const letters = paths.map(decodeBinaryPath);
  return letters.includes(null) ? null : letters.join("");
}
