import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { attachMovableSparkles } from "../../shared/movableSparkles.js";
import { noiseBurst, chime, glowCanvas, makeCanvas, addCanvasTexture } from "../../shared/paint.js";
import { fitRender } from "../../shared/renderFit.js";
import BENCH from "./benchLevel.json";

// ─────────────────────────────────────────────────────────────────────────────
// Level — "CHEMISTRY"  ·  code: FOCUS  ·  atomic numbers → symbols
//
// Silas's bench in Room VII, close to, at night: the oil lamp's light from the
// left, the Bunsen burner alight under a flask on its tripod. Across the bench
// stand five graduated bottles of coloured liquid, their printed scales too
// fine to read by eye. A magnifying glass lies on its green cloth: picked up,
// it becomes the pointer, and under it each liquid is seen to stand at:
//
//   9 · 8 · 6 · 92 · 16
//
// The numbers are atomic numbers: fluorine F, oxygen O, carbon C, uranium U,
// sulfur S — F O C U S. (Each liquid has its element's colour: pale yellow,
// pale blue, black, a glowing uranium green, sulfur yellow.)
//
// A click on a bottle rings it; a click on the burner turns up the gas. The
// glass is put back by clicking its cloth (or Escape).
//
// The bench is a Blender render — Room VII's own scene seen close
// (art/blender/room_lab.py --view bench), every bottle filled to its number on
// its printed scale (lab_boards.mjs, from puzzle.js SCALES and BOTTLES): the
// plate; the cloth with the glass taken off it; and the bottles again at three
// times the size, which is what the lens shows. Live over it: the burner's
// flame, bubbles, steam, the uranium's glow.
// ─────────────────────────────────────────────────────────────────────────────

const PLATE = `chem_bench_plate_v${BENCH.version}`;
const CLOTH = `chem_bench_cloth_v${BENCH.version}`;
const ZOOM = `chem_bench_zoom_v${BENCH.version}`;
const K = { glow: "chem_glow", blue: "chem_blue_flame", steam: "chem_steam", bubble: "chem_bubble", lens: "chem_lens" };
const COLOURS = [[214, 230, 120], [140, 196, 250], [34, 32, 36], [120, 255, 110], [250, 214, 40]];
const Z = 2.8; // how much the lens enlarges
const LENS = 92; // its radius, in the render's reference pixels

