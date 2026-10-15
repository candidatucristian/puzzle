// The sounds of paper, made rather than recorded: what a letter does on its
// way into the case file. Each is noise shaped and filtered, or a few pure
// tones — quiet, close, dry. At the effects' volume, under the master volume
// and mute; silent until the page has been played with (the audio context
// runs only after a gesture).
//
//   whoosh   a letter cutting through the air
//   land     an envelope landing on the desk
//   crack    the wax seal breaking
//   open     the flap lifting, the letter drawn out
//   unfold   the sheet opened out, fold by fold
//   file     the letter slid into the dossier
//   ping     something new in the case file

export function mountPaperSounds({ game, audio }) {
  const ctx = () => {
    const ac = game.sound?.context, state = audio?.state;
    if (!ac || ac.state !== "running" || !game.sound.destination) return null;
    if (state && (state.muted || !state.sfxVol || !state.masterVol)) return null;
    return { ac, out: game.sound.destination, vol: state?.sfxVol ?? 0.8 };
  };
  // noise through a filter, shaped by env(k) over `dur`; the filter may sweep
  function noise({ at = 0, dur, type = "bandpass", freq, to = freq, q = 1, gain, env }) {
    const c = ctx();
    if (!c) return;
    const { ac, out, vol } = c;
    const t = ac.currentTime + at;
    const buf = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * dur)), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * env(i / d.length);
    const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = buf;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.value = gain * vol;
    src.connect(f).connect(g).connect(out);
    src.start(t);
  }
  function tones(list, { at = 0, decay = 0.6 } = {}) {
    const c = ctx();
    if (!c) return;
    const { ac, out, vol } = c;
    const t = ac.currentTime + at;
    for (const [freq, g0, delay = 0] of list) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t + delay);
      g.gain.exponentialRampToValueAtTime(g0 * vol, t + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + decay);
      o.connect(g).connect(out);
      o.start(t + delay); o.stop(t + delay + decay + 0.05);
    }
  }
  const swell = (k) => Math.sin(Math.PI * k) ** 1.5;
  return {
    whoosh() { noise({ dur: 0.55, freq: 2600, to: 500, q: 0.8, gain: 0.32, env: swell }); },
    land() {
      noise({ dur: 0.12, type: "lowpass", freq: 420, gain: 0.55, env: (k) => (1 - k) ** 3 });
      noise({ at: 0.01, dur: 0.18, type: "highpass", freq: 3000, gain: 0.08, env: (k) => (1 - k) ** 2 });
    },
    crack() {
      noise({ dur: 0.05, type: "highpass", freq: 1800, gain: 0.5, env: (k) => (1 - k) ** 4 });
      for (let i = 0; i < 5; i++) noise({ at: 0.03 + i * 0.03 + Math.random() * 0.02, dur: 0.03, type: "bandpass", freq: 2200 + Math.random() * 2400, q: 2, gain: 0.18, env: (k) => (1 - k) ** 2 });
    },
    open() { noise({ dur: 0.45, type: "bandpass", freq: 3800, to: 1600, q: 0.7, gain: 0.14, env: (k) => swell(k) * (0.6 + 0.4 * Math.random()) }); },
    unfold() {
      for (let i = 0; i < 3; i++) noise({ at: i * 0.17, dur: 0.16, type: "highpass", freq: 2400, gain: 0.16, env: (k) => Math.sin(Math.PI * k) * (0.5 + 0.5 * Math.random()) });
    },
    file() {
      noise({ dur: 0.4, freq: 1800, to: 700, q: 0.8, gain: 0.22, env: swell });
      noise({ at: 0.36, dur: 0.08, type: "lowpass", freq: 700, gain: 0.3, env: (k) => (1 - k) ** 3 });
    },
    ping() { tones([[880, 0.05], [1318.5, 0.04, 0.09]], { decay: 0.7 }); },
  };
}
