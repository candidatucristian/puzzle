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
window.currentLevelIndex = savedLevel ? parseInt(savedLevel) : 0;
window.unlockedLevelIndex = window.currentLevelIndex;

function goToLevel(index) {
  if (index < 0 || index >= window.GAME_LEVELS.length) {
    console.error("Invalid level index:", index);
    return;
  }

  // Fire any scene-specific Web Audio cleanup immediately (bypasses Phaser queue delay)
  if (typeof window._deadAirStop === "function") {
    window._deadAirStop();
    window._deadAirStop = null;
  }

  // Remove all scene-specific DOM overlays immediately (SVGs, car elements, umbrella, etc.)
  document.querySelectorAll(".scene-dom-overlay").forEach(el => el.remove());

  // Stop ALL active scenes — ensures shutdown() runs regardless of currentLevelIndex state
  for (const level of window.GAME_LEVELS) {
    if (game.scene.isActive(level.key)) {
      game.scene.stop(level.key);
    }
  }
  game.sound.stopAll();

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

// ── Start Screen Logic ──
const startScreen = document.getElementById("start-screen");
const btnStartGame = document.getElementById("btn-start-game");

const hasPlayedBefore = localStorage.getItem("hasPlayedBefore");
if (hasPlayedBefore) {
  btnStartGame.innerText = "CONTINUE";
} else {
  btnStartGame.innerText = "START GAME";
}

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

btnStartGame.addEventListener("click", () => {
  initGameScreen();
  goToLevel(window.currentLevelIndex); // Use the robust helper
});

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
      if (window.playSuccess && window.mainScene) window.playSuccess(window.mainScene);
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

// ── New Game Button ──
document.getElementById("btn-new").addEventListener("click", () => {
  initGameScreen();
  localStorage.setItem("puzzleUnlockedLevel", 0);
  window.unlockedLevelIndex = 0;
  goToLevel(0); // Use the robust helper
});

inputCode.addEventListener("keypress", (e) => {
  if (e.key === "Enter") btnSubmit.click();
});

// ── Replay Button ──
document.getElementById("btn-replay").addEventListener("click", () => {
  goToLevel(window.currentLevelIndex);
});

// ── Options Modal Logic ──
const optionsModal = document.getElementById("options-modal");
const btnOptions = document.getElementById("btn-options");
const btnCloseOptions = document.getElementById("btn-close-options");
const musicSlider = document.getElementById("music-slider");
const sfxSlider = document.getElementById("sfx-slider");
const btnMute = document.getElementById("btn-mute");
const volSliderUI = document.getElementById("vol-slider-ui");
const volIconUI   = document.getElementById("vol-icon-ui");

function syncMuteButtons() {
  const label = window.GameAudio.muted ? "🔇 UNMUTE" : "🔊 MUTE";
  btnMute.innerText = label;
  _syncVolIcon();
}

function _syncVolIcon() {
  const muted = window.GameAudio.muted;
  const vol   = window.GameAudio.sfxVol;
  volIconUI.textContent = (muted || vol === 0) ? "🔇" : vol < 0.5 ? "🔉" : "🔊";
  volSliderUI.value = muted ? 0 : vol;
}

musicSlider.value = window.GameAudio.musicVol;
sfxSlider.value = window.GameAudio.sfxVol;
syncMuteButtons();
_syncVolIcon();

btnOptions.addEventListener("click", () =>
  optionsModal.classList.remove("hidden"),
);
btnCloseOptions.addEventListener("click", () =>
  optionsModal.classList.add("hidden"),
);

musicSlider.addEventListener("input", (e) => {
  window.GameAudio.musicVol = parseFloat(e.target.value);
  localStorage.setItem("musicVol", window.GameAudio.musicVol);
  if (window.GameAudio.bgmInstance) {
    window.GameAudio.bgmInstance.setVolume(window.GameAudio.musicVol);
  }
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
  window.GameAudio.muted  = vol === 0;
  localStorage.setItem("sfxVol", vol);
  localStorage.setItem("muted", window.GameAudio.muted);
  sfxSlider.value = vol;
  syncMuteButtons();
  if (window.mainScene && window.mainScene.sound) {
    window.mainScene.sound.volume = vol;          // schimbă volumul sunetelor deja pornite
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
  StackingPlates:
    "OVERLAPPING FRAGMENTS.\nDrag the glass plates into the center slot to combine their patterns and reveal the hidden digit.",
  Phone: "AN OLD FRIEND CALLS.\nFind out who he actually is.",
  Fibonacci:
    "WATER THE PLANT.\nObserve the pattern of its leaves. What or who does it remind you of?",
  MorseCar:
    "SOMEONE IS TRYING TO COMMUNICATE.\nListen through the noise — the road has a message for you.",
  DeadAir:
    "DEAD AIR.\nFour channels. Four different worlds. All of them speak of the same thing — without ever saying it.",
};

btnInfo.addEventListener("click", () => {
  const currentLevelKey = window.GAME_LEVELS[window.currentLevelIndex].key;
  infoText.innerText =
    levelHints[currentLevelKey] || "SYSTEM CORRUPTED.\nNO DATA AVAILABLE.";
  infoModal.classList.remove("hidden");
});

btnCloseInfo.addEventListener("click", () => infoModal.classList.add("hidden"));

// ── Global UI Click Sound ──
document.body.addEventListener("mousedown", (e) => {
  if (e.target.tagName !== "CANVAS") {
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
