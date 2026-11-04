import CUES from "./keyUnlock.json";

// The key going into a door's lock and turning, filmed close: the lock stile
// of one of the botany hall's walnut doors, the gilt key a room's chest gave
// up (art/blender/key_unlock.py, key_unlock_film.py). It is laid over the
// game's picture, under everything drawn over that, and plays once; its
// sounds are the game's own, made at its cues (keyUnlock.json).
//
// The film is never shown as a <video> on the page: on some Windows graphics
// cards Chrome hands a page's video to the card to lay over the page, and
// there it can stick on one picture while the film runs on. It is played off
// the page instead and each of its pictures drawn onto a canvas, which is
// what is shown. If it stops moving altogether, the door is not kept waiting.
const FILM = `${import.meta.env.BASE_URL}assets/video/key-unlock.mp4`;
const FADE_MS = 260;

let film = null;

/** Made ready as the hall is entered, so the film is there to play the
 *  moment a key is put to a door. */
export function prepareKeyInsert() {
  if (film) return film;
  film = document.createElement("video");
  film.muted = true;
  film.playsInline = true;
  film.preload = "auto";
  film.disablePictureInPicture = true;
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
  const screen = document.createElement("canvas");
  screen.id = "key-insert";
  screen.setAttribute("aria-hidden", "true");
  const g = screen.getContext("2d", { alpha: false });
  let over = false, frame = null, safety = null, fading = null, shown = false;
  let lastTime = -1, stillSince = 0;
  const off = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    clearTimeout(safety);
    video.removeEventListener("ended", finish);
    video.removeEventListener("error", fail);
  };
  const remove = () => {
    video.pause();
    screen.classList.remove("is-on");
    screen.remove();
  };
  // the canvas as large as it stands on the screen (never more than the film)
  const fit = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(screen.clientWidth * ratio)), h = Math.max(1, Math.round(screen.clientHeight * ratio));
    const k = Math.min(1, Math.max(video.videoWidth / w, 0) || 1, Math.max(video.videoHeight / h, 0) || 1);
    const cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
    if (screen.width !== cw || screen.height !== ch) { screen.width = cw; screen.height = ch; }
  };
  // the film's picture, filling the canvas as the old video did (cover)
  const draw = () => {
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh || video.readyState < 2) return false;
    fit();
    const W = screen.width, H = screen.height, s = Math.max(W / vw, H / vh);
    const sw = W / s, sh = H / s;
    g.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, W, H);
    return true;
  };
  // every frame of the page: the film's picture drawn, its moments called,
  // and a watch kept that it is still going
  const tick = (now) => {
    frame = null;
    if (over) return;
    const t = video.currentTime;
    if (t > 0 && draw() && !shown) { shown = true; screen.classList.add("is-on"); }
    while (pending.length && t >= pending[0][1]) cue(pending.shift()[0]);
    if (t !== lastTime) { lastTime = t; stillSince = now; }
    else if (shown && !video.paused && now - stillSince > 1200) { finish(); return; }
    frame = requestAnimationFrame(tick);
  };
  function finish() {
    if (over) return;
    over = true;
    off();
    while (pending.length) cue(pending.shift()[0]);
    screen.classList.remove("is-on");
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
  g.fillStyle = "#050403";
  viewport.querySelector("#game-container")?.after(screen) ?? viewport.append(screen);
  g.fillRect(0, 0, screen.width, screen.height);
  video.addEventListener("ended", finish);
  video.addEventListener("error", fail);
  video.currentTime = 0;
  const playing = video.play();
  if (playing !== undefined) playing.catch(fail);
  stillSince = performance.now();
  frame = requestAnimationFrame(tick);
  // if it never gets going, the door is not kept waiting
  safety = setTimeout(finish, (CUES.frames / CUES.fps) * 1000 + 2500);
  return () => {
    if (over) { clearTimeout(fading); remove(); return; }
    over = true;
    off();
    remove();
  };
}
