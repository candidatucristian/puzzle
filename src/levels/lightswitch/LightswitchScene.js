import { buildMorseSteps } from "./puzzle.js";
import './scene.css';
import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";

// Level 4 — "LIGHTSWITCH"
// Dark room. Open door — warm hallway light. Small switch left of the door.
// Press the switch: the bulb (and the switch LED) blink the answer in Morse
// code — short flash = dot, long flash = dash — then the wiring shorts out.
// Answer: POWER  ->  P .--.  O ---  W .--  E .  R .-.

export default class LightswitchScene extends BasePuzzleScene {
  constructor() { super({ key: "Lightswitch" }); }

  init(data) {
    this.skipFadeIn = data && data.skipFade !== undefined ? data.skipFade : true;
  }

  preload() {
    this.load.audio("switchsound", "assets/sounds/Lightswitch/switchsound.mp3");
    this.load.audio("sparkle",     "assets/sounds/Lightswitch/sparkle.mp3");
    // the man himself — hangs on the wall, seen only while the bulb burns
    this.load.image("samuel", "assets/images/Lightswitch/Samuel.png");
  }

  create() {
    this.beginScene();

    // Answer comes from the level config so the Morse always matches the code
    const cfg = (this.services.levels.definitions || []).find(l => l.key === "Lightswitch");
    this.ANSWER = cfg && cfg.code ? cfg.code : "POWER";

    this.isSolved    = false;
    this._busy       = false;
    this._sparks     = [];
    this._sparkTimer = null;
    this._arcTicks   = 0;
    this._letterIdx  = 0;   // which letter of the answer the next press reveals
    this._W          = this.cameras.main.width;
    this._H          = this.cameras.main.height;
    this._build(this._W, this._H);
    this.listenToResize(({ width, height }) => {
      this._W = width; this._H = height;
      this._teardown(); this._build(width, height);
    });
  }

  _teardown() {
    if (this._sparkTimer) { this._sparkTimer.remove(false); this._sparkTimer = null; }
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.children.removeAll(true);
    this._removeDOM();
    this._sparks = [];
    this._arcTicks = 0;
  }

  // ── Build ────────────────────────────────────────────────────────────────────

  _build(W, H) {
    this._busy = false;
    this._computeGeo(W, H);

    this._roomGfx  = this.add.graphics().setDepth(0);   // dark base
    this._doorGfx  = this.add.graphics().setDepth(1);   // hallway + light cones
    this._litLayer = this.add.container(0, 0).setDepth(3).setAlpha(0);
    this._litGfx   = this.add.graphics();
    this._litLayer.add(this._litGfx);
    this._frameGfx = this.add.graphics().setDepth(10);  // black door frame, always on top
    this._sparkGfx = this.add.graphics().setDepth(20);

    this._drawRoom(W, H);
    this._drawDoorLight(W, H);
    this._drawDoorFrame();
    this._drawLitRoom(W, H);
    this._injectDOM(W, H);
  }

  _computeGeo(W, H) {
    const floorY = H * 0.72;
    const doorW  = Math.min(W * 0.20, 210);
    const doorH  = H * 0.53;
    const doorX  = W * 0.28 - doorW / 2;   // left-side wall
    const doorY  = floorY - doorH;

    const bulbX = W * 0.54;
    const bulbY = H * 0.26;

    // Switch: small & proportional (about 1/8 of door width), left of door
    const swW  = Phaser.Math.Clamp(doorW / 8, 18, 30);
    const swH  = swW * 1.9;
    const swCx = doorX - swW / 2 - 20;
    const swCy = H * 0.42;

    this._geo = {
      floorY,
      door: { x: doorX, y: doorY, w: doorW, h: doorH },
      bulb: { x: bulbX, y: bulbY },
      sw:   { cx: swCx, cy: swCy, w: swW, h: swH },
    };
  }

  // ── Dark base room ───────────────────────────────────────────────────────────

