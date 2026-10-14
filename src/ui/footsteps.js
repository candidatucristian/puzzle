// Footsteps: walking from one place of the house to another — through a door,
// up the stairs, down the passage, back the way one came — the steps are
// heard (assets/sounds/global/steps.mp3), and die away as one arrives. At the
// effects' volume, under the master volume and mute.

const FILE = "assets/sounds/global/steps.mp3";
const GAIN = 0.7;
const FADE = 0.65; // seconds the steps take to die away at the end

export function mountFootsteps(scope, { game, audio }) {
  let buffer = null, playing = null;
  const ready = () => {
    const ac = game.sound?.context;
    if (!ac || buffer) return buffer;
    buffer = fetch(FILE).then((r) => r.arrayBuffer()).then((data) => ac.decodeAudioData(data)).catch(() => null);
    return buffer;
  };
  // fetched once the house is first walked into, so the first walk has its steps
  ready();

  /** The steps for a walk of `ms` milliseconds: they fade out over its end. */
  async function walk(ms) {
    const ac = game.sound?.context, state = audio?.state;
    if (!ac || ac.state !== "running" || !game.sound.destination) return;
    if (state && (state.muted || !state.sfxVol || !state.masterVol)) return;
    const sound = await ready();
    if (!sound) return;
    // one walk at a time: whatever was still sounding stops short
    try { playing?.stop(); } catch { /* finished already */ }
    const source = ac.createBufferSource(), gain = ac.createGain();
    source.buffer = sound;
    const t = ac.currentTime, length = Math.min(sound.duration, ms / 1000), level = (state?.sfxVol ?? 0.8) * GAIN;
    gain.gain.setValueAtTime(level, t);
    gain.gain.setValueAtTime(level, t + Math.max(0, length - FADE));
    gain.gain.linearRampToValueAtTime(0.0001, t + length);
    source.connect(gain).connect(game.sound.destination);
    source.start(t);
    source.stop(t + length + 0.05);
    playing = source;
    source.onended = () => { if (playing === source) playing = null; };
  }
  scope.add(() => { try { playing?.stop(); } catch { /* gone */ } });
  return { walk };
}
