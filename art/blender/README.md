# Blender artwork

## Lamplight in the Library

`library_lamplight.py` models the full library puzzle, sleeping tabby and
five leather-bound clue books. Cycles renders nine physical pull poses per
book, including their moving shadows, numbered bookmarks and gilt titles.
`library_lamplight_publish.mjs` prepares the shared puzzle data and publishes
the room and animation atlas. See [library-lamplight-sources.md](library-lamplight-sources.md)
for materials, the editable packed scene and rendering commands.

## The Captain’s Cabin — a study in a bottle

`captains_bottle.py` builds the captain's miniature study inside an actual
thick glass bottle, with a carved walnut cradle, cork, books, furniture and
a working brass compass. The full Cycles photograph and 72 refracted needle
poses share the same physical camera. An original cotton-paper chart
preserves the four bearing clues. `captains_bottle_publish.mjs` prepares the
original artwork and publishes the native assets and camera landmarks.
See [captains-bottle-sources.md](captains-bottle-sources.md) for material
sources, the editable scene and rendering commands.

## His Cot — Room VI, puzzle 03

`his_cot.py` builds an original mahogany cot and fifteen modeled belongings,
with sewn textiles, mohair fibres, worn toy surfaces and a moonlit nursery.
`his_cot_publish.mjs --prepare` prepares the original sheet print and CC0
material atlas; the publisher then installs the Cycles room, transparent
front rail and exact camera. The five clues and sewn mobile remain live
three.js meshes. See [his-cot-sources.md](his-cot-sources.md) for sources and
the reproducible rendering command.

## Candlelight and Brass

`candlelight_brass.py` builds the physical cipher apparatus and renders all
eight candle-light combinations, luminous rotor, unfolded letter and native
flame atlas. `candlelight_brass_publish.mjs` publishes the images and actual
camera landmarks. See [candlelight-brass-sources.md](candlelight-brass-sources.md)
for the rebuild and surface sources. The editable main scene is saved to
`.artifacts/candlelight-brass/candlelight-brass.blend`.

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

Room lighting is independent of puzzle progress. Most rooms keep one light
and the moon; Room I keeps its desk lamp off and all four candles lit (see
`study-dark-sources.md`). Solved objects stop glinting and can still be gone
back into. Each room renders one plate, `lights-1`; this filename is a plate
identifier rather than a light count or puzzle state. Rooms are exposed to
the hall's brightness: a mean of about 40 (out of 255) over the plate in greyscale.

`--only` picks what to render: `plates`, `chest` (rooms I–V), `drawer`
(counting), `notebook` (lab).

```powershell
node art/blender/room_boards.mjs; node art/blender/clock_faces.mjs; node art/blender/counting_boards.mjs
node art/blender/weighing_board.mjs; node art/blender/lab_boards.mjs; node art/blender/physics_boards.mjs
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/room_study.py -- --width 2560
node art/blender/room_publish.mjs study Room1
# likewise library Room2, cabin Room3, counting Room4 (--only plates,chest,drawer),
# drawing Room5, lab Room7 (--only plates,notebook), weighing Room8, nine Room9,
# physics Room11 3, archive Room12, workshop Room13
```

Use `--samples 64 --width 1100 --only plates` for trials. Room VI has its own
pipeline (above). A room rendered again is published under a new version
(the third argument) and `levels/house/roomRender.js` names it.

## The counting frame (Room XI)

