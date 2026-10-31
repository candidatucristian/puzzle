import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import Candles from "./Candle.js";
import { CRYPTEX_ALPHA } from "./puzzle.js";
import native from "./nativeCryptex.json";

const PATH = "assets/images/Cryptex/native-v1";
const key = (name) => `cx_native_v1_${name}`;
const STEP = 360 / CRYPTEX_ALPHA.length;

// Every visible surface and letter comes from the original Blender scene.
// Eight photographs preserve the actual light from each separate candle.
export default class NativeCryptexScene extends BasePuzzleScene {
  constructor() { super({ key: "Cryptex" }); }

  init(data) { this.skipFadeIn = data?.skipFade ?? true; }

  preload() {
    for (const name of [...Array.from({ length: 8 }, (_, i) => `candles-${i}`), "outer-lume", "rotor", "letter"]) {
      if (!this.textures.exists(key(name))) this.load.image(key(name), `${PATH}/${name}.webp`);
    }
    if (!this.textures.exists(key("flames"))) {
      this.load.spritesheet(key("flames"), `${PATH}/flames.png`, { frameWidth: 72, frameHeight: 160 });
    }
  }

  create() {
    this.beginScene();
    this.input.mouse.disableContextMenu();
    this.isSolved = false;
    this._wheelAngle = 0;
    this._lastTick = 0;
    this._lettersShown = false;
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
      if (!this._lettersShown) {
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
      if (this._overlayOpen || !this._lettersShown || !this._wheel || !dy) return;
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
    zone.on("pointerdown", () => this._openLetter());
    this._buildLetter(W, H);
    if (this.candle.allOut) this._lettersShown = true;
    if (this._lettersShown) this._reveal.value = 1;
    this._refreshLight();
  }

  _buildLetter(W, H) {
    this._letter = this.add.container(0, 0).setDepth(60).setVisible(false);
    const backdrop = this.add.rectangle(0, 0, W, H, 0x050609, .87).setOrigin(0).setInteractive();
    const image = this.add.image(W / 2, H / 2 - 8, key("letter"));
    const source = this.textures.get(key("letter")).getSourceImage();
    const fit = Math.min(W * .88 / source.width, H * .88 / source.height);
    image.setScale(fit);
    const caption = this.add.text(W / 2, H - 15, "click anywhere to put it down", {
      fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: "italic", fontSize: "13px", color: "#d0c7b6",
    }).setOrigin(.5, 1);
    this._letter.add([backdrop, image, caption]);
    backdrop.on("pointerdown", () => this._closeLetter());
  }

  _openLetter() {
    if (this._overlayOpen) return;
    this._overlayOpen = true;
    this._draggingWheel = false;
    this._letter.setVisible(true).setAlpha(0);
    this._letterButtons(false);
    this.services.audio.playClick(this);
    this.tweens.add({ targets: this._letter, alpha: 1, duration: 220 });
  }

  _closeLetter() {
    if (!this._overlayOpen) return;
    this.tweens.add({
      targets: this._letter, alpha: 0, duration: 180,
      onComplete: () => {
        this._letter?.setVisible(false);
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
    this.tweens.add({ targets: this._reveal, value: 1, duration: 1300, ease: "Sine.easeInOut" });
  }

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
    this.tweens.killAll();
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
    this.candle?.destroy();
    this.tweens.killAll();
    for (const name of [...Array.from({ length: 8 }, (_, i) => `candles-${i}`), "outer-lume", "rotor", "letter", "flames"]) {
      if (this.textures.exists(key(name))) this.textures.remove(key(name));
    }
  }
}
