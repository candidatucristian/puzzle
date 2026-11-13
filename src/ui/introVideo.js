import { Scope } from "../shared/Scope.js";
import { OPENING } from "../shared/story.js";
import { preloadPrologueDesk, DESK_CAMERA } from "./prologue.js";
import { passage } from "./passage.js";

// (the web demo's build plays a copy made for the web — a third of the size,
// the same picture and colour, and able to start before it has all come:
// scripts/web-video.py and mp4-faststart.mjs; the game itself the original)
// the web builds (the demo, the full game) play the film re-encoded for the web
const WEB_BUILD = (typeof __DEMO_BUILD__ !== "undefined" && __DEMO_BUILD__) || (typeof __FULL_BUILD__ !== "undefined" && __FULL_BUILD__);
const VIDEO = `${import.meta.env.BASE_URL}assets/video/${WEB_BUILD ? "IntroVideo-web.mp4" : "IntroVideo.mp4"}`;
// The film's last shot is the camera drawing back from his desk; it goes to
// black on its own at 75.3 s. The game takes over before that, at 72.4 s,
// with a fade through black. The film's desk and the game's (a Blender
// render) are not the same picture, so a quick dissolve between them reads
// as a flicker. Instead the film goes down to black, there is a short hold,
// and the desk comes up out of the black while the camera keeps drawing back
// a little and comes to rest on the game's framing.
const HANDOFF_AT = 72.4;
const HANDOFF = {
  out: 1300,     // the film to black
  hold: 280,     // black, the desk already laid in under it
  in: 1700,      // the desk up out of the black
  drift: 2900,   // the camera drawing back, from `from` to the game's framing
  from: 1.045,
};
const easeOut = "cubic-bezier(.4, 0, .6, 1)";
const easeIn = "cubic-bezier(.33, 0, .2, 1)";

