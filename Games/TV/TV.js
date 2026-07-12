// TV — CRT TV level built on a shader-doodle component (originally TV.html/css/js).
// The screen is a glitchy CRT broadcast: a shader samples cycling channel images.
// The left / right knobs on the TV change channel (prev / next). Each channel's
// broadcast is shown as white-on-black subtitles over the screen. All four channels
// describe VOID without ever naming it. Code: VOID / NULL.
//
// TV.css was SCSS and TV.js was TypeScript — both are inlined here as plain
// CSS / JS (SCSS darken()/lighten() values pre-computed to hex).

const DEADAIR_SD_LIB = "https://unpkg.com/shader-doodle@alpha";

// Channel images — sampled by the CRT shader as the broadcast picture.
// Order matches the channels below so each text sits on its own image.
const DEADAIR_IMAGES = [
  "assets/images/TV/astronomy.jpg", // 0 → COSMOS NET (supervoid)
  "assets/images/TV/court.jpg",     // 1 → LAWCOURT
  "assets/images/TV/coding.jpg",    // 2 → CODE REVIEW
  "assets/images/TV/science.jpg",   // 3 → SCIENCE FOUND.
];

// The exact fragment shader from TV.html (Shadertoy-style CRT)
const DEADAIR_SHADER = `
#define PI 3.14159265359
#define TWO_PI 6.28318530718

uniform sampler2D iTexture0;

float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123 * sin(iTime));
}

float filter(vec2 st, vec4 texture) {
  return texture2D(
    iTexture0,
    vec2(st.x + sin(iTime * 142.) * .0005 + abs(sin(iTime)) * 0.005, st.y)
  ).r;
}

float ease(float x) {
  return -(cos(PI * x) - 1.) / 2.;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 st = fragCoord/iResolution.xy;

  st -= vec2(.5);
  float edgeWidth = .15;
  float edgeSoftness = .2;
  float edgeValue = .475;
  float screen = min(.5,
    smoothstep(edgeValue - edgeWidth, edgeValue + edgeSoftness, abs(st.y)) +
    smoothstep(edgeValue - edgeWidth, edgeValue + edgeSoftness, abs(st.x))
  );
  float flare =
    1. - smoothstep(.0, .6, length(vec2(st.x * .7 + .1, st.y - .4))) +
    1. - smoothstep(.0, .075, length(vec2(st.x - .2, st.y - .2)));
  st += vec2(.5);

  float t = sin(iTime * 2.);
  float glitchTime = (smoothstep(.0, .5, t) + smoothstep(.5, 1., t));

  st.y += glitchTime * sin(iTime * 234234.23) * 0.02;
  st.y = fract(st.y);

  float glitchWidth = .2;
  float glitchOffset = mod(iTime * 1.6, 1.0 + glitchWidth);
  st.x += glitchTime * smoothstep(glitchOffset - glitchWidth, glitchOffset, 1. - st.y);
  st.x = fract(st.x);

  st = vec2(ease(st.x), ease(st.y));

  vec4 texture = texture2D(iTexture0, st);

  vec3 color =
    abs(1. - screen * 2.) *
    (
      vec3(texture.r * .5 + filter(st, texture), texture.gb) -
      vec3(glitchTime * noise(st) * .5)
    ) +
    vec3(flare) * .3;

  fragColor = vec4(color, 1.);
}
`;

class TVScene extends Phaser.Scene {
  constructor() {
    super({ key: "TV" });
  }

  init(data) {
    this.skipFadeIn = data && data.skipFade !== undefined ? data.skipFade : true;
  }

  preload() {
    this.load.audio("bgm",       "assets/sounds/global/background.mp3");
    this.load.audio("click",     "assets/sounds/global/click.mp3");
    this.load.audio("ui_click",  "assets/sounds/global/mouseclick.wav");
    this.load.audio("nextlevel", "assets/sounds/global/nextlevel.wav");
    this.load.audio("error",     "assets/sounds/global/error.mp3");
    this.load.audio("static",    "assets/sounds/TV/staticsound.mp3");
  }

