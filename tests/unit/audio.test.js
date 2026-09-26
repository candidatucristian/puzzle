import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { AudioManager, AUDIO_ASSETS } from "../../src/core/AudioManager.js";

function setup(values = {}, { locked = false, missing = [] } = {}) {
  const saved = new Map(Object.entries(values));
  const warnings = [];
  const storage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  };
  const manager = new EventEmitter();
  Object.assign(manager, {
    volume: 1,
    locked,
    mute: false,
    sounds: [],
    played: [],
    setMute(value) { this.mute = value; },
    add(key, config) {
      const sound = {
        key, manager: this, volume: config.volume, config,
        isPlaying: false, isPaused: false, destroyed: false,
        playCount: 0, resumeCount: 0, destroyCount: 0,
        setVolume(value) { this.volume = value; return this; },
        play() { this.isPlaying = true; this.isPaused = false; this.playCount++; return true; },
        pause() { this.isPlaying = false; this.isPaused = true; },
        resume() { this.isPlaying = true; this.isPaused = false; this.resumeCount++; return true; },
        stop() { this.isPlaying = false; this.isPaused = false; },
        destroy() {
          assert.ok(!this.destroyed, "Destroyed sounds must not be destroyed again");
          this.stop();
          this.destroyed = true;
          this.manager = null;
          this.destroyCount++;
        },
      };
      this.sounds.push(sound);
      return sound;
    },
    play(key, config) { this.played.push({ key, ...config }); return true; },
  });
  const cache = { audio: { exists: (key) => !missing.includes(key) } };
  const game = { sound: manager, cache };
  const makeScene = () => ({ sound: manager, cache });
  const audio = new AudioManager(storage, { logger: { warn: (...args) => warnings.push(args) } });
  audio.attach(game);
  return { audio, manager, saved, warnings, makeScene };
}

test("stored channel levels are validated without replacing intentional zeroes", () => {
  const { audio } = setup({ masterVol: "0", musicVol: "invalid", sfxVol: "-1", muted: "true" });
  assert.deepEqual(audio.state, {
    masterVol: 0, musicVol: 0.5, sfxVol: 0, muted: true, bgmInstance: null,
  });
  assert.equal(setup({ masterVol: "   ", musicVol: "2", sfxVol: "Infinity" }).audio.state.masterVol, 1);
  assert.equal(setup({ musicVol: "2" }).audio.state.musicVol, 1);
  assert.equal(setup({ sfxVol: "Infinity" }).audio.state.sfxVol, 0.8);
});

test("master scales all music and SFX once while channel sliders retain their balance", () => {
  const { audio, manager, makeScene, saved } = setup();
  const scene = makeScene();
  audio.enterScene(scene);
  const ambience = audio.addSceneSound(scene, "hardware", { gain: 0.35, loop: true });
  audio.setMasterVolume(0.25);
  audio.setMusicVolume(0.6);
  audio.setSfxVolume(0.4);
  audio.playClick();

  assert.equal(manager.volume, 0.25);
  assert.equal(audio.state.bgmInstance.volume, 0.6 * 0.4);
  assert.equal(ambience.volume, 0.4 * 0.35);
  assert.equal(manager.played.at(-1).volume, 0.4);
  assert.equal(saved.get("masterVol"), "0.25");
  assert.equal(saved.get("musicVol"), "0.6");
  assert.equal(saved.get("sfxVol"), "0.4");

  audio.setMusicVolume(0);
  audio.setSfxVolume(0);
  assert.equal(audio.state.bgmInstance.volume, 0);
  assert.equal(ambience.volume, 0);
  assert.equal(audio.playClick(), false);
});

test("mute and a zero master can be restored from either volume control", () => {
  const { audio, manager, makeScene, saved } = setup();
  audio.enterScene(makeScene());
  audio.setMasterVolume(0.35);
  audio.setMasterVolume(0);
  assert.equal(manager.mute, true);
  assert.equal(audio.playClick(), false);
  assert.equal(audio.toggleMute(), false);
  assert.equal(audio.state.masterVol, 0.35);
  assert.equal(manager.volume, 0.35);
  assert.equal(manager.mute, false);
  audio.toggleMute();
  audio.setMasterVolume(0.7);
  assert.equal(manager.mute, false);
  assert.equal(saved.get("muted"), "false");
});

test("global click routing preserves Options and Execute's distinct sound", () => {
  const { audio, manager, makeScene } = setup();
  audio.enterScene(makeScene());
  audio.playClick();
  audio.playUIClick();
  audio.playErrorSound();
  audio.playSuccess();
  assert.deepEqual(manager.played.map(({ key }) => key), ["click", "ui_click", "error", "nextlevel"]);
  audio.playSfx("click", 0);
  assert.equal(manager.played.at(-1).volume, 0);
});

