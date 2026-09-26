import Phaser from "phaser";

const CRYPTEX_CANDLE_HTML =
  '<div class="holder">' +
  '<div class="candle"><div class="candle-pool"></div></div>' +
  '<div class="wick"><div class="wick-ember"></div></div>' +
  '<div class="candle-halo"><i></i></div>' +
  '<div class="candle-light"><div class="candle-size"><div class="flame-body">' +
  '<div class="flame-outer"></div>' +
  '<div class="flame-core"></div>' +
  '<div class="flame-dark"></div>' +
  '<div class="flame-blue"></div>' +
  "</div></div></div>" +
  '<div class="candle-smoke"></div>' +
  '<button type="button" class="candle-action" aria-label="Put out the candle"></button></div>';

/** Owns the candle, its breath animation and the two room lights. */
export default class Candle {
  constructor(scene, { isBlocked, onExtinguished }) {
    this.scene = scene;
    this.isBlocked = isBlocked;
    this.onExtinguished = onExtinguished;
    this.clicks = 0;
    this.lightState = { level: 1, gustUntil: 0 };
    this._timers = new Set();
  }

  build(W, H, deskY) {
    this.removeDom();
    const container = document.getElementById("game-container");
    if (!container) return;

    const s = Phaser.Math.Clamp((H * 0.4) / 400, 0.3, 0.8);
    const cx = W * 0.86;
    const bottomY = deskY + (H - deskY) * 0.3;

    const el = document.createElement("div");
    el.className = "scene-dom-overlay cryptex-candle";
    el.innerHTML = CRYPTEX_CANDLE_HTML;
    // the 100px-wide .candle sits at the LEFT edge of the 150px .holder,
    // so its visual center is at 50px — align that with the dish at cx
    el.style.left = cx - 50 * s + "px";
    el.style.top = bottomY - 400 * s + "px";
    el.style.transform = "scale(" + s + ")";
    el.style.transformOrigin = "top left";
    container.appendChild(el);
    this.dom = el;
    el.querySelector(".candle-action").addEventListener("click", (event) => {
      event.stopPropagation();
      this.blow(event);
    });

    const g = this.scene.add.graphics().setDepth(-7);
    g.fillStyle(0x000000, 0.5);
    g.fillEllipse(cx, bottomY + 4, 130 * s, 26 * s);
    g.fillStyle(0x3a2a10, 1);
    g.fillEllipse(cx, bottomY + 2, 124 * s, 20 * s);
    g.fillStyle(0x8a6a30, 0.9);
    g.fillEllipse(cx, bottomY - 1, 118 * s, 17 * s);
    g.fillStyle(0x54390f, 1);
    g.fillEllipse(cx, bottomY - 3, 104 * s, 13 * s);
  }

  blow(event) {
    if (this.isBlocked() || this.clicks >= 3) return;
    this.clicks++;
    this.scene.services.audio.playClick(this.scene);
    this.refresh();
    this.animateGust(event);
    // once the flame and its light are gone, the luminous letters show up
    if (this.clicks >= 3) {
      this.scene.time.delayedCall(900, () => this.onExtinguished());
    }
  }

  refresh(instant = false) {
    const strength = (3 - this.clicks) / 3;
    const dom = this.dom;
    if (dom) {
      dom.style.setProperty("--candle-strength", strength);
      dom.classList.toggle("is-out", strength === 0);
      const btn = dom.querySelector(".candle-action");
      if (btn) btn.disabled = strength === 0;
    }
    this.setLightLevel(strength, instant);
  }

