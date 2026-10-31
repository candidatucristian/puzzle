import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { makeCanvas, addCanvasTexture } from "../../shared/paint.js";
import { fitRender } from "../../shared/renderFit.js";
import { CALCULATOR_DIGITS, createCalculator, pressKey } from "./puzzle.js";
import { glyph } from "./segments.js";
import { createCalculatorView } from "./calculatorView.js";
import OFFICE from "./officeRender.json";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "OVERTIME"  ·  code: SOIL  ·  add up the hours
//
// A desk in Room II late at night, seen from the chair: walnut panelling, a
// botanical print, the green banker's lamp the only light. Four digital
// clocks, each a real kind of clock and each stopped on its own time (the
// colon blinks, the hours do not move): an LED clock on the wall, a clock
// radio on the shelf, an alarm clock and a folding travel clock on the desk.
// On the desk's leather lies a calculator that really works: digits, 00, +,
// = and C.
//
// Read each clock as a plain number and add them up on the calculator:
//
//   22:03 + 14:11 + 11:47 + 23:44  →  2203 + 1411 + 1147 + 2344  =  7105
//
// Turn the display upside down and 7105 reads SOIL. The game never says so:
// no legend, no arrow, no turning the calculator for you.
//
// The office is a Blender render (art/blender/overtime_office.py), its clock
// faces made from OVERTIME_CLOCKS; Blender also wrote where every key's cap,
// the display, each colon and the coffee fell in the picture
// (officeRender.json). Live over it: the display's figures, the key presses,
// the colons (cut lit from a second render) and the steam. The calculator's
// state survives a resize and starts fresh on replay.
// ─────────────────────────────────────────────────────────────────────────────

const LCD_INK = 0x1f2a1a; // the calculator's dark digits
const PLATE = `ot_office_v${OFFICE.version}`;
const COLONS = `ot_colons_v${OFFICE.version}`;
const PUFF = "ot_puff";

