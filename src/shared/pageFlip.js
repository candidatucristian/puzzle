// A book's pages turned as a real leaf is turned (the way turn.js turns
// them, done here on a canvas inside the scene): the corner of the page
// follows the hand; the leaf folds along the line half-way between where its
// corner was and where it has been taken, perpendicular to that; the folded
// part shows the back of the leaf, the page behind it shows through where it
// has lifted, and soft shadows lie along the fold and under the leaf.
//
//   hover near an outer corner   the corner lifts a little toward the hand
//   press and drag               the leaf follows; let go past the spine and
//                                it turns, short of it and it falls back
//   click                        it turns over by itself
//
// `faces` are the pages' canvases in order, left and right in turn: the
// spread s shows faces 2s and 2s + 1. A face may be cut to the shape of its
// sheet (clear outside it): the leaf turned is then that shape, its shadow too. Everything is drawn into one canvas
// texture the size of the screen (at `ss` times its pixels, for sharpness).
// `instant`: no motion — a leaf turned is simply over (reduced motion).

const TURN_MS = 820, BACK_MS = 360, PEEL = 0.13;

export class PageFlip {
  constructor(scene, { key, faces, spine, top, pw, ph, shade = null, depth = 1, ss = 1, spread = 0, instant = false, onTurn = null, onRustle = null }) {
    Object.assign(this, { scene, key, faces, spine, top, pw, ph, shade, ss, instant, onTurn, onRustle });
    const { width: W, height: H } = scene.cameras.main;
    this.W = W; this.H = H;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    this.texture = scene.textures.createCanvas(key, Math.round(W * ss), Math.round(H * ss));
    this.ctx = this.texture.getContext();
    this.ctx.imageSmoothingQuality = "high";
    // the folded part is drawn apart, then laid on with the shadow of its own shape
    this.flapCanvas = document.createElement("canvas");
    this.flapCanvas.width = this.texture.width; this.flapCanvas.height = this.texture.height;
    this.flapCtx = this.flapCanvas.getContext("2d");
    this.flapCtx.imageSmoothingQuality = "high";
    this.image = scene.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(W, H).setDepth(depth);
    this.spreads = Math.ceil(faces.length / 2);
    this.spread = Math.max(0, Math.min(this.spreads - 1, spread));
    this.state = null; // { dir, top, P, goal, mode: "hover" | "drag" | "turn" | "back", t, from, start }
    this.draw();
  }

  // ── what the hand does ─────────────────────────────────────────────────────

  /** where the pointer is over the book, if anywhere: which leaf it would turn */
  sideAt(x, y) {
    const { spine, top, pw, ph } = this;
    if (y < top || y > top + ph) return 0;
    if (x >= spine && x <= spine + pw && this.spread < this.spreads - 1) return 1;
    if (x <= spine && x >= spine - pw && this.spread > 0) return -1;
    return 0;
  }

  // the pointer moved: a corner it is near lifts toward it; a held leaf follows it
  move(x, y) {
    const s = this.state;
    if (s?.mode === "drag") {
      if (!s.moved && Math.hypot(x - s.start.x, y - s.start.y) > 6) s.moved = true;
      if (s.moved) s.goal = this._toFrame(s.dir, x, y);
      return;
    }
    if (s && (s.mode === "turn" || s.mode === "back")) return;
    const dir = this.sideAt(x, y);
    const f = dir && this._toFrame(dir, x, y);
    const corner = f && this._nearCorner(f);
    if (corner) {
      const C = this._corner(corner.top);
      // the corner drawn a little way toward the hand — enough to be seen
      // even with the hand right on it, never far
      const dx = f.x - C.x, dy = f.y - C.y, d = Math.hypot(dx, dy);
      const ux = d > 1 ? dx / d : -Math.SQRT1_2, uy = d > 1 ? dy / d : (corner.top ? 1 : -1) * Math.SQRT1_2;
      const reach = Math.min(this.pw * PEEL, Math.max(this.pw * 0.1, d));
      const goal = { x: C.x + ux * reach, y: C.y + uy * reach };
      if (!s || s.dir !== dir || s.top !== corner.top) this.state = { dir, top: corner.top, P: { ...C }, goal, mode: "hover" };
      else { s.goal = goal; s.leaving = false; }
    } else if (s?.mode === "hover") {
      s.goal = this._corner(s.top);
      s.leaving = true;
    }
  }