  _drawRoom(W, H) {
    const g = this._roomGfx;
    g.clear();
    const { floorY } = this._geo;

    // Warm dark (not purple)
    g.fillGradientStyle(0x0f0d0a, 0x0f0d0a, 0x0a0806, 0x0a0806, 1);
    g.fillRect(0, 0, W, floorY);
    g.fillGradientStyle(0x0b0906, 0x0b0906, 0x060403, 0x060403, 1);
    g.fillRect(0, floorY, W, H - floorY);
    g.lineStyle(1, 0x1c1a16, 1);
    g.lineBetween(0, floorY, W, floorY);

    // Soft vignette
    for (let i = 0; i < 5; i++) {
      g.fillStyle(0x000000, 0.08);
      const t = (5 - i) * 22;
      g.fillRect(0, 0, t, H); g.fillRect(W - t, 0, t, H);
      g.fillRect(0, 0, W, t * 0.5); g.fillRect(0, H - t * 0.5, W, t * 0.5);
    }
  }

  // ── Hallway warm light + light cones into the room ───────────────────────────

  _drawDoorLight(W, H) {
    const g = this._doorGfx;
    g.clear();
    const d = this._geo.door;
    const { floorY } = this._geo;

    // ── Doorway interior: dark back → bright center ──
    g.fillStyle(0x1c1408, 1);
    g.fillRect(d.x, d.y, d.w, d.h);

    // Warm layers from edge inward (nested, progressively brighter + more yellow)
    const layers = [
      { shrink: 0.06, col: 0xa87828 },
      { shrink: 0.14, col: 0xc89838 },
      { shrink: 0.22, col: 0xe0b450 },
      { shrink: 0.30, col: 0xf4cc68 },
      { shrink: 0.38, col: 0xfff0b0 },
    ];
    layers.forEach(({ shrink, col }) => {
      g.fillStyle(col, 1);
      g.fillRect(
        d.x + d.w * shrink,
        d.y + d.h * (shrink * 0.3),
        d.w * (1 - shrink * 2),
        d.h * (1 - shrink * 0.3)
      );
    });

    // ── Open door panel (swung toward viewer, dark parallelogram) ──
    const p = d.w * 0.55;
    g.fillStyle(0x0d0b10, 1);
    g.fillPoints([
      { x: d.x,     y: d.y },
      { x: d.x - p, y: d.y + d.h * 0.08 },
      { x: d.x - p, y: floorY + d.h * 0.05 },
      { x: d.x,     y: floorY },
    ], true);
    g.lineStyle(1, 0x201e2c, 0.6);
    g.lineBetween(d.x - p, d.y + d.h * 0.08, d.x - p, floorY + d.h * 0.05);
    // Door knob
    g.fillStyle(0x3e3624, 1);
    g.fillCircle(d.x - p * 0.14, d.y + d.h * 0.55, Math.max(2, d.w * 0.025));

    // ── Light cones spreading into dark room ──

    // Widest outer cone (floor)
    g.fillStyle(0xb08828, 0.15);
    g.fillPoints([
      { x: d.x + d.w * 0.02, y: floorY },
      { x: d.x + d.w * 0.98, y: floorY },
      { x: d.x + d.w * 4.0,  y: H },
      { x: d.x - d.w * 1.5,  y: H },
    ], true);

    // Mid cone
    g.fillStyle(0xc8a038, 0.22);
    g.fillPoints([
      { x: d.x + d.w * 0.10, y: floorY },
      { x: d.x + d.w * 0.90, y: floorY },
      { x: d.x + d.w * 2.8,  y: H },
      { x: d.x - d.w * 0.7,  y: H },
    ], true);

    // Bright center strip
    g.fillStyle(0xe4b84e, 0.32);
    g.fillPoints([
      { x: d.x + d.w * 0.25, y: floorY },
      { x: d.x + d.w * 0.75, y: floorY },
      { x: d.x + d.w * 1.7,  y: H },
      { x: d.x + d.w * 0.15, y: H },
    ], true);

    // Hot highlight directly in front
    g.fillStyle(0xfadc7a, 0.22);
    g.fillPoints([
      { x: d.x + d.w * 0.38, y: floorY },
      { x: d.x + d.w * 0.62, y: floorY },
      { x: d.x + d.w * 1.05, y: H },
      { x: d.x + d.w * 0.58, y: H },
    ], true);

    // Warm glow on right wall section (light bouncing off)
    for (let i = 5; i >= 1; i--) {
      g.fillStyle(0xc09030, 0.014 * i);
      const wallSection = W - d.x - d.w;
      g.fillRect(d.x + d.w, d.y, wallSection * (i / 5), d.h * 0.85);
    }

    // Soft atmospheric haze around door frame
    for (let i = 3; i >= 1; i--) {
      g.fillStyle(0xffd060, 0.009 * i);
      g.fillRect(d.x - i * 6, d.y - i * 5, d.w + i * 12, d.h + i * 6);
    }
  }