// Arthur Wren's story first, then the film when it is asked for;
// one quiet passage at a time as it plays; then, on its last
// shot, straight into the game. The desk is laid out and decoded first.
// `replay`: asked for again from the desk — straight into the film, no pages
// before it, coming up over the desk; `onCovered` once the desk is hidden.
export function playIntroVideo(parent, { game, audio, reducedMotion = false, onUnder = () => {}, i18n = null, replay = false, onCovered = () => {} }) {
  const scope = new Scope();
  const root = document.createElement("div");
  const setPhase = (phase) => {
    root.dataset.phase = phase;
  };
  root.id = "intro-video";
  // (asked for again, it comes in over the desk from nothing, not at once)
  if (replay) root.style.opacity = "0";
  root.dataset.i18nAria = 'intro.ariaFilm';
  setPhase("loading");
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", i18n ? i18n.t("intro.ariaFilm") : "The opening film");

  const video = document.createElement("video");
  video.className = "intro-video-film";
  video.dataset.i18nAria = 'intro.ariaAshcombe';
  video.preload = "auto";
  video.playsInline = true;
  video.disablePictureInPicture = true;
  video.disableRemotePlayback = true;
  video.setAttribute("aria-label", i18n ? i18n.t("intro.ariaAshcombe") : "Ashcombe Manor introduction");
  const vignette = document.createElement("div");
  vignette.className = "intro-video-vignette opening-vignette";
  vignette.setAttribute("aria-hidden", "true");
  const play = document.createElement("button");
  play.id = "intro-video-play";
  play.type = "button";
  play.className = "intro-video-play";
  play.dataset.i18n = 'intro.playFilm';
  play.textContent = i18n ? i18n.t("intro.playFilm") : "Play opening film";
  play.hidden = true;
  const skip = document.createElement("button");
  skip.type = "button";
  skip.className = "intro-video-skip";
  skip.dataset.i18n = 'intro.skip';
  skip.textContent = i18n ? i18n.t("intro.skip") : "SKIP INTRO";
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
  // (once: what owns the film may tear it down again later, by then only to
  // stop its music, never to touch the page another film may now be on)
  let cleaned = false;
  const cleanup = (keep = false) => {
    if (cleaned) return;
    cleaned = true;
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
    const transitionMs = reducedMotion ? 250 : 900;
    root.style.setProperty("--film-transition", `${transitionMs}ms`);
    // handed over on its settled shot, the film runs on under the desk and its
    // music with it; skipped, it stops where it is
    if (!handOver) video.pause();
    play.hidden = true;
    skip.hidden = true;
    setPhase("preparing");
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
    // skipped, too, it goes through black: the film down, then the desk up
    if (!reducedMotion) await toBlack(450);
    else await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (scope.closed) return;
    setPhase("transition");
    root.classList.add("is-dissolving");
    restoreAudio();
    // transitionend owns removal; the timer is only for suppressed transitions.
    scope.later(completeTransition, transitionMs + 200);
  };

  // into the game: the film goes down to black; the desk, already laid in
  // under the black (so it is drawn and ready, never popping in), comes up
  // out of it while the camera draws back a little to the game's own framing
  // (prologue.js DESK_CAMERA). At the end it is exactly what the desk under
  // the film shows, so taking the film away changes nothing on screen.
  const settle = (animations) => {
    scope.add(() => animations.forEach(a => a.cancel()));
    return Promise.all(animations.map(a => a.finished.catch(() => {})));
  };
  const pause = ms => new Promise(resolve => scope.later(resolve, ms));
  const toBlack = (duration) => settle([video, vignette, shade].map(el =>
    el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], { duration, easing: easeOut, fill: "forwards" })));
  const intoTheGame = async (camera) => {
    const { out, hold, in: up, drift, from } = HANDOFF;
    const { zoom, origin } = DESK_CAMERA;
    camera.style.opacity = "0";
    camera.style.transformOrigin = origin;
    camera.style.transform = `scale(${from})`;
    root.insertBefore(camera, vignette);
    await toBlack(out);
    if (scope.closed) return;
    // on the black the mattes go at once; nothing of them is seen
    root.style.setProperty("--unmatte", "0ms");
    root.classList.add("is-unmatting");
    await pause(hold);
    if (scope.closed) return;
    await settle([
      camera.animate([{ opacity: 0 }, { opacity: 1 }], { duration: up, easing: easeIn, fill: "forwards" }),
      camera.animate([{ transform: `scale(${from})` }, { transform: `scale(${zoom})` }], { duration: drift, easing: "cubic-bezier(.2, .45, .3, 1)", fill: "forwards" }),
    ]);
  };

  const make = (tag, className, text = "") => Object.assign(document.createElement(tag), { className, textContent: text });

  // A complete thought fades in together (passage.js); nothing makes the
  // reader wait for individual words. Gaps in OPENING let the picture breathe.

  // Before the film, two screens. First the case's name, large, with where
  // and when under it, and Next. Then two short paragraphs, coming up by
  // themselves one after the other — the case that has never let him go, and
  // tonight's letter — and Begin, into the film.
  let begin = null;
  let openingData = i18n?.getOpening() || OPENING;
  let refreshTitles = () => {};
  const runTitles = () => new Promise(resolve => {
    setPhase("titles");
    const { title, place, date, story } = openingData.page;
    // the way on, with how far along the opening it is: "Next [1/2]"
    const button = (label, step) => {
      const b = make("button", "intro-page-play", label);
      b.type = "button";
      if (step) b.append(" ", make("span", "next-count", `[${step}/2]`));
      return b;
    };
    const opening = make("div", "intro-card is-title");
    const next = button(i18n ? i18n.t("common.next") : "Next", 1);
    opening.append(make("h1", "intro-card-title", title), make("span", "intro-card-rule"),
      make("p", "intro-card-place", place), make("p", "intro-card-date", date), next);
    const page = make("div", "intro-card is-story");
    const paragraphs = story.map((text) => make("p", "intro-story-text", text));
    const go = button(i18n ? i18n.t("common.begin") : "Begin", 2);
    const way = make("div", "intro-story-way");
    way.append(go, make("p", "intro-page-hint", i18n ? i18n.t("intro.bestWithSound") : "Best with sound"));
    page.append(...paragraphs, way);
    refreshTitles = () => {
      const copy = openingData.page;
      opening.querySelector('.intro-card-title').textContent = copy.title;
      opening.querySelector('.intro-card-place').textContent = copy.place;
      opening.querySelector('.intro-card-date').textContent = copy.date;
      paragraphs.forEach((paragraph, index) => { paragraph.textContent = copy.story[index] ?? ''; });
      next.firstChild.nodeValue = i18n.t('common.next');
      go.firstChild.nodeValue = i18n.t('common.begin');
      way.querySelector('.intro-page-hint').textContent = i18n.t('intro.bestWithSound');
    };
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
  let asidesList = openingData.asides;
  const FIRST = asidesList[0].at[0], LAST = asidesList.at(-1).at[1];
  let aside = null, asideNode = null;
  const showAside = time => {
    root.classList.toggle("has-aside", time !== null && time >= FIRST - .3 && time < LAST);
    const now = time === null ? null : asidesList.find(({ at: [from, to] }) => time >= from && time < to) ?? null;
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
  if (i18n) scope.add(i18n.subscribe(() => {
    openingData = i18n.getOpening() || OPENING;
    asidesList = openingData.asides;
    refreshTitles();
    if (asideNode) showAside(video.currentTime);
  }));

  const watchFrame = () => {
    const inspect = (_now, frame) => {
      frameCallback = null;
      if (finishing || scope.closed) return;
      const time = frame?.mediaTime ?? video.currentTime;
      if (root.dataset.phase === "loading" && !video.paused && time > 0) markPlaying();
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
    setPhase("playing");
    const playback = video.play();
    if (playback !== undefined) {
      playback.then(() => {
        if (!finishing) markPlaying();
      }).catch(error => {
        if (scope.closed || finishing) return;
        if (error.name === "NotAllowedError") {
          setPhase("ready");
          play.hidden = false;
          play.focus({ preventScroll: true });
        } else void finish();
      });
    }
  };
  const markPlaying = () => {
    if (!finishing) setPhase("playing");
    play.hidden = true;
    scope.later(() => { if (!finishing) void prepareDesk(); }, 1500);
  };
  scope.on(video, "playing", markPlaying);
  scope.on(video, "timeupdate", () => {
    if (root.dataset.phase === "loading" && !video.paused && video.currentTime > 0) markPlaying();
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
  // Laid in at once, under the loading screen, so its black is what the
  // loading screen fades into — the house is never glimpsed before the story.
  // The titles begin only as the loading screen starts to go.
  const loaded = () => new Promise(resolve => {
    const look = () => {
      const screen = document.getElementById("loading-screen");
      if (!screen || screen.classList.contains("fade-out")) resolve();
      else scope.later(look, 60);
    };
    look();
  });
  // asked for again: up over the desk, out of nothing into black, then the film
  const overTheDesk = () => new Promise(resolve => {
    setPhase("titles");
    titles.remove();
    skip.hidden = false;
    requestAnimationFrame(() => skip.classList.add("is-in"));
    const coming = root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reducedMotion ? 1 : 900, easing: easeOut });
    root.style.opacity = "";
    scope.add(() => coming.cancel());
    coming.finished.catch(() => {}).then(() => {
      if (scope.closed) return;
      onCovered();
      resolve();
    });
  });
  void loaded().then(() => (scope.closed ? null : replay ? overTheDesk() : runTitles())).then(() => {
    if (finishing || scope.closed) return;
    root.classList.remove("is-before");
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
