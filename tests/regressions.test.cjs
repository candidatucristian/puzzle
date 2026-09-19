// Run with: node --test tests/regressions.test.cjs
// Exercises application code with DOM, rendering and audio-device boundaries
// replaced by small fakes; this is not a browser/rendering test.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const source = (file) => fs.readFileSync(path.join(root, file), "utf8");

function element() {
  const classes = new Set(["hidden"]);
  return {
    value: "", style: {}, listeners: {}, children: [],
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      contains: (name) => classes.has(name),
    },
    set innerHTML(value) { this.children = []; },
    addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); },
    dispatch(type) { for (const fn of this.listeners[type] ?? []) fn({ target: this }); },
    click() { this.dispatch("click"); },
    appendChild(child) { this.children.push(child); },
    focus() {},
  };
}

function ui(savedLevel) {
  const nodes = new Map();
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, element());
    return nodes.get(id);
  };
  const storage = new Map([
    ["puzzleProgressSchema", "2"], ["puzzleUnlockedLevel", "15"],
    ["hasPlayedBefore", "true"],
  ]);
  const timers = new Map();
  let nextTimer = 0, now = 0;
  const game = {
    scene: {
      getScene: () => ({ events: { off() {} } }),
      isActive: () => false, stop() {},
      start(key) { game.lastScene = key; },
    },
    sound: { sounds: [] },
  };
  const context = {
    console,
    document: {
      getElementById: (id) => id === "start-particles" ? null : node(id),
      createElement: element, querySelectorAll: () => [], body: element(),
    },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
    },
    navigator: { userAgent: "desktop", maxTouchPoints: 0 },
    matchMedia: () => ({ matches: false }), focus() {}, addEventListener() {},
    ResizeObserver: class { observe() {} },
    setTimeout(fn, ms) {
      const id = ++nextTimer;
      timers.set(id, { fn, at: now + ms });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    // Keep the reset intro pending without creating real event-loop timers.
    setInterval: () => ++nextTimer, clearInterval() {},
    Phaser: { Scene: class {}, AUTO: 0, Scale: { NONE: 0 },
      Game: class { constructor() { return game; } } },
  };
  context.window = context;
  for (const match of source("js/main.js").matchAll(/scene: (\w+Scene)/g)) {
    context[match[1]] = class {};
  }
  vm.createContext(context);
  vm.runInContext(source("js/main.js"), context);
  storage.set("puzzleUnlockedLevel", String(savedLevel ?? context.GAME_LEVELS.length - 1));
  vm.runInContext(source("js/ui.js"), context);
  function tick(until) {
    while (true) {
      const next = [...timers].filter(([, timer]) => timer.at <= until)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      timers.delete(next[0]);
      now = next[1].at;
      next[1].fn();
    }
    now = until;
  }
  return { context, node, tick, game, storage,
    submit() {
      node("level-code").value = context.GAME_LEVELS[context.currentLevelIndex].code;
      node("btn-submit").click();
    },
    completed: () => !node("completion-screen").classList.contains("hidden"),
  };
}

function scene(name) {
  const context = vm.createContext({
    window: { GameAudio: { sfxVol: 0, muted: false } },
    Phaser: { Scene: class {}, Sound: { Events: { UNLOCKED: "unlocked" } },
      Math: { Clamp: (n, min, max) => Math.max(min, Math.min(max, n)) } },
  });
  vm.runInContext(source(`Games/${name}/${name}.js`), context);
  return { context, instance: vm.runInContext(`new ${name}Scene()`, context) };
}

function sound() {
  return { volume: 1, plays: [], isPlaying: false,
    setVolume(value) { this.volume = value; },
    play(options) { this.plays.push(options?.volume ?? this.volume); },
  };
}

function telescope() {
  const setup = scene("Telescope");
  const t = setup.instance, handlers = {}, tweens = [];
  const drawable = () => {
    const target = { x: 0, y: 0 };
    const proxy = new Proxy(target, {
      get: (obj, key) => key in obj ? obj[key] : () => proxy,
    });
    return proxy;
  };
  t.cameras = { main: { width: 900, height: 600 } };
  t.events = { once() {}, on: (name, fn) => { handlers[name] = fn; } };
  t.input = { on() {}, setDefaultCursor() {} };
  t.tweens = { add: (options) => { tweens.push(options); }, killAll() { tweens.length = 0; } };
  t.children = { removeAll() {} };
  t.add = { graphics: drawable, container: drawable };
  t.time = { now: 0 };
  t._buildRoom = () => { t.phase = 0; t._room = drawable(); };
  for (const method of ["_startAmbient", "_whoosh", "_setIris", "_makeSkyContents", "_drawBackButton"]) {
    t[method] = () => {};
  }
  const click = sound();
  t.sound = { get: () => click };
  t.create();
  return { ...setup, click, tweens,
    resize: () => handlers.canvas_resized({ width: 1000, height: 650 }),
  };
}