  // ── Black door frame — always on top ─────────────────────────────────────────

  _drawDoorFrame() {
    const g = this._frameGfx;
    g.clear();
    const d = this._geo.door;
    const fw = Math.max(4, Math.round(d.w * 0.055));
    g.lineStyle(fw, 0x000000, 1);
    g.strokeRect(d.x, d.y, d.w, d.h);
  }

  // ── Lit room: warm walls, furniture, faded painting (no text) ───────────────

  _drawLitRoom(W, H) {
    const g = this._litGfx;
    g.clear();
    const { floorY } = this._geo;
    const d = this._geo.door;
    const b = this._geo.bulb;

    // ── Warm walls — leave door opening transparent ──
    g.fillStyle(0x5c4c34, 1);
    g.fillRect(0,          0, d.x,           floorY);   // left
    g.fillRect(d.x + d.w, 0, W - d.x - d.w, floorY);   // right
    g.fillRect(d.x,        0, d.w,           d.y);       // above door

    // Ceiling darker
    g.fillStyle(0x28200e, 0.50);
    g.fillRect(0, 0, W, H * 0.10);

    // Bulb light bloom (single-source warmth)
    for (let i = 10; i >= 1; i--) {
      g.fillStyle(0xcca054, 0.025 * i);
      g.fillEllipse(b.x, b.y + H * 0.10, W * (0.04 + i * 0.07), H * (0.04 + i * 0.07));
    }

    // ── Floor ──
    g.fillStyle(0x1c1810, 1);
    g.fillRect(0, floorY, W, H - floorY);
    // Baseboard
    g.fillStyle(0x2e2616, 1);
    g.fillRect(0, floorY - H * 0.016, W, H * 0.016);
    // Plank lines
    g.lineStyle(1, 0x26200e, 0.40);
    for (let i = 1; i < 5; i++) {
      const y = floorY + (H - floorY) * (i / 5);
      g.lineBetween(0, y, W, y);
    }

    // ── CHAIR — far right ──
    const cx  = W * 0.83, cy = floorY;
    const chW = W * 0.095, chLH = H * 0.12, chSH = H * 0.018, chLW = W * 0.009;

    g.fillStyle(0x5a4730, 1);
    g.fillRect(cx - chW/2, cy - chLH - chSH, chW, chSH);                           // seat
    g.fillRect(cx - chW/2 + chLW, cy - chLH - H*0.135, chLW, H*0.135);             // back-left post
    g.fillRect(cx + chW/2 - chLW*2.2, cy - chLH - H*0.135, chLW, H*0.135);         // back-right post
    g.fillRect(cx - chW/2 + chLW, cy - chLH - H*0.135, chW - chLW*3.2, chLW*0.7); // top rail
    g.fillRect(cx - chW/2 + chLW, cy - chLH - H*0.072, chW - chLW*3.2, chLW*0.55);// mid rail
    g.fillStyle(0x46381e, 1);
    g.fillRect(cx - chW/2 + chLW*0.5, cy - chLH, chLW, chLH);                      // left leg
    g.fillRect(cx + chW/2 - chLW*1.5, cy - chLH, chLW, chLH);                      // right leg

    // ── TABLE — centre of room, clearly away from door ──
    const tx  = W * 0.50, ty = floorY;
    const tW  = W * 0.18, tTH = H * 0.017, tLH = H * 0.12, tLW = tW * 0.055;

    g.fillStyle(0x6a5236, 1);
    g.fillRect(tx - tW/2, ty - tLH - tTH, tW, tTH);          // tabletop
    g.fillStyle(0x4e3c22, 1);
    g.fillRect(tx - tW/2 + tLW,    ty - tLH, tLW, tLH);      // left leg
    g.fillRect(tx + tW/2 - tLW*2,  ty - tLH, tLW, tLH);      // right leg
    g.fillRect(tx - tW/2 + tLW*2, ty - tLH*0.44, tW - tLW*4, tLW*0.5); // crossbar
    // Book on table
    g.fillStyle(0x3c2e1a, 1);
    g.fillRect(tx - tW*0.22, ty - tLH - tTH - H*0.022, tW*0.14, H*0.022);
    g.fillStyle(0x4a3a26, 0.60);
    g.fillRect(tx - tW*0.22, ty - tLH - tTH - H*0.024, tW*0.14, H*0.003);

    // ── THE PORTRAIT — right wall: Samuel Morse, lit only by his own code ──
    const px  = W * 0.69, py = H * 0.31;
    const pW  = W * 0.11, pH = H * 0.19;

    // Frame
    g.fillStyle(0x4a3a20, 1);
    g.fillRect(px - pW/2 - 7, py - pH/2 - 7, pW + 14, pH + 14);
    g.fillStyle(0x362a12, 1);
    g.fillRect(px - pW/2 - 2, py - pH/2 - 2, pW + 4, pH + 4);
    // Canvas backing (also the fallback if the photo is missing)
    g.fillStyle(0x28221a, 1);
    g.fillRect(px - pW/2, py - pH/2, pW, pH);

    if (this.textures.exists("samuel")) {
      // cover-fit the photo into the frame opening, cropping the overflow
      const src = this.textures.get("samuel").getSourceImage();
      const img = this.add.image(px, py, "samuel");
      const s = Math.max(pW / src.width, pH / src.height);
      img.setScale(s);
      const cw = pW / s, ch = pH / s;
      img.setCrop((src.width - cw) / 2, (src.height - ch) / 2, cw, ch);
      img.setTint(0xe2cfae); // aged print, warmed by the bulb
      this._litLayer.add(img); // inherits the light — visible only mid-flash

      // gentle inner shadow so the print sits IN the frame
      const shade = this.add.graphics();
      shade.lineStyle(3, 0x000000, 0.35);
      shade.strokeRect(px - pW/2 + 1.5, py - pH/2 + 1.5, pW - 3, pH - 3);
      this._litLayer.add(shade);
    }
  }

