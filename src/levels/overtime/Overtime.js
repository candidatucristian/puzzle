import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { CALCULATOR_DIGITS, createCalculator, pressKey } from "./puzzle.js";
import { paintOffice, releaseOfficeArt, glyph } from "./office.js";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "OVERTIME"  ·  code: SOIL  ·  add up the hours
//
// A small office late at night, seen from the chair: a desk against the wall,
// one desk lamp for light, a window onto the city. Four digital clocks, each
// a real kind of clock and each stopped on its own time (the colon blinks,
// the hours do not move): an LED clock on the wall, a clock radio on the
// shelf, an alarm clock and a folding travel clock on the desk. In the lamp's
// pool lies a desk calculator that really works: digits, 00, +, = and C.
//
// Read each clock as a plain number and add them up on the calculator:
//
//   22:03 + 14:11 + 11:47 + 23:44  →  2203 + 1411 + 1147 + 2344  =  7105
//
// Turn the display upside down and 7105 reads SOIL. The game never says so:
// no legend, no arrow, no turning the calculator for you.
//
// The room is painted once per screen size (office.js); only the display,
// the key presses, the colons and the steam are drawn live. The calculator's
// state survives a resize and starts fresh on replay.
// ─────────────────────────────────────────────────────────────────────────────

const LCD_INK = 0x1f2a1a; // the calculator's dark digits

