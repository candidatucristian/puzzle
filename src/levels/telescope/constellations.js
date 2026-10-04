/** The hover on the Braille cells in the close-up. Hovering a cell draws its
 *  constellation: the lines grow out from its lowest-numbered star, one
 *  star to the next, and each star flares with a small ring as the line
 *  reaches it — over a faint halo, with ghost rings on the cell's empty dot
 *  places so its 2×3 grid can be read. Leaving the cell draws it all back,
 *  in reverse.
 *
 *    const hover = new ConstellationHover(scene, { cells, dx, dy, S });
 *    // every frame — pointer coords, or NaN while the pointer is away:
 *    const over = hover.update(dt, px, py, t); // true while over a cell
 *    hover.focus     // 0‥1: dim the other stars by HOVER_TUNE.FOCUS_DIM × this
 *    hover.lit(i, j) // 0‥1: how lit star j of cell i is (its line arrived)
 *    hover.destroy()
 *
 *  cells: [{ dots: [1, 3, 5], cx, cy, box: { x0, x1, y0, y1 } }], where dx
 *  and dy are the column and row spacing of the grid the stars sit on. It
 *  all draws between the sky and the window frame (depths 1.6–1.9). */
export const HOVER_TUNE = {
  IN: 1.15, // seconds for a constellation to draw itself in full
  OUT: 0.6, // seconds to draw it back
  LINE_ALPHA: 0.72, // the line's bright core at full strength
  HALO_ALPHA: 0.16, // the soft glow behind a lit cell
  GHOST_DOTS: true, // faint rings on a lit cell's empty dot places
  GHOST_ALPHA: 0.3,
  FOCUS_DIM: 0.35, // how far the other stars step back (see `focus`)
  PULSE: true, // a glint running out along the lines once they're drawn
  CHIME: true, // a soft note when a cell is found
};

const DOT_POS = {
  1: [-1, -1],
  2: [-1, 0],
  3: [-1, 1],
  4: [1, -1],
  5: [1, 0],
  6: [1, 1],
};
const GLOW = "tele_glow";
const HAZE = "tele_haze";
const PING = 0.8; // seconds for a ring to spread and fade

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (v) => v * v * (3 - 2 * v);

/** The lines of a cell: a minimum spanning tree over its dots, grown from
 *  the lowest-numbered one. An edge running straight across an EMPTY dot
 *  place costs triple, so no line ever seems to pass through a star that
 *  isn't there (O is drawn 1–5–3, never 1–3 down the empty 2). */
function spanningTree(pts) {
  const n = pts.length;
  const edges = [];
  const depth = pts.map((_, i) => (i === 0 ? 0 : -1));
  const cost = (a, b) => {
    const A = pts[a];
    const B = pts[b];
    let c = Math.hypot(B.x - A.x, B.y - A.y);
    if (
      A.col === B.col &&
      Math.abs(A.row - B.row) === 2 &&
      !pts.some((p) => p.col === A.col && p.row === 0)
    )
      c *= 3;
    return c;
  };
  let maxDepth = 0;
  for (let added = 1; added < n; added++) {
    let best = null;
    for (let a = 0; a < n; a++) {
      if (depth[a] < 0) continue;
      for (let b = 0; b < n; b++) {
        if (depth[b] >= 0) continue;
        const c = cost(a, b);
        if (!best || c < best.c - 1e-6) best = { a, b, c };
      }
    }
    depth[best.b] = depth[best.a] + 1;
    maxDepth = Math.max(maxDepth, depth[best.b]);
    edges.push({ a: best.a, b: best.b, depth: depth[best.b] });
  }
  return { edges, maxDepth };
}

export class ConstellationHover {
  constructor(scene, { cells, dx, dy, S, depth = 1.6, tune = {} }) {
    this.scene = scene;
    this.T = { ...HOVER_TUNE, ...tune };
    this.S = S;
    this.lw = Math.max(1, S / 800);
    this.gap = Math.max(5, S * 0.009); // lines stop short of the stars
    this.focus = 0;
    this._lastChime = -Infinity;
    makeTextures(scene.textures);
    this.gfx = scene.add.graphics().setDepth(depth + 0.3);

    this.cells = cells.map((c, index) => {
      const nums = [...c.dots].sort((a, b) => a - b);
      const at = (num) => {
        const [col, row] = DOT_POS[num];
        return { num, col, row, x: c.cx + (col * dx) / 2, y: c.cy + row * dy };
      };
      const pts = nums.map(at);
      const { edges, maxDepth } = spanningTree(pts);
      return {
        index,
        box: c.box,
        pts,
        edges,
        maxDepth,
        parentEdge: pts.map((_, j) => edges.find((e) => e.b === j) || null),
        ghosts: [1, 2, 3, 4, 5, 6].filter((num) => !nums.includes(num)).map(at),
        halo: scene.add
          .image(c.cx, c.cy, HAZE)
          .setDepth(depth)
          .setBlendMode("ADD")
          .setAlpha(0)
          .setDisplaySize(dx * 3.4, dy * 4.6),
        glows: pts.map((p) =>
          scene.add
            .image(p.x, p.y, GLOW)
            .setDepth(depth + 0.2)
            .setBlendMode("ADD")
            .setAlpha(0),
        ),
        reveal: 0,
        hover: false,
        pings: [],
        fullAt: null,
      };
    });
  }

