import { Scope } from "../shared/Scope.js";
import { OPENING } from "../shared/story.js";
import { preloadPrologueDesk, DESK_CAMERA } from "./prologue.js";
import { passage } from "./passage.js";

const VIDEO = `${import.meta.env.BASE_URL}assets/video/IntroVideo.mp4`;
// The film's last shot is the camera drawing back from his desk, steadily
// (about 3.7% a second); it passes the very picture the game opens on at
// 73 s and goes on drawing back until it goes to black at 75.3 s. So the
// game takes over a second before that picture, at 72 s, where the film's
// frame is the desk picture drawn in 3.5% about a point (`match`, measured
// frame by frame against it): the desk comes up over the film framed exactly
// so, carries the same drawing-back on at the same speed, and slows to rest
// on the game's own framing as the matte draws off — one movement, never
// turning back on itself.
const HANDOFF_AT = 72.0;
const HANDOFF = { over: 360, move: 2600, match: { s: 1.035, cx: .274, cy: .55 } };
// the filters the picture has in the film and in the game (.prologue-photo)
const FILM_FILTER = "brightness(.58) contrast(1.08) saturate(.8)";
const DESK_FILTER = "brightness(.64) contrast(1.12) saturate(.82)";

// Arthur Wren's story first, then the film when it is asked for;
// one quiet passage at a time as it plays; then, on its last
// shot, straight into the game. The desk is laid out and decoded first.
export function playIntroVideo(parent, { game, audio, reducedMotion = false, onUnder = () => {} }) {
  const scope = new Scope();
  const root = document.createElement("div");
  root.id = "intro-video";
  root.dataset.phase = "loading";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", "The opening film");

  const video = document.createElement("video");
  video.className = "intro-video-film";
  video.preload = "auto";
  video.playsInline = true;
  video.disablePictureInPicture = true;
  video.disableRemotePlayback = true;
  video.setAttribute("aria-label", "Ashcombe Manor introduction");
  const vignette = document.createElement("div");
  vignette.className = "intro-video-vignette opening-vignette";
  vignette.setAttribute("aria-hidden", "true");
  const play = document.createElement("button");
  play.id = "intro-video-play";
  play.type = "button";
  play.className = "intro-video-play";
  play.textContent = "Play opening film";
  play.hidden = true;
  const skip = document.createElement("button");
  skip.type = "button";
  skip.className = "intro-video-skip";
  skip.textContent = "SKIP INTRO";
  // not until the film has been asked for: the page before it is read, not skipped
  skip.hidden = true;
  const titles = document.createElement("div");
  titles.className = "intro-titles";
  const grain = document.createElement("div");
  grain.className = "intro-titles-grain";
  grain.style.backgroundImage = `url(${noiseImage(256)})`;
  titles.append(grain);
  // the passages over the film, on a shade down its left side
  const shade = document.createElement("div");
  shade.className = "intro-video-shade";
  shade.setAttribute("aria-hidden", "true");
  const asides = document.createElement("div");
  asides.className = "intro-video-asides";
  asides.setAttribute("aria-live", "polite");
  root.append(video, vignette, shade, asides, titles, play, skip);
  document.body.append(root);
  document.body.classList.add("intro-video-on");

  let finishing = false, backgroundQuiet = true, frameCallback = null, revealDesk = null;
  const hasVideoFrames = typeof video.requestVideoFrameCallback === "function";
  const stopFrameWatch = () => {
    if (frameCallback === null) return;
    if (hasVideoFrames) video.cancelVideoFrameCallback(frameCallback);
    else cancelAnimationFrame(frameCallback);
    frameCallback = null;
  };
  scope.add(stopFrameWatch);
  const syncAudio = () => {
    // (a saved volume can sit a hair over 1, which a video will not take)
    video.volume = Math.min(1, Math.max(0, Number(audio.state.masterVol) || 0));
    video.muted = audio.state.muted;
    // The film carries its own soundtrack. Temporarily silence the Phaser
    // output (including the rain), retaining the player's saved volumes.
    if (backgroundQuiet && game.sound) game.sound.volume = 0;
  };
  const unsubscribe = audio.subscribe(syncAudio);
  syncAudio();
  const restoreAudio = () => {
    if (!backgroundQuiet) return;
    backgroundQuiet = false;
    unsubscribe();
    audio.refreshMasterVolume();
  };
  // Handed over into the game, the film's music plays on under the desk to
  // its own end, out of sight; if the desk is left before then, it dies away.
  let music = null;
  const keepMusic = () => {
    const holder = document.createElement("div");
    holder.className = "intro-video-music";
    holder.setAttribute("aria-hidden", "true");
    document.body.append(holder);
    // moved, not removed: a playing video taken out of the page would stop
    holder.append(video);
    const level = () => Math.min(1, Math.max(0, Number(audio.state.masterVol) || 0));
    let fading = false;
    const follow = () => { if (!fading) { video.volume = level(); video.muted = audio.state.muted; } };
    const unfollow = audio.subscribe(follow);
    follow();
    const end = () => {
      unfollow();
      video.pause();
      holder.remove();
      video.removeAttribute("src");
      video.load();
    };
    video.addEventListener("ended", end, { once: true });
    music = {
      // let die away over a moment, then stopped
      stop() {
        if (fading || !holder.isConnected) return;
        fading = true;
        const from = video.volume, began = performance.now();
        const quieten = now => {
          const k = Math.min(1, (now - began) / 1400);
          video.volume = Math.min(1, Math.max(0, from * (1 - k) ** 2));
          if (k < 1 && holder.isConnected) requestAnimationFrame(quieten);
          else if (holder.isConnected) end();
        };
        requestAnimationFrame(quieten);
      },
    };
  };
  const cleanup = (keep = false) => {
    scope.dispose();
    restoreAudio();
    if (!music) {
      if (keep && !video.paused && !video.ended) keepMusic();
      else video.pause();
    }
    // Detach first: unloading a visible video can briefly expose a black frame.
    root.remove();
    if (!music) {
      video.removeAttribute("src");
      video.load();
    }
    document.body.classList.remove("intro-video-on");
  };
  parent.add(() => { cleanup(); music?.stop(); });
  const completeTransition = (keep = false) => {
    if (scope.closed) return;
    cleanup(keep);
    revealDesk?.();
  };
  // The desk is laid out under the film while the film plays, and its
  // picture decoded, so that the film's last frame goes straight into it:
  // no wait, no black between the two.
  let underway = null, deskCamera = null;
  const prepareDesk = () => underway ??= (async () => {
    revealDesk = await onUnder();
    const image = await preloadPrologueDesk();
    if (!image || scope.closed) return;
    const camera = document.createElement("div");
    camera.className = "intro-video-desk";
    camera.setAttribute("aria-hidden", "true");
    const desk = document.createElement("img");
    desk.alt = "";
    desk.src = image.src;
    camera.append(desk);
    await desk.decode().catch(() => {});
    deskCamera = camera;
  })();
  const finish = async (matchFrame = false) => {
    if (finishing || scope.closed) return;
    finishing = true;
    stopFrameWatch();
    titles.remove();
    showAside(null);
    const handOver = matchFrame && !reducedMotion;
    const transitionMs = reducedMotion ? 250 : matchFrame ? 1800 : 650;
    root.style.setProperty("--film-transition", `${transitionMs}ms`);
    // handed over on its settled shot, the film runs on under the desk and its
    // music with it; skipped, it stops where it is
    if (!handOver) video.pause();
    play.hidden = true;
    skip.hidden = true;
    root.dataset.phase = "preparing";
    await prepareDesk();
    if (scope.closed) return;
    if (handOver && deskCamera) {
      restoreAudio();
      await intoTheGame(deskCamera);
      // the desk under it is now exactly what is showing: it is simply there,
      // and the music goes on
      completeTransition(true);
      return;
    }
    video.pause();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (scope.closed) return;
    root.dataset.phase = "transition";
    root.classList.add("is-dissolving");
    restoreAudio();
    // transitionend owns removal; the timer is only for suppressed transitions.
    scope.later(completeTransition, transitionMs + 200);
  };

  // into the game: the desk picture comes up over the film's settled shot,
  // framed as the film frames it; then the matte draws off the top and the
  // foot, and the camera moves in to the game's own framing (prologue.js
  // DESK_CAMERA), the grade going from the film's to the game's
  const intoTheGame = async (camera) => {
    root.insertBefore(camera, vignette);
    const desk = camera.firstElementChild;
    const width = root.clientWidth, height = root.clientHeight;
    const iw = desk.naturalWidth || 16, ih = desk.naturalHeight || 9;
    const vw = video.videoWidth || 1920, vh = video.videoHeight || 1080;
    // the film covers the band between the mattes; the desk, the whole screen
    const film = Math.max(width / vw, height * .8 / vh), full = Math.max(width / iw, height / ih);
    const Lw = vw * film, Lh = vh * film, Dw = iw * full;
    // the film's frame now: the desk picture drawn in `s` about (cx, cy)
    const { over, move, match: { s, cx, cy } } = HANDOFF;
    const k0 = s * Lw / Dw;
    const start = `translate(${width / 2 * (1 - k0) + (cx - .5) * Lw * (1 - s)}px, ${height / 2 * (1 - k0) + (cy - .5) * Lh * (1 - s)}px) scale(${k0})`;
    // the game's own framing (prologue.js DESK_CAMERA)
    const { zoom, origin } = DESK_CAMERA;
    const [ox, oy] = origin.split(" ").map((v, i) => parseFloat(v) / 100 * (i ? height : width));
    const end = `translate(${ox * (1 - zoom)}px, ${oy * (1 - zoom)}px) scale(${zoom})`;
    camera.style.transformOrigin = "0 0";
    root.style.setProperty("--unmatte", `${move - over}ms`);
    const steps = [
      camera.animate([{ opacity: 0 }, { opacity: 1 }], { duration: over, easing: "linear", fill: "forwards" }),
      // leaving at the film's own speed, and slowing to rest
      camera.animate([{ transform: start }, { transform: end }], { duration: move, easing: "cubic-bezier(.2,.52,.4,1)", fill: "forwards" }),
      desk.animate([{ filter: FILM_FILTER }, { filter: DESK_FILTER }], { duration: move, easing: "ease-in-out", fill: "forwards" }),
    ];
    scope.add(() => steps.forEach(step => step.cancel()));
    scope.later(() => root.classList.add("is-unmatting"), over);
    await Promise.all(steps.map(step => step.finished.catch(() => {})));
  };

  const make = (tag, className, text = "") => Object.assign(document.createElement(tag), { className, textContent: text });

  // A complete thought fades in together (passage.js); nothing makes the
  // reader wait for individual words. Gaps in OPENING let the picture breathe.

  // Before the film, two screens. First the case's name, large, with where
  // and when under it, and Next. Then two short paragraphs, coming up by
  // themselves one after the other — the case that has never let him go, and
  // tonight's letter — and Begin, into the film.
  let begin = null;
  const runTitles = () => new Promise(resolve => {
    root.dataset.phase = "titles";
    const { title, place, date, story } = OPENING.page;
    const button = (label) => { const b = make("button", "intro-page-play", label); b.type = "button"; return b; };
    const opening = make("div", "intro-card is-title");
    const next = button("Next");
    opening.append(make("h1", "intro-card-title", title), make("span", "intro-card-rule"),
      make("p", "intro-card-place", place), make("p", "intro-card-date", date), next);
    const page = make("div", "intro-card is-story");
    const paragraphs = story.map((text) => make("p", "intro-story-text", text));
    const go = button("Begin");
    const way = make("div", "intro-story-way");
    way.append(go, make("p", "intro-page-hint", "Best with sound"));
    page.append(...paragraphs, way);
    const reveal = (node) => requestAnimationFrame(() => requestAnimationFrame(() => node.classList.add("is-in")));
    let onPage = false;
    const toPage = () => {
      if (onPage) return;
      onPage = true;
      begin = null;
      opening.classList.replace("is-in", "is-out");
      scope.later(() => {
        opening.remove();
        titles.append(page);
        reveal(page);
        // the paragraphs, one after the other, then the way on
        [...paragraphs, way].forEach((node, i) => scope.later(() => node.classList.add("is-in"), reducedMotion ? 0 : 250 + i * 1400));
        scope.later(() => { begin = start; go.focus({ preventScroll: true }); }, reducedMotion ? 0 : 250 + paragraphs.length * 1400);
      }, reducedMotion ? 0 : 650);
    };
    const start = () => {
      begin = null;
      page.classList.replace("is-in", "is-out");
      skip.hidden = false;
      requestAnimationFrame(() => skip.classList.add("is-in"));
      resolve();
    };
    next.addEventListener("click", toPage);
    go.addEventListener("click", () => { if (begin === start) start(); });
    titles.append(opening);
    reveal(opening);
    scope.later(() => { if (!onPage) { begin = toPage; next.focus({ preventScroll: true }); } }, reducedMotion ? 0 : 900);
  });

  // ── the passages on the left of the picture; the shade under them stays
  // from the first to the last, not coming and going between them ──
  const FIRST = OPENING.asides[0].at[0], LAST = OPENING.asides.at(-1).at[1];
  let aside = null, asideNode = null;
  const showAside = time => {
    root.classList.toggle("has-aside", time !== null && time >= FIRST - .3 && time < LAST);
    const now = time === null ? null : OPENING.asides.find(({ at: [from, to] }) => time >= from && time < to) ?? null;
    if (now === aside) return;
    aside = now;
    if (asideNode) {
      const going = asideNode;
      going.classList.add("is-out");
      scope.later(() => going.remove(), reducedMotion ? 0 : 650);
      asideNode = null;
    }
    if (!now) return;
    asideNode = passage(now);
    asides.append(asideNode);
  };

  const watchFrame = () => {
    const inspect = (_now, frame) => {
      frameCallback = null;
      if (finishing || scope.closed) return;
      const time = frame?.mediaTime ?? video.currentTime;
      showAside(time);
      if (!video.seeking && Number.isFinite(video.duration) && video.duration > HANDOFF_AT && time >= HANDOFF_AT) {
        void finish(true);
        return;
      }
      watchFrame();
    };
    frameCallback = hasVideoFrames ? video.requestVideoFrameCallback(inspect) : requestAnimationFrame(inspect);
  };
  scope.on(root, "transitionend", event => {
    if (event.target === root && event.propertyName === "opacity" && root.dataset.phase === "transition") completeTransition();
  });

  const start = () => {
    if (finishing || scope.closed) return;
    play.hidden = true;
    syncAudio();
    video.play().catch(error => {
      if (scope.closed || finishing) return;
      if (error.name === "NotAllowedError") {
        root.dataset.phase = "ready";
        play.hidden = false;
        play.focus({ preventScroll: true });
      } else void finish();
    });
  };
  scope.on(video, "playing", () => {
    if (!finishing) root.dataset.phase = "playing";
    play.hidden = true;
    // a moment in, while nothing else is asked of the page
    scope.later(() => { if (!finishing) void prepareDesk(); }, 1500);
  });
  scope.on(video, "ended", () => { void finish(); });
  scope.on(video, "error", () => { void finish(); });
  scope.on(play, "click", start);
  scope.on(skip, "click", () => { void finish(); });
  scope.on(window, "keydown", event => {
    if (document.querySelector("#options-modal:not(.hidden), #howto-modal:not(.hidden)")) return;
    if (event.key !== "Escape" && event.target instanceof Element && event.target.closest("#compact-bar")) return;
    if (event.key === "Tab") return;
    event.stopPropagation();
    // Esc skips the film, once it has been asked for; the page waits for its button
    if (event.key === "Escape") { event.preventDefault(); if (!skip.hidden) void finish(); }
    else if ((event.key === "Enter" || event.key === " ") && root.dataset.phase === "titles") { event.preventDefault(); begin?.(); }
    else if ((event.key === "Enter" || event.key === " ") && !play.hidden) { event.preventDefault(); start(); }
  }, true);
  // the film loads behind the page, and comes up out of it once it is asked for
  root.classList.add("is-before");
  video.src = VIDEO;
  void runTitles().then(() => {
    if (finishing || scope.closed) return;
    root.classList.remove("is-before");
    root.dataset.phase = "loading";
    watchFrame();
    start();
    titles.classList.add("is-gone");
    scope.later(() => titles.remove(), reducedMotion ? 0 : 1800);
  });
}

// the grain of film over the black of the titles
function noiseImage(size) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d");
  const image = g.createImageData(size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const r = Math.random();
    image.data[i] = image.data[i + 1] = image.data[i + 2] = 120 + Math.random() * 135;
    image.data[i + 3] = r < 0.5 ? r * 120 : 0;
  }
  g.putImageData(image, 0, 0);
  return canvas.toDataURL();
}
