import { waxSeal } from "./seal.js";

// The map of the house: an architect's plan of its three floors, inked on old
// paper — the walls drawn thick and hatched, every door with the arc of its
// swing, the stairs with their treads, the round room's spiral at its heart.
// What has been stood in is inked firm and can be clicked to go straight back
// there; what has not is only pencilled in. Each place shows a dot for each
// of its puzzles, filled once solved; a finished room is sealed in wax, as in
// the index; a pin marks where the player stands. Opened with the Map button
// or M.

const NS = "http://www.w3.org/2000/svg";
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII"];
const PAPER = "#d9cfb2";
const OUTER = 7, INNER = 4.5; // the thickness of the walls
const W = 1000, H = 610;

// the plan, in the map's own units; each floor drawn in its own column
const PLAN = [
  { title: "The Botany", roman: "I", x: 10, hall: { key: "Hall", x: 132, y: 130, w: 56, h: 340 },
    rooms: [
      { key: "Study", n: 1, x: 40, y: 357, w: 92, h: 113, side: -1 }, { key: "Room2", n: 2, x: 40, y: 243, w: 92, h: 114, side: -1 }, { key: "Room3", n: 3, x: 40, y: 130, w: 92, h: 113, side: -1 },
      { key: "Room4", n: 4, x: 188, y: 357, w: 92, h: 113, side: 1 }, { key: "Room5", n: 5, x: 188, y: 243, w: 92, h: 114, side: 1 }, { key: "Room6", n: 6, x: 188, y: 130, w: 92, h: 113, side: 1 },
    ], stairs: { x: 138, y: 136, w: 44, h: 48, dir: "up" }, entrance: true },
  { title: "The Chemistry", roman: "II", x: 330, hall: { key: "Upper", x: 132, y: 130, w: 56, h: 340 },
    rooms: [
      { key: "Room7", n: 7, x: 40, y: 243, w: 92, h: 227, side: -1 }, { key: "Room8", n: 8, x: 40, y: 130, w: 92, h: 113, side: -1 },
      { key: "Room9", n: 9, x: 188, y: 243, w: 92, h: 114, side: 1 }, { key: "Room10", n: 10, x: 188, y: 130, w: 92, h: 113, side: 1 },
    ], stairs: { x: 194, y: 363, w: 80, h: 101, dir: "up", well: true }, well: { x: 188, y: 357, w: 92, h: 113 }, landing: { x: 138, y: 136, w: 44, h: 48 } },
  { title: "The Physics", roman: "III", x: 650, round: { key: "Top", cx: 180, cy: 345, r: 78 },
    rooms: [
      { key: "Room11", n: 11, x: 270, y: 262, w: 52, h: 58, door: [270, 302, "v"], neck: { x: 245, y: 294, w: 25, h: 16, along: "h", open: [238, 296, 16, 12] } },
    ],
    passage: { key: "TopHall", x: 56, y: 130, w: 40, h: 188, stub: { x: 96, y: 290, w: 30, h: 28 } },
    wing: [
      { key: "Room12", n: 12, x: 14, y: 200, w: 42, h: 52, door: [56, 226, "v"] },
      { key: "Room13", n: 13, x: 96, y: 200, w: 42, h: 52, door: [96, 226, "v"] },
    ] },
];

const el = (name, attrs = {}, parent) => {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent?.appendChild(node);
  return node;
};
const text = (parent, x, y, cls, words, attrs = {}) => {
  const t = el("text", { x, y, class: cls, ...attrs }, parent);
  t.textContent = words;
  return t;
};
const rect = (x, y, w, h) => `M${x},${y} H${x + w} V${y + h} H${x} Z`;

