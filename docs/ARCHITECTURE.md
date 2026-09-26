# Architecture

The application keeps Phaser 3.60.0 for rendering, input, scene management, and audio. HTML/CSS handles the surrounding interface and selected scene objects. Vite resolves ES module imports and creates a static build; no framework or backend is required for the current game.

## Startup and dependency direction

`index.html` loads `src/entry.js`, which mounts the loading screen and imports `src/main.js`. The latter creates storage, progress, audio, and level services, then constructs Phaser and mounts the interface. `gameConfig()` attaches these services in Phaser's `preBoot` callback, before any scene uses them.

`BootScene` loads only shared startup audio, reports loading progress or a startup failure, waits for display fonts, and starts the global score. Each puzzle preloads its own resources when it is entered.

```text
entry.js -> main.js
              |
              +-- SafeStorage -> ProgressStore
              +-- AudioManager
              +-- LevelManager -> ProgressStore
              +-- registry.js -> metadata.js + scene classes
              +-- Phaser game + UI

UI -------------------------> services
BasePuzzleScene ------------> services
individual level -----------> BasePuzzleScene, local components, shared drawing
tools/levels/ ledger -------> metadata.js (development only)
```

Scenes access services through `this.services`, provided by `BasePuzzleScene`. UI functions receive their dependencies as arguments. Shared drawing and pure puzzle modules should not import the UI or application entry point. Do not reintroduce application services on `window` to connect unrelated modules.

## Responsibilities

| Module | Owns |
| --- | --- |
| `core/LevelManager.js` | Level access, current selection, answer checking, progression notifications, scene navigation. |
| `core/ProgressStore.js` | Stable level identities, completion/unlock state, save validation and migration. |
| `core/SafeStorage.js` | Browser storage access and in-memory fallback when persistence fails. |
| `core/AudioManager.js` | Audio settings, common effects, global and level music, scene-owned sounds. |
| `core/BasePuzzleScene.js` | Scene resource lifetime and shared drawing conveniences. |
| `levels/metadata.js` | Ordered level data, answers, Info requirements, and reference descriptions. |
| `levels/registry.js` | Imports and binds scene constructors to that metadata. |
| `ui/` | DOM controls, presentation, dialogs, loading state, transitions, focus, and input binding. |
| `shared/` | Reusable drawing, theme values, resource scopes, and viewport observation. |

`LevelManager.submit(answer)` returns `{ correct, isLast, nextIndex }`; the UI decides how to present that result and when to transition. `subscribe(callback)` returns an unsubscribe function. Navigation uses `navigate(index)` and validates access. Its `{ force: true }` option is intended for development previews and does not unlock progress.

## Scene lifetime and resize

Every puzzle extends `BasePuzzleScene` and calls `beginScene()` once at the beginning of `create()`. The base registers one shutdown handler and enters the audio service. A scene can implement `shutdown()` for its own cleanup; it must not register a second handler that calls the same shutdown method again.

Use these ownership helpers:

| Helper | Purpose |
| --- | --- |
| `listenToResize(callback)` | Subscribe to `canvas_resized`; unsubscribe automatically on shutdown. |
| `ownDom(element)` | Register a scene's HTML element for removal on shutdown. |
| `setSceneTimeout(callback, delay)` | Schedule native delayed work that cannot fire after scene exit. |
| `clearSceneTimeout(timer)` | Cancel a registered timeout early. |

At shutdown the base runs scene-specific cleanup, clears registered native timers, removes registered resources, and leaves the audio service. Phaser continues to own its display objects and built-in scene plugins. Resources outside Phaser's ownership need an explicit release path, such as an observer disconnect, a browser-event unsubscribe, or a component's `destroy()` method.

Keep puzzle state separate from its display objects. Initialize state on `create()` or an explicit replay, then redraw from that state after resize. Redrawing a candle, for example, must preserve its extinguished state; replay must create a fresh candle state. Avoid resetting the puzzle inside a general drawing function.

