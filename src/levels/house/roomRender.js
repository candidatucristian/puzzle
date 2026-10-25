import { makeCanvas } from "../../shared/paint.js";
import { thingAt } from "./roomKit.js";

// The rooms off the halls, rendered in Blender (art/blender/room_common.py,
// room_<name>.py, room_publish.mjs): each room by its one light, as the halls
// are — one plate, `lights-1`, the same whatever has been solved in it — the
// room's gilt chest, shut and open, and any frames of its own (a drawer
// sliding out). Each room is seen from where it is
// best seen; Blender says where everything the scene keeps alive fell in the
// picture (house/rooms/<Room>.json), and the render is laid over the screen
// covering it, never stretched.
const ROOMS = {
  Study: { folder: "Room1", version: 2 },
  Room2: { folder: "Room2" },
  Room3: { folder: "Room3" },
  Room4: { folder: "Room4", extra: Array.from({ length: 10 }, (_, i) => `drawer-${i}`) },
  Room5: { folder: "Room5" },
  Room7: { folder: "Room7", chest: false, extra: Array.from({ length: 6 }, (_, i) => `notebook-${i}`) },
  Room8: { folder: "Room8", chest: false },
  ...Object.fromEntries([9, 11, 12, 13].map((n) => [`Room${n}`, { folder: `Room${n}`, chest: false }])),
};
const keyOf = (room, name) => `${room}_render_${name}${ROOMS[room].version ? `_v${ROOMS[room].version}` : ""}`;
const urlOf = (room, name) => {
  const folder = ROOMS[room].folder;
  return `assets/images/${folder}/${folder.toLowerCase()}-${name}-render-v${ROOMS[room].version ?? 1}.webp`;
};
const picturesOf = (room) => {
  const chest = ROOMS[room].chest === false ? [] : ["chest-shut", "chest-open"];
  return ["lights-1", ...chest, ...(ROOMS[room].extra ?? [])];
};

export function loadRoomRender(scene, room) {
  for (const name of picturesOf(room)) {
    const key = keyOf(room, name);
    if (!scene.textures.exists(key)) scene.load.image(key, urlOf(room, name));
  }
}

/** Whether the room's renders have all come. */
export function hasRoomRender(scene, room) {
  return Boolean(ROOMS[room]) && picturesOf(room).every((name) => scene.textures.exists(keyOf(room, name)));
}

/** The room as its render has it (`spec`, the room's house/rooms/<Room>.json),
 *  on a screen W × H: the render covering the screen, centred; the things that
 *  open puzzles, the chest, the glows and flames, the rain's panes, where the
 *  dust turns, screens drawn over (`quads`), and whatever else the room
 *  keeps (`extra`: points, boxes). */
export function renderedLayout(W, H, spec) {
  const s = Math.max(W / spec.width, H / spec.height);
  const ox = (W - spec.width * s) / 2, oy = (H - spec.height * s) / 2;
  const at = ([x, y]) => ({ x: ox + x * s, y: oy + y * s });
  const box = ([x, y, w, h]) => ({ x: ox + x * s, y: oy + y * s, width: w * s, height: h * s });
  const L = { W, H, u: Math.min(W / 1000, H / 700), rendered: true, fit: { x: ox, y: oy, width: spec.width * s, height: spec.height * s, s } };
  L.things = spec.things.map((t) => {
    const thing = thingAt(t.level, t.label, t.quad.map(at));
    if (t.first) thing.first = thingAt(t.level, t.first.label, t.first.quad.map(at));
    return thing;
  });
  if (spec.chest) {
    const c = spec.chest;
    L.chest = { box: box(c.box), mouth: { ...at(c.mouth), s: c.mouth[2] * s }, hit: box(c.hit), glints: c.glints.map(at) };
  }
  L.glows = Object.fromEntries(Object.entries(spec.glows).map(([name, [x, y, r]]) => [name, { ...at([x, y]), r: r * s }]));
  L.flames = Object.fromEntries(Object.entries(spec.flames).map(([name, [x, y, k]]) => [name, { ...at([x, y]), s: k * s }]));
  L.extra = Object.fromEntries(Object.entries(spec.extra).map(([name, v]) => [name, v.length === 4 ? box(v) : { ...at(v), s: v[2] * s }]));
  L.dust = spec.dust ? box(spec.dust) : null;
  // flat four-cornered things the scene draws over (a screen's glass): their
  // corners, the box round them, how big a centimetre is there
  L.quads = Object.fromEntries(Object.entries(spec.quads ?? {}).map(([name, q]) => {
    const quad = q.points.map(at), xs = quad.map((p) => p.x), ys = quad.map((p) => p.y);
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    return [name, { quad, box: { x: x0, y: y0, width: Math.max(...xs) - x0, height: Math.max(...ys) - y0 }, s: q.s * s }];
  }));
  L.rain = spec.panes.length
    ? { panes: spec.panes.map((pane) => pane.map((p) => { const q = at(p); return [q.x, q.y]; })), drop: Math.max(0.45, (W / 1920) * 0.62), fog: 0.4, reach: 22, beyond: 0.5 }
    : null;
  return L;
}

/** The room's plate, laid as the room's layout lays it, covering the screen. */
export function paintRoomRender(ctx, scene, room, L) {
  const image = scene.textures.get(keyOf(room, "lights-1")).getSourceImage();
  ctx.drawImage(image, L.fit.x, L.fit.y, L.fit.width, L.fit.height);
}

/** One of the room's own pictures (the chest's, a frame) on a canvas of its own. */
export function roomRenderPicture(scene, room, name, width, height) {
  const image = scene.textures.get(keyOf(room, name)).getSourceImage();
  const c = makeCanvas(width ?? image.width, height ?? image.height);
  c.getContext("2d").drawImage(image, 0, 0, c.width, c.height);
  return c;
}

/** The chest, shut or open, on a canvas of its own: the room shows it in its box. */
export function roomRenderChest(scene, room, open) {
  return roomRenderPicture(scene, room, open ? "chest-open" : "chest-shut");
}