`counting_frame_model.py` builds Orion's counting frame — the walnut frame,
the dusty enamel board with its clean places, the ebony rods, the brass
wires, the eight black blocks — from `src/levels/abacus/puzzle.json` (where
the blocks stood, where they lie now). `room_physics.py` lays it on his bench;
`counting_frame.py` is the level's close-up: the plate without its blocks,
then the blocks alone at each of their three places, their shadows caught on
the board. `counting_frame_publish.mjs` cuts every block at every place into
one atlas and writes `src/levels/abacus/countingFrame.json`.

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/counting_frame.py -- --width 2560 --samples 384
node art/blender/counting_frame_publish.mjs
```

`--still 1` renders the frame as the level first shows it, for trials.

## The Ticket Drawer (Room IV)

`ticket_faces.mjs` prints the eight Edmondson card tickets (57 × 30 mm) from
`src/levels/station/rows.js`: DIN lettering (Bahnschrift), serial numbers,
the dating press's 13 OC 61, each train's rubber stamp, and the one low,
askew letter in every BOARDING destination. It also writes a press map (the
type bitten into the card, for the bump), the backs of the standing tickets
and a worn penny's relief. `ticket_drawer.py` builds Room IV's top drawer as
`room_counting.py` has it (mahogany front, oak sides and bottom), pulled out
of its chest: rows of tickets standing at the back, the eight laid out in
front, an ink pad, its lid with two pennies, the rubber stamp, a pencil, a
rubber band; a candle over the left shoulder. `ticket_drawer_publish.mjs`
writes `public/assets/images/Station/ticket-drawer-v1.webp` and
`src/levels/station/ticketDrawer.json` (safe box, the candle's glow).

```powershell
node art/blender/ticket_faces.mjs
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/ticket_drawer.py -- --width 2560 --samples 700
node art/blender/ticket_drawer_publish.mjs
```

`--preview 1` renders a small, quick trial (`preview.png`).

## Before Sunrise: Room IV's picture

`dawn_country.py` makes the picture: the last minute before sunrise from a
hilltop meadow (Nishita sky, the sun just under the hills), an old stone
cottage with its porch lantern alight and an old man in a rocking chair, a
fence and a dry-stone wall, the telegraph pole with five wires, and six
blackbirds put on their wires where `src/levels/wires/puzzle.js` WIRE_BIRDS
has them across the picture; the valley below with hedgerows, copses and its
mist. CC0 models from Poly Haven (`C:/Users/crist/Tools/render/fetch10.mjs`).
`dawn_frame.py` hangs it in an old gilt moulding on Room IV's plaster under
the brass picture light: the level's plate. `dawn_publish.mjs` copies the
picture to `.artifacts/rooms/painting.png` (Room IV hangs it: render
`room_counting.py` after it) and publishes the plate.

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/dawn_country.py -- --samples 384
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/dawn_frame.py
node art/blender/dawn_publish.mjs
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/room_counting.py
node art/blender/room_publish.mjs counting Room4 2
```

`--preview 1` gives a small, quick look (no mist, fewer trees).

## The Lit Tree: Room V's corner

