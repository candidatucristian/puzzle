# Ground floor visual repairs: rooms I–III

The three room builders retain their original camera and interaction geometry.

- Study: an actual machined brass rim and spindle replace the printed alphabet
  in the room overview, matching the hidden lettering in the cipher close-up.
  The desk lamp stays off and all four candles remain lit.
- Library, router and After Hours: lamp metal has a worn, rough patina, and
  fixture power is calibrated for the nearby stem. Room bloom is removed.
- Captain's room: flat n-gon glass normals and a shallower window reveal
  correct the unintended magnifying and tunnel effects in the portholes.
  The lantern has thin hollow glass, a restrained
  flame and no photographic bloom. The candle and green desk lamp stay lit,
  matching their close-ups, regardless of puzzle progress.
- The two affected coffers are rerendered in the repaired room lighting with
  their 13 lid poses, real contact shadows and matching key portraits.
- The bookshelf scene synchronises its initial viewport to its current host,
  and scales its narrow-screen background in reference-pixel coordinates.

Production is authentic Blender 4.5 Cycles, with no image generation:

```powershell
& 'C:\Users\crist\Tools\blender-4.5.15-windows-x64\blender.exe' -b -t 8 -P art/blender/ground_floor_repair.py -- --width 2560 --samples 256
node art/blender/ground_floor_repair_publish.mjs
node art/blender/modem_room_publish.mjs .artifacts/ground-floor-repair/Modem 2
node art/blender/overtime_publish.mjs .artifacts/ground-floor-repair/Overtime 3
```

Editable packed scenes and source PNGs are staged under
`.artifacts/ground-floor-repair`. Published room versions are Study v8,
Room2 v2 and Room3 v3; the router is native-v2, After Hours is v3, and the
two recalibrated coffers are native-v3. Other rooms retain their own versions.

Validation uses visual browser captures at desktop and compact sizes, plus
script syntax inspection. No test suites, linters or production build are
run by this pipeline.

Visual review completed on 2026-10-31: all three rooms at 1600 x 1000 and
1280 x 800, their nine puzzle close-ups, and both recalibrated coffers with
closed and open lids. The bookshelf also retains all five marked books at
900 x 640 and fills its viewport from entry. The isolated browser sessions
reported no JavaScript errors or missing asset responses. Portrait mode
retains the game's existing instruction to turn the device sideways.
Captures and observations are under `.artifacts/ground-floor-repair-review`.
