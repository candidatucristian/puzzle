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
//   typing   a typewriter as a found letter is opened out: its keys for the
//            two seconds the words take to come up, then its bell and the
//            carriage thrown back; returns { stop() }

export function mountPaperSounds({ game, audio }) {
  // This optional MP4 container is consumed by an Audio element only. The
  // letter's picture and motion always come from the Blender mesh rig.
  const recordingURL=`${import.meta.env.BASE_URL}assets/sounds/letter-open.mp4`;
  let recordingProbe=null;
  const prepareLetterOpen=()=>{
    recordingProbe??=fetch(recordingURL,{method:'HEAD',cache:'no-store'}).then(r=>r.ok).catch(()=>false)
      .then(found=>{if(!found)recordingProbe=null;return found;});
    return recordingProbe;
  };
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
  function letterOpen() {
    let media=null,source=null,gain=null,unsubscribe=null,stopped=false;
    const playback={
      get present(){return media!==null;},
      stop(){
        stopped=true;unsubscribe?.();unsubscribe=null;
        if(media){media.pause();media.removeAttribute('src');media.load();}
        source?.disconnect();gain?.disconnect();
      },
    };
    void prepareLetterOpen().then(found=>{
      if(!found||stopped)return;
      const c=ctx();if(!c)return;
      media=new Audio(recordingURL);media.preload='auto';
      source=c.ac.createMediaElementSource(media);gain=c.ac.createGain();
      source.connect(gain).connect(c.out);
      const volume=()=>{const s=audio?.state;gain.gain.value=s?.muted?0:s?.sfxVol??.8;};
      volume();unsubscribe=audio?.subscribe(volume);
      media.addEventListener('ended',()=>playback.stop(),{once:true});
      media.addEventListener('error',()=>playback.stop(),{once:true});
      void media.play().catch(()=>playback.stop());
    });
    return playback;
  }
  // a typewriter: each key the type-bar striking the platen — a dry click —
  // and the thump of the carriage stepping on, a space now and then a little
  // heavier and longer; at the end of the line its bell, and the carriage
  // thrown back on its ratchet. All under one gain, so it can be cut short.
  const TYPING_S = 2;
  function typing() {
    const c = ctx();
    if (!c) return { stop() {} };
    const { ac, out, vol } = c, t0 = ac.currentTime + 0.03, master = ac.createGain(), sources = [];
    master.gain.value = vol; master.connect(out);
    const burst = (at, dur, type, freq, q, gain, env) => {
      const buf = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * dur)), ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * env(i / d.length);
      const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.value = gain;
      src.connect(f).connect(g).connect(master); src.start(t0 + at); sources.push(src);
    };
    for (let at = 0, n = 0; at < TYPING_S - 0.3; n++) {
      const space = n > 2 && Math.random() < 0.14, hit = 0.7 + Math.random() * 0.3;
      burst(at, 0.012, "highpass", 2600 + Math.random() * 1500, 0.8, 0.32 * hit, (k) => (1 - k) ** 2);
      burst(at + 0.004, space ? 0.07 : 0.035, "lowpass", space ? 170 : 320, 0.9, (space ? 0.42 : 0.3) * hit, (k) => (1 - k) ** 3);
      at += space ? 0.12 + Math.random() * 0.06 : 0.055 + Math.random() * 0.05;
    }
    // the bell, and the carriage going back
    const bell = TYPING_S - 0.22;
    for (const [f, g0] of [[2093, 0.07], [4186, 0.02], [3136, 0.015]]) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + bell);
      g.gain.exponentialRampToValueAtTime(g0, t0 + bell + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + bell + 1.1);
      o.connect(g).connect(master); o.start(t0 + bell); o.stop(t0 + bell + 1.15); sources.push(o);
    }
    burst(TYPING_S - 0.1, 0.3, "bandpass", 1300, 1.4, 0.2, (k) => Math.sin(Math.PI * k) * (0.55 + 0.45 * Math.random()));
    burst(TYPING_S + 0.18, 0.05, "lowpass", 260, 0.9, 0.4, (k) => (1 - k) ** 3);
    return {
      // put down early: it dies away at once instead of running on
      stop() {
        const t = ac.currentTime;
        master.gain.cancelScheduledValues(t);
        master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t);
        master.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
        for (const src of sources) { try { src.stop(t + 0.2); } catch { /* already stopped */ } }
      },
    };
  }
  return {
    prepareLetterOpen,letterOpen,
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
    // a leaf of a book turned over (the manual's)
    page(quick = false) { noise({ dur: quick ? 0.22 : 0.5, type: "bandpass", freq: 2000, to: 1500, q: 0.7, gain: quick ? 0.12 : 0.2, env: (k) => Math.sin(Math.PI * k) ** 1.6 * (0.6 + 0.4 * Math.random()) }); },
    unfold() {
      for (let i = 0; i < 3; i++) noise({ at: i * 0.17, dur: 0.16, type: "highpass", freq: 2400, gain: 0.16, env: (k) => Math.sin(Math.PI * k) * (0.5 + 0.5 * Math.random()) });
    },
    file() {
      noise({ dur: 0.4, freq: 1800, to: 700, q: 0.8, gain: 0.22, env: swell });
      noise({ at: 0.36, dur: 0.08, type: "lowpass", freq: 700, gain: 0.3, env: (k) => (1 - k) ** 3 });
    },
    ping() { tones([[880, 0.05], [1318.5, 0.04, 0.09]], { decay: 0.7 }); },
    typing,
  };
}