export default class OvertimeScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Overtime" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  create() {
    this.beginScene();

    // a fresh visit: nothing typed yet. A resize redraws from this same state.
    this.calc = createCalculator();
    this._build(this.cameras.main.width, this.cameras.main.height);

    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // Where every key sits on the keypad: column, row, and how many of each it
  // spans. "+" is the tall one, "0" the wide one, as on an adding machine.
  static get KEYPAD() {
    return [
      { key: "7", c: 0, r: 0 },
      { key: "8", c: 1, r: 0 },
      { key: "9", c: 2, r: 0 },
      { key: "C", c: 3, r: 0 },
      { key: "4", c: 0, r: 1 },
      { key: "5", c: 1, r: 1 },
      { key: "6", c: 2, r: 1 },
      { key: "+", c: 3, r: 1, rs: 2 },
      { key: "1", c: 0, r: 2 },
      { key: "2", c: 1, r: 2 },
      { key: "3", c: 2, r: 2 },
      { key: "0", c: 0, r: 3, cs: 2 },
      { key: "00", c: 2, r: 3 },
      { key: "=", c: 3, r: 3 },
    ];
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._W = W;
    this._H = H;
    const art = paintOffice(this, W, H, OvertimeScene.KEYPAD);
    this.add.image(0, 0, art.room).setOrigin(0, 0).setDepth(0);

    this._lcdBox = art.calc.lcd;
    this._lcd = this.add.graphics().setDepth(2);
    this._drawLcd();

    this._keys = {};
    for (const spec of OvertimeScene.KEYPAD)
      this._makeKey(spec.key, art.calc.keys[spec.key]);

    this._startColons(art.colons);
    this._startSteam(art);
    this._drawTexts(W);
  }

  // A key is painted into the room; what lives here is its hit area (the
  // cap's own outline, in perspective), a hover sheen and the dip of a press.
  _makeKey(key, k) {
    const cap = (color, alpha) => {
      const g = this.add.graphics().setDepth(3).setAlpha(0);
      g.fillStyle(color, alpha);
      g.fillPoints(k.quad, true);
      return g;
    };
    const hover = cap(0xffffff, 0.08);
    const flash = cap(0x000000, 0.4);
    const xs = k.quad.map((p) => p.x);
    const ys = k.quad.map((p) => p.y);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    const zone = this.add
      .zone(x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0)
      .setOrigin(0, 0)
      .setDepth(10);
    zone.setInteractive({
      hitArea: new Phaser.Geom.Polygon(
        k.quad.map((p) => ({ x: p.x - x0, y: p.y - y0 })),
      ),
      hitAreaCallback: Phaser.Geom.Polygon.Contains,
      useHandCursor: true,
    });
    zone.on("pointerdown", () => this._press(key));
    zone.on("pointerover", () => hover.setAlpha(1));
    zone.on("pointerout", () => hover.setAlpha(0));
    this._keys[key] = { zone, flash, hover, x: k.center.x, y: k.center.y };
  }

  _press(key) {
    this.calc = pressKey(this.calc, key);
    this.services.audio.playClick(this);
    this._drawLcd();
    const k = this._keys[key];
    if (k) {
      this.tweens.killTweensOf(k.flash);
      k.flash.setAlpha(1);
      this.tweens.add({
        targets: k.flash,
        alpha: 0,
        delay: 60,
        duration: 220,
        ease: "Sine.easeOut",
      });
    }
  }

  // the display: eight digits, right-aligned, drawn onto the sloping glass,
  // the unlit segments faintly there as on any LCD
  _drawLcd() {
    if (!this._lcd || !this._lcdBox) return;
    const L = this._lcdBox;
    const g = this._lcd;
    g.clear();
    const cell = (L.u1 - L.u0) / CALCULATOR_DIGITS;
    const dh = L.v1 - L.v0;
    const dw = Math.min(cell * 0.72, dh * 0.52);
    const t = dh * 0.12;
    const text = this.calc.display.padStart(CALCULATOR_DIGITS, " ");
    const onGlass = (poly, du = 0, dv = 0) =>
      poly.map(([u, v]) => L.map(u + du, v + dv));
    for (let i = 0; i < CALCULATOR_DIGITS; i++) {
      const x = L.u0 + i * cell + (cell - dw) / 2;
      const { on, off } = glyph(
        text[i] === " " ? "" : text[i],
        x,
        L.v0,
        dw,
        dh,
        t,
        0.08,
      );
      g.fillStyle(LCD_INK, 0.07);
      for (const p of off) g.fillPoints(onGlass(p), true);
      // lit segments cast a faint shadow on the glass behind them
      g.fillStyle(LCD_INK, 0.16);
      for (const p of on) g.fillPoints(onGlass(p, 0.06, -0.08), true);
      g.fillStyle(LCD_INK, 0.9);
      for (const p of on) g.fillPoints(onGlass(p), true);
    }
  }

  // where a key is on the canvas — used by the tests to press it like a player
  keyCenter(key) {
    const k = this._keys?.[key];
    return k ? { x: k.x, y: k.y } : null;
  }

  // the colons blink, the hours never move; the clocks are not in step
  _startColons(colons) {
    const lit = colons.map((c) =>
      this.add.image(c.x, c.y, c.key).setOrigin(0, 0).setDepth(1),
    );
    let tick = 0;
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        tick++;
        lit.forEach((img, i) => img.setVisible((tick + i) % 2 === 0));
      },
    });
  }

  // slow puffs of steam off the coffee, rising, spreading and fading
  _startSteam(art) {
    const { x, y, k } = art.steam;
    const rnd = this._rng(8117);
    for (let i = 0; i < 5; i++) {
      const size = k * (2.2 + rnd() * 1.2);
      const dur = 4200 + rnd() * 2200;
      const puff = this.add
        .image(x + (rnd() - 0.5) * k * 1.6, y, art.puff)
        .setDepth(1)
        .setAlpha(0);
      puff.setDisplaySize(size, size);
      this.tweens.add({
        targets: puff,
        y: y - k * (9 + rnd() * 4),
        x: puff.x + (rnd() - 0.5) * k * 4,
        displayWidth: size * 2.6,
        displayHeight: size * 2.6,
        duration: dur,
        delay: (i * dur) / 5,
        repeat: -1,
        onUpdate: (tw) => puff.setAlpha(Math.sin(Math.PI * tw.progress) * 0.32),
      });
    }
  }

  // ── on top of everything ───────────────────────────────────────────────────

  _drawTexts(W) {
    const levelNumber =
      this.services.levels.definitions.findIndex(
        (l) => l.key === this.scene.key,
      ) + 1;
    const levelText = this.add
      .text(W - 30, 28, "Level " + levelNumber, {
        fontFamily: '"Special Elite", monospace',
        fontSize: "28px",
        color: "#e8dcc0",
      })
      .setOrigin(1, 0)
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: levelText, alpha: 1, duration: 2000 });
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  // a resize: everything is drawn again from scratch, the calculator's state
  // stays. Objects are destroyed, not just detached — a detached zone would
  // go on catching clicks where a key used to be.
  _teardown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    releaseOfficeArt(this.textures);
    this._keys = {};
    this._lcd = null;
  }

  shutdown() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    releaseOfficeArt(this.textures);
  }
}
