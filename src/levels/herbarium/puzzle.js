// IVY'S HERBARIUM — what the puzzle is, apart from how it is painted.
//
// Her book of pressed plants, five pages of it, two large specimens to a
// page, each taped down with its name in her hand. On every page one of them
// has been drawn round in pencil with a figure of straight sides: an octagon,
// a pentagon, a quadrilateral, a heptagon, a pentagon. Its sides, counted, are a
// letter's place in the alphabet:
//
//   8 H · 5 E · 4 D · 7 G · 5 E   →   HEDGE
//
// (the five she drew round are all plants of an English hedgerow: hawthorn,
// dog rose, ivy, blackthorn, privet)
export const HERBARIUM_WORD = "HEDGE";

// A specimen: its kind (how it is drawn), its Latin name, and, for the one
// drawn round on its page, the number of the figure's sides.
export const PAGES = Object.freeze([
  [
    { kind: "hawthorn", name: "Crataegus monogyna", sides: 8 },
    { kind: "daisy", name: "Bellis perennis" },
  ],
  [
    { kind: "rose", name: "Rosa canina", sides: 5 },
    { kind: "oak", name: "Quercus robur" },
  ],
  [
    { kind: "ivy", name: "Hedera helix", sides: 4 },
    { kind: "grass", name: "Plantago lanceolata" },
  ],
  [
    { kind: "blackthorn", name: "Prunus spinosa", sides: 7 },
    { kind: "ovate", name: "Fagus sylvatica" },
  ],
  [
    { kind: "privet", name: "Ligustrum vulgare", sides: 5 },
    { kind: "primrose", name: "Primula vulgaris" },
  ],
].map(Object.freeze));

/** The word the figures give: each figure's sides as a letter (A = 1). */
export function herbariumWord(pages = PAGES) {
  return pages.map((page) => String.fromCharCode(64 + page.find((s) => s.sides).sides)).join("");
}
