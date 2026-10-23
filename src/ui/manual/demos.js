// The manual's moving pictures: one for each chapter, a few seconds long,
// played over and over on its left-hand page. Each is drawn in a space
// 860 wide and 880 high (the frame on the page), at `t` seconds into its
// loop; `say` gives the few words written in it, in the player's language.

import {
  INK, DIM, FAINT, GOLD, RED, GREEN,
  span, ease, lerp, track,
  stroke, line, box, fill, roundBox, ring, pointer, click, glints, keycap, write,
  scribbleLine, cue, key, seal, padlock,
} from "./sketch.js";

// ── pieces the pictures share ───────────────────────────────────────────────

// a doorway, its door swung `open` (0 shut, 1 wide) on hinges at its left
function doorway(ctx, x, y, w, h, open, seed) {
  box(ctx, x, y, w, h, { width: 2.6, seed });
  if (open > 0) fill(ctx, x + 6, y + 6, w - 12, h - 6, "#070706", 0.9 * open);
  const a = open * 1.25, reach = (w - 16) * Math.cos(a), lean = open * 16;
  const hx = x + 8, fx = hx + reach;
  stroke(ctx, [[hx, y + 8], [fx, y + 8 - lean], [fx, y + h + lean * 0.6], [hx, y + h]], { width: 2.2, seed: seed + 1, close: true });
  ring(ctx, fx - 14 * Math.cos(a), y + h * 0.56, 5, 5, { width: 2, seed: seed + 2 });
}

// a little flight of stairs going up to the right from (x, y)
function stairs(ctx, x, y, seed) {
  const pts = [[x, y]];
  for (let i = 0; i < 6; i++) { const [px, py] = pts.at(-1); pts.push([px, py - 48], [px + 36, py - 48]); }
  stroke(ctx, pts, { width: 2.4, seed });
  line(ctx, x + 10, y - 90, x + 226, y - 380, { width: 2, seed: seed + 1 });
  for (let i = 1; i < 6; i++) line(ctx, x + 10 + i * 36, y - 48 * i, x + 10 + i * 36, y - 48 * i - 76, { width: 1.5, alpha: 0.6, seed: seed + 2 + i });
}

// the gilt chest: its lid raised `open` (0 to 1)
function chest(ctx, x, y, w, h, open) {
  box(ctx, x, y, w, h, { color: GOLD, width: 2.6, seed: 61 });
  line(ctx, x + w / 2 - 10, y + h * 0.35, x + w / 2 + 10, y + h * 0.35, { color: GOLD, width: 2, seed: 62 });
  const lift = Math.sin(open * 1.4) * 46, back = open * 22;
  stroke(ctx, [[x, y], [x + back * 0.4, y - 34 - lift], [x + w - back * 0.4, y - 34 - lift], [x + w, y]], { color: GOLD, width: 2.6, seed: 63 });
  if (open > 0.2) fill(ctx, x + 8, y - 6, w - 16, 10, "#0a0907", open);
}

// what is in the room's picture behind a drawer: a few faint lines
function room(ctx, x, y, w, h) {
  box(ctx, x, y, w, h, { color: FAINT, width: 2, seed: 70 });
  for (let i = 0; i < 5; i++) scribbleLine(ctx, x + 40, y + 70 + i * 90, w - 80, { alpha: 0.22, seed: 71 + i, width: 2.4 });
}

