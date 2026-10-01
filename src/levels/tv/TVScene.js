import "./scene.css";
import Phaser from "phaser";
import "shader-doodle";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";
import { layoutParlour, paintParlour, releaseParlourArt } from "./parlour.js";
import { cabinetSVG, knobSVG, dialSVG } from "./cabinet.js";
import { makeSparkleTexture, twinkle, flicker } from "../../shared/glints.js";

// TV — CRT TV level built on a shader-doodle component (originally TV.html/css/js).
// The screen is a glitchy CRT broadcast: a shader samples cycling channel images.
// The left / right knobs on the TV change channel (prev / next). Each channel's
// broadcast is shown as white-on-black subtitles over the screen. All four channels
// describe VOID without ever naming it. Code: VOID / NULL.
//
// The set stands in a dark parlour at night, painted the way the telescope's
// nursery is (parlour.js): a walnut cabinet on splayed legs (cabinet.js, an
// SVG in the DOM overlay so it scales together with the screen), the screen's
// cold light flickering on the wall and the floor, a lamp lit on the side
// table, and dust glinting in the light. The screen itself — shader, images,
// scanlines, captions — is unchanged. The knobs turn when you use them, and
// the middle dial points at the channel.

// where the set stands: its centre, as a fraction of the screen's height
const TV_CENTRE_Y = 0.46;
const SPARKLE = "tv_sparkle";

