// Forțăm browserul să selecteze fereastra jocului imediat după refresh
window.focus();

// ── Global Audio State ──
window.GameAudio = {
  musicVol:
    localStorage.getItem("musicVol") !== null
      ? parseFloat(localStorage.getItem("musicVol"))
      : 0.5,
  sfxVol:
    localStorage.getItem("sfxVol") !== null
      ? parseFloat(localStorage.getItem("sfxVol"))
      : 0.8,
  muted: localStorage.getItem("muted") === "true",
  bgmInstance: null,
};

// ── Levels Logic ──
const savedLevel = localStorage.getItem("puzzleUnlockedLevel");
// clamp: the level list may have shrunk since the progress was saved
window.currentLevelIndex = Math.min(
  savedLevel ? parseInt(savedLevel) : 0,
  window.GAME_LEVELS.length - 1,
);
window.unlockedLevelIndex = window.currentLevelIndex;

function goToLevel(index) {
  if (index < 0 || index >= window.GAME_LEVELS.length) {
    console.error("Invalid level index:", index);
    return;
  }

  // Remove all scene-specific DOM overlays immediately (SVGs, TV, switch, etc.)
  document.querySelectorAll(".scene-dom-overlay").forEach((el) => el.remove());

  // Stop ALL active scenes — ensures shutdown() runs regardless of currentLevelIndex state
  for (const level of window.GAME_LEVELS) {
    if (game.scene.isActive(level.key)) {
      game.scene.stop(level.key);
    }
  }
  // Stop every sound EXCEPT the persistent background music
  game.sound.sounds.forEach((s) => {
    if (s !== window.GameAudio.bgmInstance) s.stop();
  });

  window.currentLevelIndex = index;
  renderLevels();

  game.scene.start(window.GAME_LEVELS[index].key, { skipFade: true });
}

function renderLevels() {
  const grid = document.getElementById("levels-grid");
  grid.innerHTML = "";

  for (let i = 0; i < window.GAME_LEVELS.length; i++) {
    const btn = document.createElement("div");
    btn.innerText = i + 1;

    if (i <= window.unlockedLevelIndex) {
      if (i === window.currentLevelIndex) {
        btn.className = "level-btn current";
      } else {
        btn.className = "level-btn unlocked";
      }
      btn.onclick = () => {
        goToLevel(i);
      };
    } else {
      btn.className = "level-btn locked";
    }
    grid.appendChild(btn);
  }
}

renderLevels();

// ── Mobile Block ──
// phones aren't supported: no keyboard, no hover, tiny canvas
const isMobile =
  /Android|iPhone|iPod|Mobi/i.test(navigator.userAgent) ||
  (window.matchMedia("(pointer: coarse)").matches &&
    Math.min(window.screen.width, window.screen.height) < 768);
if (isMobile) {
  document.getElementById("mobile-block").classList.remove("hidden");
}

// ── Start Screen Logic ──
const startScreen = document.getElementById("start-screen");

function initGameScreen() {
  startScreen.classList.add("hidden");
  localStorage.setItem("hasPlayedBefore", "true");
  if (
    window.mainScene &&
    window.mainScene.sound &&
    window.mainScene.sound.context
  ) {
    if (window.mainScene.sound.context.state === "suspended") {
      window.mainScene.sound.context.resume();
    }
  }
}

// ── Intro Sequence ──
// Cinematic opening: epigraph lines fade in and out, then the gold title
// card. Plays on the first visit ever and after a game reset; returning
// players go straight into their level. Skippable any time.
const introScreen = document.getElementById("intro-screen");
const introLine = document.getElementById("intro-line");
const introTitle = document.getElementById("intro-title");
const INTRO_LINES = [
  "The room is quiet. Too quiet.",
  "Twelve doors. Twelve locks.",
  "Each one opens with a single word.",
  "Everything you need is already in front of you.",
  "Look closer.",
];

let introActive = false;
let introSkipRequested = false;
let introStartedAt = 0;

