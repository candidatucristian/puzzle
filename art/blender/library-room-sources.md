# Room II — the renovated library

This describes the earlier v3 arrangement. The active room restores the
original layout with these materials; see
[library-restored-sources.md](library-restored-sources.md).

`room_library_v3.py` builds the complete room in Blender 4.5 and renders it
with Cycles and OptiX. `library_details.py` models the book bindings, numbered
bookmarks, cabinet joinery, banker's lamp, router and clock collection.
`library_coffer_pass.py` photographs the shared hollow coffer through the
same camera, with thirteen actual hinge poses and a contact shadow receiver.
No AI-generated images are used.

The new composition leaves the middle of the room open. A single fitted
bookcase stands on the rear wall, the clock desk is on the left and a compact
writing table is on the right. Individually bevelled oak floorboards have
real staggered joints and recessed pin heads. Walnut dado panels, moulded
cornices, fluted cabinet stiles, turned table legs, mortised leg heads,
drawer pulls, crossbanding and a leather writing inset are modeled geometry.
The ledger lies flat on the table; both electrical leads reach the floor or
wall without passing through the tabletop.

Lighting comes from one shaded desk lamp and the single window (a sun for
moonlight and a broad sky source outside the glass). There are no interior
fill lights, shelf lights, emissive wall washes, bloom or additive runtime
lamp halos. The sky emitter is parallel to the window and outside the wall;
its camera, transmission and glossy visibility are disabled. Screens and
the power indicator have deliberately low emission. The runtime retains
only two small indicator lenses and faint puzzle cues without drifting
sparkle particles. The clock colon and the room lighting remain steady.

Locally cached photographic CC0 Poly Haven scans supply `dark_wood`,
`wood_floor_worn`, `plastered_wall_04`, `brown_leather`, `fabric_leather_02`
and `velour_velvet`, using `kit.py` and `hall_common.py`. The existing CC0
`ArmChair_01` and `dining_chair_02` models provide the two chairs, and
`island_tree_01` and `island_tree_02` supply the distant garden canopies. The rug
is the project's original `room_boards.mjs` artwork. The clock faces reuse
the original `clock_faces.mjs` puzzle artwork. All new architecture and
props are original geometry; the coffer comes from `gold_coffer_model.py`.
Nonmetal materials have no clearcoat and a roughness floor of 0.46.

The five marked books use `bookshelf/puzzle.js` through the publisher's
preparation step. The bookshelf, clock and modem puzzle scenes and answers
are preserved. Rain panes, puzzle hit areas, indicator positions and coffer
bounds are projected through the room's actual render camera and published
together. Each room keeps its own coffer version; other room assets are
unaffected.

```powershell
node art/blender/room_library_v3_publish.mjs --prepare
& 'C:/Users/crist/Tools/blender-4.5.15-windows-x64/blender.exe' --background --factory-startup -t 6 --python art/blender/room_library_v3.py -- --width 3200 --samples 512 --only plate,coffer
node art/blender/room_library_v3_publish.mjs
```

The packed editable scene is `.artifacts/room-library-v3/room-library-v3.blend`.
The room image is 3200 × 1702, with 512 samples, adaptive sampling,
denoising and AgX Medium High Contrast at exposure +1.35. The publisher
installs `Room2/room2-lights-1-render-v3.webp`, the room's own v4 coffer
assets and `house/rooms/Room2.json`. `house/roomRender.js` selects version 3.

For a visual draft, use `--width 1440 --samples 80 --only preview`.
Preview mode writes only local artifacts and includes the shut coffer.
It does not change the game's published geometry or assets.
