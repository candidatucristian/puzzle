/** The house the rooms are in. A place is somewhere the player stands between
 *  puzzles — the hall, a room off it — and holds the things that open them:
 *  each level it holds is found there, and is come back to there once solved.
 *  `back` is the place its door leads out to; `doors` are a place's own
 *  doors in the order they are numbered, each the place behind it, or null
 *  for one that is locked. `story` is the few lines the index tells under
 *  its list while the player stands there: where they are, and what there
 *  is to do — never how. No scene code lives here. */
export const PLACES = Object.freeze([
  { key: "Hall", name: "The Hall", back: null, holds: [], doors: ["Study", null, null, null, null, null],
    story: [
      "The manor has been shut up for years, and everyone who lived in it left something behind.",
      "Six doors open off this hall. Five are locked tonight. Go through the one that is not.",
    ] },
  { key: "Study", name: "Room 1", back: "Hall", holds: ["binarytree", "plantpot", "cryptex"],
    story: [
      "Somebody worked in this room, and did not want the work read.",
      "Three things here still keep a word each. Look closely at whatever catches the light, find its word, and give it back to the house.",
      "When all three have gone dark, the room has nothing more to tell.",
    ] },
]);

/** A place asks to go somewhere: `{ place: key }` or `{ level: id }`. */
export const HOUSE_GO = "house:go";

/** How long walking up to something takes, before the picture changes. */
export const WALK_MS = 1000;

/** The scene's eye goes to a thing — a door, a case on a table — as the
 *  player walks up to it. `box` is where the thing is on the screen.
 *
 *  One movement, not two: the thing itself is what the picture grows round.
 *  It travels in a straight line from where it was clicked to the middle of
 *  the screen while everything swells about it, and the swelling is even —
 *  each moment larger by the same proportion — so nothing lurches or slides
 *  sideways on the way. It ends filling a good part of the picture, however
 *  small it was to begin with. */
export function zoomInto(scene, box) {
  if (scene.reducedMotion) return;
  const camera = scene.cameras.main;
  const W = camera.width, H = camera.height;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  const reach = Math.min(3.4, Math.max(1.7, 0.62 * Math.min(W / box.width, H / box.height)));
  scene.tweens.addCounter({
    from: 0,
    to: 1,
    duration: WALK_MS,
    ease: "Sine.easeInOut",
    onUpdate: (tween) => {
      const k = tween.getValue();
      const zoom = Math.pow(reach, k);
      // where on the screen the thing is by now
      const sx = x + (W / 2 - x) * k, sy = y + (H / 2 - y) * k;
      camera.setZoom(zoom);
      camera.setScroll(x - W / 2 - (sx - W / 2) / zoom, y - H / 2 - (sy - H / 2) / zoom);
    },
  });
}

/** What the index tells while a puzzle is open. */
export const PUZZLE_STORY = [
  "Everything needed is in front of you. Nothing here is decoration, and nothing will explain itself.",
  "Find the word, and write it in the box below.",
];
