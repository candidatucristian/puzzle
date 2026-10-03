/** CHEMISTRY: five bottles in an old laboratory, their labels torn, only a
 *  big number left on each: 9, 8, 6, 92, 16. They are atomic numbers; the
 *  elements' symbols, in order, are F O C U S. */

export const CHEMISTRY_WORD = "FOCUS";

// the numbers left on the five labels, left to right
export const BOTTLES = Object.freeze([9, 8, 6, 92, 16]);

// every element's symbol, by atomic number (index 0 is hydrogen, 1)
export const ELEMENTS = Object.freeze(
  (
    "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn " +
    "Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce " +
    "Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn " +
    "Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl " +
    "Mc Lv Ts Og"
  ).split(" "),
);

/** An element's symbol from its atomic number. */
export function symbolOf(z) {
  const symbol = ELEMENTS[z - 1];
  if (!Number.isInteger(z) || !symbol) throw new RangeError(`No element ${z}`);
  return symbol;
}

/** The word the bottles spell: each number's symbol, in order. */
export function readBottles(numbers = BOTTLES) {
  return numbers.map(symbolOf).join("").toUpperCase();
}

/** Where an element sits on the table: its row (1–7, and 9–10 for the two
 *  rows set apart beneath, lanthanides and actinides) and column (1–18). */
export function cellOf(z) {
  if (z === 1) return { row: 1, col: 1 };
  if (z === 2) return { row: 1, col: 18 };
  if (z <= 10) return { row: 2, col: z <= 4 ? z - 2 : z + 8 };
  if (z <= 18) return { row: 3, col: z <= 12 ? z - 10 : z };
  if (z <= 36) return { row: 4, col: z - 18 };
  if (z <= 54) return { row: 5, col: z - 36 };
  if (z <= 56) return { row: 6, col: z - 54 };
  if (z <= 71) return { row: 9, col: z - 54 };
  if (z <= 86) return { row: 6, col: z - 68 };
  if (z <= 88) return { row: 7, col: z - 86 };
  if (z <= 103) return { row: 10, col: z - 86 };
  return { row: 7, col: z - 100 };
}

/** The family an element belongs to, for the table's colours. */
export function familyOf(z) {
  const { row, col } = cellOf(z);
  if (row >= 9) return "inner";
  if (z === 1) return "nonmetal";
  if (col === 18) return "noble";
  if (col === 1) return "alkali";
  if (col === 2) return "earth";
  if (col >= 3 && col <= 12) return "transition";
  if (col === 17) return "halogen";
  if ([6, 7, 8, 15, 16, 34].includes(z)) return "nonmetal";
  if ([5, 14, 32, 33, 51, 52].includes(z)) return "metalloid";
  return "post";
}