  animateGust(event) {
    const dom = this.dom;
    if (!dom) return;
    const clicks = this.clicks;
    const strength = (3 - clicks) / 3;
    const out = strength === 0;
    const reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // the breath comes from the side you clicked on
    let dir = Math.random() < 0.5 ? -1 : 1;
    const wick = dom.querySelector(".wick");
    if (event && typeof event.clientX === "number" && wick) {
      const r = wick.getBoundingClientRect();
      dir = event.clientX < r.left + r.width / 2 ? 1 : -1;
    }

    const D = out ? 1000 : 1350;
    this.dipLights(strength, out, reduce, D);

    if (reduce) {
      if (out) this.ember(dom);
      return;
    }

    // no new breath while the flame is still fighting the last one
    const btn = dom.querySelector(".candle-action");
    if (btn && !out) {
      btn.disabled = true;
      this._later(() => {
        if (btn.isConnected) btn.disabled = (3 - this.clicks) / 3 === 0;
      }, D * 0.7);
    }

    const k = clicks <= 1 ? 0.85 : clicks === 2 ? 1 : 1.12; // each breath stronger
    const low = clicks <= 1 ? 0.42 : 0.28; // how small it gets mid-breath
    const R = (deg) => `${(deg * dir * k).toFixed(1)}deg`;

    const light = dom.querySelector(".candle-light");
    const halo = dom.querySelector(".candle-halo i");
    if (!light || !light.animate) return;
    if (light.getAnimations) light.getAnimations().forEach((a) => a.cancel());

    if (!out) {
      light.animate(
        [
          {
            offset: 0,
            transform: "rotate(0deg) scale(1, 1)",
            opacity: 1,
            easing: "cubic-bezier(.2,.7,.3,1)",
          },
          {
            offset: 0.07,
            transform: `rotate(${R(40)}) scale(0.8, 1.25)`,
            opacity: 0.95,
          },
          {
            offset: 0.15,
            transform: `rotate(${R(68)}) scale(0.55, 1.45)`,
            opacity: 0.85,
          },
          {
            offset: 0.22,
            transform: `rotate(${R(55)}) scale(0.62, 1.12)`,
            opacity: 0.9,
          },
          {
            offset: 0.3,
            transform: `rotate(${R(74)}) scale(${low + 0.1}, ${low + 0.3})`,
            opacity: 0.7,
          },
          {
            offset: 0.38,
            transform: `rotate(${R(60)}) scale(${low}, ${low})`,
            opacity: 0.55,
          },
          {
            offset: 0.44,
            transform: `rotate(${R(35)}) scale(${low * 0.9}, ${low * 1.2})`,
            opacity: 0.6,
          },
          {
            offset: 0.5,
            transform: `rotate(${R(12)}) scale(${low + 0.05}, ${low + 0.15})`,
            opacity: 0.65,
            easing: "cubic-bezier(.3,0,.2,1)",
          },
          {
            offset: 0.62,
            transform: `rotate(${R(-14)}) scale(0.78, 0.9)`,
            opacity: 0.9,
          },
          {
            offset: 0.73,
            transform: `rotate(${R(9)}) scale(0.96, 1.12)`,
            opacity: 1,
          },
          { offset: 0.84, transform: `rotate(${R(-4)}) scale(1.02, 0.96)` },
          { offset: 0.93, transform: `rotate(${R(1.5)}) scale(1, 1.02)` },
          { offset: 1, transform: "rotate(0deg) scale(1, 1)", opacity: 1 },
        ],
        { duration: D },
      );
      if (halo)
        halo.animate(
          [
            { opacity: 1 },
            { opacity: 0.55, offset: 0.15 },
            { opacity: 0.3, offset: 0.38 },
            { opacity: 0.45, offset: 0.5 },
            { opacity: 0.95, offset: 0.7 },
            { opacity: 1 },
          ],
          { duration: D },
        );
      return;
    }

    // ── the third breath: the flame goes out ──
    light.animate(
      [
        {
          offset: 0,
          transform: "rotate(0deg) scale(1, 1)",
          opacity: 1,
          easing: "cubic-bezier(.2,.7,.3,1)",
        },
        {
          offset: 0.1,
          transform: `rotate(${R(45)}) scale(0.75, 1.3)`,
          opacity: 0.95,
        },
        {
          offset: 0.2,
          transform: `rotate(${R(75)}) scale(0.5, 1.5)`,
          opacity: 0.8,
        },
        {
          offset: 0.3,
          transform: `rotate(${R(70)}) scale(0.35, 0.6)`,
          opacity: 0.6,
        },
        {
          offset: 0.4,
          transform: `rotate(${R(40)}) scale(0.22, 0.28)`,
          opacity: 0.55,
        },
        {
          offset: 0.47,
          transform: `rotate(${R(15)}) scale(0.25, 0.3)`,
          opacity: 0.5,
        },
        {
          offset: 0.58,
          transform: `rotate(${R(5)}) scale(0.08, 0.1)`,
          opacity: 0.2,
        },
        { offset: 1, transform: "rotate(0deg) scale(0, 0)", opacity: 0 },
      ],
      { duration: D },
    );
    if (halo)
      halo.animate(
        [
          { opacity: 1 },
          { opacity: 0.5, offset: 0.2 },
          { opacity: 0.2, offset: 0.45 },
          { opacity: 0, offset: 0.6 },
          { opacity: 0 },
        ],
        { duration: D },
      );

    this.ghost(dom, dir);
    this._later(() => this.ember(dom), 430);
    this._later(() => this.smoke(dom, dir), 480);
  }

