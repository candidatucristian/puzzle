// The cold open's drawings: the story sketched live, in the game's thin white
// pencil, on dark paper. Every line is drawn in three passes, as the game's
// hand-drawn marks are (a dark shadow, the white line, a faint highlight
// just off it), and a little displacement makes it waver as a hand does.
// A line draws itself from its start; erased, it goes the same way.
//
// Drawn in a 1600 × 900 frame, shown cropped close on the right of the
// screen; the words stand on the left.

const NS = "http://www.w3.org/2000/svg";
const EASE = "cubic-bezier(.45, .05, .35, 1)";

export function sketchLayer(host) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "co-sketch");
  // framed close on the drawings, which stand on the right of the screen
  svg.setAttribute("viewBox", "330 110 1000 540");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `
    <defs>
      <filter id="co-hand" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="co-worn" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" result="t" />
        <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.75" result="m" />
        <feComposite in="SourceGraphic" in2="m" operator="in" />
      </filter>
      <filter id="co-bloom" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="9" />
      </filter>
      <radialGradient id="co-lamp-light" cx="50%" cy="0%" r="100%">
        <stop offset="0" stop-color="#ffd59a" stop-opacity=".5" />
        <stop offset=".55" stop-color="#ffb860" stop-opacity=".12" />
        <stop offset="1" stop-color="#ffb860" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="co-moon-light">
        <stop offset="0" stop-color="#cfd8ec" stop-opacity=".3" />
        <stop offset="1" stop-color="#cfd8ec" stop-opacity="0" />
      </radialGradient>
    </defs>`;
  host.append(svg);
  return svg;
}

const el = (tag, attrs, parent) => {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent?.append(node);
  return node;
};

// a group of drawing, the hand's waver on it
export function group(svg, cls = "") {
  return el("g", { class: `co-drawing ${cls}`.trim(), filter: "url(#co-hand)" }, svg);
}

// one line, drawn from `at` (ms from now) over `dur`
export function ink(parent, d, at = 0, dur = 900, { weight = 1 } = {}) {
  const g = el("g", { class: "co-ink" }, parent);
  for (const [cls, w] of [["ink-dark", 2.6 * weight], ["ink-white", 1.25 * weight], ["ink-over", 0.5 * weight]]) {
    const p = el("path", { d, class: cls, pathLength: "1", "stroke-width": w }, g);
    p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: dur, delay: at, easing: EASE, fill: "both" });
  }
  return g;
}

// several lines one after another, `gap` apart
export function inks(parent, lines, at, dur, gap) {
  return lines.map((d, i) => ink(parent, d, at + i * gap, dur));
}

// a soft light, coming up (and, given `out`, going again)
export function glow(parent, attrs, at, { to = 1, dur = 1400 } = {}) {
  const node = el(attrs.r ? "circle" : attrs.rx ? "ellipse" : "rect", { ...attrs, class: "co-glow", opacity: 0 }, parent);
  node.animate([{ opacity: 0 }, { opacity: to }], { duration: dur, delay: at, easing: "ease-out", fill: "forwards" });
  return node;
}
export function fadeOut(node, dur = 260) {
  const from = getComputedStyle(node).opacity;
  node.animate([{ opacity: from }, { opacity: 0 }], { duration: dur, easing: "steps(3, end)", fill: "forwards" });
}

// words set in the drawing, in the label's small capitals
export function label(parent, x, y, text, at) {
  const t = el("text", { x, y, class: "co-sketch-label", "text-anchor": "middle", opacity: 0 }, parent);
  t.textContent = text;
  t.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 1200, delay: at, easing: "ease-out", fill: "forwards" });
  return t;
}

// rubbed out, the way it was drawn
export function erase(node, dur = 900) {
  for (const p of node.querySelectorAll("path")) {
    p.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -1 }], { duration: dur, easing: EASE, fill: "forwards" });
  }
  node.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur * 1.1, easing: "ease-in", fill: "forwards" });
  setTimeout(() => node.remove(), dur * 1.2);
}

