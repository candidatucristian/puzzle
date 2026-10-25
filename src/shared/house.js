/** The house the rooms are in. A place is somewhere the player stands between
 *  puzzles — the hall, a room off it — and holds the things that open them:
 *  each level it holds is found there, and is come back to there once solved.
 *  `back` is the place its door leads out to; `doors` are a place's own
 *  doors in the order they are numbered, each the place behind it, or null
 *  for one with nothing behind it yet (`first` is the number on the first of
 *  them, where it is not I). A place that `plays` a level is that level's
 *  own stage: the puzzle is worked and answered standing in the place. A room that `needsKey` stays locked
 *  until its key has been found; the key is in the `chest` of another room,
 *  which opens once everything that room holds has been solved. A room
 *  marked `unbuilt` has a door and a key but cannot be gone into yet.
 *  `story` is the few lines the index tells under
 *  its list while the player stands there: where they are, and what there
 *  is to do — never how. No scene code lives here. */
export const PLACES = Object.freeze([
  { key: "Hall", name: "The Botany Hall", floor: "The Botany", storey: 1, back: null, holds: [], doors: ["Study", "Room2", "Room3", "Room4", "Room5", "Room6"],
    story: [
      "Forty years shut, and not one thing out of place. They did not run from this house — they tidied it first.",
      "The gate was left unlocked for me. Somebody still has a key.",
    ] },
  { key: "Study", name: "Room I", back: "Hall", holds: ["binarytree", "plantpot", "cryptex"], chest: "Room2",
    story: [
      "Ivy's room. Everything here pressed, labelled and kept.",
      "On the hook, an old gardening coat — and in its pocket, a child's mitten. The file never mentioned a child.",
    ] },
  { key: "Room2", name: "Room II", back: "Hall", holds: ["bookshelf", "overtime", "modem"], needsKey: true, chest: "Room3",
    story: [
      "The house accounts, kept to the penny until the 13th of October 1961.",
      "The last entry, in Silas's hand: one basket. Why would a man write down a basket?",
    ] },
  { key: "Room3", name: "Room III", back: "Hall", holds: ["compass", "chessboard", "mobilephone"], needsKey: true, chest: "Room4",
    story: [
      "Their grandfather's things, everything he brought home from the sea.",
      "A photograph turned face down: four children, not three. Nobody ever spoke of a fourth.",
    ] },
  { key: "Room4", name: "Room IV", back: "Hall", holds: ["sequence", "wires", "station"], needsKey: true, chest: "Room5",
    story: [
      "Railway tickets, all for the night of the 13th.",
      "Three singles, and one half-fare. Half-fares are for children.",
    ] },
  // Up the stairs from the hall: the upper hall. Of its three doors — VII
  // and VIII on the left, IX on the right — the first opens on the
  // laboratory, the second on the weighing room, the third on a room with
  // nothing in it yet. Its puzzle is not gone into, as a room's are: it
  // `plays` there, in the hall itself, and is answered there.
  { key: "Upper", name: "The Chemistry Hall", floor: "The Chemistry", storey: 2, back: "Hall", holds: ["lightswitch"], plays: "lightswitch", doors: ["Room7", "Room8", "Room9"], first: 7,
    story: [
      "Silas's floor. A man who measured everything.",
      "One light up here still works, on and off. It is not broken. It is waiting.",
    ] },
  { key: "Room7", name: "Room VII", back: "Upper", holds: ["chemistry", "molecules", "phials"],
    story: [
      "His bench, just as he left it — and the burner still lit, forty years on.",
      "Somebody has been coming up here to keep it going.",
    ] },
  { key: "Room8", name: "Room VIII", back: "Upper", holds: ["balance", "equations", "measures"],
    story: [
      "His weighing room. Everything in here was measured twice, and written down.",
      "Three things left half done: a weighing, a sum on the board, a measure by the sink.",
    ] },
  // Up again, by the stairs at the side of the upper hall: the top floor,
  // the last — a round room under the dome. One door, XI, the physics study
  // behind it; at its window the telescope, which is looked through as a room's
  // puzzles are gone to; and on the left an archway with an iron gate across
  // it, and beyond the gate a passage with two doors more, XII and XIII.
  { key: "Top", name: "The Physics Hall", floor: "The Physics", storey: 3, back: "Upper", holds: ["telescope"], doors: ["Room11"], first: 11,
    story: [
      "Orion's dome. The whole sky, from up here.",
      "The same telescope I was given when I was ten. Mine came without a card.",
    ] },
  { key: "TopHall", name: "The Top Passage", back: "Top", holds: [], doors: ["Room12", "Room13"], first: 12,
    story: [
      "Rain in the roof, and two more doors.",
      "The house goes further than the plans say. So, it seems, does this case.",
    ] },
  // The remaining upstairs rooms (registered in house/emptyRooms.js).
  { key: "Room9", name: "Room IX", back: "Upper", holds: [],
    story: [
      "An empty room. Dust on the floor, and the fire laid but never lit.",
      "He used every room on this floor. Why not this one?",
    ] },
  { key: "Room11", name: "Room XI", back: "Top", holds: [],
    story: [
      "Orion's physics study. Coils, lenses, and a galvanometer on the workbench.",
      "Waves and a pendulum on the slate. Rain against the tall sash window.",
    ] },
  { key: "Room12", name: "Room XII", back: "TopHall", holds: [],
    story: [
      "Bare boards on the walls, and the rain loud on the roof.",
      "Old charts and instrument cases, kept under the eaves.",
    ] },
  { key: "Room13", name: "Room XIII", back: "TopHall", holds: [],
    story: [
      "The last room in the house, as far as the plans go.",
      "Tools on the bench. The fire is cold, but the hearth is swept.",
    ] },
  { key: "Room5", name: "Room V", back: "Hall", holds: ["tapcode", "pi", "rally"], needsKey: true, chest: "Room6",
    story: [
      "The room of their last evening: the table still laid for four, the fire let die, the television never switched off.",
      "The file says three people lived here.",
    ] },
  { key: "Room6", name: "Room VI", back: "Hall", holds: ["flags", "herbarium", "cot"], needsKey: true,
    story: [
      "A child's room, kept as if he might come back for it.",
      "His medals, still behind their glass. Somebody has kept it clean.",
      "A little wooden hotel waits among his toys, its reception bell beside the door.",
    ] },
]);

