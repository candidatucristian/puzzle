# Blender artwork

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

## The rooms off the halls (I, II, III)

Each room is built in 3D through the eye every room is seen with
(`levels/house/roomKit.js` `roomLayout`, at its 1792 × 1024 reference). The
room's own layout code (`study.js`, `room2.js`, `room3.js`) gives the numbers,
so every clickable thing, glow, flame and chest falls where the game expects
it.

- `room_common.py`: the camera, the gilt chest (rendered shut and open, alone,
  in the box the game draws it in), and a plate for every combination of the
  room's lights.
- `room_furnish.py`: books and bookcases, curtains, tables and desks, lamp
  shades, rugs, and the garden at night beyond a window.
- `room_study.py`, `room_library.py`, `room_cabin.py`: the rooms themselves.
- `room_boards.mjs`: the flat things, drawn in code (wallpaper, prints, the
  cipher wheel, book spines, rugs, the sea chart).
- `clock_faces.mjs`: the library's clock faces, drawn from the puzzle's own
  times (`overtime/puzzle.js`).

A light goes out when its puzzle is solved, so a room renders one plate per
way its lights can stand (`lights-101`: the first and third on). The game
shows the plate for the current state (`levels/house/roomRender.js`).

```powershell
node art/blender/room_boards.mjs
node art/blender/clock_faces.mjs
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup -P art/blender/room_study.py -- --samples 256 --width 2560
node art/blender/room_publish.mjs study Room1
# likewise room_library.py → library Room2, room_cabin.py → cabin Room3
```

Use `--samples 48 --width 1400 --only lights-11` (or `lights-111`) for trials.
