// ── Web Audio API fallback sounds ──
const AudioFX = (() => {
  let ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  function playClick() {
    if (window.GameAudio && window.GameAudio.muted) return;
    const vol = window.GameAudio ? window.GameAudio.sfxVol : 1;
    try {
      const ac = getCtx();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ac.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3 * vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.08);
    } catch (e) {}
  }
  function playSuccess() {
    if (window.GameAudio && window.GameAudio.muted) return;
    const vol = window.GameAudio ? window.GameAudio.sfxVol : 1;
    try {
      const ac = getCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.type = "sine";
        const t = ac.currentTime + i * 0.12;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.25 * vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    } catch (e) {}
  }
  function playError() {
    if (window.GameAudio && window.GameAudio.muted) return;
    const vol = window.GameAudio ? window.GameAudio.sfxVol : 1;
    try {
      const ac = getCtx();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ac.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3 * vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + 0.3);
    } catch (e) {}
  }
  return { playClick, playSuccess, playError };
})();

// ── Global Audio Helpers ──
window.initGlobalAudio = (scene) => {
  const bgm = window.GameAudio.bgmInstance;
  const bgmAlive = bgm && bgm.manager && bgm.isPlaying;
  if (!bgmAlive) {
    try {
      if (scene.cache.audio.exists("bgm")) {
        window.GameAudio.bgmInstance = scene.sound.add("bgm", {
          loop: true,
          volume: window.GameAudio.musicVol,
        });
        window.GameAudio.bgmInstance.play();
      }
    } catch (e) {}
  }
  scene.sound.setMute(window.GameAudio.muted);
};
window.playUIClick = () => {
  if (window.GameAudio && window.GameAudio.muted) return;
  try {
    if (window.mainScene && window.mainScene.cache.audio.exists("ui_click")) {
      window.mainScene.sound.play("ui_click", {
        volume: window.GameAudio.sfxVol,
      });
    } else {
      AudioFX.playClick();
    }
  } catch (e) {}
};
window.playErrorSound = () => {
  if (window.GameAudio && window.GameAudio.muted) return;
  try {
    if (window.mainScene && window.mainScene.cache.audio.exists("error")) {
      window.mainScene.sound.play("error", { volume: window.GameAudio.sfxVol });
    } else {
      AudioFX.playError();
    }
  } catch (e) {}
};
window.playClick = (scene) => {
  if (window.GameAudio && window.GameAudio.muted) return;
  const vol = window.GameAudio ? window.GameAudio.sfxVol : 1;
  try {
    if (scene.cache.audio.exists("click")) {
      scene.sound.play("click", { volume: vol });
      return;
    }
  } catch (e) {}
  AudioFX.playClick();
};
window.playSuccess = (scene) => {
  if (window.GameAudio && window.GameAudio.muted) return;
  const vol = window.GameAudio ? window.GameAudio.sfxVol : 1;
  try {
    if (scene.cache.audio.exists("nextlevel")) {
      scene.sound.play("nextlevel", { volume: vol });
      return;
    }
  } catch (e) {}
  AudioFX.playSuccess();
};

// ── Level Configuration ──
window.GAME_LEVELS = [
  {
    key: "StackingPlates",
    scene: StackingPlatesScene,
    code: "5",
    altCode: "FIVE",
  },
  {
    key: "Phone",
    scene: PhoneScene,
    code: "GEORGE",
    altCode: null,
  },
  {
    key: "Fibonacci",
    scene: FibonacciScene,
    code: "FIBO",
    altCode: "FIBONACCI",
  },
  {
    key: "MorseCar",
    scene: MorseCarScene,
    code: "SUMMER",
    altCode: null,
  },
  {
    key: "DeadAir",
    scene: DeadAirScene,
    code: "VOID",
    altCode: "NULL",
  },
  {
    key: "BinaryRouter",
    scene: BinaryRouterScene,
    code: "NIGHT",
    altCode: null,
  },
  {
    key: "Spectral",
    scene: SpectralScene,
    code: "DUST",
    altCode: null,
  },
];

const sceneList = window.GAME_LEVELS.map((level) => level.scene);

// ── Phaser Config ──
const config = {
  type: Phaser.AUTO,
  backgroundColor: "#0a0a10",
  parent: "game-container",
  dom: {
    createContainer: true,
  },
  scale: {
    mode: Phaser.Scale.NONE,
    parent: "game-container",
    width: "100%",
    height: "100%",
  },
  scene: sceneList,
};

const game = new Phaser.Game(config);