function requestIntroSkip() {
  // ignore the very keypress/click that launched the intro
  if (introActive && Date.now() - introStartedAt > 400) {
    introSkipRequested = true;
  }
}
window.addEventListener("keydown", requestIntroSkip);
introScreen.addEventListener("click", requestIntroSkip);

// sleep that wakes early the moment a skip is requested
function introSleep(ms) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (introSkipRequested || Date.now() - t0 >= ms) {
        clearInterval(iv);
        resolve();
      }
    }, 60);
  });
}

async function playIntro(onDone) {
  introActive = true;
  introSkipRequested = false;
  introStartedAt = Date.now();
  introLine.textContent = "";
  introLine.classList.remove("show");
  introTitle.classList.remove("show");
  introScreen.classList.remove("fade-out");
  introScreen.classList.remove("hidden");

  for (const line of INTRO_LINES) {
    if (introSkipRequested) break;
    introLine.textContent = line;
    introLine.classList.add("show");
    await introSleep(2700); // fade in + hold
    introLine.classList.remove("show");
    if (introSkipRequested) break;
    await introSleep(1000); // fade out + beat of black
  }
  introLine.classList.remove("show");

  if (!introSkipRequested) {
    await introSleep(300);
    introTitle.classList.add("show");
    await introSleep(3600);
  }

  introScreen.classList.add("fade-out");
  setTimeout(() => {
    introScreen.classList.add("hidden");
    introTitle.classList.remove("show");
    introActive = false;
    onDone();
  }, 1000); // matches the CSS opacity transition
}

// any key (or a click on the wallpaper) starts the game
function startTheGame() {
  if (isMobile) return;
  if (startScreen.classList.contains("hidden")) return;
  // don't fire while a modal sits on top of the start screen
  if (!document.getElementById("howto-modal").classList.contains("hidden"))
    return;
  if (!document.getElementById("options-modal").classList.contains("hidden"))
    return;
  const firstVisit = !localStorage.getItem("hasPlayedBefore");
  initGameScreen();
  if (firstVisit) {
    playIntro(() => goToLevel(window.currentLevelIndex));
  } else {
    goToLevel(window.currentLevelIndex); // Use the robust helper
  }
}

window.addEventListener("keydown", startTheGame);
startScreen.addEventListener("click", startTheGame);

// ── Start-screen gold dust ──
// Slow-drifting, twinkling motes over the wallpaper. Stops (and frees the
// rAF loop) as soon as the start screen is dismissed.
(function initStartParticles() {
  const canvas = document.getElementById("start-particles");
  if (!canvas || isMobile) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const ctx = canvas.getContext("2d");
  let w, h;

  function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  function spawn(anywhere) {
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 8,
      r: Math.random() * 1.7 + 0.4,
      speed: Math.random() * 0.22 + 0.06,
      sway: Math.random() * Math.PI * 2,
      swayAmp: Math.random() * 0.35 + 0.08,
      alpha: Math.random() * 0.45 + 0.12,
      twinkle: Math.random() * 0.03 + 0.008,
    };
  }

  const motes = [];
  for (let i = 0; i < 44; i++) motes.push(spawn(true));

  let t = 0;
  function frame() {
    if (startScreen.classList.contains("hidden")) return; // start screen gone — stop for good
    t++;
    ctx.clearRect(0, 0, w, h);
    for (const m of motes) {
      m.y -= m.speed;
      m.x += Math.sin(t * 0.008 + m.sway) * m.swayAmp * 0.35;
      const a = m.alpha * (0.55 + 0.45 * Math.sin(t * m.twinkle * 8 + m.sway));
      ctx.beginPath();
      ctx.fillStyle = "rgba(240, 221, 164, " + Math.max(0, a).toFixed(3) + ")";
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
      if (m.y < -8) Object.assign(m, spawn(false));
    }
    requestAnimationFrame(frame);
  }
  frame();
})();