  update(dt, px, py, t) {
    let over = false;
    let focus = 0;
    this.gfx.clear();
    for (const c of this.cells) {
      const b = c.box;
      const hover = px >= b.x0 && px <= b.x1 && py >= b.y0 && py <= b.y1;
      if (hover && !c.hover && c.reveal < 0.25) this._chime(c.index);
      c.hover = hover;
      if (hover) over = true;
      const prev = c.reveal;
      c.reveal = clamp01(prev + (hover ? dt / this.T.IN : -dt / this.T.OUT));
      if (c.reveal > prev) this._ping(c, prev, t);
      c.fullAt = c.reveal >= 1 ? (c.fullAt ?? t) : null;
      focus = Math.max(focus, smooth(c.reveal));
      this._draw(c, t);
    }
    this.focus = focus;
    return over;
  }

  lit(i, j) {
    const c = this.cells[i];
    return c ? this._starLit(c, j, c.reveal) : 0;
  }

  destroy() {
    this.gfx.destroy();
    for (const c of this.cells) {
      c.halo.destroy();
      for (const g of c.glows) g.destroy();
    }
    this.cells = [];
  }

  _starLit(c, j, r) {
    const e = c.parentEdge[j];
    return e ? this._edgeP(c, e, r) : smooth(clamp01((r - 0.02) / 0.08));
  }

  // each depth of the tree draws in its own slice of the reveal, so the
  // constellation grows outward, level by level
  _edgeP(c, e, r) {
    const D = c.maxDepth || 1;
    const a = 0.1 + (0.8 * (e.depth - 1)) / D;
    const b = 0.1 + (0.8 * e.depth) / D;
    return smooth(clamp01((r - a) / (b - a)));
  }

  _ping(c, prev, t) {
    c.pts.forEach((_, j) => {
      if (this._starLit(c, j, prev) < 1 && this._starLit(c, j, c.reveal) >= 1) {
        c.pings.push({ j, t0: t });
      }
    });
  }

  _segment(A, B, p) {
    const len = Math.hypot(B.x - A.x, B.y - A.y);
    const run = len - this.gap * 2;
    if (run <= 0) return null;
    const ux = (B.x - A.x) / len;
    const uy = (B.y - A.y) / len;
    const x = A.x + ux * this.gap;
    const y = A.y + uy * this.gap;
    return [x, y, x + ux * run * p, y + uy * run * p];
  }

