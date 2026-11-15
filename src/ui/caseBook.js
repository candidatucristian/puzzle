// The case file as a book (since 2026-11-06): Inspector Wren's case book,
// rendered in Blender as it lies open (art/blender/case_book.py), alone over
// the game, its leaves turned as the herbarium's and the manual's are
// (shared/pageFlip.js) — by a click on a page, by taking its corner and
// drawing it over, or by the keyboard's arrows. (Its index tabs were taken
// out on 2026-11-14, at the user's request.)
//
// Each page is cut out of the picture of the book — the top sheet's own
// paper, its tooth and its foxing, the gutter's shade where it curves down —
// to the sheet's own outline as the lens saw it (caseBookArt.json), and what
// is in the file is written on it (caseBookPages.js), taken into the paper as
// ink is (multiply). The picture lies under it all: the boards, the block of
// pages, the headbands, the ribbon, the book's shadow. caseFile.js says what
// is in it: a list of spreads, each drawn on its two pages.

import { PageFlip } from "../shared/pageFlip.js";
import { PAGE } from "./caseBookPages.js";
import ART from "./caseBookArt.json";

const PHOTO = `${import.meta.env.BASE_URL}assets/images/CaseFile/case-book-v${ART.version}.webp`;
const FONTS = [
  '400 40px "DM Serif Display"', '500 40px "Cormorant Garamond"', 'italic 500 40px "Cormorant Garamond"',
  '400 30px "Architects Daughter"', '400 30px "Special Elite"', '500 30px "IBM Plex Sans"', '500 30px "IBM Plex Mono"',
];
// the book in the picture, and its pages: the leaf reaches from the spine to
// the outer edge of the top sheet, from its head to its tail
const BOOK = { x: ART.book.left, y: ART.book.top, w: ART.book.right - ART.book.left, h: ART.book.bottom - ART.book.top };
const LEAF = { spine: ART.spine, top: ART.top, w: ART.leaf, h: ART.bottom - ART.top };
// (what is written keeps a little further from the gutter than from the
// outer edge, where the sheet curves down into the spine; in page units)
const GUTTER = 26;

let photoLoad = null;
function loadPhoto() {
  photoLoad ??= new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => { photoLoad = null; resolve(null); };
    image.src = PHOTO;
  });
  return photoLoad;
}

