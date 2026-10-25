# Blender artwork

## The Old Tree

`old_tree.py` models and renders the complete root-observation puzzle,
including its physical root paths, paper letters and engraved brass routes.
`old_tree_publish.mjs` publishes the Cycles photograph and matching camera
bounds. Rebuild and photographed CC0 sources are documented in
[old-tree-sources.md](old-tree-sources.md). The editable packed scene is
saved to `.artifacts/old-tree-v2/old-tree.blend`.

## Exterior trees in the wind

The manor's two foreground trees are animated over their original Blender
render with a separately rendered background and a lossless coverage matte.
The house and gates stay fixed. Runtime and source notes are in
`public/assets/images/Manor/wind-sources.md`.

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' --background --factory-startup --python art/blender/manor_wind.py -- --samples 256 --width 2560
node art/blender/manor_wind_publish.mjs
```

This caches the unchanged source scene in `.artifacts/manor-wind/source.blend`
and writes `clean.png`, `trees-mask.png` and `wind.json` beside it. Delete the
cache before rebuilding after an intentional change to `manor.py`. Use
`--mask-only` to regenerate only the coverage pass from the cached scene.

## Room VI

`room_vi.blend` is the finished, editable Room VI scene. All required image
textures are packed in the file. Open it in Blender 4.5 LTS and render the
active camera with F12. The original `C:/Users/crist/Tools/render/room6.blend`
was read without modifying it.

The background used by the game is
`public/assets/images/Room6/room6-blender-realistic-v4.webp`, rendered at
2560 × 1463, Cycles, 512 samples with adaptive sampling and denoising,
AgX Medium High Contrast, exposure +0.5. The scene contains 1011 objects.
The final render used an RTX 4070 through OptiX.

The composition keeps the original glazed cabinet, arched night window,
console and herbarium, nursery cot, family portrait, coffered ceiling and
spiral stair. Changes include individually modeled floorboards, scanned
material response and true bevels, a supported spiral staircase with
connected handrail, modeled fern and garden, turned cot joinery, miniature
hotel, wooden train and sewn mobile. The previously approved family portrait
is reused as framed artwork; no new AI image generation was used.

Regenerate from the user's original scene and existing CC0 scans:

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' --background --factory-startup --python art/blender/room_vi.py -- --out .artifacts/room-vi-blender/room-vi-final.png --blend art/blender/room_vi.blend --pack --samples 512 --width 2560 --exposure 0.5
```

Use `--width 1659 --samples 128` for previews. `--base` and `--assets` can
override the original scene and installed scanned asset directory. Supporting
modules model the botany, carpet and nursery objects. Photographic texture
sources and permissions are recorded in [room_vi_assets/SOURCES.md](room_vi_assets/SOURCES.md).

The render also exports projected landmarks in a `.landmarks.json` next to
the PNG. The game projects live medal clues through the same camera; rain,
portrait inspection and puzzle interaction remain live. `?render` opens
Room VI directly for review; its Blender background is also the default
when entering normally. The separate `?sketch` trial remains available.

## Dossier cover prototype

The user has requested Blender renders instead of AI image generation for all
new realistic assets. This source uses only meshes, curves, procedural shader
nodes, area lights and an orthographic camera. It loads no photo textures.

`dossier_cover.py` builds a real 32 cm rigid cover with a 4.3 mm leather-wrapped
board, softened edges, fine leather grain and a narrow pressed perimeter seam.
The render has transparent surroundings so it can sit behind the existing
interactive dossier pages and metal binding.

