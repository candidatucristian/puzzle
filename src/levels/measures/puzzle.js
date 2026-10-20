// TO THE LINE: by the laboratory sink, a bottle that holds 500 ml, one that
// holds 300 ml — nothing marked on either but what it holds — and a
// volumetric flask etched with a single ring: 400 ml. A strip of litmus
// paper hangs in its neck. Fill, pour and empty the bottles at the tap and
// the sink; pour exactly 400 ml into the flask in one go and the solution
// reaches its ring and ignites the blue strip like a fuse. The flame
// leaves the word ACID in the charred paper behind it.
//
//   fill 500 · 500 → 300 (200 left) · empty 300 · 500 → 300 (200 in it)
//   fill 500 · 500 → 300 (takes 100: 400 left) · 500 → flask

export const BOTTLES = Object.freeze([500, 300]);
export const FLASK_ML = 400;
export const MEASURES_WORD = "ACID";

/** Pour bottle `from` into bottle `to` (indices into `levels`): as much as
 *  the one has and the other has room for. Returns the new levels and how
 *  much went over. */
export function pour(levels, from, to, caps = BOTTLES) {
  const moved = Math.min(levels[from], caps[to] - levels[to]);
  const next = levels.slice();
  next[from] -= moved;
  next[to] += moved;
  return { levels: next, moved };
}

/** Whether a pour into the flask brings it exactly to its ring. */
export const toTheLine = (ml) => ml === FLASK_ML;

/** The fewest moves from empty bottles to 400 ml in one of them (fills,
 *  empties and pours each a move) — that it can be done at all. */
export function fewestMoves(caps = BOTTLES, goal = FLASK_ML) {
  const key = (s) => s.join(",");
  const seen = new Set([key(caps.map(() => 0))]);
  let frontier = [caps.map(() => 0)];
  for (let moves = 0; frontier.length; moves++) {
    if (frontier.some((s) => s.includes(goal))) return moves;
    const next = [];
    for (const s of frontier) {
      const options = [];
      caps.forEach((c, i) => {
        options.push(s.map((v, j) => (j === i ? c : v)));
        options.push(s.map((v, j) => (j === i ? 0 : v)));
        caps.forEach((_, j) => { if (i !== j) options.push(pour(s, i, j, caps).levels); });
      });
      for (const o of options) if (!seen.has(key(o))) { seen.add(key(o)); next.push(o); }
    }
    frontier = next;
  }
  return -1;
}
