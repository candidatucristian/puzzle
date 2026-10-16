import { INTRO } from "../shared/story.js";
import { sketchLayer, drawHouse, drawThree, drawLock, drawFile, drawDesk, erase, fadeOut } from "./introSketches.js";

// The game's cold open, before anything else, as a picture house would show
// it — black, grain on the light, a score under it.
//   A gate first: one click, so that the sound may play at all.
//   Then the story so far, drawn as it is told — in the game's thin white
//   pencil, line by line, on dark paper (introSketches.js), a paragraph under
//   each drawing: the house that night, its three lights put out as its
//   doors are locked; the three of them and the work they were known for;
//   the lock and the key turned in it; the file, and the stamp that closed
//   it; his desk, and the lamp lit over it. Then where we are — at Inspector Wren's, the night he opens it again
//   — and the black lifts onto his desk, where the prologue is already laid
//   out underneath (`onUnder`).
// Esc or "Skip" ends it at any point. Resolves once it has lifted.

export function playColdOpen(scope, { game, audio, reducedMotion = false, onUnder = () => {} }) {
  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.id = "cold-open";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "Ashcombe Manor: the opening");
    root.innerHTML = `
      <div class="co-vignette" aria-hidden="true"></div>
      <div class="co-grain" aria-hidden="true"></div>
      <div class="co-flicker" aria-hidden="true"></div>
      <div class="co-stage" aria-live="polite"></div>
      <p class="co-caption" aria-live="polite"></p>
      <button type="button" class="co-skip" hidden>Skip</button>
      <div class="co-gate">
        <span class="co-gate-rule" aria-hidden="true"></span>
        <button type="button" class="co-gate-go">Click to begin</button>
        <p class="co-gate-note">Best with sound</p>
      </div>`;
    root.style.setProperty("--co-grain-img", `url(${noiseImage(256)})`);
    if (reducedMotion) root.classList.add("is-still");
    document.body.append(root);
    document.body.classList.add("cold-open-on");
    const $ = (sel) => root.querySelector(sel);
    const stage = $(".co-stage"), caption = $(".co-caption"), skipBtn = $(".co-skip");
    const svg = sketchLayer(root);
    root.insertBefore(svg, stage);
    const score = makeScore(game, audio);

    // ── time, which a skip cuts short ──
    let skipped = false, under = false, ended = false, woken = null;
    const sleepers = new Set();
    const sleep = (ms) => new Promise((ok, cut) => {
      if (skipped) { cut(SKIP); return; }
      const wake = () => { sleepers.delete(wake); cut(SKIP); };
      sleepers.add(wake);
      scope.later(() => { if (sleepers.delete(wake)) ok(); }, ms);
    });
    const skip = () => { if (skipped || ended) return; skipped = true; for (const wake of [...sleepers]) wake(); };
    const goUnder = () => { if (!under) { under = true; onUnder(); } };

    // while it plays, no key reaches the house behind it
    const onKey = (e) => {
      if (!root.isConnected) return;
      e.stopPropagation();
      if (e.key === "Escape") { e.preventDefault(); skip(); }
    };
    window.addEventListener("keydown", onKey, true);
    scope.add(() => window.removeEventListener("keydown", onKey, true));
    scope.on(skipBtn, "click", skip);

    // ── what is put on the screen: lines whose words come up one after
    // another, each line from its own moment (`wait`, in ms) ──
    function beat(lines, kind = "") {
      const el = document.createElement("div");
      el.className = kind ? `co-beat ${kind}` : "co-beat";
      for (const [type, text, wait = 0] of lines) {
        const p = document.createElement("p");
        p.className = `co-l is-${type}`;
        p.style.setProperty("--d", `${wait}ms`);
        let words = 0;
        p.append(...splitWords(text, () => words++));
        el.append(p);
      }
      stage.append(el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-in")));
      return el;
    }
    // the words under a drawing: one paragraph, its words coming up in turn
    function say(text, wait = 0) {
      caption.classList.remove("is-in", "is-out");
      caption.style.setProperty("--d", `${wait}ms`);
      let words = 0;
      caption.replaceChildren(...splitWords(text, () => words++));
      requestAnimationFrame(() => requestAnimationFrame(() => caption.classList.add("is-in")));
    }
    const unsay = () => caption.classList.add("is-out");
    const rub = (...nodes) => { for (const node of nodes) if (node) erase(node); };
    function gone(el, slow = false) {
      if (!el) return;
      el.classList.add(slow ? "is-out-slow" : "is-out");
      scope.later(() => el.remove(), slow ? 1800 : 1000);
    }

    // ── the film ──
    async function film() {
      const T = INTRO;
      await gate();
      await woken;
      score.start();
      scope.later(() => { skipBtn.hidden = false; requestAnimationFrame(() => skipBtn.classList.add("is-in")); }, 1800);
      await sleep(1600);

      const [night, three, nothing, closed, never] = T.story;

      // the house, that night — and as its doors are locked, its lights go
      score.note(440, 0.45);
      const house = drawHouse(svg);
      score.pencil(4.4);
      say(night, 700);
      await sleep(4300);
      score.note(659.25, 0.3);
      await sleep(3400);
      for (const light of house.lit) {
        await sleep(650);
        score.lock();
        fadeOut(light);
      }
      await sleep(1500);
      rub(house.node, house.extra); unsay();
      await sleep(1300);

      // the three of them, and the work they were known for
      score.chord("F"); score.note(587.33, 0.34);
      const trio = drawThree(svg);
      score.pencil(3.4);
      say(three, 500);
      await sleep(9200);
      rub(trio.node, trio.extra); unsay();
      await sleep(1200);

      // nothing taken, nobody hurt: a lock, and the key turned in it
      score.note(523.25, 0.34);
      const lock = drawLock(svg);
      score.pencil(2.8);
      say(nothing, 400);
      await sleep(2900);
      lock.key.animate([{ transform: "translateX(150px)" }, { transform: "none" }], { duration: 750, easing: "cubic-bezier(.3,.6,.3,1)", fill: "both" });
      await sleep(900);
      lock.key.animate([{ transform: "scaleY(1)" }, { transform: "scaleY(.14)" }], { duration: 260, easing: "ease-in", fill: "forwards" });
      await sleep(240);
      score.lock();
      await sleep(2700);
      rub(lock.node); unsay();
      await sleep(1100);

      // the file, and the stamp that closed it
      score.chord("Dm"); score.note(493.88, 0.34);
      const file = drawFile(svg);
      score.pencil(2.6);
      say(closed, 400);
      await sleep(3300);
      const stamp = stampOn(svg);
      await sleep(150);
      score.stamp();
      root.classList.add("is-shake");
      await sleep(3200);
      root.classList.remove("is-shake");
      rub(file.node, file.extra); stamp.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, fill: "forwards" }); unsay();
      await sleep(1200);

      // his desk, years on, and the lamp lit over the same file
      score.chord("Am"); score.note(523.25, 0.36); score.note(659.25, 0.3, 1.2);
      const desk = drawDesk(svg);
      score.pencil(3);
      say(never, 600);
      await sleep(7000);
      goUnder();
      rub(desk.node, desk.extra); unsay();
      stamp.remove();
      await sleep(1500);

      // where we are, and what he means to do tonight — the desk laid out
      // behind the black meanwhile
      score.note(329.63, 0.4); score.note(220, 0.3, 0.05);
      const card = beat([["label", T.where[0]], ["name", T.where[1], 500], ["mid", T.where[2], 2000]]);
      await sleep(900); score.note(659.25, 0.38);
      await sleep(4800);
      gone(card, true);
      await sleep(1000);
    }

    // the one click that lets the sound play
    function gate() {
      const g = $(".co-gate");
      requestAnimationFrame(() => requestAnimationFrame(() => g.classList.add("is-in")));
      return new Promise((go, cut) => {
        let done = false;
        const begin = () => {
          if (done) return;
          done = true;
          window.removeEventListener("keydown", onGateKey, true);
          woken = score.wake();
          g.classList.add("is-out");
          scope.later(() => g.remove(), 900);
          go();
        };
        const onGateKey = (e) => { if (e.key === "Escape") { done = true; g.remove(); window.removeEventListener("keydown", onGateKey, true); cut(SKIP); } else begin(); };
        window.addEventListener("keydown", onGateKey, true);
        scope.add(() => window.removeEventListener("keydown", onGateKey, true));
        scope.on(g, "click", begin);
      });
    }

    function end() {
      if (ended) return;
      ended = true;
      goUnder();
      score.fade(skipped ? 1 : 3);
      // the prologue chooses between its film and its desk; let it be there
      scope.later(() => {
        root.classList.add("is-lifting");
        document.body.classList.remove("cold-open-on");
        scope.later(() => { root.remove(); score.stop(); resolve(); }, skipped ? 900 : 2300);
      }, skipped ? 350 : 200);
    }
    film().then(end, end);
  });
}