## Drawing and puzzle modules

The default unit of organization is one folder and one scene per level. Extract when the code has a distinct responsibility:

- `puzzle.js`: deterministic rules and state transitions, without Phaser or DOM imports; straightforward to unit-test.
- `environment.js`: scene-specific scenery and visual updates, independent of answer validation.
- A named component such as `Candle.js`: one complex interactive object, including its state and resource lifetime.
- `scene.css`: scoped styles for HTML elements used by that level.

`plantpot/environment.js` and `cryptex/Candle.js` are examples of separating large components. A small puzzle does not need empty files just to follow a template.

The larger scenes also use these boundaries:

- `telescope/room.js` draws the room in ordered sections and returns its window geometry; `textures.js` creates cached moon and cloud textures. The scene retains navigation, sky interaction, and transition state.
- `rally/cars.js` creates cars from explicit length and ground coordinates. `podium.js` draws the result board and returns its Phaser container. Race scheduling stays in the scene and the existing pure puzzle module.
- `mobilephone/DeskView.js` owns desk objects and graphics for vibration effects. Its `build()` replaces the previous view; `destroy()` releases it. Input state lives in `mobilephone/puzzle.js`, independently of resize and drawing.
- `lightswitch/puzzle.js` produces Morse steps, and `modem/puzzle.js` produces an absolute LED schedule. Scenes own the timers that render these sequences.

`ui/completion.js` owns the delayed completion screen and cancels it on navigation. `ui/resetConfirmation.js` owns the confirmation window; `controls.js` coordinates the actual reset with progress, transitions, and the intro.

`shared/sketch.js` contains deterministic drawing helpers; `shared/theme.js` holds the common pencil color. Keep level-specific colors, composition, and stroke variations local. Preserve seeded random-call order when extracting existing drawing code, because changing that order can change the artwork even when the helper formulas remain the same.

The common vignette is in `shared/vignette.js`; short paper/chime synthesizers are in `shared/puzzleSounds.js`. `BasePuzzleScene` delegates drawing helpers and lets scenes retain their original circle sampling/jitter parameters. Shared audio effects still route through the scene's master destination and SFX setting.

## Audio

Create one `AudioManager(storage)` for the application, then `attach(game)`. Its `state` exposes `masterVol`, `musicVol`, `sfxVol`, `muted`, and `bgmInstance`. Read this state for presentation; change settings through the service methods so persistence and live sound updates happen together.

| API | Behavior |
| --- | --- |
| `setMasterVolume(value)` | Clamp to 0-1, update every manager, and mute at zero. A positive value restores sound. |
| `setMusicVolume(value)` | Update global and registered level music. |
| `setSfxVolume(value)` | Update registered effects and compatible scene callbacks. |
| `toggleMute()` | Toggle mute; restore the last audible master value when unmuting from zero. |
| `playClick(scene)` | Play `click.mp3` for ordinary clicks. |
| `playUIClick()` | Play `mouseclick.wav` for Options and Execute. |
| `playErrorSound()` / `playSuccess(scene)` | Play the common error effect or transition chime. |
| `playSfx(key, gain = 1, scene)` | Play a cached effect at an artistic gain relative to SFX volume. |
| `addSceneSound(scene, key, config)` | Create and register a persistent sound; return a sound instance or `null`. |
| `playLevelMusic(scene, key, { gain: 0.7 })` | Play exclusive optional level music and pause the global score. |
| `enterScene(scene)` / `leaveScene(scene)` | Maintain global music and release sounds registered to the scene. The base calls these. |
| `destroy()` | Release the application's audio resources and pending unlock handlers. |

For `addSceneSound`, pass `{ channel: "sfx", gain: 0.35, loop: true }`, or use `channel: "music"`. The returned instance is not automatically played; call `sound?.play()` when the action requires it. The service owns its disposal even if the scene also stops or destroys it first. Missing optional cached assets return `null` without suppressing the global score.

