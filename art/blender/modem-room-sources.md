# The router room

`modem_room.py` replaces the former generated background of **The Room
Beneath the Desk** with an original Blender/Cycles scene. The active runtime
uses only its native room plate and twelve rendered light contributions.

## Original geometry

- Walnut desk, shaped front edge, panelled drawers and bronze handles.
- Deep teal plaster, low timber panelling, a shelf cabinet and individually
  bound upper-shelf books.
- A banker's lamp with turned brass parts, an open green glass shade with a
  cream interior, a tubular bulb and individual pull-chain beads.
- Graphite router with a rounded enclosure, a separate fascia, real vent
  openings, rubber feet, screws, aerial hinges, tapered antennae and cables.
- Exactly twelve recessed optical lenses: five red letter counters, a gap,
  and seven green ASCII bit indicators. There is no spare lens in the gap.
- The original **W. LEIBNIZ** maker clue, set as actual Blender text.
- A framed herbarium made from separate pressed-fern leaf meshes, a shut
  leather ledger and pen. These decorations do not add puzzle clues.

## Photographic CC0 resources

The existing [Poly Haven CC0](https://polyhaven.com/license) cache at
`C:/Users/crist/Tools/render/assets` supplies photographed material scans
`dark_wood`, `plastered_wall_04`, `fabric_leather_02`, `old_sandstone_02`,
the models `book_encyclopedia_set_01`, `potted_plant_02`, `fern_02`, and
the `moonlit_golf` lighting environment. No generated image textures are
used. Georgia and Arial are local fonts rendered into the artwork.

## Lighting and runtime

The desk lamp casts the warm pool of light. Weak, broad window and reflected
room lighting keep the dark fascia, shelving and teal wall visible without
white walls or fog. The camera uses an actual perspective lens and depth of
field focused on the router.

Each lit LED is rendered separately with its own emissive optical lens and
local light. The publisher extracts the additional light relative to the
unlit base plate, including its reflected colour on the desk, and feathers
the crop boundaries. The game adds these layers over the plate at the
camera-projected positions.

`src/levels/modem/puzzle.js` remains the source of the HTTPS transmission,
seven-bit letter patterns, timing and five counters. Resizing retains the
current transmission state; replay restarts it. The existing hardware hum
is retained. Optional faint dust is hidden when ambient motion is off;
the LED sequence remains active because it is the puzzle itself.

## Rebuild

```powershell
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' --background --factory-startup --python art/blender/modem_room.py -- --width 2880 --samples 256 --pack
node art/blender/modem_room_publish.mjs
```

The editable scene, with packed textures, is
`.artifacts/modem-native/router-room.blend`. The native assets are published
to `public/assets/images/Modem/native-v1/`, with matching LED coordinates and
safe framing in `src/levels/modem/nativeModem.json`.

For a small artwork preview, use
`--out .artifacts/modem-preview --width 1440 --samples 40 --cpu --preview`.
