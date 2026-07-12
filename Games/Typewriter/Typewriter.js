// ─────────────────────────────────────────────────────────────────────────────
// Level — "TYPEWRITER"  ·  code: RIBBON  ·  very hard  ·  the machine lies
//
// An old VELOX No.5 typewriter on a desk, fully working: click its keys (or
// use your real keyboard) and it types onto the sheet — CLACK, bell at the
// line's end. Except the machine is "one step ahead": every key strikes the
// letter to its RIGHT on the keyboard. Press Q, get W. Press T, get Y.
// Nobody tells you this — you find out by typing.
//
// Beside it, a note typed on this very machine:
//
//   YJR TONNPM LMRE RBRTU EPTF
//
// Whoever wrote it pressed the right keys and trusted the machine. Undo the
// habit — shift every letter one key LEFT on the QWERTY rows — and it reads:
//
//   THE RIBBON KNEW EVERY WORD   →   the code is RIBBON
//
// The brand plate whispers it, for those who read plates: "always one step
// ahead." The experiment is the tool; the note is the cipher; no outside
// knowledge needed.
//
// No halos, no pulsing, no animated lighting — still light, museum-quiet.
// Same scene contract as the other levels: GAME_LEVELS, initGlobalAudio,
// transitionToLevel(), canvas_resized, shutdown().
// ─────────────────────────────────────────────────────────────────────────────

const TW_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const TW_NOTE = ["YJR TONNPM", "LMRE RBRTU EPTF"];
const TW_LINE_LEN = 22;

// what the broken machine actually prints for a pressed key
function twShift(ch) {
  for (const row of TW_ROWS) {
    const i = row.indexOf(ch);
    if (i >= 0) return row[(i + 1) % row.length];
  }
  return ch;
}

class TypewriterScene extends Phaser.Scene {
  constructor() {
    super({ key: "Typewriter" });
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
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);
    // Phaser never calls shutdown() by itself — wire it to the scene event
    this.events.once("shutdown", () => this.shutdown());

    this.isSolved = false;
    this._typed = "";
    this._overlayOpen = false;

    this._build(this.cameras.main.width, this.cameras.main.height);

    // the real keyboard works too — unless the code box has focus
    this._keyHandler = (e) => {
      if (!this.sys || !this.sys.isActive()) return;
      if (
        document.activeElement &&
        document.activeElement.tagName === "INPUT"
      )
        return;
      if (this._overlayOpen) return;
      const k = (e.key || "").toUpperCase();
      if (/^[A-Z]$/.test(k)) this._type(k);
      else if (e.key === " ") this._type(" ");
    };
    window.addEventListener("keydown", this._keyHandler);
    this.events.once("shutdown", () => {
      window.removeEventListener("keydown", this._keyHandler);
    });

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