const SKIP = Symbol("skip");

// the stamp, in the drawing: worn red ink in a double border, brought down
// hard across the file
function stampOn(svg) {
  const NS = "http://www.w3.org/2000/svg";
  const g = document.createElementNS(NS, "g");
  g.setAttribute("class", "co-stamp");
  g.innerHTML = `<g transform="translate(800 334) rotate(-8)" filter="url(#co-worn)">
      <rect x="-168" y="-56" width="336" height="112" rx="7" class="co-stamp-edge" />
      <rect x="-158" y="-46" width="316" height="92" rx="4" class="co-stamp-inner" />
      <text x="0" y="10" text-anchor="middle" class="co-stamp-word">CLOSED</text>
      <text x="0" y="34" text-anchor="middle" class="co-stamp-why">INSUFFICIENT EVIDENCE</text>
    </g>`;
  svg.append(g);
  Object.assign(g.style, { transformBox: "view-box", transformOrigin: "800px 334px" });
  g.animate([{ transform: "scale(2.6) rotate(-4deg)", opacity: 0 }, { transform: "none", opacity: 0.94 }],
    { duration: 170, easing: "cubic-bezier(.55,0,.9,.4)", fill: "forwards" });
  return g;
}

// words, each its own span, to come up one after another
function splitWords(text, next) {
  return text.split(/(\s+)/).map((part) => {
    if (/^\s+$/.test(part)) return document.createTextNode(part);
    const w = document.createElement("span");
    w.className = "co-w";
    w.style.setProperty("--i", next());
    w.textContent = part;
    return w;
  });
}

