# The Captain’s Cabin: miniature study in a bottle

`captains_bottle.py` builds an original diorama inside a real, thick-walled
glass bottle. The scene contains a captain's study with furniture, rather
than an exterior ship. The complete bottle, cork, linen tie, walnut cradles,
desk and miniature interior are native Blender geometry.

The interior has individually laid teak floorboards and nails, fitted
walnut lining, bent roof ribs, a cupboard of bound books, a writing desk with
turned legs and drawer pulls, a chair, globe, clock, quill, inkpot and coiled
linen rope. A working brass compass and red-wax-sealed map are the same
two puzzle interactions. Its original bearing sequence and answer are
unchanged. The display is stationary; only the needle and gentle lamplight
change.

The bottle is a continuous closed glass shell, with separate outer and inner
surfaces, a rounded base, tapered shoulders, a rolled mouth, slight geometric
irregularity, microscopic surface relief and small trapped glassmaking
bubbles. Glass is rendered in Cycles with transmission and an IOR of 1.475.
Wooden cradles have genuine concave saddles fitted below the glass surface.
Broad lights and restrained specular contributions leave the instrument
legible while preserving the reflection along the bottle's upper shoulder.

The compass card and inspection chart are original vector artwork prepared
by `captains_bottle_publish.mjs`. Degree ticks, numbers and cardinal letters
are part of the physical dial. The four bearing rows are taken directly from
`src/levels/compass/puzzle.js`. The chart is rendered on a real gently
deformed paper mesh, with a cotton-paper shader and soft illumination.

Every five degrees, Cycles renders the compass region with its actual needle
behind the same glass. The runtime changes among these 72 physical views;
the background, refraction, tiny shadows and instrument illumination agree.
Atlas edges are feathered against the main photograph. Metadata records the
original camera's compass centre, radius, map corners and lantern flame.
Rendering and interaction share the same full-viewport crop.

Surface scans reuse existing Poly Haven CC0 `rosewood_veneer1`, `dark_wood`,
`wood_floor_worn` and `brown_leather` assets from the local render cache.
Cork, aged brass, paper, glass, wax and cloth also use original procedural
shaders. No AI image generator, old photographic prop cutout, video, or
painted cabin background is loaded by this version of the Compass level.

Rebuild the visual assets:

```powershell
node art/blender/captains_bottle_publish.mjs --prepare
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' --background --factory-startup --python art/blender/captains_bottle.py -- --width 2560 --samples 256 --pack
node art/blender/captains_bottle_publish.mjs
```

The packed, editable scene is
`.artifacts/captains-bottle/captains-bottle.blend`. Use `--width 1280
--samples 24 --preview --cpu` for a quick photographic preview. Source
renders and original chart/dial artwork remain beside the packed scene.
