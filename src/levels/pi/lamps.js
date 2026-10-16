// Which of a string's holders are alight: `count` of `n`, spread evenly
// along it — each one near its own share of the string, a little off it by
// chance (seeded), never two in one holder — so a tier's lamps run the
// width of the tree instead of bunching at one end.
export function spreadLit(n, count, rnd) {
  if (count >= n) return new Set([...Array(n).keys()]);
  const step = n / count, lit = new Set();
  for (let k = 0; k < count; k++) {
    let i = Math.floor((k + 0.5) * step + (rnd() - 0.5) * step * 0.6);
    i = Math.max(0, Math.min(n - 1, i));
    while (lit.has(i)) i = (i + 1) % n;
    lit.add(i);
  }
  return lit;
}