test("Telescope remains interactive after resize during either stage of entry", () => {
  for (const irisStarted of [false, true]) {
    const { instance: t, resize, tweens } = telescope();
    t._enterSky();
    if (irisStarted) tweens.find((tween) => tween.delay === 460).onComplete();
    resize();
    assert.equal(t.phase, 2);
    t._onWheel(-100);
    assert.ok(t._zoom > 1, "zoom responds after rebuilding the sky");
    t._exitSky();
    assert.equal(t.phase, 1, "the back action responds");
  }
});

test("Telescope resize during exit reaches the room and allows re-entry", () => {
  const { instance: t, resize } = telescope();
  t._enterSky(); resize(); t._exitSky(); resize();
  assert.equal(t.phase, 0);
  t._enterSky(); resize();
  assert.equal(t.phase, 2);
});

test("Telescope click respects zero SFX volume", () => {
  const { instance: t, click } = telescope();
  t._enterSky();
  assert.deepEqual(click.plays, [0]);
});

test("Phone effects respect zero, fractional and changed volume after audio unlock", () => {
  const { instance: phone, context } = scene("MobilePhone");
  phone.keySound = sound(); phone.vibrationSound = sound();
  let unlock;
  phone.sound = { locked: false, once: (_, callback) => { unlock = callback; } };
  for (const volume of [0, 0.4, 1]) {
    context.window.GameAudio.sfxVol = volume;
    phone.playKeySound(); phone.playVibrationSoundPulse();
    assert.equal(phone.keySound.plays.at(-1), volume * 0.62);
    assert.equal(phone.vibrationSound.plays.at(-1), volume * 0.25);
  }
  phone.sound.locked = true;
  phone.playKeySound();
  context.window.GameAudio.sfxVol = 0;
  phone.sound.locked = false;
  unlock();
  assert.equal(phone.keySound.plays.at(-1), 0);
});

test("SFX settings update persistent effects independently of master volume", () => {
  for (const name of ["MobilePhone", "Modem"]) {
    const app = ui();
    const { instance: active, context } = scene(name);
    context.window.GameAudio = app.context.GameAudio;
    active.keySound = sound(); active.vibrationSound = sound(); active._hwSound = sound();
    app.context.mainScene = active;
    for (const volume of [0, 0.3, 1]) {
      app.node("sfx-slider").value = String(volume);
      app.node("sfx-slider").dispatch("input");
      assert.equal(Number(app.node("vol-slider-ui").value), 1);
      assert.equal(app.context.GameAudio.masterVol, 1);
      assert.equal(name === "Modem" ? active._hwSound.volume : active.vibrationSound.volume,
        volume * (name === "Modem" ? 0.35 : 0.25));
    }
    app.node("vol-slider-ui").value = "0.2";
    app.node("vol-slider-ui").dispatch("input");
    assert.equal(Number(app.node("sfx-slider").value), 1);
    assert.equal(app.context.GameAudio.masterVol, 0.2);
    assert.equal(name === "Modem" ? active._hwSound.volume : active.keySound.volume,
      (name === "Modem" ? 0.35 : 0.62));
  }
});

test("Master volume scales music and effects together and survives scene entry", () => {
  const app = ui();
  const bgm = sound();
  bgm.manager = {}; bgm.isPlaying = true;
  app.context.GameAudio.bgmInstance = bgm;
  const manager = {
    volume: 1, setMute(value) { this.muted = value; },
    play(key, options) { this.lastEffectVolume = options.volume; },
  };
  const active = { sound: manager, cache: { audio: { exists: () => true } } };
  app.context.mainScene = active;
  app.context.initGlobalAudio(active);
  app.node("vol-slider-ui").value = "0.25";
  app.node("vol-slider-ui").dispatch("input");
  app.context.playClick(active);
  assert.equal(manager.volume, 0.25);
  assert.equal(bgm.volume * manager.volume, 0.05);
  assert.equal(manager.lastEffectVolume * manager.volume, 0.2);
  assert.equal(Number(app.node("music-slider").value), 0.5);
  assert.equal(Number(app.node("sfx-slider").value), 0.8);
  assert.equal(app.storage.get("masterVol"), "0.25");
  manager.volume = 1;
  app.context.initGlobalAudio(active);
  assert.equal(manager.volume, 0.25);
  app.node("vol-icon-ui").click();
  assert.equal(manager.muted, true);
  app.node("vol-icon-ui").click();
  assert.equal(manager.muted, false);
  assert.equal(manager.volume, 0.25);
  app.node("vol-slider-ui").value = "0";
  app.node("vol-slider-ui").dispatch("input");
  assert.equal(manager.volume, 0);
  assert.equal(manager.muted, true);
  app.node("btn-mute").click();
  assert.equal(manager.muted, false);
  assert.equal(manager.volume, 0.25);
  assert.equal(Number(app.node("vol-slider-ui").value), 0.25);
});