const rect = (x, y, w, h) => `M${x} ${y} h${w} v${h} h${-w} Z`;
const arch = (x, y, w, h) => `M${x} ${y + h} V${y + w / 2} Q${x + w / 2} ${y - w * 0.15} ${x + w} ${y + w / 2} V${y + h}`;
const circle = (cx, cy, r) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`;

// ── the house: its lines in the order a hand would draw them, each with
// when it starts and how long it takes (ms) — drawn in time in the cold
// open, and as the game loads on the loading screen ──
const HOUSE_WINDOWS = [
  ...[386, 456].flatMap((y) => [664, 720, 854, 910].map((x) => [x, y, 26, 42])),
  ...[436, 492].flatMap((y) => [520, 574, 984, 1044].map((x) => [x, y, 22, 36])),
];
const HOUSE_LINES = [
  // the moon; the ground, the middle block and its pediment, the round window in it
  [circle(1270, 170, 34), 200, 1300],
  ["M360 562 C560 556 1000 566 1240 558", 400, 1300],
  ["M640 560 L640 360 L960 360 L960 560", 700, 1300],
  ["M618 362 L800 288 L982 362 Z", 1300, 1000],
  [circle(800, 334, 14), 1900, 600],
  // the wings, their roofs; the tower and its spire; the chimneys
  ...[
    "M640 412 L500 412 L500 560", "M488 414 L566 370 L640 370",
    "M960 412 L1100 412 L1100 560", "M960 370 L1034 370 L1112 414",
    "M1100 560 L1100 332 L1162 332 L1162 560", "M1090 334 L1131 266 L1172 334",
    "M688 358 L688 314 L712 314 L712 346", "M888 352 L888 318 L910 318 L910 360",
  ].map((d, i) => [d, 1600 + i * 180, 700]),
  // the windows, the door, its steps
  ...HOUSE_WINDOWS.map(([x, y, w, h], i) => [rect(x, y, w, h), 2700 + i * 70, 380]),
  [arch(1119, 352, 24, 34), 3500, 500],
  ["M776 560 L776 508 Q800 478 824 508 L824 560", 3600, 700],
  ["M756 568 L844 568 M748 578 L852 578", 3900, 600],
];
// three lights, one on each floor of the house where someone still sat up
const HOUSE_LIGHTS = [[854, 386, 26, 42], [574, 436, 22, 36], [1119, 360, 24, 26]];

export function drawHouse(svg) {
  const extra = el("g", {}, svg);
  const g = group(svg, "co-house");
  const lights = el("g", { class: "co-lights", filter: "url(#co-bloom)" }, extra);
  glow(extra, { cx: 1270, cy: 170, r: 120, fill: "url(#co-moon-light)" }, 300, { dur: 2400 });
  for (const [d, at, dur] of HOUSE_LINES) ink(g, d, at, dur);
  const lit = HOUSE_LIGHTS.map(([x, y, w, h]) =>
    glow(lights, { x, y, width: w, height: h, fill: "#ffc77e" }, 4300, { to: 0.85, dur: 1600 }));
  return { node: g, extra, lit };
}

/** The house again, drawn not in time but as far as `set(f)` says (0 to
 *  1): each line in its turn, a little overlapping the next. `light()`
 *  brings up the moon and the three windows, once it is all drawn. */
export function houseByProgress(svg) {
  const extra = el("g", {}, svg);
  const g = group(svg, "co-house");
  const lights = el("g", { class: "co-lights", filter: "url(#co-bloom)" }, extra);
  const lines = HOUSE_LINES.map(([d]) => {
    const one = el("g", { class: "co-ink" }, g);
    return [["ink-dark", 2.6], ["ink-white", 1.25], ["ink-over", 0.5]].map(([cls, w]) =>
      el("path", { d, class: cls, pathLength: "1", "stroke-width": w }, one));
  });
  const n = lines.length;
  return {
    set(f) {
      const drawn = Math.max(0, Math.min(1, f)) * (n + 1.5);
      lines.forEach((paths, i) => {
        const k = Math.max(0, Math.min(1, (drawn - i) / 2.5));
        for (const p of paths) p.style.strokeDashoffset = String(1 - k);
      });
    },
    light() {
      glow(extra, { cx: 1270, cy: 170, r: 120, fill: "url(#co-moon-light)" }, 0, { dur: 1200 });
      HOUSE_LIGHTS.forEach(([x, y, w, h], i) =>
        glow(lights, { x, y, width: w, height: h, fill: "#ffc77e" }, 120 + i * 160, { to: 0.85, dur: 900 }));
    },
  };
}

// ── the three of them: a ring each, and in it the work they were known for ──
// each of the three, as a ring with the work they were known for in it:
// where it stands in the frame, and its lines in the order they are drawn
const EMBLEMS = {
  // Ivy: a glasshouse at Kew, a leaf grown in it
  ivy: { cx: 480, lines: [
    "M432 380 L432 318 Q480 246 528 318 L528 380 Z", "M456 380 L456 290 M504 380 L504 290 M432 336 L528 336",
    "M480 366 C468 352 470 330 487 320 C494 338 492 354 480 366 Z M480 366 L480 380",
  ] },
  // Silas: a flask at Cambridge, and what bubbles in it
  silas: { cx: 800, lines: [
    "M788 250 L788 298 C752 314 748 372 800 384 C852 372 848 314 812 298 L812 250 M781 250 L819 250",
    "M768 346 C786 340 814 352 832 346",
    `${circle(796, 330, 5)} ${circle(808, 314, 3.5)} ${circle(801, 300, 2.5)}`,
  ] },
  // Orion: a telescope at Herstmonceux, and a star in its sight
  orion: { cx: 1120, lines: [
    "M1076 348 L1158 296 L1167 310 L1085 362 Z M1083 356 L1068 366",
    "M1121 330 L1096 404 M1121 330 L1146 404 M1121 330 L1121 404",
    "M1182 250 L1182 274 M1170 262 L1194 262",
  ] },
};

export function drawThree(svg) {
  const extra = el("g", {}, svg);
  const g = group(svg, "co-three");
  ["ivy", "silas", "orion"].forEach((who, i) => {
    const { cx, lines } = EMBLEMS[who];
    ink(g, circle(cx, 318, 96), i * 450, 1300);
    inks(g, lines, 900 + i * 450, 900, 350);
  });
  const names = [["IVY · KEW", 480], ["SILAS · CAMBRIDGE", 800], ["ORION · HERSTMONCEUX", 1120]];
  names.forEach(([text, x], i) => label(extra, x, 452, text, 2600 + i * 300));
  return { node: g, extra };
}

/** One of the three alone — for the chapter card of their floor: the svg is
 *  framed on their ring, which draws itself from `at`, and then what is in it. */
// `pace` under 1 draws it quicker (a chapter card that is up only a moment)
export function drawEmblem(svg, who, at = 0, pace = 1) {
  const { cx, lines } = EMBLEMS[who];
  svg.setAttribute("viewBox", `${cx - 112} 206 224 224`);
  const g = group(svg, "co-emblem");
  ink(g, circle(cx, 318, 96), at, 1300 * pace);
  inks(g, lines, at + 800 * pace, 900 * pace, 380 * pace);
  return g;
}

// ── the lock on the door, and a key that comes and turns in it ──
export function drawLock(svg) {
  const g = group(svg, "co-lock");
  ink(g, "M742 226 Q742 214 754 214 L846 214 Q858 214 858 226 L858 424 Q858 436 846 436 L754 436 Q742 436 742 424 Z", 0, 1400);
  ink(g, `${circle(800, 240, 6)} ${circle(800, 410, 6)}`, 900, 600);
  ink(g, `${circle(800, 304, 17)} M791 318 L784 368 L816 368 L809 318`, 1100, 900);
  // the key is drawn off to the right of the lock, to be slid in and turned
  const key = el("g", { class: "co-key" }, g);
  Object.assign(key.style, { transformBox: "fill-box", transformOrigin: "center", transform: "translateX(150px)" });
  ink(key, `${circle(1010, 320, 26)} ${circle(1010, 320, 9)} M984 320 L812 320 M836 320 L836 336 L848 336 L848 328 L858 328 L858 336`, 1500, 1300);
  return { node: g, extra: null, key };
}

// ── the file, closed on it ──
export function drawFile(svg) {
  const extra = el("g", {}, svg);
  const g = group(svg, "co-file");
  ink(g, "M628 214 L652 214 L664 192 L770 192 L782 214 L972 214 L972 452 L628 452 Z", 0, 1500);
  ink(g, "M640 226 L960 226", 800, 700);
  inks(g, [
    "M664 268 C720 266 790 270 870 267", "M664 296 C740 293 820 298 912 295", "M664 324 C700 322 760 326 820 323",
    "M664 352 C730 350 830 354 900 351", "M664 380 C690 379 730 381 760 380",
  ], 1200, 500, 160);
  label(extra, 717, 208, "61/1013", 900).classList.add("is-tab");
  return { node: g, extra };
}

// ── his desk, years on: the lamp lit over the same file ──
export function drawDesk(svg) {
  const extra = el("g", {}, svg);
  const g = group(svg, "co-desk");
  ink(g, "M420 488 C640 484 980 492 1180 486", 0, 1200);
  ink(g, "M760 470 L948 470 L960 452 L772 452 Z", 700, 900);
  ink(g, "M612 486 C612 474 668 472 690 474 C712 476 716 486 712 488", 1000, 700);
  ink(g, "M664 474 L700 362 L792 330", 1400, 900);
  ink(g, "M778 318 C806 296 862 300 884 340 L794 356 Z", 2000, 900);
  const light = glow(extra, { x: 580, y: 348, width: 520, height: 210, fill: "url(#co-lamp-light)" }, 3000, { dur: 2200 });
  return { node: g, extra, light };
}
