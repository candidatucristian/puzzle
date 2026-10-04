import { METRO_STATIONS } from "./puzzle.js";
import { soft, grain, vignette, glowCanvas, makeCanvas, addCanvasTexture, lcg } from "../../shared/paint.js";

/** The station for METRO, painted like the game's storybook nights: a tiled
 *  platform wall late at night, and on it, in a steel frame, the network
 *  map lit from behind. Five lines cross the map in the network's colours,
 *  all of them dimmed but one: the lit line, which runs through five
 *  stations whose names are the puzzle. Beside the map hang a tannoy
 *  speaker and a small clock; a bench stands under them.
 *
 *  Painted once per screen size: the hall with the map, the lit line as a
 *  layer of its own (so the scene can breathe light along it), and a glow. */

const K = { room: "mt_room", line: "mt_line", glow: "mt_glow" };
const MAP_FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';
const AMBER = "255,176,64";

// the other lines: colour, a route across the map (in map units, 0–1), and
// their stations — ordinary names, none of them a phonetic word
const OTHER_LINES = [
  {
    colour: "#3a6fc4",
    path: [
      [0.04, 0.3],
      [0.3, 0.3],
      [0.46, 0.5],
      [0.7, 0.5],
      [0.96, 0.26],
    ],
    stations: [
      [0.12, 0.3, "Harbour Gate", 1],
      [0.3, 0.3, "Old Mill", -1],
      [0.54, 0.5, "Union Yard", 1],
      [0.84, 0.37, "Cathedral", -1],
    ],
  },
  {
    colour: "#3f9a5a",
    path: [
      [0.22, 0.96],
      [0.22, 0.62],
      [0.4, 0.42],
      [0.4, 0.04],
    ],
    stations: [
      [0.22, 0.86, "Market Cross", 1],
      [0.22, 0.7, "Riverside", 1],
      [0.4, 0.14, "Clock Tower", -1],
    ],
  },
  {
    colour: "#b84a7a",
    path: [
      [0.04, 0.74],
      [0.5, 0.74],
      [0.66, 0.9],
      [0.96, 0.9],
    ],
    stations: [
      [0.12, 0.74, "West Quay", 1],
      [0.5, 0.74, "Tannery", -1],
      [0.8, 0.9, "Lantern Hill", 1],
    ],
  },
  {
    colour: "#8c8c94",
    path: [
      [0.6, 0.04],
      [0.6, 0.3],
      [0.8, 0.5],
      [0.8, 0.96],
    ],
    stations: [
      [0.6, 0.16, "Granary", 1],
      [0.8, 0.8, "Fairground", -1],
    ],
  },
];

// the lit line, the one the puzzle is on: left to right across the map,
// its five stations in the order the line runs through them
const LIT_PATH = [
  [0.04, 0.58],
  [0.16, 0.58],
  [0.32, 0.42],
  [0.6, 0.42],
  [0.7, 0.62],
  [0.8, 0.62],
  [0.9, 0.46],
  [0.96, 0.46],
];
const LIT_STATIONS = [
  [0.1, 0.58, 1],
  [0.32, 0.42, -1],
  [0.6, 0.42, -1],
  [0.76, 0.62, 1],
  [0.9, 0.46, -1],
];

// ── where everything is ─────────────────────────────────────────────────────

export function layoutStation(W, H) {
  const u = Math.min(W / 1000, H / 700);
  const L = { W, H, u };
  // the map in its frame, to the left of the middle
  const mw = Math.min(W * 0.64, H * 0.86 * 1.45);
  const mh = mw / 1.45;
  L.map = { x: W * 0.43 - mw / 2, y: H * 0.5 - mh / 2, w: mw, h: mh };
  L.frame = 14 * u;
  const m = L.map;
  const at = (fx, fy) => ({ x: m.x + m.w * (0.07 + fx * 0.86), y: m.y + m.h * (0.16 + fy * 0.74) });
  L.at = at;
  L.lit = {
    path: LIT_PATH.map(([fx, fy]) => at(fx, fy)),
    stations: LIT_STATIONS.map(([fx, fy, side], i) => ({ ...at(fx, fy), side, name: METRO_STATIONS[i], i })),
  };
  L.others = OTHER_LINES.map((line) => ({
    colour: line.colour,
    path: line.path.map(([fx, fy]) => at(fx, fy)),
    stations: line.stations.map(([fx, fy, name, side]) => ({ ...at(fx, fy), name, side })),
  }));
  L.lineW = Math.max(4, mh * 0.022);
  L.dot = Math.max(4, mh * 0.016);
  L.font = Math.max(10, Math.round(mh * 0.032));
  L.litFont = Math.max(12, Math.round(mh * 0.042));
  // the tannoy and the clock on the wall to the right, the bench under them
  const rx = m.x + m.w + W * 0.03;
  L.speaker = { x: rx + (W - rx) * 0.5, y: H * 0.25, w: Math.min(120 * u, (W - rx) * 0.5), h: Math.min(120 * u, (W - rx) * 0.5) * 0.66 };
  L.clock = { x: L.speaker.x, y: H * 0.55, r: Math.min(42 * u, (W - rx) * 0.2) };
  L.bench = { x: L.speaker.x, y: H * 0.86, w: Math.min(220 * u, (W - rx) * 0.9), h: 26 * u };
  L.floorY = H * 0.9;
  return L;
}

