// SILAS'S NOTEBOOK: four pages of his laboratory notebook, one element to a
// page, each drawn as its molecule is — with a few words of his under it,
// and nothing written that names it. Recognise each element; read their
// symbols in page order: sulfur (S₈, a crown of eight), hydrogen (H₂, the
// lightest), iodine (I₂, violet when warmed), phosphorus (P₄, a pyramid of
// four)  →  SHIP.

export const MOLECULES = Object.freeze([
  Object.freeze({
    symbol: "S", count: 8, shape: "crown", color: "#d8b72c",
    description: "Eight golden beads gather into a puckered crown. Gentle warmth draws a sharp, match-like scent from the quiet yellow grains.",
  }),
  Object.freeze({
    symbol: "H", count: 2, shape: "pair", size: 0.7, color: "#eee9dc",
    description: "The palest gas slips upward through the smallest crack. Two unseen travellers keep together until a spark parts their course.",
  }),
  Object.freeze({
    symbol: "I", count: 2, shape: "pair", size: 1.35, color: "#7654a8",
    description: "A dark crystal slowly vanishes, leaving violet vapour curling above the glass. Cool air brings the colour back as crystals.",
  }),
  Object.freeze({
    symbol: "P", count: 4, shape: "tetra", color: "#cf4938",
    description: "Four ember-red points hold a little pyramid. Left in open air, its surface may glimmer faintly before it catches.",
  }),
]);

/** The word the pages spell, read in order. */
export const readNotebook = () => MOLECULES.map((m) => m.symbol).join("");
