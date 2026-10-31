# Room I with its desk lamp off and all four candles lit

`room_study_v4.py` retains the existing study geometry, camera, worn materials,
furniture and puzzle positions. The desk lamp has no light source and its white
glass shade has zero emission. All four candles keep their warm point lights,
animated flame overlays and halos. Moonlight and cool ambient fill keep the
room readable. Lighting stays fixed throughout puzzle progress.

The assets are rendered in Blender 4.5 Cycles at 2560 × 1362 with 384 samples,
OptiX and denoising. Existing cached CC0 Poly Haven assets and the shared
`specimen_book.py` supply the room's materials and props. No AI images are used.

The plate and both chest cutouts are rendered together with the same room
lighting. `study_dark_publish.mjs` writes version 6 WebPs and installs the
projected `Study.json`, with four candle `glows` and `flames` and no lamp glow.
The shared `lights-1` filename is a plate identifier, independent of light count
or puzzle state. `StudyScene` adds the candle flames, halos, rain and dust.

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' --background --factory-startup -t 6 --python art/blender/room_study_v4.py -- --samples 384 --width 2560
node art/blender/study_dark_publish.mjs
```