/** A number as the doors are numbered: 1 → I, 7 → VII, 14 → XIV. */
export function roman(n) {
  let out = "";
  for (const [v, s] of [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]) while (n >= v) { out += s; n -= v; }
  return out;
}

/** While the house is being built: every door opens without its key, so
 *  that each room can be walked into and looked at. Set this to false to
 *  have the keys matter again — nothing else needs changing. */
export const ALL_DOORS_OPEN = true;
/** Doors kept locked all the same while the house is being built, to see a
 *  locked door as the player will. */
export const STILL_LOCKED = [];

/** A place asks to go somewhere: `{ place: key }` or `{ level: id }`. */
export const HOUSE_GO = "house:go";
/** Leave a puzzle or room by the same route as the Back control. */
export const HOUSE_BACK = "house:back";

/** A puzzle played in a place has been answered there: its level's id. */
export const HOUSE_SOLVED = "house:solved";

/** How long walking up to something takes, before the picture changes. */
export const WALK_MS = 1000;

// How far the eye has gone toward a thing: k is 0 standing back, 1 right up
// to it. One movement, not two: the thing itself is what the picture grows
// round. It travels in a straight line between where it stands on the
// screen and the middle of it while everything swells about it, and the
// swelling is even — each moment larger by the same proportion — so nothing
// lurches or slides sideways on the way. Right up to it, it fills a good
// part of the picture, however small it is.
export function aimCameraAt(camera, box, k) {
  const W = camera.width, H = camera.height;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const reach = Math.min(3.4, Math.max(1.7, 0.62 * Math.min(W / box.width, H / box.height)));
  const zoom = Math.pow(reach, k);
  // where on the screen the thing is by now
  const sx = x + (W / 2 - x) * k, sy = y + (H / 2 - y) * k;
  // and where the eye's middle is for that — kept far enough in that it never
  // looks past the picture's edges (the doors stand right at the sides: the
  // eye goes toward them as far as the picture goes, and no further)
  const halfW = W / (2 * zoom), halfH = H / (2 * zoom);
  const cx = Math.min(W - halfW, Math.max(halfW, x - (sx - W / 2) / zoom));
  const cy = Math.min(H - halfH, Math.max(halfH, y - (sy - H / 2) / zoom));
  camera.setZoom(zoom);
  camera.setScroll(cx - W / 2, cy - H / 2);
}

/** The scene's eye goes to a thing — a door, a case on a table — as the
 *  player walks up to it. `box` is where the thing is on the screen. */
export function zoomInto(scene, box) {
  if (scene.reducedMotion) return;
  const camera = scene.cameras.main;
  scene.tweens.addCounter({ from: 0, to: 1, duration: WALK_MS, ease: "Sine.easeInOut", onUpdate: (tween) => aimCameraAt(camera, box, tween.getValue()) });
}

/** The same walk the other way: the scene opens right up against the thing
 *  the player has just come away from, and draws back until the whole place
 *  is in view. Nothing can be clicked until it has. */
export function zoomOutFrom(scene, box) {
  if (scene.reducedMotion) return;
  const camera = scene.cameras.main;
  aimCameraAt(camera, box, 1);
  scene.input.enabled = false;
  scene.tweens.addCounter({
    from: 1,
    to: 0,
    duration: WALK_MS,
    ease: "Sine.easeInOut",
    onUpdate: (tween) => aimCameraAt(camera, box, tween.getValue()),
    onComplete: () => { aimCameraAt(camera, box, 0); scene.input.enabled = true; },
  });
}

/** What the index tells while a puzzle is open. */
export const PUZZLE_STORY = [
  "Everything needed is in front of you. Nothing here is decoration, and nothing will explain itself.",
  "Find the word, and write it in the box below.",
];