// a square of grain: light specks, for the film
function noiseImage(size) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const img = g.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const r = Math.random(), v = 120 + Math.random() * 135;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = r < 0.5 ? r * 120 : 0;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}

// ── the score, made rather than recorded: a slow pad of strings a long way
// off and a few piano notes in a large room, the pencil and the knocks, all
// through one room's echo, at the music's and the effects' volumes, under
// mute ──
const CHORDS = {
  Am: [55.0, 164.81, 220.0, 261.63],
  F: [43.65, 174.61, 220.0, 261.63],
  Dm: [36.71, 146.83, 220.0, 293.66],
  E: [41.2, 164.81, 207.65, 246.94],
};
function makeScore(game, audio) {
  const ac = game?.sound?.context, dest = game?.sound?.destination;
  const st = audio?.state;
  const level = (kind) => {
    if (!st) return 0.8;
    if (st.muted || !st.masterVol) return 0;
    return kind === "music" ? (st.musicVol ?? 0.7) : (st.sfxVol ?? 0.8);
  };
  let master = null, room = null, voices = [], live = false;
  const ok = () => live && ac && ac.state === "running";
  function build() {
    if (master || !ac || !dest) return;
    master = ac.createGain();
    master.gain.value = 1;
    master.connect(dest);
    // the room: a long tail of noise, falling away
    room = ac.createConvolver();
    const len = Math.floor(ac.sampleRate * 3.6), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3.2;
    }
    room.buffer = ir;
    const wet = ac.createGain();
    wet.gain.value = 0.55;
    room.connect(wet).connect(master);
  }
  // a voice into the room and straight out, at a balance
  const send = (node, dry = 0.6) => {
    const g = ac.createGain();
    g.gain.value = dry;
    node.connect(g).connect(master);
    node.connect(room);
  };
  // noise, shaped and filtered, at the effects' volume, into the room
  function noise({ at = 0, dur, type = "lowpass", freq, to = freq, q = 0.7, gain, env, dry = 0.7 }) {
    const t = ac.currentTime + at;
    const buf = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * dur)), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * env(i / d.length, i / ac.sampleRate);
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = buf;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.value = gain * level("sfx");
    src.connect(f).connect(g);
    send(g, dry);
    src.start(t);
  }
  // a tone falling away: the body of a knock
  function drop({ at = 0, from, to, dur, gain }) {
    const t = ac.currentTime + at;
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * level("sfx") + 0.0001, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    send(g, 0.8);
    o.start(t); o.stop(t + dur + 0.05);
  }
  return {
    /** a pencil on paper for `sec`: the scratch of the lead, in strokes */
    pencil(sec) {
      if (!ok()) return;
      build();
      const a = 4.5 + Math.random() * 2, b = 1.1 + Math.random(), p = Math.random() * 6;
      noise({ dur: sec, type: "bandpass", freq: 3400, q: 0.8, gain: 0.07, dry: 0.85,
        env: (k, s) => Math.min(1, k * 12, (1 - k) * 8) * (0.5 + 0.5 * Math.sin(s * a * Math.PI * 2 + p)) ** 2 * (0.55 + 0.45 * Math.sin(s * b * Math.PI * 2)) });
    },
    /** a door locked: the key's turn, and the bolt going home */
    lock() {
      if (!ok()) return;
      build();
      noise({ dur: 0.05, type: "highpass", freq: 2200, gain: 0.5, env: (k) => (1 - k) ** 4, dry: 0.8 });
      noise({ at: 0.075, dur: 0.07, type: "bandpass", freq: 1500, q: 2, gain: 0.7, env: (k) => (1 - k) ** 3, dry: 0.8 });
      drop({ at: 0.075, from: 160, to: 70, dur: 0.22, gain: 0.45 });
    },
    /** the rubber stamp coming down on the file */
    stamp() {
      if (!ok()) return;
      build();
      drop({ from: 110, to: 46, dur: 0.5, gain: 0.95 });
      noise({ dur: 0.2, freq: 700, to: 160, gain: 0.85, env: (k) => (1 - k) ** 3 });
      noise({ dur: 0.09, type: "highpass", freq: 2400, gain: 0.25, env: (k) => (1 - k) ** 2 });
    },
    /** the click at the gate: the sound may start (resolves once it can,
     *  or soon in any case — the film does not wait on a silent machine) */
    wake() {
      live = true;
      if (!ac || ac.state === "running") return Promise.resolve();
      let resumed;
      try { resumed = ac.resume(); } catch { return Promise.resolve(); }
      return Promise.race([Promise.resolve(resumed).catch(() => {}), new Promise((r) => setTimeout(r, 700))]);
    },
    start() {
      if (!ok()) return;
      build();
      const t = ac.currentTime, vol = level("music");
      voices = CHORDS.Am.map((f, i) => {
        const out = ac.createGain(), lp = ac.createBiquadFilter();
        lp.type = "lowpass"; lp.frequency.value = i ? 520 : 200; lp.Q.value = 0.4;
        // a slow breath in the strings
        const lfo = ac.createOscillator(), depth = ac.createGain();
        lfo.frequency.value = 0.05 + i * 0.013; depth.gain.value = i ? 140 : 30;
        lfo.connect(depth).connect(lp.frequency); lfo.start(t);
        const oscs = (i ? [-7, 7] : [0]).map((cents) => {
          const o = ac.createOscillator();
          o.type = i ? "sawtooth" : "sine";
          o.frequency.value = f; o.detune.value = cents;
          o.connect(lp); o.start(t);
          return o;
        });
        out.gain.setValueAtTime(0.0001, t);
        out.gain.exponentialRampToValueAtTime((i ? 0.022 : 0.09) * vol + 0.0001, t + 7);
        lp.connect(out);
        send(out, 0.5);
        return { oscs, out, lfo };
      });
    },
    /** the strings move to another chord, gliding */
    chord(name) {
      if (!ok() || !voices.length) return;
      const t = ac.currentTime;
      CHORDS[name].forEach((f, i) => voices[i].oscs.forEach((o) => o.frequency.setTargetAtTime(f, t, 0.9)));
    },
    /** a piano note, in the big room */
    note(freq, vel = 0.4, at = 0) {
      if (!ok()) return;
      build();
      const t = ac.currentTime + at, vol = level("music");
      const g = ac.createGain(), lp = ac.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 2600;
      for (const [mult, type, amt] of [[1, "triangle", 1], [2, "sine", 0.28], [3, "sine", 0.08]]) {
        const o = ac.createOscillator(), og = ac.createGain();
        o.type = type; o.frequency.value = freq * mult; og.gain.value = amt;
        o.connect(og).connect(lp);
        o.start(t); o.stop(t + 5);
      }
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vel * 0.32 * vol + 0.0001, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 4.6);
      lp.connect(g);
      send(g, 0.45);
    },
    fade(sec) {
      if (!master) return;
      const t = ac.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(0, t + sec);
    },
    stop() {
      if (!master) return;
      const t = ac.currentTime;
      for (const v of voices) { for (const o of v.oscs) o.stop(t + 0.1); v.lfo.stop(t + 0.1); }
      voices = [];
      setTimeout(() => { try { master.disconnect(); } catch { /* gone already */ } }, 6000);
    },
  };
}
