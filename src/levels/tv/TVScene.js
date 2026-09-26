import "./scene.css";
import Phaser from "phaser";
import "shader-doodle";
import BasePuzzleScene from "../../core/BasePuzzleScene.js";

// TV — CRT TV level built on a shader-doodle component (originally TV.html/css/js).
// The screen is a glitchy CRT broadcast: a shader samples cycling channel images.
// The left / right knobs on the TV change channel (prev / next). Each channel's
// broadcast is shown as white-on-black subtitles over the screen. All four channels
// describe VOID without ever naming it. Code: VOID / NULL.
//
// The TV cabinet is drawn in pencil like the rest of the game: an SVG built in
// code (jittered, doubled strokes), so it scales together with the screen.
// The screen itself — shader, images, scanlines, captions — is unchanged.
// The knobs turn when you use them, and the middle dial points at the channel.

const DEADAIR_INK = "#d8d2c4"; // the pencil itself

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

    // Dark room backdrop behind the (transparent) TV overlay
    this._bg = this.add.graphics().setDepth(0);
    this._drawBackdrop(this._W, this._H);

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
      this._drawBackdrop(width, height);
      this._layoutTV();
    });
  }

  // ── Dark room backdrop ────────────────────────────────────────────────────────

  _drawBackdrop(W, H) {
    const g = this._bg;
    g.clear();
    g.fillGradientStyle(0x0c0912, 0x0c0912, 0x050308, 0x050308, 1);
    g.fillRect(0, 0, W, H);
    for (let i = 8; i >= 1; i--) {
      g.fillStyle(0x1a1428, 0.035);
      g.fillEllipse(
        W / 2,
        H * 0.48,
        W * (0.28 + i * 0.08),
        H * (0.24 + i * 0.07),
      );
    }
    for (let i = 0; i < 6; i++) {
      g.fillStyle(0x000000, 0.06);
      const t = (6 - i) * 16;
      g.fillRect(0, 0, t, H);
      g.fillRect(W - t, 0, t, H);
      g.fillRect(0, 0, W, t * 0.6);
      g.fillRect(0, H - t * 0.6, W, t * 0.6);
    }
  }

  // ── The pencil, for SVG: jittered, doubled strokes ────────────────────────────

  _svgSketch(seed) {
    let s = seed;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const f = (n) => n.toFixed(1);

    const jitterPath = (pts, mag, closed) => {
      let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
      const n = closed ? pts.length : pts.length - 1;
      for (let i = 0; i < n; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const steps = Math.max(1, Math.min(4, Math.round(len / 40)));
        for (let k = 1; k <= steps; k++) {
          const t = k / steps;
          const off = k === steps ? 0 : (rnd() - 0.5) * 2 * mag;
          d += ` L${f(a.x + dx * t + nx * off)} ${f(a.y + dy * t + ny * off)}`;
        }
      }
      return d;
    };

    // the main stroke plus a faint offset one, like a pencil going twice
    const stroke = (
      pts,
      { w = 1.4, a = 0.7, mag = 0.8, closed = false } = {},
    ) => {
      const d1 = jitterPath(pts, mag, closed);
      const d2 = jitterPath(
        pts.map((p) => ({ x: p.x + 1.1, y: p.y + 0.9 })),
        mag,
        closed,
      );
      return (
        `<path d="${d1}" fill="none" stroke="${DEADAIR_INK}" stroke-width="${f(w)}" stroke-opacity="${a}" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="${d2}" fill="none" stroke="${DEADAIR_INK}" stroke-width="${f(w * 0.6)}" stroke-opacity="${f(a * 0.35)}" stroke-linecap="round" stroke-linejoin="round"/>`
      );
    };

    const fillPath = (pts, color, opacity = 1) =>
      `<path d="M${pts.map((p) => `${f(p.x)} ${f(p.y)}`).join(" L")} Z" fill="${color}" fill-opacity="${opacity}"/>`;

    // rounded rectangle, corners may be elliptical (rx ≠ ry)
    const rrPts = (x, y, w, h, rx, ry = rx, seg = 6) => {
      const pts = [];
      const arc = (cx, cy, a0) => {
        for (let i = 0; i <= seg; i++) {
          const a = a0 + (Math.PI / 2) * (i / seg);
          pts.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
        }
      };
      arc(x + w - rx, y + ry, -Math.PI / 2);
      arc(x + w - rx, y + h - ry, 0);
      arc(x + rx, y + h - ry, Math.PI / 2);
      arc(x + rx, y + ry, Math.PI);
      return pts;
    };

    const circlePts = (cx, cy, r, n = 24) =>
      Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
      });

    return { rnd, stroke, fillPath, rrPts, circlePts };
  }

  // The TV cabinet, in the .tv box's own 600×480 coordinates
  _tvSketchSVG() {
    const sk = this._svgSketch(8080);
    const out = [];
    const rr = sk.rrPts;

    out.push(`<defs>
      <radialGradient id="da-floor" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#000" stop-opacity=".6"/>
        <stop offset="1" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="da-led" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#ff6a4d" stop-opacity=".55"/>
        <stop offset="1" stop-color="#ff6a4d" stop-opacity="0"/>
      </radialGradient>
    </defs>`);

    // shadow on the floor and the two feet
    out.push(
      `<ellipse cx="300" cy="498" rx="318" ry="18" fill="url(#da-floor)"/>`,
    );
    for (const fx of [70, 490]) {
      const foot = [
        { x: fx, y: 476 },
        { x: fx + 40, y: 476 },
        { x: fx + 34, y: 499 },
        { x: fx + 6, y: 499 },
      ];
      out.push(sk.fillPath(foot, "#101113"));
      out.push(sk.stroke(foot, { w: 1.3, a: 0.55, mag: 0.4, closed: true }));
    }

    // the cabinet, with a little pencil wood grain
    const cab = rr(0, 0, 600, 480, 18);
    out.push(sk.fillPath(cab, "#1a1816"));
    for (let i = 0; i < 14; i++) {
      const y0 = 14 + i * 33 + (sk.rnd() - 0.5) * 6;
      const amp = 1.5 + sk.rnd() * 2.5;
      const ph = sk.rnd() * 6.28;
      const pts = [];
      for (let x = 14; x <= 586; x += 44)
        pts.push({ x, y: y0 + Math.sin(x * 0.012 + ph) * amp });
      out.push(sk.stroke(pts, { w: 1, a: 0.05, mag: 0.6 }));
    }
    out.push(sk.stroke(cab, { w: 2.2, a: 0.75, mag: 1, closed: true }));
    out.push(
      sk.stroke(rr(9, 9, 582, 462, 12), {
        w: 1,
        a: 0.22,
        mag: 0.8,
        closed: true,
      }),
    );

    // the bezel around the tube
    const bezel = rr(36, 34, 528, 355, 6);
    out.push(sk.fillPath(bezel, "#121214"));
    out.push(sk.stroke(bezel, { w: 1.7, a: 0.62, mag: 0.8, closed: true }));
    out.push(
      sk.stroke(rr(43, 41, 514, 341, 4), {
        w: 1,
        a: 0.22,
        mag: 0.6,
        closed: true,
      }),
    );

    // the dark tube surround (curved corners, like a CRT)
    const tube = rr(60, 48, 480, 326, 86, 59);
    out.push(sk.fillPath(tube, "#070608", 0.95));
    out.push(sk.stroke(tube, { w: 1.2, a: 0.35, mag: 0.6, closed: true }));
    // bevel strokes from the bezel's corners into the tube
    for (const [ax, ay, bx, by] of [
      [42, 40, 76, 62],
      [558, 40, 524, 62],
      [42, 383, 76, 360],
      [558, 383, 524, 360],
    ])
      out.push(
        sk.stroke(
          [
            { x: ax, y: ay },
            { x: bx, y: by },
          ],
          { w: 1, a: 0.28, mag: 0.3 },
        ),
      );

    // the glass edge, hugging the screen (same 16% curved corners)
    out.push(
      sk.stroke(rr(69, 54.6, 462, 313.2, 74, 50), {
        w: 1.7,
        a: 0.72,
        mag: 0.6,
        closed: true,
      }),
    );
    out.push(
      sk.stroke(rr(64, 50.5, 472, 321.5, 78, 53), {
        w: 1,
        a: 0.25,
        mag: 0.6,
        closed: true,
      }),
    );

    // control panel: a ruled line, two speaker grilles, knob sockets, power LED
    out.push(
      sk.stroke(
        [
          { x: 36, y: 398 },
          { x: 564, y: 398 },
        ],
        { w: 1, a: 0.2, mag: 1 },
      ),
    );
    for (const sx of [44, 396]) {
      const grille = rr(sx, 407, 160, 52, 10);
      out.push(sk.fillPath(grille, "#111214"));
      for (let x = sx + 12; x < sx + 150; x += 9) {
        out.push(
          `<rect x="${x}" y="415" width="3.2" height="36" rx="1.6" fill="#060708"/>`,
        );
        out.push(
          sk.stroke(
            [
              { x: x + 4.2, y: 416 },
              { x: x + 4.2, y: 450 },
            ],
            { w: 0.8, a: 0.14, mag: 0.2 },
          ),
        );
      }
      out.push(sk.stroke(grille, { w: 1.4, a: 0.5, mag: 0.6, closed: true }));
    }
    for (const kx of [250, 300, 350]) {
      out.push(`<circle cx="${kx}" cy="433" r="24" fill="#0f1012"/>`);
      out.push(
        sk.stroke(sk.circlePts(kx, 433, 24, 26), {
          w: 1,
          a: 0.3,
          mag: 0.3,
          closed: true,
        }),
      );
    }
    out.push(`<circle cx="578" cy="433" r="10" fill="url(#da-led)"/>`);
    out.push(`<circle cx="578" cy="433" r="3.4" fill="#d24b3c"/>`);
    out.push(
      sk.stroke(sk.circlePts(578, 433, 5, 12), {
        w: 0.9,
        a: 0.45,
        mag: 0.2,
        closed: true,
      }),
    );

    return `<svg class="tv__sketch" viewBox="-12 -12 624 528" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${out.join("")}</svg>`;
  }

  // A turning knob (the arrow stays upright, the knob itself rotates)
  _knobSVG(arrow, seed) {
    const sk = this._svgSketch(seed);
    let rot = `<circle r="19" fill="#17181c"/>`;
    rot += sk.stroke(sk.circlePts(0, 0, 19, 22), {
      w: 1.6,
      a: 0.8,
      mag: 0.4,
      closed: true,
    });
    rot += sk.stroke(sk.circlePts(0, 0, 12, 16), {
      w: 1,
      a: 0.3,
      mag: 0.3,
      closed: true,
    });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rot += sk.stroke(
        [
          { x: Math.cos(a) * 14.5, y: Math.sin(a) * 14.5 },
          { x: Math.cos(a) * 18, y: Math.sin(a) * 18 },
        ],
        { w: 1, a: 0.3, mag: 0.1 },
      );
    }
    rot += sk.stroke(
      [
        { x: 0, y: -7 },
        { x: 0, y: -16 },
      ],
      { w: 2.2, a: 0.9, mag: 0.2 },
    );
    return (
      `<svg viewBox="-24 -24 48 48" xmlns="http://www.w3.org/2000/svg">` +
      `<g class="rot">${rot}</g>` +
      `<text x="0" y="3.5" text-anchor="middle" font-family="'Special Elite', monospace" font-size="15" fill="#e8dcc0">${arrow}</text>` +
      `</svg>`
    );
  }

  // The middle dial: its needle points at the current channel
  _dialSVG() {
    const sk = this._svgSketch(4711);
    let s = `<circle r="19" fill="#17181c"/>`;
    s += sk.stroke(sk.circlePts(0, 0, 19, 22), {
      w: 1.6,
      a: 0.8,
      mag: 0.4,
      closed: true,
    });
    // one tick per channel
    for (let i = 0; i < 4; i++) {
      const a = ((-54 + i * 36) * Math.PI) / 180;
      s += sk.stroke(
        [
          { x: Math.sin(a) * 20.5, y: -Math.cos(a) * 20.5 },
          { x: Math.sin(a) * 23.5, y: -Math.cos(a) * 23.5 },
        ],
        { w: 1.4, a: 0.7, mag: 0.1 },
      );
    }
    const needle =
      sk.stroke(
        [
          { x: 0, y: 2 },
          { x: 0, y: -15 },
        ],
        { w: 2, a: 0.95, mag: 0.2 },
      ) + `<circle r="3" fill="${DEADAIR_INK}" fill-opacity=".8"/>`;
    return (
      `<svg viewBox="-24 -24 48 48" xmlns="http://www.w3.org/2000/svg">${s}` +
      `<g class="rot needle">${needle}</g></svg>`
    );
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
          ${this._tvSketchSVG()}
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
          <button type="button" class="da-knob da-btn" data-dir="-1" aria-label="Previous channel" style="left:228px">${this._knobSVG("&#8249;", 11)}</button>
          <div class="da-dial" style="left:278px">${this._dialSVG()}</div>
          <button type="button" class="da-knob da-btn" data-dir="1" aria-label="Next channel" style="left:328px">${this._knobSVG("&#8250;", 29)}</button>
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
      this._dom = null;
    } else {
      document.getElementById("da-overlay")?.remove();
    }
  }

  // ── Fit the TV to the current canvas size ─────────────────────────────────────

  _layoutTV() {
    if (!this._dom) return;
    const baseW = 616,
      baseH = 520; // wrapper footprint incl. feet / floor shadow
    const s = Phaser.Math.Clamp(
      Math.min((this._W * 0.94) / baseW, (this._H * 0.94) / baseH),
      0.35,
      1.3,
    );
    this._dom.wrapper.style.setProperty("--da-s", s.toFixed(3));
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
    this._removeDOM();
  }
}
