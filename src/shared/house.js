/** The house the rooms are in. A place is somewhere the player stands between
 *  puzzles — the hall, a room off it — and holds the things that open them:
 *  each level it holds is found there, and is come back to there once solved.
 *  `back` is the place its door leads out to; `doors` are a place's own
 *  doors in the order they are numbered, each the place behind it, or null
 *  for one with nothing behind it yet. A room that `needsKey` stays locked
 *  until its key has been found; the key is in the `chest` of another room,
 *  which opens once everything that room holds has been solved. A room
 *  marked `unbuilt` has a door and a key but cannot be gone into yet.
 *  `story` is the few lines the index tells under
 *  its list while the player stands there: where they are, and what there
 *  is to do — never how. No scene code lives here. */
export const PLACES = Object.freeze([
  { key: "Hall", name: "The Hall", back: null, holds: [], doors: ["Study", "Room2", "Room3", "Room4", null, null],
    story: [
      "The manor has been shut up for years, and everyone who lived in it left something behind.",
      "Six doors open off this hall, and most of them are locked tonight. Each room keeps the key to another.",
    ] },
  { key: "Study", name: "Room 1", back: "Hall", holds: ["binarytree", "plantpot", "cryptex"], chest: "Room2",
    story: [
      "Somebody worked in this room, and did not want the work read.",
      "Three things here still keep a word each. Look closely at whatever catches the light, find its word, and give it back to the house.",
      "When all three have gone dark, the room will give up what it has been keeping.",
    ] },
  { key: "Room2", name: "Room 2", back: "Hall", holds: ["bookshelf", "overtime", "modem"], needsKey: true, chest: "Room3",
    story: [
      "The library: the house's books and its accounts, all left as they were.",
      "Three things here still keep a word each, and each has a light of its own. Find the word, and the light can go out.",
      "When all three are dark, the room will give up what it has been keeping.",
    ] },
  { key: "Room3", name: "Room 3", back: "Hall", holds: ["compass", "chessboard", "mobilephone"], needsKey: true, chest: "Room4",
    story: [
      "The captain's room: what a man home from the sea brought back with him, and could not put down.",
      "Three things here still keep a word each, and each has a light of its own. Find the word, and the light can go out.",
      "When all three are dark, the room will give up what it has been keeping.",
    ] },
  { key: "Room4", name: "Room 4", back: "Hall", holds: [], needsKey: true, unbuilt: true },
]);

/** A place asks to go somewhere: `{ place: key }` or `{ level: id }`. */
export const HOUSE_GO = "house:go";

/** How long walking up to something takes, before the picture changes. */
export const WALK_MS = 1000;

// How far the eye has gone toward a thing: k is 0 standing back, 1 right up
// to it. One movement, not two: the thing itself is what the picture grows
// round. It travels in a straight line between where it stands on the
// screen and the middle of it while everything swells about it, and the
// swelling is even — each moment larger by the same proportion — so nothing
// lurches or slides sideways on the way. Right up to it, it fills a good
// part of the picture, however small it is.
function aim(camera, box, k) {
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
  scene.tweens.addCounter({ from: 0, to: 1, duration: WALK_MS, ease: "Sine.easeInOut", onUpdate: (tween) => aim(camera, box, tween.getValue()) });
}

/** The same walk the other way: the scene opens right up against the thing
 *  the player has just come away from, and draws back until the whole place
 *  is in view. Nothing can be clicked until it has. */
export function zoomOutFrom(scene, box) {
  if (scene.reducedMotion) return;
  const camera = scene.cameras.main;
  aim(camera, box, 1);
  scene.input.enabled = false;
  scene.tweens.addCounter({
    from: 1,
    to: 0,
    duration: WALK_MS,
    ease: "Sine.easeInOut",
    onUpdate: (tween) => aim(camera, box, tween.getValue()),
    onComplete: () => { aim(camera, box, 0); scene.input.enabled = true; },
  });
}

/** What the index tells while a puzzle is open. */
export const PUZZLE_STORY = [
  "Everything needed is in front of you. Nothing here is decoration, and nothing will explain itself.",
  "Find the word, and write it in the box below.",
];
