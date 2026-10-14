// The sound of each place, under everything else: made, not recorded — noise
// shaped into weather and fire, and small struck sounds scattered through
// it. Walking from one place to another, the old sound sinks away and the
// new one rises. It plays at the music's volume, under the master and mute.
//
//   the house's halls   the house settling: a low room tone, a board now and then
//   the upper hall      the same, and the wind finding the gaps
//   the top floor       wind about the dome
//   the gallery         rain on the roof (its leak drips in the scene itself)
//   rooms with a fire   the fire: its crackle and its low roar
//   the cellar          the cold stillness of under the house (its drip, the scene's)

const BEDS = {
  Hall: ["tone", "creaks"],
  Upper: ["tone", "creaks", "wind"],
  Top: ["wind", "tone"],
  TopHall: ["rain", "tone"],
  Study: ["tone"], Room2: ["tone"], Room3: ["tone", "wind"],
  Room4: ["tone", "fire"], Room5: ["tone", "fire"], Room6: ["tone", "fire"], Room7: ["tone"],
  // puzzles that are found somewhere in particular
  level: { TapCode: ["tone"], Pi: ["fire", "tone"] },
};
const LOUD = { tone: 0.05, wind: 0.07, rain: 0.06, fire: 0.08, creaks: 1, drips: 1 };

export function mountAmbience(scope, { game, levels, audio }) {
  let ac = null, out = null, noise = null;
  const beds = new Map(); // name → { gain, stop, timer }
  let want = [];

  function ready() {
    if (ac) return true;
    ac = game.sound?.context;
    if (!ac || !game.sound.destination) { ac = null; return false; }
    out = ac.createGain();
    out.gain.value = 0;
    out.connect(game.sound.destination);
    // two seconds of noise, looped, for everything to be shaped from
    noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0, b = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = 0.985 * b + 0.15 * w; d[i] = i % 2 ? w * 0.6 : b; }
    return true;
  }
  const source = () => { const s = ac.createBufferSource(); s.buffer = noise; s.loop = true; s.loopStart = Math.random(); return s; };
  const filter = (type, freq, q = 0.7) => { const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; return f; };
  // a short struck sound: a knock in the timbers, a drop into water, a spark
  function strike(gain, kind) {
    if (!ac || ac.state !== "running") return;
    const t = ac.currentTime, g = ac.createGain();
    g.connect(gain);
    if (kind === "drip") {
      const o = ac.createOscillator();
      o.frequency.setValueAtTime(1400 + Math.random() * 900, t);
      o.frequency.exponentialRampToValueAtTime(500, t + 0.09);
      g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.18);
      o.connect(g); o.start(t); o.stop(t + 0.2);
    } else if (kind === "creak") {
      const o = ac.createOscillator(), f = filter("bandpass", 600, 4);
      o.type = "sawtooth";
      o.frequency.setValueAtTime(70 + Math.random() * 40, t);
      o.frequency.linearRampToValueAtTime(110 + Math.random() * 60, t + 0.5);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.02, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.7);
      o.connect(f).connect(g); o.start(t); o.stop(t + 0.75);
    } else {
      const s = source(), f = filter("bandpass", 1800 + Math.random() * 2400, 1.4);
      g.gain.setValueAtTime(0.07 + Math.random() * 0.08, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.03 + Math.random() * 0.05);
      s.connect(f).connect(g); s.start(t, Math.random()); s.stop(t + 0.1);
    }
  }
  // each sound of a place: its steady part, and its scattered strikes
  function build(name) {
    const gain = ac.createGain();
    gain.gain.value = 0;
    gain.connect(out);
    const nodes = [];
    const steady = (chain) => { const s = source(); let last = s; for (const n of chain) last = last.connect(n); last.connect(gain); s.start(); nodes.push(s); };
    let timer = null;
    const every = (min, max, kind) => {
      const next = () => { strike(gain, kind); timer = setTimeout(next, min + Math.random() * (max - min)); };
      timer = setTimeout(next, Math.random() * max);
    };
    if (name === "tone") steady([filter("lowpass", 160)]);
    if (name === "wind") {
      const f = filter("bandpass", 420, 0.8), lfo = ac.createOscillator(), depth = ac.createGain();
      lfo.frequency.value = 0.09; depth.gain.value = 260;
      lfo.connect(depth).connect(f.frequency); lfo.start(); nodes.push(lfo);
      steady([f]);
    }
    if (name === "rain") steady([filter("highpass", 1600), filter("lowpass", 7000)]);
    if (name === "fire") { steady([filter("lowpass", 240)]); every(60, 420, "spark"); }
    if (name === "creaks") every(7000, 19000, "creak");
    if (name === "drips") every(1600, 3400, "drip");
    return { gain, stop() { clearTimeout(timer); for (const n of nodes) { try { n.stop(); } catch { /* gone already */ } } gain.disconnect(); } };
  }

  function apply() {
    if (!ready()) return;
    const t = ac.currentTime;
    for (const name of want) {
      if (!beds.has(name)) beds.set(name, build(name));
      beds.get(name).gain.gain.setTargetAtTime(LOUD[name], t, 0.8);
    }
    for (const [name, bed] of beds) {
      if (want.includes(name)) continue;
      bed.gain.gain.setTargetAtTime(0, t, 0.6);
      clearTimeout(bed.fade);
      bed.fade = setTimeout(() => { if (!want.includes(name)) { bed.stop(); beds.delete(name); } }, 3500);
    }
    volume();
  }
  // the music slider sets how loud the places are
  function volume() {
    if (!out) return;
    const state = audio?.state;
    out.gain.setTargetAtTime(state ? state.musicVol * 1.6 : 0.8, ac.currentTime, 0.3);
  }
  function choose() {
    const place = levels.place;
    if (place && !levels.answering) want = BEDS[place.key] ?? ["tone"];
    else if (place) want = BEDS[place.key] ?? [];
    else want = BEDS.level[levels.definitions[levels.currentIndex]?.key] ?? [];
    apply();
  }
  scope.add(levels.subscribe(choose));
  // the context may only start on a gesture; and the music slider may move
  const wake = () => { if (ac?.state === "suspended") ac.resume().catch(() => {}); choose(); };
  scope.on(window, "pointerdown", wake);
  scope.on(window, "keydown", wake);
  scope.on(document.getElementById("music-slider"), "input", volume);
  scope.add(() => { for (const bed of beds.values()) bed.stop(); beds.clear(); out?.disconnect(); });
}
