# Adding a level

Keep the environment and mechanic local to the new scene. Reuse the existing services for navigation, progress, audio, and Info content.

## 1. Choose stable names

Choose a lowercase stable ID and a Phaser scene key, for example `observatory` and `Observatory`. The ID is saved in player progress; changing a display name later should not change it. Displayed level numbers follow the order in `src/levels/metadata.js`.

Create `src/levels/observatory/ObservatoryScene.js`. Start with `BasePuzzleScene`:

```js
import BasePuzzleScene from "../../core/BasePuzzleScene.js";

export default class ObservatoryScene extends BasePuzzleScene {
  constructor() {
    super({ key: "Observatory" });
  }

  create() {
    this.beginScene();
    this.puzzle = { selectedStar: null };
    this.redraw(this.scale.width, this.scale.height);
    this.listenToResize(({ width, height }) => this.redraw(width, height));
  }

  redraw(width, height) {
    this.view?.destroy(true);
    this.view = this.add.container(0, 0);
    this.view.add(this.add.text(width / 2, height / 2, "Look a little closer.", {
      fontFamily: '"Special Elite", monospace',
      fontSize: "20px",
      color: "#e8dcc0",
    }).setOrigin(0.5));
    // Draw the puzzle from this.puzzle. Do not reset its state here.
  }

  shutdown() {
    // Release custom resources here. Phaser owns its display list; the base
    // releases registered resize handlers, DOM, native timers, and scene audio.
    this.view = null;
  }
}
```

Call `beginScene()` once per `create()`. The base already calls your `shutdown()` on scene exit, including replay. Do not also register it with `events.once("shutdown", ...)`.

For a larger level, extract pure rules into `puzzle.js`, scenery into `environment.js`, or a named interactive component into its own file. Keep configuration and drawing parameters near the level that uses them. Shared pencil helpers are in `src/shared/sketch.js` and common colors in `src/shared/theme.js`.

## 2. Register the content and scene

Add one entry to the ordered data in `src/levels/metadata.js`:

```js
{
  id: "observatory",
  key: "Observatory",
  name: "Observatory",
  summary: "A telescope waits under the quiet dome of an old observatory.",
  code: "ORBIT",
  altCode: null,
  hint: {
    text: "A quiet sky. One familiar path.",
    sound: false,
    tool: false,
  },
  description: "Explain the real mechanic and how its answer is derived.",
  references: ["List the relevant constants or functions for future edits."],
}
```

Import the class in `src/levels/registry.js`, then add `Observatory: ObservatoryScene` to its scene map. No new global variable or HTML script tag is needed. The interface, final level count, and reference ledger derive their data from the catalog.

The right sidebar displays `summary` automatically. Keep it to a short description of the setting, without hints or the answer. Reserve the solution explanation for the developer-only `description`.

Review the development-only reference ledger at `http://127.0.0.1:5173/tools/levels/`. Its source is `tools/levels/index.html`; it imports the catalog directly and is not included in the shipped build.

`hint.tool` means an external decoding or measuring tool is needed. `hint.sound` means listening is necessary to solve the puzzle. Atmospheric music alone does not make listening a requirement. The TOOL hover text is supplied centrally by the interface.

Answers are checked after trimming whitespace and converting to uppercase. Use `altCode` for one intentional alternate answer. Do not add a separate answer checker in the scene that can disagree with the catalog.

## 3. Load and play assets

Add files under `public/assets/images/<Key>/` or `public/assets/sounds/<Key>/`, preserving exact filename case for deployment on Linux. Keep the original license/attribution files when adding third-party resources.

Load only that scene's assets in `preload()`:

```js
preload() {
  this.load.audio("observatory_turn", "assets/sounds/Observatory/turn.mp3");
}
```

Use unique cache keys for new resources. `BootScene` already loads `bgm`, `click`, `ui_click`, `nextlevel`, and `error`; do not load those again in every level.

Play an ordinary interaction with `this.services.audio.playClick(this)`. For a specific effect, call `this.services.audio.playSfx("observatory_turn", 0.5, this)`.

A looping ambient effect belongs to the scene:

```js
this.ambience = this.services.audio.addSceneSound(this, "observatory_hum", {
  channel: "sfx",
  gain: 0.3,
  loop: true,
});
this.ambience?.play();
```

Preload the referenced key first. `gain` is the desired balance within its channel; do not multiply it by the master or SFX setting yourself.

For optional music that replaces the default score:

```js
this.music = this.services.audio.playLevelMusic(this, "observatory_music", {
  gain: 0.7,
});
```

The service returns `null` if the optional recording is unavailable. Otherwise it pauses global music and restores it on scene exit. Registered sounds are released automatically. A custom Web Audio synthesizer should connect through `this.sound.destination` and account for its SFX channel gain.

## 4. Own DOM and asynchronous work

Register scene-specific DOM elements with `this.ownDom(element)` after creating them. Use a level-specific CSS class and, where applicable, the shared `scene-dom-overlay` class. Append the element to the intended game container. Import required `scene.css` from the scene/component or the module entry; merely placing a stylesheet in a folder does not load it.

Use `listenToResize()` for canvas resizing and `setSceneTimeout()` for native delayed work. Components that subscribe to browser events, create observers, or own additional native resources should expose `destroy()`; call it from the scene's `shutdown()`.

If resize rebuilds a component, destroy the previous instance and preserve its logical state before creating the replacement. Do not rely on navigating elsewhere to clean up an old overlay or timer.

Keep native buttons and inputs keyboard-operable and visibly focused. New dialogs should reuse the UI dialog controller for Escape, focus trapping, and focus restoration. Keep important clues readable and maintain the existing matte visual style.

## 5. Verify the new level

Add a unit test when the level introduces nontrivial deduction, state transitions, or timing rules. Pure puzzle tests should import `puzzle.js` or the relevant component state, rather than loading the entire Phaser renderer into a mock.

The catalog-driven browser suite automatically includes the new scene for startup, resize, replay, and navigation. Add focused browser coverage for interactions that are not covered by those general checks, then run:

```sh
npm run check
```

Inspect the new level in the application as well:

1. Solve it from its initial state and submit the expected answer.
2. Resize partway through and verify that the puzzle retains its state.
3. Replay and confirm that it resets.
4. Leave while an animation or sound is active and check the following level.
5. Try master volume, music, SFX, and mute, including zero values.
6. Check Info requirements, text readability, and keyboard controls.

Current screenshots are written to `.artifacts/after/`. Compare with the other scenes for consistent composition and pencil weight. `npm run check` also tests the production build served beneath `/puzzle/`. To repeat only that check, run `npm run build` followed by `npm run test:production`; keep port 4173 free for its server. Use `npm run preview` for a manual review of the production build.

When inserting or replacing an existing level, also test a saved game from before the change. Reuse an existing ID only when its previous completion should continue to count for the revised puzzle.
