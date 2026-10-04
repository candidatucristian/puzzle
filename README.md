# The Descipher

A browser puzzle game with hand-drawn environments, independent Phaser scenes, and an HTML/CSS interface, played in desktop browsers (phones and tablets are shown a desktop-only page; the compact phone layout is kept for a future store app). Phaser remains at **3.60.0**; the project uses JavaScript ES modules and Vite for development and production builds.

## Run locally

Use **Node.js 22.18.0 or newer** and npm. Install the exact dependency versions recorded in `package-lock.json`:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Keep the terminal running while developing. Open the game through this server; opening `index.html` directly does not run the module-based application correctly.

The first interaction allows the browser to start audio. Progress and volume settings are stored in the browser for the current site origin. Changing from the development port to the preview port uses separate browser storage.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server on port 5173, with automatic updates. |
| `npm run lint` | Check JavaScript, including undefined variables. |
| `npm test` | Run unit tests without requiring a browser or Phaser renderer. |
| `npm run test:browser` | Run Playwright interactions, scene lifecycle checks, and screenshots. |
| `npm run test:production` | Check the existing production build served under `/puzzle/` on port 4173. |
| `npm run build` | Generate the static production site in `dist/`. |
| `npm run preview` | Serve the production build locally on port 4173. |
| `npm run check` | Run lint, unit tests, build, browser tests, and production smoke tests in sequence. |

For browser tests, install Playwright's Chromium when needed:

```sh
npx playwright install chromium
npm run test:browser
```

On Windows, the Playwright configuration uses installed Chrome when it finds it at the standard location. CI uses Playwright's bundled Chromium. The test runner starts a dedicated development server on port 5174 and never reuses the interactive server on port 5173. Port 5174 must be free before starting the tests. Test reports are written to `playwright-report/` and `test-results/`; these folders are ignored by Git.

Run `npm run build` before invoking `npm run test:production` on its own. Its separate configuration serves the built files under `/puzzle/` to check the deployed application and subdirectory asset paths. Stop any preview server occupying port 4173 before running this suite.

## Project layout

```text
index.html                  Application markup and module entry
src/
  entry.js                  Loading screen and startup boundary
  main.js                   Service composition and game initialization
  core/                     Boot, lifecycle, audio, progress, navigation
  levels/
    metadata.js             Ordered level content, answers, Info, reference text
    registry.js             Connects metadata to imported scene classes
    <level>/<Key>Scene.js    One scene per level
  shared/                   Sketch drawing, theme, resource/viewport helpers
  ui/                       Controls, dialogs, transitions, and styles
public/assets/              Fonts, images, and sounds copied into the build
tools/levels/               Development-only reference ledger using shared metadata
tests/unit/                 Pure logic and service tests
tests/browser/              Playwright tests against the running application
docs/                       Architecture and level-authoring instructions
.github/workflows/ci.yml     Automated checks; does not deploy the game
```

Level-specific CSS and complex components live beside their scenes. Larger levels can separate their environment and puzzle logic without requiring every small level to use the same number of files.

Read [the architecture guide](docs/ARCHITECTURE.md) for ownership and dependencies, or [Adding a level](docs/ADDING_LEVEL.md) before creating a new scene.

While the development server is running, the reference ledger is available at `http://127.0.0.1:5173/tools/levels/`. It imports the shared metadata directly, includes solutions for development reference, and is excluded from the production build.

Levels 31–33 explore moonlight and shadow: The Curtain uses a draggable torn curtain, The Sill is a static negative-space composition, and Venetian uses the blind's cord to filter city lights. The curtain also accepts left/right arrow keys; the blind accepts up/down. Hold Shift for larger adjustments. These controls preserve their position on resize and reset on replay. A completed 30-level save automatically opens level 31.

## Phones and tablets

On desktop, Levels and saved progress appear on the left. The right panel shows the current room's name, a spoiler-free summary, solved status and Hints, followed by Options and Full Screen. How to Play is inside Options; closing it returns to the settings.

In a browser the game is for computers. `src/ui/platform.js` recognises a phone or a tablet (by its user agent, an iPad asking for the desktop site by its touch points, or a device with only a finger and nothing that can hover; a touch-screen laptop still counts as a computer) and `src/entry.js` then shows the desktop-only page instead of loading the game. Inside a store app built with a native shell such as Capacitor, `window.Capacitor.isNativePlatform()` is true and the game runs on the phone in the compact layout below.

Below 1100px of width (or 560px of height) the interface switches to one column: a compact bar on top, the room in the middle, the console on one row at the bottom. Levels opens the left drawer; Level Info opens the right drawer with hints and settings (`src/ui/mobile.js`, `src/ui/styles/responsive.css`). The bar's full-screen button slides the top bar away and asks the browser for full screen where available; the code console stays visible. The top bar also has a handle to tap or pull up and down. A phone held upright is asked to turn; the rooms are drawn wide. The first tap on the start screen and the bar's full-screen button both request full screen and landscape orientation where the browser supports them. On iPhone, if full screen is unavailable, the button explains how to add the game to the Home Screen (Share → Add to Home Screen) and open it from that icon.

The rooms receive a smaller canvas: taps replace clicks and cards can still be dragged. In level 13, tapping the moon keeps its clue visible until another tap. In level 18, tapping the calculator opens a larger keypad with the same display and calculation; closing it or resizing the screen keeps the result. Hints have a scrollable reading area on short screens, including with the largest text setting, and level 3 keeps its note clear of Inspect. The "Level N" label scales with the canvas through `shared/levelLabel.js`. While the on-screen keyboard is up for the code box, the room is clipped rather than repainted. The browser suite runs its desktop checks at 1440×1000 and `tests/browser/mobile.spec.js` with touch emulation, as the store app (a stubbed `window.Capacitor`), plus one check that a phone browser gets the desktop-only page, including phone viewports down to 568×320.

## Saves and audio

Progress schema 3 saves stable level IDs, completed and unlocked levels, and the last visited level under `puzzleProgress`. Older numeric saves migrate automatically. `SafeStorage` keeps session state usable if browser storage is unavailable. See [save behavior](docs/ARCHITECTURE.md#progress-and-migration) before changing the level order or replacing a puzzle.

`AudioManager` owns master volume, music, SFX, persistent scene sounds, and background music. The interface volume slider affects every channel. Use the service when adding audio so a new level respects these settings and releases its sounds on exit.

## Builds, assets, and visual review

Run `npm run build` followed by `npm run preview` to inspect the production output. `dist/` is the directory to upload to a static host. The relative Vite base supports deployment below a site subdirectory. CI only validates changes; publishing remains a separate action.

Phaser and shader-doodle are installed through npm at exact versions instead of runtime CDN script tags. Keep `package-lock.json` in version control. Preserve the existing resource filenames and any license or attribution files alongside fonts, images, and sounds; moving an asset does not change its usage terms.

The repository's pre-refactor baseline is commit `e3ad999` (`Update before Refactoring`). Use that revision when comparing existing designs and behavior. Browser verification writes current scene captures to `.artifacts/after/`; baseline captures can be kept in `.artifacts/before/`. These local review artifacts are ignored by Git and are not part of the shipped site. A screenshot supports visual review; it does not replace interaction tests or listening checks.
