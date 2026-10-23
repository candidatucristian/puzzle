# The Top Passage

`top_passage.py` builds the attic corridor and two working doors in metres.
The corridor is 3.2 m wide, with an eaves height of 2.35 m and a 3.85 m ridge.
The architecture consists of individual floorboards, wall boards, solid
pitched roof boards, pegged oak trusses, knee braces and stone footings.
Doors XII and XIII are 0.96 × 2.22 m solid oak leaves with forged straps,
barrel hinges, bronze rivets, lock plates, keyholes and rotating latch levers.
Actual anterooms are visible through the open doorways.

The trunks, leaning frames, linen dust sheet, window, glazing, tree branches
and candle lanterns are modeled geometry. The cloth has thickness and folds;
the window and lantern panes are closed glass volumes. The fixed corridor
and each moving doorway share one camera and lighting setup.

Cached Poly Haven CC0 textures: `dark_wooden_planks`, `dark_wood`,
`rosewood_veneer1`, `wood_floor_worn`, `old_sandstone_02`,
`plastered_wall_04`, `crepe_satin`. Cached CC0 models: `wooden_crate_01`,
`wooden_stool_01`, `dining_chair_02`. Wear, iron, bronze, glass, wax,
night sky and flame shaders are native Blender nodes. No image generation
is used.

The camera shares the physics hall's 2800 × 1600 overscan reference, focal
length 1020 px and principal point (1400, 760), with a 1.55 m eye height.
Runtime uniformly scales the plate and reprojects the exported door quads,
keyholes, lantern flames and crop boxes. No additional painted room shade
or light spill is applied over the native render.

Cool fill (0.8, 0.85, 1), warm 9 W lanterns (1, 0.55, 0.22), AgX Medium
High Contrast and exposure 1.5 follow the chemistry hall. Haze density is
0.006. Fill proxies are hidden from the camera, and the two proxies visible
through or reflected in the gable window are also hidden from those rays.

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --python art/blender/top_passage.py -- --width 3840 --samples 384
node art/blender/top_passage_publish.mjs
```

Use `--width 1600 --samples 64 --only plate --output
.artifacts/top-passage-review/preview` for an architecture preview. The full
render writes 41 hinge poses and 7 latch poses for each door. The publisher
resamples the crops to fit 4096 px texture limits, softens their outer edges,
and packages two 48-pose sheets plus the room plate and camera metadata.

The existing door clock, sound, navigation, resize handling, key animation
and reduced-motion behavior remain in `HallScene`. The native controller
selects the rendered pose directly, without generating a canvas per frame.
The original passage remains the fallback if any native sheet fails to load.