Run with the installed Blender executable:

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' --background --factory-startup --python art/blender/dossier_cover.py -- --output .artifacts/blender-dossier/cover.png --blend .artifacts/blender-dossier/cover.blend
```

The default is Cycles CPU, 1400 px, 96 samples, with a fixed sampling seed.
Use `--resolution 700 --samples 32` for a quick preview. The script saves the
editable `.blend` before rendering. After inspecting the render, package the
PNG to WebP and update the dossier cover CSS. Do not label this script as a
finished render until it has actually been run in Blender and inspected.

## Room VI, alive

The room is not one still picture any more. `room_vi_live.py` renders from
`room_vi.blend` what the game composes a living room from
(`src/shared/liveRoom.js`, `src/levels/room6/liveRoom6.js`), into
`public/assets/images/Room6/live/`:
- the plate without the mobile's turning parts and the cabinet's glass;
- the same plate with a cloud over the moon;
- the glass's reflections;
- a depth map;
- two light probes;
- the mobile as `mobile.glb`.

It also writes `src/levels/room6/room6Live.json`: the camera and where things are.

It moves the medals' rod 17 cm back from the glass. In the game the medals
hang there in WebGL: real ribbons over the rod, each medal its die's maps
(`medal_maps.mjs`, from the dies `reliefs.mjs` draws).

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/room_vi_live.py -- --samples 512 --width 2560
node art/blender/room_vi_publish.mjs
node art/blender/medal_maps.mjs
```

A full render takes about a minute on the RTX 4070. Use `--samples 64 --width 1280` for trials.

## The ground-floor hall

`hall_ground.py` builds the whole ground-floor hall in 3D. It renders it
through the same eye as `layoutHall` in `src/levels/hall/hall.js`, so every
door, sconce, wick, the gate and the clock fall where the game expects them.

It renders five passes into `.artifacts/hall`:

- `plate`: the hall, without the gate's leaves or the pendulum;
- `doors`: the same, with the furniture hidden from the camera but still
  casting shadows. A door swings open with this;
- `front`: the furniture alone, laid over a swinging door;
- `gate` and `pendulum`: the parts the game moves.

`clock_dial.mjs` draws the clock's face first. `hall_ground_publish.mjs` writes
the webps the game loads (`src/levels/hall/hallRender.js`). The game lays
them over any screen the way the layout lays itself out.

```powershell
node art/blender/clock_dial.mjs
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/hall_ground.py -- --samples 384 --width 2560
node art/blender/hall_ground_publish.mjs
```

Use `--samples 128 --width 1400 --only plate` for trials.

The stone staircase and its arched portal are built by `botany_staircase.py`.
The enclosure uses dark masonry, worn stone treads, a landing and a return
flight. Its scanned stone materials are `castle_wall_slates`,
`old_sandstone_02` and `slate_driveway`; the forged iron has modeled collars,
hinges, botanical scrolls and bronze locks. The lighting uses the chemistry
hall's cool fill, warm candle color, exposure and contrast as its reference.

The default render also includes `gate-motion`: 49 actual hinge poses of
both leaves. The publisher packs these into a grid below 4096 px per side
and writes `src/levels/hall/hallGate.json`. The game plays that sheet through
`ironGate.js`, retaining the separate static leaves as a loading fallback.
For a closed-gate trial use `--only plate --preview-gates 1`; `--output` keeps
trial passes separate, and `--blend` saves the editable scene.

## The chemist's hall (first floor)

`hall_chem.py` builds the first-floor hall the same way, through the same
camera. `hall_common.py` holds what both halls share: the measures, the
camera, the scanned materials and the passes.

It renders four passes into `.artifacts/hall-chem`:

- `plate`: the bulb dark;
- `lit`: the same hall with the bulb alight. When the lever is pulled, the
  game fades this in over the plate, so the Morse flashes light the hall;
- `doors` and `front`: as on the ground floor.

It also renders the bulb's knife switch:

- `switch-00` … `switch-12`: its blades at every angle, from open to shut;
- `switch-lit`: the blades shut, with the bulb alight.

Everything else is held out. The publish script lays the frames
side by side and writes where they go into `src/levels/hall/hallSwitch.json`.
The game plays them (`src/levels/hall/lightSwitch.js`).

`chem_boards.mjs` draws the flat things first: the blackboard's chalk, the
table of the elements, the apparatus chart, the gas gauge and the bottle
labels. The textures and models come from Poly Haven (CC0).