  // ── DOM: hanging bulb + small switch with LED ─────────────────────────────────

  _injectDOM(W, H) {
    this._removeDOM();

    const geo      = this._geo;
    const cordLen  = Math.round(geo.bulb.y - Math.max(10, H * 0.014));
    const bulbSize = Math.round(Phaser.Math.Clamp(W * 0.042, 28, 54));
    const sw       = geo.sw;

const overlay = document.createElement("div");
    overlay.id = "blk-overlay"; overlay.className = "scene-dom-overlay";
    overlay.style.setProperty("--cord",  cordLen  + "px");
    overlay.style.setProperty("--bulb",  bulbSize + "px");
    overlay.style.setProperty("--sw-w",  Math.round(sw.w) + "px");
    overlay.style.setProperty("--sw-h",  Math.round(sw.h) + "px");

    overlay.innerHTML = `
      <div id="blk-bulb" style="left:${Math.round(geo.bulb.x)}px;top:0px;">
        <div class="cord"></div>
        <div class="socket"></div>
        <div class="bulb"></div>
      </div>
      <div id="blk-switch-wrap"
           style="left:${Math.round(sw.cx)}px;top:${Math.round(sw.cy)}px;">
        <div id="blk-switch">
          <div class="screw top"></div>
          <div class="rocker">
            <div class="half top"></div>
            <div class="half bottom"></div>
          </div>
          <div class="screw bottom"></div>
        </div>
        <div id="blk-led"></div>
      </div>
    `;

    document.getElementById("game-container").appendChild(overlay);

    this._dom = {
      overlay,
      bulb: overlay.querySelector("#blk-bulb"),
      sw:   overlay.querySelector("#blk-switch"),
      led:  overlay.querySelector("#blk-led"),
    };
    this._dom.sw.addEventListener("pointerdown", e => {
      e.preventDefault(); this._pressSwitch();
    });
    this._applyLight(0, false);
  }