// ── Code Submit ──
const btnSubmit = document.getElementById("btn-submit");
const inputCode = document.getElementById("level-code");

btnSubmit.addEventListener("click", () => {
  const code = inputCode.value.toUpperCase();
  const currentLevelConfig = window.GAME_LEVELS[window.currentLevelIndex];

  let isCorrect =
    code === currentLevelConfig.code ||
    (currentLevelConfig.altCode && code === currentLevelConfig.altCode);

  if (isCorrect) {
    const isLastLevel =
      window.currentLevelIndex === window.GAME_LEVELS.length - 1;

    if (isLastLevel) {
      if (window.playSuccess && window.mainScene)
        window.playSuccess(window.mainScene);
      setTimeout(
        () => alert("CONGRATULATIONS! You have completed the game!"),
        500,
      );
    } else {
      const nextLevelIndex = window.currentLevelIndex + 1;
      window.unlockedLevelIndex = Math.max(
        window.unlockedLevelIndex,
        nextLevelIndex,
      );
      localStorage.setItem("puzzleUnlockedLevel", window.unlockedLevelIndex);

      const currentSceneKey = currentLevelConfig.key;
      const nextSceneKey = window.GAME_LEVELS[nextLevelIndex].key;
      const currentScene = game.scene.getScene(currentSceneKey);

      // Attempt to transition gracefully
      if (
        currentScene &&
        currentScene.scene.isActive() &&
        typeof currentScene.transitionToLevel === "function"
      ) {
        // Update state and UI before starting the transition
        window.currentLevelIndex = nextLevelIndex; // Update state
        renderLevels(); // Redraw UI
        currentScene.transitionToLevel(nextSceneKey);
      } else {
        // Fallback for scenes without a transition method, use the robust helper
        goToLevel(nextLevelIndex);
      }
    }
    inputCode.value = "";
  } else if (inputCode.value.trim() !== "") {
    if (window.playErrorSound) window.playErrorSound();
    inputCode.classList.add("error-flash");
    setTimeout(() => {
      inputCode.classList.remove("error-flash");
    }, 1000);
  }
});

// ── Reset Game Button (inside Options, asks to confirm) ──
const btnNew = document.getElementById("btn-new");
let resetArmed = false;
let resetDisarmTimer = null;

function disarmReset() {
  resetArmed = false;
  clearTimeout(resetDisarmTimer);
  btnNew.classList.remove("armed");
  btnNew.innerText = "RESET GAME";
}

btnNew.addEventListener("click", () => {
  if (!resetArmed) {
    resetArmed = true;
    btnNew.classList.add("armed");
    btnNew.innerText = "CLICK AGAIN TO CONFIRM";
    resetDisarmTimer = setTimeout(disarmReset, 4000);
    return;
  }
  disarmReset();
  document.getElementById("options-modal").classList.add("hidden");
  localStorage.setItem("puzzleUnlockedLevel", 0);
  window.unlockedLevelIndex = 0;
  initGameScreen();
  playIntro(() => goToLevel(0));
});

inputCode.addEventListener("keypress", (e) => {
  if (e.key === "Enter") btnSubmit.click();
});

// ── Replay Button ──
document.getElementById("btn-replay").addEventListener("click", () => {
  goToLevel(window.currentLevelIndex);
});

// ── How to Play Modal ──
const howtoModal = document.getElementById("howto-modal");
document.getElementById("btn-howto").addEventListener("click", () => {
  howtoModal.classList.remove("hidden");
});
document.getElementById("btn-close-howto").addEventListener("click", () => {
  howtoModal.classList.add("hidden");
});

// ── Options Modal Logic ──
const optionsModal = document.getElementById("options-modal");
const btnOptions = document.getElementById("btn-options");
const btnCloseOptions = document.getElementById("btn-close-options");
const musicSlider = document.getElementById("music-slider");
const sfxSlider = document.getElementById("sfx-slider");
const btnMute = document.getElementById("btn-mute");
const volSliderUI = document.getElementById("vol-slider-ui");
const volIconUI = document.getElementById("vol-icon-ui");