  // ── Broadcasts — each channel describes VOID without naming it ────────────────
  get _CHANNELS() {
    return [
      {
        img: 0,
        station: "COSMOS NET · CH.3",
        lines: [
          "Astronomers confirmed the discovery:",
          "a supervoid spanning 300 million",
          "light-years. No galaxies. No dark",
          "matter. No signal returns.",
          "",
          "Dr. Eisner wrote in her report:",
          "'It is not darkness. Darkness at",
          "least implies the absence of light.",
          "This is the absence of absence",
          "itself. We have no word for it.'",
          "",
          "[ SIGNAL UNSTABLE ]",
        ],
      },
      {
        img: 1,
        station: "LAWCOURT · CH.7",
        lines: [
          "The judge ruled the contract had",
          "never legally existed. It carries",
          "no weight. No obligation. No force.",
          "It was as if it were written in",
          "smoke.",
          "",
          "'An agreement without valid",
          "consideration,' said the court,",
          "'is not merely broken. It never",
          "was. The law has one precise word",
          "for this condition.'",
          "",
          "[ END OF BROADCAST ]",
        ],
      },
      {
        img: 2,
        station: "CODE REVIEW · CH.11",
        lines: [
          "When a function performs work but",
          "has no value to return — not zero,",
          "not false, not an error — what",
          "type do we declare?",
          "",
          "Zero is a value. False is a value.",
          "Even null carries meaning.",
          "",
          "There is a keyword, present in C,",
          "C++, Java, Swift, and dozens more,",
          "reserved for the complete absence",
          "of any return.",
          "",
          ">  type: ________",
        ],
      },
      {
        img: 3,
        station: "SCIENCE FOUND. · CH.15",
        lines: [
          "Remove all matter. Remove all",
          "energy. Extract every photon.",
          "Lower temperature to absolute",
          "zero. Isolate completely.",
          "",
          "What remains?",
          "",
          "Physicists expected nothing.",
          "What they found: quantum foam,",
          "fluctuations in what should have",
          "been perfect absence.",
          "",
          "Even emptiness has structure.",
          "We still use the same old word.",
        ],
      },
    ];
  }

  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);
    // Phaser never calls shutdown() by itself — wire it to the scene event
    this.events.once("shutdown", () => this.shutdown());

    this.isSolved   = false;
    this._channel   = 0;
    this._images    = [];
    this._dom       = null;

    this._W = this.cameras.main.width;
    this._H = this.cameras.main.height;

    // Dark room backdrop behind the (transparent) TV overlay
    this._bg = this.add.graphics().setDepth(0);
    this._drawBackdrop(this._W, this._H);

    this._ensureShaderDoodle();
    this._injectTV();
    this._loadImages();
    this._startAutoCycle();   // images (and their text) change automatically

    // Keyboard tuning as well as the knobs
    this._keyLeft  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this._keyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);

    this.events.on("canvas_resized", ({ width, height }) => {
      this._W = width; this._H = height;
      this._drawBackdrop(width, height);
      this._layoutTV();
    });
  }

  update() {
    if (this.isSolved) return;
    if (Phaser.Input.Keyboard.JustDown(this._keyLeft))  this._tune(-1);
    if (Phaser.Input.Keyboard.JustDown(this._keyRight)) this._tune(+1);
  }

  // ── Dark room backdrop ────────────────────────────────────────────────────────

  _drawBackdrop(W, H) {
    const g = this._bg;
    g.clear();
    g.fillGradientStyle(0x0c0912, 0x0c0912, 0x050308, 0x050308, 1);
    g.fillRect(0, 0, W, H);
    for (let i = 8; i >= 1; i--) {
      g.fillStyle(0x1a1428, 0.035);
      g.fillEllipse(W / 2, H * 0.48, W * (0.28 + i * 0.08), H * (0.24 + i * 0.07));
    }
    for (let i = 0; i < 6; i++) {
      g.fillStyle(0x000000, 0.06);
      const t = (6 - i) * 16;
      g.fillRect(0, 0, t, H); g.fillRect(W - t, 0, t, H);
      g.fillRect(0, 0, W, t * 0.6); g.fillRect(0, H - t * 0.6, W, t * 0.6);
    }
  }

  // ── Load the shader-doodle web-component library once ─────────────────────────

  _ensureShaderDoodle() {
    if (window.customElements && customElements.get("shader-doodle")) return;
    if (document.querySelector('script[src*="shader-doodle"]')) return;
    const s = document.createElement("script");
    s.src = DEADAIR_SD_LIB;
    document.head.appendChild(s);
  }

  // ── Build the TV as a DOM overlay ─────────────────────────────────────────────

  _injectTV() {
    this._removeDOM();

    const style = document.createElement("style");
    style.id = "da-style";
    style.className = "scene-dom-overlay";
    style.textContent = `
#da-overlay{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:5;}
#da-overlay *{box-sizing:border-box;}

#da-overlay .tv-wrapper{position:absolute;top:50%;left:50%;width:600px;
  transform:translate(-50%,-50%) scale(var(--da-s,1));}

#da-overlay .tv{position:relative;padding-top:80%;background:#443b3b;
  border-radius:2px;border:2px solid #6d5e5e;
  box-shadow:inset 0 0 18px 0 rgba(0,0,0,.5),0 0 0 6px #443b3b;}

#da-overlay .tv::after{content:"";position:absolute;display:block;
  top:7%;left:6%;right:6%;bottom:19%;z-index:1;border-radius:4px;
  border:2px solid #897575;
  background:
    linear-gradient(0deg,transparent,#0d0c0c,transparent),
    linear-gradient(34deg,transparent 45%,#7c6969,transparent 55%),
    linear-gradient(90deg,transparent,#0d0c0c,transparent),
    linear-gradient(145deg,transparent 45%,#7c6969,transparent 55%);
  box-shadow:inset 0 0 6px 0 rgba(0,0,0,.2),0 0 18px 0 rgba(0,0,0,.5);}

#da-overlay .tv::before{content:"";position:absolute;
  top:10%;left:10.1%;right:10.1%;bottom:22%;background:#050205;opacity:.8;
  z-index:2;border-radius:18%;box-shadow:0 0 2px 0 rgba(0,0,0,.5);}

#da-overlay .tv__screen{position:absolute;top:12%;left:12%;right:12%;bottom:24%;
  border-radius:16%;overflow:hidden;z-index:2;background:#050205;}
#da-overlay .tv__screen shader-doodle{position:absolute;top:50%;left:50%;
  width:480px;height:320px;transform:translate(-50%,-50%);z-index:2;}

#da-overlay .tv__fallback{position:absolute;inset:0;width:100%;height:100%;
  object-fit:cover;z-index:1;display:none;filter:contrast(1.08) brightness(.85);}
#da-overlay .tv__fallback.show{display:block;}

#da-overlay .tv__scan{position:absolute;inset:0;z-index:3;pointer-events:none;
  background:repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0 1px,transparent 1px 3px);
  mix-blend-mode:multiply;opacity:.5;}

/* Caption container is transparent; ONLY the title carries a dark band.
   Pushed down a bit so the title clears the screen's rounded top edge. */
#da-overlay .tv__caption{position:absolute;top:11%;left:0;right:0;z-index:4;
  font-family:"Courier New",monospace;text-align:left;overflow:hidden;max-height:70%;}
/* News title — full-width dark band, 50% faded */
#da-overlay .tv__caption .st{display:block;background:rgba(0,0,0,.5);
  color:#fff;font-weight:bold;font-size:13px;letter-spacing:1px;
  padding:9px 16px;text-shadow:0 1px 3px #000;}
/* Body reads directly over the picture (no band) */
#da-overlay .tv__caption .bd{white-space:pre-wrap;color:#f2f2f2;
  font-size:11px;line-height:1.3;padding:8px 16px;
  text-shadow:0 1px 2px #000,0 0 5px rgba(0,0,0,.95);}

#da-overlay .tv__panel{position:absolute;left:0;right:0;bottom:0;display:flex;
  height:12%;padding:0 6%;justify-content:space-between;align-items:center;z-index:3;}
#da-overlay .tv__switch{flex:0 0 auto;width:6%;margin:0 2.6%;position:relative;
  align-self:center;}
#da-overlay .tv__switch::before{content:"";display:block;padding-top:100%;
  border-radius:50%;
  background:linear-gradient(120deg,#646570,#a2a3ac,#646570);
  box-shadow:inset 0 0 4px 1px #9798a3,0 0 8px 1px rgba(0,0,0,.42);}
#da-overlay .tv__switch.da-btn{pointer-events:auto;cursor:pointer;}
#da-overlay .tv__switch.da-btn:hover::before{box-shadow:inset 0 0 4px 1px #c8c9d2,0 0 10px 2px rgba(0,0,0,.5);}
#da-overlay .tv__switch.da-btn:active{transform:translateY(1px);}
#da-overlay .tv__switch .da-arrow{position:absolute;inset:0;display:flex;
  align-items:center;justify-content:center;color:#1c1e26;font-weight:bold;
  font-size:13px;z-index:2;pointer-events:none;}

#da-overlay .tv__speaker{margin-top:-4.2%;height:118%;width:29%;
  background-image:repeating-linear-gradient(90deg,transparent,#000 2%,#000 4%,transparent 4%,transparent 8%);}

#da-overlay .tv__holders{position:absolute;bottom:-18px;left:0;right:0;display:flex;
  justify-content:space-between;padding:0 20px;}
#da-overlay .tv__holder{width:30px;height:10px;
  background:linear-gradient(90deg,#101010,#434343,#101010);}
`;
    document.head.appendChild(style);

    const overlay = document.createElement("div");
    overlay.id = "da-overlay";
    overlay.className = "scene-dom-overlay";
    overlay.innerHTML = `
      <div class="tv-wrapper">
        <div class="tv">
          <canvas id="da-buffer" width="640" height="480" hidden></canvas>
          <div class="tv__screen">
            <canvas class="tv__fallback" id="da-fallback" width="640" height="480"></canvas>
            <shader-doodle shadertoy>
              <sd-texture id="da-texture" src="#da-buffer" name="iTexture0" force-update></sd-texture>
              <script type="x-shader/x-fragment">${DEADAIR_SHADER}</script>
            </shader-doodle>
            <div class="tv__scan"></div>
            <div class="tv__caption">
              <span class="st"></span>
              <div class="bd"></div>
            </div>
          </div>
          <div class="tv__panel">
            <div class="tv__speaker"></div>
            <div class="tv__switch da-btn" data-dir="-1"><span class="da-arrow">&#8249;</span></div>
            <div class="tv__switch"></div>
            <div class="tv__switch da-btn" data-dir="1"><span class="da-arrow">&#8250;</span></div>
            <div class="tv__speaker"></div>
          </div>
          <div class="tv__holders">
            <div class="tv__holder"></div>
            <div class="tv__holder"></div>
          </div>
        </div>
      </div>
    `;
    document.getElementById("game-container").appendChild(overlay);

    this._dom = {
      overlay, style,
      wrapper:  overlay.querySelector(".tv-wrapper"),
      buffer:   overlay.querySelector("#da-buffer"),
      fallback: overlay.querySelector("#da-fallback"),
      st:       overlay.querySelector(".tv__caption .st"),
      bd:       overlay.querySelector(".tv__caption .bd"),
    };

    // Wire the two outer knobs → previous / next channel
    overlay.querySelectorAll(".da-btn").forEach((btn) => {
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        this._tune(parseInt(btn.dataset.dir, 10));
      });
    });

    this._renderChannel();
    this._layoutTV();

    // If shader-doodle never upgrades (offline / lib blocked), reveal the plain image
    this.time.delayedCall(1600, () => {
      if (!this._dom) return;
      const sd = this._dom.overlay.querySelector("shader-doodle");
      const ok = sd && sd.querySelector("canvas");
      if (!ok) this._dom.fallback.classList.add("show");
    });
  }

  _removeDOM() {
    if (this._dom) {
      if (this._dom.overlay) this._dom.overlay.remove();
      if (this._dom.style)   this._dom.style.remove();
      this._dom = null;
    } else {
      document.getElementById("da-overlay")?.remove();
      document.getElementById("da-style")?.remove();
    }
  }

  // ── Fit the TV to the current canvas size ─────────────────────────────────────

  _layoutTV() {
    if (!this._dom) return;
    const baseW = 616, baseH = 520;   // wrapper footprint incl. border / holders
    const s = Phaser.Math.Clamp(
      Math.min((this._W * 0.94) / baseW, (this._H * 0.94) / baseH),
      0.35, 1.3
    );
    this._dom.wrapper.style.setProperty("--da-s", s.toFixed(3));
  }

  // ── Channel images → CRT buffer ───────────────────────────────────────────────

  _loadImages() {
    Promise.all(
      DEADAIR_IMAGES.map((url) => new Promise((res) => {
        const im = new Image();   // local same-origin images — no crossOrigin needed
        im.onload  = () => res(im);
        im.onerror = () => res(null);
        im.src = url;
      }))
    ).then((imgs) => {
      this._images = imgs;
      this._drawBuffer();
    });
  }

  _drawBuffer() {
    if (!this._dom) return;
    const ch  = this._CHANNELS[this._channel];
    const img = this._images[ch.img];
    [this._dom.buffer, this._dom.fallback].forEach((cv) => {
      if (!cv) return;
      const cx = cv.getContext("2d");
      cx.fillStyle = "#050205";
      cx.fillRect(0, 0, cv.width, cv.height);
      if (img) cx.drawImage(img, 0, 0, cv.width, cv.height);
    });
  }

  _renderChannel() {
    if (!this._dom) return;
    const ch = this._CHANNELS[this._channel];
    if (ch.station) {
      this._dom.st.style.display = "block";
      this._dom.st.textContent = ch.station;
    } else {
      this._dom.st.style.display = "none";
    }
    this._dom.bd.textContent = ch.lines.join("\n");
    this._drawBuffer();
  }

  _changeChannel(delta) {
    if (this.isSolved) return;
    const n = this._CHANNELS.length;
    this._channel = ((this._channel + delta) % n + n) % n;
    this._renderChannel();
    this._playStatic();   // TV "bzzzt" on every program change
  }

  // TV static "bzzzt" on every channel change (auto or manual)
  _playStatic() {
    if (window.GameAudio && window.GameAudio.muted) return;
    try {
      if (this.cache.audio.exists("static")) {
        this.sound.play("static", {
          volume: (window.GameAudio ? window.GameAudio.sfxVol : 0.8) * 0.6,
        });
      }
    } catch (e) {}
  }

  // Auto-advance to the next image (and its text) every few seconds
  _startAutoCycle() {
    if (this._autoTimer) this._autoTimer.remove(false);
    this._autoTimer = this.time.addEvent({
      delay: 4000, loop: true, callback: () => this._changeChannel(1),
    });
  }

  // Manual tune (knob / arrow key): change channel and restart the auto clock
  _tune(delta) {
    this._changeChannel(delta);
    this._startAutoCycle();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  replay() {
    this._channel = 0;
    this._renderChannel();
  }

  transitionToLevel(nextKey, skipFade = false) {
    this.isSolved = true;
    if (this._autoTimer) this._autoTimer.remove(false);
    this._removeDOM();
    if (skipFade) { this.scene.start(nextKey, { skipFade: true }); return; }
    if (window.playSuccess) window.playSuccess(this);
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.stop();
      this.scene.start(nextKey, { skipFade: true });
    });
  }

  shutdown() {
    if (this._autoTimer) this._autoTimer.remove(false);
    this._removeDOM();
  }
}