  _removeDOM() {
    if (this._dom) {
      if (this._dom.overlay) this._dom.overlay.remove();
      this._dom = null;
    } else {
      document.getElementById("blk-overlay")?.remove();
    }
  }

  // ── Press: reveal ONE letter in Morse, then short out ────────────────────────
  // Each press blinks the next letter of the answer, so the player has to work
  // for it and won't instantly clock that it's Morse. The Morse itself is on
  // the light only — the switch flip and the sparks are the only sounds.

  _pressSwitch() {
    if (this._busy || this.isSolved || !this._dom) return;
    this._busy = true;

    this._dom.sw.classList.add("on");     // rocker flips
    this._dom.led.classList.add("on");    // LED armed (dark red)
    this._snd("switchsound");

    // Sometimes the contact throws a few small sparks on the way in
    if (Math.random() < 0.4)
      this._addSparks(this._geo.sw.cx, this._geo.sw.cy, Phaser.Math.Between(3, 6));

    // Blink ONLY the current letter, then short-circuit
    const letter = this.ANSWER.charAt(this._letterIdx);
    this._morseSteps = buildMorseSteps(letter);
    this._morseIdx   = 0;
    this._morseTimer = this.time.delayedCall(520, () => this._morseStep());
  }

  // word/letter → [{ on:bool, dur:ms }, …] with unhurried Morse spacing

  _morseStep() {
    if (!this._morseSteps || this._morseIdx >= this._morseSteps.length) {
      this._applyLight(0, false);
      this._setLedLit(false);
      this._shortCircuit();
      return;
    }
    const s = this._morseSteps[this._morseIdx++];
    this._applyLight(s.on ? 1 : 0, s.on);
    this._setLedLit(s.on);
    this._morseTimer = this.time.delayedCall(s.dur, () => this._morseStep());
  }

  _setLedLit(on) {
    if (this._dom && this._dom.led)
      this._dom.led.classList.toggle("lit", !!on);
  }

  // End of the letter: quick flicker, spark burst, switch drops to OFF, and the
  // answer advances so the NEXT press shows the NEXT letter.
  _shortCircuit() {
    this.time.delayedCall(0,  () => { this._applyLight(0.0, false); this._setLedLit(false); });
    this.time.delayedCall(20, () => { this._applyLight(0.6, true);  this._setLedLit(true); });
    this.time.delayedCall(40, () => { this._applyLight(0.0, false); this._setLedLit(false); });

    this.time.delayedCall(54, () => {
      this._bigZap(this._geo.sw.cx, this._geo.sw.cy);
      if (this._dom) {
        this._dom.sw.classList.remove("on");
        this._dom.led.classList.remove("on");
        this._dom.led.classList.remove("lit");
      }
      this._letterIdx = (this._letterIdx + 1) % this.ANSWER.length;
    });

    this.time.delayedCall(560, () => { this._busy = false; });
  }

