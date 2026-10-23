# Room I: The Moonlit Garden — outdoor terrace

Current artwork: woodland background revision 6, foreground revision 4,
window revision 1. Blender 4.5 LTS / Cycles, original exterior
geometry and CC0 photographic scans. No AI image generation is used.

## Complete editable source

- `fibonacci.blend`: the uncovered garden terrace, scanned oak table,
  clay pot, oil lamp, water pail, tools, growing specimen, garden path,
  woodland track and dense forest. All image textures are packed.
- `fibonacci_forest.py`: layered night woodland using instances of the
  original tree scans, a damp leaf floor and localized atmospheric depth.
- `fibonacci_forest_publish.mjs`: updates only the woodland background.
- `fibonacci_window.py`: modeled foreground oak window, deep sill, plaster
  reveals and hinges. Its transparent Cycles plate frames the existing garden.
- `fibonacci_window_publish.mjs`: updates only that foreground plate while
  preserving the accepted garden, plant and pail renders.
- `fibonacci.py`: entry point for the current exterior builder.
- `fibonacci_garden.py`: creates the outdoor surroundings, physical lights,
  camera, render layers and gameplay landmarks.
- `fibonacci_geranium.py`: original scanned Pelargonium leaf topology,
  modeled shoots and petioles, five gameplay branches and leaf groups.
- `fibonacci_layers.py`: re-exports layers from the packed editable scene.
- `fibonacci_occlusion.py`: actual stem visibility behind the pot rim.
- `fibonacci_publish.mjs`: rendered layers and camera-derived anchors.
- `src/levels/plantpot/blenderPlant.js`: fills the viewport and aligns the
  interactive objects to the render camera.

The level is outside, at the edge of a dark forest. Stone terrace steps lead
to a narrow woodland track. Irregularly placed tree instances
form several distances, with low branching trees at the edge and larger
crowns overhead. Faint cool haze separates the distant silhouettes. The
former lawn and distant garden wall are replaced by woodland.
Broad, subdued moonlight over the clearing reveals bark and lower branches;
a separate cool light separates the crowns and distant haze. Exposure and
foreground lights retain the original night treatment.
The player looks out through an open manor window. Its oak sill and side
jambs stand in the foreground; the garden remains outside. The window plate
adapts at the viewport edges, preserving clear access to the plant and pail
on compact screens. There is no enclosed room around the garden. The
interactive specimen is the only plant on or beside the workbench; no
scattered weeds, ferns or decorative foliage obscure the puzzle.

The materials follow the scanned-material approach used by `hall_chem.py`:
physically scaled surfaces, roughness variation, real edge construction and
contact shadows. Moonlight, broad night-sky fill and the oil lamp illuminate
the foreground. Reflections and indirect light use the actual surroundings.

## The unchanged puzzle

Twelve original Pelargonium leaf meshes retain photographed folds, lobed
margins, UVs, normal maps and roughness. Separate leaf rolls and pitches,
modeled petioles and five growing shoots preserve three-dimensional shape.
The five pours still introduce 1, 1, 2, 3 and 5 leaves; `FIBO` and `FIBONACCI`
remain accepted answers. Camera framing keeps the plant and pail visible
and fills the viewport on desktop and compact screens.

The zinc pail has wall thickness, rolled steel beads, rivets, a wire handle,
wooden grip and refracting water. Six renders show actual water heights.
A Cycles visibility pass captures its contact shadow on this actual table;
that shadow follows the pail horizontally and fades when lifted.

## Asset provenance

Existing local library: `C:/Users/crist/Tools/render/assets`.

Poly Haven CC0 models: `WoodenTable_01`, `planter_pot_clay`,
`vintage_oil_lamp`, `potted_plant_01`, `tree_small_02`, `island_tree_01`,
`fir_tree_01`.

CC0 materials: `old_sandstone_02`, `slate_driveway`, `gravel_road`,
`grass_ground`, `forest_leaves_02`, `dark_wood`, `worn_plaster_wall`.
HDRI: `approaching_storm`, dimmed and graded for night.

The terrace, separate coping stones, steps, garden path, pail, trowel,
cloth, twine, shoots and petioles are modeled in Blender. Model and texture
pages use `https://polyhaven.com/a/` followed by the identifier above.
License: https://polyhaven.com/license

## Reproduce

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' --background --factory-startup --python art/blender/fibonacci.py -- --mode layers --width 2560 --samples 512 --gpu --save
node art/blender/fibonacci_publish.mjs
```

Render output: `.artifacts/fibonacci-garden/`.
For a quick preview use `--mode preview --width 1280 --samples 64 --gpu`.
To render from the packed scene use `fibonacci_layers.py`.

To update only the window and retain all accepted outdoor renders:

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' --background --factory-startup --python art/blender/fibonacci_window.py -- --width 2560 --samples 128 --save
node art/blender/fibonacci_window_publish.mjs
```

To update only the woodland beyond the window:

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' --background --factory-startup --python art/blender/fibonacci_forest.py -- --width 2560 --samples 512 --gpu --save
node art/blender/fibonacci_forest_publish.mjs
```

The rejected interior revision and previous outdoor prototypes are
superseded; their images are not loaded by the active level. Gameplay branch
and leaf positions are exported from the active Blender geometry.