function syncMuteButtons() {
  btnMute.innerHTML = window.GameAudio.muted
    ? '<span class="btn-emoji">🔇</span> UNMUTE'
    : '<span class="btn-emoji">🔊</span> MUTE';
  _syncVolIcon();
}

function _syncVolIcon() {
  const muted = window.GameAudio.muted;
  const vol = window.GameAudio.sfxVol;
  volIconUI.textContent = muted || vol === 0 ? "🔇" : vol < 0.5 ? "🔉" : "🔊";
  volSliderUI.value = muted ? 0 : vol;
}

musicSlider.value = window.GameAudio.musicVol;
sfxSlider.value = window.GameAudio.sfxVol;
syncMuteButtons();
_syncVolIcon();

btnOptions.addEventListener("click", () => {
  disarmReset();
  optionsModal.classList.remove("hidden");
});
btnCloseOptions.addEventListener("click", () => {
  disarmReset();
  optionsModal.classList.add("hidden");
});

musicSlider.addEventListener("input", (e) => {
  window.GameAudio.musicVol = parseFloat(e.target.value);
  localStorage.setItem("musicVol", window.GameAudio.musicVol);
  if (window.refreshBgmVolume) window.refreshBgmVolume();
});

sfxSlider.addEventListener("input", (e) => {
  window.GameAudio.sfxVol = parseFloat(e.target.value);
  localStorage.setItem("sfxVol", window.GameAudio.sfxVol);
});

function toggleMute() {
  window.GameAudio.muted = !window.GameAudio.muted;
  localStorage.setItem("muted", window.GameAudio.muted);
  syncMuteButtons();
  if (window.mainScene && window.mainScene.sound) {
    const vol = window.GameAudio.muted ? 0 : window.GameAudio.sfxVol;
    window.mainScene.sound.volume = vol;
    window.mainScene.sound.setMute(window.GameAudio.muted);
  }
}

btnMute.addEventListener("click", toggleMute);

// Volume widget — slider controls master volume; vol=0 auto-mutes
volSliderUI.addEventListener("input", (e) => {
  const vol = parseFloat(e.target.value);
  window.GameAudio.sfxVol = vol;
  window.GameAudio.muted = vol === 0;
  localStorage.setItem("sfxVol", vol);
  localStorage.setItem("muted", window.GameAudio.muted);
  sfxSlider.value = vol;
  syncMuteButtons();
  if (window.mainScene && window.mainScene.sound) {
    window.mainScene.sound.volume = vol; // schimbă volumul sunetelor deja pornite
    window.mainScene.sound.setMute(vol === 0);
  }
});

// Icon click toggles mute (slider position preserved)
volIconUI.addEventListener("click", () => {
  toggleMute();
});

// ── Info Modal Logic ──
const infoModal = document.getElementById("info-modal");
const btnInfo = document.getElementById("btn-info");
const btnCloseInfo = document.getElementById("btn-close-info");
const infoText = document.getElementById("info-text");

