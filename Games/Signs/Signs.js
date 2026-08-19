// ─────────────────────────────────────────────────────────────────────────────
// Level — "SIGNS"  ·  code: SILENT  ·  chamber XXI  ·  the collector's wall
//
// A dim study wall hung salon-style with a lifetime of pictures: twelve
// frames — sketches of ships, a lighthouse, a bird, a windmill — and, lost
// among them, six sepia photographs of single hands holding poses. The
// hands are manual-alphabet (ASL fingerspelling) letters, and read across
// the wall they spell LISTEN — a real word, and a trap: typed in, it fails.
//
// The way in: only the photographs — the one series the collector cared
// about — carry small brass plates with years. Chronological order sorts
// them into the message:
//
//   1874·S  1881·I  1896·L  1902·E  1913·N  1921·T   →   SILENT
//
// The wall itself hands the player the wrong answer on a plate — LISTEN —
// and only after it flashes red do the brass plates start to matter.
// Nothing names the alphabet, nothing says the dates count; a pair of
// gloves on the side table is the only wink.
// The hand plates are public-domain diagrams (Wikimedia Commons /
// wpclipart.com), tinted to sit inside the pencil-sketch idiom. The code
// is the proof.
//
// All static jitter is deterministic (seeded). Same scene contract as the
// other levels: GAME_LEVELS, initGlobalAudio, canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const SG_SKETCH = 0xd8d2c4; // the pencil / rim light
const SG_PAPER = 0xd9cfb4; // aged photographic paper
const SG_INK = 0x3a3428; // the sketches' ink on paper
const SG_WARM = 0xe6b458; // the oil lamp — the single living colour
const SG_WORD = "SILENT";

// the salon hang: positions/scale/tilt, hands scattered among the artwork.
// Left to right the hands read L·I·S·T·E·N — the decoy. The years still run
// S<I<L<E<N<T, so chronology alone spells the real code.
const SG_WALL = [
  { x: 0.13, y: 0.4, s: 1.0, tilt: -2, art: "ship" },
  { x: 0.235, y: 0.36, s: 0.8, tilt: 1.5, ch: "L", year: 1896 },
  { x: 0.245, y: 0.62, s: 0.75, tilt: -1, art: "leaf" },
  { x: 0.345, y: 0.5, s: 1.05, tilt: 1, ch: "I", year: 1881 },
  { x: 0.45, y: 0.33, s: 0.85, tilt: -1.5, art: "lighthouse" },
  { x: 0.455, y: 0.66, s: 0.8, tilt: 2, ch: "S", year: 1874 },
  { x: 0.555, y: 0.5, s: 1.0, tilt: -1, art: "bird" },
  { x: 0.655, y: 0.34, s: 0.8, tilt: 1.2, ch: "T", year: 1921 },
  { x: 0.665, y: 0.63, s: 0.9, tilt: -2, art: "mountain" },
  { x: 0.765, y: 0.48, s: 1.0, tilt: 1.6, ch: "E", year: 1902 },
  { x: 0.875, y: 0.33, s: 0.75, tilt: -1.2, art: "windmill" },
  { x: 0.88, y: 0.58, s: 0.85, tilt: 1, ch: "N", year: 1913 },
];

