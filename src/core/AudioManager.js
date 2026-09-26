export const AUDIO_ASSETS = Object.freeze({
  bgm: "assets/sounds/global/background.mp3",
  click: "assets/sounds/global/click.mp3",
  ui_click: "assets/sounds/global/mouseclick.wav",
  nextlevel: "assets/sounds/global/nextlevel.wav",
  error: "assets/sounds/global/error.mp3",
});

const BGM_GAIN = 0.4;
const EMPTY_STORAGE = { getItem: () => null, setItem: () => {} };

function volume(value, fallback) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : fallback;
}

/**
 * The Phaser sound manager applies master volume and mute once, including to
 * synthesizers connected to scene.sound.destination. Individual sounds receive
 * only their channel volume and artistic gain.
 */
export class AudioManager {
  constructor(storage = EMPTY_STORAGE, { logger = console } = {}) {
    this.storage = storage;
    this.logger = logger;
    this.game = null;
    this.scene = null;
    this._warnings = new Set();
    this._sceneSounds = new Map();
    this._levelMusic = null;
    this._pendingSounds = new Set();
    this._unlockHandlers = new Map();
    this.state = {
      masterVol: volume(this._read("masterVol"), 1),
      musicVol: volume(this._read("musicVol"), 0.5),
      sfxVol: volume(this._read("sfxVol"), 0.8),
      muted: this._read("muted") === "true",
      bgmInstance: null,
    };
    this._lastAudibleMaster = this.state.masterVol || 1;
  }

  attach(game) {
    this.game = game;
    this.refreshMasterVolume();
    return this;
  }

  preload(loader) {
    for (const [key, path] of Object.entries(AUDIO_ASSETS)) {
      if (!loader.cacheManager?.audio?.exists(key)) loader.audio(key, path);
    }
  }

  enterScene(scene) {
    if (this.scene && this.scene !== scene) this.leaveScene(this.scene);
    this.scene = scene;
    this.refreshMasterVolume(scene);
    this._ensureBgm(scene);
  }

  leaveScene(scene) {
    const sounds = this._sceneSounds.get(scene);
    if (sounds) {
      for (const sound of sounds.keys()) this._destroySound(sound);
      this._sceneSounds.delete(scene);
    }
    if (this._levelMusic?.scene === scene) {
      this._levelMusic = null;
      this._ensureBgm(scene);
    }
    if (this.scene === scene) this.scene = null;
  }

  /** Add a sound owned by this scene. `gain` is relative to its channel. */
  addSceneSound(scene, key, { channel = "sfx", gain = 1, ...config } = {}) {
    if (!this._hasAsset(key, scene)) return null;
    if (channel !== "music" && channel !== "sfx") {
      throw new TypeError(`Unknown audio channel: ${channel}`);
    }
    const normalizedGain = volume(gain, 1);
    const sound = this._try(`add:${key}`, () => scene.sound.add(key, {
      ...config,
      volume: this._channelVolume(channel) * normalizedGain,
    }));
    if (!sound) return null;
    let sounds = this._sceneSounds.get(scene);
    if (!sounds) this._sceneSounds.set(scene, (sounds = new Map()));
    sounds.set(sound, { channel, gain: normalizedGain });
    return sound;
  }

  /** Replace the global score while this scene's optional music is available. */
  playLevelMusic(scene, key, { gain = 0.7 } = {}) {
    if (!this._hasAsset(key, scene)) return null;
    if (this._levelMusic?.scene === scene && this._levelMusic.sound.key === key &&
        this._isAlive(this._levelMusic.sound)) return this._levelMusic.sound;

    const sound = this.addSceneSound(scene, key, { channel: "music", gain, loop: true });
    if (!sound) return null;
    if (this._levelMusic) {
      this._sceneSounds.get(this._levelMusic.scene)?.delete(this._levelMusic.sound);
      this._destroySound(this._levelMusic.sound);
    }
    this._levelMusic = { scene, sound };
    const bgm = this.state.bgmInstance;
    this._pendingSounds.delete(bgm);
    if (this._isAlive(bgm) && bgm.isPlaying) this._try("pause:bgm", () => bgm.pause());
    this._startPersistent(sound);
    return sound;
  }

  playSfx(key, gain = 1, scene = this.scene) {
    if (this.state.muted || this.state.masterVol === 0 || this.state.sfxVol === 0 ||
        !this._hasAsset(key, scene)) return false;
    return this._try(`play:${key}`, () => scene.sound.play(key, {
      volume: this.state.sfxVol * volume(gain, 1),
    })) ?? false;
  }

  playClick(scene = this.scene) { return this.playSfx("click", 1, scene); }
  playUIClick() { return this.playSfx("ui_click"); }
  playErrorSound() { return this.playSfx("error"); }
  playSuccess(scene = this.scene) { return this.playSfx("nextlevel", 1, scene); }

  setMasterVolume(value) {
    this.state.masterVol = volume(value, this.state.masterVol);
    if (this.state.masterVol > 0) this._lastAudibleMaster = this.state.masterVol;
    this.state.muted = this.state.masterVol === 0;
    this._write("masterVol", this.state.masterVol);
    this._write("muted", this.state.muted);
    this.refreshMasterVolume();
    return this.state.masterVol;
  }