// ── painting ────────────────────────────────────────────────────────────────

export function paintStation(scene, L) {
  const t = scene.textures;
  const { W, H } = L;
  const c = makeCanvas(W, H);
  const ctx = c.getContext("2d");
  paintWall(ctx, L);
  paintFurniture(ctx, L);
  paintMap(ctx, L);
  vignette(ctx, W, H, 0.6);
  grain(ctx, W, H, 0.035);
  addCanvasTexture(t, K.room, c);
  // the lit line on a layer of its own, so the scene can breathe its light
  const lc = makeCanvas(W, H);
  paintLitLine(lc.getContext("2d"), L);
  addCanvasTexture(t, K.line, lc);
  addCanvasTexture(t, K.glow, glowCanvas());
  return { keys: K };
}

export function releaseStationArt(textures) {
  for (const key of Object.values(K)) if (textures.exists(key)) textures.remove(key);
}

// the platform wall: glazed tiles, dark with the years, a band of darker
// tiles at the floor, the floor itself
function paintWall(ctx, L) {
  const { W, H, u, floorY } = L;
  const rnd = lcg(2401);
  ctx.fillStyle = "#1a1d22";
  ctx.fillRect(0, 0, W, H);
  const tw = 46 * u;
  const th = 23 * u;
  for (let y = 0, r = 0; y < floorY; y += th, r++) {
    const off = r % 2 ? tw / 2 : 0;
    for (let x = -off; x < W; x += tw) {
      const k = 0.85 + rnd() * 0.3;
      const low = y > floorY - th * 4;
      ctx.fillStyle = low ? `rgb(${26 * k | 0},${50 * k | 0},${54 * k | 0})` : `rgb(${54 * k | 0},${60 * k | 0},${66 * k | 0})`;
      ctx.fillRect(x + 1, y + 1, tw - 2, Math.min(th, floorY - y) - 2);
      // the glaze catching the light
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(x + 2, y + 2, tw - 4, 2 * u);
    }
  }
  // the floor: dark stone, a yellow safety line along the edge
  const fg = ctx.createLinearGradient(0, floorY, 0, H);
  fg.addColorStop(0, "#2a2a2c");
  fg.addColorStop(1, "#141416");
  ctx.fillStyle = fg;
  ctx.fillRect(0, floorY, W, H - floorY);
  ctx.fillStyle = "rgba(220,180,60,0.55)";
  ctx.fillRect(0, H - 12 * u, W, 4 * u);
  // the lamps' light along the top of the wall, and the dark at the ends
  for (let i = 0; i < 3; i++) {
    soft(ctx, W * (0.2 + 0.3 * i), -H * 0.05, W * 0.22, H * 0.5, "255,230,190", 0.08, "lighter");
  }
  soft(ctx, W * 0.5, H * 0.95, W * 0.6, H * 0.2, "0,0,0", 0.5);
}

