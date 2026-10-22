// On an empty drawing sheet of the notebook, as it is opened: a pencil comes
// down onto the sheet, runs a quick scribble across it, is lifted away, and
// the scribble fades off the paper: here is where to draw.

const NS = "http://www.w3.org/2000/svg";
const SHEET = { w: 640, h: 300 }; // the drawing's own size (notebook.js PAGE)
const GRAPHITE = "rgba(38,34,28,0.9)"; // the notebook's own pencil line
const SPEED = 1000; // how fast the point runs, in the sheet's units a second
const FAINT = 0.3; // how strongly it is seen at most: a ghost of a scribble
const SIZE = 0.6; // the pencil, smaller than life

const el = (name, attrs = {}, parent = null) => {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent?.append(node);
  return node;
};

// a scribble: one quick line of loops run across the sheet without a
// thought, each loop a little larger or smaller, a little higher or lower
// than the last, the hand drifting as it goes
function scribble(random) {
  const points = [];
  let x = 282, drift = 0;
  const loops = 5 + Math.floor(random() * 2);
  for (let l = 0; l < loops; l++) {
    const r = 8 + random() * 6; // how tall the loop
    const a = 1.6 + random() * 0.8; // how far on it goes, a radian
    const b = r * (0.55 + random() * 0.35); // how far back it comes round
    drift += (random() - 0.5) * 5;
    const cy = 150 + drift;
    for (let i = l ? 1 : 0; i <= 22; i++) {
      const t = (i / 22) * Math.PI * 2;
      points.push([x + a * t - b * Math.sin(t) + (random() - 0.5) * 0.6, cy + r * Math.cos(t) * (0.9 + 0.1 * Math.sin(t * 3)) + (random() - 0.5) * 0.6]);
    }
    x += a * Math.PI * 2;
  }
  return [points];
}

