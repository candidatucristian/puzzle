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
// Citim din memoria browserului (localStorage) dacă jucătorul a mai jucat
const savedLevel = localStorage.getItem("puzzleUnlockedLevel");
window.unlockedLevel = savedLevel ? parseInt(savedLevel) : 1;
window.currentLevel = window.unlockedLevel;

function renderLevels() {
  const grid = document.getElementById("levels-grid");
  grid.innerHTML = "";

  for (let i = 1; i <= 25; i++) {
    const btn = document.createElement("div");
    btn.innerText = i;

    if (i <= window.unlockedLevel) {
      if (i === window.currentLevel) {
        btn.className = "level-btn current";
      } else {
        btn.className = "level-btn unlocked";
      }
      btn.onclick = () => {
        window.currentLevel = i;
        renderLevels();
        if (window.mainScene) window.mainScene.transitionToLevel(i, true);
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

// Verificăm dacă jucătorul a mai apăsat vreodată butonul de start
const hasPlayedBefore = localStorage.getItem("hasPlayedBefore");
if (hasPlayedBefore) {
  btnStartGame.innerText = "CONTINUE";
} else {
  btnStartGame.innerText = "START GAME";
}

// Funcție pentru a ascunde ecranul de start și a debloca sunetul (necesar pentru toate butoanele)
function initGameScreen() {
  startScreen.classList.add("hidden");
  localStorage.setItem("hasPlayedBefore", "true"); // Salvăm amprenta vizitei
  // Deblocăm forțat contextul audio în caz că a fost blocat de browser
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
  if (window.mainScene) {
    window.mainScene.transitionToLevel(window.currentLevel, true);
  }
});

// ── Toggle Sidebar (FIXED) ──
const toggleBtn = document.getElementById("btn-toggle-levels");
const rightWrapper = document.getElementById("right-sidebar-wrapper");
let panelOpen = true; // starts open

toggleBtn.addEventListener("click", () => {
  panelOpen = !panelOpen;
  rightWrapper.classList.toggle("collapsed", !panelOpen);
  toggleBtn.textContent = panelOpen ? "◀" : "▶";
});

// ── Code Submit ──
const btnSubmit = document.getElementById("btn-submit");
const inputCode = document.getElementById("level-code");

btnSubmit.addEventListener("click", () => {
  const code = inputCode.value.toUpperCase();
  let isCorrect = false;
  let targetLevel = window.currentLevel;

  // Verificăm codul în funcție de nivelul curent
  if (window.currentLevel === 1 && code === "337") {
    isCorrect = true;
    targetLevel = 2;
  } else if (
    window.currentLevel === 2 &&
    (code === "FIBO" || code === "FIBONACCI")
  ) {
    isCorrect = true;
    targetLevel = 3;
  } else if (window.currentLevel === 3 && (code === "5" || code === "FIVE")) {
    isCorrect = true;
    targetLevel = 4;
  } else if (window.currentLevel === 4 && code === "POLAR") {
    isCorrect = true;
    targetLevel = 5;
  } else if (window.currentLevel === 5 && code === "CHAIN") {
    isCorrect = true;
    targetLevel = 6;
  }

  if (isCorrect) {
    window.unlockedLevel = Math.max(window.unlockedLevel, targetLevel); // Prevenim scăderea progresului
    window.currentLevel = targetLevel;
    localStorage.setItem("puzzleUnlockedLevel", window.unlockedLevel);
    renderLevels();

    if (window.mainScene) {
      window.mainScene.transitionToLevel(targetLevel);
    }

    inputCode.value = "";
  } else if (inputCode.value.trim() !== "") {
    // Când codul e greșit (și nu este gol)
    if (window.playErrorSound) window.playErrorSound();

    inputCode.classList.add("error-flash");
    // După o secundă, scoatem clasa ca să se facă fade înapoi la negru
    setTimeout(() => {
      inputCode.classList.remove("error-flash");
    }, 1000);
  }
});

// ── New Game Button ──
document.getElementById("btn-new").addEventListener("click", () => {
  initGameScreen();
  window.unlockedLevel = 1;
  window.currentLevel = 1;
  localStorage.setItem("puzzleUnlockedLevel", 1);
  renderLevels();
  if (window.mainScene) {
    window.mainScene.transitionToLevel(1, true);
  }
});

inputCode.addEventListener("keypress", (e) => {
  if (e.key === "Enter") btnSubmit.click();
});

// ── Options Modal Logic ──
const optionsModal = document.getElementById("options-modal");
const btnOptions = document.getElementById("btn-options");
const btnCloseOptions = document.getElementById("btn-close-options");
const musicSlider = document.getElementById("music-slider");
const sfxSlider = document.getElementById("sfx-slider");
const btnMute = document.getElementById("btn-mute");

// Sincronizăm interfața vizuală cu valorile salvate
musicSlider.value = window.GameAudio.musicVol;
sfxSlider.value = window.GameAudio.sfxVol;
btnMute.innerText = window.GameAudio.muted ? "🔇 UNMUTE" : "🔊 MUTE";

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

btnMute.addEventListener("click", () => {
  window.GameAudio.muted = !window.GameAudio.muted;
  localStorage.setItem("muted", window.GameAudio.muted);
  btnMute.innerText = window.GameAudio.muted ? "🔇 UNMUTE" : "🔊 MUTE";
  if (window.mainScene && window.mainScene.sound) {
    window.mainScene.sound.setMute(window.GameAudio.muted);
  }
});

// ── Info Modal Logic ──
const infoModal = document.getElementById("info-modal");
const btnInfo = document.getElementById("btn-info");
const btnCloseInfo = document.getElementById("btn-close-info");
const infoText = document.getElementById("info-text");

const levelHints = {
  1: "SOUND REQUIRED.\nInteract with the environment to find hidden clues.",
  2: "NATURE'S SEQUENCE.\nWater the plant and observe the mathematical pattern of its leaves.",
  3: "OVERLAPPING FRAGMENTS.\nDrag the glass plates into the center slot to combine their patterns and reveal the hidden digit.",
  4: "POLARITY.\nOpposites attract to create neutral cores. Cores can absorb one extra element. Build 3 neutral cores to win.",
  5: "CASCADING CHAINS.\nTiles automatically continue merging if they slide into identical values. Trigger chain reactions to build a 64 tile.",
};

btnInfo.addEventListener("click", () => {
  infoText.innerText =
    levelHints[window.currentLevel] || "SYSTEM CORRUPTED.\nNO DATA AVAILABLE.";
  infoModal.classList.remove("hidden");
});

btnCloseInfo.addEventListener("click", () => infoModal.classList.add("hidden"));

// ── Global UI Click Sound ──
document.body.addEventListener("mousedown", (e) => {
  // Sunet UI pentru tot ce e în afara jocului (meniu, sidebar, input)
  if (e.target.tagName !== "CANVAS") {
    if (window.playUIClick) window.playUIClick();
  }
});

// ── Fix Phaser Resize Lag ──
// Păstrăm canvas-ul centrat cu Flexbox în timpul glisării meniului,
// și recalculăm rezoluția internă WebGL doar după ce s-a terminat animația (350ms).
const gameContainer = document.getElementById("game-container");
let resizeTimer;
const resizeObserver = new ResizeObserver((entries) => {
  for (let entry of entries) {
    const w = entry.contentRect.width;
    const h = entry.contentRect.height;

    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.mainScene && window.mainScene.scale) {
        window.mainScene.scale.resize(w, h);
        // Trimitem un semnal jocului să își re-centreze elementele
        window.mainScene.events.emit("canvas_resized", {
          width: w,
          height: h,
        });
      }
    }, 350);
  }
});
resizeObserver.observe(gameContainer);