test("exclusive level music pauses one global score and restores it after scene shutdown", () => {
  const { audio, manager, makeScene } = setup();
  const wires = makeScene();
  audio.enterScene(wires);
  const bgm = audio.state.bgmInstance;
  const music = audio.playLevelMusic(wires, "wires_music", { gain: 0.7 });
  assert.equal(bgm.isPaused, true);
  assert.equal(music.volume, 0.5 * 0.7);
  assert.equal(audio.playLevelMusic(wires, "wires_music"), music);
  audio.enterScene(wires);
  audio.setMasterVolume(0.3);
  audio.setMusicVolume(0.8);
  assert.equal(bgm.isPaused, true);
  assert.equal(music.volume, 0.8 * 0.7);
  assert.equal(manager.sounds.filter(({ key }) => key === "bgm").length, 1);

  music.destroy(); // Existing scenes may destroy their sound before the service.
  audio.leaveScene(wires);
  audio.leaveScene(wires);
  assert.equal(music.destroyCount, 1);
  assert.equal(bgm.isPlaying, true);
  assert.equal(bgm.resumeCount, 1);
  audio.enterScene(makeScene());
  assert.equal(manager.sounds.filter(({ key }) => key === "bgm").length, 1);
  assert.equal(bgm.playCount, 1);
});

test("scene sounds are disposed on navigation without interrupting the success chime", () => {
  const { audio, manager, makeScene } = setup();
  const phone = makeScene();
  audio.enterScene(phone);
  const vibration = audio.addSceneSound(phone, "phone_vib", { gain: 0.25 });
  const keypad = audio.addSceneSound(phone, "keypad", { gain: 0.62 });
  audio.playSuccess(phone);
  audio.enterScene(makeScene());
  assert.equal(vibration.destroyed, true);
  assert.equal(keypad.destroyed, true);
  assert.equal(manager.played.at(-1).key, "nextlevel");
  assert.equal(audio.state.bgmInstance.isPlaying, true);
  audio.setSfxVolume(0.1); // Updating settings must not touch the destroyed sounds.
});

test("missing optional level audio retains the global score", () => {
  const { audio, makeScene, warnings } = setup({}, { missing: ["wires_music"] });
  const scene = makeScene();
  audio.enterScene(scene);
  assert.equal(audio.playLevelMusic(scene, "wires_music"), null);
  assert.equal(audio.state.bgmInstance.isPlaying, true);
  assert.deepEqual(warnings, []);
});

test("locked audio queues only the current music and never duplicates background instances", () => {
  const { audio, manager, makeScene } = setup({}, { locked: true });
  const scene = makeScene();
  audio.enterScene(scene);
  audio.enterScene(scene);
  const bgm = audio.state.bgmInstance;
  assert.equal(bgm.playCount, 0);
  assert.equal(manager.listenerCount("unlocked"), 1);
  const music = audio.playLevelMusic(scene, "wires_music");
  manager.locked = false;
  manager.emit("unlocked");
  assert.equal(music.playCount, 1);
  assert.equal(bgm.playCount, 0);
  audio.leaveScene(scene);
  assert.equal(bgm.playCount, 1);
  assert.equal(manager.sounds.filter(({ key }) => key === "bgm").length, 1);
});

test("leaving a scene before audio unlock prevents its music from starting later", () => {
  const { audio, manager, makeScene } = setup({}, { locked: true });
  const scene = makeScene();
  audio.enterScene(scene);
  const music = audio.playLevelMusic(scene, "wires_music");
  audio.leaveScene(scene);
  manager.locked = false;
  manager.emit("unlocked");
  assert.equal(music.playCount, 0);
  assert.equal(audio.state.bgmInstance.playCount, 1);
  audio.destroy();
  assert.equal(manager.listenerCount("unlocked"), 0);
  assert.equal(audio.state.bgmInstance, null);
});

test("preloading reuses cached global resources", () => {
  const { audio } = setup();
  const loaded = [];
  audio.preload({
    cacheManager: { audio: { exists: (key) => key === "bgm" } },
    audio: (...args) => loaded.push(args),
  });
  assert.deepEqual(loaded, Object.entries(AUDIO_ASSETS).filter(([key]) => key !== "bgm"));
});

test("unavailable storage degrades to defaults and reports repeated failures once", () => {
  const warnings = [];
  const storage = {
    getItem() { throw new Error("Storage unavailable"); },
    setItem() { throw new Error("Storage unavailable"); },
  };
  const audio = new AudioManager(storage, { logger: { warn: (...args) => warnings.push(args) } });
  assert.equal(audio.state.masterVol, 1);
  audio.setSfxVolume(0.2);
  audio.setSfxVolume(0.3);
  assert.equal(audio.state.sfxVol, 0.3);
  assert.equal(warnings.filter(([message]) => message.includes("storage-write:sfxVol")).length, 1);
});