  ghost(dom, dir) {
    const holder = dom.querySelector(".holder");
    if (!holder) return;
    const f = 0.6; // flame size before the last breath
    const ghost = document.createElement("div");
    ghost.className = "flame-ghost";
    ghost.innerHTML = '<div class="flame-outer"></div>';
    holder.appendChild(ghost);
    const anim = ghost.animate(
      [
        {
          transform: `rotate(${75 * dir}deg) scale(${0.5 * f}, ${1.5 * f})`,
          opacity: 0,
        },
        {
          transform: `rotate(${80 * dir}deg) scale(${0.5 * f}, ${1.4 * f})`,
          opacity: 0.75,
          offset: 0.12,
        },
        {
          transform: `translate(${dir * 38}px, -46px) rotate(${95 * dir}deg) scale(${0.32 * f}, ${0.8 * f})`,
          opacity: 0.45,
          offset: 0.55,
        },
        {
          transform: `translate(${dir * 60}px, -78px) rotate(${110 * dir}deg) scale(${0.12 * f}, ${0.3 * f})`,
          opacity: 0,
        },
      ],
      {
        duration: 650,
        delay: 190,
        easing: "cubic-bezier(.25,.6,.4,1)",
        fill: "backwards",
      },
    );
    anim.onfinish = () => ghost.remove();
  }

  ember(dom) {
    const ember = dom.querySelector(".wick-ember");
    if (!ember || !ember.isConnected) return;
    ember.animate(
      [
        { opacity: 0, transform: "scale(0.6)" },
        { opacity: 1, transform: "scale(1.15)", offset: 0.06 },
        { opacity: 0.8, transform: "scale(1)", offset: 0.22 },
        { opacity: 0.95, transform: "scale(1.05)", offset: 0.3 },
        { opacity: 0.6, transform: "scale(0.9)", offset: 0.55 },
        { opacity: 0.25, transform: "scale(0.75)", offset: 0.8 },
        { opacity: 0, transform: "scale(0.6)" },
      ],
      { duration: 3400, easing: "ease-out" },
    );
  }