export default class ChemistryScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Chemistry" });
  }

  init(data) {
    this.skipFadeIn = data && typeof data.skipFade !== "undefined" ? data.skipFade : true;
  }

  preload() {
    const url = (what) => `assets/images/Chemistry/bench-${what}-v${BENCH.version}.webp`;
    if (!this.textures.exists(PLATE)) this.load.image(PLATE, url("plate"));
    if (!this.textures.exists(CLOTH)) this.load.image(CLOTH, url("cloth"));
    if (!this.textures.exists(ZOOM)) this.load.image(ZOOM, url("zoom"));
  }

  create() {
    this.beginScene();
    this.cameras.main.setBackgroundColor("#050506");
    paintLive(this.textures);
    this._held = false;
    this._build(this.cameras.main.width, this.cameras.main.height);
    this._onResize = ({ width, height }) => {
      this._teardown();
      this._build(width, height);
    };
    this.listenToResize(this._onResize);
    this.input.on("pointermove", (p) => this._follow(p));
    this.input.keyboard?.on("keydown-ESC", () => this._putDown());
    // Esc puts the glass down here; it does not take the player out of the room
    this.usesEscape = true;
    if (!this.skipFadeIn) this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ── construction ───────────────────────────────────────────────────────────

  _build(W, H) {
    this._movableSparkleCleanups = [];
    const f = (this._f = fitRender(W, H, BENCH));
    const plate = () => this.add.image(f.x, f.y, PLATE).setOrigin(0, 0).setDisplaySize(BENCH.width * f.s, BENCH.height * f.s);
    if (this.textures.exists(PLATE)) plate().setDepth(-10);
    const zone = (hit, depth, label) => {
      const pts = hit.map((q) => f.at(q));
      const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
      const x0 = Math.min(...xs), y0 = Math.min(...ys);
      return this.add.zone(x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0).setOrigin(0, 0).setDepth(depth)
        .setInteractive({ hitArea: new Phaser.Geom.Polygon(pts.map((p) => ({ x: p.x - x0, y: p.y - y0 }))), hitAreaCallback: Phaser.Geom.Polygon.Contains, useHandCursor: true })
        .setData("interactionLabel", label);
    };

    // the five bottles: rung when clicked, bubbles rising in them
    this._bottles = BENCH.bottles.map((b, i) => {
      const z = zone(b.hit, 2, "Ring the bottle");
      z.on("pointerdown", () => this._ring(i));
      for (let k = 0; k < 4; k++) this._bubble(b, i, k * 700 + Math.random() * 500);
      return z;
    });
    // the uranium's own faint light
    const u = f.at(BENCH.uranium.at), us = BENCH.uranium.s * f.s;
    const ug = this.add.image(u.x, u.y, K.glow).setDisplaySize(us * 26, us * 34).setTint(0x70ff70).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.18).setDepth(-7);
    this.ambientTween({ targets: ug, alpha: { from: 0.12, to: 0.26 }, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    // the burner's blue flame, its glow; the gas turned up by a click
    const m = f.at(BENCH.burner.mouth), ms = BENCH.burner.s * f.s;
    this._blue = this.add.image(m.x, m.y, K.blue).setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setDepth(-5);
    this._blueH = 4.6 * ms;
    this._boost = 0;
    this.add.image(m.x, m.y - this._blueH * 0.4, K.glow).setDisplaySize(ms * 16, ms * 16).setTint(0x6080ff).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.32).setDepth(-5);
    this._gasZone = this.add.zone(m.x, m.y - 2 * ms, 9 * ms, 16 * ms).setInteractive({ useHandCursor: true }).setData("interactionLabel", "Turn up the gas").setDepth(5);
    this._gasZone.on("pointerdown", () => this._gas());

    // the flask: steam off its neck, bubbles in it
    const st = f.at(BENCH.flask.steam), ss = BENCH.flask.s * f.s;
    for (let i = 0; i < 3; i++) {
      const s = this.add.image(st.x + (i - 1) * 0.4 * ss, st.y, K.steam).setOrigin(0.5, 1).setDisplaySize(ss * 3, ss * 6).setAlpha(0).setDepth(-5);
      this.ambientObject(s);
      this.ambientTween({ targets: s, y: { from: st.y, to: st.y - 6 * ss }, alpha: { from: 0.55, to: 0 }, duration: 2400, delay: i * 800, repeat: -1, ease: "Sine.easeOut" });
    }
    const fl = f.at(BENCH.flask.liquid), fr = BENCH.flask.r * f.s;
    for (let i = 0; i < 5; i++) {
      const bub = this.add.image(fl.x + (Math.random() - 0.5) * fr, fl.y + fr * 0.3, K.bubble).setDisplaySize(0.5 * ss, 0.5 * ss).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(-5);
      this.ambientObject(bub);
      this.ambientTween({ targets: bub, y: fl.y - fr * 0.4, alpha: { from: 0.8, to: 0.2 }, duration: 700 + Math.random() * 400, delay: Math.random() * 900, repeat: -1 });
    }

    // the magnifying glass on its cloth, and the cloth bare once it is taken up
    const box = BENCH.loupe.box, at = f.at([box[0], box[1]]);
    this._bare = this.textures.exists(CLOTH)
      ? this.add.image(at.x, at.y, CLOTH).setOrigin(0, 0).setDisplaySize(box[2] * f.s, box[3] * f.s).setDepth(-4).setVisible(this._held)
      : null;
    this._loupe = zone(BENCH.loupe.hit, 4, "Pick up the magnifying glass");
    this._movableSparkleCleanups.push(attachMovableSparkles(this, this._loupe, { padding: 3, enabled: () => !this._held }));
    this._loupe.on("pointerdown", (p) => this._pickUp(p));
    this._cloth = zone(BENCH.cloth.hit, 6, "Put the magnifying glass down");
    this._cloth.disableInteractive();
    this._cloth.on("pointerdown", () => this._putDown());

    // what is seen through the lens: the bench, and the bottles at three
    // times the size, enlarged about the point it is held over
    this._zoom = this.add.container(0, 0).setDepth(40).setVisible(false);
    if (this.textures.exists(PLATE)) this._zoom.add(this.add.image(f.x * Z, f.y * Z, PLATE).setOrigin(0, 0).setDisplaySize(BENCH.width * f.s * Z, BENCH.height * f.s * Z));
    if (this.textures.exists(ZOOM)) {
      const zb = BENCH.zoom.box, zat = f.at([zb[0], zb[1]]);
      this._zoom.add(this.add.image(zat.x * Z, zat.y * Z, ZOOM).setOrigin(0, 0).setDisplaySize(zb[2] * f.s * Z, zb[3] * f.s * Z));
    }
    this._lensR = LENS * f.s;
    this._lensMask = this.make.graphics({}, false);
    this._lensMask.fillStyle(0xffffff).fillCircle(0, 0, this._lensR);
    this._zoom.setMask(this._lensMask.createGeometryMask());
    this._lens = this.add.image(0, 0, K.lens).setDisplaySize(this._lensR * 2 * 1.5, this._lensR * 2 * 1.5).setDepth(41).setVisible(false);
    if (this._held) this._hold(true);
  }

  // ── the glass ──────────────────────────────────────────────────────────────

  _pickUp(pointer) {
    if (this._held) return;
    this._held = true;
    this._hold(true);
    this._follow(pointer);
    chime(this, [[2600, 0.03]], 0.25);
  }

  _putDown() {
    if (!this._held) return;
    this._held = false;
    this._hold(false);
    noiseBurst(this, { dur: 0.12, type: "lowpass", freq: 500, q: 0.7, gain: 0.12, env: (k) => 1 - k });
  }

  // in the hand, or on its cloth: what can be clicked, what is seen
  _hold(held) {
    this._bare?.setVisible(held);
    this._zoom.setVisible(held);
    this._lens.setVisible(held);
    if (held) {
      this._loupe.disableInteractive();
      this._bottles.forEach((z) => z.disableInteractive());
      this._gasZone.disableInteractive();
      this._cloth.setInteractive({ cursor: "none" });
      this.input.setDefaultCursor("none");
    } else {
      this._cloth.disableInteractive();
      this._loupe.setInteractive();
      this._bottles.forEach((z) => z.setInteractive());
      this._gasZone.setInteractive();
      this.input.setDefaultCursor("default");
    }
  }

  _follow(pointer) {
    if (!this._held || !this._zoom) return;
    this._lens.setPosition(pointer.x, pointer.y);
    this._lensMask.setPosition(pointer.x, pointer.y);
    this._zoom.setPosition(pointer.x * (1 - Z), pointer.y * (1 - Z));
  }

  // ── what lives on the bench ────────────────────────────────────────────────

  // a bubble rising through a bottle's liquid, over and over
  _bubble(b, i, delay) {
    const f = this._f, q = b.liquid;
    const left = f.at([q.left, q.bottom]).x, right = f.at([q.right, q.bottom]).x;
    const bottom = f.at([q.left, q.bottom]).y, top = f.at([q.left, q.top]).y;
    const x = left + Math.random() * (right - left);
    const size = (0.25 + Math.random() * 0.3) * b.s * f.s;
    const bub = this.add.image(x, bottom, K.bubble).setDisplaySize(size, size)
      .setTint(Phaser.Display.Color.GetColor(...COLOURS[i].map((c) => Math.min(255, c + 90))))
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setDepth(-5);
    this.ambientObject(bub);
    this.ambientTween({
      targets: bub, y: top + size, x: x + (Math.random() - 0.5) * 0.6 * b.s * f.s,
      alpha: { from: 0.7, to: 0.25 }, duration: 1800 + Math.random() * 1400, delay, repeat: -1, ease: "Sine.easeIn",
    });
  }

  // a bottle rung: a clear note off its glass, a burst of bubbles in it
  _ring(i) {
    chime(this, [[1900 + i * 140, 0.05], [3100 + i * 90, 0.025]], 0.5);
    if (this.reducedMotion) return;
    for (let k = 0; k < 4; k++) this._bubble(BENCH.bottles[i], i, k * 60);
  }

  update(time) {
    if (!this._blue) return;
    const t = time / 1000;
    const on = this.ambientMotion && !this.reducedMotion ? 1 : 0;
    const flick = on * (Math.sin(t * 17) * 0.5 + Math.sin(t * 9.3) * 0.5);
    this._boost = Math.max(0, this._boost - 0.012);
    const bh = this._blueH * (1 + this._boost * 0.9 + flick * 0.05);
    this._blue.setDisplaySize(bh * 0.4, bh);
  }

  // the gas turned up: the flame roars a moment
  _gas() {
    this._boost = 1;
    noiseBurst(this, { dur: 1.1, type: "bandpass", freq: 600, q: 0.5, gain: 0.18, env: (k) => Math.min(1, k * 8) * (1 - k) });
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  _teardown() {
    this._movableSparkleCleanups?.forEach((cleanup) => cleanup());
    this._movableSparkleCleanups = [];
    this.tweens.killAll();
    this.time.removeAllEvents();
    for (const obj of this.children.list.slice()) obj.destroy();
    this._lensMask?.destroy();
    this._lensMask = null;
    this._bottles = [];
    this._blue = null;
    this._zoom = null;
  }

  shutdown() {
    this._onResize = null;
    this._lensMask?.destroy();
    this._lensMask = null;
    this._held = false;
    this.input.setDefaultCursor("default");
    this._movableSparkleCleanups?.forEach((cleanup) => cleanup());
    this._movableSparkleCleanups = [];
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}

// What is drawn live: a soft glow, the burner's blue cone, a wisp of steam, a
// bubble, and the glass in the hand — its brass rim and a little of the lamp
// caught on it (the lens itself shows the render, enlarged).
function paintLive(textures) {
  if (!textures.exists(K.glow)) addCanvasTexture(textures, K.glow, glowCanvas());
  if (!textures.exists(K.blue)) {
    const c = makeCanvas(24, 64), g = c.getContext("2d");
    const fire = g.createLinearGradient(0, 4, 0, 62);
    fire.addColorStop(0, "rgba(120,150,255,0)"); fire.addColorStop(0.35, "rgba(110,150,255,0.55)"); fire.addColorStop(1, "rgba(160,200,255,0.9)");
    g.fillStyle = fire; g.beginPath(); g.moveTo(12, 2); g.bezierCurveTo(22, 30, 22, 50, 12, 62); g.bezierCurveTo(2, 50, 2, 30, 12, 2); g.fill();
    g.fillStyle = "rgba(220,235,255,0.7)"; g.beginPath(); g.ellipse(12, 50, 3, 10, 0, 0, Math.PI * 2); g.fill();
    addCanvasTexture(textures, K.blue, c);
  }
  if (!textures.exists(K.steam)) {
    const c = makeCanvas(32, 64), g = c.getContext("2d");
    const s = g.createRadialGradient(16, 40, 0, 16, 40, 22);
    s.addColorStop(0, "rgba(230,230,225,0.5)"); s.addColorStop(1, "rgba(230,230,225,0)");
    g.fillStyle = s; g.fillRect(0, 0, 32, 64);
    addCanvasTexture(textures, K.steam, c);
  }
  if (!textures.exists(K.bubble)) {
    const c = makeCanvas(16, 16), g = c.getContext("2d");
    g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 1.5; g.beginPath(); g.arc(8, 8, 5.5, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.arc(6, 6, 1.6, 0, Math.PI * 2); g.fill();
    addCanvasTexture(textures, K.bubble, c);
  }
  if (!textures.exists(K.lens)) {
    // the lens's rim at the middle, its handle down and to the right; the
    // canvas is 1.5 times the lens across, the lens in its middle
    const S = 300, c = makeCanvas(S, S), g = c.getContext("2d"), r = S / 3;
    g.translate(S / 2, S / 2);
    g.save(); g.rotate(0.75);
    const handle = g.createLinearGradient(0, -7, 0, 7);
    handle.addColorStop(0, "#3a2414"); handle.addColorStop(0.5, "#5a3a22"); handle.addColorStop(1, "#24160c");
    g.fillStyle = handle; g.fillRect(r + 6, -7, S / 2 - r - 8, 14);
    g.fillStyle = "#8a6a32"; g.fillRect(r, -9, 10, 18);
    g.restore();
    const rim = g.createLinearGradient(-r, -r, r, r);
    rim.addColorStop(0, "#c8a45a"); rim.addColorStop(0.5, "#6a4c20"); rim.addColorStop(1, "#b8924a");
    g.strokeStyle = rim; g.lineWidth = 9; g.beginPath(); g.arc(0, 0, r + 3, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(255,240,200,0.18)"; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r - 8, Math.PI * 1.1, Math.PI * 1.45); g.stroke();
    addCanvasTexture(textures, K.lens, c);
  }
}