`room_drawing.py --view tree` renders Room V's own scene from a second eye,
close to the tree (`tree_level_passes.py`): the plate with just so many lamps
alight on each tier as the puzzle has them, the moon moved to be seen in the
window, the first parcel opened and its lid laid by (cut to its place), and
the rule, the protractor and the compasses (`drawing_instruments.py`) each
alone with its shadow. `tree_level_publish.mjs` packs them and writes
`src/levels/pi/treeLevel.json` (lamps, moon, parcel, instruments).

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/room_drawing.py -- --view tree
node art/blender/tree_level_publish.mjs
```

## Silas's Notebook: the desk (Room VII)

`notebook_desk.py` renders his notebook open on the walnut desk, straight
down from above: green book-cloth boards, the page blocks fanned at their
edges, two top sheets of aged squared paper bowing into the spine; an
inkwell, a round flask on its cork ring, a pencil, his spectacles. The book
is laid out to the picture `src/levels/molecules/book.js` turns its leaves in
(1536 × 1024 px, 40 px a centimetre, the spine at 768); the render is the
desk round it (2400 × 1600, the book at 432, 288). `notebook_desk_publish.mjs`
writes `public/assets/images/Molecules/notebook-desk-v1.webp` and
`notebookDesk.json` (where the book lies, its top sheets' outlines).

## Two Phials: the counter (Room VII)

`room_lab.py --view phials` renders Room VII's own scene close to the little
rack at the end of the sinks (`phials_level_passes.py`): the plate with the
rack standing empty; each tube alone in clear glass, to be lifted; the
rack's upper board alone, to stand in front of the tubes in the rack.
`phials_level_publish.mjs` packs them and writes
`src/levels/phials/phialsLevel.json`. The tag is `lab_boards.mjs`'s.

## The Apothecary's Bench: the bench (Room VII)

`room_lab.py --view bench` renders Room VII's own bench close to
(`bench_level_passes.py`): the plate, the lamp and the burner alight; the
green cloth with the magnifying glass taken off it; the five bottles again at
three times the size, for what the lens shows. The bottles are thin glass,
open at the mouth (`vessel()`), each liquid filled to its own number and read
at the bottom of its meniscus (`fill()`); their printed scales are
`lab_boards.mjs`'s, from `SCALES` in `src/levels/chemistry/puzzle.js`
(`lab-scale-i.png`, `lab-scales.json`). The bench is topped with honed slate
(`honed_slate()`, procedural). `bench_level_publish.mjs` writes
`public/assets/images/Chemistry/bench-{plate,cloth,zoom}-v1.webp` and
`src/levels/chemistry/benchLevel.json`.

## To the Line: the sink counter (Room VIII)

`room_weighing.py --view measures` renders Room VIII's own sink counter close
to, at the bottles' height (`measures_level_passes.py`): the plate, the slate
bare where the bottles and the flask stand; the volumetric flask alone in
clear glass (its 400 ml and 20 °C etched on its bulb, `measures_marks.mjs`;
its ring on the neck); its shadow alone on the slate (a shadow catcher). The
two bottles are the game's, in three dimensions (`levels/measures/stage3d.js`),
seen through this render's own camera, which `measuresLevel.json` carries
(field of view, tilt, height over the slate, distance from the row, the lamp
by the sink). `measures_level_publish.mjs` writes
`public/assets/images/Measures/{sink-plate,flask,flask-shadow}-v1.webp` and
`src/levels/measures/measuresLevel.json`. The room's own bottles and flask
stand where the level has them, and are the same glass.

## Ivy's Herbarium: the album (Room VI)

`herbarium_desk.py` renders her album open on the walnut console table,
straight down (24 px a centimetre of the book's 1536 × 1024 picture, the
table round it 2400 × 1600): faded green book-cloth, sewn, the page block
thick, the top sheets of cotton paper bare. Then each of her five pages is
built on its own top sheet and rendered close (2.25 times finer), and taken
away again: `herbarium_plants.py` makes the ten pressed specimens — hawthorn
and daisy, dog rose and oak, ivy and ribwort plantain, blackthorn and beech,
privet and primrose — flat, from leaf outlines with their veins in the
shader, translucent petals, flattened stems and thorns, gummed strips across
them; the large one of each page in its upper part, inside where her pencil
figure goes. Her Latin names and the pencil figures are the game's
(`levels/herbarium/book.js`). `herbarium_publish.mjs` writes
`public/assets/images/Herbarium/{desk,sheet-1…5}-v1.webp` and
`src/levels/herbarium/herbariumDesk.json`.

## The Unfinished Game: the chess table (Room III)

`chess_set.py` is the one chess set of Room III and its level: the pieces
are Poly Haven's `chess_set` (CC0; `C:/Users/crist/Tools/render/fetch9.mjs`
downloads it at 4k), their carving kept (its normal maps and occlusion),
their marble made turned boxwood and ebony; the board is built here — maple
and walnut squares each cut from its own part of the veneer, boxwood
stringing, a walnut frame with a–h and 1–8 inlaid in boxwood on all four
sides. `room_cabin.py` stands it on the games table; `chess_game.py` is the
level's close-up from white's side, the candle burnt half down at the far
corner: the plate without its pieces, then each piece alone and each
piece's shadow alone (caught by the board and the table), so the game can
lift a piece. `chess_game_publish.mjs` packs them (the shadows at half size)
into one atlas and writes `src/levels/chessboard/chessGame.json`.

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/chess_game.py -- --width 2560 --samples 700
node art/blender/chess_game_publish.mjs [--check <png>]
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/room_cabin.py -- --only plates,chest
node art/blender/room_publish.mjs cabin Room3 2
```

`--preview 1` renders a quick trial of the close-up (`still.png`);
`--check` lays everything back on the plate, to compare.

## After Hours: the desk at night (Room II)

`overtime_office.py` builds the clerk's desk from the chair: walnut
panelling, a botanical print behind glass, the red LED clock, the clock radio
on its shelf, the alarm clock and the travel clock (their faces from
`clock_faces.mjs`, made from `OVERTIME_CLOCKS`), the green banker's lamp —
the only light; its glass shade has a light of its own, linked to it alone,
for its shine — a mug, a sprig of periwinkle, a ruled pad, and the adding
calculator, built key by key from the level's KEYPAD on the desk's green
leather, its display blank (the game writes on it). It renders the plate with
every colon dark, then again with them lit; `overtime_publish.mjs` cuts each
lit colon out (with a margin for its glow) into one small atlas and writes
`src/levels/overtime/officeRender.json`: the safe box, each key's cap, the
display's glass, the colons, the coffee.

