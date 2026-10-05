import { playPaperTick, playPuzzleChime } from "../../shared/puzzleSounds.js";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { drawLevelLabel } from "../../shared/levelLabel.js";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { paintStudy, releaseStudyArt } from "./board.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "SEQUENCE"  ·  code: 19334488111   ·  sort, then read
//
// A storybook study in the evening: on the wooden wall, an oak-framed cork
// board with six slots ruled in pencil, and six index cards pinned over them
// out of order. Drag a card onto another and they swap.
//
// Sorted smallest-first —  11 19 23 24 28 31  — they fuse into one long
// number, written live on the paper strip beneath the row:  111923242831.
//
// The cipher is look-and-say, taught by the note lying on the desk
// ( 25 → 55 · "how many, then what" ): read the long number in pairs,
// each pair saying HOW MANY times to write WHICH digit:
//
//   11→1 · 19→9 · 23→33 · 24→44 · 28→88 · 31→111
//
// …which spells the access code:  19334488111
//
// The study is painted once per screen size (board.js); the cards, their
// numbers, the note's words and the dust in the lamplight are live.
// ─────────────────────────────────────────────────────────────────────────────

const SEQ_SORTED = [11, 19, 23, 24, 28, 31];
// starting arrangement — no card begins in its correct slot
const SEQ_START = [23, 31, 11, 28, 19, 24];

const SEQ_INK = "#2b2118"; // pencil-and-ink on paper
const SEQ_RED = "#8e2a1c"; // the answer, written in red
const SEQ_FONT = '"Special Elite", monospace';