  smoke(dom, dir) {
    const box = dom.querySelector(".candle-smoke");
    if (!box || !box.isConnected) return;
    const start = performance.now();
    const LIFE = 3200;
    const spawn = () => {
      if (!box.isConnected) return;
      const age = performance.now() - start;
      if (age > LIFE) return;
      const fresh = 1 - age / LIFE; // the smoke thins out over time
      const phase = age * 0.0045; // shared wave → a ribbon
      const haze = Math.random() < 0.18;
      const w = document.createElement(haze ? "b" : "i");
      if (!haze && Math.random() < 0.5) w.className = "r";
      box.appendChild(w);

      const drift = dir * (18 + 30 * fresh);
      const sway = (s) => Math.sin(phase + s) * (8 + 10 * (1 - fresh));
      const op = (0.35 + 0.35 * fresh) * (haze ? 0.8 : 1);
      const rot = () => ((Math.random() - 0.5) * 50).toFixed(1);
      const anim = w.animate(
        [
          {
            transform: `translate(0px, 0px) rotate(${rot()}deg) scale(0.3, 0.45)`,
            opacity: op * 0.5,
          },
          {
            transform: `translate(${(drift * 0.12 + sway(0)).toFixed(1)}px, -16px) rotate(${rot()}deg) scale(0.7, 0.85)`,
            opacity: op,
            offset: 0.12,
          },
          {
            transform: `translate(${(drift * 0.55 + sway(1.4)).toFixed(1)}px, -80px) rotate(${rot()}deg) scale(1.4, 1.3)`,
            opacity: op * 0.6,
            offset: 0.48,
          },
          {
            transform: `translate(${(drift + sway(2.8)).toFixed(1)}px, -150px) rotate(${rot()}deg) scale(2.3, 1.8)`,
            opacity: 0,
          },
        ],
        {
          duration: 2400 + Math.random() * 900,
          easing: "cubic-bezier(.3,.55,.4,1)",
        },
      );
      anim.onfinish = () => w.remove();
      this._later(spawn, age < 700 ? 55 : 90 + 120 * (1 - fresh));
    };
    spawn();
  }

  setLightLevel(strength, instant = false) {
    const fx = this.lightState;
    if (!fx) return;
    if (instant) {
      this.scene.tweens.killTweensOf(fx);
      fx.level = strength;
      fx.gustUntil = 0;
      return;
    }
    // during a breath, the breath decides how the light comes back
    if (this.scene.time.now < fx.gustUntil) return;
    this.scene.tweens.killTweensOf(fx);
    this.scene.tweens.add({
      targets: fx,
      level: strength,
      duration: 700,
      ease: "Sine.easeInOut",
    });
  }

  update(time) {
    const fx = this.lightState;
    if (!fx) return;
    const t = time / 1000;
    const flick =
      1 +
      0.045 * Math.sin(t * 5.3) +
      0.03 * Math.sin(t * 11.7 + 1.3) +
      0.02 * Math.sin(t * 23.1 + 0.4);
    const a = Math.max(0, Math.min(1, fx.level * flick));
    const s = Math.max(0, fx.level * (1 + (flick - 1) * 0.35));
    for (const light of [this.wallLight, this.deskLight]) {
      if (light) light.setAlpha(a).setScale(s);
    }
  }

  dipLights(target, out, reduce, D) {
    const fx = this.lightState;
    if (!fx) return;
    this.scene.tweens.killTweensOf(fx);
    fx.gustUntil = this.scene.time.now + D;
    if (reduce) {
      this.scene.tweens.add({ targets: fx, level: target, duration: 600 });
      return;
    }
    const from = fx.level;
    const steps = out
      ? [
          [from * 0.55, 90],
          [from * 0.3, 160],
          [from * 0.42, 110],
          [from * 0.12, 180],
          [0, 350],
        ]
      : [
          [from * 0.55, 90],
          [from * 0.3, 190],
          [from * 0.4, 120],
          [from * 0.22, 150],
          [target * 0.9, 260],
          [target * 1.05, 200],
          [target, 250],
        ];
    const next = (i) => {
      if (i >= steps.length || this.lightState !== fx) return;
      const [level, duration] = steps[i];
      this.scene.tweens.add({
        targets: fx,
        level,
        duration,
        ease: "Sine.easeInOut",
        onComplete: () => next(i + 1),
      });
    };
    next(0);
  }

  removeDom() {
    for (const timer of this._timers) this.scene.clearSceneTimeout(timer);
    this._timers.clear();
    this.dom?.getAnimations?.({ subtree: true }).forEach((animation) => animation.cancel());
    if (this.dom && this.dom.parentNode) {
      this.dom.parentNode.removeChild(this.dom);
    }
    this.dom = null;
  }

  _later(callback, delay) {
    const timer = this.scene.setSceneTimeout(() => {
      this._timers.delete(timer);
      callback();
    }, delay);
    this._timers.add(timer);
    return timer;
  }

  destroy() {
    this.removeDom();
    this.scene.tweens.killTweensOf(this.lightState);
    this.wallLight = null;
    this.deskLight = null;
  }
}