  // pressed on a leaf: taken by its nearer corner, top or bottom
  down(x, y) {
    if (this.state && (this.state.mode === "turn" || this.state.mode === "back")) return false;
    const dir = this.sideAt(x, y);
    if (!dir) return false;
    const f = this._toFrame(dir, x, y);
    const top = f.y < this.top + this.ph / 2;
    const P = this.state?.dir === dir && this.state.top === top ? this.state.P : this._corner(top);
    // held, but it only follows once the hand moves: a plain click turns it from where it lies
    this.state = { dir, top, P: { ...P }, goal: { ...P }, mode: "drag", start: { x, y }, moved: false };
    return true;
  }

  // let go: a click turns it over; a drag past the spine turns it, short of it lets it fall back
  up(x, y) {
    const s = this.state;
    if (s?.mode !== "drag") return;
    if (!s.moved || s.P.x < this.spine) this._turnOver(s);
    else { s.mode = "back"; s.from = { ...s.P }; s.t = 0; }
  }

  /** turned from outside (a key, say): the next leaf or the one before */
  turn(dir) {
    if (this.state && this.state.mode !== "hover") return;
    if ((dir > 0 && this.spread >= this.spreads - 1) || (dir < 0 && this.spread <= 0)) return;
    this.state = { dir, top: false, P: this._corner(false), mode: "drag", start: { x: 0, y: 0 } };
    this._turnOver(this.state);
  }

  _turnOver(s) {
    s.mode = "turn"; s.from = { ...s.P }; s.t = 0;
    this.onRustle?.();
    const isInstant = typeof this.instant === 'function' ? this.instant() : (this.scene?.reducedMotion ?? this.instant);
    if (isInstant) this._land(s);
  }

  _land(s) {
    this.state = null;
    this.spread += s.dir;
    this.draw();
    this.onTurn?.(this.spread);
  }

  /** the spread the book will lie open at once the leaf in hand has come down */
  settled() {
    return this.state?.mode === "turn" ? this.spread + this.state.dir : this.spread;
  }

  // ── each frame ─────────────────────────────────────────────────────────────

  update(dt) {
    const s = this.state;
    if (!s) return;
    if (s.mode === "hover" || s.mode === "drag") {
      // the leaf eases after the hand rather than jumping to it
      const C = this._corner(s.top);
      if (s.leaving && Math.hypot(s.P.x - C.x, s.P.y - C.y) < 0.6) { this.state = null; this.draw(); return; }
      // (and once it has come to rest under the hand, nothing is redrawn)
      if (Math.hypot(s.goal.x - s.P.x, s.goal.y - s.P.y) < 0.05) return;
      const k = 1 - Math.exp(-dt * (s.mode === "drag" ? 22 : 12));
      s.P = this._limit(s.top, { x: s.P.x + (s.goal.x - s.P.x) * k, y: s.P.y + (s.goal.y - s.P.y) * k });
    } else {
      const ms = s.mode === "turn" ? TURN_MS : BACK_MS;
      s.t = Math.min(1, s.t + (dt * 1000) / ms);
      const e = s.t < 0.5 ? 2 * s.t * s.t : 1 - (-2 * s.t + 2) ** 2 / 2;
      const C = this._corner(s.top);
      const goal = s.mode === "turn" ? { x: this.spine * 2 - C.x, y: C.y } : C;
      // the corner travels in a low arc, lifted off the page as a hand lifts it —
      // never so far that the leaf, folded, swings out past the head or foot of the book
      const base = { x: s.from.x + (goal.x - s.from.x) * e, y: s.from.y + (goal.y - s.from.y) * e };
      const lift = s.mode === "turn" ? Math.sin(Math.PI * e) * this.ph * 0.12 * (s.top ? 1 : -1) : 0;
      const at = (k) => this._limit(s.top, { x: base.x, y: base.y + lift * k });
      let k = 1;
      if (lift && this._overhang(s.top, at(1)) > 0) {
        let lo = 0, hi = 1;
        for (let i = 0; i < 10; i++) { const mid = (lo + hi) / 2; if (this._overhang(s.top, at(mid)) > 0) hi = mid; else lo = mid; }
        k = lo;
      }
      s.P = at(k);
      if (s.t >= 1) {
        if (s.mode === "turn") { this._land(s); return; }
        this.state = null;
      }
    }
    this.draw();
  }