  _draw(c, t) {
    const { T, lw, S } = this;
    const g = this.gfx;
    const k = smooth(c.reveal);
    c.halo.setAlpha(
      T.HALO_ALPHA * k * (0.86 + 0.14 * Math.sin(t * 1.7 + c.index * 1.3)),
    );
    c.pts.forEach((p, j) => {
      const lit = this._starLit(c, j, c.reveal);
      const d = S * 0.034 * (0.75 + 0.35 * lit);
      c.glows[j]
        .setAlpha(0.6 * lit * (0.9 + 0.1 * Math.sin(t * 3.1 + j * 1.7)))
        .setDisplaySize(d, d);
    });
    c.pings = c.pings.filter((p) => t - p.t0 < PING);
    if (k <= 0.001 && !c.pings.length) return;

    if (T.GHOST_DOTS) {
      g.lineStyle(lw, 0xaebfe8, T.GHOST_ALPHA * k);
      for (const q of c.ghosts) g.strokeCircle(q.x, q.y, S * 0.0042);
    }

    // the lines: a wide faint glow, a softer body and a bright core
    const a = T.LINE_ALPHA * (0.4 + 0.6 * k);
    for (const e of c.edges) {
      const p = this._edgeP(c, e, c.reveal);
      const s = p > 0 && this._segment(c.pts[e.a], c.pts[e.b], p);
      if (!s) continue;
      g.lineStyle(6 * lw, 0x5a78c8, a * 0.13).lineBetween(
        s[0],
        s[1],
        s[2],
        s[3],
      );
      g.lineStyle(2.6 * lw, 0x9db6ff, a * 0.3).lineBetween(
        s[0],
        s[1],
        s[2],
        s[3],
      );
      g.lineStyle(1.1 * lw, 0xeef3ff, a).lineBetween(s[0], s[1], s[2], s[3]);
      if (p < 1) {
        // the tip, still drawing
        g.fillStyle(0x9db6ff, a * 0.3).fillCircle(s[2], s[3], 3.2 * lw);
        g.fillStyle(0xffffff, a).fillCircle(s[2], s[3], 1.3 * lw);
      }
    }

    // once drawn, a glint runs out along the lines now and then
    if (T.PULSE && c.fullAt !== null && c.edges.length) {
      const per = 0.42;
      const cycle = c.maxDepth * per + 1.6;
      const z = (((t - c.fullAt) % cycle) - 0.25) / per;
      for (const e of c.edges) {
        const q = z - (e.depth - 1);
        const s = q > 0 && q < 1 && this._segment(c.pts[e.a], c.pts[e.b], 1);
        if (!s) continue;
        const x = s[0] + (s[2] - s[0]) * q;
        const y = s[1] + (s[3] - s[1]) * q;
        const f = Math.sin(Math.PI * q);
        g.fillStyle(0x9db6ff, 0.25 * f).fillCircle(x, y, 3.6 * lw);
        g.fillStyle(0xffffff, 0.8 * f).fillCircle(x, y, 1.4 * lw);
      }
    }

    // a ring spreading from each star the line has just reached
    for (const p of c.pings) {
      const u = (t - p.t0) / PING;
      const s = c.pts[p.j];
      g.lineStyle(lw, 0xcfe0ff, 0.55 * (1 - u) * (1 - u)).strokeCircle(
        s.x,
        s.y,
        this.gap * 0.9 + u * S * 0.02,
      );
    }
  }

  _chime(i) {
    if (!this.T.CHIME) return;
    const out = this._audio();
    if (!out) return;
    const { ac, dest, vol } = out;
    const now = ac.currentTime;
    if (now - this._lastChime < 0.35) return;
    this._lastChime = now;
    try {
      // one note of a pentatonic scale per cell, a bell-ish sine and partials
      const f = 523.25 * Math.pow(2, [0, 2, 4, 7, 9, 12, 14][i % 7] / 12);
      for (const [mul, peak, dur] of [
        [1, 0.07, 1.6],
        [2, 0.02, 0.9],
        [3, 0.008, 0.5],
      ]) {
        const o = ac.createOscillator();
        const gn = ac.createGain();
        o.type = "sine";
        o.frequency.value = f * mul;
        gn.gain.setValueAtTime(0.0001, now);
        gn.gain.exponentialRampToValueAtTime(
          Math.max(0.0002, peak * vol),
          now + 0.015,
        );
        gn.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        o.connect(gn).connect(dest);
        o.start(now);
        o.stop(now + dur + 0.05);
      }
    } catch (e) {
      // sound is a nicety
    }
  }

  // the scene's ambient bus if it has one (it already follows mute and
  // volume), otherwise the sound manager's own context
  _audio() {
    const amb = this.scene._amb;
    if (amb && amb.ac && amb.master)
      return { ac: amb.ac, dest: amb.master, vol: 1 };
    const ac = this.scene.sound && this.scene.sound.context;
    const st = this.scene.services?.audio?.state;
    if (!ac || !ac.createOscillator || st?.muted) return null;
    return { ac, dest: ac.destination, vol: st?.sfxVol ?? 0.6 };
  }
}

// soft round glows, pre-coloured (the canvas renderer ignores tint)
function makeTextures(textures) {
  const radial = (key, stops) => {
    if (textures.exists(key)) return;
    const size = 128;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    for (const [o, col] of stops) g.addColorStop(o, col);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    textures.addCanvas(key, c);
  };
  radial(GLOW, [
    [0, "rgba(240,246,255,1)"],
    [0.1, "rgba(205,222,255,0.8)"],
    [0.32, "rgba(140,170,245,0.25)"],
    [1, "rgba(120,150,235,0)"],
  ]);
  radial(HAZE, [
    [0, "rgba(120,148,228,0.9)"],
    [0.45, "rgba(98,126,212,0.35)"],
    [1, "rgba(80,110,200,0)"],
  ]);
}