// a wooden pencil, drawn along +x from its point at the origin
function drawPencil(svg) {
  const defs = el("defs", {}, svg);
  const wood = el("linearGradient", { id: "nb-pencil-wood", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  for (const [o, c] of [[0, "#f4cf5a"], [0.45, "#e2b234"], [0.55, "#c99a22"], [1, "#a77c16"]]) el("stop", { offset: o, "stop-color": c }, wood);
  const cone = el("linearGradient", { id: "nb-pencil-cone", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  for (const [o, c] of [[0, "#f0d9b0"], [1, "#c9a777"]]) el("stop", { offset: o, "stop-color": c }, cone);
  const ferrule = el("linearGradient", { id: "nb-pencil-ferrule", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  for (const [o, c] of [[0, "#e9e9e4"], [0.5, "#a9a9a2"], [1, "#6e6e68"]]) el("stop", { offset: o, "stop-color": c }, ferrule);
  const pencil = el("g", { class: "notebook-pencil-body" }, svg);
  // its shadow on the paper, below and to the side
  el("path", { d: "M3 2 L26 -5 L128 -5 Q134 2 128 9 L26 9 Z", fill: "#1a140a", opacity: 0.14, transform: "translate(4 5)" }, pencil);
  el("path", { d: "M0 0 L24 -6.5 L24 6.5 Z", fill: "url(#nb-pencil-cone)" }, pencil);
  el("path", { d: "M0 0 L7 -1.9 L7 1.9 Z", fill: "#2b2925" }, pencil);
  el("path", { d: "M24 -6.5 L104 -6.5 L104 6.5 L24 6.5 Z", fill: "url(#nb-pencil-wood)" }, pencil);
  el("path", { d: "M24 -2.2 L104 -2.2 M24 2.2 L104 2.2", stroke: "#8a6510", "stroke-opacity": 0.45, "stroke-width": 0.7 }, pencil);
  // where the paint stops and the cone was sharpened: a scalloped edge
  el("path", { d: "M24 -6.5 Q27 -4.3 24 -2.2 Q27 0 24 2.2 Q27 4.3 24 6.5", fill: "url(#nb-pencil-wood)", stroke: "#a77c16", "stroke-width": 0.5 }, pencil);
  el("rect", { x: 104, y: -6.9, width: 13, height: 13.8, fill: "url(#nb-pencil-ferrule)" }, pencil);
  el("path", { d: "M108 -6.9 L108 6.9 M113 -6.9 L113 6.9", stroke: "#5c5c56", "stroke-width": 0.8 }, pencil);
  el("path", { d: "M117 -6.6 L124 -6.6 Q129 -6.6 129 0 Q129 6.6 124 6.6 L117 6.6 Z", fill: "#d9837a" }, pencil);
  return pencil;
}

/** A pencil that sketches on `sheet` (the drawing's own wrap) once, and is gone. */
export function mountNotebookPencil(sheet) {
  const svg = el("svg", { class: "notebook-pencil", "aria-hidden": "true", viewBox: `0 0 ${SHEET.w} ${SHEET.h}`, preserveAspectRatio: "none" });
  sheet.append(svg);
  const lines = el("g", { fill: "none", stroke: GRAPHITE, "stroke-width": 2.2, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
  const pencil = drawPencil(svg);
  let frame = 0;

  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    svg.style.opacity = "0";
    lines.replaceChildren();
  };

  return {
    /** the pencil scribbles across the sheet, and it fades */
    play() {
      stop();
      if (!sheet.clientWidth) return;
      const strokes = scribble(Math.random).map((points) => {
        const path = el("path", { d: `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L")}` }, lines);
        const length = path.getTotalLength();
        path.style.strokeDasharray = `${length}`;
        path.style.strokeDashoffset = `${length}`;
        return { path, length, start: points[0], end: points.at(-1) };
      });
      // come down onto the sheet, draw each line (lifted a moment between
      // them), be lifted away; then the lines fade
      const steps = [{ kind: "down", ms: 120 }];
      strokes.forEach((s, i) => {
        if (i) steps.push({ kind: "across", from: strokes[i - 1].end, to: s.start, ms: 80 });
        s.step = { kind: "draw", stroke: s, ms: (s.length / SPEED) * 1000 };
        steps.push(s.step);
      });
      steps.push({ kind: "up", ms: 140 }, { kind: "fade", ms: 260 });
      let at = 0;
      for (const step of steps) { step.from0 = at; at += step.ms; }
      const total = at;
      const first = strokes[0].start, last = strokes.at(-1).end;
      const place = (x, y, lift = 0, tilt = 0) =>
        pencil.setAttribute("transform", `translate(${(x + lift * 10).toFixed(2)} ${(y - lift * 16).toFixed(2)}) rotate(${(-52 + tilt).toFixed(2)}) scale(${SIZE})`);
      svg.style.opacity = String(FAINT);
      pencil.style.opacity = "0";
      const begun = performance.now();
      const tick = (now) => {
        const t = now - begun;
        const step = steps.find((s) => t < s.from0 + s.ms) ?? steps.at(-1);
        const k = Math.min(1, Math.max(0, (t - step.from0) / step.ms));
        const ease = k * k * (3 - 2 * k);
        if (step.kind === "down") {
          pencil.style.opacity = String(ease);
          place(first[0], first[1], 1 - ease, -5 * (1 - ease));
        } else if (step.kind === "across") {
          place(step.from[0] + (step.to[0] - step.from[0]) * ease, step.from[1] + (step.to[1] - step.from[1]) * ease, Math.sin(k * Math.PI) * 0.4);
        } else if (step.kind === "draw") {
          const s = step.stroke, run = s.length * k;
          s.path.style.strokeDashoffset = `${s.length - run}`;
          const p = s.path.getPointAtLength(run);
          // the hand's small sway as it draws
          place(p.x, p.y, 0, Math.sin(t / 60) * 1.8);
        } else if (step.kind === "up") {
          pencil.style.opacity = String(1 - ease);
          place(last[0], last[1], ease * 1.3, -6 * ease);
        } else {
          svg.style.opacity = String(FAINT * (1 - ease));
        }
        // (a line already drawn stays drawn, whatever frames were missed)
        for (const s of strokes) if (t >= s.step.from0 + s.step.ms) s.path.style.strokeDashoffset = "0";
        if (t >= total) { stop(); return; }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    },
    /** put away at once (the player has begun) */
    stop() { if (frame) stop(); },
  };
}