```powershell
node art/blender/chem_boards.mjs
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/hall_chem.py -- --samples 384 --width 2560
node art/blender/hall_chem_publish.mjs
```

Use `--samples 64 --width 1400 --only plate` for trials.

## The physics observatory (second floor)

`physics_rotunda.py` rebuilds the circular hall in real scale, with walnut
joinery, chevron parquet, a plaster dome, a glazed night window, the XI door,
gallery passage and spiral stairs. The telescope and animated armillary are
modeled brass instruments. Its overscan camera matches `layoutRotunda` at
every viewport; the room plate is scaled uniformly. Lighting follows the
chemistry hall. See [physics-sources.md](physics-sources.md) for materials,
camera measurements and the complete render/publish commands.

The publisher writes `observatory-native-v2.webp`, a grid of 64 armillary
poses and the camera/crop metadata used by `levels/top/physicsRender.js`.
The original procedural observatory remains the asset-loading fallback.

## The Top Passage

`top_passage.py` constructs the timber attic corridor, pegged roof trusses,
floorboards, lanterns, stored belongings and the working XII/XIII doorways.
It shares Physics' overscan perspective and the chemistry hall's lighting.
Each door has 41 native hinge poses and 7 latch poses; the publisher packs
them into two grids within 4096 px limits. Runtime uses the exported door,
lamp and lock landmarks. See [top-passage-sources.md](top-passage-sources.md)
for sources and render commands.

## The rooms off the halls (I–V, VII–IX, XI–XIII)

Every room is its own place, seen from wherever it is best seen: its own
camera (a corner, down a long gallery, sitting at a table, from a step above,
back at its own door), its furniture standing where it would stand, not all
along the walls. Blender then writes down where everything the game keeps alive
fell in the picture — the things that open puzzles, the chest, glows, flames,
window panes, the moonbeam, screens to draw over — by projecting them, into
`src/levels/house/rooms/<Room>.json`. The game lays the render over its screen
covering it (`renderedLayout` in `levels/house/roomRender.js`).

- `room_common.py`: `stage` (the free camera), `assembled`/`framed` (build
  something about the origin and stand it anywhere, turned), `Layout` (what the
  game is told), the gilt chest (rendered shut and open, alone, in the box the
  game draws it in, a light on it alone so its gold reads), `one_light` (the
  room's one light on, every other put out), `crop_frames` (a drawer, a notebook
  sliding out), and `finish`: what makes a room as clean as the halls — no
  haze, enough samples that the denoiser need not smear, stray paths clamped,
  the scans' own normal maps, no varnish shine.
- `room_furnish.py`: books (bound in leather grain) and bookcases, curtains,
  tables and desks, lamp shades, rugs, the garden at night, sash windows, oil
  lanterns, pitched roofs. `room_attic.py`: the rooms under the roof.
- The rooms: `room_study.py` (I), `room_library.py` (II), `room_cabin.py`
  (III), `room_counting.py` (IV), `room_drawing.py` (V), `room_lab.py` (VII),
  `room_weighing.py` (VIII), `room_nine.py` (IX), `room_physics.py` (XI),
  `room_archive.py` (XII), `room_workshop.py` (XIII). (The chemistry hall has
  three doors; there is no room X.)