  _lerpColor(c1, c2, t) {
    const a = Phaser.Display.Color.ValueToColor(c1);
    const b = Phaser.Display.Color.ValueToColor(c2);
    const o = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, 100, t * 100);
    return Phaser.Display.Color.GetColor(o.r, o.g, o.b);
  }

  // ── typing ─────────────────────────────────────────────────────────────────

  _type(ch) {
    if (this._overlayOpen) return;
    const printed = ch === " " ? " " : twShift(ch);
    this._typed += printed;
    if (this._typed.length > TW_LINE_LEN * 40) {
      this._typed = this._typed.slice(-TW_LINE_LEN * 4);
    }
    this._clack(ch === " ");
    if (this._typed.length % TW_LINE_LEN === 0) this._bell();
    this._renderPaper();
  }

  _renderPaper() {
    if (!this._paperText) return;
    const lines = [];
    for (let i = 0; i < this._typed.length; i += TW_LINE_LEN) {
      lines.push(this._typed.slice(i, i + TW_LINE_LEN));
    }
    this._paperText.setText(lines.slice(-3).join("\n"));
  }

  // ── scene construction ─────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;

    this._drawRoom(W, H);
    this._drawMachine(W, H);
    this._buildKeys(W, H);
    this._buildNote(W, H);
    this._drawTexts(W, H);
    this._renderPaper();

    // static vignette
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

  _drawRoom(W, H) {
    const bg = this.add.graphics().setDepth(-12);
    // dim study wall
    bg.fillGradientStyle(0x262024, 0x2c2428, 0x120e12, 0x161016, 1);
    bg.fillRect(0, 0, W, H * 0.42);
    // still shaft of light from the left
    bg.fillGradientStyle(0xffe9c0, 0x000000, 0x000000, 0x000000, 0.05, 0, 0.02, 0);
    bg.fillRect(0, 0, W, H);
    // desk
    bg.fillGradientStyle(0x4a2f16, 0x54371c, 0x201206, 0x281808, 1);
    bg.fillRect(0, H * 0.42, W, H * 0.58);
    bg.fillStyle(0x6b4620, 0.9).fillRect(0, H * 0.42, W, 3);
    bg.fillStyle(0xffd08a, 0.05).fillRect(0, H * 0.42 + 3, W, 8);
    const rnd = this._rng(741);
    bg.lineStyle(1, 0x140b04, 0.3);
    for (let i = 0; i < 16; i++) {
      const gy = H * 0.45 + rnd() * H * 0.52;
      const gx = rnd() * W;
      bg.lineBetween(gx, gy, gx + 40 + rnd() * 100, gy + (rnd() * 4 - 2));
    }
  }

  _drawMachine(W, H) {
    const cx = W * 0.44;
    const bodyW = Math.min(W * 0.58, 470);
    const bodyTop = H * 0.5;
    const bodyBot = H * 0.68;
    this._mach = { cx, bodyW, bodyTop, bodyBot };

    const g = this.add.graphics().setDepth(0);

    // ── the sheet of paper, rising behind the platen ──
    const pw = bodyW * 0.62;
    const pTop = H * 0.13;
    const pBot = bodyTop + 8;
    g.fillStyle(0x000000, 0.3);
    g.fillRect(cx - pw / 2 + 4, pTop + 5, pw, pBot - pTop);
    g.fillGradientStyle(0xf4efe2, 0xf0eadb, 0xd8d2c0, 0xdfd8c6, 1);
    g.fillRect(cx - pw / 2, pTop, pw, pBot - pTop);
    g.lineStyle(1, 0x9a917c, 0.7);
    g.strokeRect(cx - pw / 2, pTop, pw, pBot - pTop);
    // faint top curl shadow
    g.fillStyle(0x9a917c, 0.18);
    g.fillRect(cx - pw / 2, pTop, pw, 5);

    this._paperText = this.add
      .text(cx - pw / 2 + 16, pTop + 22, "", {
        fontFamily: '"Special Elite", monospace',
        fontSize: Math.max(13, Math.round(pw * 0.052)) + "px",
        color: "#2a2118",
        lineSpacing: 7,
      })
      .setDepth(1);

    // ── platen (the roller) ──
    const platY = bodyTop - 6;
    g.fillGradientStyle(0x3a3a3e, 0x3a3a3e, 0x141416, 0x141416, 1);
    g.fillRoundedRect(cx - bodyW / 2 + 14, platY - 15, bodyW - 28, 30, 13);
    g.fillStyle(0x5a5a60, 0.5);
    g.fillRoundedRect(cx - bodyW / 2 + 14, platY - 13, bodyW - 28, 5, 3);
    // platen knobs
    for (const side of [-1, 1]) {
      const kx = cx + side * (bodyW / 2 - 6);
      g.fillGradientStyle(0x2c2c30, 0x2c2c30, 0x0e0e10, 0x0e0e10, 1);
      g.fillCircle(kx, platY, 13);
      g.fillStyle(0x4a4a52, 0.6);
      g.fillCircle(kx - 2, platY - 3, 5);
    }
    // paper bail
    g.lineStyle(3, 0x8a8a92, 0.9);
    g.lineBetween(cx - bodyW * 0.31, platY - 17, cx + bodyW * 0.31, platY - 17);

    // ── enamel body ──
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(cx - bodyW / 2 + 5, bodyTop + 6, bodyW, bodyBot - bodyTop, 14);
    g.fillGradientStyle(0x2e3a34, 0x35423b, 0x101815, 0x141c18, 1);
    g.fillRoundedRect(cx - bodyW / 2, bodyTop, bodyW, bodyBot - bodyTop, 14);
    g.lineStyle(1.5, 0x0a0f0c, 1);
    g.strokeRoundedRect(cx - bodyW / 2, bodyTop, bodyW, bodyBot - bodyTop, 14);
    g.fillStyle(0x6b7a72, 0.3);
    g.fillRoundedRect(cx - bodyW / 2 + 3, bodyTop + 2, bodyW - 6, 4, 3);
    // type-basket opening
    g.fillStyle(0x0c0f0d, 1);
    g.fillRoundedRect(cx - bodyW * 0.24, bodyTop + 7, bodyW * 0.48, 16, 6);
    // fanned typebars
    g.lineStyle(1, 0x3c4a42, 0.8);
    for (let i = -6; i <= 6; i++) {
      g.lineBetween(cx + i * 4, bodyTop + 21, cx + i * 13, bodyTop + 8);
    }

    // brand plate — the whisper
    const plate = this.add.graphics().setDepth(1);
    const plW = bodyW * 0.42;
    const plY = bodyTop + (bodyBot - bodyTop) * 0.62;
    plate.fillGradientStyle(0x8a6f3a, 0x9a7f46, 0x54421e, 0x64502a, 1);
    plate.fillRoundedRect(cx - plW / 2, plY - 11, plW, 22, 4);
    plate.lineStyle(1, 0x3a2c10, 0.9);
    plate.strokeRoundedRect(cx - plW / 2, plY - 11, plW, 22, 4);
    this.add
      .text(cx, plY, "VELOX No.5 · always one step ahead", {
        fontFamily: "Georgia, serif",
        fontSize: Math.max(9, Math.round(plW * 0.052)) + "px",
        fontStyle: "italic",
        color: "#241a08",
      })
      .setOrigin(0.5)
      .setDepth(2);

    // machine shadow on the desk
    g.fillStyle(0x000000, 0.35);
    g.fillEllipse(cx, H * 0.87 + 10, bodyW * 1.05, 26);
  }

  // ── the keyboard: three QWERTY rows + space bar, all of them lying ─────────

  _buildKeys(W, H) {
    const { cx, bodyW, bodyBot } = this._mach;
    const kbTop = bodyBot + 10;
    const step = Math.min(bodyW / 10.4, 44);
    const r = step * 0.4;
    this._keys = {};

    const deck = this.add.graphics().setDepth(0);
    deck.fillGradientStyle(0x26302b, 0x2c3630, 0x0e1411, 0x121a15, 1);
    deck.fillRoundedRect(cx - bodyW / 2 + 10, kbTop - r - 8, bodyW - 20, r * 2 * 3 + step * 2.2, 12);
    deck.lineStyle(1, 0x0a0f0c, 1);
    deck.strokeRoundedRect(cx - bodyW / 2 + 10, kbTop - r - 8, bodyW - 20, r * 2 * 3 + step * 2.2, 12);

    TW_ROWS.forEach((row, ri) => {
      const y = kbTop + ri * step * 0.92;
      const rowW = (row.length - 1) * step;
      row.split("").forEach((ch, ci) => {
        const x = cx - rowW / 2 + ci * step;
        this._makeKey(ch, x, y, r);
      });
    });

    // space bar
    const sy = kbTop + 3 * step * 0.92;
    const sg = this.add.container(cx, sy).setDepth(3);
    const sgg = this.add.graphics();
    sgg.fillGradientStyle(0x3a3a40, 0x3a3a40, 0x17171b, 0x17171b, 1);
    sgg.fillRoundedRect(-step * 2.4, -r * 0.5, step * 4.8, r, r * 0.5);
    sgg.lineStyle(1.5, 0x6a6a72, 0.8);
    sgg.strokeRoundedRect(-step * 2.4, -r * 0.5, step * 4.8, r, r * 0.5);
    sg.add(sgg);
    const sz = this.add
      .zone(cx, sy, step * 5, r * 1.6)
      .setOrigin(0.5)
      .setDepth(4)
      .setInteractive({ cursor: "pointer" });
    sz.on("pointerdown", () => {
      this._dipKey(sg);
      this._type(" ");
    });

    this._spaceKey = sg;
  }

  _makeKey(ch, x, y, r) {
    const c = this.add.container(x, y).setDepth(3);
    const g = this.add.graphics();
    // chrome ring
    g.lineStyle(2.5, 0x8a8a92, 1);
    g.strokeCircle(0, 0, r);
    g.lineStyle(1, 0xd8d8de, 0.5);
    g.strokeCircle(0, -0.8, r - 1);
    // dark cap
    g.fillGradientStyle(0x32323a, 0x2c2c34, 0x101014, 0x141418, 1);
    g.fillCircle(0, 0, r - 2);
    g.fillStyle(0xffffff, 0.08);
    g.fillEllipse(-r * 0.25, -r * 0.35, r * 0.7, r * 0.4);
    c.add(g);
    const t = this.add
      .text(0, 0.5, ch, {
        fontFamily: "Georgia, serif",
        fontSize: Math.round(r * 0.9) + "px",
        color: "#e8e4d8",
      })
      .setOrigin(0.5);
    c.add(t);

    const zone = this.add
      .zone(x, y, r * 2.3, r * 2.3)
      .setOrigin(0.5)
      .setDepth(4)
      .setInteractive({ cursor: "pointer" });
    zone.on("pointerdown", () => {
      this._dipKey(c);
      this._type(ch);
    });

    this._keys[ch] = c;
  }

  _dipKey(container) {
    if (container._dipping) return;
    container._dipping = true;
    const y0 = container.y;
    container.y = y0 + 2.5;
    this.time.delayedCall(90, () => {
      container.y = y0;
      container._dipping = false;
    });
  }

  // ── the note ───────────────────────────────────────────────────────────────

  _buildNote(W, H) {
    const px = W * 0.83;
    const py = H * 0.62;
    const pw = Math.min(W * 0.17, 140);
    const ph = pw * 0.72;

    const p = this.add.container(px, py).setDepth(5).setAngle(4);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35);
    g.fillRect(-pw / 2 + 3, -ph / 2 + 4, pw, ph);
    g.fillGradientStyle(0xf0ead8, 0xece5d2, 0xd2cab2, 0xd9d1ba, 1);
    g.fillRect(-pw / 2, -ph / 2, pw, ph);
    g.lineStyle(1, 0x9a917c, 0.7);
    g.strokeRect(-pw / 2, -ph / 2, pw, ph);
    // typed smudge lines — the real thing opens on click
    g.fillStyle(0x2a2118, 0.7);
    g.fillRect(-pw * 0.36, -ph * 0.18, pw * 0.55, 3.5);
    g.fillRect(-pw * 0.36, ph * 0.04, pw * 0.68, 3.5);
    // coffee ring
    g.lineStyle(3, 0x8a6a3a, 0.25);
    g.strokeCircle(pw * 0.22, -ph * 0.2, pw * 0.16);
    p.add(g);

    p.setSize(pw, ph);
    p.setInteractive({ cursor: "pointer" });
    p.on("pointerdown", (ptr) => {
      if (ptr.event) ptr.event.stopPropagation();
      this._openOverlay();
    });

    // ── the note, up close ──
    const ov = this.add.container(0, 0).setDepth(60).setVisible(false);
    const dark = this.add
      .rectangle(0, 0, W, H, 0x05030a, 0.78)
      .setOrigin(0, 0)
      .setInteractive();
    dark.on("pointerdown", () => this._closeOverlay());
    ov.add(dark);

    const bw = Math.min(W * 0.56, 470);
    const bh = Math.min(H * 0.5, 340);
    const ox = W / 2 - bw / 2;
    const oy = H / 2 - bh / 2;
    const og = this.add.graphics();
    og.fillStyle(0x000000, 0.55);
    og.fillRoundedRect(ox + 10, oy + 12, bw, bh, 4);
    og.fillGradientStyle(0xf2ecda, 0xeee7d2, 0xd6cdb2, 0xdcd4ba, 1);
    og.fillRoundedRect(ox, oy, bw, bh, 4);
    og.lineStyle(1, 0x9a917c, 0.8);
    og.strokeRoundedRect(ox, oy, bw, bh, 4);
    // coffee ring, larger
    og.lineStyle(5, 0x8a6a3a, 0.2);
    og.strokeCircle(ox + bw * 0.78, oy + bh * 0.24, 38);
    og.lineStyle(2, 0x8a6a3a, 0.12);
    og.strokeCircle(ox + bw * 0.78, oy + bh * 0.24, 31);
    ov.add(og);

    const fs = Math.max(17, Math.round(bw * 0.048));
    ov.add(
      this.add
        .text(W / 2, oy + bh * 0.42, TW_NOTE.join("\n"), {
          fontFamily: '"Special Elite", monospace',
          fontSize: fs + "px",
          color: "#2a2118",
          align: "center",
          lineSpacing: 14,
          letterSpacing: 2,
        })
        .setOrigin(0.5),
    );
    ov.add(
      this.add
        .text(W / 2, oy + bh * 0.78, "typed on the Velox, trusted as written", {
          fontFamily: '"Special Elite", monospace',
          fontSize: Math.round(fs * 0.55) + "px",
          color: "#6b5f48",
        })
        .setOrigin(0.5)
        .setAlpha(0.8),
    );
    ov.add(
      this.add
        .text(W / 2, oy + bh - 18, "click anywhere to put it down", {
          fontFamily: '"Special Elite", monospace',
          fontSize: "12px",
          color: "#6b573a",
        })
        .setOrigin(0.5)
        .setAlpha(0.8),
    );

    this._overlay = ov;
  }

  _openOverlay() {
    if (this._overlayOpen) return;
    this._overlayOpen = true;
    if (window.playUIClick) window.playUIClick();
    this._overlay.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this._overlay, alpha: 1, duration: 220 });
  }

  _closeOverlay() {
    if (!this._overlayOpen) return;
    this.tweens.add({
      targets: this._overlay,
      alpha: 0,
      duration: 180,
      onComplete: () => {
        this._overlay.setVisible(false);
        this._overlayOpen = false;
      },
    });
  }

  _drawTexts(W, H) {
    this.statusText = this.add
      .text(W / 2, 40, "It still types. After a fashion.", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "20px",
        color: "#e8dcc0",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.subText = this.add
      .text(W / 2, 68, "click the keys — or just type", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "13px",
        color: "#a8905f",
      })
      .setOrigin(0.5)
      .setAlpha(0.85)
      .setDepth(20);

    this.levelText = this.add
      .text(W - 30, 28, "Level 12", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#e8dcc0",
      })
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: this.levelText, alpha: 1, duration: 2000 });
  }

  // ── sounds ─────────────────────────────────────────────────────────────────

  _ctx() {
    const ac = this.sound.context;
    if (!ac || (window.GameAudio && window.GameAudio.muted)) return null;
    return ac;
  }

  _vol(k) {
    return (window.GameAudio ? window.GameAudio.sfxVol : 0.8) * k;
  }

  // typebar strike — sharp mechanical clack (softer for the space bar)
  _clack(soft) {
    try {
      const ac = this._ctx();
      if (!ac) return;
      const t = ac.currentTime;
      const dur = 0.05;
      const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.2);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = soft ? 480 : 1900;
      bp.Q.value = 1.6;
      const g = ac.createGain();
      g.gain.value = this._vol(soft ? 0.3 : 0.45);
      src.connect(bp);
      bp.connect(g);
      g.connect(ac.destination);
      src.start(t);
      src.stop(t + dur);
    } catch (e) {}
  }

  // margin bell at the end of a line
  _bell() {
    try {
      const ac = this._ctx();
      if (!ac) return;
      const t = ac.currentTime;
      for (const [f, a, dur] of [[1568, 0.4, 0.8], [2093, 0.2, 0.5]]) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = "sine";
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(this._vol(a * 0.4), t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(ac.destination);
        o.start(t);
        o.stop(t + dur + 0.05);
      }
    } catch (e) {}
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    this._keys = {};
    this._spaceKey = null;
    this._paperText = null;
    this._overlay = null;
    this._mach = null;
    this._overlayOpen = false;
  }

  transitionToLevel(levelKey, skipFade = false) {
    if (skipFade) {
      this.scene.start(levelKey, { skipFade: true });
      return;
    }
    if (window.playSuccess) window.playSuccess(this);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const fadeOverlay = this.add
      .rectangle(0, 0, width, height, 0x000000)
      .setOrigin(0, 0)
      .setDepth(100)
      .setAlpha(0);

    const levelIndex = window.GAME_LEVELS.findIndex((l) => l.key === levelKey);
    const levelNumber = levelIndex !== -1 ? levelIndex + 1 : "?";

    const nextLvlText = this.add
      .text(width / 2, height / 2, "Level " + levelNumber + "...", {
        fontFamily: '"Special Elite", monospace',
        fontSize: "48px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setAlpha(0);

    this.tweens.add({
      targets: [fadeOverlay, nextLvlText],
      alpha: 1,
      duration: 1000,
      onComplete: () => {
        this.scene.start(levelKey, { skipFade: false });
      },
    });
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