  setMusicVolume(value) {
    this.state.musicVol = volume(value, this.state.musicVol);
    this._write("musicVol", this.state.musicVol);
    this.refreshBgmVolume();
    return this.state.musicVol;
  }

  setSfxVolume(value) {
    this.state.sfxVol = volume(value, this.state.sfxVol);
    this._write("sfxVol", this.state.sfxVol);
    this.refreshSfxVolume();
    return this.state.sfxVol;
  }

  toggleMute() {
    this.state.muted = !this.state.muted;
    if (!this.state.muted && this.state.masterVol === 0) {
      this.state.masterVol = this._lastAudibleMaster;
    }
    this._write("masterVol", this.state.masterVol);
    this._write("muted", this.state.muted);
    this.refreshMasterVolume();
    return this.state.muted;
  }

  refreshMasterVolume(scene = this.scene) {
    const managers = new Set([
      this.game?.sound, scene?.sound, this.state.bgmInstance?.manager,
      this._levelMusic?.sound.manager,
    ]);
    for (const manager of managers) {
      if (!manager) continue;
      this._try("master-volume", () => {
        manager.volume = this.state.masterVol;
        if (manager.setMute) manager.setMute(this.state.muted);
        else manager.mute = this.state.muted;
      });
    }
    this.refreshBgmVolume();
    this.refreshSfxVolume();
  }

  refreshBgmVolume() {
    if (this._isAlive(this.state.bgmInstance)) {
      this._try("volume:bgm", () => this.state.bgmInstance.setVolume(this.state.musicVol * BGM_GAIN));
    }
    this._refreshOwnedSounds("music");
    // Compatibility for scene-specific synthesizers during gradual extraction.
    if (this.scene?.refreshMusicVolume) {
      this._try("scene-music-volume", () => this.scene.refreshMusicVolume());
    }
  }

  refreshSfxVolume() {
    this._refreshOwnedSounds("sfx");
    if (this.scene?.refreshSfxVolume) {
      this._try("scene-sfx-volume", () => this.scene.refreshSfxVolume());
    }
  }

  destroy() {
    this._levelMusic = null;
    for (const sounds of this._sceneSounds.values()) {
      for (const sound of sounds.keys()) this._destroySound(sound);
    }
    this._sceneSounds.clear();
    this._destroySound(this.state.bgmInstance);
    this.state.bgmInstance = null;
    for (const [manager, handler] of this._unlockHandlers) manager.off?.("unlocked", handler);
    this._unlockHandlers.clear();
    this._pendingSounds.clear();
    this.scene = null;
    this.game = null;
  }

  _channelVolume(channel) {
    return channel === "music" ? this.state.musicVol : this.state.sfxVol;
  }

  _refreshOwnedSounds(channel) {
    for (const sounds of this._sceneSounds.values()) {
      for (const [sound, settings] of sounds) {
        if (!this._isAlive(sound)) {
          sounds.delete(sound);
          this._pendingSounds.delete(sound);
        } else if (settings.channel === channel) {
          this._try(`volume:${sound.key}`, () => sound.setVolume(this._channelVolume(channel) * settings.gain));
        }
      }
    }
  }

  _ensureBgm(scene) {
    if (this._levelMusic && this._isAlive(this._levelMusic.sound)) return;
    if (!this._isAlive(this.state.bgmInstance)) {
      if (!this._hasAsset("bgm", scene)) return;
      this.state.bgmInstance = this._try("add:bgm", () => scene.sound.add("bgm", {
        loop: true, volume: this.state.musicVol * BGM_GAIN,
      })) ?? null;
    }
    this._startPersistent(this.state.bgmInstance);
  }

  _startPersistent(sound) {
    if (!this._isAlive(sound) || sound.isPlaying) return;
    const manager = sound.manager;
    if (manager.locked) {
      this._pendingSounds.add(sound);
      if (!this._unlockHandlers.has(manager) && manager.once) {
        const handler = () => {
          this._unlockHandlers.delete(manager);
          for (const pending of [...this._pendingSounds]) {
            if (pending.manager !== manager) continue;
            this._pendingSounds.delete(pending);
            this._startPersistent(pending);
          }
        };
        this._unlockHandlers.set(manager, handler);
        manager.once("unlocked", handler);
      }
      return;
    }
    this._pendingSounds.delete(sound);
    this._try(`start:${sound.key}`, () => sound.isPaused ? sound.resume() : sound.play());
  }

  _isAlive(sound) {
    return Boolean(sound && sound.manager && !sound.pendingRemove && !sound.destroyed);
  }

  _destroySound(sound) {
    this._pendingSounds.delete(sound);
    if (this._isAlive(sound)) this._try(`destroy:${sound.key}`, () => sound.destroy());
  }

  _hasAsset(key, scene) {
    const cache = scene?.cache?.audio ?? this.game?.cache?.audio;
    return Boolean(scene?.sound && cache?.exists(key));
  }

  _read(key) {
    return this._try(`storage-read:${key}`, () => this.storage.getItem(key)) ?? null;
  }

  _write(key, value) {
    this._try(`storage-write:${key}`, () => this.storage.setItem(key, String(value)));
  }

  _try(operation, action) {
    try {
      return action();
    } catch (error) {
      if (!this._warnings.has(operation)) {
        this._warnings.add(operation);
        this.logger.warn?.(`[AudioManager] ${operation} failed`, error);
      }
      return undefined;
    }
  }
}

export default AudioManager;