  get busy() { return Boolean(this.state && this.state.mode !== "hover"); }

  destroy() {
    this.image.destroy();
    if (this.scene.textures.exists(this.key)) this.scene.textures.remove(this.key);
    this.flapCanvas.width = this.flapCanvas.height = 0;
  }

  // ── geometry ───────────────────────────────────────────────────────────────
  // Worked in a frame where the leaf being turned is always the right-hand
  // one: turning back, everything is seen in the mirror of the spine.

  _toFrame(dir, x, y) { return { x: dir > 0 ? x : this.spine * 2 - x, y }; }
  _corner(top) { return { x: this.spine + this.pw, y: top ? this.top : this.top + this.ph }; }
  _nearCorner(f) {
    const r = this.pw * 0.24;
    for (const top of [false, true]) {
      const C = this._corner(top);
      if (Math.abs(f.x - C.x) < r && Math.abs(f.y - C.y) < r * 1.2) return { top };
    }
    return null;
  }
  // a leaf is held at the spine: its corner can go no further from the
  // spine's near end than the page is wide, nor from its far end than the
  // page's diagonal
  _limit(top, P) {
    const { spine, pw, ph } = this;
    const near = { x: spine, y: top ? this.top : this.top + ph }, far = { x: spine, y: top ? this.top + ph : this.top };
    let p = { ...P };
    const clamp = (o, r) => { const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy); if (d > r) p = { x: o.x + (dx * r) / d, y: o.y + (dy * r) / d }; };
    clamp(near, pw);
    clamp(far, Math.hypot(pw, ph));
    return p;
  }

  // how far past the head or foot of the book the folded part would reach
  // with the corner at P (less than nothing while it is within them)
  _overhang(top, P) {
    const C = this._corner(top), dx = P.x - C.x, dy = P.y - C.y, len = Math.hypot(dx, dy);
    if (len < 0.5) return -1;
    const n = { x: dx / len, y: dy / len }, M = { x: (P.x + C.x) / 2, y: (P.y + C.y) / 2 };
    const side = (X) => (X.x - M.x) * n.x + (X.y - M.y) * n.y;
    const { spine, pw, ph } = this, y0 = this.top, y1 = this.top + ph, slack = ph * 0.025; // as far as the cloth of the boards
    const rect = [{ x: spine, y: y0 }, { x: spine + pw, y: y0 }, { x: spine + pw, y: y1 }, { x: spine, y: y1 }];
    let out = -Infinity;
    for (const X of clipHalf(rect, side, false)) {
      const y = X.y - side(X) * 2 * n.y;
      out = Math.max(out, y0 - slack - y, y - y1 - slack);
    }
    return out;
  }

  // ── drawing ────────────────────────────────────────────────────────────────

  draw() {
    const { ctx, W, H, ss, spine, top, pw, ph } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W * ss, H * ss);
    ctx.setTransform(ss, 0, 0, ss, 0, 0);
    const s = this.state, sp = this.spread;
    const face = (i) => this.faces[i] ?? null;
    const left = { x: spine - pw, y: top, w: pw, h: ph }, right = { x: spine, y: top, w: pw, h: ph };
    if (!s) {
      this._page(face(sp * 2), left, false);
      this._page(face(sp * 2 + 1), right, false);
      this._shade();
      this.texture.refresh();
      return;
    }
    const dir = s.dir, mirrored = dir < 0;
    // the four faces this turn involves, as the frame has them
    const still = dir > 0 ? sp * 2 : sp * 2 + 1; // the page that stays, on the frame's left
    const front = dir > 0 ? sp * 2 + 1 : sp * 2; // the leaf's face that is lifting
    const back = dir > 0 ? sp * 2 + 2 : sp * 2 - 1; // its other side
    const under = dir > 0 ? sp * 2 + 3 : sp * 2 - 2; // what it uncovers
    ctx.save();
    if (mirrored) ctx.transform(-1, 0, 0, 1, spine * 2, 0);
    const C = this._corner(s.top), P = s.P;
    const dx = P.x - C.x, dy = P.y - C.y, len = Math.hypot(dx, dy);
    if (len < 0.5) {
      this._page(face(still), left, mirrored);
      this._page(face(front), right, mirrored);
      ctx.restore();
      this._shade();
      this.texture.refresh();
      return;
    }
    const n = { x: dx / len, y: dy / len }, M = { x: (P.x + C.x) / 2, y: (P.y + C.y) / 2 };
    const side = (X) => (X.x - M.x) * n.x + (X.y - M.y) * n.y;
    const rect = [{ x: right.x, y: right.y }, { x: right.x + pw, y: right.y }, { x: right.x + pw, y: right.y + ph }, { x: right.x, y: right.y + ph }];
    const kept = clipHalf(rect, side, true); // the leaf where it still lies
    const lifted = clipHalf(rect, side, false); // where it has lifted from
    const reflect = (X) => { const d = side(X) * 2; return { x: X.x - d * n.x, y: X.y - d * n.y }; };
    const flap = lifted.map(reflect);

    // the page that stays, and the leaf where it still lies
    this._page(face(still), left, mirrored);
    this._clipped(kept, () => this._page(face(front), right, mirrored));
    // the page beneath, where the leaf has lifted, and the leaf's shadow on it
    this._clipped(lifted, () => {
      this._page(face(under), right, mirrored);
      const w = Math.min(len * 0.5, pw * 0.22);
      const g = ctx.createLinearGradient(M.x, M.y, M.x - n.x * w, M.y - n.y * w);
      g.addColorStop(0, "rgba(0,0,0,0.42)"); g.addColorStop(0.35, "rgba(0,0,0,0.14)"); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(spine - pw * 2, top - ph, pw * 4, ph * 3);
    });
    ctx.restore();
    // the spine's shading over the open pages, before the leaf comes over them
    this._shade();
    if (flap.length > 2) {
      // the folded part: the back of the leaf, folded over along the fold
      const f = this.flapCtx;
      f.setTransform(1, 0, 0, 1, 0, 0);
      f.clearRect(0, 0, this.flapCanvas.width, this.flapCanvas.height);
      f.setTransform(ss, 0, 0, ss, 0, 0);
      if (mirrored) f.transform(-1, 0, 0, 1, spine * 2, 0);
      f.save();
      const a = 1 - 2 * n.x * n.x, b = -2 * n.x * n.y, d = 1 - 2 * n.y * n.y, mn = M.x * n.x + M.y * n.y;
      f.transform(a, b, b, d, 2 * mn * n.x, 2 * mn * n.y);
      poly(f, lifted); f.clip();
      f.transform(-1, 0, 0, 1, spine * 2, 0);
      this._page(face(back), left, mirrored, f);
      f.restore();
      // the light on it: dark in the crease, a soft sheen on the curve beyond, on the paper only
      const w = Math.min(len * 0.5, pw * 0.5);
      const g = f.createLinearGradient(M.x, M.y, M.x + n.x * w, M.y + n.y * w);
      g.addColorStop(0, "rgba(0,0,0,0.3)"); g.addColorStop(0.12, "rgba(0,0,0,0.08)");
      g.addColorStop(0.4, "rgba(255,250,235,0.1)"); g.addColorStop(0.75, "rgba(0,0,0,0.04)"); g.addColorStop(1, "rgba(0,0,0,0.12)");
      f.globalCompositeOperation = "source-atop";
      f.fillStyle = g; f.fillRect(spine - pw * 2, top - ph, pw * 4, ph * 3);
      f.globalCompositeOperation = "source-over";
      // laid on what is under it, with the shadow it casts there
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 24 * ss;
      ctx.shadowOffsetY = 5 * ss;
      ctx.drawImage(this.flapCanvas, 0, 0);
      ctx.restore();
    }
    this.texture.refresh();
  }

  // a page face drawn into its place; in the mirrored frame drawn mirrored
  // again, so that it reads the right way round where it lands
  _page(img, r, mirrored, ctx = this.ctx) {
    if (!img) { ctx.fillStyle = "#d9cdb0"; ctx.fillRect(r.x, r.y, r.w, r.h); return; }
    if (!mirrored) { ctx.drawImage(img, r.x, r.y, r.w, r.h); return; }
    ctx.save(); ctx.translate(r.x + r.w, r.y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, r.w, r.h); ctx.restore();
  }

  _clipped(points, draw) {
    if (points.length < 3) return;
    const { ctx } = this;
    ctx.save(); poly(ctx, points); ctx.clip(); draw(); ctx.restore();
  }

  _shade() {
    if (!this.shade) return;
    this.ctx.drawImage(this.shade, this.spine - this.pw, this.top, this.pw * 2, this.ph);
  }
}

