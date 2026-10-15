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
      "Ashcombe House, locked since the night of the 13th of October 1961. The letter said to start here.",
      "Six doors open off the hall, and most of them are locked. Each room keeps the key to another — the Ashcombes saw to that.",
    ] },
  { key: "Study", name: "Room 1", back: "Hall", holds: ["binarytree", "plantpot", "cryptex"], chest: "Room2",
    story: [
      "Ivy Ashcombe's study: the botanist's desk, her seed boxes, her specimens pressed and pinned — and work she did not want read.",
      "Three things here still keep a word each. Look closely at whatever catches the light, find its word, and give it back to the house.",
      "When all three have gone dark, the room will give up what it has been keeping.",
    ] },
  { key: "Room2", name: "Room 2", back: "Hall", holds: ["bookshelf", "overtime", "modem"], needsKey: true, chest: "Room3",
    story: [
      "The family library: the Ashcombes' books, and the house's accounts kept to the last penny until the night they left.",
      "Three things here still keep a word each, and each has a light of its own. Find the word, and the light can go out.",
      "When all three are dark, the room will give up what it has been keeping.",
    ] },
  { key: "Room3", name: "Room 3", back: "Hall", holds: ["compass", "chessboard", "mobilephone"], needsKey: true, chest: "Room4",
    story: [
      "Captain Ashcombe's room — their grandfather's: what a man home from the sea brought back with him, and could not put down.",
      "Three things here still keep a word each, and each has a light of its own. Find the word, and the light can go out.",
      "When all three are dark, the room will give up what it has been keeping.",
    ] },
  { key: "Room4", name: "Room 4", back: "Hall", holds: ["sequence", "crossing", "station"], needsKey: true, chest: "Room5",
    story: [
      "The counting room, where the house's figures were kept: pinned to the wall, hung beside them, shut away in a drawer.",
      "Three things here still keep a word each, and each has a light of its own. Find the word, and the light can go out.",
      "When all three are dark, the room will give up what it has been keeping.",
    ] },
  // Up the stairs from the hall: the upper hall. Of its five doors — VII to
  // XI — the first opens on the laboratory; the rest have nothing behind them
  // yet. Its puzzle is not gone into, as a room's are: it `plays` there, in
  // the hall itself, and is answered there.
  { key: "Upper", name: "The Chemistry Hall", floor: "The Chemistry", storey: 2, back: "Hall", holds: ["lightswitch"], plays: "lightswitch", doors: ["Room7", null, null, null, null], first: 7,
    story: [
      "Silas Ashcombe's floor: a tiled passage lined with reagent cupboards and the apparatus of experiments left unfinished on the night he went. Copper pipes run above the doors.",
      "One light still works up here, after a fashion. It is trying to say something.",
    ] },
  { key: "Room7", name: "Room 7", back: "Upper", holds: ["chemistry"],
    story: [
      "Silas's laboratory: his own bench, just as he left it — the lamp still lit, the burner still going under its flask.",
      "Five bottles stand in a row along it, and a magnifying glass lies on its cloth at the front. One thing here still keeps a word.",
    ] },
  // Up again, by the stairs at the side of the upper hall: the top floor,
  // the last — a round room under the dome. Three doors, XII to XIV, nothing
  // behind them yet; at its window the telescope, which is looked through
  // as a room's puzzles are gone to; and on the left an archway with an iron
  // gate across it, and beyond the gate a passage with three doors more.
  { key: "Top", name: "The Physics Hall", floor: "The Physics", storey: 3, back: "Upper", holds: ["telescope"], doors: [null, null, null], first: 12,
    story: [
      "Orion Ashcombe's floor: the observatory under the dome, his brass armillary and his pendulum still keeping watch among the old instruments.",
      "He carried the telescope all this way up and set it at the window. It is still pointed at something.",
      "On the left an iron gate shuts off a passage. It will not be the first thing to open up here.",
    ] },
  { key: "TopHall", name: "The Top Passage", back: "Top", holds: [], doors: [null, null, null], first: 15,
    story: ["Through the doorway, a stone gallery under the roof, long given up to the rain: moss in every joint, stones come down from the vault, a pipe that never stops dripping — and three more doors."] },
  { key: "Room5", name: "Room 5", back: "Hall", holds: ["tapcode", "pi", "rally"], needsKey: true, chest: "Room6",
    story: [
      "The drawing room, where the family sat on their last evening. The fire was left to burn low, and the trap in the floor stands open.",
      "An iron ladder goes down into the cellar, and a candle has been left at the head of it. Whatever is down there still keeps a word.",
      "Nobody took the tree down, either, and nobody switched the television off. Three things here still keep a word each; when all three are dark, the room will give up what it has been keeping.",
    ] },
  { key: "Room6", name: "Room 6", back: "Hall", holds: ["billiards", "kinetic", "flags"], needsKey: true,
    story: [
      "The games room — a child's room, once: a pool table in the corner under its lamp, a long string of flags along the wall, a cupboard of old games, and a staircase going up into the dark.",
      "Three things here still keep a word each, and each has a light of its own. Find the word, and the light can go out.",
    ] },
]);

/** While the house is being built: every door opens without its key, so
 *  that each room can be walked into and looked at. Set this to false to
 *  have the keys matter again — nothing else needs changing. */
export const ALL_DOORS_OPEN = true;
/** Doors kept locked all the same while the house is being built, to see a
 *  locked door as the player will. */
export const STILL_LOCKED = [];

/** A place asks to go somewhere: `{ place: key }` or `{ level: id }`. */
export const HOUSE_GO = "house:go";

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
  camera.setZoom(zoom);
  camera.setScroll(x - W / 2 - (sx - W / 2) / zoom, y - H / 2 - (sy - H / 2) / zoom);
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
