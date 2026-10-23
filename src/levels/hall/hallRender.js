import { makeCanvas } from "../../shared/paint.js";

// The halls rendered in Blender, through the same eye as layoutHall
// (art/blender/hall_ground.py, hall_chem.py and their publish scripts). On
// every floor: the hall itself; the same with nothing stood in it, for a door
// to swing open with; what stands in it, alone. On the ground floor the
// gate's two leaves and the clock's pendulum, apart; on the chemist's floor
// the hall again with its bulb alight.
const RENDERS = {
  ground: {
    plate: { key: "hall_ground_render_v1", url: "assets/images/Botany/hall-ground-render-v1.webp" },
    doors: { key: "hall_ground_doors_render_v1", url: "assets/images/Botany/hall-ground-doors-render-v1.webp" },
    front: { key: "hall_ground_front_render_v1", url: "assets/images/Botany/hall-ground-front-render-v1.webp" },
    gateL: { key: "hall_gate_left_render_v1", url: "assets/images/Botany/hall-gate-left-render-v1.webp" },
    gateR: { key: "hall_gate_right_render_v1", url: "assets/images/Botany/hall-gate-right-render-v1.webp" },
    pendulum: { key: "hall_pendulum_render_v1", url: "assets/images/Botany/hall-pendulum-render-v1.webp" },
  },
  upper: {
    plate: { key: "hall_chem_render_v1", url: "assets/images/Chemistry/hall-chem-render-v1.webp" },
    lit: { key: "hall_chem_lit_render_v1", url: "assets/images/Chemistry/hall-chem-lit-render-v1.webp" },
    doors: { key: "hall_chem_doors_render_v1", url: "assets/images/Chemistry/hall-chem-doors-render-v1.webp" },
    front: { key: "hall_chem_front_render_v1", url: "assets/images/Chemistry/hall-chem-front-render-v1.webp" },
  },
};

export function loadHallRender(scene, floor) {
  for (const { key, url } of Object.values(RENDERS[floor])) if (!scene.textures.exists(key)) scene.load.image(key, url);
}

/** A floor's rendered pictures, or null if they did not all come. */
export function hallRender(scene, floor) {
  const render = RENDERS[floor];
  if (!render || !Object.values(render).every(({ key }) => scene.textures.exists(key))) return null;
  return Object.fromEntries(Object.entries(render).map(([name, { key }]) => [name, scene.textures.get(key).getSourceImage()]));
}

// Where the render lies on the screen. It was made at the layout's measure
// for a screen 1856 × 1000, and the layout goes across with the hall's
// width (its walls 0.6 of the picture out from the middle) and down with
// the screen's height: so the render is as wide as that measure, centred,
// and as tall as the screen.
function frame(L) {
  const width = L.wall / 0.6;
  return { x: L.vp.x - width / 2, width };
}

/** One of the full-frame pictures (plate, lit, doors, front), laid where it lies. */
export function paintHallRender(ctx, L, picture) {
  const { x, width } = frame(L);
  ctx.drawImage(L.render[picture], x, 0, width, L.H);
}

/** A box in the reference picture's pixels (as the renders' scripts give
 *  them), where it lies on this screen. */
export function renderBox(L, [x, y, width, height]) {
  const f = frame(L), sx = f.width / 1856, sy = L.H / 1000;
  return { x: f.x + x * sx, y: y * sy, width: width * sx, height: height * sy };
}

/** One of the parts (gateL, gateR, pendulum) on a canvas of its own. */
export function hallRenderPart(L, part) {
  const image = L.render[part], c = makeCanvas(image.width, image.height);
  c.getContext("2d").drawImage(image, 0, 0);
  return c;
}
