// The sketched film's score, made rather than recorded (no audio file, no
// generated recording): a slow pad of strings a long way off, a few piano notes
// in a large room, the scratch of the pencil and a door's knock, all through
// one room's echo, at the game's music and effects volumes, silent when muted.
// (From the cold open of October 2026, put back for the sketched film.)

const CHORDS = {
  Am: [55.0, 164.81, 220.0, 261.63],
  F: [43.65, 174.61, 220.0, 261.63],
  Dm: [36.71, 146.83, 220.0, 293.66],
  E: [41.2, 164.81, 207.65, 246.94],
};
export function makeScore(game, audio) {
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
