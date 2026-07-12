// Level 4 — "LIGHTSWITCH"
// Dark room. Open door — warm hallway light. Small switch left of the door.
// Press the switch: the bulb (and the switch LED) blink the answer in Morse
// code — short flash = dot, long flash = dash — then the wiring shorts out.
// Answer: POWER  ->  P .--.  O ---  W .--  E .  R .-.

const BLK_MORSE = {
  A: ".-",   B: "-...", C: "-.-.", D: "-..",  E: ".",    F: "..-.",
  G: "--.",  H: "....", I: "..",   J: ".---", K: "-.-",  L: ".-..",
  M: "--",   N: "-.",   O: "---",  P: ".--.", Q: "--.-", R: ".-.",
  S: "...",  T: "-",    U: "..-",  V: "...-", W: ".--",  X: "-..-",
  Y: "-.--", Z: "--..",
  0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-",
  5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.",
};

class LightswitchScene extends Phaser.Scene {
  constructor() { super({ key: "Lightswitch" }); }

  init(data) {
    this.skipFadeIn = data && data.skipFade !== undefined ? data.skipFade : true;
  }

  preload() {
    this.load.audio("bgm",         "assets/sounds/global/background.mp3");
    this.load.audio("click",       "assets/sounds/global/click.mp3");
    this.load.audio("ui_click",    "assets/sounds/global/mouseclick.wav");
    this.load.audio("nextlevel",   "assets/sounds/global/nextlevel.wav");
    this.load.audio("error",       "assets/sounds/global/error.mp3");
    this.load.audio("switchsound", "assets/sounds/Lightswitch/switchsound.mp3");
    this.load.audio("sparkle",     "assets/sounds/Lightswitch/sparkle.mp3");
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);
    // Phaser never calls shutdown() by itself — wire it to the scene event
    this.events.once("shutdown", () => this.shutdown());

