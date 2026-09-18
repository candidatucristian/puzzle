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

test("Options and main SFX controls update each other and active persistent sounds", () => {
  for (const name of ["MobilePhone", "Modem"]) {
    const app = ui();
    const { instance: active, context } = scene(name);
    context.window.GameAudio = app.context.GameAudio;
    active.keySound = sound(); active.vibrationSound = sound(); active._hwSound = sound();
    app.context.mainScene = active;
    for (const volume of [0, 0.3, 1]) {
      app.node("sfx-slider").value = String(volume);
      app.node("sfx-slider").dispatch("input");
      assert.equal(Number(app.node("vol-slider-ui").value), volume);
      assert.equal(app.node("vol-icon-ui").textContent, volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊");
      assert.equal(name === "Modem" ? active._hwSound.volume : active.vibrationSound.volume,
        volume * (name === "Modem" ? 0.35 : 0.25));
    }
    app.node("vol-slider-ui").value = "0.2";
    app.node("vol-slider-ui").dispatch("input");
    assert.equal(Number(app.node("sfx-slider").value), 0.2);
    assert.equal(name === "Modem" ? active._hwSound.volume : active.keySound.volume,
      0.2 * (name === "Modem" ? 0.35 : 0.62));
  }
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

test("Existing level 16 progress unlocks the new chamber before completion", () => {
  const app = ui(15);
  assert.equal(app.context.currentLevelIndex, 15);
  assert.equal(app.context.GAME_LEVELS.length, 17);
  app.submit(); app.tick(3500);
  assert.equal(app.game.lastScene, "DeadLetter");
  assert.equal(app.storage.get("puzzleUnlockedLevel"), "16");
  assert.equal(app.completed(), false);
  app.submit(); app.tick(4500);
  assert.equal(app.completed(), true);
  assert.equal(app.node("completion-chambers").textContent, "17 / 17");
});

test("Turning grille covers the paper exactly once and decodes the configured answer", () => {
  const { instance } = scene("DeadLetter");
  const Puzzle = instance.constructor;
  const grid = Puzzle.letterGrid();
  const positions = [0, 1, 2, 3].flatMap((turn) => [...Puzzle.holesAt(turn)]);
  assert.equal(new Set(positions).size, 16);
  assert.ok(positions.every((cell) => cell >= 0 && cell < 16));
  const message = positions.map((cell) => grid[cell]).join("");
  const app = ui();
  assert.equal(message, "THEWORDIS" + app.context.GAME_LEVELS.at(-1).code);
  assert.deepEqual([...Puzzle.holesAt(4)], [...Puzzle.holesAt(0)]);
});

test("Grille actions require placement, finish rotating before tracing, and wrap", () => {
  const { instance: puzzle } = scene("DeadLetter");
  puzzle._turn = 0; puzzle._placed = false; puzzle._busy = false;
  puzzle._traces = [null, null, null, null]; puzzle._timers = [];
  puzzle._render = () => {};
  puzzle._dom = { querySelector: () => ({ classList: { add() {}, remove() {} }, offsetWidth: 0 }) };
  const pending = [];
  puzzle.time = { delayedCall: (_, callback) => { pending.push(callback); return { remove() {} }; } };
  puzzle._rotate(); puzzle._trace();
  assert.equal(puzzle._turn, 0);
  assert.ok(puzzle._traces.every((value) => value === null));
  puzzle._place();
  for (let turn = 0; turn < 4; turn++) {
    puzzle._trace();
    puzzle._rotate(); puzzle._rotate(); puzzle._place(); puzzle._trace();
    assert.equal(puzzle._turn, turn + 1);
    assert.equal(puzzle._placed, true);
    pending.shift()();
  }
  assert.equal(puzzle._traces.join(""), "THEWORDIS" + ui().context.GAME_LEVELS.at(-1).code);
  assert.equal(puzzle._turn % 4, 0);
});