Master volume is applied **once** by the Phaser sound manager. Per-sound volume contains only its channel volume multiplied by its artistic gain. The global score uses a gain of `0.4`; Wires music uses `0.7`. Do not multiply `masterVol` into individual sounds again. Native Web Audio synthesizers must connect to `scene.sound.destination` so they also pass through the global master gain and mute.

The service supports browser audio unlock, prevents duplicate background instances during scene changes, and resumes the background score when an exclusive level track leaves. `refreshMasterVolume()`, `refreshBgmVolume()`, and `refreshSfxVolume()` remain available for integration. Scene `refreshMusicVolume()` and `refreshSfxVolume()` callbacks can update custom audio, but must not call back into those service refresh methods recursively.

## Progress and migration

Schema 3 stores a JSON object under `puzzleProgress`:

```json
{
  "version": 3,
  "completedLevelIds": ["binarytree"],
  "unlockedLevelIds": ["binarytree", "plantpot"],
  "lastPlayedLevelId": "plantpot"
}
```

IDs come from `metadata.js` and stay unchanged when a level is renamed or reordered. Displayed numbers come from the current catalog order. Completing a level records its ID and unlocks the next catalog entry. Existing IDs are preserved across reorderings; removed IDs are filtered out. A newly inserted level after a completed predecessor becomes available without discarding that predecessor's completion.

When no modern save exists, the store reads `puzzleUnlockedLevel` and `puzzleProgressSchema`. It preserves the old 21-to-16 ordering migration for pre-schema-2 saves, clamps the resulting index, then converts it to IDs. The legacy number meant **highest unlocked**, so the migration does not mark that last unlocked level as completed. Replacing a puzzle entirely should normally use a new ID; decide deliberately whether an old completion should count toward a new mechanic.

A malformed modern save resets to a valid fresh state rather than reviving stale legacy progress. `reset()` clears the legacy progress keys and writes a new schema-3 state. Volume settings are separate and retain their existing keys: `masterVol`, `musicVol`, `sfxVol`, and `muted`.

`SafeStorage` catches inaccessible storage and failed writes, keeping changes in memory for the session. Persistence remains scoped to the browser origin and profile; it is not an account or cloud save system.

## Assets, builds, and verification

Place shipped resources in `public/assets/`; reference them at runtime as `assets/...`. Vite copies this directory into `dist/`. Keep image, sound, and font attribution and license files. `experiments/` stores standalone prototypes that are not imported by the application and do not need to ship.

`tools/levels/index.html` is a developer reference ledger, accessible at `/tools/levels/` through the development server. It imports `metadata.js` directly instead of maintaining another answer/description list. It is not a production HTML entry and is excluded from `dist/`.

The npm manifest pins dependency versions and the lockfile records the complete installation. Phaser is bundled separately as a vendor chunk. This organization does not itself establish a performance improvement; measure frame time, memory after repeated navigation, and network loading before choosing optimizations.

Unit tests cover pure state and service behavior. `npm run test:browser` exercises the actual application through the development server. `npm run build` checks production compilation, and `npm run test:production` runs a separate browser smoke suite against the built files served under `/puzzle/` on port 4173. Build first when running the production suite separately. This checks subdirectory loading and deployed asset paths in addition to the development-server checks. Inspect `npm run preview` when changing hosting configuration or reviewing production behavior manually. The CI workflow runs these checks and retains failure reports; it does not publish the game.

Development browser tests own a separate server on port 5174 (`reuseExistingServer: false`). `tests/browser/app.js` resolves the entry URL from the page's module script, including any Vite timestamp, and reads that module's existing `ready` promise. Importing an unversioned `/src/entry.js` can boot the application twice after Vite has versioned the page's entry; the regression suite covers that case without introducing application globals or production test hooks.

Use `.artifacts/before/` and `.artifacts/after/` for local visual comparisons against the user's baseline commit `e3ad999`. Existing tests generate current captures under `after/`. These directories are ignored and are evidence for a human review, not automatic pixel-equivalence assertions.
