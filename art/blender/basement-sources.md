# Room V — Basement

The TapCode cellar is built by `basement.py` and `basement_props.py` in real
metres. The room plate is rendered in Blender 4.5 LTS / Cycles. Its editable
scene and full-resolution PNG are saved under `.artifacts/basement-native/render/`.

Native geometry includes individual irregular clay bricks and lime bed joints,
separate flagstones, overhead oak beams, an open hatch, a supported iron ladder,
a continuous pipe with elbow, collars and valve, coopered barrels, a bottle
crate, hollow bottles, rolled paper charts, a candle and drip pan, hand tools,
and a five-by-five rack with actual square openings.

The limestone tablet has 31 Boolean-cut grooves, in six pairs:
1/5, 4/4, 1/3, 1/1, 4/1, 1/5. These preserve the existing ESCAPE puzzle.
The Z beside the rack is also carved geometry.

Cached Poly Haven CC0 material scans: `dark_wood`,
`old_sandstone_02`, `worn_plaster_wall`, `plastered_wall_04`.
Stone UVs use the interior of a scanned block: the original scan's mortar
does not cross the modeled flagstones, clay bricks or inscription tablet.
The stool is the cached Poly Haven CC0 model `wooden_stool_01`.
Iron, brass, glass, water and wax use Blender node materials. No AI room
photographs, AI prop atlases or generated bitmap artwork enter this scene.

The runtime loads only `assets/images/TapCode/cellar-native-v1.webp` for this
room. It retains a procedural drawing as its missing-file fallback. The older
photographic source files remain under `art/archive/tapcode-ai/`, outside the
public assets copied into release builds. Candle flame, water drops, ripples and subtle ambient movement use
landmarks exported from the render camera and the same uniform image scale.

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b --factory-startup --python art/blender/basement.py -- --width 3200 --samples 384 --pack
node art/blender/basement_publish.mjs
```

For a preview use `--width 1600 --samples 80 --output .artifacts/basement-native/preview`.