```powershell
node art/blender/clock_faces.mjs
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/overtime_office.py -- --width 2560 --samples 700
node art/blender/overtime_publish.mjs
```

`--still 1` (or `--still lit`) renders one trial picture (`still.png`);
`--probe "x,y;x,y"` prints what the eye sees at points of the picture.

## Rewind: the windowsill (Room XI)

`rewind_model.py` builds Orion's four ways of keeping time — the brass drum
clock (its hands apart), the tear-off calendar, the sand-glass with its ivory
scale of minutes, the candle-clock — from `src/levels/rewind/puzzle.json`
(where each lies now, where it stops), with what `rewind_boards.mjs` draws
(the dial, the pages, the candle's hours). `room_physics.py` stands them on
the room's sill; `rewind_sill.py` is the level's close-up, the window and the
garden as the room has them: the plate as all lies now, then each moving
piece cut to its own place — the hands at twelve, the pages one by one, the
sand gone back up, the candle grown back. No glow in the compositor: every
piece must match the plate. `rewind_publish.mjs` packs the pieces into one
atlas and writes `src/levels/rewind/rewindSill.json`.

```powershell
node art/blender/rewind_boards.mjs
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/rewind_sill.py -- --width 2560 --samples 384
node art/blender/rewind_publish.mjs
```

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

`letter_animation.py` authors a physical envelope, fractured key-stamped wax,
three hinged paper panels and an animated camera over a walnut writing desk.
The envelope enters the frame, lands, opens, and the letter slides out and
unfolds. Blender bakes paper fibres, creases, ageing and CC0 desk surfaces
into colour and normal atlases, then exports the actual meshes and one glTF
animation. `letter_animation_publish.mjs` publishes its timing and landmarks.

`ui/letterStage3d.js` plays the Blender keyframes live; `ui/letterArrival.js`
places accessible, localised DOM words on the actual paper and reverses the
mesh animation when filed. There is no video element, movie encoder or letter
video asset. The optional future `public/assets/sounds/letter-open.mp4` is
consumed only through an Audio element, at the user's SFX volume.
See [letter-animation-sources.md](letter-animation-sources.md).

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/letter_animation.py -- --samples 16 --pack
node art/blender/letter_animation_publish.mjs
```

The editable packed scene is `.artifacts/letter-animation/letter-animation.blend`.

## The Open Window

`open_window.py` builds the observatory window and night sky in Blender:
oak architecture, folded cloth, opened casements, a wooded valley, a brass
telescope, emissive star geometry and a spherical Moon with NASA lunar
colour and elevation maps. [Source notes](open-window-sources.md) record the
photographic data and the five unchanged Braille constellations.

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' --background --factory-startup --python art/blender/open_window.py -- --width 2880 --samples 256 --pack
node art/blender/open_window_publish.mjs
```

The packed scene is `.artifacts/open-window/open-window.blend`. Three
WebP renders supply the full-screen sky, its quieter decorative stars and
the telescope approach; exported camera coordinates keep the existing
constellation guide aligned with the rendered stars.

## The room with the router

`modem_room.py` builds the MODEM level in Blender: a walnut desk, green
banker's lamp, teal plaster, library cabinet and an original graphite router
with exactly five counter LEDs and seven data LEDs. Each changing lens and
its reflected desk light is rendered separately. The publisher extracts
twelve additive light layers; the game uses the unchanged transmission
schedule from `modem/puzzle.js`. [Source notes](modem-room-sources.md) record
the geometry, cached photographic resources and lighting pipeline.

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' --background --factory-startup --python art/blender/modem_room.py -- --width 2880 --samples 256 --pack
node art/blender/modem_room_publish.mjs
```

The packed scene is `.artifacts/modem-native/router-room.blend`. Runtime
art is in `public/assets/images/Modem/native-v1/`, with camera coordinates
in `src/levels/modem/nativeModem.json`.