function poly(ctx, pts) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

// a polygon cut by a straight line: the part where side(X) >= 0 (keep) or < 0
function clipHalf(points, side, keep) {
  const inside = (p) => (keep ? side(p) >= 0 : side(p) < 0);
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const ia = inside(a), ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) {
      const sa = side(a), sb = side(b), t = sa / (sa - sb);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

// ── a book in a scene ───────────────────────────────────────────────────────

/** The hand on an open book: pressing on one of its pages (`zones`) takes
 *  hold of that leaf; the pointer, wherever it goes, is followed — in the
 *  camera's world, which may be zoomed — and letting go anywhere lets go.
 *  Returns what undoes it. */
export function holdBook(scene, flip, zones) {
  const at = (pointer) => scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
  const down = (pointer) => { const p = at(pointer); flip.down(p.x, p.y); };
  const move = (pointer) => { const p = at(pointer); flip.move(p.x, p.y); };
  const up = (pointer) => { const p = at(pointer); flip.up(p.x, p.y); };
  for (const zone of zones) zone.on("pointerdown", down);
  scene.input.on("pointermove", move);
  scene.input.on("pointerup", up);
  scene.input.on("pointerupoutside", up);
  return () => {
    for (const zone of zones) zone.off("pointerdown", down);
    scene.input.off("pointermove", move);
    scene.input.off("pointerup", up);
    scene.input.off("pointerupoutside", up);
  };
}

/** A book just opened lies a moment as it was, then is brought gently
 *  `zoom` times nearer: its scene is laid out at the nearer size and the
 *  camera starts that much further off. Not `animate`d, it is simply near.
 *  Returns the timer that starts it, if it is to come. */
export function bringNear(scene, zoom, animate, { after = 280, duration = 1700 } = {}) {
  const cam = scene.cameras.main;
  cam.zoomEffect.reset();
  if (!animate || zoom <= 1.001) { cam.setZoom(1); return null; }
  cam.setZoom(1 / zoom);
  return scene.time.delayedCall(after, () => cam.zoomTo(1, duration, "Sine.easeInOut", true));
}
