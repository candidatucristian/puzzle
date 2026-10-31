# His Cot — Room VI, puzzle 03

`his_cot.py` builds the nursery from original Blender geometry. The scene is
saved in `.artifacts/his-cot-native/his-cot.blend`; `--pack` packs the texture
sources. `his_cot_publish.mjs` publishes the Cycles photographs and exact
camera into `public/assets/images/Cot/native-v1/` and `nativeCot.json`.

The mahogany cot has individually turned spindles, mouldings, rounded
joinery, screw slots and a lowered front rail. The cotton sheet is a real
mesh with shallow edge wrinkles, a woven shader, an original moon-and-star
print and continuous sewn mattress piping. Original geometry supplies all
fifteen fixed belongings: filled linen pillow, hollow knitted bootees,
mohair bear, knitted rabbit, rattle, folded blanket, pull-along duck,
locomotive, rocking horse, alphabet blocks, stitched leather ball, stacking
rings, spinning top, fire engine and linen elephant. Curves model mohair
fibres, wool stitches, panel seams, pull strings and carved-horse details.

The five clue toys and suspended mobile remain live three.js meshes. Their
perspective is computed from the Blender camera, in metres, and the render
is fitted without stretching. The transparent foreground is a separate
Cycles pass of the actual lowered rail. The live mesh source is
`src/levels/cot/toys3d.js`; the sewn mobile and every attached thread are
in `mobile3d.js`. Chaplin has modeled eyes, brows and moustache. The book's
gilt title, hotel sign and music-box floral inlay are drawn in code.

Materials reuse photographed CC0 scans already present in the workspace's
`C:/Users/crist/Tools/render/assets/textures/` cache, from Poly Haven:

- rosewood_veneer1, dark_wood: cot and beech toys;
- plastered_wall_04: deep teal lime-plaster wall;
- brown_leather: ball panels and live toy material detail;
- leather_red_02, velour_velvet, distressed_painted_planks,
  crepe_satin, quatrefoil_jacquard_fabric: native live-material atlas.

All textiles also have native procedural weave/bump. Lighting consists of
a blue window area light, warm bedside lamp, soft bounced fill and a dim
night world. No AI image generator, old photographic toy cutouts or old
generated material atlas is loaded by the Cot puzzle scene.

Rebuild:

```powershell
node art/blender/his_cot_publish.mjs --prepare
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' --background --factory-startup --python art/blender/his_cot.py -- --width 2560 --samples 384 --pack
node art/blender/his_cot_publish.mjs
```