// Channel images — sampled by the CRT shader as the broadcast picture.
// Order matches the channels below so each text sits on its own image.
const DEADAIR_IMAGES = [
  "assets/images/TV/astronomy.jpg", // 0 → COSMOS NET (supervoid)
  "assets/images/TV/court.jpg", // 1 → LAWCOURT
  "assets/images/TV/coding.jpg", // 2 → CODE REVIEW
  "assets/images/TV/science.jpg", // 3 → SCIENCE FOUND.
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

export default class TVScene extends BasePuzzleScene {
  constructor() {
    super({ key: "TV" });
  }

  init(data) {
    this.skipFadeIn =
      data && data.skipFade !== undefined ? data.skipFade : true;
  }

  preload() {
    this.load.audio("static", "assets/sounds/TV/staticsound.mp3");
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
    this.beginScene();

    this.isSolved = false;
    this._channel = 0;
    this._images = [];
    this._dom = null;
    this._knobRot = { "-1": 0, 1: 0 };

    this._W = this.cameras.main.width;
    this._H = this.cameras.main.height;

    // the room behind the (transparent) TV overlay
    this._room = null;
    this._buildRoom(this._W, this._H);

    this._injectTV();
    this._loadImages();
    this._startAutoCycle(); // images (and their text) change automatically

    // Keyboard tuning as well as the knobs. It listens for the key's "down"
    // event instead of polling JustDown() in update(): a quick tap that is
    // released within the same frame would otherwise be missed.
    this._keyLeft = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.LEFT,
    );
    this._keyRight = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
    );
    this._keyLeft.on("down", () => this._tune(-1));
    this._keyRight.on("down", () => this._tune(1));

    this.listenToResize(({ width, height }) => {
      this._W = width;
      this._H = height;
      this._buildRoom(width, height);
      this._layoutTV();
    });
  }

  // ── The parlour ───────────────────────────────────────────────────────────────

  // how big the set is, and where it stands, for this screen
  _tvBox(W, H) {
    const s = Phaser.Math.Clamp(
      Math.min((W * 0.72) / 616, (H * 0.72) / 600),
      0.35,
      1.1,
    );
    return { cx: W / 2, cy: H * TV_CENTRE_Y, s };
  }

  // the room is painted again from scratch for every size; everything that
  // lives in it (the lights, the dust) is made again on top
  _buildRoom(W, H) {
    this._clearRoom();
    const L = layoutParlour(W, H, this._tvBox(W, H));
    const art = paintParlour(this, L);
    makeSparkleTexture(this.textures, SPARKLE, "214,228,255");
    const { cx, cy, s, feet, lamp } = L;
    const made = [];

    made.push(this.add.image(0, 0, art.room).setOrigin(0, 0).setDepth(0));

    // the screen's light: on the wall round the set, and lying on the floor
    // in front of it; it flickers the way a tube does
    const light = this.add
      .image(cx, cy - 10 * s, art.light)
      .setDisplaySize(1100 * s, 820 * s)
      .setBlendMode("ADD")
      .setDepth(1)
      .setAlpha(0.5);
    const pool = this.add
      .image(cx, feet + 24 * s, art.pool)
      .setDisplaySize(760 * s, 190 * s)
      .setBlendMode("ADD")
      .setDepth(2)
      .setAlpha(0.5);
    made.push(light, pool);
    this._screenLight = [light, pool];
    this._stopFlicker = this.ambientMotion
      ? this._flickerScreen()
      : null;

    // the lamp on the side table, breathing a little
    const glow = this.add
      .image(lamp.x, lamp.y + 10 * s, art.glow)
      .setDisplaySize(300 * s, 300 * s)
      .setBlendMode("ADD")
      .setDepth(1)
      .setAlpha(0.55);
    made.push(glow);
    this.ambientTween({
      targets: glow,
      alpha: 0.7,
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // dust glinting in the screen's light, in front of and beside the set
    const rnd = this._rng(8080);
    const pts = [];
    for (let i = 0; i < 18; i++) {
      const below = rnd() < 0.7;
      pts.push({
        x: cx + (rnd() - 0.5) * 820 * s,
        y: below
          ? cy + 200 * s + rnd() * 150 * s
          : cy - 300 * s + rnd() * 70 * s,
        size: (6 + rnd() * 10) * s,
      });
    }
    made.push(...twinkle(this, SPARKLE, pts, rnd, { depth: 3, alpha: 0.8 }));

    this._room = { made, L };
  }

  _flickerScreen() {
    const stops = this._screenLight.map((img) =>
      flicker(this, img, 0.34, 0.6, 0.8),
    );
    return () => stops.forEach((stop) => stop());
  }

  // the static burst on a channel change throws a brighter light for a moment
  _flashScreen() {
    if (!this._screenLight || !this.ambientMotion) return;
    for (const img of this._screenLight) {
      if (!img.active) continue;
      this.tweens.add({
        targets: img,
        alpha: 0.9,
        duration: 60,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    }
  }

  _clearRoom() {
    if (this._stopFlicker) {
      this._stopFlicker();
      this._stopFlicker = null;
    }
    if (this._room) {
      for (const obj of this._room.made) {
        this.tweens.killTweensOf(obj);
        obj.destroy();
      }
      this._room = null;
    }
    this._screenLight = null;
    releaseParlourArt(this.textures);
    if (this.textures.exists(SPARKLE)) this.textures.remove(SPARKLE);
  }

  // ── Build the TV as a DOM overlay ─────────────────────────────────────────────

  _injectTV() {
    this._removeDOM();

    const overlay = document.createElement("div");
    overlay.id = "da-overlay";
    overlay.className = "scene-dom-overlay";
    overlay.innerHTML = `
      <div class="tv-wrapper">
        <div class="tv">
          ${cabinetSVG(8080)}
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
          <button type="button" class="da-knob da-btn" data-dir="-1" aria-label="Previous channel" style="left:228px">${knobSVG("&#8249;")}</button>
          <div class="da-dial" style="left:278px">${dialSVG()}</div>
          <button type="button" class="da-knob da-btn" data-dir="1" aria-label="Next channel" style="left:328px">${knobSVG("&#8250;")}</button>
        </div>
      </div>
    `;
    document.getElementById("game-container").appendChild(overlay);
    this.ownDom(overlay);

    this._dom = {
      overlay,
      wrapper: overlay.querySelector(".tv-wrapper"),
      buffer: overlay.querySelector("#da-buffer"),
      fallback: overlay.querySelector("#da-fallback"),
      st: overlay.querySelector(".tv__caption .st"),
      bd: overlay.querySelector(".tv__caption .bd"),
      needle: overlay.querySelector(".da-dial .needle"),
      knobs: {
        "-1": overlay.querySelector('.da-knob[data-dir="-1"] .rot'),
        1: overlay.querySelector('.da-knob[data-dir="1"] .rot'),
      },
    };

    // Wire the two outer knobs → previous / next channel
    overlay.querySelectorAll(".da-btn").forEach((btn) => {
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        this._tune(parseInt(btn.dataset.dir, 10));
      });
      btn.addEventListener("click", (e) => {
        if (e.detail === 0) this._tune(parseInt(btn.dataset.dir, 10));
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

  // DOM scenes provide their rendered screen for the room's progress thumbnail.
  get previewSource() { return this._dom?.fallback; }

  _removeDOM() {
    if (this._dom) {
      if (this._dom.overlay) this._dom.overlay.remove();
      this._dom = null;
    } else {
      document.getElementById("da-overlay")?.remove();
    }
  }

  // ── Fit the TV to the current canvas size ─────────────────────────────────────

  _layoutTV() {
    if (!this._dom) return;
    // the set stands exactly where the painted room expects it
    const { s } = this._tvBox(this._W, this._H);
    this._dom.wrapper.style.setProperty("--da-s", s.toFixed(3));
    this._dom.wrapper.style.setProperty("--da-y", `${TV_CENTRE_Y * 100}%`);
  }

  // ── Channel images → CRT buffer ───────────────────────────────────────────────

  _loadImages() {
    Promise.all(
      DEADAIR_IMAGES.map(
        (url) =>
          new Promise((res) => {
            const im = new Image(); // local same-origin images — no crossOrigin needed
            im.onload = () => res(im);
            im.onerror = () => res(null);
            im.src = url;
          }),
      ),
    ).then((imgs) => {
      this._images = imgs;
      this._drawBuffer();
    });
  }

  _drawBuffer() {
    if (!this._dom) return;
    const ch = this._CHANNELS[this._channel];
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
    // the dial's needle swings to the current channel
    if (this._dom.needle) {
      this._dom.needle.style.transform = `rotate(${-54 + this._channel * 36}deg)`;
    }
    this._drawBuffer();
  }

  _changeChannel(delta) {
    if (this.isSolved) return;
    const n = this._CHANNELS.length;
    this._channel = (((this._channel + delta) % n) + n) % n;
    this._renderChannel();
    this._playStatic(); // TV "bzzzt" on every program change
  }

  // TV static "bzzzt" on every channel change (auto or manual)
  _playStatic() {
    this.services.audio.playSfx("static", 0.6, this);
    this._flashScreen();
  }

  // Auto-advance to the next image (and its text) every few seconds
  _startAutoCycle() {
    if (this._autoTimer) this._autoTimer.remove(false);
    this._autoTimer = this.time.addEvent({
      delay: 4000,
      loop: true,
      callback: () => this._changeChannel(1),
    });
  }

  // the knob you used turns a notch (left one anticlockwise, right one clockwise)
  _turnKnob(delta) {
    if (!this._dom || !this._dom.knobs) return;
    const key = delta < 0 ? "-1" : "1";
    const g = this._dom.knobs[key];
    if (!g) return;
    this._knobRot[key] += delta * 40;
    g.style.transform = `rotate(${this._knobRot[key]}deg)`;
  }

  // Manual tune (knob / arrow key): change channel and restart the auto clock
  _tune(delta) {
    if (this.isSolved) return;
    this._turnKnob(delta);
    this._changeChannel(delta);
    this._startAutoCycle();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  replay() {
    this._channel = 0;
    this._renderChannel();
  }

  shutdown() {
    if (this._autoTimer) this._autoTimer.remove(false);
    this._clearRoom();
    this._removeDOM();
  }
}