// the tannoy speaker, the clock, the bench
function paintFurniture(ctx, L) {
  const { u } = L;
  const s = L.speaker;
  // a steel horn speaker on its bracket
  soft(ctx, s.x + 6 * u, s.y + s.h * 0.7, s.w * 0.6, s.h * 0.4, "0,0,0", 0.6);
  ctx.fillStyle = "#3a3c40";
  ctx.fillRect(s.x - 3 * u, s.y - s.h * 0.5, 6 * u, s.h * 0.2);
  const hg = ctx.createLinearGradient(s.x - s.w / 2, 0, s.x + s.w / 2, 0);
  hg.addColorStop(0, "#5a5e64");
  hg.addColorStop(0.5, "#9a9ea4");
  hg.addColorStop(1, "#44474c");
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(s.x - s.w * 0.18, s.y - s.h * 0.3);
  ctx.lineTo(s.x + s.w * 0.18, s.y - s.h * 0.3);
  ctx.lineTo(s.x + s.w * 0.5, s.y + s.h * 0.5);
  ctx.lineTo(s.x - s.w * 0.5, s.y + s.h * 0.5);
  ctx.closePath();
  ctx.fill();
  // the dark mouth of the horn, its grille
  ctx.fillStyle = "#101114";
  ctx.beginPath();
  ctx.ellipse(s.x, s.y + s.h * 0.5, s.w * 0.5, s.h * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(160,164,170,0.5)";
  ctx.lineWidth = 1.2 * u;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + s.h * 0.5, s.w * 0.5 * (1 - Math.abs(i) * 0.02), s.h * 0.16, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // a small red lamp on the bracket that blinks with the announcements
  ctx.fillStyle = "#3a1414";
  ctx.beginPath();
  ctx.arc(s.x + s.w * 0.3, s.y - s.h * 0.42, 3.5 * u, 0, Math.PI * 2);
  ctx.fill();

  // the clock: a plain station clock, stopped at a quarter to one
  const c = L.clock;
  soft(ctx, c.x + 4 * u, c.y + 6 * u, c.r * 1.3, c.r * 1.3, "0,0,0", 0.6);
  ctx.fillStyle = "#2a2c30";
  ctx.beginPath();
  ctx.arc(c.x, c.y, c.r * 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e9e4d6";
  ctx.beginPath();
  ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#2a2c30";
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.lineWidth = (i % 3 ? 1.2 : 2.4) * u;
    ctx.beginPath();
    ctx.moveTo(c.x + Math.cos(a) * c.r * 0.82, c.y + Math.sin(a) * c.r * 0.82);
    ctx.lineTo(c.x + Math.cos(a) * c.r * 0.94, c.y + Math.sin(a) * c.r * 0.94);
    ctx.stroke();
  }
  ctx.lineCap = "round";
  ctx.lineWidth = 3 * u;
  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  ctx.lineTo(c.x + Math.cos(-Math.PI / 2 + 0.26) * c.r * 0.5, c.y + Math.sin(-Math.PI / 2 + 0.26) * c.r * 0.5);
  ctx.stroke();
  ctx.lineWidth = 2 * u;
  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  ctx.lineTo(c.x - c.r * 0.72, c.y);
  ctx.stroke();
  ctx.lineCap = "butt";
  soft(ctx, c.x - c.r * 0.3, c.y - c.r * 0.3, c.r * 0.6, c.r * 0.5, "255,255,255", 0.2, "lighter");

  // the bench: slats on iron feet
  const b = L.bench;
  soft(ctx, b.x, b.y + b.h * 1.6, b.w * 0.6, b.h, "0,0,0", 0.6);
  ctx.fillStyle = "#2a2422";
  for (const fx of [b.x - b.w * 0.38, b.x + b.w * 0.38]) ctx.fillRect(fx - 3 * u, b.y, 6 * u, L.H - b.y - 14 * u);
  for (let i = 0; i < 3; i++) {
    const g = ctx.createLinearGradient(0, b.y - i * b.h * 0.5, 0, b.y - i * b.h * 0.5 + b.h * 0.4);
    g.addColorStop(0, "#8a6a44");
    g.addColorStop(1, "#4a3620");
    ctx.fillStyle = g;
    ctx.fillRect(b.x - b.w / 2, b.y - i * b.h * 0.5 - b.h * 0.4, b.w, b.h * 0.4);
  }
}

// the network map in its steel frame, lit from behind: a cream ground, the
// river, the other lines dimmed, their stations and names; the lit line is
// painted apart (paintLitLine) and laid over
function paintMap(ctx, L) {
  const { u } = L;
  const m = L.map;
  const f = L.frame;
  soft(ctx, m.x + m.w / 2, m.y + m.h / 2 + 10 * u, m.w * 0.7, m.h * 0.7, "0,0,0", 0.7);
  // the frame
  const fg = ctx.createLinearGradient(m.x - f, m.y - f, m.x + m.w + f, m.y + m.h + f);
  fg.addColorStop(0, "#6a6e74");
  fg.addColorStop(0.5, "#3a3d42");
  fg.addColorStop(1, "#5a5e64");
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.roundRect(m.x - f, m.y - f, m.w + f * 2, m.h + f * 2, 4 * u);
  ctx.fill();
  for (const [sx, sy] of [
    [m.x - f / 2, m.y - f / 2],
    [m.x + m.w + f / 2, m.y - f / 2],
    [m.x - f / 2, m.y + m.h + f / 2],
    [m.x + m.w + f / 2, m.y + m.h + f / 2],
  ]) {
    ctx.fillStyle = "#1e2024";
    ctx.beginPath();
    ctx.arc(sx, sy, 2.2 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  // the lit ground of the map, a little brighter in the middle
  const bg = ctx.createRadialGradient(m.x + m.w / 2, m.y + m.h / 2, m.h * 0.1, m.x + m.w / 2, m.y + m.h / 2, m.w * 0.7);
  bg.addColorStop(0, "#f3ecd8");
  bg.addColorStop(1, "#cfc6ae");
  ctx.fillStyle = bg;
  ctx.fillRect(m.x, m.y, m.w, m.h);
  // the river across the lower map
  ctx.strokeStyle = "rgba(120,170,210,0.45)";
  ctx.lineWidth = m.h * 0.06;
  ctx.lineCap = "round";
  ctx.beginPath();
  const r0 = L.at(0, 0.86);
  ctx.moveTo(r0.x - m.w * 0.05, r0.y);
  ctx.bezierCurveTo(L.at(0.3, 0.8).x, L.at(0.3, 0.8).y, L.at(0.55, 1.02).x, L.at(0.55, 1.02).y, L.at(1, 0.84).x + m.w * 0.05, L.at(1, 0.84).y);
  ctx.stroke();
  // the title and the key
  ctx.fillStyle = "#23262b";
  ctx.font = `bold ${Math.round(L.font * 1.5)}px ${MAP_FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("CITY METRO", m.x + m.w * 0.04, m.y + m.h * 0.1);
  ctx.font = `${Math.round(L.font * 0.9)}px ${MAP_FONT}`;
  ctx.fillStyle = "#5a5e66";
  ctx.fillText("Night service · one line running", m.x + m.w * 0.04, m.y + m.h * 0.1 + L.font * 1.3);
  ctx.textAlign = "right";
  ctx.fillText("Lit line in service", m.x + m.w * 0.96, m.y + m.h * 0.1);
  ctx.fillStyle = `rgb(${AMBER})`;
  ctx.fillRect(m.x + m.w * 0.96 - ctx.measureText("Lit line in service").width - L.lineW * 3.2, m.y + m.h * 0.1 - L.font * 0.4, L.lineW * 2.4, L.lineW * 0.9);
  // the other lines, dimmed: their routes, their stations as ticks
  ctx.lineJoin = "round";
  for (const line of L.others) {
    ctx.strokeStyle = line.colour;
    ctx.globalAlpha = 0.32;
    ctx.lineWidth = L.lineW;
    ctx.beginPath();
    line.path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (const s of line.stations) {
      ctx.fillStyle = "#f3ecd8";
      ctx.strokeStyle = line.colour;
      ctx.lineWidth = L.lineW * 0.45;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, L.dot * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
      stationName(ctx, L, s, "rgba(70,74,82,0.6)", `${L.font * 0.9}px ${MAP_FONT}`);
    }
  }
  // the lit line's stations are marked on the ground too, so their names
  // read even where the glow is faint
  for (const s of L.lit.stations) {
    stationName(ctx, L, s, "#1e2126", `bold ${L.litFont}px ${MAP_FONT}`);
  }
  // the glass over it all: a gleam across the upper left
  soft(ctx, m.x + m.w * 0.2, m.y + m.h * 0.15, m.w * 0.3, m.h * 0.3, "255,255,255", 0.1, "lighter");
}

// a station's name beside its dot, above or below the line, on a halo of
// the map's own ground so a line passing behind never breaks it
function stationName(ctx, L, s, colour, font) {
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = s.side > 0 ? "top" : "bottom";
  const y = s.y + s.side * L.dot * 2.2;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(240,232,212,0.85)";
  ctx.lineWidth = L.font * 0.35;
  ctx.strokeText(s.name, s.x, y);
  ctx.fillStyle = colour;
  ctx.fillText(s.name, s.x, y);
}

// the lit line: a warm glow along the route, the route itself, and its
// stations as lit rings
function paintLitLine(ctx, L) {
  const path = L.lit.path;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [w, a] of [
    [L.lineW * 6, 0.1],
    [L.lineW * 3, 0.18],
    [L.lineW * 1.6, 0.35],
  ]) {
    ctx.strokeStyle = `rgba(${AMBER},${a})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.strokeStyle = `rgb(${AMBER})`;
  ctx.lineWidth = L.lineW;
  ctx.beginPath();
  path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,240,210,0.7)";
  ctx.lineWidth = L.lineW * 0.3;
  ctx.beginPath();
  path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  for (const s of L.lit.stations) {
    soft(ctx, s.x, s.y, L.dot * 4, L.dot * 4, AMBER, 0.35, "lighter");
    ctx.fillStyle = "#fff6e4";
    ctx.strokeStyle = "#2a2318";
    ctx.lineWidth = L.lineW * 0.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, L.dot * 1.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