  _applyLight(alpha, bulbOn) {
    if (this._litLayer) this._litLayer.setAlpha(alpha);
    if (this._dom && this._dom.bulb)
      this._dom.bulb.classList.toggle("on", !!bulbOn);
  }

  // Play a level SFX (switch flip / sparks), respecting mute + sfx volume
  _snd(key, vol = 1) {
    this.services.audio.playSfx(key, vol, this);
  }

  // ── Sparks (no sound) ────────────────────────────────────────────────────────

  _ensureSparkTimer() {
    if (!this._sparkTimer) {
      this._sparkTimer = this.time.addEvent({
        delay: 16, loop: true, callback: () => this._updateSparks(),
      });
    }
  }

  // Add a handful of spark particles at (x, y). Used both for the small
  // press-time crackle and (via _bigZap) for the end-of-letter short circuit.
  _addSparks(x, y, count) {
    this._snd("sparkle", 0.85);
    for (let i = 0; i < count; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
      const spd = 1.4 + Math.random() * 4;
      this._sparks.push({
        x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        life: 1, decay: 0.035 + Math.random() * 0.045,
        len: 3 + Math.random() * 5, hot: Math.random() < 0.5,
      });
    }
    this._ensureSparkTimer();
  }

  // Full short-circuit burst: white flash, crackling arcs, many sparks.
  _bigZap(x, y) {
    const flash = this.add.graphics().setDepth(20);
    flash.fillStyle(0xfff2b0, 0.85);
    flash.fillCircle(x, y, this._W * 0.013);
    flash.fillStyle(0x88ccff, 0.38);
    flash.fillCircle(x, y, this._W * 0.020);
    this.tweens.add({ targets: flash, alpha: 0, duration: 190, ease: "Quad.easeOut",
                      onComplete: () => flash.destroy() });
    this._arcTicks = 7;
    this._addSparks(x, y, 18);
  }

  _updateSparks() {
    const g = this._sparkGfx;
    g.clear();
    const { sw } = this._geo;

    // Crackling arcs — only right after a big zap
    if (this._arcTicks > 0) {
      this._arcTicks--;
      const oy = sw.cy - sw.h * 0.26;
      for (let a = 0; a < 3; a++) {
        g.lineStyle(1.2, a % 2 ? 0x9fd4ff : 0xfff0b0, 0.9);
        g.beginPath();
        g.moveTo(sw.cx, oy);
        const tx2 = sw.cx + (Math.random() - 0.5) * sw.w * 1.8;
        const ty2 = sw.cy + (Math.random() - 0.5) * sw.h * 1.5;
        for (let i = 1; i <= 5; i++) {
          const t = i / 5;
          g.lineTo(sw.cx + (tx2 - sw.cx) * t + (Math.random() - 0.5) * sw.w * 0.6,
                   oy + (ty2 - oy) * t + (Math.random() - 0.5) * sw.h * 0.35);
        }
        g.strokePath();
      }
    }

    for (const p of this._sparks) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.28; p.vx *= 0.98; p.life -= p.decay;
      if (p.life <= 0) continue;
      g.lineStyle(1.8, p.hot ? 0xfff2a0 : 0xff8a3a, Math.max(0, p.life));
      g.lineBetween(p.x, p.y, p.x - p.vx * p.len * 0.3, p.y - p.vy * p.len * 0.3);
      if (p.y > this._geo.floorY && p.vy > 0) { p.vy *= -0.32; p.vx *= 0.5; }
    }
    this._sparks = this._sparks.filter(p => p.life > 0);

    if (this._sparks.length === 0 && this._arcTicks <= 0) {
      g.clear();
      if (this._sparkTimer) { this._sparkTimer.remove(false); this._sparkTimer = null; }
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  replay() { this._letterIdx = 0; this._teardown(); this._build(this._W, this._H); }

  shutdown() {
    if (this._sparkTimer) { this._sparkTimer.remove(false); this._sparkTimer = null; }
    this.tweens.killAll(); this.time.removeAllEvents(); this._removeDOM();
  }
}
