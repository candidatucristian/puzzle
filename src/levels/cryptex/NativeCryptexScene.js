import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import Candles from "./Candle.js";
import { CRYPTEX_ALPHA } from "./puzzle.js";
import native from "./nativeCryptex.json";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { paperLetter } from "../../shared/paperLetter.js";

const PATH = "assets/images/Cryptex/native-v1";
const key = (name) => `cx_native_v1_${name}`;
const STEP = 360 / CRYPTEX_ALPHA.length;

// Every visible surface and letter comes from the original Blender scene.
// Eight photographs preserve the actual light from each separate candle.
export default class NativeCryptexScene extends BasePuzzleScene {
  constructor() { super({ key: "Cryptex" }); }

  init(data) { this.skipFadeIn = data?.skipFade ?? true; }

  get usesEscape() { return Boolean(this._overlayOpen); }

  preload() {
    for (const name of [...Array.from({ length: 8 }, (_, i) => `candles-${i}`), "outer-lume", "rotor", "letter-open"]) {
      if (!this.textures.exists(key(name))) this.load.image(key(name), `${PATH}/${name}.webp`);
    }
    if (!this.textures.exists(key("flames"))) {
      this.load.spritesheet(key("flames"), `${PATH}/flames.png`, { frameWidth: 72, frameHeight: 160 });
    }
  }