export default class OvertimeScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Overtime" });
  }

  init(data) {
    this.skipFadeIn =
      data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    const url = (what) => `assets/images/Overtime/office-${what}-v${OFFICE.version}.webp`;
    if (!this.textures.exists(PLATE)) this.load.image(PLATE, url("plate"));
    if (!this.textures.exists(COLONS)) this.load.image(COLONS, url("colons"));
  }

  create() {
    this.beginScene();
    this.cameras.main.setBackgroundColor("#040303");
    if (this.textures.exists(COLONS)) {
      const atlas = this.textures.get(COLONS);
      for (const c of OFFICE.colons) if (!atlas.has(`colon-${c.clock}`)) atlas.add(`colon-${c.clock}`, 0, ...c.frame);
    }
    if (!this.textures.exists(PUFF)) addCanvasTexture(this.textures, PUFF, puffCanvas());

    // a fresh visit: nothing typed yet. A resize redraws from this same state.
    this.calc = createCalculator();
    this._calculatorView = createCalculatorView(this, OvertimeScene.KEYPAD);
    this._build(this.cameras.main.width, this.cameras.main.height);

    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });

    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // Where every key sits on the keypad: column, row, and how many of each it
  // spans. "+" is the tall one, "0" the wide one, as on an adding machine
  // (overtime_office.py builds the calculator from the same table).
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
    this._movableSparkleCleanups = [];
    const f = fitRender(W, H, OFFICE);
    if (this.textures.exists(PLATE)) {
      this.add.image(f.x, f.y, PLATE).setOrigin(0, 0)
        .setDisplaySize(OFFICE.width * f.s, OFFICE.height * f.s).setDepth(0);
    }

    this._lcdBox = displayOnScreen(OFFICE.lcd, f);
    this._lcd = this.add.graphics().setDepth(2);
    this._drawLcd();

    this._keys = {};
    for (const spec of OvertimeScene.KEYPAD) {
      const k = OFFICE.keys[spec.key];
      this._makeKey(spec.key, { quad: k.quad.map(f.at), center: f.at(k.center) });
    }
    this._makeCalculatorTarget();

    this._startColons(f);
    this._startSteam(f);
  }

  // A key is in the render; what lives here is its hit area (the cap's own
  // outline, in perspective), a hover sheen and the dip of a press.
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
    zone.on("pointerdown", (pointer) => {
      if (!pointer.wasTouch) this._press(key);
    });
    this._openOnTap(zone);
    zone.on("pointerover", () => hover.setAlpha(1));
    zone.on("pointerout", () => hover.setAlpha(0));
    this._keys[key] = { zone, flash, hover, quad: k.quad, x: k.center.x, y: k.center.y };
  }

  _makeCalculatorTarget() {
    const L = this._lcdBox;
    const points = Object.values(this._keys).flatMap(key => key.quad);
    points.push(L.map(L.u0, L.v1), L.map(L.u1, L.v1));
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const left = Math.min(...xs), right = Math.max(...xs);
    const top = Math.min(...ys), bottom = Math.max(...ys);
    this._calculatorTarget = this.add
      .zone((left + right) / 2, (top + bottom) / 2, Math.max(64, right - left + 16), Math.max(64, bottom - top + 20))
      .setDepth(9)
      .setInteractive({ useHandCursor: true })
      .setData('interactionLabel', 'Use calculator');
    this._movableSparkleCleanups.push(attachMovableSparkles(this, this._calculatorTarget, {
      bounds: () => this._calculatorTarget.getBounds(),
      enabled: () => !this.isSolved,
      padding: 5,
    }));
    this._openOnTap(this._calculatorTarget);
  }

  // A finger that comes down on the calculator and lifts again opens the
  // larger keypad. A mouse presses the keys themselves, and a lift that began
  // elsewhere — a click or a tap on a dialog lying over the calculator, which
  // the game still hears — opens nothing (it used to open the keypad behind
  // the hints dialog, where it caught every click on Close).
  _openOnTap(target) {
    let down = null;
    target.on("pointerdown", (pointer) => {
      down = pointer.wasTouch ? pointer.id : null;
    });
    target.on("pointerout", () => {
      down = null;
    });
    target.on("pointerup", (pointer) => {
      const tapped = pointer.wasTouch && down === pointer.id;
      down = null;
      if (tapped) this._calculatorView.open();
    });
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
    this._calculatorView?.render(this.calc.display);
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

  // the colons blink, the hours never move; the clocks are not in step. The
  // render has every colon dark; each lit one is laid over it, cut from a
  // render with them all lit.
  _startColons(f) {
    if (!this.textures.exists(COLONS)) return;
    const lit = OFFICE.colons.map((c) => {
      const at = f.at([c.box[0], c.box[1]]);
      return this.add.image(at.x, at.y, COLONS, `colon-${c.clock}`).setOrigin(0, 0)
        .setDisplaySize(c.box[2] * f.s, c.box[3] * f.s).setDepth(1);
    });
    let tick = 0;
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        tick++;
        lit.forEach((img, i) => img.setVisible(!this.ambientMotion || (tick + i) % 2 === 0));
      },
    });
  }

  // slow puffs of steam off the coffee, rising, spreading and fading
  _startSteam(f) {
    const [sx, sy, cm] = OFFICE.steam;
    const { x, y } = f.at([sx, sy]);
    const k = cm * f.s;
    const rnd = this._rng(8117);
    for (let i = 0; i < 5; i++) {
      const size = k * (2.2 + rnd() * 1.2);
      const dur = 4200 + rnd() * 2200;
      const puff = this.add
        .image(x + (rnd() - 0.5) * k * 1.6, y, PUFF)
        .setDepth(1)
        .setAlpha(0);
      puff.setDisplaySize(size, size);
      this.ambientObject(puff);
      this.ambientTween({
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

  // ── lifecycle ──────────────────────────────────────────────────────────────

  // a resize: everything is laid again from scratch, the calculator's state
  // stays. Objects are destroyed, not just detached — a detached zone would
  // go on catching clicks where a key used to be.
  _teardown() {
    this._movableSparkleCleanups?.forEach(cleanup => cleanup());
    this._movableSparkleCleanups = [];
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    this._keys = {};
    this._lcd = null;
  }

  shutdown() {
    this._movableSparkleCleanups?.forEach(cleanup => cleanup());
    this._movableSparkleCleanups = [];
    this._calculatorView?.destroy();
    this._calculatorView = null;
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}

// The calculator's display on the screen: its band of glass is `w` × `h` cm
// (u across, v up it, toward the far end); `corners` are where Blender saw
// it, near left first. A point of it is found between its four corners.
function displayOnScreen(lcd, f) {
  const [nl, nr, fr, fl] = lcd.corners.map(f.at);
  const map = (u, v) => {
    const s = u / lcd.w, t = v / lcd.h;
    return {
      x: nl.x * (1 - s) * (1 - t) + nr.x * s * (1 - t) + fr.x * s * t + fl.x * (1 - s) * t,
      y: nl.y * (1 - s) * (1 - t) + nr.y * s * (1 - t) + fr.y * s * t + fl.y * (1 - s) * t,
    };
  };
  return { u0: 0, u1: lcd.w, v0: 0, v1: lcd.h, map };
}

// a soft round puff of steam
function puffCanvas() {
  const c = makeCanvas(64, 64);
  const g = c.getContext("2d");
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(225,220,210,0.55)");
  r.addColorStop(0.5, "rgba(225,220,210,0.2)");
  r.addColorStop(1, "rgba(225,220,210,0)");
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return c;
}
