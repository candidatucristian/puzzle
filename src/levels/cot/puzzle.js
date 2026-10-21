// HIS COT — what the puzzle is, apart from how it is painted.
//
// In Room VI, the room they kept for the boy: his cot, made up as if for the
// night — his pillow, his bootees, a teddy, a rattle, a knitted rabbit, the
// mobile turning over it — and among his things, five that answer a hand.
// Each is a word of the alphabet a constable spells with over the radio,
// embodied by an object (the book has its title; the hotel, its sign): a music box with a
// couple dancing the tango on it, a little gold Oscar, the book of Romeo and
// Juliet, a figure of Charlie Chaplin, a toy hotel. Their first letters, left
// to right across the cot:
//
//   Tango · Oscar · Romeo · Charlie · Hotel   →   TORCH
export const COT_WORD = "TORCH";

// the five, left to right, the word each one is, and where it lies in the
// cot: `a` across it (0 its left side, 1 its right), `b` from its back rail
// (0) to its front (1)
export const TOYS = Object.freeze([
  { id: "musicbox", word: "TANGO", a: 0.15, b: 0.47, label: "Wind the music box" },
  { id: "oscar", word: "OSCAR", a: 0.35, b: 0.24, label: "Pick up the little gold man" },
  { id: "book", word: "ROMEO", a: 0.5, b: 0.53, label: "Lift the book" },
  { id: "chaplin", word: "CHARLIE", a: 0.66, b: 0.3, label: "Raise his hat" },
  { id: "hotel", word: "HOTEL", a: 0.85, b: 0.52, label: "Ring the hotel's reception bell" },
]);

export const cotWord = () => TOYS.map((t) => t.word[0]).join("");