class SignsScene extends Phaser.Scene {
  constructor() {
    super({ key: "Signs" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    this.load.audio("bgm", "assets/sounds/global/background.mp3");
    this.load.audio("click", "assets/sounds/global/click.mp3");
    this.load.audio("ui_click", "assets/sounds/global/mouseclick.wav");
    this.load.audio("nextlevel", "assets/sounds/global/nextlevel.wav");
    this.load.audio("error", "assets/sounds/global/error.mp3");
    for (const ch of SG_WORD) {
      this.load.image("sign_" + ch, "assets/images/signs/sign_" + ch + ".png");
    }
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);
    this.events.once("shutdown", () => this.shutdown());
    this.input.mouse.disableContextMenu();

    this._build(this.cameras.main.width, this.cameras.main.height);

    this.events.on("canvas_resized", ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _rng(seed) {
    let s = seed;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  _sketchSeg(rnd, x1, y1, x2, y2, mag) {
    const pts = [{ x: x1, y: y1 }];
    const steps = 3;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const off = (rnd() - 0.5) * 2 * mag;
      pts.push({ x: x1 + dx * t + nx * off, y: y1 + dy * t + ny * off });
    }
    pts.push({ x: x2, y: y2 });
    return pts;
  }

  _drawPath(g, pts, width, color, alpha) {
    g.lineStyle(width, color, alpha);
    for (let i = 0; i < pts.length - 1; i++) {
      g.lineBetween(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
    }
  }

  _pencilSeg(g, rnd, x1, y1, x2, y2, width, color, alpha, mag = 2) {
    this._drawPath(g, this._sketchSeg(rnd, x1, y1, x2, y2, mag), width, color, alpha);
    this._drawPath(
      g,
      this._sketchSeg(rnd, x1 + 1.2, y1 + 1, x2 + 1.2, y2 + 1, mag),
      width * 0.6,
      color,
      alpha * 0.35,
    );
  }

  _pencilRect(g, rnd, x, y, w, h, width, color, alpha, mag = 2) {
    const o = 3;
    this._pencilSeg(g, rnd, x - o, y, x + w + o, y, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x + w, y - o, x + w, y + h + o, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x + w + o, y + h, x - o, y + h, width, color, alpha, mag);
    this._pencilSeg(g, rnd, x, y + h + o, x, y - o, width, color, alpha, mag);
  }

  _pencilCircle(g, rnd, cx, cy, r, width, color, alpha, steps = 14, mag = 1) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const jr = r + (rnd() - 0.5) * mag;
      pts.push({ x: cx + Math.cos(a) * jr, y: cy + Math.sin(a) * jr });
    }
    this._drawPath(g, pts, width, color, alpha);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;

    this._drawRoom(W, H);
    this._drawWallOfFrames(W, H);
    this._drawTable(W, H);
    this._drawTexts(W, H);
    this._drawVignette(W, H);
    this._spawnDust(W, H);
  }

  _drawRoom(W, H) {
    const g = this.add.graphics().setDepth(-14);
    g.fillGradientStyle(0x171410, 0x151310, 0x0b0a07, 0x0c0b08, 1);
    g.fillRect(0, 0, W, H);

    const rnd = this._rng(2101);
    // wallpaper: faint vertical striping
    g.lineStyle(1, SG_SKETCH, 0.03);
    for (let x = 30; x < W; x += 46) g.lineBetween(x, 0, x + (rnd() - 0.5) * 8, H);
    // the picture rail the frames hang from
    this._railY = H * 0.18;
    this._pencilSeg(g, rnd, 0, this._railY, W, this._railY, 2, SG_SKETCH, 0.35, 1.6);
    this._pencilSeg(g, rnd, 0, this._railY + 5, W, this._railY + 5, 1, SG_SKETCH, 0.15, 1.6);
    // skirting board at the floor
    this._pencilSeg(g, rnd, 0, H * 0.92, W, H * 0.92, 1.6, SG_SKETCH, 0.2, 2);
    g.fillStyle(0x000000, 0.35);
    g.fillRect(0, H * 0.92, W, H * 0.08);
  }

  _drawWallOfFrames(W, H) {
    for (let i = 0; i < SG_WALL.length; i++) {
      const slot = SG_WALL[i];
      const fw = Math.min(W * 0.078, 108) * slot.s;
      this._makeFrame(slot, W * slot.x, H * slot.y, fw, i);
    }
  }

  _makeFrame(slot, cx, cy, fw, index) {
    const rnd = this._rng(3300 + index * 137);
    const isPhoto = !!slot.ch;

    let innerW = fw;
    let innerH;
    let src = null;
    if (isPhoto) {
      const img = this.textures.get("sign_" + slot.ch);
      src = img && img.source[0] ? img.source[0] : { width: 500, height: 700 };
      // room for the plate under the print
      innerH = (innerW * 0.82 * src.height) / src.width + fw * 0.42;
    } else {
      innerH = fw * (0.78 + (index % 3) * 0.14);
    }
    const bezel = fw * 0.11;

    const cont = this.add.container(cx, cy).setDepth(0);
    cont.setAngle(slot.tilt);

    // hanging string up to the rail: two strands to a nail
    const sg = this.add.graphics().setDepth(-1);
    const nailY = this._railY + 4;
    this._pencilSeg(sg, rnd, cx - fw * 0.34, cy - innerH / 2 + 2, cx, nailY, 1, SG_SKETCH, 0.24, 1.2);
    this._pencilSeg(sg, rnd, cx + fw * 0.34, cy - innerH / 2 + 2, cx, nailY, 1, SG_SKETCH, 0.24, 1.2);
    sg.fillStyle(SG_SKETCH, 0.35);
    sg.fillCircle(cx, nailY, 2);

    const g = this.add.graphics();
    // cast shadow on the wall
    g.fillStyle(0x000000, 0.3);
    g.fillRect(-innerW / 2 - bezel + 4, -innerH / 2 - bezel + 6, innerW + bezel * 2, innerH + bezel * 2);
    // frame + mount
    g.fillStyle(isPhoto ? 0x241e15 : 0x1d1913, 1);
    g.fillRect(-innerW / 2 - bezel, -innerH / 2 - bezel, innerW + bezel * 2, innerH + bezel * 2);
    this._pencilRect(g, rnd, -innerW / 2 - bezel, -innerH / 2 - bezel, innerW + bezel * 2, innerH + bezel * 2, 1.5, SG_SKETCH, 0.45, 1.3);
    g.fillStyle(SG_PAPER, isPhoto ? 0.92 : 0.8);
    g.fillRect(-innerW / 2, -innerH / 2, innerW, innerH);
    this._pencilRect(g, rnd, -innerW / 2, -innerH / 2, innerW, innerH, 1, 0x4a4636, 0.35, 1);
    // foxing on the mount
    g.fillStyle(0x8a7a4e, 0.13);
    g.fillCircle(-innerW * 0.3, innerH * 0.34, innerW * 0.07);
    g.fillCircle(innerW * 0.36, -innerH * 0.3, innerW * 0.05);
    cont.add(g);

    if (isPhoto) {
      // the photograph, sepia-tinted into the paper
      const photo = this.add.image(0, -fw * 0.12, "sign_" + slot.ch);
      photo.setScale((innerW * 0.72) / src.width);
      photo.setTint(0xcbbd9c); // whites age to paper, lines stay dark
      photo.setAlpha(0.94);
      cont.add(photo);

      // the brass plate — the one thing this series has that nothing else does
      const pg = this.add.graphics();
      const pw = innerW * 0.5;
      const ph = fw * 0.17;
      const py = innerH / 2 - ph * 0.95;
      pg.fillStyle(0x8a713c, 0.9);
      pg.fillRect(-pw / 2, py - ph / 2, pw, ph);
      pg.lineStyle(1, 0x3a2f18, 0.7);
      pg.strokeRect(-pw / 2, py - ph / 2, pw, ph);
      pg.fillStyle(SG_WARM, 0.18);
      pg.fillRect(-pw / 2, py - ph / 2, pw, ph * 0.4);
      cont.add(pg);
      const yearTx = this.add
        .text(0, py, String(slot.year), {
          fontFamily: '"Special Elite", monospace',
          fontSize: Math.max(9, Math.round(ph * 0.62)) + "px",
          color: "#2c2414",
        })
        .setOrigin(0.5);
      cont.add(yearTx);
    } else {
      // an ink sketch on the paper — the rest of the collection
      const ag = this.add.graphics();
      this._drawArtwork(ag, rnd, slot.art, innerW, innerH);
      cont.add(ag);
    }

    // a soft glass glint across one corner
    const glint = this.add.graphics();
    glint.fillStyle(0xffffff, 0.05);
    glint.fillTriangle(
      -innerW / 2, -innerH / 2 + innerH * 0.24,
      -innerW / 2 + innerW * 0.5, -innerH / 2,
      -innerW / 2, -innerH / 2,
    );
    cont.add(glint);

    // a couple of frames drift on their strings, barely
    if (index === 3 || index === 9) {
      this.tweens.add({
        targets: cont,
        angle: slot.tilt + (index === 3 ? 1.1 : -1.3),
        duration: 4200 + index * 400,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  // small ink vignettes for the decoy frames, drawn inside (w × h) around 0,0
  _drawArtwork(g, rnd, kind, w, h) {
    const s = Math.min(w, h);
    switch (kind) {
      case "ship": {
        // hull, two masts, a following sea
        this._pencilSeg(g, rnd, -s * 0.32, s * 0.12, s * 0.32, s * 0.12, 1.4, SG_INK, 0.7, 1);
        this._pencilSeg(g, rnd, -s * 0.26, s * 0.22, s * 0.26, s * 0.22, 1.3, SG_INK, 0.6, 1);
        this._pencilSeg(g, rnd, -s * 0.32, s * 0.12, -s * 0.26, s * 0.22, 1.2, SG_INK, 0.6, 0.6);
        this._pencilSeg(g, rnd, s * 0.32, s * 0.12, s * 0.26, s * 0.22, 1.2, SG_INK, 0.6, 0.6);
        this._pencilSeg(g, rnd, -s * 0.12, s * 0.12, -s * 0.12, -s * 0.3, 1.3, SG_INK, 0.65, 0.8);
        this._pencilSeg(g, rnd, s * 0.1, s * 0.12, s * 0.1, -s * 0.22, 1.2, SG_INK, 0.6, 0.8);
        g.fillStyle(SG_INK, 0.5);
        g.fillTriangle(-s * 0.12, -s * 0.3, -s * 0.12, -s * 0.06, -s * 0.3, -s * 0.06);
        g.fillTriangle(s * 0.1, -s * 0.22, s * 0.1, -s * 0.04, s * 0.26, -s * 0.04);
        for (let i = 0; i < 3; i++) {
          this._pencilSeg(g, rnd, -s * 0.3 + i * s * 0.1, s * 0.3, -s * 0.18 + i * s * 0.1, s * 0.3, 1, SG_INK, 0.35, 1);
        }
        break;
      }
      case "lighthouse": {
        // tapered tower, lantern, two beams, rocks
        this._pencilSeg(g, rnd, -s * 0.08, s * 0.3, -s * 0.05, -s * 0.2, 1.4, SG_INK, 0.7, 0.8);
        this._pencilSeg(g, rnd, s * 0.08, s * 0.3, s * 0.05, -s * 0.2, 1.4, SG_INK, 0.7, 0.8);
        for (let i = 0; i < 3; i++) {
          const y = s * (0.16 - i * 0.14);
          this._pencilSeg(g, rnd, -s * 0.08 + i * 0.008 * s, y, s * 0.08 - i * 0.008 * s, y, 1, SG_INK, 0.4, 0.6);
        }
        this._pencilRect(g, rnd, -s * 0.07, -s * 0.32, s * 0.14, s * 0.12, 1.2, SG_INK, 0.65, 0.6);
        this._pencilSeg(g, rnd, s * 0.09, -s * 0.27, s * 0.34, -s * 0.34, 1, SG_INK, 0.3, 0.6);
        this._pencilSeg(g, rnd, -s * 0.09, -s * 0.27, -s * 0.34, -s * 0.2, 1, SG_INK, 0.3, 0.6);
        this._pencilSeg(g, rnd, -s * 0.3, s * 0.32, s * 0.3, s * 0.3, 1.3, SG_INK, 0.5, 1.6);
        break;
      }
      case "bird": {
        // a bird at rest on a branch
        this._pencilSeg(g, rnd, -s * 0.32, s * 0.16, s * 0.3, s * 0.1, 1.3, SG_INK, 0.6, 1.2);
        this._pencilSeg(g, rnd, s * 0.06, s * 0.11, s * 0.2, s * 0.24, 1, SG_INK, 0.4, 0.8);
        g.fillStyle(SG_INK, 0.55);
        g.fillEllipse(-s * 0.04, -s * 0.02, s * 0.24, s * 0.15);
        g.fillCircle(s * 0.08, -s * 0.1, s * 0.06);
        g.fillTriangle(s * 0.13, -s * 0.1, s * 0.2, -s * 0.08, s * 0.13, -s * 0.06);
        this._pencilSeg(g, rnd, -s * 0.14, -s * 0.04, -s * 0.26, -s * 0.12, 1.1, SG_INK, 0.5, 0.8);
        break;
      }
      case "leaf": {
        // a botanical study: stem and leaflets
        this._pencilSeg(g, rnd, 0, s * 0.32, 0, -s * 0.3, 1.3, SG_INK, 0.65, 1.2);
        for (let i = 0; i < 4; i++) {
          const y = s * (0.18 - i * 0.13);
          const len = s * (0.2 - i * 0.03);
          this._pencilSeg(g, rnd, 0, y, -len, y - s * 0.08, 1.1, SG_INK, 0.5, 0.8);
          this._pencilSeg(g, rnd, 0, y, len, y - s * 0.08, 1.1, SG_INK, 0.5, 0.8);
          g.fillStyle(SG_INK, 0.2);
          g.fillEllipse(-len * 0.7, y - s * 0.06, len * 0.5, s * 0.05);
          g.fillEllipse(len * 0.7, y - s * 0.06, len * 0.5, s * 0.05);
        }
        break;
      }
      case "mountain": {
        // two peaks and a low sun
        this._pencilSeg(g, rnd, -s * 0.34, s * 0.22, -s * 0.08, -s * 0.22, 1.3, SG_INK, 0.65, 1);
        this._pencilSeg(g, rnd, -s * 0.08, -s * 0.22, s * 0.1, s * 0.06, 1.3, SG_INK, 0.6, 1);
        this._pencilSeg(g, rnd, s * 0.02, -s * 0.04, s * 0.18, -s * 0.3, 1.3, SG_INK, 0.65, 1);
        this._pencilSeg(g, rnd, s * 0.18, -s * 0.3, s * 0.36, s * 0.22, 1.3, SG_INK, 0.6, 1);
        this._pencilSeg(g, rnd, -s * 0.36, s * 0.22, s * 0.36, s * 0.22, 1.2, SG_INK, 0.5, 1.2);
        this._pencilCircle(g, rnd, -s * 0.22, -s * 0.18, s * 0.06, 1.1, SG_INK, 0.45, 10, 0.6);
        // hatching on the near slope
        for (let i = 0; i < 4; i++) {
          this._pencilSeg(g, rnd, s * (0.18 + i * 0.04), -s * (0.3 - i * 0.1), s * (0.22 + i * 0.04), -s * (0.24 - i * 0.1), 0.9, SG_INK, 0.3, 0.5);
        }
        break;
      }
      case "windmill":
      default: {
        // a squat mill with crossed sails
        this._pencilSeg(g, rnd, -s * 0.1, s * 0.3, -s * 0.06, -s * 0.08, 1.3, SG_INK, 0.65, 0.8);
        this._pencilSeg(g, rnd, s * 0.1, s * 0.3, s * 0.06, -s * 0.08, 1.3, SG_INK, 0.65, 0.8);
        this._pencilSeg(g, rnd, -s * 0.07, -s * 0.08, 0, -s * 0.18, 1.2, SG_INK, 0.6, 0.6);
        this._pencilSeg(g, rnd, s * 0.07, -s * 0.08, 0, -s * 0.18, 1.2, SG_INK, 0.6, 0.6);
        const hub = { x: 0, y: -s * 0.16 };
        for (const a of [Math.PI / 5, Math.PI / 5 + Math.PI / 2, Math.PI / 5 + Math.PI, Math.PI / 5 + Math.PI * 1.5]) {
          const ex = hub.x + Math.cos(a) * s * 0.26;
          const ey = hub.y + Math.sin(a) * s * 0.26;
          this._pencilSeg(g, rnd, hub.x, hub.y, ex, ey, 1.1, SG_INK, 0.55, 0.6);
          this._pencilSeg(g, rnd, ex, ey, ex + Math.cos(a + 1.2) * s * 0.07, ey + Math.sin(a + 1.2) * s * 0.07, 1, SG_INK, 0.45, 0.5);
        }
        this._pencilSeg(g, rnd, -s * 0.3, s * 0.3, s * 0.3, s * 0.3, 1.1, SG_INK, 0.4, 1.2);
        break;
      }
    }
  }

  // a side table with an oil lamp (breathing) and a pair of gloves
  _drawTable(W, H) {
    const g = this.add.graphics().setDepth(2);
    const rnd = this._rng(9911);
    const tx = W * 0.85;
    const topY = H * 0.8;
    const tw = W * 0.14;
    const legH = H * 0.12;

    // top + legs
    g.fillStyle(0x1a150e, 1);
    g.fillRect(tx - tw / 2, topY, tw, 8);
    this._pencilRect(g, rnd, tx - tw / 2, topY, tw, 8, 1.4, SG_SKETCH, 0.45, 1.2);
    for (const lx of [tx - tw * 0.4, tx + tw * 0.4]) {
      this._pencilSeg(g, rnd, lx, topY + 8, lx - (lx < tx ? 4 : -4), topY + legH, 1.6, SG_SKETCH, 0.4, 1);
    }

    // the oil lamp: base, chimney, and a warm pool that breathes
    const lampX = tx - tw * 0.22;
    const lampY = topY;
    this._pencilSeg(g, rnd, lampX - 7, lampY, lampX + 7, lampY, 1.4, SG_SKETCH, 0.5, 0.6);
    this._pencilSeg(g, rnd, lampX - 5, lampY, lampX - 3, lampY - 12, 1.2, SG_SKETCH, 0.45, 0.6);
    this._pencilSeg(g, rnd, lampX + 5, lampY, lampX + 3, lampY - 12, 1.2, SG_SKETCH, 0.45, 0.6);
    this._pencilSeg(g, rnd, lampX - 4, lampY - 12, lampX - 6, lampY - 30, 1.1, SG_SKETCH, 0.4, 0.8);
    this._pencilSeg(g, rnd, lampX + 4, lampY - 12, lampX + 6, lampY - 30, 1.1, SG_SKETCH, 0.4, 0.8);
    const glow = this.add.circle(lampX, lampY - 18, 34, SG_WARM, 0.08).setDepth(1);
    const flame = this.add.circle(lampX, lampY - 17, 3.2, SG_WARM, 0.8).setDepth(2);
    this.tweens.add({
      targets: [glow],
      alpha: 0.5,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({
      targets: [flame],
      scaleY: 1.25,
      scaleX: 0.9,
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    // lamplight brushing the nearest frames
    this.add.circle(W * 0.8, H * 0.56, W * 0.1, SG_WARM, 0.03).setDepth(1);

    // the gloves: two limp leather shapes draped over the table edge
    const gx = tx + tw * 0.24;
    g.fillStyle(0x14110c, 1);
    g.fillEllipse(gx, topY + 2, 26, 9);
    g.fillEllipse(gx + 8, topY + 8, 22, 8);
    g.lineStyle(1, SG_SKETCH, 0.3);
    g.strokeEllipse(gx, topY + 2, 26, 9);
    g.strokeEllipse(gx + 8, topY + 8, 22, 8);
    // a few finger seams
    for (let i = -1; i <= 1; i++) {
      this._pencilSeg(g, rnd, gx - 8 + i * 5, topY, gx - 12 + i * 5, topY + 4, 0.8, SG_SKETCH, 0.25, 0.5);
    }
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "A LIFETIME OF COLLECTING, AND NO CATALOGUE LEFT BEHIND.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.levelText = this.add
      .text(W - 30, 28, "Level " + (window.GAME_LEVELS.findIndex((l) => l.key === this.scene.key) + 1), {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#e8dcc0",
      })
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: this.levelText, alpha: 1, duration: 2000 });
  }

  _drawVignette(W, H) {
    const vg = this.add.graphics().setDepth(30);
    const v = Math.min(W, H) * 0.2;
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5, 0.5, 0, 0);
    vg.fillRect(0, 0, W, v);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.55, 0.55);
    vg.fillRect(0, H - v, W, v);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.45, 0, 0.45, 0);
    vg.fillRect(0, 0, v, H);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.45, 0, 0.45);
    vg.fillRect(W - v, 0, v, H);
  }

  _spawnDust(W, H) {
    const rnd = this._rng(3391);
    for (let i = 0; i < 10; i++) {
      const dx = W * 0.1 + rnd() * W * 0.8;
      const dy = H * 0.15 + rnd() * H * 0.6;
      const dot = this.add
        .circle(dx, dy, 0.7 + rnd() * 1, 0xffffff, 0.07 + rnd() * 0.09)
        .setDepth(4);
      this.tweens.add({
        targets: dot,
        x: dx + (rnd() * 40 - 20),
        y: dy + 24 + rnd() * 36,
        alpha: 0,
        duration: 8000 + rnd() * 8000,
        delay: rnd() * 5000,
        repeat: -1,
        onRepeat: () => {
          dot.x = W * 0.1 + rnd() * W * 0.8;
          dot.y = H * 0.15 + rnd() * H * 0.5;
          dot.setAlpha(0.07 + rnd() * 0.09);
        },
      });
    }
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