/** `spreads`: [{ mark, tip, text, draw(left, right) }] */
export function mountCaseBook(scope, { modal, sounds = null, onLand = () => {} }) {
  const book = modal.querySelector(".casebook-book");
  const photo = book.querySelector(".casebook-photo"), canvas = book.querySelector(".casebook-canvas");
  const reader = modal.querySelector(".casebook-reader");
  const reduced = () => document.documentElement.dataset.reducedMotion === "true";
  const shown = () => !modal.classList.contains("hidden");
  photo.src = PHOTO;

  let flip = null, L = null, faces = [], spreads = [], jump = null, frame = 0, last = 0, ready = null, image = null;
  let resizePending = false, later = [];
  // the picture of the book and the faces it is written in, fetched as soon
  // as the game is up, so that the first opening is as quick as any other
  const prepare = () => (ready ??= Promise.all([
    loadPhoto().then((img) => { image = img; }),
    Promise.race([Promise.all(FONTS.map((f) => document.fonts?.load(f).catch(() => null))), new Promise((r) => setTimeout(r, 1500))]),
  ]));
  if ("requestIdleCallback" in window) requestIdleCallback(() => prepare(), { timeout: 4000 }); else setTimeout(prepare, 1200);

  // a spread's two pages: each the top sheet's own paper out of the picture,
  // the spread's words written on them in ink (in one go: a letter runs on
  // from the left page to the right), each then cut to its sheet's outline
  function pages(spread, k, ss) {
    const made = [-1, 1].map((side) => {
      const c = document.createElement("canvas");
      c.width = Math.round(LEAF.w * k * ss); c.height = Math.round(LEAF.h * k * ss);
      const g = c.getContext("2d");
      g.imageSmoothingQuality = "high";
      const x0 = side < 0 ? LEAF.spine - LEAF.w : LEAF.spine;
      if (image) g.drawImage(image, x0, LEAF.top, LEAF.w, LEAF.h, 0, 0, c.width, c.height);
      else { g.fillStyle = "#d8ccae"; g.fillRect(0, 0, c.width, c.height); }
      // the words, in the page's own units (1000 x 1280), taken into the paper
      g.save();
      g.setTransform(c.width / PAGE.w, 0, 0, c.height / PAGE.h, 0, 0);
      g.translate(side < 0 ? -GUTTER / 2 : GUTTER / 2, 0);
      g.globalCompositeOperation = "multiply";
      return { side, c, g, x0 };
    });
    spread.draw(made[0].g, made[1].g);
    return made.map(({ side, c, g, x0 }) => {
      g.restore();
      // and nothing outside the sheet: a leaf turned is that sheet
      const outline = side < 0 ? ART.sheets.left : ART.sheets.right;
      g.save();
      g.globalCompositeOperation = "destination-in";
      g.setTransform(c.width / LEAF.w, 0, 0, c.height / LEAF.h, 0, 0);
      g.beginPath();
      outline.forEach(([x, y], i) => (i ? g.lineTo(x - x0, y - LEAF.top) : g.moveTo(x - x0, y - LEAF.top)));
      g.closePath();
      g.fillStyle = "#000"; g.fill();
      g.restore();
      return c;
    });
  }

  function build(at = 0) {
    resizePending = false;
    jump = null;
    // as large as the window allows, the book itself in the middle of it:
    // room either side, and under it for the ribbon out of its
    // tail (as much over it, so that it is the book that is centred)
    const tail = ART.height - BOOK.y - BOOK.h;
    const k = Math.min((window.innerWidth - 2 * 96) / BOOK.w, (window.innerHeight - 40) / (BOOK.h + 2 * tail), 0.9);
    const ss = Math.min(2, window.devicePixelRatio || 1);
    // the picture laid where the book is; the leaves turned on a canvas over
    // the book and a little round it (room for a leaf as it lifts)
    const F = { x: BOOK.x - BOOK.w * 0.03, y: BOOK.y - BOOK.h * 0.06, w: BOOK.w * 1.06, h: BOOK.h * 1.12 };
    const W = F.w * k, H = F.h * k;
    L = { W, H, k };
    Object.assign(book.style, { width: `${BOOK.w * k}px`, height: `${BOOK.h * k}px` });
    Object.assign(photo.style, { left: `${-BOOK.x * k}px`, top: `${-BOOK.y * k}px`, width: `${ART.width * k}px`, height: `${ART.height * k}px` });
    Object.assign(canvas.style, { left: `${(F.x - BOOK.x) * k}px`, top: `${(F.y - BOOK.y) * k}px`, width: `${W}px`, height: `${H}px` });
    // (the pages are written only as they are needed — the one open, and
    //  those either side of it — and let go again when far off)
    faces = new Array(spreads.length * 2).fill(null);
    L.ss = Math.min(ss, 1100 / (LEAF.w * k));
    later = [];
    near(Math.max(0, Math.min(spreads.length - 1, at)));
    const scene = {
      cameras: { main: { width: W, height: H } },
      textures: {
        exists: () => false, remove() {},
        createCanvas: (_key, cw, ch) => { canvas.width = cw; canvas.height = ch; const ctx = canvas.getContext("2d"); return { width: cw, height: ch, getContext: () => ctx, refresh() {} }; },
      },
      add: { image: () => { const self = { setOrigin: () => self, setDisplaySize: () => self, setDepth: () => self, destroy() {} }; return self; } },
    };
    flip = new PageFlip(scene, {
      key: "casebook", faces, spine: (LEAF.spine - F.x) * k, top: (LEAF.top - F.y) * k, pw: LEAF.w * k, ph: LEAF.h * k, ss: L.ss,
      spread: Math.max(0, Math.min(spreads.length - 1, at)),
      instant: reduced, onTurn: landed, onRustle: () => sounds?.page?.(),
    });
    landed(flip.spread);
    book.classList.add("is-built");
  }

  // spread `s` written, if it is not yet
  function written(s) {
    if (s < 0 || s >= spreads.length || faces[s * 2]) return;
    const [left, right] = pages(spreads[s], L.k, L.ss);
    faces[s * 2] = left; faces[s * 2 + 1] = right;
  }
  // the spread open written now, those either side over the next frames (so
  // that opening the book, or landing a leaf, never waits on them); the far
  // ones let go
  function near(at) {
    written(at);
    later = [at - 1, at + 1].filter((s) => s >= 0 && s < spreads.length && !faces[s * 2]);
    for (let s = 0; s < spreads.length; s++) {
      if (Math.abs(s - at) > 2 && !(jump && (s === jump.target || s === jump.via))) { faces[s * 2] = null; faces[s * 2 + 1] = null; }
    }
  }

  // a spread come to lie open: the ribbons, the line under the book, and caseFile.js told
  function landed(at = flip.spread) {
    if (jump) {
      faces[jump.via * 2] = jump.lent[0];
      faces[jump.via * 2 + 1] = jump.lent[1];
      flip.spread = at = jump.target;
      jump = null;
      flip.draw();
    }
    const spread = spreads[at];
    near(at);
    reader.textContent = spread?.text ?? "";
    if (spread) onLand(spread);
  }

  // ── turning ──
  function goTo(target) {
    if (!flip || flip.busy) return;
    target = Math.max(0, Math.min(flip.spreads - 1, target));
    if (target === flip.spread) return;
    if (reduced()) {
      flip.state = null; flip.spread = target; flip.draw(); landed(target);
      return;
    }
    // one leaf turned: for a spread further off, the one it comes down on is
    // lent that spread's pages for the turn
    const dir = Math.sign(target - flip.spread), via = flip.spread + dir;
    written(target); written(via);
    if (via !== target) {
      jump = { via, target, lent: [faces[via * 2], faces[via * 2 + 1]] };
      faces[via * 2] = faces[target * 2];
      faces[via * 2 + 1] = faces[target * 2 + 1];
    }
    flip.turn(dir);
  }
  scope.on(document, "keydown", (e) => {
    if (!shown() || !flip || e.defaultPrevented) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); goTo(flip.settled() + 1); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); goTo(flip.settled() - 1); }
    else if (e.key === "Home") { e.preventDefault(); goTo(0); }
    else if (e.key === "End") { e.preventDefault(); goTo(flip.spreads - 1); }
  });

  // ── the hand on the book ──
  const at = (e) => { const r = canvas.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * L.W, y: ((e.clientY - r.top) / r.height) * L.H }; };
  scope.on(canvas, "pointerdown", (e) => { if (!flip) return; const p = at(e); if (flip.down(p.x, p.y)) canvas.setPointerCapture(e.pointerId); });
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
    if (!shown()) { frame = 0; last = 0; return; }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    flip.update(dt);
    if (resizePending && !flip.busy && !jump) build(flip.spread);
    flip.draw();
    // one of the neighbouring spreads written a frame, once the open one is up
    if (later.length && !flip.busy) written(later.shift());
    frame = requestAnimationFrame(tick);
  }

  let resizing = 0;
  scope.on(window, "resize", () => {
    clearTimeout(resizing);
    resizing = setTimeout(() => {
      if (!shown() || !flip) return;
      if (flip.busy || jump) resizePending = true;
      else build(flip.spread);
    }, 160);
  });
  scope.add(() => { cancelAnimationFrame(frame); clearTimeout(resizing); });

  return {
    /** lays the book open with these spreads at `at`, once the picture of it
     *  and the faces it is written in have come */
    show(list, at = 0) {
      spreads = list;
      // (until it is built, nothing of it is seen: the picture would stand
      //  at its own size until the book had been laid out)
      book.classList.remove("is-built");
      return prepare().then(() => {
        if (!shown()) return;
        build(at);
        if (!frame) frame = requestAnimationFrame(tick);
      });
    },
    /** drawn again as it is, where it is open (the language changed) */
    redraw(list) {
      if (!flip) return;
      spreads = list;
      build(Math.min(flip.settled(), list.length - 1));
    },
    goTo,
    get spread() { return flip ? flip.settled() : 0; },
  };
}