// ── I. The house: the pointer says what a click will do ─────────────────────
const house = {
  period: 8,
  draw(ctx, t, say) {
    line(ctx, 40, 140, 820, 140, { color: FAINT, width: 2, seed: 1 });
    line(ctx, 30, 650, 830, 650, { width: 2.6, seed: 2 });
    const open = ease(span(t, 2.3, 3.0)) * (1 - ease(span(t, 7.3, 7.8)));
    doorway(ctx, 110, 300, 150, 350, open, 11);
    doorway(ctx, 370, 300, 150, 350, 0, 31);
    stairs(ctx, 600, 650, 41);
    const p = track(t, [[0, 60, 900], [1.4, 186, 472], [3.6, 186, 472], [4.5, 446, 472], [5.7, 446, 472], [6.6, 716, 470], [8, 716, 470]]);
    let name = "arrow", words = "";
    if (p.x > 110 && p.x < 260 && p.y > 300) { name = open > 0.5 ? "enter" : "door"; words = open > 0.5 ? say("goIn") : say("goThrough"); }
    else if (p.x > 370 && p.x < 520 && p.y > 300) { name = "locked"; words = say("locked"); }
    else if (p.x > 620 && p.y < 600) { name = "stairs"; words = say("upstairs"); }
    click(ctx, 186, 472, span(t, 2.1, 2.7));
    pointer(ctx, name, p.x, p.y);
    cue(ctx, words, 26, 850);
  },
};

