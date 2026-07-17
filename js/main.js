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
    key: "Sequence",
    scene: SequenceScene,
    code: "19334488111",
    altCode: "1 9 33 44 88 111",
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
  {
    key: "Station",
    scene: StationScene,
    code: "EXIT",
    altCode: null,
  },
  {
    key: "Atlas",
    scene: AtlasScene,
    code: "HARBOR",
    altCode: null,
  },
  {
    key: "BinaryTree",
    scene: BinaryTreeScene,
    code: "CABBAGE",
    altCode: null,
  },
  {
    key: "Pi",
    scene: PiScene,
    code: "PI",
    altCode: "3.14",
  },
  {
    key: "Wires",
    scene: WiresScene,
    code: "FACADE",
    altCode: null,
  },
  {
    key: "Library",
    scene: LibraryScene,
    code: "SHELF",
    altCode: null,
  },
];

// ── Boot Scene ──
// Phaser auto-starts the FIRST scene in the list, so without this the first
// level would run behind (and bleed over) the start screen on every page
// load. Boot renders nothing — it only loads the global audio so UI clicks
// and music work before a level starts. Levels start via goToLevel() only.
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "Boot" });
  }
  preload() {
    this.load.audio("bgm", "assets/sounds/global/background.mp3");
    this.load.audio("click", "assets/sounds/global/click.mp3");
    this.load.audio("ui_click", "assets/sounds/global/mouseclick.wav");
    this.load.audio("nextlevel", "assets/sounds/global/nextlevel.wav");
    this.load.audio("error", "assets/sounds/global/error.mp3");
    // feed the loading screen while the audio downloads
    this.load.on("progress", (v) => {
      if (window.__bootProgress) window.__bootProgress(v);
    });
  }
  create() {
    window.mainScene = this;
    if (window.initGlobalAudio) window.initGlobalAudio(this);
    // everything the first frame needs is in — wait for the display
    // fonts, then dismiss the loading screen
    const finish = () => {
      if (window.__loadingDone) window.__loadingDone();
    };
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(finish, finish);
    } else {
      finish();
    }
  }
}

const sceneList = [
  BootScene,
  ...window.GAME_LEVELS.map((level) => level.scene),
];

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
