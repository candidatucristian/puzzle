import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { drawLevelLabel } from "../../shared/levelLabel.js";
import { paintCity, releaseCityArt } from "./City.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "PI"  ·  code: PI   ·  count the windows
//
// A river city asleep under the moon: a hazy skyline, dark towers, a
// suspension bridge, a little boat drifting through — and ONE building whose
// lights are still on. Floor by floor, top to bottom, the number of lit
// windows is:
//
//   3 · 1 · 4 · 1 · 5 · 9 · 2 · 6 · 5
//
// The lit windows sit at random positions on each floor (seeded), so the
// building just looks awake — until someone counts. Click a lit window and
// its light moves to another window on the same floor: the count never
// changes. Hover the moon and a line is drawn straight across it. Nothing on
// screen explains anything; the access code is the name of the number:  PI
//
// The warm window light is the scene's only living colour, like the candle
// and the router LEDs elsewhere in the game.
//
// The city is painted once per screen size (city.js); the lit windows, their
// light on the water, the twinkling stars, the boat and the moon's line are
// live. Lifecycle provided by BasePuzzleScene.
// ─────────────────────────────────────────────────────────────────────────────

const PI_DIGITS = [3, 1, 4, 1, 5, 9, 2, 6, 5]; // floors, top to bottom
const PI_COLS = 10; // windows per floor