    // Answer comes from the level config so the Morse always matches the code
    const cfg = (window.GAME_LEVELS || []).find(l => l.key === "Lightswitch");
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
    this.events.on("canvas_resized", ({ width, height }) => {
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

    // ── FADED PAINTING — right wall, past table, no text ──
    const px  = W * 0.69, py = H * 0.31;
    const pW  = W * 0.11, pH = H * 0.19;

    // Frame
    g.fillStyle(0x4a3a20, 1);
    g.fillRect(px - pW/2 - 7, py - pH/2 - 7, pW + 14, pH + 14);
    g.fillStyle(0x362a12, 1);
    g.fillRect(px - pW/2 - 2, py - pH/2 - 2, pW + 4, pH + 4);
    // Canvas (dark, aged)
    g.fillStyle(0x28221a, 1);
    g.fillRect(px - pW/2, py - pH/2, pW, pH);
    // Faded landscape strokes (no text)
    g.lineStyle(1, 0x3a3228, 0.55);
    g.lineBetween(px - pW/2 + 5, py + pH*0.14, px + pW/2 - 5, py + pH*0.16);
    g.lineStyle(1, 0x322c24, 0.40);
    g.lineBetween(px - pW/2 + 8, py - pH*0.12, px + pW/2 - 8, py - pH*0.08);
    g.lineStyle(1, 0x2e2820, 0.30);
    g.lineBetween(px - pW/2 + 5, py + pH*0.30, px + pW/2 - 12, py + pH*0.28);
  }

  // ── DOM: hanging bulb + small switch with LED ─────────────────────────────────

  _injectDOM(W, H) {
    this._removeDOM();

    const geo      = this._geo;
    const cordLen  = Math.round(geo.bulb.y - Math.max(10, H * 0.014));
    const bulbSize = Math.round(Phaser.Math.Clamp(W * 0.042, 28, 54));
    const sw       = geo.sw;

    const style = document.createElement("style");
    style.id = "blk-style"; style.className = "scene-dom-overlay";
    style.textContent = `
#blk-overlay{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:5;}

/* ── Bulb ── */
#blk-bulb{position:absolute;width:0;height:0;transform-origin:0 0;
  animation:blkSway 3s ease-in-out infinite alternate;}
#blk-bulb .cord{position:absolute;left:-1px;top:0;width:2px;height:var(--cord);
  background:#020202;}
#blk-bulb .socket{position:absolute;left:-5px;top:calc(var(--cord) - 2px);
  width:10px;height:13px;background:#0d0d0d;border-radius:2px 2px 3px 3px;
  box-shadow:inset 0 -2px 3px rgba(0,0,0,.5);}
#blk-bulb .bulb{position:absolute;top:calc(var(--cord) + 12px);
  left:calc(var(--bulb)/-2);width:var(--bulb);height:var(--bulb);
  border-radius:50% 50% 45% 45%;
  background:radial-gradient(circle at 40% 34%,rgba(255,255,255,.07),rgba(60,60,60,.03));
  border:1px solid rgba(255,255,255,.04);
  transition:background .015s linear,box-shadow .015s linear;}
#blk-bulb.on .bulb{
  background:radial-gradient(circle at 42% 36%,#fffef0 0%,#fff4c8 52%,#ffd880 100%);
  border-color:rgba(255,248,200,.9);
  box-shadow:0 0 10px #fff,0 0 28px rgba(255,244,192,.96),
    0 0 68px rgba(255,228,160,.72),0 0 130px rgba(255,218,142,.50),
    0 0 210px rgba(255,208,130,.26);}

/* ── Switch ── */
#blk-switch-wrap{position:absolute;pointer-events:none;
  display:flex;flex-direction:column;align-items:center;gap:4px;
  transform:translate(-50%,-50%);}
#blk-switch{position:relative;width:var(--sw-w);height:var(--sw-h);
  background:linear-gradient(155deg,#f6f6f6,#dcdcdc);
  border-radius:4px;border:2px solid #c2c2c2;
  cursor:pointer;pointer-events:auto;
  box-shadow:inset 1px 1px 3px rgba(255,255,255,.70),
    inset -2px -2px 4px rgba(0,0,0,.16),
    2px 5px 14px rgba(0,0,0,.70);}
#blk-switch .screw{position:absolute;left:50%;transform:translateX(-50%);
  width:18%;aspect-ratio:1;border-radius:50%;background:#e4e4e4;
  box-shadow:inset -1px -1px 2px rgba(0,0,0,.18);}
#blk-switch .screw.top{top:8%;}
#blk-switch .screw.bottom{bottom:8%;}
#blk-switch .screw::after{content:"";position:absolute;inset:30% 12%;
  background:#cacaca;border-radius:1px;transform:rotate(20deg);}
#blk-switch .screw.bottom::after{transform:rotate(-30deg);}
#blk-switch .rocker{position:absolute;left:18%;top:20%;width:64%;height:60%;
  border-radius:3px;overflow:hidden;background:#dedede;
  box-shadow:inset 1px 1px 2px rgba(0,0,0,.18);}
#blk-switch .rocker .half{position:absolute;left:0;width:100%;height:50%;
  transition:background .14s ease,box-shadow .14s ease;}
#blk-switch .rocker .half.top{top:0;background:#ebebeb;
  box-shadow:inset 0 -9px 12px rgba(0,0,0,.09);}
#blk-switch .rocker .half.bottom{bottom:0;background:#f6f6f6;}
#blk-switch .rocker .half.bottom::after{content:"";position:absolute;bottom:0;
  left:0;width:100%;height:6px;background:linear-gradient(90deg,#d8d8d8,#c8c8c8);}
#blk-switch.on .rocker .half.top{background:#e0e0e0;
  box-shadow:inset 0 7px 11px rgba(0,0,0,.11);}
#blk-switch.on .rocker .half.top::after{content:"";position:absolute;top:0;
  left:0;width:100%;height:6px;background:linear-gradient(90deg,#f4f4f4,#eaeaea);}
#blk-switch.on .rocker .half.bottom{background:#f0f0f0;box-shadow:none;}
#blk-switch.on .rocker .half.bottom::after{display:none;}

/* LED — green idle (off) · dark red armed · bright red on each Morse flash */
#blk-led{width:8px;height:8px;border-radius:50%;
  background:#22bb44;
  border:1px solid rgba(0,0,0,.25);
  box-shadow:inset 0 1px 1px rgba(255,255,255,.45);
  transition:background .015s linear, box-shadow .015s linear;}
#blk-led.on{background:#5a1414;}                        /* armed, between flashes */
#blk-led.on.lit{background:#ff2a2a;                     /* flashing on */
  box-shadow:0 0 5px rgba(255,50,50,.9),0 0 9px rgba(255,40,40,.45);}

@keyframes blkSway{from{transform:rotate(1.8deg);}to{transform:rotate(-1.8deg);}}
`;
    document.head.appendChild(style);

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
      overlay, style,
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
      if (this._dom.style)   this._dom.style.remove();
      this._dom = null;
    } else {
      document.getElementById("blk-overlay")?.remove();
      document.getElementById("blk-style")?.remove();
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
    this._morseSteps = this._buildMorse(letter);
    this._morseIdx   = 0;
    this._morseTimer = this.time.delayedCall(260, () => this._morseStep());
  }

  // word/letter → [{ on:bool, dur:ms }, …] with short Morse spacing
  _buildMorse(word) {
    const U        = 120;      // base time unit (ms)
    const DOT      = 40;       // dot = a bare camera-flash blink
    const DASH     = 500;      // dash held a beat longer — the contrast IS the code
    const GAP_EL   = U * 1.4;  // roomier gap so the flash reads as its own beat
    const GAP_CHAR = U * 3;    // between letters
    const steps = [];
    const chars = String(word || "").toUpperCase().split("");

    chars.forEach((ch, ci) => {
      const pat = BLK_MORSE[ch];
      if (!pat) return;
      const syms = pat.split("");
      syms.forEach((sym, si) => {
        steps.push({ on: true, dur: sym === "-" ? DASH : DOT });
        if (si < syms.length - 1) steps.push({ on: false, dur: GAP_EL });
      });
      if (ci < chars.length - 1) steps.push({ on: false, dur: GAP_CHAR });
    });
    return steps;
  }

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
  _snd(key, vol) {
    if (window.GameAudio && window.GameAudio.muted) return;
    try {
      if (this.cache.audio.exists(key))
        this.sound.play(key, {
          volume: (window.GameAudio ? window.GameAudio.sfxVol : 1) * (vol || 1),
        });
    } catch (e) {}
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

  transitionToLevel(levelKey, skipFade = false) {
    if (skipFade) { this._removeDOM(); this.scene.start(levelKey, { skipFade: true }); return; }
    if (!this.isSolved && window.playSuccess) window.playSuccess(this);
    this.isSolved = true; this._removeDOM();
    const W = this._W, H = this._H;
    const ov = this.add.rectangle(0, 0, W, H, 0x000000).setOrigin(0, 0).setDepth(200).setAlpha(0);
    const idx = window.GAME_LEVELS.findIndex(l => l.key === levelKey);
    const lb  = this.add.text(W/2, H/2, "Level "+(idx+1)+"...", {
      fontFamily: "monospace", fontSize: "42px", color: "#00ff44",
    }).setOrigin(0.5).setDepth(201).setAlpha(0);
    this.tweens.add({ targets: [ov, lb], alpha: 1, duration: 1000,
                      onComplete: () => this.scene.start(levelKey, { skipFade: false }) });
  }

  shutdown() {
    if (this._sparkTimer) { this._sparkTimer.remove(false); this._sparkTimer = null; }
    this.tweens.killAll(); this.time.removeAllEvents(); this._removeDOM();
  }
}
