import { buildMorseSteps } from "./puzzle.js";
import { paintRoom, releaseRoom } from "./room.js";
import './scene.css';
import Phaser from "phaser";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";

// Level 7 — "LIGHTSWITCH"
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
    releaseRoom(this.textures);
    this._removeDOM();
    this._sparks = [];
    this._arcTicks = 0;
  }

  // ── Build ────────────────────────────────────────────────────────────────────

  _build(W, H) {
    this._busy = false;
    this._computeGeo(W, H);

    const art = paintRoom(this, W, H, this._geo);
    this.add.image(0, 0, art.dark).setOrigin(0).setDepth(0);
    this._litLayer = this.add.image(0, 0, art.lit).setOrigin(0).setDepth(3).setAlpha(0);
    this._sparkGfx = this.add.graphics().setDepth(20);

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
        <div id="blk-switch" role="button" tabindex="0" aria-label="Press the light switch">
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
    this._dom.sw.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this._pressSwitch(); }
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
    if (this.ambientMotion) {
    this.time.delayedCall(0,  () => { this._applyLight(0.0, false); this._setLedLit(false); });
    this.time.delayedCall(20, () => { this._applyLight(0.6, true);  this._setLedLit(true); });
    this.time.delayedCall(40, () => { this._applyLight(0.0, false); this._setLedLit(false); });
    }

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
    if (!this.ambientMotion) return;
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
    if (!this.ambientMotion) return;
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
    this.children.removeAll(true);
    releaseRoom(this.textures);
  }
}