test("Click sounds reserve mouseclick for Options and Execute", () => {
  const app = ui();
  const played = [];
  app.context.playUIClick = () => played.push("mouseclick");
  app.context.playClick = () => played.push("click");
  const body = app.context.document.body;
  for (const id of ["btn-options", "options-modal", "btn-submit", "btn-howto", "btn-replay", "vol-icon-ui", "levels-grid"]) {
    const event = { detail: 1, target: { closest: (selector) =>
      selector.split(", ").includes("#" + id) ? {} : null } };
    body.listeners.mousedown[0](event);
    body.listeners.click[0](event);
    assert.equal(played.pop(), ["btn-options", "options-modal", "btn-submit"].includes(id) ? "mouseclick" : "click");
    assert.equal(played.length, 0);
  }
  body.listeners.click[0]({ detail: 0, target: { closest: selector =>
    selector.includes("#btn-submit") ? {} : null } });
  assert.deepEqual(played, ["mouseclick"]);
});

test("Info requirements clear between levels and support tool and sound badges", () => {
  const app = ui();
  const show = (key) => {
    app.context.currentLevelIndex = app.context.GAME_LEVELS.findIndex(level => level.key === key);
    app.node("btn-info").click();
    return app.node("info-requires");
  };
  for (const key of ["Modem", "Lightswitch", "Telescope", "Wires", "Crossing", "Flags", "TapCode"]) {
    const requirements = show(key);
    assert.equal(requirements.hidden, false);
    assert.equal(requirements.children.length, 1);
    assert.equal(requirements.children[0].title, "This level requires a measuring tool");
  }
  for (const key of ["BinaryTree", "PlantPot", "Cryptex", "Chessboard", "TV"]) {
    const requirements = show(key);
    assert.equal(requirements.hidden, true);
    assert.equal(requirements.children.length, 0);
  }
  // Exercise sound rendering without labeling ambient audio as a puzzle requirement.
  vm.runInContext("levelHints.Modem.sound = true", app.context);
  const requirements = show("Modem");
  assert.equal(requirements.children.length, 2);
  assert.equal(requirements.children[1].title, "This level requires listening to sound");
});

test("Master slider updates the music owner even without an active scene", () => {
  const app = ui();
  const music = sound();
  music.manager = { setMute(value) { this.muted = value; } };
  app.context.GameAudio.bgmInstance = music;
  for (const volume of [0.5, 0.1, 0]) {
    app.node("vol-slider-ui").value = String(volume);
    app.node("vol-slider-ui").dispatch("input");
    assert.equal(app.game.sound.volume, volume);
    assert.equal(music.manager.volume, volume);
    assert.equal(music.manager.muted, volume === 0);
    assert.equal(music.volume * music.manager.volume, 0.2 * volume);
  }
});

test("Synthesized effects pass through the master gain instead of speaker output", () => {
  const { instance, context } = scene("BinaryTree");
  context.window.GameAudio.sfxVol = 0.8;
  const connections = [];
  let started = false;
  const node = () => ({ gain: {}, frequency: {}, Q: {},
    connect(target) { connections.push(target); },
    start() { started = true; }, stop() {},
  });
  const speaker = {}, master = {};
  instance.sound = { destination: master, context: {
    destination: speaker, currentTime: 0, sampleRate: 100,
    createBuffer: () => ({ getChannelData: () => new Float32Array(5) }),
    createBufferSource: node, createBiquadFilter: node, createGain: node,
  } };
  instance._paperTick(0.5);
  assert.equal(started, true);
  assert.equal(connections.includes(master), true);
  assert.equal(connections.includes(speaker), false);
});