export default class PiScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Pi" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();
    this._moonPinned = false;

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
    this._winState = [];
    this._secantGraphics = null;
    this._moonHitArea = null;
    this._secantTween = null;

    const art = paintCity(this, W, H, PI_DIGITS.length, PI_COLS);
    this._art = art;
    this.add.image(0, 0, art.city).setOrigin(0, 0).setDepth(-16);

    this._makeStars(W, H, art);
    this._makeMoon(art.moon);
    this._makeWindows(art);
    this._makeBoat(W, art);
    this._drawTexts(W, H);
  }

  // a scatter of stars, breathing at their own pace — only in open sky
  _makeStars(W, H, art) {
    const rnd = this._rng(7551);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W;
      const y = rnd() * H * 0.45;
      const r = 0.6 + rnd() * 1;
      const star = this.add
        .image(x, y, art.star)
        .setDisplaySize(r * 7, r * 7)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.12 + rnd() * 0.25)
        .setDepth(-15);
      const open =
        art.skyAt(x, y) &&
        Math.hypot(x - art.moon.x, y - art.moon.y) > art.moon.r * 2.4;
      if (!open) star.setVisible(false);
      this.ambientTween({
        targets: star,
        alpha: 0.55 + rnd() * 0.3,
        duration: 1400 + rnd() * 2600,
        delay: rnd() * 2000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  THE LINE ACROSS THE MOON, ON HOVER
  //  Mouse hover draws the line until the pointer leaves. A touch pins it
  //  until the next tap, so a finger never has to cover the clue to see it.
  // ═══════════════════════════════════════════════════════════════════════════
  _makeMoon({ x: mx, y: my, r }) {
    this._secantGraphics = this.add.graphics().setDepth(-13);
    this._secantGraphics.setVisible(false);

    // invisible hit area (the halo included)
    this._moonHitArea = this.add
      .circle(mx, my, r * 2.2, 0xffffff, 0.001)
      .setDepth(-12);
    this._moonHitArea.setInteractive({ useHandCursor: true });

    const show = () => {
      if (this._secantTween && this._secantTween.isPlaying()) return;

      this._secantGraphics.setVisible(true);
      this._secantGraphics.setAlpha(1);

      const proxy = { t: 0 };
      this._secantTween = this.tweens.add({
        targets: proxy,
        t: 1,
        duration: 900,
        repeat: 0,
        ease: "Linear",
        onUpdate: () => {
          const g = this._secantGraphics;
          if (!g) return;
          g.clear();
          const x0 = mx - r;
          const x1 = mx - r + 2 * r * proxy.t; // never past mx + r
          // a fine line of light, with a faint glow round it
          g.lineStyle(Math.max(3, r * 0.1), 0xdfe8ff, 0.16).lineBetween(
            x0,
            my,
            x1,
            my,
          );
          g.lineStyle(Math.max(1.2, r * 0.03), 0xf6f8ff, 0.85).lineBetween(
            x0,
            my,
            x1,
            my,
          );
          g.fillStyle(0xf6f8ff, 0.9).fillCircle(
            x0,
            my,
            Math.max(1.6, r * 0.045),
          );
          g.fillCircle(x1, my, Math.max(1.6, r * 0.045));
        },
      });
    };

    const hide = () => {
      if (this._secantTween) {
        this._secantTween.stop();
        this._secantTween = null;
      }
      if (this._secantGraphics) {
        this._secantGraphics.clear();
        this._secantGraphics.setVisible(false);
      }
    };
    this._moonHitArea.on("pointerover", (pointer) => {
      if (!pointer.wasTouch && !this._moonPinned) show();
    });
    this._moonHitArea.on("pointerout", () => {
      if (!this._moonPinned) hide();
    });
    this._moonHitArea.on("pointerdown", (pointer) => {
      if (!pointer.wasTouch) return;
      this._moonPinned = !this._moonPinned;
      if (this._moonPinned) show(); else hide();
    });
    if (this._moonPinned) show();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  THE WINDOWS — click a lit one and its light moves along the floor
  // ═══════════════════════════════════════════════════════════════════════════
  _makeWindows(art) {
    const rndPick = this._rng(2718);
    art.windows.forEach((row, f) => {
      this._winState[f] = [];
      // choose which windows burn tonight — seeded, scattered
      const litSet = new Set();
      while (litSet.size < PI_DIGITS[f])
        litSet.add(Math.floor(rndPick() * PI_COLS));

      row.forEach((w, c) => {
        // the light it throws on the wall round it
        const glow = this.add
          .image(w.x, w.y, art.glow)
          .setDisplaySize(w.w * 3.6, w.w * 3.6)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(-9)
          .setVisible(false);
        // the room behind the glass
        const pane = this.add
          .image(w.x, w.y, w.key)
          .setDisplaySize(w.w, w.h)
          .setDepth(-8)
          .setVisible(false);
        pane.on("pointerdown", () => this._onLitWindowClick(f, c));
        // and its light on the river
        const streak = w.streak
          ? this.add
              .image(w.streak.x, w.streak.y, art.streak)
              .setOrigin(0.5, 0)
              .setDisplaySize(w.w * 0.9, w.h * 3.4)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setDepth(-6)
              .setVisible(false)
          : null;
        this._winState[f][c] = { lit: false, pane, glow, streak, fx: null };
        if (litSet.has(c)) this._setWindowLit(f, c, true, rndPick);
      });
    });
  }

  _onLitWindowClick(floor, col) {
    const row = this._winState[floor];
    if (!row || !row[col] || !row[col].lit) return;

    // every dark window on the same floor
    const unlitCols = [];
    for (let c = 0; c < PI_COLS; c++) {
      if (!row[c].lit) unlitCols.push(c);
    }
    if (unlitCols.length === 0) return;

    // one of them, at random
    const targetCol = unlitCols[Math.floor(Math.random() * unlitCols.length)];

    // this one goes dark, that one lights up
    this._setWindowLit(floor, col, false);
    this._setWindowLit(floor, targetCol, true);

    this.services.audio.playClick(this);
  }

  _setWindowLit(floor, col, lit, rnd = null) {
    const win = this._winState[floor][col];
    if (!win || win.lit === lit) return;

    if (lit) {
      const r = rnd || this._rng(Date.now() + floor * 137 + col * 53);
      const a = 0.86 + r() * 0.14;
      // a room's light is never quite steady: it breathes, slowly
      const fx = { v: a };
      const show = () => {
        win.pane.setAlpha(fx.v);
        win.glow.setAlpha(fx.v * 0.5);
        if (win.streak) win.streak.setAlpha(fx.v * 0.55);
      };
      win.pane.setVisible(true);
      win.glow.setVisible(true);
      if (win.streak) win.streak.setVisible(true);
      show();
      win.pane.setInteractive({ useHandCursor: true });
      this.ambientTween({
        targets: fx,
        v: a - 0.12,
        duration: 2200 + r() * 2600,
        delay: r() * 1800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
        onUpdate: show,
      });
      if (win.streak) {
        this.ambientTween({
          targets: win.streak,
          scaleX: win.streak.scaleX * 1.35,
          duration: 900 + r() * 700,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }
      win.fx = fx;
      win.lit = true;
    } else {
      if (win.fx) this.tweens.killTweensOf(win.fx);
      win.fx = null;
      win.pane.setVisible(false);
      win.pane.disableInteractive();
      win.glow.setVisible(false);
      if (win.streak) {
        this.tweens.killTweensOf(win.streak);
        win.streak
          .setVisible(false)
          .setDisplaySize(
            win.pane.displayWidth * 0.9,
            win.pane.displayHeight * 3.4,
          );
      }
      win.lit = false;
    }
  }

  // a little boat, drifting slowly downriver all night, its reflection under it
  _makeBoat(W, art) {
    const b = art.boat;
    const cont = this.add.container(W * 1.06, b.y).setDepth(-5);
    const hull = this.add.image(0, 0, b.key).setOrigin(b.originX, 1);
    const mirror = this.add
      .image(0, 0, b.key)
      .setOrigin(b.originX, 0)
      .setFlipY(true)
      .setScale(1, 0.8)
      .setAlpha(0.25);
    cont.add([mirror, hull]);

    // the long, slow crossing — then it comes back around
    this.tweens.add({
      targets: cont,
      x: -W * 0.08,
      duration: 75000,
      repeat: -1,
      onRepeat: () => {
        cont.x = W * 1.06;
      },
    });
    // a gentle bob
    this.tweens.add({
      targets: cont,
      y: cont.y - 2.5,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  _drawTexts(W, H) {
    this.levelText = drawLevelLabel(this, W, H);
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    if (this._secantTween) {
      this._secantTween.stop();
      this._secantTween = null;
    }
    this.tweens.killAll();
    this.time.removeAllEvents();
    // destroy rather than just detach: removeAll(true) only took objects off
    // the display list, and the old windows and the moon went on catching
    // clicks and hovers after a resize
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseCityArt(this.textures);
    this._winState = [];
    this._secantGraphics = null;
    this._moonHitArea = null;
  }

  shutdown() {
    if (this._secantTween) {
      this._secantTween.stop();
      this._secantTween = null;
    }
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseCityArt(this.textures);
  }
}
