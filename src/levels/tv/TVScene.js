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
// The set stands in a dark parlour at night (parlour.js): walls of deep walnut,
// tall windows on a moonlit valley with their sheer curtains tied open, a
// walnut cabinet on splayed legs (cabinet.js, an SVG in the DOM overlay so it
// scales together with the screen), the screen's cold light flickering on the
// wall and the floor, a lamp lit on the side table, dust glinting in the light.
// The screen itself — shader, images, scanlines, captions — is unchanged. The
// knobs turn when you use them, and the middle dial points at the channel.
//
// On a phone the set would be too small to read the captions in it, so they
// move into a card of their own: under the set when the phone is upright,
// beside it when it is on its side (see _tvBox).

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
    // released within the same frame would otherwise be missed. (Phones have
    // no keyboard manager.)
    if (this.input.keyboard) {
      this._keyLeft = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.LEFT,
      );
      this._keyRight = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
      );
      this._keyLeft.on("down", () => this._tune(-1));
      this._keyRight.on("down", () => this._tune(1));
    }

    this.listenToResize(({ width, height }) => {
      this._W = width;
      this._H = height;
      this._buildRoom(width, height);
      this._layoutTV();
    });
  }

  // ── The parlour ───────────────────────────────────────────────────────────────

  // How big the set is, and where it stands, for this screen. On a screen
  // big enough to read the captions inside the tube it stands in the middle
  // ("wide"). Otherwise the captions get a card of their own: a phone held
  // upright ("tall") has the set near the top and the card under it; one on
  // its side ("low") has the set on the left and the card on the right.
  _tvBox(W, H) {
    const wide = Phaser.Math.Clamp(
      Math.min((W * 0.72) / 616, (H * 0.72) / 600),
      0.35,
      1.1,
    );
    if (wide >= 0.77) return { mode: "wide", cx: W / 2, cy: H * 0.46, s: wide };
    if (H >= W) {
      const s = Phaser.Math.Clamp(
        Math.min((W * 0.92) / 616, (H * 0.44) / 600),
        0.3,
        1.1,
      );
      const cy = Math.max(H * 0.28, 56 + 252 * s);
      const top = cy + 330 * s + 10;
      return {
        mode: "tall",
        cx: W / 2,
        cy,
        s,
        subs: {
          x: W * 0.05,
          y: top,
          w: W * 0.9,
          h: Math.max(80, H - top - 14),
        },
      };
    }
    const s = Phaser.Math.Clamp(
      Math.min((W * 0.5) / 616, (H * 0.78) / 600),
      0.3,
      1.1,
    );
    const cx = Math.max(300 * s + 12, W * 0.28);
    const x = cx + 312 * s + W * 0.03;
    return {
      mode: "low",
      cx,
      cy: H * 0.48,
      s,
      subs: { x, y: H * 0.1, w: W - x - W * 0.03, h: H * 0.8 },
    };
  }

  // the room is painted again from scratch for every size; everything that
  // lives in it (the lights, the dust) is made again on top
  _buildRoom(W, H) {
    this._clearRoom();
    const box = this._tvBox(W, H);
    this._box = box;
    const L = layoutParlour(W, H, box);
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
      .setAlpha(0.45);
    const pool = this.add
      .image(cx, feet + 24 * s, art.pool)
      .setDisplaySize(760 * s, 190 * s)
      .setBlendMode("ADD")
      .setDepth(2)
      .setAlpha(0.45);
    made.push(light, pool);
    this._screenLight = [light, pool];
    this._stopFlicker = this.ambientMotion ? this._flickerScreen() : null;

    // the lamp on the side table, breathing a little (when there's room for it)
    if (lamp) {
      const glow = this.add
        .image(lamp.x, lamp.y + 10 * s, art.glow)
        .setDisplaySize(300 * s, 300 * s)
        .setBlendMode("ADD")
        .setDepth(1)
        .setAlpha(0.5);
      made.push(glow);
      this.ambientTween({
        targets: glow,
        alpha: 0.65,
        duration: 2600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }

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
    made.push(...twinkle(this, SPARKLE, pts, rnd, { depth: 3, alpha: 0.7 }));

    this._room = { made, L };
  }

  _flickerScreen() {
    const stops = this._screenLight.map((img) =>
      flicker(this, img, 0.3, 0.55, 0.8),
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
        alpha: 0.85,
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
      <div class="da-subs" aria-live="polite">
        <span class="st"></span>
        <div class="bd"></div>
      </div>
    `;
    document.getElementById("game-container").appendChild(overlay);
    this.ownDom(overlay);

    this._dom = {
      overlay,
      wrapper: overlay.querySelector(".tv-wrapper"),
      buffer: overlay.querySelector("#da-buffer"),
      fallback: overlay.querySelector("#da-fallback"),
      // the captions are written in two places: inside the tube, and in the
      // card a phone shows instead (CSS shows one or the other)
      st: overlay.querySelectorAll(".tv__caption .st, .da-subs .st"),
      bd: overlay.querySelectorAll(".tv__caption .bd, .da-subs .bd"),
      subs: overlay.querySelector(".da-subs"),
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
  get previewSource() {
    return this._dom?.fallback;
  }

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
    const box = this._box || this._tvBox(this._W, this._H);
    const { cx, cy, s, mode, subs } = box;
    const st = this._dom.wrapper.style;
    st.setProperty("--da-s", s.toFixed(3));
    st.setProperty("--da-x", `${((cx / this._W) * 100).toFixed(3)}%`);
    st.setProperty("--da-y", `${((cy / this._H) * 100).toFixed(3)}%`);
    const compact = mode !== "wide";
    this._dom.overlay.classList.toggle("da-compact", compact);
    if (compact && subs) {
      const card = this._dom.subs.style;
      card.left = `${((subs.x / this._W) * 100).toFixed(3)}%`;
      card.top = `${((subs.y / this._H) * 100).toFixed(3)}%`;
      card.width = `${((subs.w / this._W) * 100).toFixed(3)}%`;
      card.maxHeight = `${((subs.h / this._H) * 100).toFixed(3)}%`;
    }
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
    for (const el of this._dom.st) {
      el.style.display = ch.station ? "block" : "none";
      el.textContent = ch.station || "";
    }
    const body = ch.lines.join("\n");
    for (const el of this._dom.bd) el.textContent = body;
    if (this._dom.subs) this._dom.subs.scrollTop = 0;
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

  // Auto-advance to the next image (and its text) every few seconds. On a
  // phone the captions are read in their card at a slower pace, so it waits
  // longer there.
  _startAutoCycle() {
    if (this._autoTimer) this._autoTimer.remove(false);
    const compact = this._box && this._box.mode !== "wide";
    this._autoTimer = this.time.addEvent({
      delay: compact ? 7000 : 4000,
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
