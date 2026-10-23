# Physics hall: native observatory

`physics_rotunda.py` constructs the room and its instruments in metres. The
shell, oblate dome, structural ribs, panelled joinery, chevron parquet boards,
window and closed glass, curtains, XI door, gallery passage, descending spiral
stair, refractor and armillary are original Blender geometry. The runtime uses
one room plate and 64 transparent poses of the armillary's brass rings.

Materials use cached Poly Haven CC0 scans: `dark_wood`, `rosewood_veneer1`,
`old_sandstone_02`, `plastered_wall_04`, `worn_plaster_wall`, `wood_floor_worn`
and `velour_velvet`. The microscope and encyclopedia set are the cached
Poly Haven CC0 models `vintage_microscope` and `book_encyclopedia_set_01`.
The brass, bronze, blackened iron, wax, lunar surface and glass are Blender
node materials. No image generation is used.

The camera has its eye 1.5 m above the floor and faces +Y. Its 2800 × 1600
reference canvas has focal length 1020 px and principal point (1400, 760).
The overscan preserves `layoutRotunda`'s perspective when the viewport changes;
the image is uniformly scaled and cropped. Door landmarks and the armillary
crop are exported from the rendered camera into `physicsRender.json`.

Cool fill (0.8, 0.85, 1), candle colour (1, 0.55, 0.22), 9 W candles and
AgX exposure 1.5 follow the chemistry hall. The night window has a broad,
soft moonlight source; light proxies are invisible to camera, glossy and
transmission rays. Haze density is 0.008. The runtime adds no extra room
shade or grain over this plate.

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --python art/blender/physics_rotunda.py -- --width 3840 --samples 384
node art/blender/physics_rotunda_publish.mjs
```

For a low-cost preview, append `--width 1600 --samples 64 --only plate
--output .artifacts/physics-hall-review/preview`. Native assets have a procedural
fallback, and reduced motion freezes the instrument at its current pose.
