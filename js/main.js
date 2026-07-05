// ── Background music stays subdued relative to the music-volume slider ──
const BGM_GAIN = 0.4;
function bgmVolume() {
  return (window.GameAudio ? window.GameAudio.musicVol : 0.5) * BGM_GAIN;
}

// Play a global SFX by cache key on the current scene, respecting mute + sfx volume
function playSfx(key, vol, scene) {
  if (window.GameAudio && window.GameAudio.muted) return;
  scene = scene || window.mainScene;
  if (!scene) return;
  try {
    if (scene.cache.audio.exists(key)) {
      scene.sound.play(key, {
        volume: (window.GameAudio ? window.GameAudio.sfxVol : 1) * (vol || 1),
      });
    }
  } catch (e) {}
}

// ── Global Audio Helpers ──
window.initGlobalAudio = (scene) => {
  const bgm = window.GameAudio.bgmInstance;
  const bgmAlive = bgm && bgm.manager && bgm.isPlaying;
  if (!bgmAlive) {
    try {
      if (scene.cache.audio.exists("bgm")) {
        window.GameAudio.bgmInstance = scene.sound.add("bgm", {
          loop: true,
          volume: bgmVolume(),
        });
        window.GameAudio.bgmInstance.play();
      }
    } catch (e) {}
  } else {
    bgm.setVolume(bgmVolume());
  }
  scene.sound.setMute(window.GameAudio.muted);
};

// Keep the looping background music at its subdued level after a slider change
window.refreshBgmVolume = () => {
  if (window.GameAudio.bgmInstance) window.GameAudio.bgmInstance.setVolume(bgmVolume());
};

window.playUIClick    = ()      => playSfx("ui_click");         // UI chrome clicks
window.playErrorSound = ()      => playSfx("error");            // wrong code entered
window.playClick      = (scene) => playSfx("click", 1, scene);  // in-level object clicks
window.playSuccess    = (scene) => playSfx("nextlevel", 1, scene); // EXECUTE → next level

// ── Level Configuration ──
window.GAME_LEVELS = [
  {
    key: "Prism",
    scene: PrismScene,
    code: "PRISM",
    altCode: null,
  },
  {
    key: "MobilePhone",
    scene: MobilePhoneScene,
    code: "GEORGE",
    altCode: null,
  },
  {
    key: "PlantPot",
    scene: PlantPotScene,
    code: "FIBO",
    altCode: "FIBONACCI",
  },
  {
    key: "Lightswitch",
    scene: LightswitchScene,
    code: "POWER",
    altCode: null,
  },
  {
    key: "TV",
    scene: TVScene,
    code: "VOID",
    altCode: "NULL",
  },
  {
    key: "Modem",
    scene: ModemScene,
    code: "HTTPS",
    altCode: null,
  },
  {
    key: "Telescope",
    scene: TelescopeScene,
    code: "ORION",
    altCode: null,
  },
  {
    key: "Cryptex",
    scene: CryptexScene,
    code: "ROTOR",
    altCode: null,
  },
  {
    key: "Chessboard",
    scene: ChessboardScene,
    code: "HEADACHE",
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