// the paper and the pens: grain, a hand's unsteadiness, the hatching of a cut wall
function defs(svg) {
  const d = el("defs", {}, svg);
  const grain = el("filter", { id: "map-grain", x: 0, y: 0, width: "100%", height: "100%" }, d);
  el("feTurbulence", { type: "fractalNoise", baseFrequency: ".85", numOctaves: 3, seed: 4, result: "n" }, grain);
  el("feColorMatrix", { in: "n", type: "matrix", values: "0 0 0 0 .32  0 0 0 0 .24  0 0 0 0 .12  0 0 0 -1.6 1.05" }, grain);
  const blot = el("filter", { id: "map-blot", x: 0, y: 0, width: "100%", height: "100%" }, d);
  el("feTurbulence", { type: "fractalNoise", baseFrequency: ".006", numOctaves: 4, seed: 11, result: "n" }, blot);
  el("feColorMatrix", { in: "n", type: "matrix", values: "0 0 0 0 .4  0 0 0 0 .27  0 0 0 0 .1  0 0 0 -2.4 1.3" }, blot);
  const hand = el("filter", { id: "map-hand", x: "-2%", y: "-2%", width: "104%", height: "104%" }, d);
  el("feTurbulence", { type: "fractalNoise", baseFrequency: ".045", numOctaves: 2, seed: 3, result: "w" }, hand);
  el("feDisplacementMap", { in: "SourceGraphic", in2: "w", scale: 2.6, xChannelSelector: "R", yChannelSelector: "G" }, hand);
  const poche = el("pattern", { id: "map-poche", width: 4, height: 4, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, d);
  el("rect", { width: 4, height: 4, fill: PAPER }, poche);
  el("path", { d: "M0,0 V4", stroke: "#2a2118", "stroke-width": 1.5 }, poche);
  const faint = el("pattern", { id: "map-faint", width: 7, height: 7, patternUnits: "userSpaceOnUse", patternTransform: "rotate(-45)" }, d);
  el("path", { d: "M0,0 V7", stroke: "#2a211822", "stroke-width": 1 }, faint);
  const edge = el("radialGradient", { id: "map-edge", cx: "50%", cy: "48%", r: "75%" }, d);
  el("stop", { offset: ".55", "stop-color": "#5a3e1a", "stop-opacity": 0 }, edge);
  el("stop", { offset: "1", "stop-color": "#5a3e1a", "stop-opacity": ".42" }, edge);
}

export function mountHouseMap(scope, { levels, dialogs, travel, i18n = null }) {
  const modal = document.getElementById("map-modal");
  const holder = document.getElementById("house-map");
  const keysLine = document.getElementById("map-keys");
  if (!modal || !holder) return { open() {} };

  // a place: inked if stood in, pencilled if not; clickable to go there
  function placeNode(parent, state, label) {
    const g = el("g", { class: "map-place" }, parent);
    g.classList.toggle("known", Boolean(state?.visited));
    g.classList.toggle("here", Boolean(state?.here));
    g.classList.toggle("done", Boolean(state?.finished));
    if (state?.visited && state.open && !state.here) {
      const labelText = i18n ? i18n.t('map.goTo', { label }) : `Go to ${label}`;
      g.classList.add("go");
      g.setAttribute("role", "button");
      g.setAttribute("tabindex", "0");
      g.setAttribute("aria-label", labelText);
      const act = () => { dialogs.close(); travel(state.key); };
      g.addEventListener("click", act);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } });
      g.dataset.tip = labelText;
    }
    return g;
  }

  // a cut wall: inked both faces, hatched between
  function wall(layer, d, width, known = true) {
    if (!known) { el("path", { d, class: "pencil" }, layer); return; }
    el("path", { d, class: "wall-ink", "stroke-width": width + 1.8 }, layer);
    el("path", { d, class: "wall-cut", "stroke-width": width - 0.4 }, layer);
  }
  // a door: the gap in the wall, the leaf standing open, its arc on the floor
  function door(layers, x, y, along, into, known = true, size = 15) {
    const h = along === "h";
    const t = OUTER + 3;
    el("rect", h ? { x: x - size / 2, y: y - t / 2, width: size, height: t, fill: "#000" } : { x: x - t / 2, y: y - size / 2, width: t, height: size, fill: "#000" }, layers.openings);
    if (!known) return;
    const layer = layers.doors;
    const hx = h ? x - size / 2 : x, hy = h ? y : y - size / 2;
    const lx = h ? hx : hx + into * size, ly = h ? hy + into * size : hy;
    const ex = h ? x + size / 2 : x, ey = h ? y : y + size / 2;
    el("path", { d: `M${hx},${hy} L${lx},${ly}`, class: "leaf" }, layer);
    const sweep = (h ? into > 0 : into < 0) ? 0 : 1;
    el("path", { d: `M${lx},${ly} A${size},${size} 0 0 ${sweep} ${ex},${ey}`, class: "swing" }, layer);
  }
  // a flight of stairs: its treads, the line of the climb and its arrow
  function stairs(layer, s, known) {
    const g = el("g", { class: known ? "stairs" : "stairs pencil-set" }, layer);
    const n = Math.round(s.h / 6.5);
    if (s.well) {
      // a dog-leg: two flights side by side, a landing at the far end
      const half = s.w / 2;
      el("path", { d: rect(s.x, s.y, s.w, s.h), class: "tread-edge" }, g);
      el("path", { d: `M${s.x + half},${s.y + 18} V${s.y + s.h}`, class: "tread-edge" }, g);
      for (let i = 0; i < n - 3; i++) {
        const y = s.y + 18 + i * ((s.h - 18) / (n - 3));
        el("path", { d: `M${s.x},${y} h${half} M${s.x + half},${y} h${half}`, class: "tread" }, g);
      }
      el("path", { d: `M${s.x + half / 2},${s.y + s.h - 6} V${s.y + 9} H${s.x + half * 1.5} V${s.y + s.h - 26}`, class: "climb" }, g);
      el("path", { d: `M${s.x + half * 1.5 - 4},${s.y + s.h - 32} l4,7 l4,-7`, class: "climb-head" }, g);
      text(g, s.x + s.w / 2, s.y + 13, "note small", s.dir);
      return;
    }
    el("path", { d: rect(s.x, s.y, s.w, s.h), class: "tread-edge" }, g);
    for (let i = 1; i < n; i++) el("path", { d: `M${s.x},${s.y + i * (s.h / n)} h${s.w}`, class: "tread" }, g);
    el("path", { d: `M${s.x + s.w / 2},${s.y + s.h - 3} V${s.y + 8}`, class: "climb" }, g);
    if (s.dir === "down") el("path", { d: `M${s.x + s.w / 2 - 4},${s.y + s.h - 10} l4,7 l4,-7`, class: "climb-head" }, g);
    else el("path", { d: `M${s.x + s.w / 2 - 4},${s.y + 14} l4,-7 l4,7`, class: "climb-head" }, g);
    text(g, s.x + s.w / 2, s.y + s.h + 12, "note small", s.dir);
  }
  // a spiral stair, seen from above: the newel, the treads wound round it
  function spiral(layer, cx, cy, r, known) {
    const g = el("g", { class: known ? "stairs" : "stairs pencil-set" }, layer);
    el("circle", { cx, cy, r, class: "tread-edge" }, g);
    el("circle", { cx, cy, r: 3.2, class: "newel" }, g);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 - Math.PI / 2;
      el("path", { d: `M${cx + Math.cos(a) * 3.2},${cy + Math.sin(a) * 3.2} L${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`, class: "tread" }, g);
    }
    el("path", { d: `M${cx + r * 0.62},${cy} A${r * 0.62},${r * 0.62} 0 1 1 ${cx},${cy + r * 0.62}`, class: "climb" }, g);
    el("path", { d: `M${cx + 6},${cy + r * 0.62 - 4} l-6,4 l6,4`, class: "climb-head" }, g);
  }

  // the dots for a place's puzzles, filled for those solved
  function dots(g, state, cx, y) {
    if (!state?.visited || !state.puzzles) return;
    const step = 10, x0 = cx - ((state.puzzles - 1) * step) / 2;
    for (let i = 0; i < state.puzzles; i++) {
      el("circle", { cx: x0 + i * step, cy: y, r: 3.1, class: i < state.solved ? "dot solved" : "dot" }, g);
    }
  }
  // a room's tag: its numeral in a ring, as on an architect's drawing
  function tag(g, cx, cy, n, small = false) {
    el("circle", { cx, cy, r: small ? 10 : 13, class: "tag-ring" }, g);
    text(g, cx, cy + (small ? 3.6 : 4.6), small ? "numeral small" : "numeral", ROMAN[n - 1]);
  }
  function seal(g, x, y, n, size = 22) {
    const s = waxSeal(n);
    for (const [k, v] of Object.entries({ x: x - size / 2, y: y - size / 2, width: size, height: size })) s.setAttribute(k, v);
    s.setAttribute("class", "map-seal");
    g.appendChild(s);
  }
  // the pin where the player stands, its ring breathing
  function here(layer, x, y) {
    const g = el("g", { class: "here", transform: `translate(${x},${y})` }, layer);
    el("circle", { r: 9, class: "here-pulse" }, g);
    el("ellipse", { cx: 0, cy: 1, rx: 4.5, ry: 1.6, class: "here-shadow" }, g);
    el("path", { d: "M0,0 C-2,-6 -7,-9 -7,-15 A7,7 0 1 1 7,-15 C7,-9 2,-6 0,0 Z", class: "here-pin" }, g);
    el("circle", { cx: 0, cy: -15, r: 2.6, class: "here-eye" }, g);
  }

  function room(f, layers, room, { stateful = true, small = false } = {}) {
    const state = stateful && room.key ? levels.placeState(room.key) : null;
    const known = Boolean(state?.visited);
    const g = placeNode(layers.places, state, state?.name ?? `Room ${ROMAN[room.n - 1]}`);
    el("path", { d: rect(room.x, room.y, room.w, room.h), class: known ? "floor known" : "floor" }, g);
    wall(layers.walls, rect(room.x, room.y, room.w, room.h), INNER, known);
    const cx = room.x + room.w / 2, cy = room.y + room.h / 2;
    tag(g, cx, cy - (state?.puzzles && known ? 6 : 0), room.n, small);
    if (!room.key && room.h >= 90) text(g, cx, cy + 26, "note faint", "unexplored");
    dots(g, state, cx, cy + 16);
    if (state?.finished) seal(g, room.x + room.w - 15, room.y + 15, room.n, small ? 16 : 22);
    if (state?.here) here(layers.marks, cx, room.y + 26);
    if (room.neck) {
      const k = room.neck;
      el("path", { d: rect(k.x, k.y, k.w, k.h), class: "floor neck" }, g);
      wall(layers.walls, k.along === "v" ? `M${k.x},${k.y} v${k.h} M${k.x + k.w},${k.y} v${k.h}` : `M${k.x},${k.y} h${k.w} M${k.x},${k.y + k.h} h${k.w}`, INNER, known);
      const [ox, oy, ow, oh] = k.open;
      el("rect", { x: ox, y: oy, width: ow, height: oh, fill: "#000" }, layers.openings);
    }
    // its door onto the hall
    if (room.door) {
      const [dx, dy, along] = room.door;
      door(layers, dx, dy, along, along === "h" ? -1 : room.x >= dx ? 1 : -1, known);
    } else if (room.side) {
      const dx = room.side < 0 ? room.x + room.w : room.x;
      door(layers, dx, cy, "v", -room.side, known);
    }
  }

  function render() {
    holder.textContent = "";
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "map-sheet", role: "group", "aria-label": "Plan of the house" }, holder);
    defs(svg);
    // the paper: its colour, its stains, its grain, its edges browned
    el("rect", { width: W, height: H, fill: PAPER }, svg);
    el("rect", { width: W, height: H, filter: "url(#map-blot)", opacity: ".55" }, svg);
    // the border: a double rule, its corners tied off with small squares
    const frame = el("g", { class: "frame" }, svg);
    el("rect", { x: 12, y: 12, width: W - 24, height: H - 24, class: "rule thick" }, frame);
    el("rect", { x: 18, y: 18, width: W - 36, height: H - 36, class: "rule" }, frame);
    for (const [x, y] of [[12, 12], [W - 12, 12], [12, H - 12], [W - 12, H - 12]]) {
      el("rect", { x: x - 6, y: y - 6, width: 12, height: 12, class: "corner" }, frame);
      el("rect", { x: x - 2.5, y: y - 2.5, width: 5, height: 5, class: "corner-in" }, frame);
    }
    const ink = el("g", { filter: "url(#map-hand)" }, svg);

    for (const [i, floor] of PLAN.entries()) {
      const f = el("g", { transform: `translate(${floor.x},0)` }, ink);
      // the floor's name, lettered over it
      const floorTitle = i18n ? i18n.getFloorName(floor.title) : floor.title;
      text(f, 160, 66, "floor-title", floorTitle.toUpperCase());
      el("path", { d: "M92,78 H146 M174,78 H228", class: "floor-rule" }, f);
      el("path", { d: "M160,74 l4,4 l-4,4 l-4,-4 Z", class: "floor-diamond" }, f);
      text(f, 160, 96, "floor-roman", `— ${floor.roman} —`);
      // the openings are cut out of the walls, so the floors run on through them
      const cut = el("mask", { id: `map-cut-${i}`, maskUnits: "userSpaceOnUse", x: -60, y: 0, width: 440, height: H }, f);
      el("rect", { x: -60, y: 0, width: 440, height: H, fill: "#fff" }, cut);
      const layers = { places: el("g", {}, f), walls: el("g", { mask: `url(#map-cut-${i})` }, f), openings: cut, doors: el("g", {}, f), marks: el("g", {}, f) };

      if (floor.hall) {
        const h = floor.hall, state = levels.placeState(h.key), known = Boolean(state?.visited);
        // the shell of the floor, outer walls thickest
        const shell = { x: 40, y: 130, w: 240, h: 340 };
        const g = placeNode(layers.places, state, state?.name ?? "the hall");
        el("path", { d: rect(h.x, h.y, h.w, h.h), class: known ? "floor hall known" : "floor hall" }, g);
        // the hall's length: its name written down it, its dots, its runner
        el("path", { d: rect(h.x + 14, h.y + 76, h.w - 28, h.h - 104), class: "runner" }, g);
        text(g, h.x + h.w / 2, h.y + h.h / 2 + 14, "name vertical", known ? state.name : "a hall", { transform: `rotate(-90 ${h.x + h.w / 2} ${h.y + h.h / 2 + 14})` });
        dots(g, state, h.x + h.w / 2, h.y + h.h - 18);
        if (state?.here) here(layers.marks, h.x + h.w / 2, h.y + h.h - 40);
        for (const r of floor.rooms) room(f, layers, r);
        wall(layers.walls, rect(shell.x, shell.y, shell.w, shell.h), OUTER, known);
        if (floor.well) {
          const w = floor.well;
          wall(layers.walls, rect(w.x, w.y, w.w, w.h), INNER, known);
          el("rect", { x: w.x - 6, y: w.y + 30, width: 12, height: 50, fill: "#000" }, layers.openings);
        }
        if (floor.stairs) stairs(layers.marks, floor.stairs, known);
        if (floor.landing) {
          // where the stairs from below come up
          const s = floor.landing;
          stairs(layers.marks, { ...s, dir: "down" }, known);
        }
        if (floor.entrance) {
          // the front door, and the way in to it
          door(layers, h.x + h.w / 2, shell.y + shell.h, "h", -1, true, 22);
          el("path", { d: `M${h.x + h.w / 2},${shell.y + shell.h + 32} V${shell.y + shell.h + 10}`, class: "climb" }, f);
          el("path", { d: `M${h.x + h.w / 2 - 4},${shell.y + shell.h + 16} l4,-7 l4,7`, class: "climb-head" }, f);
          text(f, h.x + h.w / 2, shell.y + shell.h + 46, "note", "the way in");
        }
      }

      if (floor.round) {
        const r = floor.round, state = levels.placeState(r.key), known = Boolean(state?.visited);
        // the passage first, so the round room's wall closes over its end
        const p = floor.passage, ps = levels.placeState(p.key), pk = Boolean(ps?.visited);
        const pg = placeNode(layers.places, ps, ps?.name ?? "the passage");
        const passage = `${rect(p.x, p.y, p.w, p.h)} ${rect(p.stub.x - 2, p.stub.y, p.stub.w + 2, p.stub.h)}`;
        el("path", { d: passage, class: pk ? "floor passage known" : "floor passage" }, pg);
        text(pg, p.x + p.w / 2, p.y + p.h / 2 - 10, "name vertical", pk ? ps.name : "a passage", { transform: `rotate(-90 ${p.x + p.w / 2} ${p.y + p.h / 2 - 10})` });
        if (ps?.here) here(layers.marks, p.x + p.w / 2, p.y + p.h - 14);
        wall(layers.walls, `M${p.x},${p.y + p.h} V${p.y} H${p.x + p.w} V${p.stub.y}`, OUTER, pk);
        wall(layers.walls, `M${p.x},${p.y + p.h} H${p.stub.x + p.stub.w}`, OUTER, pk);
        wall(layers.walls, `M${p.x + p.w},${p.stub.y} H${p.stub.x + p.stub.w}`, INNER, pk);
        for (const w of floor.wing) room(f, layers, w, { stateful: false, small: true });
        // the round room, its spiral stair in the middle
        const g = placeNode(layers.places, state, state?.name ?? "the top floor");
        el("circle", { cx: r.cx, cy: r.cy, r: r.r, class: known ? "floor round known" : "floor round" }, g);
        el("circle", { cx: r.cx, cy: r.cy, r: r.r - 12, class: "inlay" }, g);
        text(g, r.cx, r.cy - 40, "name", known ? state.name : "a round room");
        dots(g, state, r.cx, r.cy + 46);
        spiral(layers.marks, r.cx, r.cy + 4, 24, known);
        if (state?.here) here(layers.marks, r.cx + 40, r.cy - 10);
        for (const rm of floor.rooms) room(f, layers, rm, { stateful: false });
        wall(layers.walls, `M${r.cx - r.r},${r.cy} a${r.r},${r.r} 0 1 0 ${r.r * 2},0 a${r.r},${r.r} 0 1 0 ${-r.r * 2},0`, OUTER, known);
        // the opening into the passage, and the window looking out at the sky
        el("rect", { x: p.stub.x + p.stub.w - 8, y: p.stub.y + 3, width: 14, height: p.stub.h - 6, fill: "#000" }, layers.openings);
        el("path", { d: `M${r.cx - 14},${r.cy + r.r} h28`, class: "window" }, layers.doors);
      }
    }

    // under the plan: the compass, the legend, the scale, the cartouche
    const foot = el("g", { class: "foot" }, svg);
    compass(foot, 62, 545);
    legend(foot, 300, 524);
    cartouche(foot, 760, 500);
    // the paper's grain over everything, and its edges browned by handling
    el("rect", { width: W, height: H, filter: "url(#map-grain)", opacity: ".45", "pointer-events": "none" }, svg);
    el("rect", { width: W, height: H, fill: "url(#map-edge)", "pointer-events": "none" }, svg);

    // the keys in hand, under the plan
    const keys = levels.keys;
    if (keys.length) {
      const formatted = keys.map((k) => i18n ? i18n.t('map.keyToDoor', { door: ROMAN[k.door - 1] }) : `the key to door ${ROMAN[k.door - 1]}`).join(", ");
      keysLine.textContent = i18n ? i18n.t('map.pocketKeys', { keys: formatted }) : `In your pocket: ${formatted}.`;
    } else {
      keysLine.textContent = "";
    }
    keysLine.hidden = !keys.length;
  }

  function compass(g, x, y) {
    const c = el("g", { class: "compass", transform: `translate(${x},${y})` }, g);
    el("circle", { r: 30, class: "rule" }, c);
    el("circle", { r: 26, class: "rule faint" }, c);
    for (let i = 0; i < 8; i++) {
      const long = i % 2 === 0, a = (i / 8) * Math.PI * 2, l = long ? 34 : 19, w = long ? 6 : 4.5;
      const tip = [Math.sin(a) * l, -Math.cos(a) * l];
      const left = [Math.sin(a - Math.PI / 2) * w, -Math.cos(a - Math.PI / 2) * w];
      const right = [-left[0], -left[1]];
      el("path", { d: `M0,0 L${left} L${tip} Z`, class: "point dark" }, c);
      el("path", { d: `M0,0 L${right} L${tip} Z`, class: "point" }, c);
    }
    el("circle", { r: 2.4, class: "newel" }, c);
    text(c, 0, -40, "compass-n", "N");
  }
  function legend(g, x, y) {
    const l = el("g", { class: "legend", transform: `translate(${x},${y})` }, g);
    const row = (i, draw, words) => { const r = el("g", { transform: `translate(${(i % 2) * 170},${Math.floor(i / 2) * 26})` }, l); draw(r); text(r, 22, 5, "legend-text", words); };
    row(0, (r) => { el("circle", { cx: 4, cy: 0, r: 3.1, class: "dot solved" }, r); el("circle", { cx: 14, cy: 0, r: 3.1, class: "dot" }, r); }, i18n ? i18n.t('map.legendPuzzle') : "a puzzle, solved or not");
    row(1, (r) => seal(r, 9, 0, 3, 18), i18n ? i18n.t('map.legendDone') : "everything in it solved");
    row(2, (r) => here(r, 9, 8), i18n ? i18n.t('map.legendHere') : "where you stand");
    row(3, (r) => el("path", { d: "M0,-4 h18 v8 h-18 Z", class: "pencil" }, r), i18n ? i18n.t('map.legendUnvisited') : "not yet been in");
  }
  function scaleBar(g, x, y) {
    const s = el("g", { class: "scale", transform: `translate(${x},${y})` }, g);
    for (let i = 0; i < 5; i++) el("rect", { x: i * 24, y: -4, width: 24, height: 6, class: i % 2 ? "bar" : "bar dark" }, s);
    for (const [i, n] of [[0, "0"], [2, "10"], [5, "25 ft"]]) text(s, i * 24, 16, "scale-text", n);
  }
  function cartouche(g, x, y) {
    const c = el("g", { class: "cartouche", transform: `translate(${x},${y})` }, g);
    el("rect", { x: 0, y: 0, width: 210, height: 88, class: "rule thick" }, c);
    el("rect", { x: 4, y: 4, width: 202, height: 80, class: "rule" }, c);
    text(c, 105, 28, "cartouche-title", i18n ? i18n.t('map.cartoucheTitle') : "THE HOUSE");
    el("path", { d: "M40,36 H170", class: "rule faint" }, c);
    text(c, 105, 51, "cartouche-sub", i18n ? i18n.t('map.cartoucheSub') : "three floors, as far as seen");
    scaleBar(c, 45, 66);
  }

  if (i18n) scope.add(i18n.subscribe(() => { if (modal && !modal.classList.contains("hidden")) render(); }));

  return {
    open(trigger) { render(); dialogs.open("map-modal", trigger); },
  };
}