  create() {
    this.beginScene();
    const closeLetter = event => {
      if (!this._overlayOpen) return;
      event.preventDefault(); event.stopPropagation(); this._letter?.close();
    };
    this.input.keyboard.on('keydown-ESC', closeLetter);
    this._sceneCleanups.add(() => this.input.keyboard.off('keydown-ESC', closeLetter));
    this.input.mouse.disableContextMenu();
    this.isSolved = false;
    this._wheelAngle = 0;
    this._lastTick = 0;
    this._lettersShown = false;
    this._letterRead = false; // opened once this visit: it stops sparkling
    this._reveal = { value: 0 };
    this._overlayOpen = false;
    this._draggingWheel = false;
    this.candle = new Candles(this, {
      isBlocked: () => this._overlayOpen || this.isSolved,
      onExtinguished: () => this._revealLetters(),
      flameTexture: key("flames"),
    });
    this._build(this.cameras.main.width, this.cameras.main.height);

    this.input.on("pointerdown", (p) => {
      if (this._overlayOpen || !this._wheel) return;
      const { cx, cy, R } = this._wheel;
      if (Phaser.Math.Distance.Between(p.x, p.y, cx, cy) > R * .78) return;
      if (!this._lettersShown || this._sweeping) {
        this.services.audio.playClick(this);
        return;
      }
      if (this._turnProxy) this.tweens.killTweensOf(this._turnProxy);
      this._draggingWheel = true;
      this._lastPointerDeg = Phaser.Math.RadToDeg(Math.atan2(p.y - cy, p.x - cx));
    });
    this.input.on("pointermove", (p) => {
      if (!this._draggingWheel || !p.isDown || !this._wheel) return;
      const deg = Phaser.Math.RadToDeg(Math.atan2(p.y - this._wheel.cy, p.x - this._wheel.cx));
      this._setWheelAngle(this._wheelAngle + Phaser.Math.Angle.ShortestBetween(this._lastPointerDeg, deg));
      this._lastPointerDeg = deg;
    });
    const release = () => {
      if (!this._draggingWheel) return;
      this._draggingWheel = false;
      this._turnTo(Math.round(this._wheelAngle / STEP) * STEP);
    };
    this.input.on("pointerup", release);
    this.input.on("pointerupoutside", release);
    this.input.on("wheel", (p, objects, dx, dy) => {
      if (this._overlayOpen || !this._lettersShown || this._sweeping || !this._wheel || !dy) return;
      const { cx, cy, R } = this._wheel;
      if (Phaser.Math.Distance.Between(p.x, p.y, cx, cy) > R * 1.1) return;
      this._turnTo((Math.round(this._wheelAngle / STEP) + (dy > 0 ? 1 : -1)) * STEP);
    });
    this.listenToResize(({ width, height }) => {
      this._teardown();
      this._build(width, height);
    });
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  _build(W, H) {
    const s = Math.max(W / native.width, H / native.height);
    const bottom = Math.max(
      ...native.envelope.map((p) => p[1]),
      ...native.candles.map((c) => c.wick[1] + c.height * c.scale),
    );
    const x = (W - native.width * s) / 2;
    const y = Math.max(H - native.height * s, Math.min((H - native.height * s) / 2, H - 10 - bottom * s));
    const at = ([px, py]) => ({ x: x + px * s, y: y + py * s });
    const picture = (name, depth) => this.add.image(x, y, key(name)).setOrigin(0).setScale(s).setDepth(depth);
    this._plates = Array.from({ length: 8 }, (_, mask) => picture(`candles-${mask}`, -20 + mask * .01));
    this._outerLume = picture("outer-lume", -10).setAlpha(this._lettersShown ? 1 : 0);
    const centre = at(native.wheel.centre);
    this._frame = { x, y, s, centre };
    this._wheel = { cx: centre.x, cy: centre.y, R: native.wheel.radius * s };
    const [left, top, width, height] = native.wheel.crop;
    this._disk = this.add.image(centre.x, centre.y, key("rotor"))
      .setOrigin((native.wheel.centre[0] - left) / width, (native.wheel.centre[1] - top) / height)
      .setScale(s).setAngle(this._wheelAngle).setAlpha(this._lettersShown ? 1 : 0).setDepth(2);
    const R = this._wheel.R;
    this._wheelZone = this.add.zone(centre.x, centre.y, R * 2, R * 2).setDepth(6)
      .setInteractive({ hitArea: new Phaser.Geom.Circle(R, R, R), hitAreaCallback: Phaser.Geom.Circle.Contains, cursor: "grab" })
      .setData("interactionLabel", "Turn the brass cipher wheel");
    const candles = native.candles.map((c) => ({
      wick: at(c.wick), scale: c.scale * s, height: c.height, radius: c.radius,
    }));
    this.candle.build(candles);
    const quad = native.envelope.map(at);
    const xs = quad.map((p) => p.x), ys = quad.map((p) => p.y);
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    const zone = this.add.zone(x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0).setOrigin(0).setDepth(8);
    zone.setInteractive({
      hitArea: new Phaser.Geom.Polygon(quad.map((p) => ({ x: p.x - x0, y: p.y - y0 }))),
      hitAreaCallback: Phaser.Geom.Polygon.Contains, cursor: "pointer",
    }).setData("interactionLabel", "Open the sealed letter");
    zone.on("pointerdown", () => this._letter.open());
    this._envelope = { x: (x0 + Math.max(...xs)) / 2, y: (y0 + Math.max(...ys)) / 2, width: Math.max(...xs) - x0 };
    // the sealed letter sparkles, as the things to open in the rooms do, until
    // it has been opened (or the puzzle is solved)
    const envelopeBox = { x: x0, y: y0, width: Math.max(...xs) - x0, height: Math.max(...ys) - y0 };
    const levels = this.services.levels;
    this._letterSparkles = attachMovableSparkles(this, zone, {
      padding: 3, bounds: () => envelopeBox,
      enabled: () => !this._letterRead && !this._overlayOpen && !levels.isCompleted(levels.currentIndex),
    });
    this._buildLetter(W, H);
    if (this.candle.allOut) this._lettersShown = true;
    if (this._lettersShown) this._reveal.value = 1;
    this._refreshLight();
  }

  // The letter, opened: the one every puzzle's letter is (shared/paperLetter.js,
  // art/blender/puzzle_letter.py). It comes up out of the envelope on the ledge.
  _buildLetter(W, H) {
    this._letter = paperLetter(this, {
      texture: key("letter-open"), width: W, height: H, from: this._envelope,
      onOpen: () => {
        this._overlayOpen = true;
        this._letterRead = true;
        this._draggingWheel = false;
        this._letterButtons(false);
      },
      onClosed: () => {
        this._overlayOpen = false;
        this._letterButtons(true);
      },
    });
  }

  _letterButtons(enabled) {
    for (const f of this.candle.flames) {
      const button = f.dom?.querySelector("button");
      if (button) button.style.pointerEvents = enabled ? "" : "none";
    }
  }

  _revealLetters() {
    if (this._lettersShown) return;
    this._lettersShown = true;
    if (this.reducedMotion) {
      this.tweens.add({ targets: this._reveal, value: 1, duration: 1300, ease: "Sine.easeInOut" });
      return;
    }
    this._sweepLetters();
  }

  // The luminous letters light up one by one, clockwise from the A at the top:
  // first the fixed ring, then the inner disc. Each letter is its own slice of
  // the lit photographs (outer-lume, rotor), cut out by a mask over its place
  // on the ring; the photographs differ from the dark ones only in the
  // letters, so the slices' edges never show. When the last one is lit, the
  // whole photographs take over and the slices go.
  _sweepLetters() {
    const { x, y, s, centre } = this._frame;
    const rotorOrigin = { x: this._disk.originX * this._disk.width, y: this._disk.originY * this._disk.height };
    const pieces = this._sweepPieces = [];
    const STAGGER = 40, FADE = 480, INNER = 560;
    const ring = (name, depth, inner, outer, start, place, toTexture) => {
      for (let i = 0; i < CRYPTEX_ALPHA.length; i++) {
        const a0 = Phaser.Math.DegToRad(-90 + (i - .5) * STEP), a1 = Phaser.Math.DegToRad(-90 + (i + .5) * STEP);
        const points = [];
        for (let k = 0; k <= 8; k++) {
          const a = a0 + (a1 - a0) * k / 8;
          points.push(new Phaser.Math.Vector2(centre.x + Math.cos(a) * outer * s, centre.y + Math.sin(a) * outer * s));
        }
        for (let k = 8; k >= 0; k--) {
          const a = a0 + (a1 - a0) * k / 8;
          points.push(new Phaser.Math.Vector2(centre.x + Math.cos(a) * inner * s, centre.y + Math.sin(a) * inner * s));
        }
        const shape = this.make.graphics({ add: false });
        shape.fillStyle(0xffffff).fillPoints(points, true);
        const image = place().setDepth(depth).setAlpha(0);
        // draw only the slice's box of the photograph, not all of it
        const xs = points.map((p) => toTexture(p).x), ys = points.map((p) => toTexture(p).y);
        const left = Math.floor(Math.min(...xs)) - 2, top = Math.floor(Math.min(...ys)) - 2;
        image.setCrop(left, top, Math.ceil(Math.max(...xs)) + 2 - left, Math.ceil(Math.max(...ys)) + 2 - top);
        image.setMask(shape.createGeometryMask());
        pieces.push({ image, shape });
        this.tweens.add({ targets: image, alpha: 1, delay: start + i * STAGGER, duration: FADE, ease: "Sine.easeOut" });
      }
    };
    const outerRadius = native.wheel.radius, discRadius = native.wheel.discRadius;
    ring("outer-lume", -9.99, discRadius - 6, outerRadius + 4, 0,
      () => this.add.image(x, y, key("outer-lume")).setOrigin(0).setScale(s),
      (p) => ({ x: (p.x - x) / s, y: (p.y - y) / s }));
    ring("rotor", 2.01, discRadius * .72, discRadius, INNER,
      () => this.add.image(centre.x, centre.y, key("rotor")).setOrigin(this._disk.originX, this._disk.originY).setScale(s),
      (p) => ({ x: rotorOrigin.x + (p.x - centre.x) / s, y: rotorOrigin.y + (p.y - centre.y) / s }));
    this._sweepDone = this.time.delayedCall(INNER + (CRYPTEX_ALPHA.length - 1) * STAGGER + FADE + 30, () => this._endSweep());
  }

  _endSweep() {
    this._sweepDone?.remove(false);
    this._sweepDone = null;
    for (const { image, shape } of this._sweepPieces || []) {
      this.tweens.killTweensOf(image);
      image.clearMask(true);
      image.destroy();
      shape.destroy();
    }
    this._sweepPieces = null;
    this._reveal.value = 1;
    this._refreshLight();
  }

  /** While the letters are still lighting, the disc does not turn yet. */
  get _sweeping() { return Boolean(this._sweepPieces); }

  _setWheelAngle(angle) {
    this._wheelAngle = angle;
    this._disk?.setAngle(angle);
    const tick = Math.round(angle / STEP);
    if (tick !== this._lastTick) {
      this._lastTick = tick;
      this.services.audio.playClick(this);
    }
  }

  _turnTo(angle) {
    if (this._turnProxy) this.tweens.killTweensOf(this._turnProxy);
    const proxy = this._turnProxy = { angle: this._wheelAngle };
    this.tweens.add({ targets: proxy, angle, duration: 150, ease: "Cubic.easeOut", onUpdate: () => this._setWheelAngle(proxy.angle) });
  }

  _refreshLight() {
    if (!this._plates) return;
    const levels = this.candle.flames.map((f) => Phaser.Math.Clamp(f.state.level * (f._flicker || 1), 0, 1));
    let cumulative = 0;
    for (let mask = 0; mask < 8; mask++) {
      let weight = 1;
      for (let i = 0; i < 3; i++) weight *= mask & (1 << i) ? levels[i] : 1 - levels[i];
      cumulative += weight;
      this._plates[mask].setAlpha(cumulative > .000001 ? weight / cumulative : 0);
    }
    this._outerLume.setAlpha(this._reveal.value);
    this._disk.setAlpha(this._reveal.value);
  }

  update(time) {
    if (!this._plates) return;
    this.candle.update(time);
    this._refreshLight();
  }

  _teardown() {
    this._letterSparkles?.();
    this._letterSparkles = null;
    this.tweens.killAll();
    // (rebuilt while the letters were still lighting: they come back all lit)
    if (this._sweepPieces) {
      this._sweepDone?.remove(false);
      this._sweepDone = null;
      for (const { shape } of this._sweepPieces) shape.destroy();
      this._sweepPieces = null;
      this._reveal.value = 1;
    }
    this.candle.removeDom();
    for (const obj of this.children.list.slice()) obj.destroy();
    this._plates = null;
    this._wheel = null;
    this._disk = null;
    this._letter = null;
    this._overlayOpen = false;
    this._draggingWheel = false;
  }

  shutdown() {
    this._plates = null;
    for (const { shape } of this._sweepPieces || []) shape.destroy();
    this._sweepPieces = null;
    this.candle?.destroy();
    this.tweens.killAll();
    // (its pictures stay loaded: core/sceneAssetCache.js lets them go only when
    // the house holds too many, so coming back is quick)
  }
}
