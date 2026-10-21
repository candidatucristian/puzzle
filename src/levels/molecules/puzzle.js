// SILAS'S NOTEBOOK: four pages of his laboratory notebook, one element to a
// page, each drawn as its molecule is — with a few words of his under it,
// and nothing written that names it. Recognise each element; read their
// symbols in page order: sulfur (S₈, a crown of eight), hydrogen (H₂, the
// lightest), iodine (I₂, violet when warmed), phosphorus (P₄, a pyramid of
// four)  →  SHIP.

export const MOLECULES = Object.freeze([
  Object.freeze({
    symbol: "S", count: 8, shape: "crown", color: "#d8b72c",
    description: "A yellow crystalline solid. Its molecules form puckered rings of eight atoms. Used in the vulcanisation of rubber.",
    notes: Object.freeze([
      "Yellow crystals at room temperature.",
      "Eight atoms joined in a puckered ring.",
      "Used in the vulcanisation of rubber.",
    ]),
  }),
  Object.freeze({
    symbol: "H", count: 2, shape: "pair", size: 0.7, color: "#eee9dc",
    description: "A colourless, odourless gas. The lightest element, with two atoms in each molecule. It forms water when it burns in oxygen.",
    notes: Object.freeze([
      "A colourless, odourless gas.",
      "The lightest element; atoms join in pairs.",
      "Forms water when it burns in oxygen.",
    ]),
  }),
  Object.freeze({
    symbol: "I", count: 2, shape: "pair", size: 1.35, color: "#7654a8",
    description: "A shiny, dark crystalline solid. Its two-atom molecules form a violet vapour on warming. Its compounds are used in photographic chemistry.",
    notes: Object.freeze([
      "Shiny, dark crystals at room temperature.",
      "Warming produces a violet vapour.",
      "Compounds used in photographic chemistry.",
    ]),
  }),
  Object.freeze({
    symbol: "P", count: 4, shape: "tetra", color: "#d8d0b2",
    description: "This white form is a waxy solid. Four atoms occupy the corners of a tetrahedron. It glows faintly and reacts readily with air.",
    notes: Object.freeze([
      "The white form is a waxy solid.",
      "Four atoms at the corners of a tetrahedron.",
      "Glows faintly and reacts readily with air.",
    ]),
  }),
]);

/** The word the pages spell, read in order. */
export const readNotebook = () => MOLECULES.map((m) => m.symbol).join("");