// ── II. What glints: taken up, carried, set in its place; solved, it stops ──
const glinting = {
  period: 8,
  draw(ctx, t, say) {
    line(ctx, 60, 640, 800, 640, { width: 2.6, seed: 2 });
    // where it belongs
    const solved = ease(span(t, 3.6, 4.0)) * (1 - ease(span(t, 7.2, 7.7)));
    box(ctx, 590, 560, 130, 80, { color: DIM, width: 2, seed: 4, dash: [12, 12], alpha: 1 - solved });
    const lift = ease(span(t, 1.25, 1.5)) * (1 - ease(span(t, 2.95, 3.2)));
    const carry = ease(span(t, 1.5, 2.95));
    const home = t > 7.7;
    const x = home ? 150 : lerp(150, 590, carry);
    const y = 560 - lift * 46 - Math.sin(carry * Math.PI) * 70;
    const tilt = carry > 0 && carry < 1 ? Math.sin(carry * Math.PI) * -0.13 : 0;
    const shown = 1 - ease(span(t, 7.3, 7.7)) + (home ? 1 : 0);
    // its shadow on the table, spreading and paler as it goes up
    ctx.save();
    ctx.globalAlpha = 0.45 * (1 - lift * 0.6) * Math.min(1, shown);
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.ellipse(x + 65, 643, 66 * (1 + lift * 0.3), 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = Math.min(1, shown);
    ctx.translate(x + 65, y + 40); ctx.rotate(tilt); ctx.translate(-(x + 65), -(y + 40));
    box(ctx, x, y, 130, 80, { width: 2.4, seed: 5 });
    for (let i = 1; i < 4; i++) line(ctx, x + i * 32, y + 6, x + i * 32, y + 74, { width: 1.4, alpha: 0.6, seed: 6 + i });
    ctx.restore();
    // it glints where it lies — not while it is held, and no more once solved
    const held = t > 1.25 && t < 3.2;
    if (!held) glints(ctx, x, y, 130, 80, t, { strength: (1 - solved) * Math.min(1, shown), seed: 19 });
    seal(ctx, x + 118, y + 4, 20 * (1 + 0.7 * (1 - solved)), solved);
    // set down: a little jolt
    const thud = span(t, 3.15, 3.5);
    if (thud > 0 && thud < 1) for (const dx of [-24, 154]) line(ctx, 590 + dx, 630, 590 + dx + (dx < 0 ? -18 : 18) * thud, 616, { alpha: 1 - thud, width: 2, seed: 30 });
    const p = held
      ? { x: x + 60, y: y + 40 }
      : track(t, [[0, 800, 860], [1.1, 210, 600], [1.25, 210, 600], [3.2, 650, 600], [4.4, 780, 820], [8, 780, 820]]);
    click(ctx, 210, 600, span(t, 1.1, 1.6));
    pointer(ctx, t < 4 ? "hand" : "arrow", p.x, p.y);
    cue(ctx, t > 0.9 && t < 1.3 ? say("take") : "", 26, 850);
  },
};

// ── III. The answer: a wrong one runs, a right one sets ─────────────────────
const answering = {
  period: 8,
  draw(ctx, t, say) {
    const wrong = say("wrong"), right = say("right");
    roundBox(ctx, 60, 330, 480, 90, 10, { width: 2.4, seed: 90 });
    roundBox(ctx, 556, 330, 168, 90, 10, { width: 2.4, seed: 91 });
    write(ctx, say("submit"), 640, 386, { size: 28, align: "center" });
    const typed = (word, from) => word.slice(0, Math.max(0, Math.min(word.length, Math.floor((t - from) / 0.15) + 1)));
    const runs = span(t, 1.75, 2.7), sets = ease(span(t, 4.5, 4.9)) * (1 - span(t, 7.4, 7.9));
    const step = 32;
    if (t >= 0.4 && t < 2.75) {
      [...typed(wrong, 0.4)].forEach((ch, i) => {
        const drop = runs * (26 + (i % 3) * 14);
        write(ctx, ch, 92 + i * step, 392 + drop, { size: 42, font: "IBM Plex Mono", weight: 500, color: runs > 0 ? RED : INK, alpha: 1 - runs * 0.9 });
        if (runs > 0) line(ctx, 104 + i * step, 400, 104 + i * step, 400 + drop * 1.6, { color: RED, width: 2, alpha: 0.7 * (1 - runs), seed: 94 + i });
      });
    }
    if (t >= 3.0) [...typed(right, 3.0)].forEach((ch, i) => write(ctx, ch, 92 + i * step, 392, { size: 42, font: "IBM Plex Mono", weight: 500, color: sets > 0 ? GREEN : INK, alpha: 1 - span(t, 7.4, 7.9) }));
    // the caret, waiting
    const caretAt = t < 2.75 ? typed(wrong, 0.4).length : t >= 3.0 ? typed(right, 3.0).length : 0;
    if (sets < 0.1 && Math.floor(t * 2.4) % 2 === 0) line(ctx, 94 + caretAt * step, 352, 94 + caretAt * step, 400, { width: 2, seed: 99 });
    seal(ctx, 524, 330, 26 * (1 + 0.7 * (1 - sets)), sets);
    keycap(ctx, 250, 540, say("enter"), { size: 64, wide: 2.6, pressed: (t > 1.5 && t < 1.7) || (t > 4.3 && t < 4.5) ? 1 : 0 });
  },
};

// ── IV. Hints: one at a time ────────────────────────────────────────────────
const hinting = {
  period: 8,
  draw(ctx, t, say) {
    room(ctx, 30, 50, 800, 610);
    roundBox(ctx, 50, 694, 150, 64, 8, { width: 2.2, seed: 100 });
    write(ctx, say("hint"), 125, 736, { size: 26, align: "center" });
    roundBox(ctx, 220, 694, 380, 64, 8, { width: 1.8, alpha: 0.6, seed: 101 });
    const out = ease(span(t, 0.8, 1.3)) * (1 - ease(span(t, 7.0, 7.5)));
    if (out > 0) {
      ctx.save();
      ctx.translate(lerp(-420, 0, out), 0);
      fill(ctx, 30, 50, 380, 610, "#161615", 0.97);
      line(ctx, 410, 50, 410, 660, { width: 2, seed: 102 });
      write(ctx, say("hints").toUpperCase(), 64, 110, { size: 20, color: DIM, spacing: 3 });
      box(ctx, 64, 150, 312, 130, { width: 2, seed: 105 });
      write(ctx, "1", 82, 188, { size: 22, color: GOLD });
      for (let i = 0; i < 3; i++) scribbleLine(ctx, 110, 186 + i * 32, 240, { seed: 106 + i, width: 1.8, alpha: 0.8 });
      const grown = ease(span(t, 3.1, 3.5));
      if (grown > 0) {
        box(ctx, 64, 304, 312, 130 * grown, { width: 2, seed: 110 });
        write(ctx, "2", 82, 342, { size: 22, color: GOLD, alpha: grown });
        for (let i = 0; i < 3; i++) scribbleLine(ctx, 110, 340 + i * 32, 240, { seed: 111 + i, width: 1.8, alpha: 0.8, progress: span(t, 3.5 + i * 0.3, 3.8 + i * 0.3) });
      }
      roundBox(ctx, 64, 580, 312, 56, 8, { width: 2, seed: 115, alpha: grown > 0 ? 0.4 : 1 });
      write(ctx, say(grown > 0 ? "reveal3" : "reveal2"), 220, 616, { size: 22, align: "center", alpha: grown > 0 ? 0.5 : 1 });
      ctx.restore();
    }
    const p = track(t, [[0, 400, 860], [0.5, 125, 726], [0.8, 125, 726], [2.4, 220, 608], [3.0, 220, 608], [4.2, 600, 820], [8, 600, 820]]);
    click(ctx, 125, 726, span(t, 0.55, 1.1));
    click(ctx, 220, 608, span(t, 2.8, 3.3));
    pointer(ctx, "hand", p.x, p.y);
  },
};

// ── V. Keys and doors: a room solved opens its chest; its key, a door ───────
const keys = {
  period: 9,
  draw(ctx, t, say) {
    line(ctx, 40, 650, 820, 650, { width: 2.6, seed: 2 });
    // the room's puzzles, solved one by one
    for (let i = 0; i < 3; i++) {
      const x = 170 + i * 60, done = ease(span(t, 0.6 + i * 0.5, 0.9 + i * 0.5));
      ring(ctx, x, 380, 16, 16, { color: DIM, width: 2, seed: 170 + i });
      seal(ctx, x, 380, 16 * (1 + 0.6 * (1 - done)), done * (1 - span(t, 8.4, 8.9)));
    }
    const open = ease(span(t, 2.4, 2.9)) * (1 - ease(span(t, 8.4, 8.9)));
    chest(ctx, 130, 530, 200, 120, open);
    glints(ctx, 130, 496, 200, 154, t, { strength: t < 2.0 ? 0.28 : 1 - span(t, 2.6, 3.2), seed: 23 });
    // the key: up out of it, taken, gone to the pocket
    const rise = ease(span(t, 2.9, 3.4)), fly = ease(span(t, 4.2, 4.8));
    const kx = lerp(205, 760, fly), ky = lerp(lerp(560, 430, rise) + Math.sin(t * 3) * 5 * (1 - fly), 96, fly);
    if (rise > 0 && fly < 1) key(ctx, kx, ky, 1.2 * (1 - fly * 0.5), 1);
    const kept = span(t, 4.8, 5.0) * (1 - span(t, 8.4, 8.9));
    write(ctx, say("carried"), 820, 70, { size: 20, color: DIM, align: "right" });
    if (kept > 0) key(ctx, 740, 104, 0.8, kept);
    // a locked door, and the key that opens it
    const unlock = ease(span(t, 6.05, 6.4)), gone = span(t, 6.4, 6.7) * (1 - span(t, 8.4, 8.9));
    const opened = ease(span(t, 6.6, 7.3)) * (1 - ease(span(t, 8.4, 8.9)));
    doorway(ctx, 540, 300, 160, 350, opened, 180);
    if (gone < 1) padlock(ctx, 620, 470, 1.3, { alpha: 1 - gone, open: unlock });
    const p = track(t, [[0, 820, 860], [3.6, 820, 860], [4.0, 230, 440], [4.2, 230, 440], [4.8, 520, 780], [5.6, 640, 470], [7.4, 640, 470], [8.3, 820, 860]]);
    let name = "arrow", words = "";
    if (p.x > 540 && p.x < 700 && p.y > 300 && p.y < 650) { name = opened > 0.5 ? "enter" : kept > 0 ? "key" : "locked"; words = opened > 0.5 ? say("goIn") : say("unlock"); }
    else if (Math.hypot(p.x - 230, p.y - 440) < 60 && rise > 0.5 && fly === 0) { name = "hand"; words = say("takeKey"); }
    click(ctx, 230, 440, span(t, 4.05, 4.5));
    click(ctx, 640, 470, span(t, 5.95, 6.4));
    pointer(ctx, name, p.x, p.y);
    cue(ctx, words, 26, 850);
  },
};

/** the chapters' pictures, in order */
export const DEMOS = [house, glinting, answering, hinting, keys];
