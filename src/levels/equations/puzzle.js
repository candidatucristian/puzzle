// HALF WIPED: three reactions in chalk on Silas's blackboard, some of their
// numbers wiped away. Balance each — as many atoms of every element after
// the arrow as before it — and the missing numbers, read left to right and
// top to bottom, are the code.
//
//   _H₂ + O₂ → 2H₂O            2
//   N₂ + _H₂ → _NH₃            3 2
//   _Fe + 3O₂ → 2Fe₂O₃         4         →   2324

// a reaction: each side a list of [coefficient, formula]; a coefficient of
// null is wiped (its answer is in `wiped`), 1 is written as nothing
export const REACTIONS = Object.freeze([
  { left: [[null, "H2"], [1, "O2"]], right: [[2, "H2O"]], wiped: [2] },
  { left: [[1, "N2"], [null, "H2"]], right: [[null, "NH3"]], wiped: [3, 2] },
  { left: [[null, "Fe"], [3, "O2"]], right: [[2, "Fe2O3"]], wiped: [4] },
]);

/** The code: the wiped numbers in the order they are written. */
export const equationsCode = () => REACTIONS.flatMap((r) => r.wiped).join("");

/** A formula's atoms: "Fe2O3" → { Fe: 2, O: 3 }. */
export function atoms(formula) {
  const out = {};
  for (const [, el, n] of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) out[el] = (out[el] || 0) + (n ? Number(n) : 1);
  return out;
}

/** True when a reaction, its wiped numbers filled in, balances. */
export function balances(reaction, fill = reaction.wiped) {
  let k = 0;
  const count = (side) => {
    const total = {};
    for (const [c, f] of side) {
      const n = c ?? fill[k++];
      for (const [el, a] of Object.entries(atoms(f))) total[el] = (total[el] || 0) + n * a;
    }
    return total;
  };
  const l = count(reaction.left), r = count(reaction.right);
  const keys = new Set([...Object.keys(l), ...Object.keys(r)]);
  return [...keys].every((el) => l[el] === r[el]);
}
