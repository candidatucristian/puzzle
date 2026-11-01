import RENDER from "./rallyRender.json";

/** The Night Circuit as Blender rendered it (art/blender/rally_stage.py,
 *  rally_cars.py, rally_board.py; rally_publish.mjs): the stage under its
 *  floodlights and without them, what stands in front of the cars, the six
 *  cars at every view the drive needs, the people, the board the top three
 *  come up on, the tape's lettering and the television it is watched on.
 *
 *  All of it is drawn for one picture, 1880 × 1000 (RENDER.ref): the scene
 *  lays it out at that size and its camera fits that picture to the screen. */

export const REF = RENDER.ref;
const BASE = `assets/images/Rally/v${RENDER.version}`;
export const RK = {
  lit: "ry_r_lit", dark: "ry_r_dark", frontLit: "ry_r_front_lit", frontDark: "ry_r_front_dark",
  people: "ry_r_people", board: "ry_r_board", tv: "ry_r_tv",
  car: (i) => `ry_r_car_${i}`,
};
const FILES = [
  [RK.lit, "stage-lit"], [RK.dark, "stage-dark"], [RK.frontLit, "front-lit"], [RK.frontDark, "front-dark"],
  [RK.people, "people"], [RK.board, "board"], [RK.tv, "tv"],
  ...RENDER.cars.liveries.map((_, i) => [RK.car(i), `car-${i}`]),
];

export function loadRallyRender(scene) {
  if (!RENDER.version) return;                      // (not published yet: the painted stage)
  for (const [key, name] of FILES) if (!scene.textures.exists(key)) scene.load.image(key, `${BASE}/${name}.webp`);
}

/** Whether every picture came. */
export function hasRallyRender(scene) {
  return Boolean(RENDER.version) && FILES.every(([key]) => scene.textures.exists(key));
}

// the frames packed into an atlas, by name
function frames(scene, key, list) {
  const tex = scene.textures.get(key);
  for (const [name, [x, y, w, h]] of Object.entries(list)) if (!tex.has(name)) tex.add(name, 0, x, y, w, h);
}

/** The cars, as cars.js's paintCarsSteps returns them: a sheet per car, a
 *  frame per view, where the car's foot is in each, its lamps. */
export function rallyCarArt(scene, glare) {
  const C = RENDER.cars;
  const keys = C.liveries.map((_, c) => {
    const key = RK.car(c), tex = scene.textures.get(key);
    C.frames.forEach((_, i) => {
      if (!tex.has(String(i))) tex.add(String(i), 0, (i % C.cols) * C.cell.w, Math.floor(i / C.cols) * C.cell.h, C.cell.w, C.cell.h);
    });
    return key;
  });
  return { keys, glare, cell: C.cell, res: C.res, frames: C.frames, origin: { x: C.cell.ax / C.cell.w, y: C.cell.ay / C.cell.h } };
}

/** The people, as people.js's paintPeople returns them. */
export function rallyPeople(scene) {
  const P = RENDER.people;
  frames(scene, RK.people, P.atlas);
  return {
    key: RK.people, res: P.res,
    crowd: P.crowd.map((c) => ({ frame: c.frame, cheerFrame: c.cheerFrame, ox: c.ox, oy: c.oy, x: c.x, y: c.y, z: c.z })),
    marshal: { ...P.marshal, arms: P.marshal.arms },
  };
}

/** The board's pieces: the board itself, each cup, each name. */
export function rallyBoard(scene) {
  const B = RENDER.board;
  frames(scene, RK.board, B.atlas);
  return B;
}

/** The tape's lettering: PLAY, SP, the caption (frames of the board's atlas). */
export function rallyLettering(scene) {
  const B = RENDER.board;
  frames(scene, RK.board, B.atlas);
  return { key: RK.board, osd: B.osd, caption: B.caption, res: B.res };
}

export const RALLY_TV = RENDER.board.tv;