export default class SequenceScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Sequence" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();
    // touch-only devices have no mouse manager
    this.input.mouse?.disableContextMenu();

    // slot order + solved state survive resizes
    this._order = SEQ_START.slice();
    this._solved = false;

    this._build(this.cameras.main.width, this.cameras.main.height);

    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    this._movableSparkleCleanups = [];

    const compact = H < 450;
    const deskY = H * (compact ? 0.68 : 0.74);
    // the row of slots
    const cw = Math.min(W * 0.09, 124, compact ? H * 0.22 : Infinity);
    const chh = cw * 0.72;
    const gap = cw * 0.26;
    const total = 6 * cw + 5 * gap;
    this._slots = [];
    const x0 = W / 2 - total / 2;
    const sy = H * (compact ? 0.28 : 0.32);
    const fusedY = sy + chh / 2 + (compact ? 42 : 74);
    for (let i = 0; i < 6; i++) {
      this._slots.push({
        x: x0 + i * (cw + gap) + cw / 2,
        y: sy,
        w: cw,
        h: chh,
      });
    }
    this._slotRow = { x: x0, y: sy - chh / 2, w: total, h: chh };

    // the note on the desk — kept on screen however narrow it is
    const nw = Math.min(240, W * 0.42);
    const nh = Math.round(Math.min(nw * 0.38, compact ? H * 0.28 : Infinity));
    // Reserve the bottom-right corner for Inspect, including larger text.
    const edge = Math.max(12, W * 0.04);
    const nx = Math.max(edge, Math.min(W * 0.79, W - nw - edge - (compact ? 160 : 0)));
    const ny = Math.min(deskY + (H - deskY) / 2 - nh / 2, H - nh - 12);
    this._note = { x: nx, y: ny, w: nw, h: nh, angle: -0.035 };

    const art = paintStudy(this, W, H, {
      W,
      H,
      compact,
      deskY,
      slots: this._slots,
      slotRow: this._slotRow,
      fused: { y: fusedY },
      note: this._note,
    });
    this._art = art;
    this.add.image(0, 0, art.room).setOrigin(0, 0).setDepth(-14);

    this._drawNote();
    this._drawTexts(W, H);

    // the fused number, written live on the paper strip beneath the row
    this._fusedText = this.add
      .text(W / 2, fusedY, "", {
        fontFamily: SEQ_FONT,
        fontSize: Math.round(cw * 0.42) + "px",
        color: SEQ_INK,
        letterSpacing: Math.max(2, Math.round(cw * 0.05)),
      })
      .setOrigin(0.5)
      .setDepth(8);

    this._makeCards();
    this._spawnDust(W, H);

    this._refreshFused();
    if (this._solved) this._applySolved(true);
  }

  // the note that teaches the cipher: 25 → 55
  _drawNote() {
    const n = this._note;
    const cx = n.x + n.w / 2;
    const cy = n.y + n.h / 2;
    const deg = (n.angle * 180) / Math.PI;
    const at = (dy) => ({
      x: cx - Math.sin(n.angle) * dy,
      y: cy + Math.cos(n.angle) * dy,
    });
    const a = at(-n.h * 0.12);
    this.add
      .text(a.x, a.y, "25 → 55", {
        fontFamily: SEQ_FONT,
        fontSize: Math.round(n.h * 0.28) + "px",
        color: SEQ_INK,
      })
      .setOrigin(0.5)
      .setAngle(deg)
      .setDepth(-5);
    const b = at(n.h * 0.26);
    this.add
      .text(b.x, b.y, "how many, then what", {
        fontFamily: SEQ_FONT,
        fontSize: Math.max(10, Math.round(n.h * 0.15)) + "px",
        color: "#4a3a2a",
      })
      .setOrigin(0.5)
      .setAngle(deg)
      .setAlpha(0.9)
      .setDepth(-5);
  }

  // ── cards ──────────────────────────────────────────────────────────────────

  _makeCards() {
    this._cards = [];
    const art = this._art;
    const rndA = this._rng(5151);
    for (let slot = 0; slot < this._order.length; slot++) {
      const value = this._order[slot];
      const s = this._slots[slot];
      const cont = this.add.container(s.x, s.y).setDepth(10);
      cont.setAngle((rndA() - 0.5) * 4); // hand-pinned, slightly crooked
      cont.cardValue = value;
      cont.slotIndex = slot;
      cont.homeAngle = cont.angle;

      // its shadow on the cork, then the card itself
      const lift = Math.max(2, s.w * 0.03);
      const shadow = this.add
        .image(lift, lift * 1.4, art.shadow)
        .setDisplaySize(s.w * 1.5, s.h + s.w * 0.5)
        .setAlpha(0.7);
      const card = this.add.image(0, 0, art.card).setDisplaySize(s.w, s.h);
      cont.add([shadow, card]);
      cont.shadow = shadow;
      cont.lift = lift;

      const txt = this.add
        .text(0, s.h * 0.1, String(value), {
          fontFamily: SEQ_FONT,
          fontSize: Math.round(s.h * 0.5) + "px",
          color: SEQ_INK,
        })
        .setOrigin(0.5);
      cont.add(txt);
      cont.numText = txt;

      const zone = this.add
        .zone(0, 0, s.w, s.h)
        .setOrigin(0.5)
        .setInteractive({ draggable: true, useHandCursor: true });
      cont.add(zone);
      this._movableSparkleCleanups.push(attachMovableSparkles(this, cont, {
        bounds: () => cont.getBounds(),
        enabled: () => !this._solved,
        padding: Math.max(3, s.w * 0.025),
      }));

      // follow the pointer's world position — dragX/dragY are mapped into
      // the container's local space and would drift under rotation/scale
      zone.on("dragstart", (p) => {
        if (this._solved) return;
        cont.setDepth(16);
        cont.setScale(1.07);
        cont.setAngle(0);
        shadow.setPosition(lift * 3, lift * 4.5).setAlpha(0.5); // lifted off the cork
        cont.dragOffX = cont.x - p.worldX;
        cont.dragOffY = cont.y - p.worldY;
        playPaperTick(this, 0.1);
      });
      zone.on("drag", (p) => {
        if (this._solved) return;
        cont.x = p.worldX + cont.dragOffX;
        cont.y = p.worldY + cont.dragOffY;
      });
      zone.on("dragend", (p) => {
        if (this._solved) return;
        cont.setDepth(10);
        cont.setScale(1);
        shadow.setPosition(lift, lift * 1.4).setAlpha(0.7);
        const target = this._slotAt(p.x, p.y);
        if (target !== -1 && target !== cont.slotIndex) {
          this._swap(cont.slotIndex, target);
        } else {
          this._settle(cont);
        }
      });

      this._cards.push(cont);
    }
  }

  _slotAt(px, py) {
    const r = this._slotRow;
    if (py < r.y - 30 || py > r.y + r.h + 30) return -1;
    for (let i = 0; i < this._slots.length; i++) {
      const s = this._slots[i];
      if (Math.abs(px - s.x) <= (s.w + 14) / 2) return i;
    }
    return -1;
  }

  _cardInSlot(idx) {
    return this._cards.find((c) => c.slotIndex === idx);
  }

  _swap(a, b) {
    const ca = this._cardInSlot(a);
    const cb = this._cardInSlot(b);
    if (!ca || !cb) return;
    ca.slotIndex = b;
    cb.slotIndex = a;
    const t = this._order[a];
    this._order[a] = this._order[b];
    this._order[b] = t;
    this._settle(ca);
    this._settle(cb);
    playPaperTick(this, 0.16);
    this._refreshFused();
    this._checkSolved();
  }

  _settle(cont) {
    const s = this._slots[cont.slotIndex];
    this.tweens.add({
      targets: cont,
      x: s.x,
      y: s.y,
      angle: this._solved ? 0 : cont.homeAngle,
      duration: 170,
      ease: "Quad.easeOut",
    });
  }

  // ── the fused number · solving ─────────────────────────────────────────────

  _refreshFused() {
    this._fusedText.setText(this._order.join(""));
  }

  _checkSolved() {
    if (this._solved) return;
    for (let i = 0; i < this._order.length; i++) {
      if (this._order[i] !== SEQ_SORTED[i]) return;
    }
    this._solved = true;
    playPuzzleChime(this);
    this._applySolved();
  }

  _applySolved(instant) {
    // cards straighten, and the long number is gone over in red ink
    for (const c of this._cards) {
      if (instant) c.setAngle(0);
      else this.tweens.add({ targets: c, angle: 0, duration: 260 });
      c.numText.setColor(SEQ_RED);
    }
    this._fusedText.setColor(SEQ_RED);
    if (!instant) {
      this.tweens.add({
        targets: this._fusedText,
        scale: { from: 1, to: 1.08 },
        yoyo: true,
        duration: 260,
        ease: "Quad.easeOut",
      });
    }
  }

  _drawTexts(W, H) {
    this.levelText = drawLevelLabel(this, W, H);
  }

  // dust turning slowly in the lamplight
  _spawnDust(W, H) {
    const rnd = this._rng(8484);
    const r = this._slotRow;
    const S = Math.min(W, H);
    for (let i = 0; i < 12; i++) {
      const dx = r.x - 40 + rnd() * (r.w + 80);
      const dy = H * 0.08 + rnd() * H * 0.5;
      const size = S * (0.006 + rnd() * 0.006);
      const dot = this.add
        .image(dx, dy, this._art.mote)
        .setDisplaySize(size, size)
        .setBlendMode("ADD")
        .setAlpha(0.15 + rnd() * 0.2)
        .setDepth(-2);
      this.ambientObject(dot);
      this.ambientTween({
        targets: dot,
        x: dx + (rnd() * 44 - 22),
        y: dy + 24 + rnd() * 40,
        alpha: 0,
        duration: 8000 + rnd() * 8000,
        delay: rnd() * 5000,
        repeat: -1,
        onRepeat: () => {
          dot.x = r.x - 40 + rnd() * (r.w + 80);
          dot.y = H * 0.08 + rnd() * H * 0.4;
          dot.setAlpha(0.15 + rnd() * 0.2);
        },
      });
    }
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    for (const cleanup of this._movableSparkleCleanups || []) cleanup();
    this._movableSparkleCleanups = [];
    this.tweens.killAll();
    this.time.removeAllEvents();
    // destroy rather than just detach: removeAll(true) left the old cards'
    // drag zones alive after a resize
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseStudyArt(this.textures);
    this._cards = [];
    this._fusedText = null;
  }

  shutdown() {
    for (const cleanup of this._movableSparkleCleanups || []) cleanup();
    this._movableSparkleCleanups = [];
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseStudyArt(this.textures);
  }
}