- Drawn in code: `room_boards.mjs` (wallpaper, prints, cipher wheel, spines,
  rugs, sea chart), `clock_faces.mjs` (the library's clocks, from
  `overtime/puzzle.js`), `counting_boards.mjs` (the cards, the birds),
  `weighing_board.mjs`, `lab_boards.mjs` (periodic table, the phials' tag),
  `physics_boards.mjs` (the slate, the galvanometer).

Puzzle clues in a room are the puzzle's own: the clocks' times, the chess
position, the marked books, the cards, the birds on the wires, the Christmas
tree's lamps (3 1 4 1 5 9 2 6 5 alight, top to bottom), the five bottles.

Every room is lit as the chemistry hall is: by one light, always on, and the
moon. Nothing in a room changes when its puzzles are solved (a solved thing
only stops glinting, and can still be gone back into), so each room renders
one plate, `lights-1`. Rooms are exposed to the hall's brightness: a mean of
about 40 (out of 255) over the plate in greyscale.

`--only` picks what to render: `plates`, `chest` (rooms I–V), `drawer`
(counting), `notebook` (lab).

```powershell
node art/blender/room_boards.mjs; node art/blender/clock_faces.mjs; node art/blender/counting_boards.mjs
node art/blender/weighing_board.mjs; node art/blender/lab_boards.mjs; node art/blender/physics_boards.mjs
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/room_study.py -- --width 2560
node art/blender/room_publish.mjs study Room1
# likewise library Room2, cabin Room3, counting Room4 (--only plates,chest,drawer),
# drawing Room5, lab Room7 (--only plates,notebook), weighing Room8, nine Room9,
# physics Room11, archive Room12, workshop Room13
```

Use `--samples 64 --width 1100 --only plates` for trials. Room VI has its own
pipeline (above).

## The basement below Room V

`basement.py` builds the TapCode cellar in Blender; `basement_props.py` builds
its barrels, bottle crate, chart rolls, rack, candle and tools. The wall's
six tally pairs are actual engraved geometry and the rack has exactly 25
openings. [Source notes](basement-sources.md) record the native geometry and
cached CC0 material scans.

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup --python art/blender/basement.py -- --width 3200 --samples 384 --pack
node art/blender/basement_publish.mjs
```

The editable scene with packed textures is
`.artifacts/basement-native/render/source.blend`. The publisher writes
`cellar-native-v1.webp` and exports camera landmarks into
`src/levels/tapcode/nativeCellar.json`. Runtime flame, water drops and the
ladder exit use those same landmarks. The basement does not load the older
AI background or prop atlases; its missing-file fallback is drawn in code.

## The key in the lock (the botany hall's doors II–VI)

The first time a door is opened with the key its chest gave up, the game goes
close: a film of the lock stile of one of the hall's walnut doors, the gilt key
(`shared/keyArt.js`'s design) going into the keyhole, catching on the wards and
turning until the bolt goes back. `key_unlock.py` renders its 96 frames (30 a
second) with the hall's materials, and writes the moments the game makes its
sounds at; `key_unlock_film.py` makes them `public/assets/video/key-unlock.mp4`
and copies the moments to `src/levels/hall/keyUnlock.json`. The game lays the
film over the hall (`levels/hall/keyInsert.js`).

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/key_unlock.py
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/key_unlock_film.py
```

Use `--width 960 --samples 64 --still 40` for a trial frame.

## A letter found: opened on the desk

A found letter is opened in a film. `letter_film.py` renders it from straight
above an old walnut desk in lamplight (its green leather writing-bed tooled in
gilt, an inkwell and a pen at its edge): the envelope lies there, its flap
lifts and the red wax (pressed with the house's key) breaks across, and the
letter, folded in three, is drawn out, laid down and opened out fold by fold.
The paper is left blank: the game lays the letter's words over it in the last
frame, so the script writes where the paper lies then, where the envelope lies
in the first frame, and when each sound falls. It also renders the envelope
alone for the side panel. Paper, wax and pieces come from `letter_common.py`.

`letter_film_publish.mjs` makes the frames two films with
`letter_film_encode.py`: `letter-open.mp4`, and backward and twice as fast
`letter-fold.mp4` (the letter folded up again, to be filed). It also publishes
the first and last frames and the envelope into
`public/assets/images/CaseFile/letter/`, and writes `src/ui/letterFilm.json`.
The game plays the films over the screen (`ui/letterArrival.js`).

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/letter_film.py
node art/blender/letter_film_publish.mjs
```

Use `--width 960 --samples 40 --still 1,46,95,156` for trial frames.
