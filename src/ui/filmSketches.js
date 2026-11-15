import { group, ink, inks, glow } from "./introSketches.js";

// The opening film's drawings (sketchFilm.js), one for each of Arthur Wren's
// lines (story.js OPENING.asides), in the game's thin white pencil
// (introSketches.js) in its 1600 × 900 frame. Each `draw(svg)` puts its
// lines down in time and returns { node, extra, stop }: what to rub out, and
// what to halt (rain) when it goes.

const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs, parent) => {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent?.append(node);
  return node;
};
const rect = (x, y, w, h) => `M${x} ${y} h${w} v${h} h${-w} Z`;
const circle = (cx, cy, r) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`;
// a soft round pool of warm light, centred, fading to nothing at its edge
function warmth(svg) {
  if (svg.querySelector("#co-warm")) return;
  const g = el("radialGradient", { id: "co-warm", cx: "50%", cy: "45%", r: "50%" }, svg.querySelector("defs"));
  for (const [o, c, a] of [[0, "#ffd59a", 0.42], [0.45, "#ffb860", 0.14], [1, "#ffb860", 0]])
    el("stop", { offset: o, "stop-color": c, "stop-opacity": a }, g);
}
// a little hand-made randomness that is the same every time
const seeded = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

// rain falling inside a box, in thin slanting strokes, until stopped
function rain(parent, { x, y, w, h }, count, at) {
  const id = `co-rain-clip-${Math.round(x)}-${Math.round(y)}`;
  el("rect", { x, y, width: w, height: h }, el("clipPath", { id }, parent));
  const g = el("g", { class: "co-rain", "clip-path": `url(#${id})`, opacity: 0 }, parent);
  g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1600, delay: at, fill: "forwards" });
  const rnd = seeded(7);
  const drops = [];
  for (let i = 0; i < count; i++) {
    const sx = x + rnd() * (w + 40), len = 14 + rnd() * 16;
    const line = el("line", { x1: sx, y1: y - 30, x2: sx - len * 0.22, y2: y - 30 + len }, g);
    drops.push(line.animate([{ transform: "translate(0, 0)" }, { transform: `translate(${-h * 0.22}px, ${h + 60}px)` }],
      { duration: 800 + rnd() * 500, delay: at + rnd() * 1300, iterations: Infinity, easing: "linear" }));
  }
  return { node: g, stop: () => drops.forEach((a) => a.cancel()) };
}

// 1 · Exeter, a night in October: his window, the rain on it, a lamp in the street
function drawWindow(svg) {
  warmth(svg);
  const extra = el("g", {}, svg);
  const g = group(svg, "co-window");
  // the curtains on their rod
  ink(g, "M520 118 L1080 118", 0, 900);
  inks(g, ["M598 122 C588 250 610 390 588 600", "M566 122 C556 270 576 410 552 600", "M1002 122 C1012 250 990 390 1012 600", "M1034 122 C1044 270 1024 410 1048 600"], 300, 1300, 160);
  // the window: its frame, its bars, its sill
  ink(g, rect(640, 150, 320, 390), 700, 1500);
  inks(g, ["M800 152 L800 538", "M642 282 L958 282", "M642 412 L958 412"], 1700, 800, 220);
  ink(g, "M612 548 L988 548 L1000 564 L600 564 Z", 2200, 900);
  // the town through the glass: roofs, chimneys, and a lamp in the street
  inks(g, ["M650 480 L690 480 L690 452 L728 436 L766 452 L766 480 L798 480", "M802 466 L852 466 L852 430 L884 430 L884 462 L950 462",
    "M705 442 L705 420 L716 420 L716 437", "M864 430 L864 414 L873 414 L873 430"], 2500, 800, 200);
  inks(g, ["M912 530 L912 334", "M900 334 L924 334 L920 304 L904 304 Z", "M898 304 L912 293 L926 304"], 3100, 700, 180);
  glow(extra, { cx: 912, cy: 318, r: 70, fill: "url(#co-warm)" }, 3700, { to: 1, dur: 1800 });
  const wet = rain(extra, { x: 642, y: 152, w: 316, h: 386 }, 70, 1800);
  return { node: g, extra, stop: wet.stop, pencil: 4.2, view: "330 90 940 520" };
}

// 2 · Inspector Arthur Wren: his desk, the lamp lit, and his father's photograph
// standing on it — a constable in his helmet, a black ribbon across the frame
function drawStudy(svg) {
  warmth(svg);
  const extra = el("g", {}, svg);
  const g = group(svg, "co-study");
  ink(g, "M420 488 C640 484 980 492 1180 486", 0, 1200);
  ink(g, "M612 486 C612 474 668 472 690 474 C712 476 716 486 712 488", 600, 700);
  ink(g, "M664 474 L700 362 L792 330", 1000, 900);
  ink(g, "M778 318 C806 296 862 300 884 340 L794 356 Z", 1500, 900);
  ink(g, "M760 470 L948 470 L960 452 L772 452 Z", 2000, 900);
  // the photograph in its frame, and the man in it
  ink(g, rect(1004, 352, 112, 134), 2300, 1100);
  ink(g, rect(1016, 364, 88, 110), 2900, 800);
  inks(g, [
    "M1034 474 Q1040 440 1060 436 Q1080 440 1086 474", "M1052 437 L1060 449 L1068 437",
    "M1049 411 Q1048 431 1060 433 Q1072 431 1071 411", "M1046 410 Q1045 384 1060 375 Q1075 384 1074 410 M1060 375 L1060 370",
    "M1041 411 Q1060 416 1079 411",
  ], 3300, 600, 170);
  ink(g, "M1004 386 L1038 352 M1004 398 L1050 352", 4500, 700, { weight: 1.6 });
  glow(extra, { cx: 790, cy: 430, rx: 330, ry: 150, fill: "url(#co-warm)" }, 2600, { dur: 2200 });
  return { node: g, extra, pencil: 4.6, view: "380 230 840 300" };
}

// in the order of Arthur's lines (story.js OPENING.asides); a chord and a
// piano note to open each
export const FILM_SCENES = [
  { draw: drawWindow, chord: "Am", note: 440 },
  { draw: drawStudy, chord: "F", note: 523.25 },
];
