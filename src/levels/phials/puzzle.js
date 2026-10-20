// TWO PHIALS — what the puzzle is, apart from how it is painted.
//
// At Silas's sinks, a little rack: a phial of yellow, a phial of blue, and
// between them an empty tube, kept for the two to be mixed in and never used.
// A tag on the rack, in his hand: "For my sister." His sister was Ivy, the
// botanist, who made everything grow: her colour was the colour of growing
// things — and yellow and blue, mixed, make it.
export const PHIALS_WORD = "GREEN";

// the rack's three places, left to right: what is in each
export const RACK = Object.freeze([
  { id: "yellow", liquid: [236, 196, 44], full: 0.62 },
  { id: "empty", liquid: null, full: 0 },
  { id: "blue", liquid: [44, 104, 214], full: 0.62 },
]);

export const TAG = "For my sister.";
