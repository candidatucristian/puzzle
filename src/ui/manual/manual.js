// How to play: the inspector's manual. A short book, opened on the dark,
// whose leaves are turned as the herbarium's are (shared/pageFlip.js): by a
// click on a page, by taking its corner and drawing it over, by the arrows
// under it or the keyboard's, or by the ribbons standing out of its edge, one
// for each chapter — which open it at that chapter with one leaf turned, not
// leafing through all those between. Only the game's few rules, a spread to
// each: on the left a picture that moves, over and over, showing the thing
// done (demos.js); on the right its words, short (pages.js). Drawn again
// whenever the language or the window changes.

import { PageFlip } from "../../shared/pageFlip.js";
import { en } from "../../locales/en.js";
import { DEMOS } from "./demos.js";
import { PAGE, FRAME, sheet, picturePage, textPage, spineShade, roman } from "./pages.js";

const ASPECT = PAGE.w / PAGE.h;
const FONTS = [
  '400 40px "DM Serif Display"', '500 40px "Cormorant Garamond"', 'italic 400 40px "Cormorant Garamond"',
  '400 30px "Architects Daughter"', '400 30px "IBM Plex Sans"', '500 30px "IBM Plex Sans"', '500 30px "IBM Plex Mono"',
];

export function mountManual(scope, { dialogs, i18n = null, sounds = null }) {
  const modal = document.getElementById("howto-modal");
  const book = modal?.querySelector(".manual-book");
  if (!book) return { open() {} };
  const canvas = book.querySelector(".manual-canvas"), board = book.querySelector(".manual-board"), marks = book.querySelector(".manual-marks");
  const prev = modal.querySelector(".manual-prev"), next = modal.querySelector(".manual-next");
  const folio = modal.querySelector(".manual-folio"), reader = modal.querySelector(".manual-reader");
  const reduced = () => document.documentElement.dataset.reducedMotion === "true";
  const words = () => {
    const w = i18n?.t("manual");
    return w && typeof w === "object" ? w : en.manual;
  };
  const say = (k) => words().demo?.[k] ?? en.manual.demo[k] ?? "";

  let flip = null, L = null, faces = [], bases = [], spread = 0, jump = null;
  let frame = 0, last = 0, clock = 0, startedAt = 0, built = null, fonts = null;

  // ── the book, laid out for the window and drawn ──
  function build() {
    jump = null;
    const w = words(), chapters = w.chapters.slice(0, DEMOS.length);
    // as large as the window allows: the book with the room over and under
    // it for a lifted leaf, and the line under it
    const availW = window.innerWidth - 170, tallest = (window.innerHeight - 120) / 1.12;
    const pw = Math.floor(Math.max(220, Math.min(availW / 2, tallest * ASPECT, 600)));
    const ph = Math.round(pw / ASPECT);
    const edge = Math.round(pw * 0.045); // the boards, standing out round the pages
    const lift = Math.round(ph * 0.06); // room over and under for a leaf as it is lifted
    const W = pw * 2 + edge * 2, H = ph + lift * 2;
    const ss = Math.min(2, window.devicePixelRatio || 1);
    L = { pw, ph, W, H, spine: W / 2, top: lift };
    Object.assign(book.style, { width: `${W}px`, height: `${H}px` });
    Object.assign(canvas.style, { width: `${W}px`, height: `${H}px` });
    Object.assign(board.style, { left: "0px", top: `${lift - edge}px`, width: `${W}px`, height: `${ph + edge * 2}px` });
    Object.assign(marks.style, { left: `${W - 4}px`, top: `${lift + edge * 2}px` });
    // each chapter's two pages: its picture (drawn on afresh as it moves) and its words
    const scale = (pw * ss) / PAGE.w;
    const page = (draw) => { const c = document.createElement("canvas"); draw(sheet(c, scale)); return c; };
    faces = [];
    bases = chapters.map((chapter, i) => {
      const base = page((ctx) => picturePage(ctx, w, chapter, 1 + i * 2));
      const live = document.createElement("canvas");
      live.width = base.width; live.height = base.height;
      faces.push(live, page((ctx) => textPage(ctx, w, chapter, i + 1, 2 + i * 2)));
      return base;
    });
    spread = Math.min(spread, chapters.length - 1);
    chapters.forEach((_, i) => picture(i, 0));
    const scene = {
      cameras: { main: { width: W, height: H } },
      textures: {
        exists: () => false, remove() {},
        createCanvas: (_key, cw, ch) => { canvas.width = cw; canvas.height = ch; const ctx = canvas.getContext("2d"); return { width: cw, height: ch, getContext: () => ctx, refresh() {} }; },
      },
      add: { image: () => { const self = { setOrigin: () => self, setDisplaySize: () => self, setDepth: () => self, destroy() {} }; return self; } },
    };
    flip = new PageFlip(scene, {
      key: "manual", faces, spine: L.spine, top: L.top, pw, ph, shade: spineShade(), ss, spread,
      instant: reduced, onTurn: landed, onRustle: () => sounds?.page?.(),
    });
    // the ribbons, one for each chapter
    marks.replaceChildren(...chapters.map((c, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "manual-mark";
      b.textContent = roman(i + 1);
      b.dataset.tip = c.title;
      b.setAttribute("aria-label", c.title);
      b.dataset.to = String(i);
      b.addEventListener("click", () => goTo(i));
      return b;
    }));
    built = { lang: i18n?.language ?? "en", w: window.innerWidth, h: window.innerHeight };
    landed(flip.spread);
  }

  // chapter `s`'s picture as it is `t` seconds into its loop, on its page
  function picture(s, t) {
    const demo = DEMOS[s], base = bases[s], face = faces[s * 2];
    if (!demo || !base || !face) return;
    const ctx = face.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(base, 0, 0);
    const scale = face.width / PAGE.w;
    ctx.setTransform(scale, 0, 0, scale, FRAME.x * scale, FRAME.y * scale);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, FRAME.w, FRAME.h); ctx.clip();
    demo.draw(ctx, t % demo.period, say);
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // a spread come to lie open: its picture begun again, the ribbons and the line under the book told
  function landed(at = flip.spread) {
    // come down at a chapter further off: the leaf's pages were that
    // chapter's, lent for the turn; the book is open there now
    if (jump) {
      faces[jump.via * 2] = jump.lent[0];
      faces[jump.via * 2 + 1] = jump.lent[1];
      flip.spread = at = jump.target;
      jump = null;
      flip.draw();
    }
    spread = at;
    startedAt = clock;
    const chapter = words().chapters[spread];
    for (const b of marks.children) b.classList.toggle("is-here", Number(b.dataset.to) === spread);
    prev.disabled = spread <= 0;
    next.disabled = spread >= flip.spreads - 1;
    folio.textContent = chapter ? `${roman(spread + 1)} · ${chapter.title}` : "";
    reader.textContent = chapter ? [chapter.title, ...chapter.text.map((p) => p.replace(/^\[([^\]]+)\]\s*/, "$1: "))].join("\n") : "";
  }

  // ── turning ──
  function goTo(target) {
    if (!flip || flip.busy) return; // (a leaf already turning comes down first)
    target = Math.max(0, Math.min(flip.spreads - 1, target));
    if (target === flip.spread) return;
    if (reduced()) {
      flip.state = null;
      flip.spread = target;
      flip.draw();
      landed(target);
      return;
    }
    // one leaf turned: for a chapter further off, the spread it comes down on
    // is lent that chapter's pages for the turn
    const dir = Math.sign(target - flip.spread), via = flip.spread + dir;
    if (via !== target) {
      jump = { via, target, lent: [faces[via * 2], faces[via * 2 + 1]] };
      faces[via * 2] = faces[target * 2];
      faces[via * 2 + 1] = faces[target * 2 + 1];
    }
    flip.turn(dir);
  }
  scope.on(prev, "click", () => goTo(flip.settled() - 1));
  scope.on(next, "click", () => goTo(flip.settled() + 1));
  scope.on(document, "keydown", (e) => {
    if (modal.classList.contains("hidden") || !flip || e.defaultPrevented) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); goTo(flip.settled() + 1); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); goTo(flip.settled() - 1); }
    else if (e.key === "Home") { e.preventDefault(); goTo(0); }
    else if (e.key === "End") { e.preventDefault(); goTo(flip.spreads - 1); }
  });

  // ── the hand on the book ──
  const at = (e) => { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * L.W, y: ((e.clientY - r.top) / r.height) * L.H }; };
  scope.on(canvas, "pointerdown", (e) => {
    if (!flip) return;
    const p = at(e);
    if (flip.down(p.x, p.y)) canvas.setPointerCapture(e.pointerId);
  });
  scope.on(canvas, "pointermove", (e) => {
    if (!flip) return;
    const p = at(e);
    flip.move(p.x, p.y);
    canvas.style.cursor = flip.sideAt(p.x, p.y) ? "var(--cursor-hand, pointer)" : "";
  });
  scope.on(canvas, "pointerup", (e) => { if (flip) { const p = at(e); flip.up(p.x, p.y); } });
  scope.on(canvas, "pointerleave", () => { if (flip && !flip.busy) flip.move(-1e4, -1e4); });

  // ── each frame, while it is open ──
  function tick(now) {
    if (modal.classList.contains("hidden")) { frame = 0; last = 0; return; }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now; clock += dt;
    const s = flip.state;
    picture(flip.spread, reduced() ? 1.6 : clock - startedAt);
    // the picture over the leaf, as it comes
    const coming = jump ? jump.target : s?.dir ? flip.spread + s.dir : -1;
    if (coming >= 0 && coming < flip.spreads) picture(coming, 0);
    flip.update(dt);
    flip.draw();
    frame = requestAnimationFrame(tick);
  }

  function fresh() {
    return !built || built.lang !== (i18n?.language ?? "en") || built.w !== window.innerWidth || built.h !== window.innerHeight;
  }
  let resizing = 0;
  scope.on(window, "resize", () => {
    clearTimeout(resizing);
    resizing = setTimeout(() => { if (!modal.classList.contains("hidden") && fonts && !jump) build(); }, 160);
  });
  if (i18n) scope.add(i18n.subscribe(() => { if (!modal.classList.contains("hidden") && fonts) build(); else built = null; }));
  scope.add(() => { cancelAnimationFrame(frame); clearTimeout(resizing); });

  return {
    /** opened from the settings, over them */
    open(trigger) {
      dialogs.open("howto-modal", trigger, { nested: true });
      fonts ??= Promise.race([
        Promise.all(FONTS.map((f) => document.fonts?.load(f).catch(() => null))),
        new Promise((r) => setTimeout(r, 1500)),
      ]);
      fonts.then(() => {
        if (modal.classList.contains("hidden")) return;
        if (fresh()) build();
        startedAt = clock;
        if (!frame) frame = requestAnimationFrame(tick);
      });
    },
  };
}
