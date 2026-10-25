# Room I — Ivy's botanical study, uncluttered edition

The room is modeled and rendered in Blender Cycles by `room_study.py`.
The editable packed scene is `.artifacts/room-study/study.blend`.

The redesign replaces the floor-to-ceiling wall of books and ladder with a lower
herbarium cabinet: three closed cupboards and 36 aligned reference books. The
glass specimen case has its own clear table. The narrower writing desk and chair
stand further back; an open sheet, microscope, candle and puzzle chest have
distinct places. The large foreground plant, lampshade, loose table accessories,
mantel ornaments and unrelated gilt picture have been removed.

Quiet moss plaster and a plain olive rug replace the damask and ornate carpet.
The casements, glazing bars, sill, architrave and curved inner window lining are
oiled oak, including the faces exposed by the open leaf. There is no painted-white
window material. The stone fireplace is muted, leaving the cipher wheel prominent.

Materials and retained furnishings use the existing locally cached CC0 Poly Haven
scans/models through `kit.py`, `hall_common.py` and `room_furnish.py`; the reference
book spines, cipher and botanical print use the project's existing drawn textures.
No AI image generation is used for this redesign.

The render and both chest states use the same camera and lighting. Blender writes
the projected puzzle outlines, chest, candle and rain panes to a staged `Study.json`.
`study_publish.mjs` publishes all three WebPs before installing that layout. Version
2 asset paths keep cached images from the old arrangement separate.

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' -b -t 6 -P art/blender/room_study.py -- --samples 384 --width 2560
node art/blender/study_publish.mjs
```

No tests, builds or browser automation are run for this change, per the user's
explicit instruction. Rendering and publishing are asset-production steps.
