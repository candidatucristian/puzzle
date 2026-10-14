// Now and then, over a puzzle, somebody goes "aha": one of six recorded ahas
// (assets/sounds/global/aha1–6.mp3), picked at random — never the same twice
// running — every two to three minutes of time spent at a puzzle. Not in the
// house's halls and rooms, not outside, not while the page is hidden; the
// time only counts at a puzzle. At the effects' volume, under the master
// volume and mute.

const FILES = [1, 2, 3, 4, 5, 6].map((n) => `assets/sounds/global/aha${n}.mp3`);
const EVERY = [120, 180]; // seconds between one and the next
const GAIN = 0.8;

export function mountAhas(scope, { game, audio }) {
  const buffers = new Map(); // file → decoded sound, fetched the first time it is wanted
  let left = wait(), last = -1;

  function wait() { return EVERY[0] + Math.random() * (EVERY[1] - EVERY[0]); }
  // at a puzzle: the game is showing, and it is not one of the house's places
  const atPuzzle = () => {
    const body = document.body.classList;
    return !body.contains("in-house") && !body.contains("outside") && document.visibilityState === "visible";
  };

  async function load(file) {
    const ac = game.sound?.context;
    if (!ac) return null;
    if (!buffers.has(file)) {
      buffers.set(file, fetch(file).then((r) => r.arrayBuffer()).then((data) => ac.decodeAudioData(data)).catch(() => null));
    }
    return buffers.get(file);
  }
  async function aha() {
    const ac = game.sound?.context, state = audio?.state;
    if (!ac || ac.state !== "running" || !game.sound.destination) return;
    if (state && (state.muted || !state.sfxVol || !state.masterVol)) return;
    let n = Math.floor(Math.random() * FILES.length);
    if (n === last) n = (n + 1 + Math.floor(Math.random() * (FILES.length - 1))) % FILES.length;
    last = n;
    const buffer = await load(FILES[n]);
    if (!buffer || !atPuzzle()) return;
    const source = ac.createBufferSource(), gain = ac.createGain();
    source.buffer = buffer;
    gain.gain.value = (state?.sfxVol ?? 0.8) * GAIN;
    source.connect(gain).connect(game.sound.destination);
    source.start();
  }

  // the clock only runs while there is a puzzle in front of the player
  const timer = setInterval(() => {
    if (!atPuzzle()) return;
    left -= 1;
    if (left > 0) return;
    left = wait();
    aha();
  }, 1000);
  scope.add(() => clearInterval(timer));
}
