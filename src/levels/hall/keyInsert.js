import CUES from "./keyUnlock.json";

// The key going into a door's lock and turning, filmed close: the lock stile
// of one of the botany hall's walnut doors, the gilt key a room's chest gave
// up (art/blender/key_unlock.py, key_unlock_film.py). It is laid over the
// game's picture, under everything drawn over that, and plays once; its
// sounds are the game's own, made at its cues (keyUnlock.json).
const FILM = `${import.meta.env.BASE_URL}assets/video/key-unlock.mp4`;
const FADE_MS = 260;

let film = null;

/** Made ready as the hall is entered, so the film is there to play the
 *  moment a key is put to a door. */
export function prepareKeyInsert() {
  if (film) return film;
  film = document.createElement("video");
  film.id = "key-insert";
  film.muted = true;
  film.playsInline = true;
  film.preload = "auto";
  film.disablePictureInPicture = true;
  film.setAttribute("aria-hidden", "true");
  film.src = FILM;
  film.load();
  return film;
}

/** Plays it over the game: `cue(name)` at each of its moments — "enter",
 *  "catch", "turn", "clack" — and `done()` as it fades back off the hall. If
 *  it cannot be played, the clack is made and it is done at once. Returns a
 *  stop, for a hall left or redrawn under it: the film goes, nothing more is
 *  called. */
export function playKeyInsert({ cue = () => {}, done = () => {} }) {
  const video = prepareKeyInsert();
  const viewport = document.getElementById("game-viewport");
  const pending = Object.entries(CUES.cues).sort((a, b) => a[1] - b[1]);
  let over = false, watching = null, safety = null, fading = null;
  const unwatch = () => {
    if (watching === null) return;
    if (typeof video.cancelVideoFrameCallback === "function") video.cancelVideoFrameCallback(watching);
    else cancelAnimationFrame(watching);
    watching = null;
  };
  const off = () => {
    unwatch();
    clearTimeout(safety);
    video.removeEventListener("ended", finish);
    video.removeEventListener("error", fail);
  };
  const remove = () => {
    video.pause();
    video.classList.remove("is-on");
    video.remove();
  };
  // (it shows once it is playing — a picture on it — so the hall is never
  // covered by black; made ready beforehand, it has long had its first frame,
  // so that is not waited for)
  const show = () => { if (!over) video.classList.add("is-on"); };
  // its moments, as the film reaches them
  const watch = () => {
    const look = () => {
      watching = null;
      if (over) return;
      if (video.currentTime > 0) show();
      while (pending.length && video.currentTime >= pending[0][1]) cue(pending.shift()[0]);
      watch();
    };
    watching = typeof video.requestVideoFrameCallback === "function" ? video.requestVideoFrameCallback(look) : requestAnimationFrame(look);
  };
  function finish() {
    if (over) return;
    over = true;
    off();
    while (pending.length) cue(pending.shift()[0]);
    video.classList.remove("is-on");
    fading = setTimeout(remove, FADE_MS);
    done();
  }
  function fail() {
    if (over) return;
    over = true;
    off();
    remove();
    cue("clack");
    done();
  }
  if (!viewport) { fail(); return () => {}; }
  viewport.querySelector("#game-container")?.after(video) ?? viewport.append(video);
  video.addEventListener("ended", finish);
  video.addEventListener("error", fail);
  video.addEventListener("playing", show, { once: true });
  video.currentTime = 0;
  const playing = video.play();
  if (playing !== undefined) playing.catch(fail);
  watch();
  // if it never gets going, the door is not kept waiting
  safety = setTimeout(finish, (CUES.frames / CUES.fps) * 1000 + 2500);
  return () => {
    if (over) { clearTimeout(fading); remove(); return; }
    over = true;
    off();
    remove();
  };
}