test("Wires tolerates a missing recording and restores background music on exit", () => {
  const { instance, context } = scene("Wires");
  let available = false, additions = 0, pauses = 0, resumes = 0, destroyed = 0;
  const music = sound();
  music.destroy = () => destroyed++;
  const bgm = { isPlaying: true, isPaused: false,
    pause() { pauses++; this.isPlaying = false; this.isPaused = true; },
    resume() { resumes++; this.isPlaying = true; this.isPaused = false; },
  };
  context.window.GameAudio.musicVol = 0.4;
  context.window.GameAudio.bgmInstance = bgm;
  instance.cache = { audio: { exists: () => available } };
  instance.sound = { add(key, options) {
    assert.equal(key, "wires_music"); assert.equal(options.loop, true);
    additions++; return music;
  } };
  instance._startMusic();
  assert.equal(additions, 0); assert.equal(pauses, 0);
  available = true;
  instance._startMusic();
  assert.equal(additions, 1); assert.equal(pauses, 1);
  assert.equal(music.plays.length, 1);
  assert.equal(music.volume, 0.4 * 0.7);
  context.window.GameAudio.musicVol = 0;
  instance.refreshMusicVolume();
  assert.equal(music.volume, 0);
  instance.tweens = { killAll() {} };
  instance.time = { removeAllEvents() {} };
  instance.children = { removeAll() {} };
  instance._teardown(); // resizing redraws artwork without restarting the recording
  assert.equal(destroyed, 0); assert.equal(resumes, 0);
  instance.shutdown();
  assert.equal(destroyed, 1); assert.equal(resumes, 1);
});

test("Last answer still shows completion normally", () => {
  const app = ui(); app.submit(); app.tick(649);
  assert.equal(app.completed(), false);
  app.tick(650);
  assert.equal(app.completed(), true);
});

test("Navigation cancels completion even just before the delayed callback", () => {
  for (const delay of [0, 640]) {
    const app = ui(); app.submit(); app.tick(delay);
    app.node("levels-grid").children[0].onclick();
    app.tick(2000);
    assert.equal(app.completed(), false);
    assert.equal(app.game.lastScene, "BinaryTree");
  }
});

test("Replay, direct navigation and confirmed reset cancel pending completion", () => {
  for (const action of [
    (app) => app.node("btn-replay").click(),
    (app) => app.context.goToLevel(0),
    (app) => { app.node("btn-new").click(); app.node("btn-new").click(); },
  ]) {
    const app = ui(); app.submit(); action(app); app.tick(2000);
    assert.equal(app.completed(), false);
  }
});

test("Repeated answers cannot leave a second completion callback behind", () => {
  const app = ui(); app.submit(); app.tick(100); app.submit();
  app.tick(650);
  assert.equal(app.completed(), false);
  app.tick(750);
  assert.equal(app.completed(), true);
  app.node("btn-completion-close").click(); app.tick(2000);
  assert.equal(app.completed(), false);
});

test("An answer entered during navigation cannot reopen completion", () => {
  const app = ui(); app.submit();
  app.node("levels-grid").children[0].onclick(); app.submit(); app.tick(2000);
  assert.equal(app.completed(), false);
  assert.equal(app.game.lastScene, "BinaryTree");
});

test("Removed level progress clamps to the final remaining chamber", () => {
  for (const saved of [15, 16]) {
    const app = ui(saved);
    assert.equal(app.context.currentLevelIndex, 15);
    assert.equal(app.context.GAME_LEVELS.length, 16);
    assert.equal(app.context.GAME_LEVELS.at(-1).key, "TapCode");
    assert.equal(app.storage.get("puzzleUnlockedLevel"), "15");
    app.submit(); app.tick(3500);
    assert.equal(app.completed(), true);
    assert.equal(app.node("completion-chambers").textContent, "16 / 16");
  }
});

test("Candle dims in three clicks, ignores the open letter, and retains state on rebuild", () => {
  const { instance: candle, context } = scene("Cryptex");
  let clicks = 0;
  context.window.playClick = () => clicks++;
  const button = {};
  let strength;
  const dom = { classList: element().classList,
    style: { setProperty: (key, value) => { if (key === "--candle-strength") strength = value; } },
    querySelector: () => button };
  const light = () => ({ setAlpha(value) { this.alpha = value; return this; }, setScale(value) { this.scale = value; return this; } });
  candle._candleDom = dom;
  candle._candleWallLight = light(); candle._candleDeskLight = light();
  candle._candleClicks = 0;
  candle._overlayOpen = true;
  candle._dimCandle();
  assert.equal(clicks, 0);
  candle._overlayOpen = false;
  for (const expected of [2 / 3, 1 / 3, 0]) {
    candle._dimCandle();
    assert.equal(strength, expected);
    assert.equal(candle._candleWallLight.alpha, expected);
    assert.equal(candle._candleDeskLight.scale, expected);
  }
  assert.equal(button.disabled, true);
  candle._dimCandle();
  assert.equal(clicks, 3);
  candle.tweens = { killAll() {} };
  candle.children = { removeAll() {} };
  candle._teardown();
  candle._candleDom = dom;
  candle._candleWallLight = light(); candle._candleDeskLight = light();
  candle._updateCandleLight();
  assert.equal(strength, 0);
  assert.equal(candle._candleDeskLight.alpha, 0);
});