const levelHints = {
  MobilePhone: {
    text: "AN OLD FRIEND CALLS.\nFind out who he actually is.",
    sound: false,
    tool: true,
  },
  PlantPot: {
    text: "WATER THE PLANT.\nObserve the pattern of its leaves. What or who does it remind you of?",
    sound: false,
    tool: true,
  },
  TV: {
    text: "DEAD AIR.\nFour channels. Four different worlds. All of them speak of the same thing — without ever saying it.",
    sound: false,
    tool: false,
  },
  Modem: {
    text: "SIGNAL INTERCEPTED.\nThe old router never stopped transmitting.",
    sound: false,
    tool: true,
  },
  Lightswitch: {
    text: "A DARK ROOM. A SWITCH ON THE WALL.\nSome bulbs flicker. This one insists.",
    sound: false,
    tool: true,
  },
  Telescope: {
    text: "A TELESCOPE AT THE WINDOW.\nNot everything up there was arranged by nature.",
    sound: true,
    tool: true,
  },
  Prism: {
    text: "BROKEN LIGHT.\nTwelve panes of glass, five empty frames, one word. Pair the panes that belong together and turn them until the light agrees. Mind the maker's marks — and know that two panes belong to no one.",
    sound: false,
    tool: false,
  },
  Cryptex: {
    text: "AN OLD BRASS WHEEL.\nIt turns like a clock that lost its hours.",
    sound: false,
    tool: true,
  },
  Chessboard: {
    text: "AN ABANDONED GAME.\nNobody won. This game is too heavy for the mind - it brings so much ...",
    sound: false,
    tool: true,
  },
  Mosaic: {
    text: "A RUINED MOSAIC.\nThe masons left their tallies on the frame — each number counts an unbroken run of tiles. Reason it back together. Guessing ruins walls.",
    sound: false,
    tool: false,
  },
  Elevator: {
    text: "AN ELEVATOR.\nIt works perfectly. That is the problem.",
    sound: true,
    tool: false,
  },
  Typewriter: {
    text: "AN OLD TYPEWRITER.\nIt types what it wants. The note trusted it anyway.",
    sound: false,
    tool: false,
  },
};

btnInfo.addEventListener("click", () => {
  const currentLevelKey = window.GAME_LEVELS[window.currentLevelIndex].key;
  const hint = levelHints[currentLevelKey] || {
    text: "SYSTEM CORRUPTED.\nNO DATA AVAILABLE.",
    sound: false,
    tool: false,
  };

  infoText.innerText = hint.text;

  const reqDiv = document.getElementById("info-requires");
  reqDiv.innerHTML = "";
  if (hint.sound || hint.tool) {
    const badges = document.createElement("div");
    badges.style.cssText =
      "display:flex;gap:12px;justify-content:center;margin-bottom:18px;";
    if (hint.sound) {
      const b = document.createElement("div");
      b.style.cssText =
        "display:flex;flex-direction:column;align-items:center;gap:4px;background:#111;border:1px solid #333;padding:8px 18px;font-family:monospace;font-size:11px;letter-spacing:2px;color:#777;";
      b.innerHTML = `<span style="font-size:22px;">🔊</span><span>SOUND</span>`;
      badges.appendChild(b);
    }
    if (hint.tool) {
      const b = document.createElement("div");
      b.style.cssText =
        "display:flex;flex-direction:column;align-items:center;gap:4px;background:#111;border:1px solid #333;padding:8px 18px;font-family:monospace;font-size:11px;letter-spacing:2px;color:#777;";
      b.innerHTML = `<span style="font-size:22px;">🔧</span><span>TOOL</span>`;
      badges.appendChild(b);
    }
    reqDiv.appendChild(badges);
  }

  infoModal.classList.remove("hidden");
});

btnCloseInfo.addEventListener("click", () => infoModal.classList.add("hidden"));

// ── Global UI Click Sound ──
// UI click sound — only for app chrome (buttons, sliders, level tiles), never the game area
document.body.addEventListener("mousedown", (e) => {
  if (e.target.closest("#game-container")) return;
  if (e.target.closest("button, input, .level-btn, #vol-icon-ui")) {
    if (window.playUIClick) window.playUIClick();
  }
});

// ── Fix Phaser Resize Lag ──
const gameContainer = document.getElementById("game-container");
let resizeTimer;
const resizeObserver = new ResizeObserver((entries) => {
  for (let entry of entries) {
    const w = entry.contentRect.width;
    const h = entry.contentRect.height;

    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (game && game.scale) {
        game.scale.resize(w, h);
        game.canvas.style.width = w + "px";
        game.canvas.style.height = h + "px";

        // Emit resize event for all active scenes
        for (const scene of game.scene.getScenes(true)) {
          scene.events.emit("canvas_resized", { width: w, height: h });
        }
      }
    }, 350);
  }
});
resizeObserver.observe(gameContainer);
